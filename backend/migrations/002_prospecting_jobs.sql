-- Migration: 002_prospecting_jobs.sql
-- Description: Create prospecting_jobs table for tracking lead prospecting jobs
-- Date: 2024

-- Create prospecting_jobs table
CREATE TABLE IF NOT EXISTS prospecting_jobs (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  industry VARCHAR(100),
  location VARCHAR(100),
  company_size VARCHAR(50),
  max_results INTEGER DEFAULT 100,
  include_emails BOOLEAN DEFAULT FALSE,
  enrich_data BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  results_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_prospecting_jobs_status ON prospecting_jobs(status);

-- Create index on started_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_prospecting_jobs_started_at ON prospecting_jobs(started_at);

-- Create index on query for search functionality
CREATE INDEX IF NOT EXISTS idx_prospecting_jobs_query ON prospecting_jobs USING gin(to_tsvector('english', query));

-- Add comments to table and columns
COMMENT ON TABLE prospecting_jobs IS 'Tracks lead prospecting jobs and their status';
COMMENT ON COLUMN prospecting_jobs.query IS 'The search query used for prospecting';
COMMENT ON COLUMN prospecting_jobs.industry IS 'Industry filter applied to the search';
COMMENT ON COLUMN prospecting_jobs.location IS 'Location filter applied to the search';
COMMENT ON COLUMN prospecting_jobs.company_size IS 'Company size filter applied to the search';
COMMENT ON COLUMN prospecting_jobs.max_results IS 'Maximum number of results to return';
COMMENT ON COLUMN prospecting_jobs.include_emails IS 'Whether to include email addresses in results';
COMMENT ON COLUMN prospecting_jobs.enrich_data IS 'Whether to enrich data with additional sources';
COMMENT ON COLUMN prospecting_jobs.status IS 'Current status of the prospecting job';
COMMENT ON COLUMN prospecting_jobs.results_count IS 'Number of leads found by the job';
COMMENT ON COLUMN prospecting_jobs.error_message IS 'Error message if the job failed';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prospecting_jobs_updated_at 
    BEFORE UPDATE ON prospecting_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
