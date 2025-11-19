-- Enhanced Lead Generation System Database Schema
-- This schema supports thousands of leads with proper normalization

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS lead_emails CASCADE;
DROP TABLE IF EXISTS lead_tags CASCADE;
DROP TABLE IF EXISTS lead_notes CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS prospecting_jobs CASCADE;
DROP TABLE IF EXISTS email_campaigns CASCADE;
DROP TABLE IF EXISTS campaign_recipients CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;

-- Prospecting Jobs Table
CREATE TABLE prospecting_jobs (
    id SERIAL PRIMARY KEY,
    search_criteria JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_step VARCHAR(100) DEFAULT 'initializing',
    total_leads INTEGER DEFAULT 0,
    statistics JSONB,
    scraping_job_id VARCHAR(100),
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Leads Table (Enhanced)
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(500),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    company_size VARCHAR(50),
    revenue_range VARCHAR(100),
    founded_year INTEGER,
    employee_count INTEGER,
    source VARCHAR(100) DEFAULT 'Lead Prospecting',
    quality_score DECIMAL(3,2) DEFAULT 0.00 CHECK (quality_score >= 0.00 AND quality_score <= 1.00),
    email_patterns JSONB,
    domain VARCHAR(255),
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    facebook_url VARCHAR(500),
    description TEXT,
    keywords TEXT[],
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to VARCHAR(100),
    prospecting_job_id INTEGER REFERENCES prospecting_jobs(id),
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    contact_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE
);

-- Lead Emails Table
CREATE TABLE lead_emails (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    pattern VARCHAR(100),
    confidence DECIMAL(3,2) DEFAULT 0.00 CHECK (confidence >= 0.00 AND confidence <= 1.00),
    is_valid_format BOOLEAN DEFAULT FALSE,
    overall_score INTEGER DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
    domain_info JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(100),
    bounce_status VARCHAR(50) DEFAULT 'unknown',
    last_bounce_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Tags Table
CREATE TABLE lead_tags (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Lead Notes Table
CREATE TABLE lead_notes (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Templates Table
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '[]',
    category VARCHAR(100) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Email Campaigns Table
CREATE TABLE email_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id INTEGER REFERENCES email_templates(id),
    subject VARCHAR(500),
    html_content TEXT,
    text_content TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    unsubscribe_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Campaign Recipients Table
CREATE TABLE campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    tracking_id VARCHAR(100) UNIQUE,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_leads_company_name ON leads(company_name);
CREATE INDEX idx_leads_industry ON leads(industry);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_quality_score ON leads(quality_score);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_prospecting_job_id ON leads(prospecting_job_id);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_domain ON leads(domain);

CREATE INDEX idx_lead_emails_lead_id ON lead_emails(lead_id);
CREATE INDEX idx_lead_emails_email ON lead_emails(email);
CREATE INDEX idx_lead_emails_overall_score ON lead_emails(overall_score);
CREATE INDEX idx_lead_emails_is_verified ON lead_emails(is_verified);

CREATE INDEX idx_prospecting_jobs_status ON prospecting_jobs(status);
CREATE INDEX idx_prospecting_jobs_created_at ON prospecting_jobs(created_at);

CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_lead_id ON campaign_recipients(lead_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX idx_campaign_recipients_tracking_id ON campaign_recipients(tracking_id);

-- Create composite indexes for common queries
CREATE INDEX idx_leads_industry_city ON leads(industry, city);
CREATE INDEX idx_leads_quality_status ON leads(quality_score, status);
CREATE INDEX idx_leads_source_created ON leads(source, created_at);

-- Create full-text search index for company names and descriptions
CREATE INDEX idx_leads_company_search ON leads USING gin(to_tsvector('english', company_name || ' ' || COALESCE(description, '')));

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospecting_jobs_updated_at BEFORE UPDATE ON prospecting_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_notes_updated_at BEFORE UPDATE ON lead_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate lead quality score
CREATE OR REPLACE FUNCTION calculate_lead_quality_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.quality_score = 0.00;
    
    -- Company name (required)
    IF NEW.company_name IS NOT NULL AND LENGTH(TRIM(NEW.company_name)) > 0 THEN
        NEW.quality_score = NEW.quality_score + 0.20;
    END IF;
    
    -- Website
    IF NEW.website IS NOT NULL AND LENGTH(TRIM(NEW.website)) > 0 THEN
        NEW.quality_score = NEW.quality_score + 0.20;
    END IF;
    
    -- Phone
    IF NEW.phone IS NOT NULL AND LENGTH(TRIM(NEW.phone)) > 0 THEN
        NEW.quality_score = NEW.quality_score + 0.15;
    END IF;
    
    -- Address
    IF NEW.address IS NOT NULL AND LENGTH(TRIM(NEW.address)) > 0 THEN
        NEW.quality_score = NEW.quality_score + 0.15;
    END IF;
    
    -- Industry
    IF NEW.industry IS NOT NULL AND LENGTH(TRIM(NEW.industry)) > 0 THEN
        NEW.quality_score = NEW.quality_score + 0.10;
    END IF;
    
    -- Email patterns
    IF NEW.email_patterns IS NOT NULL AND jsonb_array_length(NEW.email_patterns) > 0 THEN
        NEW.quality_score = NEW.quality_score + 0.20;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically calculate quality score
CREATE TRIGGER calculate_lead_quality_score_trigger BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION calculate_lead_quality_score();

-- Function to get lead statistics
CREATE OR REPLACE FUNCTION get_lead_statistics()
RETURNS TABLE(
    total_leads BIGINT,
    leads_with_emails BIGINT,
    leads_with_phones BIGINT,
    leads_with_websites BIGINT,
    avg_quality_score DECIMAL(3,2),
    industry_distribution JSONB,
    location_distribution JSONB,
    source_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_leads,
        COUNT(CASE WHEN EXISTS(SELECT 1 FROM lead_emails WHERE lead_id = l.id) THEN 1 END)::BIGINT as leads_with_emails,
        COUNT(CASE WHEN l.phone IS NOT NULL AND LENGTH(TRIM(l.phone)) > 0 THEN 1 END)::BIGINT as leads_with_phones,
        COUNT(CASE WHEN l.website IS NOT NULL AND LENGTH(TRIM(l.website)) > 0 THEN 1 END)::BIGINT as leads_with_websites,
        AVG(l.quality_score)::DECIMAL(3,2) as avg_quality_score,
        (SELECT jsonb_object_agg(industry, count) FROM (
            SELECT industry, COUNT(*) as count 
            FROM leads 
            WHERE industry IS NOT NULL 
            GROUP BY industry 
            ORDER BY count DESC 
            LIMIT 10
        ) t) as industry_distribution,
        (SELECT jsonb_object_agg(city, count) FROM (
            SELECT city, COUNT(*) as count 
            FROM leads 
            WHERE city IS NOT NULL 
            GROUP BY city 
            ORDER BY count DESC 
            LIMIT 10
        ) t) as location_distribution,
        (SELECT jsonb_object_agg(source, count) FROM (
            SELECT source, COUNT(*) as count 
            FROM leads 
            GROUP BY source 
            ORDER BY count DESC 
            LIMIT 10
        ) t) as source_distribution
    FROM leads l;
END;
$$ language 'plpgsql';

-- Insert sample data for testing
INSERT INTO prospecting_jobs (search_criteria, status, progress, current_step) VALUES
('{"query": "software companies", "industry": "Technology", "location": "United States", "maxResults": 100}', 'completed', 100, 'completed'),
('{"query": "healthcare startups", "industry": "Healthcare", "location": "California", "maxResults": 50}', 'completed', 100, 'completed');

-- Insert sample leads
INSERT INTO leads (company_name, industry, website, phone, city, source, quality_score, prospecting_job_id) VALUES
('TechCorp Solutions', 'Technology', 'https://techcorp.com', '+1-555-0123', 'San Francisco', 'Lead Prospecting', 0.85, 1),
('Digital Dynamics', 'Technology', 'https://digitaldynamics.com', '+1-555-0124', 'New York', 'Lead Prospecting', 0.80, 1),
('HealthTech Innovations', 'Healthcare', 'https://healthtech.com', '+1-555-0125', 'Los Angeles', 'Lead Prospecting', 0.90, 2),
('MedStart Solutions', 'Healthcare', 'https://medstart.com', '+1-555-0126', 'San Diego', 'Lead Prospecting', 0.75, 2);

-- Insert sample email patterns
INSERT INTO lead_emails (lead_id, email, pattern, confidence, is_valid_format, overall_score) VALUES
(1, 'john@techcorp.com', 'first@domain.com', 0.70, true, 85),
(1, 'info@techcorp.com', 'generic@domain.com', 0.90, true, 95),
(2, 'contact@digitaldynamics.com', 'generic@domain.com', 0.90, true, 90),
(3, 'hello@healthtech.com', 'generic@domain.com', 0.90, true, 95);

-- Create views for common queries
CREATE VIEW leads_with_emails AS
SELECT 
    l.*,
    COUNT(le.id) as email_count,
    MAX(le.overall_score) as best_email_score,
    STRING_AGG(DISTINCT le.email, ', ') as email_list
FROM leads l
LEFT JOIN lead_emails le ON l.id = le.lead_id
GROUP BY l.id;

CREATE VIEW prospecting_job_summary AS
SELECT 
    pj.*,
    COUNT(l.id) as total_leads,
    AVG(l.quality_score) as avg_quality_score,
    COUNT(CASE WHEN l.website IS NOT NULL THEN 1 END) as leads_with_websites,
    COUNT(CASE WHEN l.phone IS NOT NULL THEN 1 END) as leads_with_phones
FROM prospecting_jobs pj
LEFT JOIN leads l ON pj.id = l.prospecting_job_id
GROUP BY pj.id;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

COMMENT ON TABLE prospecting_jobs IS 'Stores lead prospecting jobs and their status';
COMMENT ON TABLE leads IS 'Main leads table with company and contact information';
COMMENT ON TABLE lead_emails IS 'Stores generated and verified email addresses for leads';
COMMENT ON TABLE lead_tags IS 'Tags for categorizing and organizing leads';
COMMENT ON TABLE lead_notes IS 'Notes and comments about leads';
COMMENT ON TABLE email_templates IS 'Email templates for campaigns';
COMMENT ON TABLE email_campaigns IS 'Email marketing campaigns';
COMMENT ON TABLE campaign_recipients IS 'Recipients and tracking for email campaigns';
