#!/usr/bin/env python3
"""
Business Contact Information Scraper
Main script that orchestrates scraping from multiple sources and saves to database
"""

import argparse
import json
import time
from datetime import datetime
from database import DatabaseManager
from scrapers import GoogleScraper, LinkedInScraper, YellowPagesScraper, EmailScraper, LeadEnrichment
from utils import ScrapingUtils
from config import SCRAPING_CONFIG

class BusinessContactScraper:
    def __init__(self, db_type='sqlite'):
        """Initialize the scraper with database connection"""
        self.db = DatabaseManager(db_type)
        self.utils = ScrapingUtils()
        
        # Initialize scrapers
        self.google_scraper = GoogleScraper()
        self.linkedin_scraper = LinkedInScraper()
        self.yellowpages_scraper = YellowPagesScraper()
        self.email_scraper = EmailScraper()
        self.lead_enrichment = LeadEnrichment()
        
        # Statistics
        self.stats = {
            'total_companies': 0,
            'companies_saved': 0,
            'total_emails_found': 0,
            'emails_saved': 0,
            'companies_enriched': 0,
            'decision_makers_found': 0,
            'errors': 0,
            'start_time': None,
            'end_time': None
        }
    
    def scrape_all_sources(self, query, location=None, max_results_per_source=None):
        """Scrape business contacts from all available sources"""
        if max_results_per_source is None:
            max_results_per_source = SCRAPING_CONFIG['max_results_per_source']
        
        self.stats['start_time'] = datetime.now()
        print(f"Starting comprehensive business contact scraping for: {query}")
        if location:
            print(f"Location: {location}")
        print(f"Max results per source: {max_results_per_source}")
        print("-" * 50)
        
        all_companies = []
        
        # Scrape from Google
        print("\n1. Scraping from Google...")
        try:
            google_companies = self.google_scraper.search_companies(query, location, max_results_per_source)
            print(f"   Found {len(google_companies)} companies on Google")
            all_companies.extend(google_companies)
        except Exception as e:
            print(f"   Error scraping Google: {e}")
            self.stats['errors'] += 1
        
        # Scrape from LinkedIn
        print("\n2. Scraping from LinkedIn...")
        try:
            linkedin_companies = self.linkedin_scraper.search_companies(query, location, max_results_per_source)
            print(f"   Found {len(linkedin_companies)} companies on LinkedIn")
            all_companies.extend(linkedin_companies)
        except Exception as e:
            print(f"   Error scraping LinkedIn: {e}")
            self.stats['errors'] += 1
        
        # Scrape from YellowPages
        print("\n3. Scraping from YellowPages...")
        try:
            yellowpages_companies = self.yellowpages_scraper.search_companies(query, location, max_results_per_source)
            print(f"   Found {len(yellowpages_companies)} companies on YellowPages")
            print(f"   Found {len(yellowpages_companies)} companies on YellowPages")
            all_companies.extend(yellowpages_companies)
        except Exception as e:
            print(f"   Error scraping YellowPages: {e}")
            self.stats['errors'] += 1
        
        self.stats['total_companies'] = len(all_companies)
        print(f"\nTotal companies found: {self.stats['total_companies']}")
        
        return all_companies
    
    def enhance_company_data(self, companies):
        """Enhance company data by getting additional details from company websites"""
        print(f"\nEnhancing company data for {len(companies)} companies...")
        enhanced_companies = []
        
        for i, company in enumerate(companies, 1):
            print(f"   Enhancing {i}/{len(companies)}: {company.get('company_name', 'Unknown')}")
            
            try:
                enhanced_company = company.copy()
                
                # Try to get additional details from company website
                if company.get('website'):
                    print(f"     Getting details from: {company['website']}")
                    website_details = self.google_scraper.get_company_details(company['website'])
                    if website_details:
                        # Merge data, preferring original data over website data
                        for key, value in website_details.items():
                            if key not in enhanced_company or not enhanced_company[key]:
                                enhanced_company[key] = value
                
                # Try to get additional details from LinkedIn profile
                if company.get('linkedin_profile'):
                    print(f"     Getting details from LinkedIn: {company['linkedin_profile']}")
                    linkedin_details = self.linkedin_scraper.get_company_details(company['linkedin_profile'])
                    if linkedin_details:
                        # Merge data, preferring original data over LinkedIn data
                        for key, value in linkedin_details.items():
                            if key not in enhanced_company or not enhanced_company[key]:
                                enhanced_company[key] = value
                
                enhanced_companies.append(enhanced_company)
                
                # Add delay between requests
                self.utils.delay_request()
                
            except Exception as e:
                print(f"     Error enhancing company data: {e}")
                self.stats['errors'] += 1
                enhanced_companies.append(company)
        
        return enhanced_companies
    
    def enrich_company_leads(self, companies):
        """Enrich company leads with additional information from free sources"""
        print(f"\nEnriching company leads for {len(companies)} companies...")
        
        enriched_companies = []
        
        for i, company in enumerate(companies, 1):
            company_name = company.get('company_name', f'Company {i}')
            print(f"\n  Enriching {i}/{len(companies)}: {company_name}")
            
            try:
                # Enrich company data
                enriched_company = self.lead_enrichment.enrich_company_data(company)
                
                if enriched_company:
                    # Count decision-makers found
                    decision_makers = enriched_company.get('decision_makers', [])
                    if decision_makers:
                        self.stats['decision_makers_found'] += len(decision_makers)
                    
                    enriched_companies.append(enriched_company)
                    self.stats['companies_enriched'] += 1
                    
                    print(f"    Lead enrichment completed")
                else:
                    enriched_companies.append(company)
                
                # Add delay between companies
                if i < len(companies):
                    self.utils.delay_request()
                
            except Exception as e:
                print(f"    Error enriching company lead: {e}")
                self.stats['errors'] += 1
                enriched_companies.append(company)
        
        return enriched_companies
    
    def scrape_company_emails(self, companies):
        """Scrape professional emails from company websites"""
        print(f"\nScraping professional emails from {len(companies)} company websites...")
        
        companies_with_emails = []
        
        for i, company in enumerate(companies, 1):
            company_name = company.get('company_name', f'Company {i}')
            print(f"\n  Processing {i}/{len(companies)}: {company_name}")
            
            try:
                # Scrape emails from company website
                emails = self.email_scraper.scrape_company_emails(company)
                
                if emails:
                    company['scraped_emails'] = emails
                    self.stats['total_emails_found'] += len(emails)
                    print(f"    Found {len(emails)} professional emails")
                else:
                    company['scraped_emails'] = []
                    print(f"    No professional emails found")
                
                companies_with_emails.append(company)
                
                # Add delay between companies
                if i < len(companies):
                    self.utils.delay_request()
                
            except Exception as e:
                print(f"    Error scraping emails: {e}")
                self.stats['errors'] += 1
                company['scraped_emails'] = []
                companies_with_emails.append(company)
        
        return companies_with_emails
    
    def save_to_database(self, companies):
        """Save enhanced company data, emails, and lead enrichment to database"""
        print(f"\nSaving {len(companies)} companies, emails, and lead enrichment to database...")
        
        for i, company in enumerate(companies, 1):
            try:
                # Prepare data for database
                contact_data = {
                    'company_name': company.get('company_name'),
                    'email': company.get('email'),
                    'website': company.get('website'),
                    'linkedin_profile': company.get('linkedin_profile'),
                    'phone': company.get('phone'),
                    'address': company.get('address') or company.get('location'),
                    'industry': company.get('industry') or company.get('category'),
                    'source': company.get('source'),
                    'raw_data': company
                }
                
                # Validate required fields
                if not contact_data['company_name']:
                    print(f"   Skipping company {i}: Missing company name")
                    continue
                
                # Save company to database
                company_id = self.db.insert_contact(contact_data)
                if company_id:
                    self.stats['companies_saved'] += 1
                    print(f"   Saved company {i}/{len(companies)}: {contact_data['company_name']} (ID: {company_id})")
                    
                    # Save emails if any were scraped
                    if company.get('scraped_emails'):
                        emails_saved = self.db.insert_emails(company_id, company['scraped_emails'])
                        if emails_saved:
                            self.stats['emails_saved'] += len(company['scraped_emails'])
                            print(f"     Saved {len(company['scraped_emails'])} emails")
                        else:
                            print(f"     Failed to save emails")
                    
                    # Save lead enrichment data
                    enrichment_data = self._prepare_enrichment_data(company)
                    if enrichment_data:
                        enrichment_saved = self.db.insert_lead_enrichment(company_id, enrichment_data)
                        if enrichment_saved:
                            print(f"     Saved lead enrichment data")
                        else:
                            print(f"     Failed to save lead enrichment data")
                else:
                    print(f"   Failed to save company {i}/{len(companies)}: {contact_data['company_name']}")
                    self.stats['errors'] += 1
                
            except Exception as e:
                print(f"   Error saving company {i}: {e}")
                self.stats['errors'] += 1
    
    def _prepare_enrichment_data(self, company):
        """Prepare lead enrichment data for database storage"""
        enrichment_data = {}
        
        # Industry classification
        if company.get('industry_category'):
            enrichment_data['industry_category'] = company['industry_category']
        if company.get('industry_confidence'):
            enrichment_data['industry_confidence'] = company['industry_confidence']
        if company.get('subcategory'):
            enrichment_data['subcategory'] = company['subcategory']
        
        # Company size
        if company.get('company_size'):
            enrichment_data['company_size'] = company['company_size']
        if company.get('estimated_company_size'):
            enrichment_data['estimated_company_size'] = company['estimated_company_size']
        
        # Company details
        if company.get('founded_year'):
            enrichment_data['founded_year'] = company['founded_year']
        if company.get('headquarters'):
            enrichment_data['headquarters'] = company['headquarters']
        
        # Location data
        if company.get('city'):
            enrichment_data['city'] = company['city']
        if company.get('state'):
            enrichment_data['state'] = company['state']
        if company.get('zip_code'):
            enrichment_data['zip_code'] = company['zip_code']
        if company.get('country'):
            enrichment_data['country'] = company['country']
        
        # Company description
        if company.get('company_description'):
            enrichment_data['company_description'] = company['company_description']
        
        # Specialties
        if company.get('specialties'):
            enrichment_data['specialties'] = company['specialties']
        
        # Decision makers
        if company.get('decision_makers'):
            enrichment_data['decision_makers'] = company['decision_makers']
        
        # Enrichment source and score
        enrichment_data['enrichment_source'] = 'lead_enrichment'
        
        # Calculate enrichment score based on data completeness
        score = 0.0
        if enrichment_data.get('industry_category'): score += 0.2
        if enrichment_data.get('company_size'): score += 0.2
        if enrichment_data.get('headquarters'): score += 0.2
        if enrichment_data.get('decision_makers'): score += 0.3
        if enrichment_data.get('company_description'): score += 0.1
        
        enrichment_data['enrichment_score'] = min(score, 1.0)
        
        return enrichment_data if enrichment_data else None
    
    def run_comprehensive_scraping(self, query, location=None, max_results_per_source=None, enhance_data=True, scrape_emails=True, enrich_leads=True):
        """Run the complete scraping process"""
        try:
            # Step 1: Scrape from all sources
            companies = self.scrape_all_sources(query, location, max_results_per_source)
            
            if not companies:
                print("No companies found. Exiting.")
                return
            
            # Step 2: Enhance data (optional)
            if enhance_data:
                companies = self.enhance_company_data(companies)
            
            # Step 3: Lead enrichment (optional)
            if enrich_leads:
                companies = self.enrich_company_leads(companies)
            
            # Step 4: Scrape professional emails (optional)
            if scrape_emails:
                companies = self.scrape_company_emails(companies)
            
            # Step 5: Save to database
            self.save_to_database(companies)
            
            # Step 6: Print final statistics
            self.print_statistics()
            
        except Exception as e:
            print(f"Error during comprehensive scraping: {e}")
            self.stats['errors'] += 1
        finally:
            self.db.close()
    
    def print_statistics(self):
        """Print scraping statistics"""
        self.stats['end_time'] = datetime.now()
        duration = self.stats['end_time'] - self.stats['start_time']
        
        print("\n" + "=" * 50)
        print("SCRAPING COMPLETED - FINAL STATISTICS")
        print("=" * 50)
        print(f"Total companies found: {self.stats['total_companies']}")
        print(f"Companies saved to database: {self.stats['companies_saved']}")
        print(f"Total professional emails found: {self.stats['total_emails_found']}")
        print(f"Emails saved to database: {self.stats['emails_saved']}")
        print(f"Companies enriched: {self.stats['companies_enriched']}")
        print(f"Decision-makers identified: {self.stats['decision_makers_found']}")
        print(f"Errors encountered: {self.stats['errors']}")
        print(f"Company success rate: {(self.stats['companies_saved'] / max(self.stats['total_companies'], 1)) * 100:.1f}%")
        if self.stats['total_emails_found'] > 0:
            print(f"Email success rate: {(self.stats['emails_saved'] / max(self.stats['total_emails_found'], 1)) * 100:.1f}%")
        if self.stats['companies_enriched'] > 0:
            print(f"Enrichment success rate: {(self.stats['companies_enriched'] / max(self.stats['total_companies'], 1)) * 100:.1f}%")
        print(f"Total duration: {duration}")
        print(f"Start time: {self.stats['start_time']}")
        print(f"End time: {self.stats['end_time']}")
        print("=" * 50)
    
    def search_database(self, search_term):
        """Search for companies in the database"""
        print(f"Searching database for: {search_term}")
        results = self.db.search_contacts(search_term)
        
        if not results:
            print("No results found.")
            return
        
        print(f"Found {len(results)} results:")
        for i, result in enumerate(results, 1):
            print(f"\n{i}. {result.get('company_name', 'Unknown')}")
            if result.get('email'):
                print(f"   Email: {result['email']}")
            if result.get('phone'):
                print(f"   Phone: {result['phone']}")
            if result.get('website'):
                print(f"   Website: {result['website']}")
            if result.get('linkedin_profile'):
                print(f"   LinkedIn: {result['linkedin_profile']}")
            if result.get('address'):
                print(f"   Address: {result['address']}")
            if result.get('industry'):
                print(f"   Industry: {result['industry']}")
            print(f"   Source: {result.get('source', 'Unknown')}")
            
            # Show scraped emails if available
            company_id = result.get('id')
            if company_id:
                emails = self.db.get_company_emails(company_id)
                if emails:
                    print(f"   Professional emails found:")
                    for email_data in emails:
                        confidence = email_data.get('confidence_score', 0)
                        email_type = email_data.get('email_type', 'general')
                        print(f"     - {email_data.get('email')} ({email_type}, confidence: {confidence:.2f})")
                
                # Show lead enrichment data if available
                enrichment = self.db.get_lead_enrichment(company_id)
                if enrichment:
                    print(f"   Lead enrichment data:")
                    if enrichment.get('industry_category'):
                        print(f"     Industry: {enrichment['industry_category']} (confidence: {enrichment.get('industry_confidence', 0):.2f})")
                    if enrichment.get('estimated_company_size'):
                        print(f"     Company size: {enrichment['estimated_company_size']}")
                    if enrichment.get('headquarters'):
                        print(f"     Headquarters: {enrichment['headquarters']}")
                    if enrichment.get('decision_makers'):
                        print(f"     Decision-makers: {len(enrichment['decision_makers'])} found")
    
    def search_emails_by_domain(self, domain):
        """Search for emails by domain"""
        print(f"Searching for emails from domain: {domain}")
        results = self.db.search_emails_by_domain(domain)
        
        if not results:
            print("No emails found for this domain.")
            return
        
        print(f"Found {len(results)} emails:")
        for i, result in enumerate(results, 1):
            print(f"\n{i}. {result.get('email')}")
            print(f"   Company: {result.get('company_name', 'Unknown')}")
            print(f"   Type: {result.get('email_type', 'general')}")
            print(f"   Confidence: {result.get('confidence_score', 0):.2f}")
            print(f"   Source: {result.get('source_page', 'Unknown')}")
            print(f"   Verified: {result.get('is_verified', False)}")
    
    def search_enriched_leads(self, industry=None, company_size=None, location=None, limit=100):
        """Search for enriched leads with filters"""
        print(f"Searching enriched leads...")
        if industry:
            print(f"  Industry filter: {industry}")
        if company_size:
            print(f"  Company size filter: {company_size}")
        if location:
            print(f"  Location filter: {location}")
        
        results = self.db.search_enriched_leads(industry, company_size, location, limit)
        
        if not results:
            print("No enriched leads found.")
            return
        
        print(f"Found {len(results)} enriched leads:")
        for i, result in enumerate(results, 1):
            print(f"\n{i}. {result.get('company_name', 'Unknown')}")
            
            # Basic company info
            if result.get('website'):
                print(f"   Website: {result['website']}")
            if result.get('phone'):
                print(f"   Phone: {result['phone']}")
            
            # Enrichment data
            if result.get('industry_category'):
                confidence = result.get('industry_confidence', 0)
                print(f"   Industry: {result['industry_category']} (confidence: {confidence:.2f})")
                if result.get('subcategory'):
                    print(f"   Subcategory: {result['subcategory']}")
            
            if result.get('estimated_company_size'):
                print(f"   Company size: {result['estimated_company_size']}")
            
            if result.get('headquarters'):
                print(f"   Headquarters: {result['headquarters']}")
            
            if result.get('decision_makers'):
                print(f"   Decision-makers: {len(result['decision_makers'])} found")
                for j, dm in enumerate(result['decision_makers'][:3], 1):  # Show first 3
                    print(f"     {j}. {dm.get('name', 'Unknown')} - {dm.get('job_title', 'Unknown')}")
                if len(result['decision_makers']) > 3:
                    print(f"     ... and {len(result['decision_makers']) - 3} more")
            
            print(f"   Enrichment score: {result.get('enrichment_score', 0):.2f}")

def main():
    """Main function to handle command line arguments and run the scraper"""
    parser = argparse.ArgumentParser(description='Business Contact Information Scraper')
    parser.add_argument('query', help='Search query for companies')
    parser.add_argument('--location', '-l', help='Location to search in')
    parser.add_argument('--max-results', '-m', type=int, help='Maximum results per source')
    parser.add_argument('--database', '-d', choices=['sqlite', 'postgresql'], default='sqlite', 
                       help='Database type to use (default: sqlite)')
    parser.add_argument('--no-enhance', action='store_true', help='Skip data enhancement step')
    parser.add_argument('--no-emails', action='store_true', help='Skip email scraping step')
    parser.add_argument('--no-enrichment', action='store_true', help='Skip lead enrichment step')
    parser.add_argument('--search-db', '-s', help='Search existing database for companies')
    parser.add_argument('--search-emails', help='Search for emails by domain')
    parser.add_argument('--search-enriched', help='Search enriched leads with filters (format: industry,size,location)')
    
    args = parser.parse_args()
    
    # Initialize scraper
    scraper = BusinessContactScraper(args.database)
    
    try:
        if args.search_db:
            # Search existing database
            scraper.search_database(args.search_db)
        elif args.search_emails:
            # Search emails by domain
            scraper.search_emails_by_domain(args.search_emails)
        elif args.search_enriched:
            # Parse search filters
            filters = args.search_enriched.split(',')
            industry = filters[0].strip() if len(filters) > 0 and filters[0].strip() else None
            company_size = filters[1].strip() if len(filters) > 1 and filters[1].strip() else None
            location = filters[2].strip() if len(filters) > 2 and filters[2].strip() else None
            
            scraper.search_enriched_leads(industry, company_size, location)
        else:
            # Run comprehensive scraping
            scraper.run_comprehensive_scraping(
                query=args.query,
                location=args.location,
                max_results_per_source=args.max_results,
                enhance_data=not args.no_enhance,
                scrape_emails=not args.no_emails,
                enrich_leads=not args.no_enrichment
            )
    
    except KeyboardInterrupt:
        print("\nScraping interrupted by user.")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        scraper.db.close()

if __name__ == "__main__":
    main()
