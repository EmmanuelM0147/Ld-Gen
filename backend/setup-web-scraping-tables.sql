-- Web Scraping Tables for B2B Platform
-- Run this in your Supabase SQL Editor

-- Table to track scraping jobs
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id BIGSERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    location TEXT,
    sources TEXT[] DEFAULT ARRAY['all'],
    max_results INTEGER DEFAULT 100,
    status TEXT DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_results INTEGER DEFAULT 0,
    results JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store scraped company data
CREATE TABLE IF NOT EXISTS scraped_companies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    website TEXT,
    description TEXT,
    location TEXT,
    industry TEXT,
    rating TEXT,
    review_count TEXT,
    price_range TEXT,
    categories TEXT,
    funding TEXT,
    source TEXT NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store scraped contact information
CREATE TABLE IF NOT EXISTS scraped_contacts (
    id BIGSERIAL PRIMARY KEY,
    website_url TEXT NOT NULL,
    contact_info JSONB NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store scraped job data
CREATE TABLE IF NOT EXISTS scraped_jobs (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    salary TEXT,
    source TEXT NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store proxy information
CREATE TABLE IF NOT EXISTS proxy_list (
    id BIGSERIAL PRIMARY KEY,
    proxy_url TEXT NOT NULL,
    proxy_type TEXT DEFAULT 'http',
    country TEXT,
    city TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store scraping statistics
CREATE TABLE IF NOT EXISTS scraping_stats (
    id BIGSERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    source TEXT NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_results INTEGER DEFAULT 0,
    average_response_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, source)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_started_at ON scraping_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_query ON scraping_jobs USING GIN(to_tsvector('english', query));

CREATE INDEX IF NOT EXISTS idx_scraped_companies_name ON scraped_companies(name);
CREATE INDEX IF NOT EXISTS idx_scraped_companies_source ON scraped_companies(source);
CREATE INDEX IF NOT EXISTS idx_scraped_companies_scraped_at ON scraped_companies(scraped_at);
CREATE INDEX IF NOT EXISTS idx_scraped_companies_location ON scraped_companies(location);
CREATE INDEX IF NOT EXISTS idx_scraped_companies_industry ON scraped_companies(industry);

CREATE INDEX IF NOT EXISTS idx_scraped_contacts_website_url ON scraped_contacts(website_url);
CREATE INDEX IF NOT EXISTS idx_scraped_contacts_scraped_at ON scraped_contacts(scraped_at);

CREATE INDEX IF NOT EXISTS idx_scraped_jobs_title ON scraped_jobs(title);
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_company ON scraped_jobs(company);
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_source ON scraped_jobs(source);
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_scraped_at ON scraped_jobs(scraped_at);

CREATE INDEX IF NOT EXISTS idx_proxy_list_active ON proxy_list(is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_list_country ON proxy_list(country);

CREATE INDEX IF NOT EXISTS idx_scraping_stats_date_source ON scraping_stats(date, source);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_scraped_companies_search ON scraped_companies 
    USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(industry, '')));

CREATE INDEX IF NOT EXISTS idx_scraped_jobs_search ON scraped_jobs 
    USING GIN(to_tsvector('english', title || ' ' || COALESCE(company, '') || ' ' || COALESCE(location, '')));

-- Create unique constraints
ALTER TABLE scraped_companies ADD CONSTRAINT unique_company_source UNIQUE (name, source);
ALTER TABLE scraped_jobs ADD CONSTRAINT unique_job_company_source UNIQUE (title, company, source);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_scraped_companies_updated_at 
    BEFORE UPDATE ON scraped_companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraped_jobs_updated_at 
    BEFORE UPDATE ON scraped_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxy_list_updated_at 
    BEFORE UPDATE ON proxy_list 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_stats_updated_at 
    BEFORE UPDATE ON scraping_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample proxy data (optional)
INSERT INTO proxy_list (proxy_url, proxy_type, country, city) VALUES
    ('http://proxy1.example.com:8080', 'http', 'US', 'New York'),
    ('http://proxy2.example.com:8080', 'http', 'US', 'Los Angeles'),
    ('http://proxy3.example.com:8080', 'http', 'UK', 'London')
ON CONFLICT DO NOTHING;

-- Create RLS policies (optional - for production use)
-- ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scraped_companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scraped_contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scraped_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE proxy_list ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scraping_stats ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create view for combined company data
CREATE OR REPLACE VIEW combined_companies AS
SELECT 
    id,
    name,
    address,
    phone,
    website,
    description,
    location,
    industry,
    rating,
    review_count,
    price_range,
    categories,
    funding,
    source,
    scraped_at,
    created_at,
    updated_at
FROM scraped_companies
UNION ALL
SELECT 
    id,
    name,
    address,
    phone,
    website,
    description,
    location,
    industry,
    NULL as rating,
    NULL as review_count,
    NULL as price_range,
    categories,
    NULL as funding,
    'manual' as source,
    created_at as scraped_at,
    created_at,
    updated_at
FROM b2b_companies;

-- Create view for scraping performance metrics
CREATE OR REPLACE VIEW scraping_performance AS
SELECT 
    date,
    source,
    total_requests,
    successful_requests,
    failed_requests,
    total_results,
    average_response_time_ms,
    CASE 
        WHEN total_requests > 0 
        THEN ROUND((successful_requests::float / total_requests * 100), 2)
        ELSE 0 
    END as success_rate,
    CASE 
        WHEN successful_requests > 0 
        THEN ROUND((total_results::float / successful_requests), 2)
        ELSE 0 
    END as avg_results_per_request
FROM scraping_stats
ORDER BY date DESC, source;

-- Insert initial scraping stats
INSERT INTO scraping_stats (source, total_requests, successful_requests, failed_requests, total_results, average_response_time_ms)
VALUES 
    ('google_maps', 0, 0, 0, 0, 0),
    ('linkedin', 0, 0, 0, 0, 0),
    ('yelp', 0, 0, 0, 0, 0),
    ('yellowpages', 0, 0, 0, 0, 0),
    ('crunchbase', 0, 0, 0, 0, 0),
    ('job_boards', 0, 0, 0, 0, 0)
ON CONFLICT (date, source) DO NOTHING;

-- Create function to update scraping stats
CREATE OR REPLACE FUNCTION update_scraping_stats(
    p_source TEXT,
    p_success BOOLEAN,
    p_results_count INTEGER DEFAULT 0,
    p_response_time_ms INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO scraping_stats (date, source, total_requests, successful_requests, failed_requests, total_results, average_response_time_ms)
    VALUES (
        CURRENT_DATE,
        p_source,
        1,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END,
        p_results_count,
        p_response_time_ms
    )
    ON CONFLICT (date, source)
    DO UPDATE SET
        total_requests = scraping_stats.total_requests + 1,
        successful_requests = scraping_stats.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END,
        failed_requests = scraping_stats.failed_requests + CASE WHEN p_success THEN 0 ELSE 1 END,
        total_results = scraping_stats.total_results + p_results_count,
        average_response_time_ms = CASE 
            WHEN scraping_stats.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END > 0
            THEN ROUND((scraping_stats.average_response_time_ms * scraping_stats.successful_requests + p_response_time_ms)::float / 
                      (scraping_stats.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END))
            ELSE scraping_stats.average_response_time_ms
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_scraping_stats(TEXT, BOOLEAN, INTEGER, INTEGER) TO authenticated;

COMMENT ON TABLE scraping_jobs IS 'Tracks web scraping jobs and their status';
COMMENT ON TABLE scraped_companies IS 'Stores company data scraped from various sources';
COMMENT ON TABLE scraped_contacts IS 'Stores contact information scraped from company websites';
COMMENT ON TABLE scraped_jobs IS 'Stores job posting data scraped from job boards';
COMMENT ON TABLE proxy_list IS 'List of proxy servers for rotating IP addresses during scraping';
COMMENT ON TABLE scraping_stats IS 'Daily statistics for scraping performance and results';
COMMENT ON VIEW combined_companies IS 'Combined view of scraped and manually added companies';
COMMENT ON VIEW scraping_performance IS 'Performance metrics for web scraping operations';
COMMENT ON FUNCTION update_scraping_stats IS 'Updates scraping statistics for monitoring and optimization';
