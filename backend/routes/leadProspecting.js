const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase-config');

// Start lead prospecting with enhanced search criteria
router.post('/start', async (req, res) => {
  try {
    const {
      title,
      companyName,
      location,
      country,
      city,
      state,
      industry,
      teamSize,
      revenueRange,
      totalFunding,
      maxResults = 100,
      includeEmails = true,
      enrichData = true
    } = req.body;

    // Validate required fields - at least one search criteria must be provided
    const searchCriteria = {
      title: title?.trim() || '',
      companyName: companyName?.trim() || '',
      location: location?.trim() || '',
      country: country?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      industry: industry?.trim() || '',
      teamSize: teamSize?.trim() || '',
      revenueRange: revenueRange?.trim() || '',
      totalFunding: totalFunding?.trim() || ''
    };

    const hasSearchCriteria = Object.values(searchCriteria).some(value => value !== '');
    
    if (!hasSearchCriteria) {
      return res.status(400).json({ 
        error: 'At least one search criteria is required',
        message: 'Please provide at least one search parameter (title, company name, location, industry, etc.)'
      });
    }

    // Create prospecting job record
    const { data: jobData, error: jobError } = await supabase
      .from('prospecting_jobs')
      .insert({
        search_criteria: searchCriteria,
        max_results: Math.min(Math.max(parseInt(maxResults) || 100, 10), 1000),
        include_emails: includeEmails,
        enrich_data: enrichData,
        status: 'started',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating prospecting job:', jobError);
      return res.status(500).json({
        error: 'Failed to create prospecting job',
        details: jobError.message
      });
    }

    const jobId = jobData.id;

    // Start background processing
    processProspectingJob(jobId, searchCriteria, maxResults, includeEmails, enrichData);

    res.json({
      success: true,
      message: 'Lead prospecting started successfully',
      job_id: jobId,
      status: 'started',
      search_criteria: searchCriteria
    });

  } catch (error) {
    console.error('❌ Error starting lead prospecting:', error);
    res.status(500).json({
      error: 'Failed to start lead prospecting',
      details: error.message
    });
  }
});

// Process prospecting job in background
async function processProspectingJob(jobId, searchCriteria, maxResults, includeEmails, enrichData) {
  try {
    console.log(`🚀 Processing prospecting job ${jobId}...`);
    console.log('📋 Search criteria:', searchCriteria);
    
    // Update job status to processing
    const { error: updateError } = await supabase
      .from('prospecting_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    if (updateError) {
      console.error('❌ Failed to update job status to processing:', updateError);
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }

    // Step 1: Build search query based on criteria
    let searchQuery = buildSearchQuery(searchCriteria);
    console.log('🔍 Search query:', searchQuery);

    // Step 2: Trigger web scraping pipelines to acquire data
    console.log('🌐 Starting web scraping pipelines...');
    const scrapedLeads = await triggerWebScraping(searchCriteria, maxResults);
    console.log(`🌐 Web scraping completed. Found ${scrapedLeads?.length || 0} leads`);
    
    // Step 3: Search existing database for any matching leads
    console.log('🔍 Searching existing database...');
    const existingLeads = await searchLeadsByCriteria(searchCriteria, maxResults);
    console.log(`🔍 Database search completed. Found ${existingLeads?.length || 0} existing leads`);
    
    // Step 4: Combine and deduplicate leads
    const allLeads = [...(scrapedLeads || []), ...(existingLeads || [])];
    const uniqueLeads = deduplicateLeads(allLeads);
    console.log(`🔄 Combined and deduplicated leads. Total unique leads: ${uniqueLeads.length}`);
    
    // Step 5: Enrich lead data if requested
    let enrichedLeads = uniqueLeads;
    if (enrichData && uniqueLeads.length > 0) {
      console.log('🔧 Enriching leads...');
      enrichedLeads = await enrichLeads(uniqueLeads, includeEmails);
      console.log(`🔧 Enrichment completed. ${enrichedLeads.length} leads enriched`);
    }

    // Step 6: Store results (only if we have leads)
    if (enrichedLeads && enrichedLeads.length > 0) {
      console.log('💾 Storing prospecting results...');
      await storeProspectingResults(jobId, enrichedLeads);
      console.log('💾 Results stored successfully');
    }

    // Step 7: Update job status to completed
    console.log('✅ Updating job status to completed...');
    const { error: completeError } = await supabase
      .from('prospecting_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_leads: enrichedLeads.length,
        results: enrichedLeads
      })
      .eq('id', jobId);
    
    if (completeError) {
      console.error('❌ Failed to update job status to completed:', completeError);
      throw new Error(`Failed to complete job: ${completeError.message}`);
    }

    console.log(`✅ Prospecting job ${jobId} completed successfully with ${enrichedLeads.length} leads`);

  } catch (error) {
    console.error(`❌ Error processing prospecting job ${jobId}:`, error);
    
    // Update job status to failed
    try {
      await supabase
        .from('prospecting_jobs')
        .update({ 
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      console.log('✅ Job status updated to failed');
    } catch (updateError) {
      console.error('❌ Failed to update job status to failed:', updateError);
    }
  }
}

// Build search query based on user criteria
function buildSearchQuery(searchCriteria) {
  const parts = [];
  
  if (searchCriteria.title) {
    parts.push(`title:${searchCriteria.title}`);
  }
  
  if (searchCriteria.companyName) {
    parts.push(`company:${searchCriteria.companyName}`);
  }
  
  if (searchCriteria.location || searchCriteria.city || searchCriteria.state || searchCriteria.country) {
    const location = [searchCriteria.city, searchCriteria.state, searchCriteria.country]
      .filter(Boolean)
      .join(', ');
    if (location) {
      parts.push(`location:${location}`);
    }
  }
  
  if (searchCriteria.industry) {
    parts.push(`industry:${searchCriteria.industry}`);
  }
  
  if (searchCriteria.teamSize) {
    parts.push(`team_size:${searchCriteria.teamSize}`);
  }
  
  if (searchCriteria.revenueRange) {
    parts.push(`revenue:${searchCriteria.revenueRange}`);
  }
  
  if (searchCriteria.totalFunding) {
    parts.push(`funding:${searchCriteria.totalFunding}`);
  }
  
  return parts.join(' ');
}

// Search for leads based on criteria
async function searchLeadsByCriteria(searchCriteria, maxResults) {
  try {
    console.log('🔍 Searching leads with criteria:', searchCriteria);
    
    // Build the base query
    let query = supabase
      .from('leads')
      .select('*')
      .limit(maxResults);

    // Apply filters based on search criteria
    if (searchCriteria.title && searchCriteria.title.trim()) {
      query = query.ilike('title', `%${searchCriteria.title.trim()}%`);
    }
    
    if (searchCriteria.companyName && searchCriteria.companyName.trim()) {
      // For company name, search in both company_name and website fields
      query = query.or(`company_name.ilike.%${searchCriteria.companyName.trim()}%,website.ilike.%${searchCriteria.companyName.trim()}%`);
    }
    
    if (searchCriteria.industry && searchCriteria.industry.trim()) {
      query = query.eq('industry', searchCriteria.industry.trim());
    }
    
    if (searchCriteria.teamSize && searchCriteria.teamSize.trim()) {
      query = query.eq('team_size', searchCriteria.teamSize.trim());
    }
    
    if (searchCriteria.revenueRange && searchCriteria.revenueRange.trim()) {
      query = query.eq('revenue_range', searchCriteria.revenueRange.trim());
    }
    
    if (searchCriteria.totalFunding && searchCriteria.totalFunding.trim()) {
      query = query.eq('total_funding', searchCriteria.totalFunding.trim());
    }

    // Location-based filtering - use OR for multiple location fields
    if (searchCriteria.location || searchCriteria.city || searchCriteria.state || searchCriteria.country) {
      const locationConditions = [];
      
      if (searchCriteria.city && searchCriteria.city.trim()) {
        locationConditions.push(`city.ilike.%${searchCriteria.city.trim()}%`);
      }
      if (searchCriteria.state && searchCriteria.state.trim()) {
        locationConditions.push(`state.ilike.%${searchCriteria.state.trim()}%`);
      }
      if (searchCriteria.country && searchCriteria.country.trim()) {
        locationConditions.push(`country.ilike.%${searchCriteria.country.trim()}%`);
      }
      if (searchCriteria.location && searchCriteria.location.trim()) {
        locationConditions.push(`city.ilike.%${searchCriteria.location.trim()}%`);
        locationConditions.push(`state.ilike.%${searchCriteria.location.trim()}%`);
        locationConditions.push(`country.ilike.%${searchCriteria.location.trim()}%`);
      }
      
      if (locationConditions.length > 0) {
        query = query.or(locationConditions.join(','));
      }
    }

    console.log('🔍 Executing query...');
    const { data: leads, error } = await query;

    if (error) {
      console.error('❌ Error searching leads:', error);
      return [];
    }

    console.log(`✅ Search completed. Found ${leads?.length || 0} leads`);
    return leads || [];

  } catch (error) {
    console.error('❌ Error in searchLeadsByCriteria:', error);
    return [];
  }
}

// Enrich leads with additional data
async function enrichLeads(leads, includeEmails) {
  try {
    const enrichedLeads = [];
    
    for (const lead of leads) {
      const enrichedLead = { ...lead };
      
      // Add timestamp
      enrichedLead.timestamp = new Date().toISOString();
      
      // If no email and includeEmails is true, try to find email
      if (includeEmails && !enrichedLead.email) {
        // This would integrate with your email enrichment service
        // For now, we'll add a placeholder
        enrichedLead.email = `contact@${enrichedLead.company_name?.toLowerCase().replace(/\s+/g, '')}.com`;
      }
      
      enrichedLeads.push(enrichedLead);
    }
    
    return enrichedLeads;
    
  } catch (error) {
    console.error('Error enriching leads:', error);
    return leads;
  }
}

// Trigger web scraping pipelines to acquire new data
async function triggerWebScraping(searchCriteria, maxResults) {
  try {
    console.log('🌐 Triggering web scraping pipelines...');
    
    // This would integrate with your existing web scraping services
    // For now, we'll simulate the process and return sample data
    
    const scrapedLeads = [];
    
    // Simulate Google Maps scraping
    if (searchCriteria.location || searchCriteria.city || searchCriteria.state) {
      console.log('📍 Scraping Google Maps for location-based leads...');
      // This would call your Google Maps scraper
      // const googleMapsLeads = await googleMapsScraper.search(searchCriteria);
      // scrapedLeads.push(...googleMapsLeads);
    }
    
    // Simulate business directory scraping
    if (searchCriteria.industry) {
      console.log('🏢 Scraping business directories for industry-based leads...');
      // This would call your business directory scrapers (Yelp, YellowPages, etc.)
      // const directoryLeads = await businessDirectoryScraper.search(searchCriteria);
      // scrapedLeads.push(...directoryLeads);
    }
    
    // Simulate LinkedIn scraping (public data only)
    if (searchCriteria.title || searchCriteria.companyName) {
      console.log('💼 Scraping LinkedIn for professional leads...');
      // This would call your LinkedIn scraper (public profiles only)
      // const linkedinLeads = await linkedinScraper.search(searchCriteria);
      // scrapedLeads.push(...linkedinLeads);
    }
    
    // Simulate website contact page scraping
    if (searchCriteria.companyName) {
      console.log('🌐 Scraping company websites for contact information...');
      // This would call your website scraper
      // const websiteLeads = await websiteScraper.search(searchCriteria);
      // scrapedLeads.push(...websiteLeads);
    }
    
    // For demonstration, return some sample scraped data
    // In production, this would be real data from your scrapers
    const sampleScrapedLeads = [
      {
        company_name: 'TechStartup Inc',
        title: 'CEO',
        industry: 'Technology',
        city: 'San Francisco',
        state: 'CA',
        country: 'United States',
        website: 'techstartup.com',
        phone: '+1-555-0100',
        email: 'ceo@techstartup.com',
        source: 'Google Maps Scraping',
        scraped_at: new Date().toISOString()
      },
      {
        company_name: 'Digital Marketing Pro',
        title: 'Marketing Manager',
        industry: 'Marketing',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        website: 'digitalmarketingpro.com',
        phone: '+1-555-0200',
        email: 'marketing@digitalmarketingpro.com',
        source: 'Business Directory Scraping',
        scraped_at: new Date().toISOString()
      }
    ];
    
    // Filter sample data based on search criteria
    const filteredLeads = sampleScrapedLeads.filter(lead => {
      if (searchCriteria.industry && lead.industry !== searchCriteria.industry) return false;
      if (searchCriteria.city && !lead.city.toLowerCase().includes(searchCriteria.city.toLowerCase())) return false;
      if (searchCriteria.state && lead.state !== searchCriteria.state) return false;
      return true;
    });
    
    console.log(`🌐 Web scraping simulation completed. Generated ${filteredLeads.length} leads`);
    return filteredLeads;
    
  } catch (error) {
    console.error('❌ Error in web scraping:', error);
    return [];
  }
}

// Deduplicate leads based on company name and email
function deduplicateLeads(leads) {
  const seen = new Set();
  const uniqueLeads = [];
  
  for (const lead of leads) {
    const key = `${lead.company_name?.toLowerCase()}-${lead.email?.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLeads.push(lead);
    }
  }
  
  return uniqueLeads;
}

// Store prospecting results
async function storeProspectingResults(jobId, leads) {
  try {
    if (leads.length === 0) return;
    
    // Store leads in the leads table
    const { error: leadsError } = await supabase
      .from('leads')
      .upsert(leads.map(lead => ({
        ...lead,
        prospecting_job_id: jobId,
        source: lead.source || 'prospecting_search'
      })));
    
    if (leadsError) {
      console.error('Error storing leads:', leadsError);
    }
    
  } catch (error) {
    console.error('Error storing prospecting results:', error);
  }
}

// Get prospecting job status
router.get('/jobs/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    
    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const { data: job, error } = await supabase
      .from('prospecting_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        search_criteria: job.search_criteria,
        total_leads: job.total_leads || 0,
        started_at: job.started_at,
        completed_at: job.completed_at,
        error_message: job.error_message
      }
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      details: error.message
    });
  }
});

// Get all prospecting jobs
router.get('/jobs', async (req, res) => {
  try {
    const { data: jobs, error } = await supabase
      .from('prospecting_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      jobs: jobs || []
    });

  } catch (error) {
    console.error('Error getting prospecting jobs:', error);
    res.status(500).json({
      error: 'Failed to get prospecting jobs',
      details: error.message
    });
  }
});

// Get real-time prospecting progress
router.get('/progress/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    // Set headers for Server-Sent Events (SSE)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      job_id: jobId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Function to send progress updates
    const sendProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Monitor job progress
    const checkProgress = async () => {
      try {
        const { data: job, error } = await supabase
          .from('prospecting_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error || !job) {
          sendProgress({
            type: 'error',
            message: 'Job not found',
            timestamp: new Date().toISOString()
          });
          res.end();
          return;
        }

        if (job.status === 'completed') {
          sendProgress({
            type: 'complete',
            job_id: jobId,
            total_leads: job.total_leads || 0,
            results: job.results || [],
            timestamp: new Date().toISOString()
          });
          res.end();
          return;
        }

        if (job.status === 'failed') {
          sendProgress({
            type: 'error',
            job_id: jobId,
            message: job.error_message || 'Job failed',
            timestamp: new Date().toISOString()
          });
          res.end();
          return;
        }

        // Send progress update
        sendProgress({
          type: 'progress',
          job_id: jobId,
          status: job.status,
          progress: job.status === 'processing' ? 50 : 25,
          message: `Job status: ${job.status}`,
          timestamp: new Date().toISOString()
        });

        // Check again in 2 seconds if still processing
        if (job.status === 'processing' || job.status === 'started') {
          setTimeout(checkProgress, 2000);
        }

      } catch (error) {
        console.error('Error checking progress:', error);
        sendProgress({
          type: 'error',
          message: 'Error checking progress',
          timestamp: new Date().toISOString()
        });
        res.end();
      }
    };

    // Start monitoring
    checkProgress();

  } catch (error) {
    console.error('Error streaming prospecting progress:', error);
    res.status(500).end();
  }
});

// Debug endpoint to check prospecting job status
router.get('/debug/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('prospecting_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get leads count
    const { data: leadsCount, error: leadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        search_criteria: job.search_criteria,
        total_leads: job.total_leads || 0,
        started_at: job.started_at,
        completed_at: job.completed_at,
        error_message: job.error_message,
        created_at: job.created_at,
        updated_at: job.updated_at
      },
      database_info: {
        total_leads_in_table: leadsError ? 'Error' : (leadsCount?.length || 0),
        leads_table_error: leadsError?.message || null
      },
      debug_info: {
        current_time: new Date().toISOString(),
        job_age_minutes: job.created_at ? Math.round((new Date() - new Date(job.created_at)) / 60000) : 'Unknown'
      }
    });

  } catch (error) {
    console.error('Error getting debug info:', error);
    res.status(500).json({
      error: 'Failed to get debug info',
      details: error.message
    });
  }
});

module.exports = router;
