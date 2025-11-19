const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const { Worker } = require('worker_threads');
const path = require('path');

class ScrapingEngine {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
    this.scrapingQueue = [];
    this.isProcessing = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      this.isInitialized = true;
      console.log('✅ Scraping engine initialized');
    } catch (error) {
      console.error('❌ Failed to initialize scraping engine:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.isInitialized = false;
    }
  }

  // Main scraping method
  async scrapeLeads(searchCriteria) {
    const { query, industry, location, companySize, maxResults = 100 } = searchCriteria;
    
    try {
      await this.initialize();
      
      const leads = [];
      const sources = [
        { name: 'Google Maps', method: this.scrapeGoogleMaps },
        { name: 'Yellow Pages', method: this.scrapeYellowPages },
        { name: 'Crunchbase', method: this.scrapeCrunchbase },
        { name: 'LinkedIn Alternative', method: this.scrapeLinkedInAlternative }
      ];

      // Scrape from multiple sources concurrently
      const scrapingPromises = sources.map(async (source) => {
        try {
          console.log(`🔍 Scraping from ${source.name}...`);
          const sourceLeads = await source.method.call(this, searchCriteria);
          console.log(`✅ ${source.name}: Found ${sourceLeads.length} leads`);
          return sourceLeads;
        } catch (error) {
          console.error(`❌ Error scraping from ${source.name}:`, error);
          return [];
        }
      });

      const results = await Promise.all(scrapingPromises);
      
      // Combine and deduplicate leads
      results.forEach(sourceLeads => {
        leads.push(...sourceLeads);
      });

      // Deduplicate based on company name and website
      const uniqueLeads = this.deduplicateLeads(leads);
      
      // Enrich leads with additional data
      const enrichedLeads = await this.enrichLeads(uniqueLeads.slice(0, maxResults));
      
      return enrichedLeads;
      
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      throw error;
    }
  }

  // Google Maps Business Scraping
  async scrapeGoogleMaps(searchCriteria) {
    const { query, location } = searchCriteria;
    const leads = [];
    
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const searchQuery = `${query} ${location}`;
      const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      await page.goto(googleMapsUrl, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(3000);
      
      // Extract business listings
      const businessData = await page.evaluate(() => {
        const businesses = [];
        const businessCards = document.querySelectorAll('[data-result-index]');
        
        businessCards.forEach((card, index) => {
          if (index >= 20) return; // Limit to first 20 results
          
          try {
            const nameElement = card.querySelector('h3, .fontHeadlineSmall');
            const addressElement = card.querySelector('[data-item-id*="address"], .fontBodyMedium');
            const phoneElement = card.querySelector('[data-item-id*="phone"], .fontBodyMedium');
            const websiteElement = card.querySelector('[data-item-id*="website"], .fontBodyMedium');
            
            if (nameElement) {
              businesses.push({
                company_name: nameElement.textContent.trim(),
                address: addressElement ? addressElement.textContent.trim() : '',
                phone: phoneElement ? phoneElement.textContent.trim() : '',
                website: websiteElement ? websiteElement.textContent.trim() : '',
                source: 'Google Maps',
                scraped_at: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error parsing business card:', error);
          }
        });
        
        return businesses;
      });
      
      leads.push(...businessData);
      await page.close();
      
    } catch (error) {
      console.error('❌ Google Maps scraping error:', error);
    }
    
    return leads;
  }

  // Yellow Pages Scraping
  async scrapeYellowPages(searchCriteria) {
    const { query, location } = searchCriteria;
    const leads = [];
    
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const yellowPagesUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(query)}&geo_location_terms=${encodeURIComponent(location)}`;
      
      await page.goto(yellowPagesUrl, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);
      
      const businessData = await page.evaluate(() => {
        const businesses = [];
        const businessCards = document.querySelectorAll('.result');
        
        businessCards.forEach((card, index) => {
          if (index >= 15) return; // Limit results
          
          try {
            const nameElement = card.querySelector('.business-name');
            const addressElement = card.querySelector('.street-address');
            const phoneElement = card.querySelector('.phones');
            const websiteElement = card.querySelector('.track-visit-website');
            
            if (nameElement) {
              businesses.push({
                company_name: nameElement.textContent.trim(),
                address: addressElement ? addressElement.textContent.trim() : '',
                phone: phoneElement ? phoneElement.textContent.trim() : '',
                website: websiteElement ? websiteElement.href : '',
                source: 'Yellow Pages',
                scraped_at: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error parsing business card:', error);
          }
        });
        
        return businesses;
      });
      
      leads.push(...businessData);
      await page.close();
      
    } catch (error) {
      console.error('❌ Yellow Pages scraping error:', error);
    }
    
    return leads;
  }

  // Crunchbase Alternative Scraping
  async scrapeCrunchbase(searchCriteria) {
    const { query, industry } = searchCriteria;
    const leads = [];
    
    try {
      // Use alternative business directories since Crunchbase requires authentication
      const alternatives = [
        'https://angel.co/companies',
        'https://www.startupblink.com',
        'https://www.f6s.com'
      ];
      
      for (const baseUrl of alternatives) {
        try {
          const page = await this.browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          
          await page.goto(baseUrl, { waitUntil: 'networkidle2' });
          await page.waitForTimeout(2000);
          
          // Generic business extraction
          const businessData = await page.evaluate(() => {
            const businesses = [];
            const companyElements = document.querySelectorAll('[class*="company"], [class*="startup"], [class*="business"]');
            
            companyElements.forEach((element, index) => {
              if (index >= 10) return; // Limit results
              
              try {
                const nameElement = element.querySelector('h1, h2, h3, [class*="name"], [class*="title"]');
                const descriptionElement = element.querySelector('p, [class*="description"], [class*="summary"]');
                
                if (nameElement) {
                  businesses.push({
                    company_name: nameElement.textContent.trim(),
                    description: descriptionElement ? descriptionElement.textContent.trim() : '',
                    source: 'Business Directory',
                    scraped_at: new Date().toISOString()
                  });
                }
              } catch (error) {
                console.error('Error parsing company element:', error);
              }
            });
            
            return businesses;
          });
          
          leads.push(...businessData);
          await page.close();
          
        } catch (error) {
          console.error(`❌ Error scraping ${baseUrl}:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Business directory scraping error:', error);
    }
    
    return leads;
  }

  // LinkedIn Alternative (using public business directories)
  async scrapeLinkedInAlternative(searchCriteria) {
    const { query, industry } = searchCriteria;
    const leads = [];
    
    try {
      // Use public business directories and company websites
      const businessDirectories = [
        'https://www.business.com',
        'https://www.zoominfo.com',
        'https://www.spoke.com'
      ];
      
      for (const directory of businessDirectories) {
        try {
          const page = await this.browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          
          await page.goto(directory, { waitUntil: 'networkidle2' });
          await page.waitForTimeout(2000);
          
          const businessData = await page.evaluate(() => {
            const businesses = [];
            const companyElements = document.querySelectorAll('[class*="company"], [class*="business"], [class*="organization"]');
            
            companyElements.forEach((element, index) => {
              if (index >= 8) return; // Limit results
              
              try {
                const nameElement = element.querySelector('h1, h2, h3, [class*="name"]');
                const industryElement = element.querySelector('[class*="industry"], [class*="category"]');
                const locationElement = element.querySelector('[class*="location"], [class*="address"]');
                
                if (nameElement) {
                  businesses.push({
                    company_name: nameElement.textContent.trim(),
                    industry: industryElement ? industryElement.textContent.trim() : '',
                    location: locationElement ? locationElement.textContent.trim() : '',
                    source: 'Business Directory',
                    scraped_at: new Date().toISOString()
                  });
                }
              } catch (error) {
                console.error('Error parsing company element:', error);
              }
            });
            
            return businesses;
          });
          
          leads.push(...businessData);
          await page.close();
          
        } catch (error) {
          console.error(`❌ Error scraping ${directory}:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Business directory scraping error:', error);
    }
    
    return leads;
  }

  // Lead enrichment with additional data
  async enrichLeads(leads) {
    const enrichedLeads = [];
    
    for (const lead of leads) {
      try {
        const enrichedLead = { ...lead };
        
        // Generate email patterns if website exists
        if (lead.website) {
          enrichedLead.email_patterns = this.generateEmailPatterns(lead.company_name);
        }
        
        // Extract domain from website
        if (lead.website) {
          try {
            const url = new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`);
            enrichedLead.domain = url.hostname;
          } catch (error) {
            enrichedLead.domain = lead.website;
          }
        }
        
        // Add quality score based on data completeness
        enrichedLead.quality_score = this.calculateQualityScore(enrichedLead);
        
        // Add unique ID
        enrichedLead.id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        enrichedLeads.push(enrichedLead);
        
      } catch (error) {
        console.error('❌ Error enriching lead:', error);
        enrichedLeads.push(lead); // Add original lead if enrichment fails
      }
    }
    
    return enrichedLeads;
  }

  // Generate common email patterns
  generateEmailPatterns(companyName) {
    const patterns = [];
    const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    
    // Common email patterns
    patterns.push(`first.last@${domain}`);
    patterns.push(`first@${domain}`);
    patterns.push(`first_last@${domain}`);
    patterns.push(`firstl@${domain}`);
    patterns.push(`f.last@${domain}`);
    patterns.push(`first.l@${domain}`);
    
    return patterns;
  }

  // Calculate lead quality score
  calculateQualityScore(lead) {
    let score = 0;
    const maxScore = 100;
    
    if (lead.company_name) score += 20;
    if (lead.website) score += 20;
    if (lead.phone) score += 15;
    if (lead.address) score += 15;
    if (lead.industry) score += 10;
    if (lead.email_patterns && lead.email_patterns.length > 0) score += 20;
    
    return score / maxScore;
  }

  // Deduplicate leads
  deduplicateLeads(leads) {
    const seen = new Set();
    const uniqueLeads = [];
    
    leads.forEach(lead => {
      const key = `${lead.company_name?.toLowerCase()}_${lead.website?.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLeads.push(lead);
      }
    });
    
    return uniqueLeads;
  }

  // Background scraping with queue
  async addToScrapingQueue(searchCriteria) {
    this.scrapingQueue.push({
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      criteria: searchCriteria,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return this.scrapingQueue[this.scrapingQueue.length - 1].id;
  }

  async processQueue() {
    if (this.isProcessing || this.scrapingQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.scrapingQueue.length > 0) {
      const job = this.scrapingQueue.shift();
      
      try {
        job.status = 'processing';
        job.started_at = new Date().toISOString();
        
        const leads = await this.scrapeLeads(job.criteria);
        
        job.status = 'completed';
        job.completed_at = new Date().toISOString();
        job.results = leads;
        job.lead_count = leads.length;
        
      } catch (error) {
        job.status = 'failed';
        job.completed_at = new Date().toISOString();
        job.error = error.message;
        console.error('❌ Scraping job failed:', error);
      }
    }
    
    this.isProcessing = false;
  }

  // Get scraping job status
  getJobStatus(jobId) {
    return this.scrapingQueue.find(job => job.id === jobId) || null;
  }

  // Get all jobs
  getAllJobs() {
    return this.scrapingQueue;
  }
}

module.exports = ScrapingEngine;
