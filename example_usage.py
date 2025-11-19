#!/usr/bin/env python3
"""
Example usage of the Business Contact Information Scraper
This script demonstrates how to use the scraper programmatically
"""

from main import BusinessContactScraper
import time

def example_basic_scraping():
    """Example of basic scraping functionality"""
    print("=== Basic Scraping Example ===")
    
    # Initialize scraper with SQLite database
    scraper = BusinessContactScraper(db_type='sqlite')
    
    try:
        # Search for technology companies in San Francisco
        query = "technology companies"
        location = "San Francisco"
        max_results = 10  # Limit results for demo
        
        print(f"Searching for: {query}")
        print(f"Location: {location}")
        print(f"Max results per source: {max_results}")
        
        # Run comprehensive scraping with email extraction and lead enrichment
        scraper.run_comprehensive_scraping(
            query=query,
            location=location,
            max_results_per_source=max_results,
            enhance_data=True,
            scrape_emails=True,  # Enable email scraping
            enrich_leads=True    # Enable lead enrichment
        )
        
    except Exception as e:
        print(f"Error during scraping: {e}")
    finally:
        scraper.db.close()

def example_industry_specific_scraping():
    """Example of industry-specific scraping"""
    print("\n=== Industry-Specific Scraping Example ===")
    
    scraper = BusinessContactScraper(db_type='sqlite')
    
    try:
        # Search for healthcare companies
        query = "healthcare companies"
        location = "New York"
        max_results = 15
        
        print(f"Searching for: {query}")
        print(f"Location: {location}")
        
        # Run scraping with email extraction and lead enrichment
        scraper.run_comprehensive_scraping(
            query=query,
            location=location,
            max_results_per_source=max_results,
            enhance_data=True,
            scrape_emails=True,
            enrich_leads=True
        )
        
    except Exception as e:
        print(f"Error during scraping: {e}")
    finally:
        scraper.db.close()

def example_database_search():
    """Example of searching the database"""
    print("\n=== Database Search Example ===")
    
    scraper = BusinessContactScraper(db_type='sqlite')
    
    try:
        # Search for companies in the database
        search_terms = ["technology", "healthcare", "finance"]
        
        for term in search_terms:
            print(f"\nSearching for: {term}")
            scraper.search_database(term)
            time.sleep(1)  # Brief pause between searches
        
    except Exception as e:
        print(f"Error during database search: {e}")
    finally:
        scraper.db.close()

def example_email_search():
    """Example of searching for emails by domain"""
    print("\n=== Email Search Example ===")
    
    scraper = BusinessContactScraper(db_type='sqlite')
    
    try:
        # Search for emails from specific domains
        domains = ["google.com", "microsoft.com", "apple.com"]
        
        for domain in domains:
            print(f"\nSearching for emails from: {domain}")
            scraper.search_emails_by_domain(domain)
            time.sleep(1)  # Brief pause between searches
        
    except Exception as e:
        print(f"Error during email search: {e}")
    finally:
        scraper.db.close()

def example_enriched_leads_search():
    """Example of searching for enriched leads with filters"""
    print("\n=== Enriched Leads Search Example ===")
    
    scraper = BusinessContactScraper(db_type='sqlite')
    
    try:
        # Search for enriched leads with various filters
        search_filters = [
            "technology,,",           # Industry only
            ",51-200 employees,",     # Company size only
            ",,San Francisco",        # Location only
            "technology,51-200 employees,San Francisco",  # All filters
            "healthcare,201-500 employees,",  # Industry and size
            "finance,,New York"       # Industry and location
        ]
        
        for filters in search_filters:
            print(f"\nSearching enriched leads with filters: {filters}")
            scraper.search_enriched_leads(*filters.split(','))
            time.sleep(1)  # Brief pause between searches
        
    except Exception as e:
        print(f"Error during enriched leads search: {e}")
    finally:
        scraper.db.close()

def example_custom_scraping():
    """Example of custom scraping with specific sources"""
    print("\n=== Custom Scraping Example ===")
    
    scraper = BusinessContactScraper(db_type='sqlite')
    
    try:
        # Search for restaurant chains
        query = "restaurant chains"
        location = "Los Angeles"
        max_results = 20
        
        print(f"Searching for: {query}")
        print(f"Location: {location}")
        
        # Step 1: Scrape from all sources
        companies = scraper.scrape_all_sources(query, location, max_results)
        
        if companies:
            print(f"\nFound {len(companies)} companies")
            
            # Step 2: Enhance data
            enhanced_companies = scraper.enhance_company_data(companies)
            
            # Step 3: Lead enrichment
            enriched_companies = scraper.enrich_company_leads(enhanced_companies)
            
            # Step 4: Scrape professional emails
            companies_with_emails = scraper.scrape_company_emails(enriched_companies)
            
            # Step 5: Save to database
            scraper.save_to_database(companies_with_emails)
            
            # Step 6: Print statistics
            scraper.print_statistics()
        
    except Exception as e:
        print(f"Error during custom scraping: {e}")
    finally:
        scraper.db.close()

def example_email_only_scraping():
    """Example of scraping only emails from existing companies"""
    print("\n=== Email-Only Scraping Example ===")
    
    scraper = BusinessContactScraper(db_type='sqlite')
    
    try:
        # Get existing companies from database
        companies = scraper.db.get_contacts(limit=5)  # Get first 5 companies
        
        if companies:
            print(f"Found {len(companies)} existing companies, scraping emails...")
            
            # Convert database results to company data format
            company_data_list = []
            for company in companies:
                company_data = {
                    'company_name': company.get('company_name'),
                    'website': company.get('website'),
                    'linkedin_profile': company.get('linkedin_profile'),
                    'source': company.get('source')
                }
                company_data_list.append(company_data)
            
            # Scrape emails from these companies
            companies_with_emails = scraper.scrape_company_emails(company_data_list)
            
            # Save emails to database
            for company in companies_with_emails:
                if company.get('scraped_emails'):
                    # Find company ID in database
                    search_results = scraper.db.search_contacts(company['company_name'])
                    if search_results:
                        company_id = search_results[0].get('id')
                        if company_id:
                            scraper.db.insert_emails(company_id, company['scraped_emails'])
                            print(f"Saved {len(company['scraped_emails'])} emails for {company['company_name']}")
        else:
            print("No companies found in database. Run scraping first.")
        
    except Exception as e:
        print(f"Error during email-only scraping: {e}")
    finally:
        scraper.db.close()

def example_lead_enrichment_only():
    """Example of enriching only existing companies without scraping"""
    print("\n=== Lead Enrichment Only Example ===")
    
    scraper = BusinessContactScraper(db_type='sqlite')
    
    try:
        # Get existing companies from database
        companies = scraper.db.get_contacts(limit=5)  # Get first 5 companies
        
        if companies:
            print(f"Found {len(companies)} existing companies, enriching leads...")
            
            # Convert database results to company data format
            company_data_list = []
            for company in companies:
                company_data = {
                    'company_name': company.get('company_name'),
                    'website': company.get('website'),
                    'linkedin_profile': company.get('linkedin_profile'),
                    'industry': company.get('industry'),
                    'description': company.get('raw_data', {}).get('description', ''),
                    'source': company.get('source')
                }
                company_data_list.append(company_data)
            
            # Enrich leads for these companies
            enriched_companies = scraper.enrich_company_leads(company_data_list)
            
            # Save enrichment data to database
            for company in enriched_companies:
                if company.get('industry_category') or company.get('decision_makers'):
                    # Find company ID in database
                    search_results = scraper.db.search_contacts(company['company_name'])
                    if search_results:
                        company_id = search_results[0].get('id')
                        if company_id:
                            enrichment_data = scraper._prepare_enrichment_data(company)
                            if enrichment_data:
                                scraper.db.insert_lead_enrichment(company_id, enrichment_data)
                                print(f"Saved enrichment data for {company['company_name']}")
        else:
            print("No companies found in database. Run scraping first.")
        
    except Exception as e:
        print(f"Error during lead enrichment: {e}")
    finally:
        scraper.db.close()

def example_postgresql_usage():
    """Example using PostgreSQL database (requires setup)"""
    print("\n=== PostgreSQL Database Example ===")
    
    # Note: This requires PostgreSQL to be set up with proper credentials
    # You can set environment variables or modify config.py
    
    try:
        scraper = BusinessContactScraper(db_type='postgresql')
        
        query = "startup companies"
        location = "Austin"
        max_results = 5
        
        print(f"Searching for: {query}")
        print(f"Location: {location}")
        
        scraper.run_comprehensive_scraping(
            query=query,
            location=location,
            max_results_per_source=max_results,
            enhance_data=False,  # Skip enhancement for demo
            scrape_emails=True,   # Enable email scraping
            enrich_leads=True     # Enable lead enrichment
        )
        
    except Exception as e:
        print(f"Error with PostgreSQL: {e}")
        print("Make sure PostgreSQL is configured properly in config.py")
    finally:
        if 'scraper' in locals():
            scraper.db.close()

def main():
    """Run all examples"""
    print("Business Contact Scraper - Example Usage")
    print("=" * 50)
    
    # Run examples
    example_basic_scraping()
    example_industry_specific_scraping()
    example_database_search()
    example_email_search()
    example_enriched_leads_search()
    example_custom_scraping()
    example_email_only_scraping()
    example_lead_enrichment_only()
    
    # Uncomment to test PostgreSQL (requires setup)
    # example_postgresql_usage()
    
    print("\n" + "=" * 50)
    print("All examples completed!")
    print("Check the database for scraped data, emails, and enriched leads.")
    print("\nNew features:")
    print("- Professional email extraction from company websites")
    print("- Separate emails table with confidence scoring")
    print("- Email type classification (general, support, sales, etc.)")
    print("- Domain-based email search")
    print("- Filtering out personal email domains (gmail, yahoo, etc.)")
    print("- Lead enrichment with industry classification")
    print("- Company size estimation and location enrichment")
    print("- Decision-maker identification and classification")
    print("- Enriched leads search with filters")

if __name__ == "__main__":
    main()
