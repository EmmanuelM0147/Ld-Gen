import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import re
import smtplib
import socket
import dns.resolver
import requests
from urllib.parse import urlparse
from datetime import datetime, timedelta
from config import DATABASE_CONFIG

class DatabaseManager:
    def __init__(self, db_type='sqlite'):
        self.db_type = db_type
        self.connection = None
        self.cursor = None
        self.connect()
        self.create_tables()
    
    def connect(self):
        """Establish database connection"""
        try:
            if self.db_type == 'postgresql':
                config = DATABASE_CONFIG['postgresql']
                self.connection = psycopg2.connect(
                    host=config['host'],
                    port=config['port'],
                    database=config['database'],
                    user=config['user'],
                    password=config['password']
                )
                self.cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            else:
                config = DATABASE_CONFIG['sqlite']
                self.connection = sqlite3.connect(config['database'])
                self.connection.row_factory = sqlite3.Row
                self.cursor = self.connection.cursor()
            
            print(f"Connected to {self.db_type} database successfully")
        except Exception as e:
            print(f"Database connection error: {e}")
            raise
    
    def create_tables(self):
        """Create necessary tables if they don't exist"""
        try:
            if self.db_type == 'postgresql':
                # Create business_contacts table
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS business_contacts (
                        id SERIAL PRIMARY KEY,
                        company_name VARCHAR(255) NOT NULL,
                        email VARCHAR(255),
                        website VARCHAR(500),
                        linkedin_profile VARCHAR(500),
                        phone VARCHAR(50),
                        address TEXT,
                        industry VARCHAR(255),
                        source VARCHAR(100),
                        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        raw_data JSONB
                    )
                """)
                
                # Create emails table for storing multiple professional emails per company
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS company_emails (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER REFERENCES business_contacts(id) ON DELETE CASCADE,
                        email VARCHAR(255) NOT NULL,
                        email_type VARCHAR(100),
                        confidence_score DECIMAL(3,2) DEFAULT 0.0,
                        source_page VARCHAR(500),
                        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_verified BOOLEAN DEFAULT FALSE,
                        UNIQUE(company_id, email)
                    )
                """)
                
                # Create lead_enrichment table for storing enriched company data
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lead_enrichment (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER REFERENCES business_contacts(id) ON DELETE CASCADE,
                        industry_category VARCHAR(100),
                        industry_confidence DECIMAL(3,2),
                        subcategory VARCHAR(100),
                        company_size VARCHAR(100),
                        estimated_company_size VARCHAR(100),
                        founded_year VARCHAR(10),
                        headquarters TEXT,
                        city VARCHAR(100),
                        state VARCHAR(10),
                        zip_code VARCHAR(20),
                        country VARCHAR(100),
                        company_description TEXT,
                        specialties TEXT[],
                        decision_makers JSONB,
                        enrichment_source VARCHAR(100),
                        enriched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        enrichment_score DECIMAL(3,2) DEFAULT 0.0,
                        UNIQUE(company_id)
                    )
                """)
                
                # Create email_validation table for tracking email validation results
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS email_validation (
                        id SERIAL PRIMARY KEY,
                        email_id INTEGER REFERENCES company_emails(id) ON DELETE CASCADE,
                        is_valid BOOLEAN DEFAULT FALSE,
                        validation_method VARCHAR(50),
                        smtp_response TEXT,
                        dns_check BOOLEAN DEFAULT FALSE,
                        mx_record_exists BOOLEAN DEFAULT FALSE,
                        validation_score DECIMAL(3,2) DEFAULT 0.0,
                        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        next_check_date TIMESTAMP,
                        validation_notes TEXT,
                        UNIQUE(email_id)
                    )
                """)
                
                # Create lead_quality_scores table for tracking lead quality metrics
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lead_quality_scores (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER REFERENCES business_contacts(id) ON DELETE CASCADE,
                        overall_score DECIMAL(3,2) DEFAULT 0.0,
                        domain_authority_score DECIMAL(3,2) DEFAULT 0.0,
                        linkedin_presence_score DECIMAL(3,2) DEFAULT 0.0,
                        email_quality_score DECIMAL(3,2) DEFAULT 0.0,
                        company_info_completeness DECIMAL(3,2) DEFAULT 0.0,
                        spam_score DECIMAL(3,2) DEFAULT 0.0,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        scoring_notes TEXT,
                        UNIQUE(company_id)
                    )
                """)
                
                # Create spam_detection table for tracking potential spam indicators
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS spam_detection (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER REFERENCES business_contacts(id) ON DELETE CASCADE,
                        email_id INTEGER REFERENCES company_emails(id) ON DELETE CASCADE,
                        spam_score DECIMAL(3,2) DEFAULT 0.0,
                        spam_indicators TEXT[],
                        is_whitelisted BOOLEAN DEFAULT FALSE,
                        is_blacklisted BOOLEAN DEFAULT FALSE,
                        detection_method VARCHAR(100),
                        flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        reviewed_by VARCHAR(100),
                        review_notes TEXT,
                        UNIQUE(company_id, email_id)
                    )
                """)
                
            else:
                # Create business_contacts table
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS business_contacts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_name TEXT NOT NULL,
                        email TEXT,
                        website TEXT,
                        linkedin_profile TEXT,
                        phone TEXT,
                        address TEXT,
                        industry TEXT,
                        source TEXT,
                        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        raw_data TEXT
                    )
                """)
                
                # Create emails table for storing multiple professional emails per company
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS company_emails (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_id INTEGER,
                        email TEXT NOT NULL,
                        email_type TEXT,
                        confidence_score REAL DEFAULT 0.0,
                        source_page TEXT,
                        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_verified INTEGER DEFAULT 0,
                        FOREIGN KEY (company_id) REFERENCES business_contacts(id) ON DELETE CASCADE,
                        UNIQUE(company_id, email)
                    )
                """)
                
                # Create lead_enrichment table for storing enriched company data
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lead_enrichment (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_id INTEGER,
                        industry_category TEXT,
                        industry_confidence REAL,
                        subcategory TEXT,
                        company_size TEXT,
                        estimated_company_size TEXT,
                        founded_year TEXT,
                        headquarters TEXT,
                        city TEXT,
                        state TEXT,
                        zip_code TEXT,
                        country TEXT,
                        company_description TEXT,
                        specialties TEXT,
                        decision_makers TEXT,
                        enrichment_source TEXT,
                        enriched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        enrichment_score REAL DEFAULT 0.0,
                        FOREIGN KEY (company_id) REFERENCES business_contacts(id) ON DELETE CASCADE,
                        UNIQUE(company_id)
                    )
                """)
                
                # Create email_validation table for tracking email validation results
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS email_validation (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email_id INTEGER,
                        is_valid INTEGER DEFAULT 0,
                        validation_method TEXT,
                        smtp_response TEXT,
                        dns_check INTEGER DEFAULT 0,
                        mx_record_exists INTEGER DEFAULT 0,
                        validation_score REAL DEFAULT 0.0,
                        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        next_check_date TIMESTAMP,
                        validation_notes TEXT,
                        FOREIGN KEY (email_id) REFERENCES company_emails(id) ON DELETE CASCADE,
                        UNIQUE(email_id)
                    )
                """)
                
                # Create lead_quality_scores table for tracking lead quality metrics
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lead_quality_scores (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_id INTEGER,
                        overall_score REAL DEFAULT 0.0,
                        domain_authority_score REAL DEFAULT 0.0,
                        linkedin_presence_score REAL DEFAULT 0.0,
                        email_quality_score REAL DEFAULT 0.0,
                        company_info_completeness REAL DEFAULT 0.0,
                        spam_score REAL DEFAULT 0.0,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        scoring_notes TEXT,
                        FOREIGN KEY (company_id) REFERENCES business_contacts(id) ON DELETE CASCADE,
                        UNIQUE(company_id)
                    )
                """)
                
                # Create spam_detection table for tracking potential spam indicators
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS spam_detection (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_id INTEGER,
                        email_id INTEGER,
                        spam_score REAL DEFAULT 0.0,
                        spam_indicators TEXT,
                        is_whitelisted INTEGER DEFAULT 0,
                        is_blacklisted INTEGER DEFAULT 0,
                        detection_method TEXT,
                        flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        reviewed_by TEXT,
                        review_notes TEXT,
                        FOREIGN KEY (company_id) REFERENCES business_contacts(id) ON DELETE CASCADE,
                        FOREIGN KEY (email_id) REFERENCES company_emails(id) ON DELETE CASCADE,
                        UNIQUE(company_id, email_id)
                    )
                """)
            
            self.connection.commit()
            print("Tables created successfully")
        except Exception as e:
            print(f"Error creating tables: {e}")
            raise
    
    def insert_contact(self, contact_data):
        """Insert a new business contact"""
        try:
            query = """
                INSERT INTO business_contacts 
                (company_name, email, website, linkedin_profile, phone, address, industry, source, raw_data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            if self.db_type == 'postgresql':
                values = (
                    contact_data.get('company_name'),
                    contact_data.get('email'),
                    contact_data.get('website'),
                    contact_data.get('linkedin_profile'),
                    contact_data.get('phone'),
                    contact_data.get('address'),
                    contact_data.get('industry'),
                    contact_data.get('source'),
                    json.dumps(contact_data.get('raw_data', {}))
                )
            else:
                values = (
                    contact_data.get('company_name'),
                    contact_data.get('email'),
                    contact_data.get('website'),
                    contact_data.get('linkedin_profile'),
                    contact_data.get('phone'),
                    contact_data.get('address'),
                    contact_data.get('industry'),
                    contact_data.get('source'),
                    json.dumps(contact_data.get('raw_data', {}))
                )
            
            self.cursor.execute(query, values)
            self.connection.commit()
            
            # Return the ID of the inserted contact
            if self.db_type == 'postgresql':
                return self.cursor.fetchone()['id'] if self.cursor.fetchone() else None
            else:
                return self.cursor.lastrowid
                
        except Exception as e:
            print(f"Error inserting contact: {e}")
            self.connection.rollback()
            return None
    
    def insert_emails(self, company_id, emails_data):
        """Insert multiple emails for a company"""
        if not company_id or not emails_data:
            return False
        
        try:
            if self.db_type == 'postgresql':
                query = """
                    INSERT INTO company_emails 
                    (company_id, email, email_type, confidence_score, source_page, is_verified)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (company_id, email) DO UPDATE SET
                    confidence_score = EXCLUDED.confidence_score,
                    is_verified = EXCLUDED.is_verified
                """
            else:
                query = """
                    INSERT OR REPLACE INTO company_emails 
                    (company_id, email, email_type, confidence_score, source_page, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?)
                """
            
            inserted_count = 0
            for email_data in emails_data:
                try:
                    values = (
                        company_id,
                        email_data.get('email'),
                        email_data.get('email_type', 'general'),
                        email_data.get('confidence_score', 0.0),
                        email_data.get('source_page', ''),
                        email_data.get('is_verified', False)
                    )
                    
                    self.cursor.execute(query, values)
                    inserted_count += 1
                    
                except Exception as e:
                    print(f"Error inserting email {email_data.get('email')}: {e}")
                    continue
            
            self.connection.commit()
            print(f"Inserted {inserted_count} emails for company ID {company_id}")
            return inserted_count > 0
            
        except Exception as e:
            print(f"Error inserting emails: {e}")
            self.connection.rollback()
            return False
    
    def insert_lead_enrichment(self, company_id, enrichment_data):
        """Insert or update lead enrichment data for a company"""
        if not company_id or not enrichment_data:
            return False
        
        try:
            if self.db_type == 'postgresql':
                query = """
                    INSERT INTO lead_enrichment 
                    (company_id, industry_category, industry_confidence, subcategory, company_size, 
                     estimated_company_size, founded_year, headquarters, city, state, zip_code, country,
                     company_description, specialties, decision_makers, enrichment_source, enrichment_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (company_id) DO UPDATE SET
                    industry_category = EXCLUDED.industry_category,
                    industry_confidence = EXCLUDED.industry_confidence,
                    subcategory = EXCLUDED.subcategory,
                    company_size = EXCLUDED.company_size,
                    estimated_company_size = EXCLUDED.estimated_company_size,
                    founded_year = EXCLUDED.founded_year,
                    headquarters = EXCLUDED.headquarters,
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    zip_code = EXCLUDED.zip_code,
                    country = EXCLUDED.country,
                    company_description = EXCLUDED.company_description,
                    specialties = EXCLUDED.specialties,
                    decision_makers = EXCLUDED.decision_makers,
                    enrichment_source = EXCLUDED.enrichment_source,
                    enrichment_score = EXCLUDED.enrichment_score,
                    enriched_at = CURRENT_TIMESTAMP
                """
            else:
                query = """
                    INSERT OR REPLACE INTO lead_enrichment 
                    (company_id, industry_category, industry_confidence, subcategory, company_size, 
                     estimated_company_size, founded_year, headquarters, city, state, zip_code, country,
                     company_description, specialties, decision_makers, enrichment_source, enrichment_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
            
            # Prepare values
            if self.db_type == 'postgresql':
                values = (
                    company_id,
                    enrichment_data.get('industry_category'),
                    enrichment_data.get('industry_confidence'),
                    enrichment_data.get('subcategory'),
                    enrichment_data.get('company_size'),
                    enrichment_data.get('estimated_company_size'),
                    enrichment_data.get('founded_year'),
                    enrichment_data.get('headquarters'),
                    enrichment_data.get('city'),
                    enrichment_data.get('state'),
                    enrichment_data.get('zip_code'),
                    enrichment_data.get('country'),
                    enrichment_data.get('company_description'),
                    enrichment_data.get('specialties', []),
                    json.dumps(enrichment_data.get('decision_makers', [])),
                    enrichment_data.get('enrichment_source', 'lead_enrichment'),
                    enrichment_data.get('enrichment_score', 0.0)
                )
            else:
                values = (
                    company_id,
                    enrichment_data.get('industry_category'),
                    enrichment_data.get('industry_confidence'),
                    enrichment_data.get('subcategory'),
                    enrichment_data.get('company_size'),
                    enrichment_data.get('estimated_company_size'),
                    enrichment_data.get('founded_year'),
                    enrichment_data.get('headquarters'),
                    enrichment_data.get('city'),
                    enrichment_data.get('state'),
                    enrichment_data.get('zip_code'),
                    enrichment_data.get('country'),
                    enrichment_data.get('company_description'),
                    json.dumps(enrichment_data.get('specialties', [])),
                    json.dumps(enrichment_data.get('decision_makers', [])),
                    enrichment_data.get('enrichment_source', 'lead_enrichment'),
                    enrichment_data.get('enrichment_score', 0.0)
                )
            
            self.cursor.execute(query, values)
            self.connection.commit()
            
            print(f"Lead enrichment data saved for company ID {company_id}")
            return True
            
        except Exception as e:
            print(f"Error inserting lead enrichment: {e}")
            self.connection.rollback()
            return False
    
    def get_lead_enrichment(self, company_id):
        """Get lead enrichment data for a specific company"""
        try:
            if self.db_type == 'postgresql':
                query = "SELECT * FROM lead_enrichment WHERE company_id = %s"
            else:
                query = "SELECT * FROM lead_enrichment WHERE company_id = ?"
            
            self.cursor.execute(query, (company_id,))
            result = self.cursor.fetchone()
            
            if result and result.get('decision_makers'):
                # Parse decision_makers JSON
                try:
                    if self.db_type == 'postgresql':
                        result['decision_makers'] = result['decision_makers']
                    else:
                        result['decision_makers'] = json.loads(result['decision_makers'])
                except:
                    result['decision_makers'] = []
            
            return result
            
        except Exception as e:
            print(f"Error retrieving lead enrichment: {e}")
            return None
    
    def search_enriched_leads(self, industry=None, company_size=None, location=None, limit=100):
        """Search for enriched leads with filters"""
        try:
            base_query = """
                SELECT bc.*, le.* 
                FROM business_contacts bc
                LEFT JOIN lead_enrichment le ON bc.id = le.company_id
                WHERE 1=1
            """
            
            params = []
            
            if industry:
                base_query += " AND le.industry_category ILIKE %s" if self.db_type == 'postgresql' else " AND le.industry_category LIKE ?"
                params.append(f"%{industry}%")
            
            if company_size:
                base_query += " AND le.estimated_company_size ILIKE %s" if self.db_type == 'postgresql' else " AND le.estimated_company_size LIKE ?"
                params.append(f"%{company_size}%")
            
            if location:
                base_query += " AND (le.city ILIKE %s OR le.state ILIKE %s OR bc.address ILIKE %s)" if self.db_type == 'postgresql' else " AND (le.city LIKE ? OR le.state LIKE ? OR bc.address LIKE ?)"
                location_pattern = f"%{location}%"
                params.extend([location_pattern, location_pattern, location_pattern])
            
            base_query += " ORDER BY le.enrichment_score DESC, bc.scraped_at DESC"
            
            if self.db_type == 'postgresql':
                base_query += " LIMIT %s"
            else:
                base_query += " LIMIT ?"
            
            params.append(limit)
            
            self.cursor.execute(base_query, params)
            results = self.cursor.fetchall()
            
            # Parse JSON fields for SQLite
            if self.db_type == 'sqlite':
                for result in results:
                    if result.get('decision_makers'):
                        try:
                            result['decision_makers'] = json.loads(result['decision_makers'])
                        except:
                            result['decision_makers'] = []
                    if result.get('specialties'):
                        try:
                            result['specialties'] = json.loads(result['specialties'])
                        except:
                            result['specialties'] = []
            
            return results
            
        except Exception as e:
            print(f"Error searching enriched leads: {e}")
            return []
    
    def get_company_emails(self, company_id):
        """Get all emails for a specific company"""
        try:
            if self.db_type == 'postgresql':
                query = """
                    SELECT * FROM company_emails 
                    WHERE company_id = %s 
                    ORDER BY confidence_score DESC, extracted_at DESC
                """
            else:
                query = """
                    SELECT * FROM company_emails 
                    WHERE company_id = ? 
                    ORDER BY confidence_score DESC, extracted_at DESC
                """
            
            self.cursor.execute(query, (company_id,))
            return self.cursor.fetchall()
            
        except Exception as e:
            print(f"Error retrieving company emails: {e}")
            return []
    
    def search_emails_by_domain(self, domain):
        """Search for emails by domain"""
        try:
            if self.db_type == 'postgresql':
                query = """
                    SELECT ce.*, bc.company_name 
                    FROM company_emails ce
                    JOIN business_contacts bc ON ce.company_id = bc.id
                    WHERE ce.email LIKE %s
                    ORDER BY ce.confidence_score DESC
                """
            else:
                query = """
                    SELECT ce.*, bc.company_name 
                    FROM company_emails ce
                    JOIN business_contacts bc ON ce.company_id = bc.id
                    WHERE ce.email LIKE ?
                    ORDER BY ce.confidence_score DESC
                """
            
            search_pattern = f"%@{domain}"
            self.cursor.execute(query, (search_pattern,))
            return self.cursor.fetchall()
            
        except Exception as e:
            print(f"Error searching emails by domain: {e}")
            return []
    
    def get_contacts(self, limit=100, offset=0):
        """Retrieve contacts from database"""
        try:
            if self.db_type == 'postgresql':
                query = "SELECT * FROM business_contacts ORDER BY scraped_at DESC LIMIT %s OFFSET %s"
            else:
                query = "SELECT * FROM business_contacts ORDER BY scraped_at DESC LIMIT ? OFFSET ?"
            
            self.cursor.execute(query, (limit, offset))
            return self.cursor.fetchall()
        except Exception as e:
            print(f"Error retrieving contacts: {e}")
            return []
    
    def search_contacts(self, search_term):
        """Search contacts by company name or industry"""
        try:
            if self.db_type == 'postgresql':
                query = """
                    SELECT * FROM business_contacts 
                    WHERE company_name ILIKE %s OR industry ILIKE %s
                    ORDER BY scraped_at DESC
                """
            else:
                query = """
                    SELECT * FROM business_contacts 
                    WHERE company_name LIKE ? OR industry LIKE ?
                    ORDER BY scraped_at DESC
                """
            
            search_pattern = f"%{search_term}%"
            self.cursor.execute(query, (search_pattern, search_pattern))
            return self.cursor.fetchall()
        except Exception as e:
            print(f"Error searching contacts: {e}")
            return []
    
    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
            print("Database connection closed")
    
    # ===== DEDUPLICATION AND VALIDATION METHODS =====
    
    def validate_email_format(self, email):
        """Validate email format using regex"""
        if not email:
            return False, "Empty email"
        
        # Comprehensive email regex pattern
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(email_pattern, email):
            return False, "Invalid email format"
        
        # Check for common spam patterns
        spam_indicators = [
            r'[0-9]{10,}',  # Too many consecutive numbers
            r'[a-zA-Z]{20,}',  # Too many consecutive letters
            r'[._%+-]{3,}',  # Too many special characters
            r'@.*@',  # Multiple @ symbols
            r'\.{2,}',  # Multiple consecutive dots
        ]
        
        for pattern in spam_indicators:
            if re.search(pattern, email):
                return False, f"Spam pattern detected: {pattern}"
        
        return True, "Valid email format"
    
    def check_dns_mx_record(self, domain):
        """Check if domain has valid MX records"""
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            return len(mx_records) > 0
        except Exception:
            return False
    
    def check_smtp_connection(self, email):
        """Check SMTP connection for email validation"""
        try:
            domain = email.split('@')[1]
            
            # Get MX records
            mx_records = dns.resolver.resolve(domain, 'MX')
            if not mx_records:
                return False, "No MX records found"
            
            # Sort by priority
            mx_records = sorted(mx_records, key=lambda x: x.preference)
            
            # Try to connect to the first MX server
            mx_host = str(mx_records[0].exchange)
            
            # Create socket connection
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((mx_host, 25))
            
            # Basic SMTP handshake
            sock.recv(1024)
            sock.send(b"EHLO test.com\r\n")
            response = sock.recv(1024)
            
            if b"250" in response:
                sock.send(f"MAIL FROM:<test@{domain}>\r\n".encode())
                response = sock.recv(1024)
                
                if b"250" in response:
                    sock.send(f"RCPT TO:<{email}>\r\n".encode())
                    response = sock.recv(1024)
                    
                    if b"250" in response:
                        sock.close()
                        return True, "Email address exists"
                    else:
                        sock.close()
                        return False, "Email address does not exist"
                else:
                    sock.close()
                    return False, "MAIL FROM rejected"
            else:
                sock.close()
                return False, "SMTP handshake failed"
                
        except Exception as e:
            return False, f"SMTP check failed: {str(e)}"
    
    def validate_email_comprehensive(self, email):
        """Comprehensive email validation including format, DNS, and SMTP"""
        validation_result = {
            'email': email,
            'is_valid': False,
            'validation_score': 0.0,
            'format_valid': False,
            'dns_valid': False,
            'smtp_valid': False,
            'spam_score': 0.0,
            'notes': []
        }
        
        # Step 1: Format validation
        format_valid, format_msg = self.validate_email_format(email)
        validation_result['format_valid'] = format_valid
        validation_result['notes'].append(f"Format: {format_msg}")
        
        if not format_valid:
            validation_result['spam_score'] += 0.5
            return validation_result
        
        # Step 2: DNS validation
        domain = email.split('@')[1]
        dns_valid = self.check_dns_mx_record(domain)
        validation_result['dns_valid'] = dns_valid
        validation_result['notes'].append(f"DNS MX: {'Valid' if dns_valid else 'Invalid'}")
        
        if not dns_valid:
            validation_result['spam_score'] += 0.3
            return validation_result
        
        # Step 3: SMTP validation (optional, can be rate-limited)
        try:
            smtp_valid, smtp_msg = self.check_smtp_connection(email)
            validation_result['smtp_valid'] = smtp_valid
            validation_result['notes'].append(f"SMTP: {smtp_msg}")
            
            if smtp_valid:
                validation_result['validation_score'] += 0.8
            else:
                validation_result['spam_score'] += 0.2
        except Exception as e:
            validation_result['notes'].append(f"SMTP check skipped: {str(e)}")
        
        # Calculate final validation score
        if validation_result['format_valid']:
            validation_result['validation_score'] += 0.2
        if validation_result['dns_valid']:
            validation_result['validation_score'] += 0.3
        
        validation_result['is_valid'] = validation_result['validation_score'] >= 0.5
        
        return validation_result
    
    def deduplicate_emails(self, company_id=None):
        """Remove duplicate emails across the database or for a specific company"""
        try:
            if company_id:
                # Deduplicate for specific company
                if self.db_type == 'postgresql':
                    query = """
                        DELETE FROM company_emails 
                        WHERE id NOT IN (
                            SELECT DISTINCT ON (email) id 
                            FROM company_emails 
                            WHERE company_id = %s 
                            ORDER BY email, confidence_score DESC, extracted_at DESC
                        ) AND company_id = %s
                    """
                    self.cursor.execute(query, (company_id, company_id))
                else:
                    # SQLite equivalent
                    query = """
                        DELETE FROM company_emails 
                        WHERE company_id = ? AND id NOT IN (
                            SELECT MIN(id) 
                            FROM company_emails 
                            WHERE company_id = ? 
                            GROUP BY email
                        )
                    """
                    self.cursor.execute(query, (company_id, company_id))
            else:
                # Global deduplication
                if self.db_type == 'postgresql':
                    query = """
                        DELETE FROM company_emails 
                        WHERE id NOT IN (
                            SELECT DISTINCT ON (email) id 
                            FROM company_emails 
                            ORDER BY email, confidence_score DESC, extracted_at DESC
                        )
                    """
                    self.cursor.execute(query)
                else:
                    # SQLite equivalent
                    query = """
                        DELETE FROM company_emails 
                        WHERE id NOT IN (
                            SELECT MIN(id) 
                            FROM company_emails 
                            GROUP BY email
                        )
                    """
                    self.cursor.execute(query)
            
            deleted_count = self.cursor.rowcount
            self.connection.commit()
            print(f"Deduplication completed. {deleted_count} duplicate emails removed.")
            return deleted_count
            
        except Exception as e:
            print(f"Error during deduplication: {e}")
            self.connection.rollback()
            return 0
    
    def calculate_domain_authority_score(self, domain):
        """Calculate domain authority score based on various factors"""
        try:
            score = 0.0
            
            # Check if domain is accessible
            try:
                response = requests.get(f"http://{domain}", timeout=10)
                if response.status_code == 200:
                    score += 0.2
            except:
                pass
            
            # Check for HTTPS
            try:
                response = requests.get(f"https://{domain}", timeout=10)
                if response.status_code == 200:
                    score += 0.1
            except:
                pass
            
            # Check domain age (basic heuristic)
            # This would require additional domain age checking service
            # For now, we'll use a basic score
            
            # Check for common business TLDs
            business_tlds = ['.com', '.org', '.net', '.co', '.biz', '.info']
            if any(domain.endswith(tld) for tld in business_tlds):
                score += 0.1
            
            # Check domain length (shorter domains tend to be more legitimate)
            if len(domain) <= 20:
                score += 0.1
            elif len(domain) <= 30:
                score += 0.05
            
            return min(score, 1.0)
            
        except Exception as e:
            print(f"Error calculating domain authority: {e}")
            return 0.0
    
    def calculate_linkedin_presence_score(self, linkedin_url):
        """Calculate LinkedIn presence score"""
        if not linkedin_url:
            return 0.0
        
        score = 0.0
        
        # Check if LinkedIn URL is valid
        if 'linkedin.com' in linkedin_url:
            score += 0.3
            
            # Check for company page format
            if '/company/' in linkedin_url:
                score += 0.4
            elif '/school/' in linkedin_url:
                score += 0.3
            elif '/in/' in linkedin_url:
                score += 0.2
        
        return min(score, 1.0)
    
    def calculate_company_info_completeness(self, contact_data):
        """Calculate completeness score for company information"""
        fields = ['company_name', 'email', 'website', 'phone', 'address', 'industry']
        filled_fields = sum(1 for field in fields if contact_data.get(field))
        
        return min(filled_fields / len(fields), 1.0)
    
    def calculate_spam_score(self, contact_data, email_validation_result):
        """Calculate spam score based on various indicators"""
        spam_score = 0.0
        
        # Email validation factors
        if email_validation_result:
            spam_score += email_validation_result.get('spam_score', 0.0)
        
        # Company name patterns
        company_name = contact_data.get('company_name', '').lower()
        spam_indicators = [
            'inc', 'llc', 'corp', 'ltd', 'co', 'company', 'business',
            'solutions', 'services', 'group', 'enterprises', 'ventures'
        ]
        
        # Check for excessive use of business terms
        business_term_count = sum(1 for term in spam_indicators if term in company_name)
        if business_term_count > 3:
            spam_score += 0.2
        
        # Check for excessive numbers in company name
        if len(re.findall(r'\d', company_name)) > 2:
            spam_score += 0.1
        
        # Check for excessive special characters
        if len(re.findall(r'[^\w\s]', company_name)) > 3:
            spam_score += 0.1
        
        # Website quality check
        website = contact_data.get('website', '')
        if website:
            if len(website) > 100:  # Suspiciously long URL
                spam_score += 0.2
            if website.count('.') > 3:  # Too many subdomains
                spam_score += 0.1
        
        return min(spam_score, 1.0)
    
    def score_lead_quality(self, company_id):
        """Calculate comprehensive lead quality score"""
        try:
            # Get company data
            if self.db_type == 'postgresql':
                query = "SELECT * FROM business_contacts WHERE id = %s"
            else:
                query = "SELECT * FROM business_contacts WHERE id = ?"
            
            self.cursor.execute(query, (company_id,))
            contact_data = self.cursor.fetchone()
            
            if not contact_data:
                return None
            
            # Get company emails
            emails = self.get_company_emails(company_id)
            
            # Calculate individual scores
            domain_authority_score = self.calculate_domain_authority_score(
                urlparse(contact_data.get('website', '')).netloc if contact_data.get('website') else ''
            )
            
            linkedin_presence_score = self.calculate_linkedin_presence_score(
                contact_data.get('linkedin_profile', '')
            )
            
            # Calculate email quality score
            email_quality_score = 0.0
            if emails:
                valid_emails = [email for email in emails if email.get('is_verified', False)]
                email_quality_score = len(valid_emails) / len(emails) if emails else 0.0
            
            company_info_completeness = self.calculate_company_info_completeness(contact_data)
            
            # Calculate overall spam score
            spam_score = self.calculate_spam_score(contact_data, None)
            
            # Calculate overall score (weighted average)
            overall_score = (
                domain_authority_score * 0.25 +
                linkedin_presence_score * 0.20 +
                email_quality_score * 0.25 +
                company_info_completeness * 0.20 +
                (1 - spam_score) * 0.10
            )
            
            # Store quality scores
            self._store_lead_quality_scores(
                company_id, overall_score, domain_authority_score,
                linkedin_presence_score, email_quality_score,
                company_info_completeness, spam_score
            )
            
            return {
                'overall_score': overall_score,
                'domain_authority_score': domain_authority_score,
                'linkedin_presence_score': linkedin_presence_score,
                'email_quality_score': email_quality_score,
                'company_info_completeness': company_info_completeness,
                'spam_score': spam_score
            }
            
        except Exception as e:
            print(f"Error scoring lead quality: {e}")
            return None
    
    def _store_lead_quality_scores(self, company_id, overall_score, domain_authority_score,
                                  linkedin_presence_score, email_quality_score,
                                  company_info_completeness, spam_score):
        """Store lead quality scores in database"""
        try:
            if self.db_type == 'postgresql':
                query = """
                    INSERT INTO lead_quality_scores 
                    (company_id, overall_score, domain_authority_score, linkedin_presence_score,
                     email_quality_score, company_info_completeness, spam_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (company_id) DO UPDATE SET
                    overall_score = EXCLUDED.overall_score,
                    domain_authority_score = EXCLUDED.domain_authority_score,
                    linkedin_presence_score = EXCLUDED.linkedin_presence_score,
                    email_quality_score = EXCLUDED.email_quality_score,
                    company_info_completeness = EXCLUDED.company_info_completeness,
                    spam_score = EXCLUDED.spam_score,
                    last_updated = CURRENT_TIMESTAMP
                """
            else:
                query = """
                    INSERT OR REPLACE INTO lead_quality_scores 
                    (company_id, overall_score, domain_authority_score, linkedin_presence_score,
                     email_quality_score, company_info_completeness, spam_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """
            
            values = (
                company_id, overall_score, domain_authority_score,
                linkedin_presence_score, email_quality_score,
                company_info_completeness, spam_score
            )
            
            self.cursor.execute(query, values)
            self.connection.commit()
            
        except Exception as e:
            print(f"Error storing lead quality scores: {e}")
            self.connection.rollback()
    
    def validate_and_score_all_emails(self, batch_size=100):
        """Validate and score all emails in batches"""
        try:
            total_processed = 0
            total_valid = 0
            
            # Process in batches to avoid memory issues
            offset = 0
            
            while True:
                # Get batch of emails
                if self.db_type == 'postgresql':
                    query = """
                        SELECT ce.*, bc.company_name 
                        FROM company_emails ce
                        JOIN business_contacts bc ON ce.company_id = bc.id
                        ORDER BY ce.id
                        LIMIT %s OFFSET %s
                    """
                else:
                    query = """
                        SELECT ce.*, bc.company_name 
                        FROM company_emails ce
                        JOIN business_contacts bc ON ce.company_id = bc.id
                        ORDER BY ce.id
                        LIMIT ? OFFSET ?
                    """
                
                self.cursor.execute(query, (batch_size, offset))
                emails_batch = self.cursor.fetchall()
                
                if not emails_batch:
                    break
                
                for email_record in emails_batch:
                    try:
                        # Validate email
                        validation_result = self.validate_email_comprehensive(email_record['email'])
                        
                        # Store validation result
                        self._store_email_validation(email_record['id'], validation_result)
                        
                        # Update email confidence score based on validation
                        new_confidence = validation_result['validation_score']
                        self._update_email_confidence(email_record['id'], new_confidence)
                        
                        # Mark as verified if validation passed
                        if validation_result['is_valid']:
                            self._mark_email_verified(email_record['id'])
                            total_valid += 1
                        
                        total_processed += 1
                        
                        # Rate limiting to avoid being blocked
                        import time
                        time.sleep(0.1)
                        
                    except Exception as e:
                        print(f"Error processing email {email_record['email']}: {e}")
                        continue
                
                offset += batch_size
                print(f"Processed {total_processed} emails so far...")
            
            print(f"Email validation completed. {total_valid}/{total_processed} emails are valid.")
            return total_processed, total_valid
            
        except Exception as e:
            print(f"Error during email validation: {e}")
            return 0, 0
    
    def _store_email_validation(self, email_id, validation_result):
        """Store email validation result in database"""
        try:
            if self.db_type == 'postgresql':
                query = """
                    INSERT INTO email_validation 
                    (email_id, is_valid, validation_method, smtp_response, dns_check, 
                     mx_record_exists, validation_score, validation_notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (email_id) DO UPDATE SET
                    is_valid = EXCLUDED.is_valid,
                    validation_method = EXCLUDED.validation_method,
                    smtp_response = EXCLUDED.smtp_response,
                    dns_check = EXCLUDED.dns_check,
                    mx_record_exists = EXCLUDED.mx_record_exists,
                    validation_score = EXCLUDED.validation_score,
                    validation_notes = EXCLUDED.validation_notes,
                    last_checked = CURRENT_TIMESTAMP
                """
            else:
                query = """
                    INSERT OR REPLACE INTO email_validation 
                    (email_id, is_valid, validation_method, smtp_response, dns_check, 
                     mx_record_exists, validation_score, validation_notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """
            
            # Extract SMTP response from notes
            smtp_response = ""
            for note in validation_result['notes']:
                if 'SMTP:' in note:
                    smtp_response = note
            
            values = (
                email_id,
                validation_result['is_valid'],
                'comprehensive',
                smtp_response,
                validation_result['dns_valid'],
                validation_result['dns_valid'],  # MX record exists if DNS is valid
                validation_result['validation_score'],
                '; '.join(validation_result['notes'])
            )
            
            self.cursor.execute(query, values)
            self.connection.commit()
            
        except Exception as e:
            print(f"Error storing email validation: {e}")
            self.connection.rollback()
    
    def _update_email_confidence(self, email_id, new_confidence):
        """Update email confidence score"""
        try:
            if self.db_type == 'postgresql':
                query = "UPDATE company_emails SET confidence_score = %s WHERE id = %s"
            else:
                query = "UPDATE company_emails SET confidence_score = ? WHERE id = ?"
            
            self.cursor.execute(query, (new_confidence, email_id))
            self.connection.commit()
            
        except Exception as e:
            print(f"Error updating email confidence: {e}")
            self.connection.rollback()
    
    def _mark_email_verified(self, email_id):
        """Mark email as verified"""
        try:
            if self.db_type == 'postgresql':
                query = "UPDATE company_emails SET is_verified = TRUE WHERE id = %s"
            else:
                query = "UPDATE company_emails SET is_verified = 1 WHERE id = ?"
            
            self.cursor.execute(query, (email_id,))
            self.connection.commit()
            
        except Exception as e:
            print(f"Error marking email verified: {e}")
            self.connection.rollback()
    
    def get_high_quality_leads(self, min_score=0.7, limit=100):
        """Get leads with high quality scores"""
        try:
            if self.db_type == 'postgresql':
                query = """
                    SELECT bc.*, lqs.overall_score, lqs.domain_authority_score,
                           lqs.linkedin_presence_score, lqs.email_quality_score
                    FROM business_contacts bc
                    JOIN lead_quality_scores lqs ON bc.id = lqs.company_id
                    WHERE lqs.overall_score >= %s
                    ORDER BY lqs.overall_score DESC, bc.scraped_at DESC
                    LIMIT %s
                """
            else:
                query = """
                    SELECT bc.*, lqs.overall_score, lqs.domain_authority_score,
                           lqs.linkedin_presence_score, lqs.email_quality_score
                    FROM business_contacts bc
                    JOIN lead_quality_scores lqs ON bc.id = lqs.company_id
                    WHERE lqs.overall_score >= ?
                    ORDER BY lqs.overall_score DESC, bc.scraped_at DESC
                    LIMIT ?
                """
            
            self.cursor.execute(query, (min_score, limit))
            return self.cursor.fetchall()
            
        except Exception as e:
            print(f"Error getting high quality leads: {e}")
            return []
    
    def get_spam_flagged_leads(self, min_spam_score=0.5, limit=100):
        """Get leads flagged as potential spam"""
        try:
            if self.db_type == 'postgresql':
                query = """
                    SELECT bc.*, lqs.spam_score, lqs.overall_score
                    FROM business_contacts bc
                    JOIN lead_quality_scores lqs ON bc.id = lqs.company_id
                    WHERE lqs.spam_score >= %s
                    ORDER BY lqs.spam_score DESC, bc.scraped_at DESC
                    LIMIT %s
                """
            else:
                query = """
                    SELECT bc.*, lqs.spam_score, lqs.overall_score
                    FROM business_contacts bc
                    JOIN lead_quality_scores lqs ON bc.id = lqs.company_id
                    WHERE lqs.spam_score >= ?
                    ORDER BY lqs.spam_score DESC, bc.scraped_at DESC
                    LIMIT ?
                """
            
            self.cursor.execute(query, (min_spam_score, limit))
            return self.cursor.fetchall()
            
        except Exception as e:
            print(f"Error getting spam flagged leads: {e}")
            return []
    
    def cleanup_invalid_emails(self, delete_invalid=False):
        """Clean up invalid emails based on validation results"""
        try:
            if delete_invalid:
                # Delete invalid emails
                if self.db_type == 'postgresql':
                    query = """
                        DELETE FROM company_emails 
                        WHERE id IN (
                            SELECT ce.id FROM company_emails ce
                            JOIN email_validation ev ON ce.id = ev.email_id
                            WHERE ev.is_valid = FALSE AND ev.validation_score < 0.3
                        )
                    """
                else:
                    query = """
                        DELETE FROM company_emails 
                        WHERE id IN (
                            SELECT ce.id FROM company_emails ce
                            JOIN email_validation ev ON ce.id = ev.email_id
                            WHERE ev.is_valid = 0 AND ev.validation_score < 0.3
                        )
                    """
                
                self.cursor.execute(query)
                deleted_count = self.cursor.rowcount
                self.connection.commit()
                
                print(f"Deleted {deleted_count} invalid emails")
                return deleted_count
            else:
                # Just count invalid emails
                if self.db_type == 'postgresql':
                    query = """
                        SELECT COUNT(*) as count FROM company_emails ce
                        JOIN email_validation ev ON ce.id = ev.email_id
                        WHERE ev.is_valid = FALSE AND ev.validation_score < 0.3
                    """
                else:
                    query = """
                        SELECT COUNT(*) as count FROM company_emails ce
                        JOIN email_validation ev ON ce.id = ev.email_id
                        WHERE ev.is_valid = 0 AND ev.validation_score < 0.3
                    """
                
                self.cursor.execute(query)
                result = self.cursor.fetchone()
                invalid_count = result['count'] if self.db_type == 'postgresql' else result[0]
                
                print(f"Found {invalid_count} invalid emails")
                return invalid_count
                
        except Exception as e:
            print(f"Error cleaning up invalid emails: {e}")
            return 0
