import re
import urllib.parse
from bs4 import BeautifulSoup
from utils import ScrapingUtils
from config import SEARCH_CONFIG, SCRAPING_CONFIG

class GoogleScraper:
    def __init__(self):
        self.utils = ScrapingUtils()
        self.base_url = SEARCH_CONFIG['google_search_url']
    
    def search_companies(self, query, location=None, max_results=None):
        """Search for companies on Google"""
        if max_results is None:
            max_results = SCRAPING_CONFIG['max_results_per_source']
        
        companies = []
        session = self.utils.create_session()
        
        try:
            # Build search query
            search_params = {
                'q': f"{query} company contact information",
                'num': min(max_results, 100)  # Google max is 100
            }
            
            if location:
                search_params['q'] += f" {location}"
            
            search_url = f"{self.base_url}?{urllib.parse.urlencode(search_params)}"
            print(f"Searching Google for: {search_params['q']}")
            
            response = self.utils.make_request(search_url, session)
            if not response:
                return companies
            
            soup = BeautifulSoup(response.content, 'html.parser')
            companies = self._parse_search_results(soup, max_results)
            
            # Add delay between requests
            self.utils.delay_request()
            
        except Exception as e:
            print(f"Error searching Google: {e}")
        
        return companies
    
    def _parse_search_results(self, soup, max_results):
        """Parse Google search results page"""
        companies = []
        
        # Find organic search results
        search_results = soup.find_all('div', class_='g')
        
        for result in search_results[:max_results]:
            try:
                company_data = self._extract_company_from_result(result)
                if company_data and company_data.get('company_name'):
                    companies.append(company_data)
            except Exception as e:
                print(f"Error parsing result: {e}")
                continue
        
        return companies
    
    def _extract_company_from_result(self, result):
        """Extract company information from a single search result"""
        company_data = {
            'company_name': None,
            'website': None,
            'description': None,
            'source': 'google'
        }
        
        try:
            # Extract company name from title
            title_element = result.find('h3')
            if title_element:
                company_data['company_name'] = self.utils.clean_text(title_element.get_text())
            
            # Extract website from link
            link_element = result.find('a')
            if link_element and link_element.get('href'):
                href = link_element.get('href')
                if href.startswith('/url?q='):
                    # Google redirects URLs, extract actual URL
                    actual_url = href.split('/url?q=')[1].split('&')[0]
                    company_data['website'] = urllib.parse.unquote(actual_url)
                elif href.startswith('http'):
                    company_data['website'] = href
            
            # Extract description
            description_element = result.find('div', class_='VwiC3b')
            if description_element:
                company_data['description'] = self.utils.clean_text(description_element.get_text())
            
            # Try to extract additional contact info from description
            if company_data['description']:
                # Extract email
                email = self.utils.extract_email_from_text(company_data['description'])
                if email:
                    company_data['email'] = email
                
                # Extract phone
                phone = self.utils.extract_phone_from_text(company_data['description'])
                if phone:
                    company_data['phone'] = phone
            
            # Clean company name (remove common suffixes)
            if company_data['company_name']:
                company_data['company_name'] = self._clean_company_name(company_data['company_name'])
            
        except Exception as e:
            print(f"Error extracting company data: {e}")
        
        return company_data
    
    def _clean_company_name(self, company_name):
        """Clean company name by removing common suffixes and extra text"""
        # Remove common suffixes
        suffixes = [' - Home', ' - Official Site', ' | Company', ' Inc.', ' LLC', ' Corp.', ' Company']
        for suffix in suffixes:
            if company_name.endswith(suffix):
                company_name = company_name[:-len(suffix)]
        
        # Remove extra text after dash or pipe
        if ' - ' in company_name:
            company_name = company_name.split(' - ')[0]
        if ' | ' in company_name:
            company_name = company_name.split(' | ')[0]
        
        return company_name.strip()
    
    def get_company_details(self, company_url):
        """Get detailed company information from company website"""
        if not company_url:
            return None
        
        try:
            session = self.utils.create_session()
            response = self.utils.make_request(company_url, session)
            
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            company_details = {
                'website': company_url,
                'source': 'google_company_page'
            }
            
            # Extract company name from title or h1
            title = soup.find('title')
            if title:
                company_details['company_name'] = self.utils.clean_text(title.get_text())
            
            h1 = soup.find('h1')
            if h1 and not company_details.get('company_name'):
                company_details['company_name'] = self.utils.clean_text(h1.get_text())
            
            # Extract contact information from page content
            page_text = soup.get_text()
            
            # Extract email
            email = self.utils.extract_email_from_text(page_text)
            if email:
                company_details['email'] = email
            
            # Extract phone
            phone = self.utils.extract_phone_from_text(page_text)
            if phone:
                company_details['phone'] = phone
            
            # Extract address (basic pattern matching)
            address = self._extract_address_from_text(page_text)
            if address:
                company_details['address'] = address
            
            # Add delay
            self.utils.delay_request()
            
            return company_details
            
        except Exception as e:
            print(f"Error getting company details from {company_url}: {e}")
            return None
    
    def _extract_address_from_text(self, text):
        """Extract address information from text"""
        # Basic address pattern - this is a simplified approach
        # In a production environment, you might want to use more sophisticated NLP
        address_patterns = [
            r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct)',
            r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}'
        ]
        
        for pattern in address_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return self.utils.clean_text(matches[0])
        
        return None
