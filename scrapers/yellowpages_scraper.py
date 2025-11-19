import re
import urllib.parse
from bs4 import BeautifulSoup
from utils import ScrapingUtils
from config import SEARCH_CONFIG, SCRAPING_CONFIG

class YellowPagesScraper:
    def __init__(self):
        self.utils = ScrapingUtils()
        self.base_url = SEARCH_CONFIG['yellowpages_search_url']
    
    def search_companies(self, query, location=None, max_results=None):
        """Search for companies on YellowPages"""
        if max_results is None:
            max_results = SCRAPING_CONFIG['max_results_per_source']
        
        companies = []
        session = self.utils.create_session()
        
        try:
            # Build search query
            search_params = {
                'search_terms': query,
                'geo_location_terms': location if location else 'United States'
            }
            
            search_url = f"{self.base_url}?{urllib.parse.urlencode(search_params)}"
            print(f"Searching YellowPages for: {query} in {search_params['geo_location_terms']}")
            
            response = self.utils.make_request(search_url, session)
            if not response:
                return companies
            
            soup = BeautifulSoup(response.content, 'html.parser')
            companies = self._parse_search_results(soup, max_results)
            
            # Add delay between requests
            self.utils.delay_request()
            
        except Exception as e:
            print(f"Error searching YellowPages: {e}")
        
        return companies
    
    def _parse_search_results(self, soup, max_results):
        """Parse YellowPages search results page"""
        companies = []
        
        # YellowPages typically has business listings in specific containers
        search_results = soup.find_all(['div', 'li'], class_=re.compile(r'result|listing|business|company'))
        
        # If no specific class found, try alternative selectors
        if not search_results:
            search_results = soup.find_all('div', {'data-test-id': re.compile(r'result|listing')})
        
        # Fallback: look for any div that might contain business information
        if not search_results:
            search_results = soup.find_all('div', string=re.compile(r'business|company|organization', re.IGNORECASE))
        
        for result in search_results[:max_results]:
            try:
                company_data = self._extract_company_from_result(result)
                if company_data and company_data.get('company_name'):
                    companies.append(company_data)
            except Exception as e:
                print(f"Error parsing YellowPages result: {e}")
                continue
        
        return companies
    
    def _extract_company_from_result(self, result):
        """Extract company information from a single YellowPages search result"""
        company_data = {
            'company_name': None,
            'phone': None,
            'address': None,
            'website': None,
            'category': None,
            'source': 'yellowpages'
        }
        
        try:
            # Extract company name
            name_element = result.find(['h3', 'h2', 'h4', 'a'], class_=re.compile(r'title|name|business-name'))
            if not name_element:
                name_element = result.find(['h3', 'h2', 'h4', 'a'])
            
            if name_element:
                company_data['company_name'] = self.utils.clean_text(name_element.get_text())
                
                # Extract website URL if name is a link
                if name_element.name == 'a' and name_element.get('href'):
                    href = name_element.get('href')
                    if href.startswith('http'):
                        company_data['website'] = href
            
            # Extract phone number
            phone_element = result.find(['span', 'div', 'a'], class_=re.compile(r'phone|tel|telephone'))
            if phone_element:
                phone_text = phone_element.get_text()
                phone = self.utils.extract_phone_from_text(phone_text)
                if phone:
                    company_data['phone'] = phone
            
            # Extract address
            address_element = result.find(['span', 'div'], class_=re.compile(r'address|location|street'))
            if address_element:
                company_data['address'] = self.utils.clean_text(address_element.get_text())
            
            # Extract website
            website_element = result.find('a', href=re.compile(r'^https?://'))
            if website_element and not company_data.get('website'):
                href = website_element.get('href')
                if href and not 'yellowpages.com' in href:
                    company_data['website'] = href
            
            # Extract category/industry
            category_element = result.find(['span', 'div'], class_=re.compile(r'category|industry|business-type'))
            if category_element:
                company_data['category'] = self.utils.clean_text(category_element.get_text())
            
            # Extract additional details
            details_element = result.find(['span', 'div'], class_=re.compile(r'description|details|summary'))
            if details_element:
                details_text = details_element.get_text()
                
                # Try to extract email from details
                email = self.utils.extract_email_from_text(details_text)
                if email:
                    company_data['email'] = email
                
                # Try to extract additional phone numbers
                if not company_data.get('phone'):
                    phone = self.utils.extract_phone_from_text(details_text)
                    if phone:
                        company_data['phone'] = phone
            
        except Exception as e:
            print(f"Error extracting YellowPages company data: {e}")
        
        return company_data
    
    def get_company_details(self, company_url):
        """Get detailed company information from YellowPages company page"""
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
                'source': 'yellowpages_company_page'
            }
            
            # Extract company name from page title or header
            title = soup.find('title')
            if title:
                title_text = title.get_text()
                # YellowPages titles usually follow pattern: "Company Name - Location | YellowPages"
                if ' - ' in title_text and '| YellowPages' in title_text:
                    company_details['company_name'] = title_text.split(' - ')[0].strip()
                else:
                    company_details['company_name'] = self.utils.clean_text(title_text)
            
            # Extract company description/about
            about_element = soup.find(['div', 'section'], class_=re.compile(r'about|description|summary'))
            if about_element:
                company_details['description'] = self.utils.clean_text(about_element.get_text())
            
            # Extract contact information
            contact_section = soup.find(['div', 'section'], class_=re.compile(r'contact|info|details'))
            if contact_section:
                # Extract phone
                phone_element = contact_section.find(['span', 'div', 'a'], class_=re.compile(r'phone|tel|telephone'))
                if phone_element:
                    phone_text = phone_element.get_text()
                    phone = self.utils.extract_phone_from_text(phone_text)
                    if phone:
                        company_details['phone'] = phone
                
                # Extract address
                address_element = contact_section.find(['span', 'div'], class_=re.compile(r'address|location|street'))
                if address_element:
                    company_details['address'] = self.utils.clean_text(address_element.get_text())
                
                # Extract website
                website_element = contact_section.find('a', href=re.compile(r'^https?://'))
                if website_element:
                    href = website_element.get('href')
                    if href and not 'yellowpages.com' in href:
                        company_details['website'] = href
            
            # Extract category/industry
            category_element = soup.find(['span', 'div'], class_=re.compile(r'category|industry|business-type'))
            if category_element:
                company_details['category'] = self.utils.clean_text(category_element.get_text())
            
            # Try to extract contact information from page content
            page_text = soup.get_text()
            
            # Extract email (if visible)
            email = self.utils.extract_email_from_text(page_text)
            if email:
                company_details['email'] = email
            
            # Extract phone (if not already found)
            if not company_details.get('phone'):
                phone = self.utils.extract_phone_from_text(page_text)
                if phone:
                    company_details['phone'] = phone
            
            # Add delay
            self.utils.delay_request()
            
            return company_details
            
        except Exception as e:
            print(f"Error getting YellowPages company details from {company_url}: {e}")
            return None
    
    def search_by_category(self, category, location=None, max_results=None):
        """Search for companies by category on YellowPages"""
        if max_results is None:
            max_results = SCRAPING_CONFIG['max_results_per_source']
        
        return self.search_companies(category, location, max_results)
    
    def search_by_location(self, location, max_results=None):
        """Search for companies by location on YellowPages"""
        if max_results is None:
            max_results = SCRAPING_CONFIG['max_results_per_source']
        
        query = "businesses"
        return self.search_companies(query, location, max_results)
    
    def search_near_me(self, max_results=None):
        """Search for companies near the user's location (requires location detection)"""
        if max_results is None:
            max_results = SCRAPING_CONFIG['max_results_per_source']
        
        # This would require IP geolocation or user input
        # For now, we'll use a generic search
        return self.search_companies("local businesses", "United States", max_results)
