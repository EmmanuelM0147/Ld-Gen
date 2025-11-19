const express = require('express');
const router = express.Router();
const WebScrapingService = require('../services/WebScrapingService');
const { supabase } = require('../config/supabase-config');

// Initialize web scraping service
const webScrapingService = new WebScrapingService();

// Initialize the service when the route is loaded
webScrapingService.initialize().catch(console.error);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Web Scraping Service',
    timestamp: new Date().toISOString()
  });
});

// Start bulk scraping from multiple sources
router.post('/bulk-scrape', async (req, res) => {
  try {
    const { query, location, sources = ['all'], maxResults = 100 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Start scraping in background
    const scrapingJob = {
      id: Date.now(),
      query,
      location,
      sources,
      maxResults,
      status: 'started',
      started_at: new Date().toISOString(),
      results: null
    };

    // Store job in database
    const { data: jobData, error: jobError } = await supabase
      .from('scraping_jobs')
      .insert([scrapingJob])
      .select()
      .single();

    if (jobError) {
      console.error('Error storing scraping job:', jobError);
    }

    // Start scraping asynchronously
    setImmediate(async () => {
      try {
        const results = await webScrapingService.bulkScrape(query, location, sources);
        
        // Update job status and results
        if (jobData) {
          await supabase
            .from('scraping_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              results: results,
              total_results: results ? results.total_results : 0
            })
            .eq('id', jobData.id);
        }

        // Store scraped data in appropriate tables
        if (results) {
          await storeScrapedData(results);
        }

      } catch (error) {
        console.error('Error in background scraping:', error);
        
        // Update job status to failed
        if (jobData) {
          await supabase
            .from('scraping_jobs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error: error.message
            })
            .eq('id', jobData.id);
        }
      }
    });

    res.json({
      message: 'Scraping job started',
      job_id: scrapingJob.id,
      status: 'started'
    });

  } catch (error) {
    console.error('Error starting bulk scraping:', error);
    res.status(500).json({ error: 'Failed to start scraping job' });
  }
});

// Get scraping job status and results
router.get('/job/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const { data: job, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);

  } catch (error) {
    console.error('Error fetching scraping job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Get all scraping jobs
router.get('/jobs', async (req, res) => {
  try {
    const { data: jobs, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    res.json(jobs);

  } catch (error) {
    console.error('Error fetching scraping jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Scrape specific source
router.post('/scrape-source', async (req, res) => {
  try {
    const { source, query, location } = req.body;

    if (!source || !query) {
      return res.status(400).json({ error: 'Source and query parameters are required' });
    }

    let results = [];

    switch (source) {
      case 'google_maps':
        results = await webScrapingService.scrapeGoogleMaps(query, location);
        break;
      case 'linkedin':
        results = await webScrapingService.scrapeLinkedInCompany(query);
        break;
      case 'yelp':
        results = await webScrapingService.scrapeYelpBusinesses(query, location);
        break;
      case 'yellowpages':
        results = await webScrapingService.scrapeYellowPages(query, location);
        break;
      case 'crunchbase':
        results = await webScrapingService.scrapeCrunchbase(query);
        break;
      case 'job_boards':
        results = await webScrapingService.scrapeJobBoards(query, location);
        break;
      default:
        return res.status(400).json({ error: 'Invalid source specified' });
    }

    // Store results
    await storeScrapedData({ [source]: results });

    res.json({
      source,
      query,
      location,
      results_count: results.length,
      results
    });

  } catch (error) {
    console.error('Error scraping source:', error);
    res.status(500).json({ error: 'Failed to scrape source' });
  }
});

// Scrape company website for contact information
router.post('/scrape-website', async (req, res) => {
  try {
    const { website_url } = req.body;

    if (!website_url) {
      return res.status(400).json({ error: 'Website URL is required' });
    }

    const contactInfo = await webScrapingService.scrapeContactPage(website_url);

    if (contactInfo) {
      // Store contact information
      const { data, error } = await supabase
        .from('scraped_contacts')
        .insert([{
          website_url,
          contact_info: contactInfo,
          scraped_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error storing contact info:', error);
      }
    }

    res.json({
      website_url,
      contact_info: contactInfo,
      success: !!contactInfo
    });

  } catch (error) {
    console.error('Error scraping website:', error);
    res.status(500).json({ error: 'Failed to scrape website' });
  }
});

// Get scraping statistics
router.get('/stats', async (req, res) => {
  try {
    const { data: jobs, error: jobsError } = await supabase
      .from('scraping_jobs')
      .select('status, total_results, started_at');

    if (jobsError) {
      throw jobsError;
    }

    const stats = {
      total_jobs: jobs.length,
      completed_jobs: jobs.filter(job => job.status === 'completed').length,
      failed_jobs: jobs.filter(job => job.status === 'failed').length,
      running_jobs: jobs.filter(job => job.status === 'started').length,
      total_results: jobs
        .filter(job => job.total_results)
        .reduce((sum, job) => sum + job.total_results, 0),
      average_results_per_job: jobs.length > 0 ? 
        Math.round(jobs
          .filter(job => job.total_results)
          .reduce((sum, job) => sum + job.total_results, 0) / jobs.length) : 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching scraping stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Helper function to store scraped data
async function storeScrapedData(results) {
  try {
    // Store companies from various sources
    if (results.google_maps && results.google_maps.length > 0) {
      const companies = results.google_maps.map(business => ({
        name: business.name,
        address: business.address,
        phone: business.phone,
        website: business.website,
        source: 'google_maps',
        scraped_at: business.scraped_at,
        raw_data: business
      }));

      if (companies.length > 0) {
        await supabase
          .from('scraped_companies')
          .upsert(companies, { onConflict: 'name,source' });
      }
    }

    if (results.linkedin && results.linkedin.length > 0) {
      const companies = results.linkedin.map(company => ({
        name: company.name,
        description: company.description,
        location: company.location,
        industry: company.industry,
        source: 'linkedin',
        scraped_at: company.scraped_at,
        raw_data: company
      }));

      if (companies.length > 0) {
        await supabase
          .from('scraped_companies')
          .upsert(companies, { onConflict: 'name,source' });
      }
    }

    if (results.yelp && results.yelp.length > 0) {
      const companies = results.yelp.map(business => ({
        name: business.name,
        rating: business.rating,
        review_count: business.review_count,
        price_range: business.price_range,
        categories: business.categories,
        source: 'yelp',
        scraped_at: business.scraped_at,
        raw_data: business
      }));

      if (companies.length > 0) {
        await supabase
          .from('scraped_companies')
          .upsert(companies, { onConflict: 'name,source' });
      }
    }

    if (results.yellowpages && results.yellowpages.length > 0) {
      const companies = results.yellowpages.map(business => ({
        name: business.name,
        phone: business.phone,
        address: business.address,
        categories: business.categories,
        source: 'yellowpages',
        scraped_at: business.scraped_at,
        raw_data: business
      }));

      if (companies.length > 0) {
        await supabase
          .from('scraped_companies')
          .upsert(companies, { onConflict: 'name,source' });
      }
    }

    if (results.crunchbase && results.crunchbase.length > 0) {
      const companies = results.crunchbase.map(company => ({
        name: company.name,
        description: company.description,
        funding: company.funding,
        industry: company.industry,
        source: 'crunchbase',
        scraped_at: company.scraped_at,
        raw_data: company
      }));

      if (companies.length > 0) {
        await supabase
          .from('scraped_companies')
          .upsert(companies, { onConflict: 'name,source' });
      }
    }

    // Store job board results
    if (results.job_boards && results.job_boards.length > 0) {
      const jobs = results.job_boards.map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        source: job.source,
        scraped_at: job.scraped_at,
        raw_data: job
      }));

      if (jobs.length > 0) {
        await supabase
          .from('scraped_jobs')
          .upsert(jobs, { onConflict: 'title,company,source' });
      }
    }

    console.log('Successfully stored scraped data');

  } catch (error) {
    console.error('Error storing scraped data:', error);
  }
}

// Cleanup on route unload
process.on('SIGINT', () => {
  webScrapingService.close();
});

module.exports = router;
