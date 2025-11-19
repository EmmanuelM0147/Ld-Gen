import random
import time
import requests
from fake_useragent import UserAgent
from config import USER_AGENT_CONFIG, PROXY_CONFIG, SCRAPING_CONFIG
import re
from urllib.parse import urlparse

class ScrapingUtils:
    def __init__(self):
        self.user_agent = UserAgent()
        self.current_proxy_index = 0
        
        # Personal email domains to filter out
        self.personal_domains = {
            'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
            'icloud.com', 'protonmail.com', 'mail.com', 'live.com', 'msn.com',
            'yandex.com', 'gmx.com', 'web.de', 't-online.de', 'freenet.de',
            'arcor.de', 'tiscali.it', 'libero.it', 'virgilio.it', 'alice.it',
            'orange.fr', 'laposte.net', 'free.fr', 'wanadoo.fr', 'sfr.fr',
            'neuf.fr', 'club-internet.fr', 'numericable.fr', 'bbox.fr'
        }
        
        # Professional email patterns with confidence scoring
        self.email_patterns = [
            # High confidence: info@company.com, contact@company.com, hello@company.com
            (r'\b(info|contact|hello|hello@|contact@|info@)[a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', 0.9),
            # Medium confidence: name@company.com, support@company.com
            (r'\b(support|help|sales|marketing|hr|jobs|careers|press|media|pr|legal|admin|webmaster|noreply|no-reply)[a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', 0.8),
            # Lower confidence: generic email patterns
            (r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', 0.5)
        ]
    
    def get_random_user_agent(self):
        """Get a random user agent"""
        if USER_AGENT_CONFIG['use_rotating_agents']:
            try:
                return self.user_agent.random
            except:
                return random.choice(USER_AGENT_CONFIG['custom_agents'])
        else:
            return random.choice(USER_AGENT_CONFIG['custom_agents'])
    
    def get_next_proxy(self):
        """Get next proxy from the proxy list"""
        if not PROXY_CONFIG['use_proxies'] or not PROXY_CONFIG['proxy_list']:
            return None
        
        proxy = PROXY_CONFIG['proxy_list'][self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(PROXY_CONFIG['proxy_list'])
        return {'http': proxy, 'https': proxy}
    
    def create_session(self):
        """Create a requests session with random user agent and proxy"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': self.get_random_user_agent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        proxy = self.get_next_proxy()
        if proxy:
            session.proxies.update(proxy)
        
        return session
    
    def make_request(self, url, session=None, retries=None):
        """Make HTTP request with retry logic"""
        if retries is None:
            retries = SCRAPING_CONFIG['max_retries']
        
        if session is None:
            session = self.create_session()
        
        for attempt in range(retries):
            try:
                response = session.get(
                    url, 
                    timeout=SCRAPING_CONFIG['timeout'],
                    allow_redirects=True
                )
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                print(f"Request attempt {attempt + 1} failed: {e}")
                if attempt == retries - 1:
                    raise
                
                # Rotate user agent and proxy for retry
                session.headers['User-Agent'] = self.get_random_user_agent()
                proxy = self.get_next_proxy()
                if proxy:
                    session.proxies.update(proxy)
                
                time.sleep(SCRAPING_CONFIG['delay_between_requests'] * (attempt + 1))
        
        return None
    
    def delay_request(self):
        """Add delay between requests to avoid being blocked"""
        delay = SCRAPING_CONFIG['delay_between_requests']
        time.sleep(delay)
    
    def extract_professional_emails_from_text(self, text, company_domain=None, source_page=None):
        """Extract professional emails from text with confidence scoring"""
        if not text:
            return []
        
        emails_found = []
        seen_emails = set()
        
        for pattern, base_confidence in self.email_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            
            for match in matches:
                # Handle tuple matches from regex groups
                if isinstance(match, tuple):
                    email = ''.join(match)
                else:
                    email = match
                
                # Clean and validate email
                email = email.strip().lower()
                if not self.is_valid_email(email):
                    continue
                
                # Skip if already processed
                if email in seen_emails:
                    continue
                
                seen_emails.add(email)
                
                # Check if it's a personal email domain
                if self.is_personal_email(email):
                    continue
                
                # Calculate confidence score
                confidence_score = self.calculate_email_confidence(email, company_domain, base_confidence)
                
                # Determine email type
                email_type = self.classify_email_type(email)
                
                email_data = {
                    'email': email,
                    'email_type': email_type,
                    'confidence_score': confidence_score,
                    'source_page': source_page,
                    'is_verified': confidence_score >= 0.8
                }
                
                emails_found.append(email_data)
        
        # Sort by confidence score (highest first)
        emails_found.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        return emails_found
    
    def calculate_email_confidence(self, email, company_domain, base_confidence):
        """Calculate confidence score for an extracted email"""
        confidence = base_confidence
        
        # Boost confidence if email domain matches company domain
        if company_domain and company_domain in email:
            confidence += 0.2
        
        # Boost confidence for common professional email patterns
        if any(pattern in email.lower() for pattern in ['info@', 'contact@', 'hello@']):
            confidence += 0.1
        
        # Boost confidence for business-related prefixes
        if any(prefix in email.lower() for prefix in ['support@', 'sales@', 'marketing@', 'hr@']):
            confidence += 0.1
        
        # Reduce confidence for very long or complex emails
        if len(email) > 50:
            confidence -= 0.1
        
        # Ensure confidence is between 0 and 1
        return max(0.0, min(1.0, confidence))
    
    def classify_email_type(self, email):
        """Classify the type of email address"""
        email_lower = email.lower()
        
        if any(prefix in email_lower for prefix in ['info@', 'hello@', 'contact@']):
            return 'general'
        elif any(prefix in email_lower for prefix in ['support@', 'help@']):
            return 'support'
        elif any(prefix in email_lower for prefix in ['sales@', 'business@']):
            return 'sales'
        elif any(prefix in email_lower for prefix in ['marketing@', 'pr@', 'press@']):
            return 'marketing'
        elif any(prefix in email_lower for prefix in ['hr@', 'jobs@', 'careers@']):
            return 'hr'
        elif any(prefix in email_lower for prefix in ['legal@', 'compliance@']):
            return 'legal'
        elif any(prefix in email_lower for prefix in ['admin@', 'webmaster@']):
            return 'admin'
        elif any(prefix in email_lower for prefix in ['noreply@', 'no-reply@']):
            return 'noreply'
        else:
            return 'general'
    
    def is_personal_email(self, email):
        """Check if email is from a personal domain"""
        domain = email.split('@')[-1] if '@' in email else ''
        return domain.lower() in self.personal_domains
    
    def extract_company_domain(self, website_url):
        """Extract company domain from website URL"""
        if not website_url:
            return None
        
        try:
            parsed = urlparse(website_url)
            domain = parsed.netloc.lower()
            
            # Remove www. prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            
            return domain
        except Exception:
            return None
    
    def extract_email_from_text(self, text):
        """Extract email addresses from text using regex (legacy method)"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        return emails[0] if emails else None
    
    def extract_phone_from_text(self, text):
        """Extract phone numbers from text using regex"""
        phone_pattern = r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
        phones = re.findall(phone_pattern, text)
        if phones:
            phone = ''.join(phones[0])
            return phone if phone else None
        return None
    
    def extract_website_from_text(self, text):
        """Extract website URLs from text using regex"""
        url_pattern = r'https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?'
        urls = re.findall(url_pattern, text)
        return urls[0] if urls else None
    
    def clean_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = ' '.join(text.split())
        # Remove special characters that might interfere with parsing
        text = text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        return text.strip()
    
    def is_valid_email(self, email):
        """Validate email format"""
        email_pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
        return bool(re.match(email_pattern, email)) if email else False
    
    def is_valid_phone(self, phone):
        """Validate phone number format"""
        # Remove all non-digit characters
        digits_only = re.sub(r'\D', '', phone)
        # Check if it's a valid length (7-15 digits)
        return 7 <= len(digits_only) <= 15 if digits_only else False
    
    def is_valid_website(self, website):
        """Validate website URL format"""
        url_pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?$'
        return bool(re.match(url_pattern, website)) if website else False
