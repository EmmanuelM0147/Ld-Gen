import re
import time
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from utils import ScrapingUtils
from config import SCRAPING_CONFIG

class EmailScraper:
    def __init__(self):
        self.utils = ScrapingUtils()
        self.max_pages_per_site = 5  # Limit pages to scrape per website
        self.max_depth = 2  # Maximum depth for crawling
        
    def scrape_company_emails(self, company_data):
        """Scrape professional emails from a company's website"""
        if not company_data.get('website'):
            return []
        
        website_url = company_data['website']
        company_domain = self.utils.extract_company_domain(website_url)
        
        print(f"  Scraping emails from: {website_url}")
        print(f"  Company domain: {company_domain}")
        
        try:
            # Start with the main page
            all_emails = []
            visited_urls = set()
            
            # Scrape main page
            main_page_emails = self._scrape_page_for_emails(website_url, company_domain, website_url)
            if main_page_emails:
                all_emails.extend(main_page_emails)
                print(f"    Found {len(main_page_emails)} emails on main page")
            
            # Find and scrape additional pages
            additional_pages = self._find_additional_pages(website_url, visited_urls)
            
            for page_url in additional_pages[:self.max_pages_per_site - 1]:  # -1 because we already scraped main page
                if page_url in visited_urls:
                    continue
                
                visited_urls.add(page_url)
                
                # Add delay between page requests
                self.utils.delay_request()
                
                page_emails = self._scrape_page_for_emails(page_url, company_domain, website_url)
                if page_emails:
                    all_emails.extend(page_emails)
                    print(f"    Found {len(page_emails)} emails on {page_url}")
            
            # Remove duplicates and sort by confidence
            unique_emails = self._deduplicate_emails(all_emails)
            
            print(f"  Total unique professional emails found: {len(unique_emails)}")
            return unique_emails
            
        except Exception as e:
            print(f"    Error scraping emails from {website_url}: {e}")
            return []
    
    def _scrape_page_for_emails(self, page_url, company_domain, base_url):
        """Scrape a single page for professional emails"""
        try:
            session = self.utils.create_session()
            response = self.utils.make_request(page_url, session)
            
            if not response:
                return []
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract text content
            page_text = soup.get_text()
            
            # Extract emails using enhanced professional email extraction
            emails = self.utils.extract_professional_emails_from_text(
                page_text, 
                company_domain, 
                page_url
            )
            
            # Also check for emails in href attributes (mailto: links)
            mailto_emails = self._extract_mailto_emails(soup, company_domain, page_url)
            emails.extend(mailto_emails)
            
            # Also check for emails in data attributes and other HTML attributes
            attribute_emails = self._extract_attribute_emails(soup, company_domain, page_url)
            emails.extend(attribute_emails)
            
            return emails
            
        except Exception as e:
            print(f"      Error scraping page {page_url}: {e}")
            return []
    
    def _extract_mailto_emails(self, soup, company_domain, source_page):
        """Extract emails from mailto: links"""
        emails = []
        
        try:
            # Find all mailto: links
            mailto_links = soup.find_all('a', href=re.compile(r'^mailto:', re.IGNORECASE))
            
            for link in mailto_links:
                href = link.get('href', '')
                if href.startswith('mailto:'):
                    email = href[7:]  # Remove 'mailto:' prefix
                    
                    # Clean email (remove query parameters, etc.)
                    email = email.split('?')[0].split('#')[0].strip()
                    
                    if self.utils.is_valid_email(email) and not self.utils.is_personal_email(email):
                        # Calculate confidence for mailto links (usually high confidence)
                        confidence_score = self.utils.calculate_email_confidence(email, company_domain, 0.9)
                        
                        email_data = {
                            'email': email.lower(),
                            'email_type': self.utils.classify_email_type(email),
                            'confidence_score': confidence_score,
                            'source_page': source_page,
                            'is_verified': confidence_score >= 0.8
                        }
                        
                        emails.append(email_data)
            
        except Exception as e:
            print(f"      Error extracting mailto emails: {e}")
        
        return emails
    
    def _extract_attribute_emails(self, soup, company_domain, source_page):
        """Extract emails from various HTML attributes"""
        emails = []
        
        try:
            # Common attributes that might contain emails
            email_attributes = ['data-email', 'data-contact', 'data-mail', 'title', 'alt', 'aria-label']
            
            for attr in email_attributes:
                elements = soup.find_all(attrs={attr: re.compile(r'@', re.IGNORECASE)})
                
                for element in elements:
                    attr_value = element.get(attr, '')
                    
                    # Extract emails from attribute value
                    extracted_emails = self.utils.extract_professional_emails_from_text(
                        attr_value, 
                        company_domain, 
                        source_page
                    )
                    
                    emails.extend(extracted_emails)
            
        except Exception as e:
            print(f"      Error extracting attribute emails: {e}")
        
        return emails
    
    def _find_additional_pages(self, base_url, visited_urls):
        """Find additional pages to scrape on the company website"""
        additional_pages = []
        
        try:
            session = self.utils.create_session()
            response = self.utils.make_request(base_url, session)
            
            if not response:
                return additional_pages
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find links to other pages on the same domain
            base_domain = self.utils.extract_company_domain(base_url)
            
            links = soup.find_all('a', href=True)
            for link in links:
                href = link.get('href', '')
                
                # Convert relative URLs to absolute
                absolute_url = urljoin(base_url, href)
                
                # Check if it's on the same domain
                if self._is_same_domain(absolute_url, base_domain):
                    # Check if it's a page we want to scrape (not images, CSS, JS, etc.)
                    if self._is_scrapable_page(absolute_url):
                        additional_pages.append(absolute_url)
            
            # Limit the number of additional pages
            return additional_pages[:self.max_pages_per_site]
            
        except Exception as e:
            print(f"      Error finding additional pages: {e}")
            return additional_pages
    
    def _is_same_domain(self, url, base_domain):
        """Check if URL is on the same domain"""
        if not base_domain:
            return False
        
        url_domain = self.utils.extract_company_domain(url)
        return url_domain == base_domain
    
    def _is_scrapable_page(self, url):
        """Check if a URL is a page we want to scrape"""
        # Skip non-HTML files
        skip_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
                          '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
                          '.css', '.js', '.xml', '.json', '.txt', '.zip', '.rar'}
        
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        # Skip if it's a file with skip extension
        if any(path.endswith(ext) for ext in skip_extensions):
            return False
        
        # Skip if it's an anchor link
        if '#' in url:
            return False
        
        # Skip if it's a mailto or tel link
        if url.startswith(('mailto:', 'tel:')):
            return False
        
        # Skip if it's an external link
        if not url.startswith('http'):
            return False
        
        return True
    
    def _deduplicate_emails(self, emails):
        """Remove duplicate emails and sort by confidence"""
        unique_emails = {}
        
        for email_data in emails:
            email = email_data['email']
            
            # If we already have this email, keep the one with higher confidence
            if email in unique_emails:
                if email_data['confidence_score'] > unique_emails[email]['confidence_score']:
                    unique_emails[email] = email_data
            else:
                unique_emails[email] = email_data
        
        # Convert back to list and sort by confidence
        unique_list = list(unique_emails.values())
        unique_list.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        return unique_list
    
    def scrape_multiple_companies(self, companies_data):
        """Scrape emails from multiple companies"""
        all_results = {}
        
        for i, company in enumerate(companies_data, 1):
            company_name = company.get('company_name', f'Company {i}')
            print(f"\nScraping emails for {company_name} ({i}/{len(companies_data)})")
            
            emails = self.scrape_company_emails(company)
            all_results[company_name] = {
                'company_data': company,
                'emails': emails
            }
            
            # Add delay between companies
            if i < len(companies_data):
                self.utils.delay_request()
        
        return all_results
