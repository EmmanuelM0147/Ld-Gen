-- Supabase Table Setup for Lead Prospecting System
-- Run this script in your Supabase SQL Editor

-- Create prospecting_jobs table
CREATE TABLE IF NOT EXISTS prospecting_jobs (
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

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(200),
  industry VARCHAR(100),
  website VARCHAR(500),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  team_size VARCHAR(50),
  revenue_range VARCHAR(100),
  total_funding VARCHAR(100),
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
  prospecting_job_id INTEGER,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  contact_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP WITH TIME ZONE
);

-- Insert sample data for testing
INSERT INTO leads (company_name, title, industry, city, state, country, team_size, revenue_range, total_funding, website, phone, status, source) VALUES
('TechCorp Inc', 'CEO', 'Technology', 'San Francisco', 'CA', 'United States', '51-200', '10M-50M', '5M-10M', 'techcorp.com', '+1-555-0123', 'new', 'Lead Prospecting'),
('Marketing Pro Solutions', 'Marketing Manager', 'Marketing', 'New York', 'NY', 'United States', '11-50', '1M-10M', '100K-500K', 'marketingpro.com', '+1-555-0456', 'new', 'Lead Prospecting'),
('StartupXYZ', 'CTO', 'SaaS', 'Austin', 'TX', 'United States', '1-10', '0-1M', '500K-1M', 'startupxyz.com', '+1-555-0789', 'new', 'Lead Prospecting'),
('Healthcare Innovations', 'VP of Sales', 'Healthcare', 'Boston', 'MA', 'United States', '201-500', '50M-100M', '10M-50M', 'healthcareinnovations.com', '+1-555-0321', 'new', 'Lead Prospecting'),
('Finance First', 'Business Development Manager', 'Finance', 'Chicago', 'IL', 'United States', '51-200', '100M-500M', '50M+', 'financefirst.com', '+1-555-0654', 'new', 'Lead Prospecting')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_team_size ON leads(team_size);
CREATE INDEX IF NOT EXISTS idx_leads_revenue_range ON leads(revenue_range);
CREATE INDEX IF NOT EXISTS idx_leads_total_funding ON leads(total_funding);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE prospecting_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for development - adjust for production)
CREATE POLICY "Allow public access to prospecting_jobs" ON prospecting_jobs FOR ALL USING (true);
CREATE POLICY "Allow public access to leads" ON leads FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON prospecting_jobs TO anon;
GRANT ALL ON leads TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
