# Web Scraping Service - B2B Lead Generation Platform

## Overview

The Web Scraping Service is a comprehensive solution for extracting business and contact information from free public sources without relying on paid third-party APIs. It's designed to be ethical, respectful of rate limits, and compliant with website terms of service.

## Features

### 🎯 **Multi-Source Scraping**
- **Google Maps**: Business listings with name, address, phone, website, location
- **LinkedIn**: Company information, industry, location, description
- **Yelp**: Business details, ratings, reviews, categories
- **Yellow Pages**: Business listings, contact information, categories
- **Crunchbase**: Company data, funding information, industry details
- **Job Boards**: Indeed and Glassdoor for company insights
- **Company Websites**: Contact page extraction for emails, phones, addresses

### 🛡️ **Anti-Detection Features**
- **Rotating User Agents**: Automatically rotates browser user agents
- **Proxy Rotation**: Support for rotating proxy servers
- **Rate Limiting**: Intelligent rate limiting per domain
- **Stealth Mode**: Uses Puppeteer stealth plugin to avoid detection
- **Respectful Delays**: Built-in delays between requests

### 📊 **Data Management**
- **Structured Storage**: Organized storage in Supabase database
- **Duplicate Prevention**: Smart deduplication across sources
- **Raw Data Preservation**: Stores original scraped data for reference
- **Performance Tracking**: Monitors scraping success rates and response times

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Web Scraping Configuration
PROXY_LIST=http://proxy1.example.com:8080,http://proxy2.example.com:8080
SCRAPING_RATE_LIMIT=10
SCRAPING_RATE_WINDOW=60
SCRAPING_TIMEOUT=30000

# Logging
SCRAPING_LOG_LEVEL=info
SCRAPING_LOG_FILE=logs/scraping.log
```

### 3. Database Setup

Run the web scraping tables setup script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of setup-web-scraping-tables.sql
```

### 4. Start the Service

```bash
npm run dev
```

## API Endpoints

### Health Check
```http
GET /api/web-scraping/health
```

### Bulk Scraping
```http
POST /api/web-scraping/bulk-scrape
Content-Type: application/json

{
  "query": "software companies",
  "location": "San Francisco",
  "sources": ["google_maps", "linkedin", "yelp"],
  "maxResults": 100
}
```

### Scrape Specific Source
```http
POST /api/web-scraping/scrape-source
Content-Type: application/json

{
  "source": "google_maps",
  "query": "restaurants",
  "location": "New York"
}
```

### Scrape Company Website
```http
POST /api/web-scraping/scrape-website
Content-Type: application/json

{
  "website_url": "https://example.com"
}
```

### Get Scraping Job Status
```http
GET /api/web-scraping/job/{job_id}
```

### Get All Jobs
```http
GET /api/web-scraping/jobs
```

### Get Statistics
```http
GET /api/web-scraping/stats
```

## Usage Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Start bulk scraping
const startScraping = async () => {
  try {
    const response = await axios.post('http://localhost:5000/api/web-scraping/bulk-scrape', {
      query: 'tech startups',
      location: 'Austin, TX',
      sources: ['google_maps', 'linkedin', 'crunchbase']
    });
    
    console.log('Job started:', response.data.job_id);
    
    // Check status
    const jobStatus = await axios.get(`http://localhost:5000/api/web-scraping/job/${response.data.job_id}`);
    console.log('Job status:', jobStatus.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

// Scrape specific website
const scrapeWebsite = async (url) => {
  try {
    const response = await axios.post('http://localhost:5000/api/web-scraping/scrape-website', {
      website_url: url
    });
    
    console.log('Contact info:', response.data.contact_info);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};
```

### Python

```python
import requests

# Start bulk scraping
def start_scraping():
    response = requests.post('http://localhost:5000/api/web-scraping/bulk-scrape', json={
        'query': 'marketing agencies',
        'location': 'Los Angeles',
        'sources': ['yelp', 'yellowpages']
    })
    
    if response.status_code == 200:
        job_id = response.json()['job_id']
        print(f"Scraping job started: {job_id}")
        return job_id
    else:
        print(f"Error: {response.json()}")
        return None

# Check job status
def check_job_status(job_id):
    response = requests.get(f'http://localhost:5000/api/web-scraping/job/{job_id}')
    
    if response.status_code == 200:
        job_data = response.json()
        print(f"Status: {job_data['status']}")
        if job_data['status'] == 'completed':
            print(f"Total results: {job_data['total_results']}")
        return job_data
    else:
        print(f"Error: {response.json()}")
        return None
```

## Configuration Options

### Rate Limiting
```javascript
// Configure rate limits per domain
const rateLimiters = new Map();
rateLimiters.set('google.com', new RateLimiter({
  points: 10,        // 10 requests
  duration: 60,      // per 60 seconds
  blockDuration: 300 // block for 5 minutes if exceeded
}));
```

### Proxy Configuration
```javascript
// Add proxies to environment variable
PROXY_LIST=http://proxy1:8080,http://proxy2:8080,http://proxy3:8080

// Or add programmatically
webScrapingService.proxyList = [
  'http://proxy1.example.com:8080',
  'http://proxy2.example.com:8080'
];
```

### User Agent Rotation
```javascript
// Custom user agent patterns
const userAgent = new UserAgent({
  deviceCategory: 'desktop',
  platform: 'Win32',
  browser: 'Chrome'
});
```

## Data Structure

### Scraped Company Data
```json
{
  "id": 1,
  "name": "TechCorp Inc",
  "address": "123 Main St, San Francisco, CA",
  "phone": "+1-555-0123",
  "website": "https://techcorp.com",
  "description": "Leading software company",
  "location": "San Francisco, CA",
  "industry": "Technology",
  "rating": "4.5",
  "review_count": "150",
  "price_range": "$$",
  "categories": "Software, SaaS, B2B",
  "funding": "$10M Series A",
  "source": "google_maps",
  "scraped_at": "2024-01-15T10:30:00Z",
  "raw_data": { /* Original scraped data */ }
}
```

### Scraping Job
```json
{
  "id": 1234567890,
  "query": "software companies",
  "location": "San Francisco",
  "sources": ["google_maps", "linkedin"],
  "max_results": 100,
  "status": "completed",
  "started_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:05:00Z",
  "total_results": 45,
  "results": { /* Scraped results */ },
  "error": null
}
```

## Best Practices

### 1. **Respectful Scraping**
- Always check website robots.txt
- Implement reasonable delays between requests
- Use rate limiting to avoid overwhelming servers
- Monitor for blocking and adjust accordingly

### 2. **Data Quality**
- Validate scraped data before storage
- Implement deduplication strategies
- Store raw data for debugging and reprocessing
- Regular data cleanup and maintenance

### 3. **Performance Optimization**
- Use connection pooling for database operations
- Implement caching for frequently accessed data
- Monitor scraping performance metrics
- Optimize selectors and parsing logic

### 4. **Error Handling**
- Implement retry mechanisms for failed requests
- Log all errors for debugging
- Graceful degradation when sources are unavailable
- User-friendly error messages

## Monitoring & Analytics

### Scraping Statistics
```sql
-- View scraping performance
SELECT * FROM scraping_performance;

-- Check success rates by source
SELECT 
  source,
  AVG(success_rate) as avg_success_rate,
  SUM(total_results) as total_results
FROM scraping_performance 
GROUP BY source;
```

### Job Monitoring
```sql
-- Check recent jobs
SELECT 
  status,
  COUNT(*) as job_count,
  AVG(total_results) as avg_results
FROM scraping_jobs 
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

## Troubleshooting

### Common Issues

#### 1. **Rate Limiting Errors**
```javascript
// Check rate limit configuration
console.log('Rate limiters:', webScrapingService.rateLimiters);

// Adjust limits if needed
webScrapingService.rateLimiters.get('google.com').points = 5;
```

#### 2. **Proxy Connection Issues**
```javascript
// Test proxy connectivity
const testProxy = async (proxyUrl) => {
  try {
    const response = await axios.get('https://httpbin.org/ip', {
      proxy: { host: proxyUrl, port: 8080 }
    });
    console.log('Proxy working:', response.data);
  } catch (error) {
    console.error('Proxy failed:', error.message);
  }
};
```

#### 3. **Selector Changes**
```javascript
// Update selectors if websites change
const selectors = {
  google_maps: {
    business: '[data-value="Business"]',
    name: 'h3',
    address: '[data-item-id*="address"]'
  }
};
```

### Debug Mode
```javascript
// Enable debug logging
webScrapingService.logger.level = 'debug';

// Check browser state
console.log('Browser:', webScrapingService.browser);
console.log('Active pages:', await webScrapingService.browser.pages());
```

## Legal & Ethical Considerations

### ✅ **Permitted Activities**
- Scraping publicly available information
- Respecting robots.txt directives
- Implementing reasonable rate limits
- Using data for legitimate business purposes

### ❌ **Avoid These Practices**
- Scraping behind login walls
- Bypassing CAPTCHA or anti-bot measures
- Excessive request rates
- Violating website terms of service
- Scraping personal/sensitive information

### 📋 **Compliance Checklist**
- [ ] Review website terms of service
- [ ] Check robots.txt for allowed paths
- [ ] Implement rate limiting
- [ ] Use appropriate user agents
- [ ] Respect website blocking requests
- [ ] Monitor for legal changes

## Performance Tuning

### Database Optimization
```sql
-- Create additional indexes for specific queries
CREATE INDEX CONCURRENTLY idx_scraped_companies_name_gin 
ON scraped_companies USING GIN(to_tsvector('english', name));

-- Partition tables by date for large datasets
CREATE TABLE scraped_companies_2024 PARTITION OF scraped_companies
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Memory Management
```javascript
// Close unused browser pages
const cleanupPages = async () => {
  const pages = await webScrapingService.browser.pages();
  if (pages.length > 5) {
    await pages[0].close();
  }
};

// Regular cleanup
setInterval(cleanupPages, 60000);
```

## Integration with Lead Prospecting

The web scraping service integrates seamlessly with the existing lead prospecting system:

```javascript
// Use scraped data in lead generation
const generateLeadsFromScraped = async (query, location) => {
  // Start scraping
  const scrapingJob = await startBulkScraping(query, location);
  
  // Wait for completion
  const results = await waitForJobCompletion(scrapingJob.job_id);
  
  // Convert to leads
  const leads = results.google_maps.map(business => ({
    company: business.name,
    contact: business.phone,
    email: '', // Will be enriched later
    website: business.website,
    location: business.address,
    source: 'web_scraping',
    confidence: 0.8
  }));
  
  return leads;
};
```

## Support & Maintenance

### Regular Maintenance Tasks
1. **Daily**: Check scraping job status and error logs
2. **Weekly**: Review rate limiting effectiveness and adjust if needed
3. **Monthly**: Update selectors for major website changes
4. **Quarterly**: Review and update proxy list
5. **Annually**: Legal compliance review

### Getting Help
- Check the logs in `backend/logs/scraping.log`
- Review the Supabase database for data integrity
- Test individual endpoints with the health check
- Monitor browser performance and memory usage

---

**Note**: This service is designed for educational and legitimate business purposes. Always ensure compliance with applicable laws and website terms of service when using web scraping functionality.
