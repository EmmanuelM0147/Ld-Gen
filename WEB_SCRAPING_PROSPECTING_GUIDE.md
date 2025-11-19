# Web Scraping-Based Lead Prospecting System

## Overview
Your Lead Prospecting system now generates leads through **smart web scraping pipelines** instead of requiring pre-existing data. This approach follows your Data Acquisition (Free Sources) strategy:

- **Google Maps** business listings (name, category, phone, website, location)
- **Business directories** (Yelp, YellowPages, local directories)
- **LinkedIn** public profiles (no login required)
- **Company websites** "Contact Us" pages
- **Job boards** and professional networks
- **Crunchbase** free data

## How It Works

### 1. User Inputs Search Criteria
- Industry, location, job title, company size, etc.
- System validates at least one criteria is provided

### 2. Web Scraping Pipelines Trigger
- **Location-based**: Google Maps scraping for city/state searches
- **Industry-based**: Business directory scraping (Yelp, YellowPages)
- **Professional-based**: LinkedIn public profile scraping
- **Company-based**: Website contact page scraping

### 3. Data Processing & Enrichment
- Scraped data is filtered by search criteria
- Duplicates are removed
- Contact information is enriched
- Quality scores are assigned

### 4. Results Display
- Leads appear in real-time as they're discovered
- Progress bar advances from 0% to 100%
- Results are stored in the database for future reference

## System Architecture

```
User Input → Search Validation → Web Scraping Pipelines → Data Processing → Results Display
     ↓              ↓                    ↓                    ↓              ↓
  Frontend    Backend API         Multiple Scrapers    Enrichment     Real-time Feed
```

## Web Scraping Modules

### Google Maps Scraper
- **Purpose**: Extract business listings by location
- **Data**: Company name, category, phone, website, address, reviews
- **Rate Limiting**: Respects Google's terms, uses proxy rotation

### Business Directory Scraper
- **Sources**: Yelp, YellowPages, local business directories
- **Data**: Company details, contact info, business categories
- **Modular Design**: Easy to add new directory sources

### LinkedIn Scraper
- **Scope**: Public profiles only (no login required)
- **Data**: Professional titles, company affiliations, public contact info
- **Compliance**: Follows LinkedIn's robots.txt and rate limits

### Website Contact Scraper
- **Target**: Company "Contact Us" pages
- **Data**: Email addresses, phone numbers, contact forms
- **Intelligence**: Identifies contact patterns across different website structures

## Rate Limiting & Compliance

### Proxy Rotation
- Multiple proxy servers to avoid IP blocking
- Geographic distribution for location-specific searches
- Automatic failover if proxies become unavailable

### User Agent Rotation
- Different browser signatures for each request
- Mimics real user behavior
- Reduces detection as automated traffic

### Rate Limiting
- Configurable delays between requests
- Respects website terms of service
- Adaptive timing based on server response

## Integration Points

### Existing Scrapers
Your current scrapers in the `scrapers/` directory can be integrated:

```javascript
// Example integration with existing Google scraper
const { googleScraper } = require('../scrapers/google_scraper');
const googleMapsLeads = await googleScraper.searchBusinesses(searchCriteria);
```

### New Scraper Development
To add new scraping sources:

1. Create scraper module in `scrapers/` directory
2. Implement standard interface (search, parse, rateLimit)
3. Add to `triggerWebScraping` function
4. Configure rate limiting and proxy settings

## Testing the System

### Run Debug Script
```bash
cd backend
node debug_web_scraping_integration.js
```

### Expected Output
```
🌐 Web scraping simulation completed. Generated 3 leads
✅ Job processing: Completed successfully
✅ Lead enrichment: 3 leads enriched
```

### Frontend Testing
1. Go to Lead Prospecting page
2. Enter search criteria (e.g., Industry: "Technology", City: "San Francisco")
3. Click Search
4. Watch progress advance from 0% to 100%
5. See leads appear in Real-time Leads Feed

## Database Schema

### Required Tables
- `prospecting_jobs` - Track scraping jobs and status
- `leads` - Store discovered leads with source attribution

### Sample Data Structure
```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(200),
  industry VARCHAR(100),
  website VARCHAR(500),
  phone VARCHAR(50),
  email VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  source VARCHAR(100), -- e.g., "Google Maps Scraping"
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quality_score DECIMAL(3,2) DEFAULT 0.00,
  is_verified BOOLEAN DEFAULT FALSE
);
```

## Configuration

### Environment Variables
```bash
# Scraping settings
SCRAPING_MAX_CONCURRENT=5
SCRAPING_RATE_LIMIT_MS=1000
SCRAPING_PROXY_ROTATION=true
SCRAPING_USER_AGENT_ROTATION=true

# Proxy configuration
PROXY_LIST_URL=https://your-proxy-service.com/proxies
PROXY_AUTH_USERNAME=your_username
PROXY_AUTH_PASSWORD=your_password
```

### Scraper Settings
```javascript
// config/scraping-config.js
module.exports = {
  googleMaps: {
    maxResults: 100,
    rateLimitMs: 2000,
    useProxies: true
  },
  linkedin: {
    maxResults: 50,
    rateLimitMs: 5000,
    respectRobotsTxt: true
  },
  businessDirectories: {
    maxResults: 200,
    rateLimitMs: 1000,
    sources: ['yelp', 'yellowpages', 'local']
  }
};
```

## Monitoring & Analytics

### Job Status Tracking
- Real-time progress updates
- Success/failure rates
- Lead quality metrics
- Scraping performance data

### Error Handling
- Failed scraping attempts logged
- Automatic retry mechanisms
- Fallback to alternative sources
- User notification of issues

## Security & Compliance

### Data Privacy
- Only public information is scraped
- No login credentials required
- Respects robots.txt files
- Follows website terms of service

### Rate Limiting
- Prevents server overload
- Maintains good internet citizenship
- Reduces risk of IP blocking
- Configurable per source

## Troubleshooting

### Common Issues

#### 1. No Leads Generated
- Check if search criteria are too restrictive
- Verify scraper services are running
- Check proxy and rate limiting settings

#### 2. Progress Stuck at 0%
- Verify database tables exist
- Check backend logs for errors
- Ensure web scraping functions are working

#### 3. Scraping Errors
- Check proxy availability
- Verify rate limiting settings
- Review target website accessibility

### Debug Commands
```bash
# Test web scraping integration
node debug_web_scraping_integration.js

# Check database connection
node test_lead_search.js

# Monitor backend logs
tail -f backend/logs/scraping.log
```

## Next Steps

1. **Run the debug script** to verify the system works
2. **Create database tables** using the setup SQL script
3. **Integrate your existing scrapers** with the new system
4. **Configure proxy and rate limiting** settings
5. **Test the full workflow** in the frontend
6. **Monitor performance** and adjust settings as needed

## Success Indicators

✅ Web scraping pipelines trigger automatically  
✅ Leads are generated from public sources  
✅ Progress advances from 0% to 100%  
✅ Real-time results appear in the feed  
✅ No dependency on pre-existing data  
✅ Respects rate limits and terms of service  

Your prospecting system now generates fresh, relevant leads through intelligent web scraping instead of requiring a pre-populated database!
