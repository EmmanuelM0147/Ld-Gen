const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const winston = require('winston');

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class WebScrapingService {
  constructor() {
    this.rateLimiters = new Map();
    this.proxyList = [];
    this.currentProxyIndex = 0;
    this.browser = null;
    this.logger = this.setupLogger();
    this.setupRateLimiters();
  }

  setupLogger() {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/scraping.log' }),
        new winston.transports.Console()
      ]
    });
  }

  setupRateLimiters() {
    // Rate limiters for different domains
    const domains = [
      'google.com',
      'linkedin.com',
      'yelp.com',
      'yellowpages.com',
      'crunchbase.com'
    ];

    domains.forEach(domain => {
      this.rateLimiters.set(domain, new RateLimiterMemory({
        keyGenerator: () => domain,
        points: 10, // Number of requests
        duration: 60, // Per 60 seconds
        blockDuration: 300 // Block for 5 minutes if limit exceeded
      }));
    });
  }

  async initialize() {
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
      this.logger.info('Web scraping service initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize web scraping service:', error);
      return false;
    }
  }

  async getRandomUserAgent() {
    const userAgent = new UserAgent();
    return userAgent.toString();
  }

  async getNextProxy() {
    if (this.proxyList.length === 0) {
      // Load proxy list from file or environment
      this.proxyList = process.env.PROXY_LIST ? 
        process.env.PROXY_LIST.split(',') : [];
    }
    
    if (this.proxyList.length === 0) {
      return null;
    }

    const proxy = this.proxyList[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
    return proxy;
  }

  async checkRateLimit(domain) {
    const limiter = this.rateLimiters.get(domain);
    if (limiter) {
      try {
        await limiter.consume(domain);
      } catch (rejRes) {
        const delay = rejRes.msBeforeNext;
        this.logger.warn(`Rate limit exceeded for ${domain}, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async scrapeGoogleMaps(query, location = '') {
    try {
      await this.checkRateLimit('google.com');
      
      const searchQuery = encodeURIComponent(`${query} ${location}`);
      const url = `https://www.google.com/maps/search/${searchQuery}`;
      
      const page = await this.browser.newPage();
      await page.setUserAgent(await this.getRandomUserAgent());
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to Google Maps
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await page.waitForSelector('[data-value="Business"]', { timeout: 10000 });
      
      // Extract business listings
      const businesses = await page.evaluate(() => {
        const listings = [];
        const businessElements = document.querySelectorAll('[data-value="Business"]');
        
        businessElements.forEach((element, index) => {
          if (index < 20) { // Limit to first 20 results
            const nameElement = element.querySelector('h3');
            const addressElement = element.querySelector('[data-item-id*="address"]');
            const phoneElement = element.querySelector('[data-item-id*="phone"]');
            const websiteElement = element.querySelector('[data-item-id*="website"]');
            
            if (nameElement) {
              listings.push({
                name: nameElement.textContent.trim(),
                address: addressElement ? addressElement.textContent.trim() : '',
                phone: phoneElement ? phoneElement.textContent.trim() : '',
                website: websiteElement ? websiteElement.href : '',
                source: 'google_maps',
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return listings;
      });
      
      await page.close();
      this.logger.info(`Scraped ${businesses.length} businesses from Google Maps`);
      return businesses;
      
    } catch (error) {
      this.logger.error('Error scraping Google Maps:', error);
      return [];
    }
  }

  async scrapeLinkedInCompany(companyName) {
    try {
      await this.checkRateLimit('linkedin.com');
      
      const searchQuery = encodeURIComponent(companyName);
      const url = `https://www.linkedin.com/search/results/companies/?keywords=${searchQuery}`;
      
      const page = await this.browser.newPage();
      await page.setUserAgent(await this.getRandomUserAgent());
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to LinkedIn
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await page.waitForSelector('.search-result__info', { timeout: 10000 });
      
      // Extract company information
      const companies = await page.evaluate(() => {
        const results = [];
        const companyElements = document.querySelectorAll('.search-result__info');
        
        companyElements.forEach((element, index) => {
          if (index < 10) { // Limit to first 10 results
            const nameElement = element.querySelector('.search-result__title');
            const descriptionElement = element.querySelector('.search-result__description');
            const locationElement = element.querySelector('.search-result__location');
            const industryElement = element.querySelector('.search-result__industry');
            
            if (nameElement) {
              results.push({
                name: nameElement.textContent.trim(),
                description: descriptionElement ? descriptionElement.textContent.trim() : '',
                location: locationElement ? locationElement.textContent.trim() : '',
                industry: industryElement ? industryElement.textContent.trim() : '',
                source: 'linkedin',
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return results;
      });
      
      await page.close();
      this.logger.info(`Scraped ${companies.length} companies from LinkedIn`);
      return companies;
      
    } catch (error) {
      this.logger.error('Error scraping LinkedIn:', error);
      return [];
    }
  }

  async scrapeYelpBusinesses(query, location = '') {
    try {
      await this.checkRateLimit('yelp.com');
      
      const searchQuery = encodeURIComponent(query);
      const locationQuery = encodeURIComponent(location);
      const url = `https://www.yelp.com/search?find_desc=${searchQuery}&find_loc=${locationQuery}`;
      
      const page = await this.browser.newPage();
      await page.setUserAgent(await this.getRandomUserAgent());
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to Yelp
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await page.waitForSelector('[data-testid="serp-ia-card"]', { timeout: 10000 });
      
      // Extract business information
      const businesses = await page.evaluate(() => {
        const results = [];
        const businessElements = document.querySelectorAll('[data-testid="serp-ia-card"]');
        
        businessElements.forEach((element, index) => {
          if (index < 15) { // Limit to first 15 results
            const nameElement = element.querySelector('h3');
            const ratingElement = element.querySelector('[aria-label*="rating"]');
            const reviewCountElement = element.querySelector('[data-testid="review-count"]');
            const priceElement = element.querySelector('[data-testid="price-range"]');
            const categoryElement = element.querySelector('[data-testid="category-str-list"]');
            
            if (nameElement) {
              results.push({
                name: nameElement.textContent.trim(),
                rating: ratingElement ? ratingElement.getAttribute('aria-label') : '',
                review_count: reviewCountElement ? reviewCountElement.textContent.trim() : '',
                price_range: priceElement ? priceElement.textContent.trim() : '',
                categories: categoryElement ? categoryElement.textContent.trim() : '',
                source: 'yelp',
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return results;
      });
      
      await page.close();
      this.logger.info(`Scraped ${businesses.length} businesses from Yelp`);
      return businesses;
      
    } catch (error) {
      this.logger.error('Error scraping Yelp:', error);
      return [];
    }
  }

  async scrapeYellowPages(query, location = '') {
    try {
      await this.checkRateLimit('yellowpages.com');
      
      const searchQuery = encodeURIComponent(query);
      const locationQuery = encodeURIComponent(location);
      const url = `https://www.yellowpages.com/search?search_terms=${searchQuery}&geo_location_terms=${locationQuery}`;
      
      const page = await this.browser.newPage();
      await page.setUserAgent(await this.getRandomUserAgent());
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to Yellow Pages
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await page.waitForSelector('.result', { timeout: 10000 });
      
      // Extract business information
      const businesses = await page.evaluate(() => {
        const results = [];
        const businessElements = document.querySelectorAll('.result');
        
        businessElements.forEach((element, index) => {
          if (index < 20) { // Limit to first 20 results
            const nameElement = element.querySelector('.business-name');
            const phoneElement = element.querySelector('.phones');
            const addressElement = element.querySelector('.street-address');
            const categoryElement = element.querySelector('.categories');
            
            if (nameElement) {
              results.push({
                name: nameElement.textContent.trim(),
                phone: phoneElement ? phoneElement.textContent.trim() : '',
                address: addressElement ? addressElement.textContent.trim() : '',
                categories: categoryElement ? categoryElement.textContent.trim() : '',
                source: 'yellowpages',
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return results;
      });
      
      await page.close();
      this.logger.info(`Scraped ${businesses.length} businesses from Yellow Pages`);
      return businesses;
      
    } catch (error) {
      this.logger.error('Error scraping Yellow Pages:', error);
      return [];
    }
  }

  async scrapeCompanyWebsite(websiteUrl) {
    try {
      const response = await axios.get(websiteUrl, {
        headers: {
          'User-Agent': await this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract contact information
      const contactInfo = {
        emails: [],
        phones: [],
        addresses: [],
        social_links: [],
        source: websiteUrl,
        scraped_at: new Date().toISOString()
      };

      // Extract emails
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const pageText = $.text();
      const emails = pageText.match(emailRegex);
      if (emails) {
        contactInfo.emails = [...new Set(emails)]; // Remove duplicates
      }

      // Extract phone numbers
      const phoneRegex = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g;
      const phones = pageText.match(phoneRegex);
      if (phones) {
        contactInfo.phones = [...new Set(phones)];
      }

      // Extract addresses (basic pattern)
      const addressElements = $('address, .address, .contact-info, .location');
      addressElements.each((i, el) => {
        const address = $(el).text().trim();
        if (address.length > 10) { // Basic validation
          contactInfo.addresses.push(address);
        }
      });

      // Extract social media links
      const socialSelectors = [
        'a[href*="facebook.com"]',
        'a[href*="twitter.com"]',
        'a[href*="linkedin.com"]',
        'a[href*="instagram.com"]'
      ];
      
      socialSelectors.forEach(selector => {
        $(selector).each((i, el) => {
          const href = $(el).attr('href');
          if (href) {
            contactInfo.social_links.push(href);
          }
        });
      });

      this.logger.info(`Scraped contact info from ${websiteUrl}`);
      return contactInfo;
      
    } catch (error) {
      this.logger.error(`Error scraping website ${websiteUrl}:`, error);
      return null;
    }
  }

  async scrapeJobBoards(companyName, location = '') {
    try {
      const results = [];
      
      // Scrape Indeed
      try {
        const indeedResults = await this.scrapeIndeed(companyName, location);
        results.push(...indeedResults);
      } catch (error) {
        this.logger.warn('Failed to scrape Indeed:', error.message);
      }

      // Scrape Glassdoor
      try {
        const glassdoorResults = await this.scrapeGlassdoor(companyName, location);
        results.push(...glassdoorResults);
      } catch (error) {
        this.logger.warn('Failed to scrape Glassdoor:', error.message);
      }

      return results;
    } catch (error) {
      this.logger.error('Error scraping job boards:', error);
      return [];
    }
  }

  async scrapeIndeed(companyName, location = '') {
    try {
      const searchQuery = encodeURIComponent(companyName);
      const locationQuery = encodeURIComponent(location);
      const url = `https://www.indeed.com/jobs?q=${searchQuery}&l=${locationQuery}`;
      
      const page = await this.browser.newPage();
      await page.setUserAgent(await this.getRandomUserAgent());
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('.job_seen_beacon', { timeout: 10000 });
      
      const jobs = await page.evaluate(() => {
        const results = [];
        const jobElements = document.querySelectorAll('.job_seen_beacon');
        
        jobElements.forEach((element, index) => {
          if (index < 10) {
            const titleElement = element.querySelector('.jobTitle');
            const companyElement = element.querySelector('.companyName');
            const locationElement = element.querySelector('.companyLocation');
            const salaryElement = element.querySelector('.salary-snippet');
            
            if (titleElement) {
              results.push({
                title: titleElement.textContent.trim(),
                company: companyElement ? companyElement.textContent.trim() : '',
                location: locationElement ? locationElement.textContent.trim() : '',
                salary: salaryElement ? salaryElement.textContent.trim() : '',
                source: 'indeed',
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return results;
      });
      
      await page.close();
      return jobs;
      
    } catch (error) {
      this.logger.error('Error scraping Indeed:', error);
      return [];
    }
  }

  async scrapeGlassdoor(companyName, location = '') {
    try {
      const searchQuery = encodeURIComponent(companyName);
      const url = `https://www.glassdoor.com/Search/results.htm?keyword=${searchQuery}`;
      
      const page = await this.browser.newPage();
      await page.setUserAgent(await this.getRandomUserAgent());
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('.company-tile', { timeout: 10000 });
      
      const companies = await page.evaluate(() => {
        const results = [];
        const companyElements = document.querySelectorAll('.company-tile');
        
        companyElements.forEach((element, index) => {
          if (index < 5) {
            const nameElement = element.querySelector('.company-name');
            const ratingElement = element.querySelector('.rating');
            const industryElement = element.querySelector('.industry');
            const sizeElement = element.querySelector('.company-size');
            
            if (nameElement) {
              results.push({
                name: nameElement.textContent.trim(),
                rating: ratingElement ? ratingElement.textContent.trim() : '',
                industry: industryElement ? industryElement.textContent.trim() : '',
                size: sizeElement ? sizeElement.textContent.trim() : '',
                source: 'glassdoor',
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return results;
      });
      
      await page.close();
      return companies;
      
    } catch (error) {
      this.logger.error('Error scraping Glassdoor:', error);
      return [];
    }
  }

  async scrapeCrunchbase(companyName) {
    try {
      const searchQuery = encodeURIComponent(companyName);
      const url = `https://www.crunchbase.com/search/companies?q=${searchQuery}`;
      
      const page = await this.browser.newPage();
      await page.setUserAgent(await this.getRandomUserAgent());
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('.result-card', { timeout: 10000 });
      
      const companies = await page.evaluate(() => {
        const results = [];
        const companyElements = document.querySelectorAll('.result-card');
        
        companyElements.forEach((element, index) => {
          if (index < 5) {
            const nameElement = element.querySelector('.result-card-title');
            const descriptionElement = element.querySelector('.result-card-description');
            const fundingElement = element.querySelector('.funding-info');
            const industryElement = element.querySelector('.industry');
            
            if (nameElement) {
              results.push({
                name: nameElement.textContent.trim(),
                description: descriptionElement ? descriptionElement.textContent.trim() : '',
                funding: fundingElement ? fundingElement.textContent.trim() : '',
                industry: industryElement ? industryElement.textContent.trim() : '',
                source: 'crunchbase',
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return results;
      });
      
      await page.close();
      this.logger.info(`Scraped ${companies.length} companies from Crunchbase`);
      return companies;
      
    } catch (error) {
      this.logger.error('Error scraping Crunchbase:', error);
      return [];
    }
  }

  async scrapeContactPage(websiteUrl) {
    try {
      const contactUrls = [
        `${websiteUrl}/contact`,
        `${websiteUrl}/contact-us`,
        `${websiteUrl}/about/contact`,
        `${websiteUrl}/get-in-touch`,
        `${websiteUrl}/reach-us`
      ];

      for (const contactUrl of contactUrls) {
        try {
          const contactInfo = await this.scrapeCompanyWebsite(contactUrl);
          if (contactInfo && (contactInfo.emails.length > 0 || contactInfo.phones.length > 0)) {
            this.logger.info(`Found contact info at ${contactUrl}`);
            return contactInfo;
          }
        } catch (error) {
          // Continue to next URL if this one fails
          continue;
        }
      }

      // If no contact page found, try the main website
      return await this.scrapeCompanyWebsite(websiteUrl);
      
    } catch (error) {
      this.logger.error(`Error scraping contact page for ${websiteUrl}:`, error);
      return null;
    }
  }

  async bulkScrape(query, location = '', sources = ['all']) {
    try {
      const results = {
        google_maps: [],
        linkedin: [],
        yelp: [],
        yellowpages: [],
        job_boards: [],
        crunchbase: [],
        websites: [],
        total_results: 0,
        scraped_at: new Date().toISOString()
      };

      // Scrape from different sources based on configuration
      if (sources.includes('all') || sources.includes('google_maps')) {
        results.google_maps = await this.scrapeGoogleMaps(query, location);
      }

      if (sources.includes('all') || sources.includes('linkedin')) {
        results.linkedin = await this.scrapeLinkedInCompany(query);
      }

      if (sources.includes('all') || sources.includes('yelp')) {
        results.yelp = await this.scrapeYelpBusinesses(query, location);
      }

      if (sources.includes('all') || sources.includes('yellowpages')) {
        results.yellowpages = await this.scrapeYellowPages(query, location);
      }

      if (sources.includes('all') || sources.includes('job_boards')) {
        results.job_boards = await this.scrapeJobBoards(query, location);
      }

      if (sources.includes('all') || sources.includes('crunchbase')) {
        results.crunchbase = await this.scrapeCrunchbase(query);
      }

      // Calculate total results
      Object.values(results).forEach(sourceResults => {
        if (Array.isArray(sourceResults)) {
          results.total_results += sourceResults.length;
        }
      });

      this.logger.info(`Bulk scraping completed. Total results: ${results.total_results}`);
      return results;
      
    } catch (error) {
      this.logger.error('Error in bulk scraping:', error);
      return null;
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.info('Web scraping service closed successfully');
    } catch (error) {
      this.logger.error('Error closing web scraping service:', error);
    }
  }
}

module.exports = WebScrapingService;
