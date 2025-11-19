import re
import time
import json
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from utils import ScrapingUtils
from config import SCRAPING_CONFIG

class LeadEnrichment:
    def __init__(self):
        self.utils = ScrapingUtils()
        
        # Industry classification keywords and patterns
        self.industry_keywords = {
            'technology': [
                'software', 'technology', 'tech', 'digital', 'ai', 'artificial intelligence',
                'machine learning', 'data science', 'cybersecurity', 'cloud computing',
                'saas', 'fintech', 'healthtech', 'edtech', 'ecommerce', 'mobile app',
                'web development', 'it services', 'consulting', 'startup', 'scaleup'
            ],
            'healthcare': [
                'healthcare', 'medical', 'pharmaceutical', 'biotech', 'biotechnology',
                'health', 'wellness', 'fitness', 'telemedicine', 'medical device',
                'clinical', 'research', 'hospital', 'clinic', 'dental', 'mental health',
                'rehabilitation', 'home care', 'nursing', 'pharmacy'
            ],
            'finance': [
                'finance', 'financial', 'banking', 'investment', 'insurance',
                'fintech', 'wealth management', 'asset management', 'private equity',
                'venture capital', 'accounting', 'audit', 'tax', 'consulting',
                'credit', 'lending', 'mortgage', 'real estate investment'
            ],
            'manufacturing': [
                'manufacturing', 'industrial', 'factory', 'production', 'automotive',
                'aerospace', 'defense', 'chemical', 'steel', 'aluminum', 'plastics',
                'textiles', 'food processing', 'beverage', 'electronics', 'semiconductor',
                'machinery', 'equipment', 'supply chain', 'logistics'
            ],
            'retail': [
                'retail', 'ecommerce', 'online shopping', 'brick and mortar',
                'fashion', 'apparel', 'clothing', 'footwear', 'accessories',
                'home goods', 'furniture', 'electronics', 'jewelry', 'cosmetics',
                'grocery', 'supermarket', 'convenience store', 'department store'
            ],
            'education': [
                'education', 'edtech', 'learning', 'training', 'university',
                'college', 'school', 'academy', 'institute', 'online learning',
                'e-learning', 'distance learning', 'professional development',
                'certification', 'workshop', 'seminar', 'tutoring'
            ],
            'real_estate': [
                'real estate', 'property', 'realty', 'brokerage', 'development',
                'construction', 'architecture', 'engineering', 'property management',
                'leasing', 'rental', 'commercial real estate', 'residential',
                'industrial real estate', 'land', 'investment property'
            ],
            'media_entertainment': [
                'media', 'entertainment', 'film', 'television', 'music',
                'publishing', 'advertising', 'marketing', 'public relations',
                'journalism', 'news', 'broadcasting', 'streaming', 'gaming',
                'sports', 'events', 'production', 'creative', 'design'
            ],
            'consulting': [
                'consulting', 'advisory', 'strategy', 'management consulting',
                'business consulting', 'it consulting', 'financial advisory',
                'legal consulting', 'hr consulting', 'marketing consulting',
                'operations consulting', 'change management', 'process improvement'
            ],
            'non_profit': [
                'non-profit', 'nonprofit', 'charity', 'foundation', 'ngo',
                'social enterprise', 'community organization', 'volunteer',
                'philanthropy', 'social impact', 'environmental', 'humanitarian',
                'education foundation', 'health foundation', 'arts organization'
            ]
        }
        
        # Decision-maker job titles and keywords
        self.decision_maker_titles = {
            'executive': [
                'ceo', 'chief executive officer', 'president', 'founder', 'co-founder',
                'managing director', 'executive director', 'general manager'
            ],
            'marketing': [
                'cmo', 'chief marketing officer', 'marketing director', 'marketing manager',
                'head of marketing', 'vp marketing', 'marketing lead', 'brand manager'
            ],
            'sales': [
                'cso', 'chief sales officer', 'sales director', 'sales manager',
                'head of sales', 'vp sales', 'sales lead', 'business development',
                'account executive', 'sales representative'
            ],
            'technology': [
                'cto', 'chief technology officer', 'it director', 'it manager',
                'head of it', 'vp technology', 'technical lead', 'software engineer',
                'developer', 'architect'
            ],
            'finance': [
                'cfo', 'chief financial officer', 'finance director', 'finance manager',
                'head of finance', 'vp finance', 'financial controller', 'accountant'
            ],
            'operations': [
                'coo', 'chief operations officer', 'operations director', 'operations manager',
                'head of operations', 'vp operations', 'process manager', 'quality manager'
            ],
            'human_resources': [
                'chro', 'chief human resources officer', 'hr director', 'hr manager',
                'head of hr', 'vp hr', 'talent acquisition', 'recruiter'
            ]
        }
    
    def enrich_company_data(self, company_data):
        """Enrich company data with additional information from free sources"""
        enriched_data = company_data.copy()
        
        print(f"  Enriching company: {company_data.get('company_name', 'Unknown')}")
        
        try:
            # Step 1: LinkedIn enrichment
            if company_data.get('linkedin_profile'):
                linkedin_data = self._scrape_linkedin_company_data(company_data['linkedin_profile'])
                if linkedin_data:
                    enriched_data.update(linkedin_data)
                    print(f"    LinkedIn data enriched: {len(linkedin_data)} fields")
            
            # Step 2: Website enrichment (if no LinkedIn data)
            elif company_data.get('website'):
                website_data = self._scrape_company_website_data(company_data['website'])
                if website_data:
                    enriched_data.update(website_data)
                    print(f"    Website data enriched: {len(website_data)} fields")
            
            # Step 3: Industry classification
            industry_info = self._classify_company_industry(company_data)
            if industry_info:
                enriched_data.update(industry_info)
                print(f"    Industry classified: {industry_info.get('industry_category', 'Unknown')}")
            
            # Step 4: Decision-maker identification
            decision_makers = self._identify_decision_makers(company_data)
            if decision_makers:
                enriched_data['decision_makers'] = decision_makers
                print(f"    Decision-makers identified: {len(decision_makers)} contacts")
            
            # Step 5: Company size estimation
            company_size = self._estimate_company_size(enriched_data)
            if company_size:
                enriched_data['estimated_company_size'] = company_size
                print(f"    Company size estimated: {company_size}")
            
            # Step 6: Location enrichment
            location_data = self._enrich_location_data(enriched_data)
            if location_data:
                enriched_data.update(location_data)
                print(f"    Location data enriched")
            
            return enriched_data
            
        except Exception as e:
            print(f"    Error enriching company data: {e}")
            return enriched_data
    
    def _scrape_linkedin_company_data(self, linkedin_url):
        """Scrape additional company data from LinkedIn company page"""
        try:
            session = self.utils.create_session()
            response = self.utils.make_request(linkedin_url, session)
            
            if not response:
                return {}
            
            soup = BeautifulSoup(response.content, 'html.parser')
            linkedin_data = {}
            
            # Extract company size
            size_element = soup.find(['span', 'div'], class_=re.compile(r'size|employees|headcount', re.IGNORECASE))
            if size_element:
                linkedin_data['company_size'] = self.utils.clean_text(size_element.get_text())
            
            # Extract industry
            industry_element = soup.find(['span', 'div'], class_=re.compile(r'industry|business-type|sector', re.IGNORECASE))
            if industry_element:
                linkedin_data['industry'] = self.utils.clean_text(industry_element.get_text())
            
            # Extract location/headquarters
            location_element = soup.find(['span', 'div'], class_=re.compile(r'headquarters|location|address', re.IGNORECASE))
            if location_element:
                linkedin_data['headquarters'] = self.utils.clean_text(location_element.get_text())
            
            # Extract company description
            about_element = soup.find(['div', 'section'], class_=re.compile(r'about|description|summary', re.IGNORECASE))
            if about_element:
                linkedin_data['company_description'] = self.utils.clean_text(about_element.get_text())
            
            # Extract founded year
            founded_element = soup.find(['span', 'div'], string=re.compile(r'founded|established|since', re.IGNORECASE))
            if founded_element:
                founded_text = founded_element.get_text()
                year_match = re.search(r'\b(19|20)\d{2}\b', founded_text)
                if year_match:
                    linkedin_data['founded_year'] = year_match.group()
            
            # Extract specialties
            specialties_elements = soup.find_all(['span', 'div'], class_=re.compile(r'specialty|expertise|focus', re.IGNORECASE))
            if specialties_elements:
                specialties = []
                for elem in specialties_elements:
                    specialty_text = self.utils.clean_text(elem.get_text())
                    if specialty_text and len(specialty_text) > 3:
                        specialties.append(specialty_text)
                if specialties:
                    linkedin_data['specialties'] = specialties
            
            return linkedin_data
            
        except Exception as e:
            print(f"      Error scraping LinkedIn data: {e}")
            return {}
    
    def _scrape_company_website_data(self, website_url):
        """Scrape additional company data from company website"""
        try:
            session = self.utils.create_session()
            response = self.utils.make_request(website_url, session)
            
            if not response:
                return {}
            
            soup = BeautifulSoup(response.content, 'html.parser')
            website_data = {}
            
            # Extract company description from meta tags
            meta_description = soup.find('meta', attrs={'name': 'description'})
            if meta_description and meta_description.get('content'):
                website_data['company_description'] = self.utils.clean_text(meta_description['content'])
            
            # Extract company description from about sections
            about_sections = soup.find_all(['div', 'section'], class_=re.compile(r'about|company|story|mission', re.IGNORECASE))
            if about_sections:
                about_texts = []
                for section in about_sections:
                    text = self.utils.clean_text(section.get_text())
                    if text and len(text) > 50:  # Only meaningful text
                        about_texts.append(text)
                if about_texts:
                    website_data['company_description'] = ' '.join(about_texts[:2])  # First 2 sections
            
            # Extract location information
            location_patterns = [
                r'\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}\b',
                r'\b[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}\b',
                r'\b[A-Za-z\s]+,\s*[A-Z]{2}\b'
            ]
            
            page_text = soup.get_text()
            for pattern in location_patterns:
                matches = re.findall(pattern, page_text, re.IGNORECASE)
                if matches:
                    website_data['headquarters'] = self.utils.clean_text(matches[0])
                    break
            
            # Extract contact information
            contact_sections = soup.find_all(['div', 'section'], class_=re.compile(r'contact|info|details', re.IGNORECASE))
            if contact_sections:
                contact_text = ' '.join([section.get_text() for section in contact_sections])
                
                # Extract phone
                phone = self.utils.extract_phone_from_text(contact_text)
                if phone:
                    website_data['phone'] = phone
                
                # Extract address
                address_match = re.search(r'\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}\b', contact_text, re.IGNORECASE)
                if address_match and not website_data.get('headquarters'):
                    website_data['headquarters'] = self.utils.clean_text(address_match.group())
            
            return website_data
            
        except Exception as e:
            print(f"      Error scraping website data: {e}")
            return {}
    
    def _classify_company_industry(self, company_data):
        """Classify company by industry based on keywords and description"""
        industry_info = {}
        
        # Combine all text for analysis
        text_to_analyze = []
        
        if company_data.get('company_name'):
            text_to_analyze.append(company_data['company_name'].lower())
        
        if company_data.get('description'):
            text_to_analyze.append(company_data['description'].lower())
        
        if company_data.get('company_description'):
            text_to_analyze.append(company_data['company_description'].lower())
        
        if company_data.get('industry'):
            text_to_analyze.append(company_data['industry'].lower())
        
        if company_data.get('specialties'):
            text_to_analyze.extend([spec.lower() for spec in company_data['specialties']])
        
        if not text_to_analyze:
            return industry_info
        
        # Score each industry based on keyword matches
        industry_scores = {}
        combined_text = ' '.join(text_to_analyze)
        
        for industry, keywords in self.industry_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword.lower() in combined_text:
                    score += 1
                    # Bonus for exact matches
                    if keyword.lower() in company_data.get('company_name', '').lower():
                        score += 2
            
            if score > 0:
                industry_scores[industry] = score
        
        # Get the industry with highest score
        if industry_scores:
            best_industry = max(industry_scores, key=industry_scores.get)
            industry_info['industry_category'] = best_industry
            industry_info['industry_confidence'] = min(industry_scores[best_industry] / 5.0, 1.0)  # Normalize to 0-1
            
            # Add subcategories if available
            if best_industry == 'technology':
                if any(word in combined_text for word in ['ai', 'artificial intelligence', 'machine learning']):
                    industry_info['subcategory'] = 'AI/ML'
                elif any(word in combined_text for word in ['saas', 'software', 'platform']):
                    industry_info['subcategory'] = 'SaaS/Software'
                elif any(word in combined_text for word in ['fintech', 'financial']):
                    industry_info['subcategory'] = 'FinTech'
                elif any(word in combined_text for word in ['healthtech', 'healthcare']):
                    industry_info['subcategory'] = 'HealthTech'
                elif any(word in combined_text for word in ['edtech', 'education']):
                    industry_info['subcategory'] = 'EdTech'
        
        return industry_info
    
    def _identify_decision_makers(self, company_data):
        """Identify decision-makers from company data"""
        decision_makers = []
        
        try:
            # Try to find team/leadership pages on company website
            if company_data.get('website'):
                team_members = self._scrape_team_members(company_data['website'])
                if team_members:
                    decision_makers.extend(team_members)
            
            # If no team data found, create generic decision-maker profiles
            if not decision_makers:
                decision_makers = self._create_generic_decision_makers(company_data)
            
            return decision_makers
            
        except Exception as e:
            print(f"      Error identifying decision-makers: {e}")
            return []
    
    def _scrape_team_members(self, website_url):
        """Scrape team member information from company website"""
        team_members = []
        
        try:
            # Common team/leadership page URLs
            team_page_patterns = [
                '/team', '/about/team', '/leadership', '/about/leadership',
                '/management', '/about/management', '/executives', '/about/executives',
                '/people', '/about/people', '/staff', '/about/staff'
            ]
            
            base_domain = self.utils.extract_company_domain(website_url)
            
            for pattern in team_page_patterns:
                team_url = urljoin(website_url, pattern)
                
                try:
                    session = self.utils.create_session()
                    response = self.utils.make_request(team_url, session)
                    
                    if response:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        
                        # Look for team member information
                        team_elements = soup.find_all(['div', 'section'], class_=re.compile(r'team|member|person|employee', re.IGNORECASE))
                        
                        for element in team_elements:
                            member_info = self._extract_team_member_info(element, base_domain)
                            if member_info:
                                team_members.append(member_info)
                        
                        if team_members:
                            break  # Found team data, no need to check other patterns
                    
                    time.sleep(1)  # Brief delay between requests
                    
                except Exception as e:
                    continue  # Try next pattern
            
            return team_members
            
        except Exception as e:
            print(f"        Error scraping team members: {e}")
            return []
    
    def _extract_team_member_info(self, element, company_domain):
        """Extract individual team member information"""
        try:
            member_info = {}
            
            # Extract name
            name_element = element.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            if name_element:
                member_info['name'] = self.utils.clean_text(name_element.get_text())
            
            # Extract job title
            title_element = element.find(['p', 'span', 'div'], class_=re.compile(r'title|position|role|job', re.IGNORECASE))
            if title_element:
                member_info['job_title'] = self.utils.clean_text(title_element.get_text())
            
            # Extract email
            email_element = element.find('a', href=re.compile(r'^mailto:', re.IGNORECASE))
            if email_element:
                email = email_element['href'].replace('mailto:', '').split('?')[0]
                if self.utils.is_valid_email(email) and not self.utils.is_personal_email(email):
                    member_info['email'] = email.lower()
            
            # Extract LinkedIn profile
            linkedin_element = element.find('a', href=re.compile(r'linkedin\.com', re.IGNORECASE))
            if linkedin_element:
                member_info['linkedin_profile'] = linkedin_element['href']
            
            # Extract bio/description
            bio_element = element.find(['p', 'div'], class_=re.compile(r'bio|description|about', re.IGNORECASE))
            if bio_element:
                member_info['bio'] = self.utils.clean_text(bio_element.get_text())
            
            # Classify decision-maker type
            if member_info.get('job_title'):
                member_info['decision_maker_type'] = self._classify_decision_maker_type(member_info['job_title'])
            
            # Only return if we have at least a name
            if member_info.get('name'):
                return member_info
            
            return None
            
        except Exception as e:
            return None
    
    def _classify_decision_maker_type(self, job_title):
        """Classify decision-maker by job title"""
        job_title_lower = job_title.lower()
        
        for category, titles in self.decision_maker_titles.items():
            for title in titles:
                if title.lower() in job_title_lower:
                    return category
        
        return 'other'
    
    def _create_generic_decision_makers(self, company_data):
        """Create generic decision-maker profiles when specific data isn't available"""
        decision_makers = []
        
        # Generic CEO/Founder
        ceo_info = {
            'name': 'CEO/Founder',
            'job_title': 'Chief Executive Officer',
            'decision_maker_type': 'executive',
            'email': f"ceo@{self.utils.extract_company_domain(company_data.get('website', ''))}" if company_data.get('website') else None,
            'is_generic': True
        }
        decision_makers.append(ceo_info)
        
        # Generic Marketing contact
        if company_data.get('website'):
            marketing_info = {
                'name': 'Marketing Contact',
                'job_title': 'Marketing Manager',
                'decision_maker_type': 'marketing',
                'email': f"marketing@{self.utils.extract_company_domain(company_data['website'])}",
                'is_generic': True
            }
            decision_makers.append(marketing_info)
        
        return decision_makers
    
    def _estimate_company_size(self, company_data):
        """Estimate company size based on available data"""
        try:
            # If we have specific size data, use it
            if company_data.get('company_size'):
                size_text = company_data['company_size'].lower()
                
                # Parse common size formats
                if '1-10' in size_text or '1 to 10' in size_text:
                    return '1-10 employees'
                elif '11-50' in size_text or '11 to 50' in size_text:
                    return '11-50 employees'
                elif '51-200' in size_text or '51 to 200' in size_text:
                    return '51-200 employees'
                elif '201-500' in size_text or '201 to 500' in size_text:
                    return '201-500 employees'
                elif '501-1000' in size_text or '501 to 1000' in size_text:
                    return '501-1000 employees'
                elif '1001-5000' in size_text or '1001 to 5000' in size_text:
                    return '1001-5000 employees'
                elif '5000+' in size_text or '5000+' in size_text:
                    return '5000+ employees'
            
            # Estimate based on industry and description
            if company_data.get('industry_category'):
                industry = company_data['industry_category']
                
                if industry == 'startup' or 'startup' in company_data.get('company_name', '').lower():
                    return '1-50 employees'
                elif industry in ['consulting', 'real_estate']:
                    return '11-200 employees'
                elif industry in ['technology', 'healthcare', 'finance']:
                    return '51-1000 employees'
                elif industry in ['manufacturing', 'retail']:
                    return '201-5000+ employees'
            
            return 'Unknown'
            
        except Exception as e:
            return 'Unknown'
    
    def _enrich_location_data(self, company_data):
        """Enrich location data with additional details"""
        location_data = {}
        
        try:
            # Extract state and city from headquarters
            if company_data.get('headquarters'):
                headquarters = company_data['headquarters']
                
                # Extract state
                state_match = re.search(r',\s*([A-Z]{2})\s*\d{5}', headquarters)
                if state_match:
                    location_data['state'] = state_match.group(1)
                
                # Extract city
                city_match = re.search(r'([A-Za-z\s]+),\s*[A-Z]{2}', headquarters)
                if city_match:
                    location_data['city'] = self.utils.clean_text(city_match.group(1))
                
                # Extract zip code
                zip_match = re.search(r'\d{5}', headquarters)
                if zip_match:
                    location_data['zip_code'] = zip_match.group()
            
            # Add country if not specified (assume US for now)
            if not location_data.get('country'):
                location_data['country'] = 'United States'
            
            return location_data
            
        except Exception as e:
            return {}
    
    def enrich_multiple_companies(self, companies_data):
        """Enrich multiple companies with additional data"""
        enriched_companies = []
        
        for i, company in enumerate(companies_data, 1):
            print(f"\nEnriching company {i}/{len(companies_data)}")
            
            enriched_company = self.enrich_company_data(company)
            enriched_companies.append(enriched_company)
            
            # Add delay between companies
            if i < len(companies_data):
                self.utils.delay_request()
        
        return enriched_companies
