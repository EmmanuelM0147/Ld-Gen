# 🌐 Web Scraping Service Integration Guide

## Overview

This guide explains how to integrate the new Web Scraping Service with your existing LdPy B2B platform to create a comprehensive lead generation system that combines manual prospecting with automated data extraction from free public sources.

## 🔗 **Integration Points**

### 1. **Lead Prospecting Enhancement**
The web scraping service enhances your existing lead prospecting by providing:
- **Automated company discovery** from multiple sources
- **Contact information extraction** from company websites
- **Data enrichment** from business directories and social platforms
- **Bulk lead generation** capabilities

### 2. **Data Flow Integration**
```
User Input → Lead Prospecting → Web Scraping → Data Enrichment → Lead Storage
     ↓              ↓                ↓              ↓              ↓
  Query/Location → Manual Search → Auto Scraping → Verification → Database
```

## 🚀 **Quick Start Integration**

### Step 1: Start the Web Scraping Service
```bash
cd backend
npm run dev
```

### Step 2: Test the Integration
```bash
# Test the web scraping service
node test_web_scraping.js

# Test the API endpoints
curl http://localhost:5000/api/web-scraping/health
```

### Step 3: Use in Lead Generation
```javascript
// Example: Generate leads using web scraping
const generateLeadsWithScraping = async (query, location) => {
  try {
    // Start web scraping job
    const response = await fetch('/api/web-scraping/bulk-scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        location: location,
        sources: ['google_maps', 'linkedin', 'yelp']
      })
    });
    
    const { job_id } = await response.json();
    
    // Monitor job progress
    const checkProgress = async () => {
      const status = await fetch(`/api/web-scraping/job/${job_id}`);
      const job = await status.json();
      
      if (job.status === 'completed') {
        // Convert scraped data to leads
        const leads = convertScrapedDataToLeads(job.results);
        return leads;
      } else if (job.status === 'failed') {
        throw new Error(`Scraping failed: ${job.error}`);
      } else {
        // Still running, check again in 5 seconds
        setTimeout(checkProgress, 5000);
      }
    };
    
    return await checkProgress();
    
  } catch (error) {
    console.error('Error generating leads:', error);
    throw error;
  }
};
```

## 🔄 **Workflow Integration Examples**

### **Example 1: Enhanced Lead Prospecting**
```javascript
// Enhanced lead prospecting with web scraping
const enhancedLeadProspecting = async (searchParams) => {
  const { query, location, industry, companySize } = searchParams;
  
  // 1. Start web scraping for company discovery
  const scrapingJob = await startWebScraping(query, location);
  
  // 2. Run manual prospecting in parallel
  const manualProspecting = startManualProspecting(searchParams);
  
  // 3. Wait for both to complete
  const [scrapedResults, manualResults] = await Promise.all([
    waitForScrapingJob(scrapingJob.job_id),
    manualProspecting
  ]);
  
  // 4. Combine and deduplicate results
  const allLeads = combineAndDeduplicate(scrapedResults, manualResults);
  
  // 5. Enrich with contact verification
  const enrichedLeads = await enrichLeads(allLeads);
  
  return enrichedLeads;
};
```

### **Example 2: Automated Contact Discovery**
```javascript
// Automatically discover contact information for companies
const discoverContacts = async (companyList) => {
  const contactPromises = companyList.map(async (company) => {
    if (company.website) {
      try {
        // Scrape company website for contact info
        const response = await fetch('/api/web-scraping/scrape-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website_url: company.website })
        });
        
        const { contact_info } = await response.json();
        
        // Merge contact info with company data
        return {
          ...company,
          emails: contact_info.emails,
          phones: contact_info.phones,
          addresses: contact_info.addresses,
          contact_source: 'web_scraping'
        };
        
      } catch (error) {
        console.warn(`Failed to scrape ${company.website}:`, error.message);
        return company;
      }
    }
    return company;
  });
  
  return Promise.all(contactPromises);
};
```

### **Example 3: Bulk Lead Generation Pipeline**
```javascript
// Complete pipeline for bulk lead generation
const bulkLeadGenerationPipeline = async (config) => {
  const { queries, locations, sources, maxResults } = config;
  
  const allLeads = [];
  
  for (const query of queries) {
    for (const location of locations) {
      try {
        // Start scraping job
        const scrapingJob = await startWebScraping(query, location, sources, maxResults);
        
        // Wait for completion
        const results = await waitForScrapingJob(scrapingJob.job_id);
        
        if (results && results.total_results > 0) {
          // Convert to lead format
          const leads = convertScrapedDataToLeads(results);
          
          // Enrich with additional data
          const enrichedLeads = await enrichLeads(leads);
          
          allLeads.push(...enrichedLeads);
        }
        
        // Rate limiting between requests
        await delay(2000);
        
      } catch (error) {
        console.error(`Failed to scrape ${query} in ${location}:`, error);
      }
    }
  }
  
  return allLeads;
};
```

## 📊 **Data Integration Patterns**

### **1. Scraped Data to Lead Conversion**
```javascript
const convertScrapedDataToLeads = (scrapedResults) => {
  const leads = [];
  
  // Convert Google Maps results
  if (scrapedResults.google_maps) {
    scrapedResults.google_maps.forEach(business => {
      leads.push({
        company: business.name,
        website: business.website,
        phone: business.phone,
        address: business.address,
        location: business.address,
        source: 'google_maps_scraping',
        confidence: 0.8,
        scraped_at: business.scraped_at
      });
    });
  }
  
  // Convert LinkedIn results
  if (scrapedResults.linkedin) {
    scrapedResults.linkedin.forEach(company => {
      leads.push({
        company: company.name,
        industry: company.industry,
        location: company.location,
        description: company.description,
        source: 'linkedin_scraping',
        confidence: 0.7,
        scraped_at: company.scraped_at
      });
    });
  }
  
  return leads;
};
```

### **2. Lead Enrichment Pipeline**
```javascript
const enrichLeads = async (leads) => {
  const enrichedLeads = [];
  
  for (const lead of leads) {
    try {
      // Enrich with contact verification
      if (lead.email) {
        const verification = await verifyEmail(lead.email);
        lead.email_verified = verification.verified;
        lead.email_confidence = verification.confidence;
      }
      
      // Enrich with company data
      if (lead.company) {
        const companyData = await enrichCompany(lead.company);
        lead.industry = companyData.industry || lead.industry;
        lead.company_size = companyData.size;
        lead.technologies = companyData.technologies;
        lead.funding = companyData.funding;
      }
      
      // Enrich with website contact info
      if (lead.website && !lead.email) {
        const contactInfo = await scrapeWebsiteContacts(lead.website);
        if (contactInfo.emails.length > 0) {
          lead.email = contactInfo.emails[0];
          lead.contact_source = 'website_scraping';
        }
      }
      
      enrichedLeads.push(lead);
      
    } catch (error) {
      console.warn(`Failed to enrich lead ${lead.company}:`, error.message);
      enrichedLeads.push(lead); // Add unenriched lead
    }
  }
  
  return enrichedLeads;
};
```

## 🔧 **Configuration & Customization**

### **Environment Variables**
```env
# Web Scraping Configuration
PROXY_LIST=http://proxy1:8080,http://proxy2:8080
SCRAPING_RATE_LIMIT=10
SCRAPING_RATE_WINDOW=60
SCRAPING_TIMEOUT=30000
SCRAPING_LOG_LEVEL=info
```

### **Rate Limiting Configuration**
```javascript
// Customize rate limits for different sources
const customRateLimits = {
  'google.com': { points: 5, duration: 60, blockDuration: 300 },
  'linkedin.com': { points: 3, duration: 60, blockDuration: 600 },
  'yelp.com': { points: 8, duration: 60, blockDuration: 240 },
  'yellowpages.com': { points: 10, duration: 60, blockDuration: 180 }
};
```

### **Source Selection**
```javascript
// Choose which sources to scrape based on your needs
const sourceConfigs = {
  'tech_companies': ['google_maps', 'linkedin', 'crunchbase'],
  'local_businesses': ['google_maps', 'yelp', 'yellowpages'],
  'startups': ['linkedin', 'crunchbase', 'job_boards'],
  'enterprise': ['linkedin', 'crunchbase']
};
```

## 📈 **Performance Optimization**

### **1. Parallel Processing**
```javascript
// Process multiple scraping jobs in parallel
const parallelScraping = async (queries, sources) => {
  const jobs = queries.map(query => 
    startWebScraping(query, '', sources)
  );
  
  const results = await Promise.allSettled(jobs);
  
  return results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
};
```

### **2. Caching & Deduplication**
```javascript
// Cache scraped results to avoid re-scraping
const cacheKey = `${query}_${location}_${sources.join('_')}`;
const cachedResults = await cache.get(cacheKey);

if (cachedResults && isCacheValid(cachedResults)) {
  return cachedResults;
}

const results = await performScraping(query, location, sources);
await cache.set(cacheKey, results, 3600); // Cache for 1 hour

return results;
```

### **3. Batch Processing**
```javascript
// Process leads in batches for better performance
const processLeadsInBatches = async (leads, batchSize = 50) => {
  const batches = [];
  
  for (let i = 0; i < leads.length; i += batchSize) {
    batches.push(leads.slice(i, i + batchSize));
  }
  
  const results = [];
  
  for (const batch of batches) {
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
    
    // Rate limiting between batches
    await delay(1000);
  }
  
  return results;
};
```

## 🚨 **Error Handling & Monitoring**

### **1. Comprehensive Error Handling**
```javascript
const robustScraping = async (query, location, sources) => {
  try {
    const results = await startWebScraping(query, location, sources);
    return results;
    
  } catch (error) {
    // Log error for monitoring
    console.error(`Scraping failed for ${query} in ${location}:`, error);
    
    // Try alternative sources
    const alternativeSources = sources.filter(s => s !== 'google_maps');
    if (alternativeSources.length > 0) {
      try {
        return await startWebScraping(query, location, alternativeSources);
      } catch (fallbackError) {
        console.error('Fallback scraping also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
};
```

### **2. Health Monitoring**
```javascript
// Monitor scraping service health
const monitorScrapingHealth = async () => {
  try {
    const health = await fetch('/api/web-scraping/health');
    const stats = await fetch('/api/web-scraping/stats');
    
    const healthData = await health.json();
    const statsData = await stats.json();
    
    // Check for issues
    if (statsData.failed_jobs > statsData.completed_jobs * 0.2) {
      console.warn('High failure rate detected in web scraping');
      // Send alert or take corrective action
    }
    
    return { health: healthData, stats: statsData };
    
  } catch (error) {
    console.error('Failed to monitor scraping health:', error);
    throw error;
  }
};
```

## 🔒 **Security & Compliance**

### **1. Rate Limiting Compliance**
```javascript
// Ensure compliance with website terms of service
const compliantScraping = async (query, location) => {
  // Check robots.txt before scraping
  const robotsTxt = await checkRobotsTxt('https://example.com');
  
  if (!robotsTxt.allowsScraping) {
    throw new Error('Scraping not allowed by robots.txt');
  }
  
  // Implement respectful delays
  await delay(2000 + Math.random() * 3000); // 2-5 second random delay
  
  // Use rotating user agents
  const userAgent = await getRandomUserAgent();
  
  return await performScraping(query, location, { userAgent });
};
```

### **2. Data Privacy**
```javascript
// Ensure scraped data doesn't contain personal information
const sanitizeScrapedData = (data) => {
  const sanitized = { ...data };
  
  // Remove personal emails (keep business emails)
  if (sanitized.emails) {
    sanitized.emails = sanitized.emails.filter(email => 
      !email.includes('personal') && 
      !email.includes('gmail.com') &&
      !email.includes('yahoo.com')
    );
  }
  
  // Remove personal phone numbers
  if (sanitized.phones) {
    sanitized.phones = sanitized.phones.filter(phone => 
      phone.length >= 10 && phone.length <= 15
    );
  }
  
  return sanitized;
};
```

## 📚 **Best Practices**

### **1. Ethical Scraping**
- Always check robots.txt before scraping
- Implement reasonable rate limits
- Respect website terms of service
- Use appropriate user agents
- Monitor for blocking and adjust accordingly

### **2. Data Quality**
- Validate scraped data before storage
- Implement deduplication strategies
- Store raw data for debugging
- Regular data cleanup and maintenance

### **3. Performance**
- Use connection pooling for database operations
- Implement caching for frequently accessed data
- Monitor scraping performance metrics
- Optimize selectors and parsing logic

### **4. Monitoring**
- Track success rates by source
- Monitor response times and error rates
- Set up alerts for failures
- Regular performance reviews

## 🎯 **Next Steps**

1. **Test the Integration**: Run the test scripts and verify all endpoints work
2. **Configure Your Environment**: Set up environment variables and proxy settings
3. **Set Up Database Tables**: Run the SQL scripts in your Supabase dashboard
4. **Start Small**: Begin with a few sources and gradually expand
5. **Monitor Performance**: Track success rates and adjust rate limits as needed
6. **Scale Up**: Increase scraping capacity based on your needs

## 📞 **Support**

If you encounter issues or need help with the integration:
- Check the logs in `backend/logs/scraping.log`
- Review the API documentation in `WEB_SCRAPING_README.md`
- Test individual endpoints with the health check
- Monitor browser performance and memory usage

---

**Happy Scraping! 🚀** Remember to always respect website terms of service and implement ethical scraping practices.
