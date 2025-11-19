#!/usr/bin/env python3
"""
Example usage of the new deduplication and validation system
"""

from database import DatabaseManager
import time

def main():
    # Initialize database manager
    db = DatabaseManager(db_type='sqlite')  # or 'postgresql'
    
    try:
        print("=== Lead Deduplication and Validation System ===\n")
        
        # 1. Deduplicate emails (remove duplicates)
        print("1. Running email deduplication...")
        deleted_count = db.deduplicate_emails()
        print(f"   Removed {deleted_count} duplicate emails\n")
        
        # 2. Validate all emails in the database
        print("2. Running comprehensive email validation...")
        print("   This may take a while depending on the number of emails...")
        total_processed, total_valid = db.validate_and_score_all_emails(batch_size=50)
        print(f"   Processed {total_processed} emails, {total_valid} are valid\n")
        
        # 3. Score lead quality for all companies
        print("3. Calculating lead quality scores...")
        contacts = db.get_contacts(limit=100)
        scored_count = 0
        
        for contact in contacts:
            try:
                quality_score = db.score_lead_quality(contact['id'])
                if quality_score:
                    scored_count += 1
                    print(f"   Company: {contact['company_name']}")
                    print(f"   Overall Score: {quality_score['overall_score']:.2f}")
                    print(f"   Domain Authority: {quality_score['domain_authority_score']:.2f}")
                    print(f"   LinkedIn Presence: {quality_score['linkedin_presence_score']:.2f}")
                    print(f"   Email Quality: {quality_score['email_quality_score']:.2f}")
                    print(f"   Spam Score: {quality_score['spam_score']:.2f}")
                    print()
                
                # Rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                print(f"   Error scoring {contact['company_name']}: {e}")
                continue
        
        print(f"   Scored {scored_count} companies\n")
        
        # 4. Get high-quality leads
        print("4. Retrieving high-quality leads...")
        high_quality_leads = db.get_high_quality_leads(min_score=0.7, limit=10)
        print(f"   Found {len(high_quality_leads)} high-quality leads (score >= 0.7)")
        
        for lead in high_quality_leads[:3]:  # Show first 3
            print(f"   - {lead['company_name']}: Score {lead['overall_score']:.2f}")
        print()
        
        # 5. Get potential spam leads
        print("5. Checking for potential spam leads...")
        spam_leads = db.get_spam_flagged_leads(min_spam_score=0.5, limit=10)
        print(f"   Found {len(spam_leads)} potential spam leads (spam score >= 0.5)")
        
        for lead in spam_leads[:3]:  # Show first 3
            print(f"   - {lead['company_name']}: Spam Score {lead['spam_score']:.2f}")
        print()
        
        # 6. Check for invalid emails
        print("6. Checking for invalid emails...")
        invalid_count = db.cleanup_invalid_emails(delete_invalid=False)
        print(f"   Found {invalid_count} invalid emails")
        
        # Uncomment the line below to actually delete invalid emails
        # deleted_count = db.cleanup_invalid_emails(delete_invalid=True)
        # print(f"   Deleted {deleted_count} invalid emails")
        
        print("\n=== Validation System Complete ===")
        
    except Exception as e:
        print(f"Error: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    main()
