import re
import urllib.parse
from bs4 import BeautifulSoup
from utils import ScrapingUtils
from config import SEARCH_CONFIG, SCRAPING_CONFIG

class LinkedInScraper:
    def __init__(self):
        self.utils = ScrapingUtils()
        self.base_url = SEARCH_CONFIG['linkedin_search_url']
    
    def search_companies(self, query, location=None, max_results=None):
        """Search for companies on LinkedIn"""
        if max_results is None:
            max_results = SCRAPING_CONFIG['max_results_per_source']
        
        companies = []
        session = self.utils.create_session()
        
        try:
            # Build search query
            search_params = {
                'keywords': query,
                'origin': 'GLOBAL_SEARCH_HEADER'
            }
            
            if location:
                search_params['location'] = location
            
            search_url = f"{self.base_url}?{urllib.parse.urlencode(search_params)}"
            print(f"Searching LinkedIn for: {query}")
            
            response = self.utils.make_request(search_url, session)
            if not response:
                return companies
            
            soup = BeautifulSoup(response.content, 'html.parser')
            companies = self._parse_search_results(soup, max_results)
            
            # Add delay between requests
            self.utils.delay_request()
            
        except Exception as e:
            print(f"Error searching LinkedIn: {e}")
        
        return companies
    
    def _parse_search_results(self, soup, max_results):
        """Parse LinkedIn search results page"""
        companies = []
        
        # LinkedIn search results are typically in specific containers
        # Note: LinkedIn's structure may change, so we need to be flexible
        search_results = soup.find_all(['div', 'li'], class_=re.compile(r'search-result|result-item|company-card'))
        
        # If no specific class found, try alternative selectors
        if not search_results:
            search_results = soup.find_all('div', {'data-test-id': re.compile(r'search-result|company')})
        
        # Fallback: look for any div that might contain company information
        if not search_results:
            search_results = soup.find_all('div', string=re.compile(r'company|business|organization', re.IGNORECASE))
        
        for result in search_results[:max_results]:
            try:
                company_data = self._extract_company_from_result(result)
                if company_data and company_data.get('company_name'):
                    companies.append(company_data)
            except Exception as e:
                print(f"Error parsing LinkedIn result: {e}")
                continue
        
        return companies
    
    def _extract_company_from_result(self, result):
        """Extract company information from a single LinkedIn search result"""
        company_data = {
            'company_name': None,
            'linkedin_profile': None,
            'industry': None,
            'location': None,
            'source': 'linkedin'
        }
        
        try:
            # Extract company name
            name_element = result.find(['h3', 'h2', 'h4', 'a'], class_=re.compile(r'title|name|company-name'))
            if not name_element:
                name_element = result.find(['h3', 'h2', 'h4', 'a'])
            
            if name_element:
                company_data['company_name'] = self.utils.clean_text(name_element.get_text())
                
                # Extract LinkedIn profile URL
                if name_element.name == 'a' and name_element.get('href'):
                    href = name_element.get('href')
                    if '/company/' in href:
                        company_data['linkedin_profile'] = f"https://www.linkedin.com{href}"
            
            # Extract industry
            industry_element = result.find(['span', 'div'], class_=re.compile(r'industry|business-type'))
            if industry_element:
                company_data['industry'] = self.utils.clean_text(industry_element.get_text())
            
            # Extract location
            location_element = result.find(['span', 'div'], class_=re.compile(r'location|address'))
            if location_element:
                company_data['location'] = self.utils.clean_text(location_element.get_text())
            
            # Extract company size or other details
            size_element = result.find(['span', 'div'], class_=re.compile(r'size|employees'))
            if size_element:
                company_data['company_size'] = self.utils.clean_text(size_element.get_text())
            
        except Exception as e:
            print(f"Error extracting LinkedIn company data: {e}")
        
        return company_data
    
    def get_company_details(self, linkedin_url):
        """Get detailed company information from LinkedIn company page"""
        if not linkedin_url:
            return None
        
        try:
            session = self.utils.create_session()
            response = self.utils.make_request(linkedin_url, session)
            
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            company_details = {
                'linkedin_profile': linkedin_url,
                'source': 'linkedin_company_page'
            }
            
            # Extract company name from page title or header
            title = soup.find('title')
            if title:
                title_text = title.get_text()
                # LinkedIn titles usually follow pattern: "Company Name | LinkedIn"
                if '| LinkedIn' in title_text:
                    company_details['company_name'] = title_text.split('| LinkedIn')[0].strip()
                else:
                    company_details['company_name'] = self.utils.clean_text(title_text)
            
            # Extract company description/about
            about_element = soup.find(['div', 'section'], class_=re.compile(r'about|description|summary'))
            if about_element:
                company_details['description'] = self.utils.clean_text(about_element.get_text())
            
            # Extract industry
            industry_element = soup.find(['span', 'div'], class_=re.compile(r'industry|business-type'))
            if industry_element:
                company_details['industry'] = self.utils.clean_text(industry_element.get_text())
            
            # Extract company size
            size_element = soup.find(['span', 'div'], class_=re.compile(r'size|employees'))
            if size_element:
                company_details['company_size'] = self.utils.clean_text(size_element.get_text())
            
            # Extract website
            website_element = soup.find('a', href=re.compile(r'^https?://'))
            if website_element:
                href = website_element.get('href')
                if href and not 'linkedin.com' in href:
                    company_details['website'] = href
            
            # Extract address/location
            address_element = soup.find(['span', 'div'], class_=re.compile(r'address|location|headquarters'))
            if address_element:
                company_details['address'] = self.utils.clean_text(address_element.get_text())
            
            # Try to extract contact information from page content
            page_text = soup.get_text()
            
            # Extract email (if visible)
            email = self.utils.extract_email_from_text(page_text)
            if email:
                company_details['email'] = email
            
            # Extract phone (if visible)
            phone = self.utils.extract_phone_from_text(page_text)
            if phone:
                company_details['phone'] = phone
            
            # Add delay
            self.utils.delay_request()
            
            return company_details
            
        except Exception as e:
            print(f"Error getting LinkedIn company details from {linkedin_url}: {e}")
            return None
    
    def search_by_industry(self, industry, location=None, max_results=None):
        """Search for companies by industry on LinkedIn"""
        if max_results is None:
            max_results = SCRAPING_CONFIG['max_results_per_source']
        
        query = f"{industry} companies"
        return self.search_companies(query, location, max_results)
    
    def search_by_location(self, location, max_results=None):
        """Search for companies by location on LinkedIn"""
        if max_results is None:
            max_results = SCRAPING_CONFIG['max_results_per_source']
        
        query = "companies"
        return self.search_companies(query, location, max_results)
