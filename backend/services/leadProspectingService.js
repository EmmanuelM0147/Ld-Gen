const ScrapingEngine = require('./scrapingEngine');
const EmailEnrichment = require('./emailEnrichment');
const { Pool } = require('pg');

class LeadProspectingService {
  constructor() {
    this.scrapingEngine = new ScrapingEngine();
    this.emailEnrichment = new EmailEnrichment();
    this.db = null;
    this.isInitialized = false;
  }

  async initialize(dbConfig) {
    if (this.isInitialized) return;
    
    try {
      // Initialize database connection
      this.db = new Pool(dbConfig);
      
      // Test database connection
      await this.db.query('SELECT NOW()');
      console.log('✅ Database connection established');
      
      // Initialize scraping engine
      await this.scrapingEngine.initialize();
      
      this.isInitialized = true;
      console.log('✅ Lead Prospecting Service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Lead Prospecting Service:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.scrapingEngine) {
        await this.scrapingEngine.close();
      }
      
      if (this.db) {
        await this.db.end();
      }
      
      this.isInitialized = false;
      console.log('✅ Lead Prospecting Service closed');
      
    } catch (error) {
      console.error('❌ Error closing service:', error);
    }
  }

  // Start a new prospecting job
  async startProspecting(searchCriteria) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      // Create prospecting job record
      const jobId = await this.createProspectingJob(searchCriteria);
      
      // Add to scraping queue
      const scrapingJobId = await this.scrapingEngine.addToScrapingQueue(searchCriteria);
      
      // Update job with scraping ID
      await this.updateProspectingJob(jobId, { 
        scraping_job_id: scrapingJobId,
        status: 'scraping'
      });

      // Start background processing
      this.processProspectingJob(jobId, searchCriteria);
      
      return {
        job_id: jobId,
        status: 'started',
        message: 'Lead prospecting started successfully'
      };
      
    } catch (error) {
      console.error('❌ Failed to start prospecting:', error);
      throw error;
    }
  }

  // Process prospecting job in background
  async processProspectingJob(jobId, searchCriteria) {
    try {
      console.log(`🚀 Processing prospecting job ${jobId}...`);
      
      // Update job status
      await this.updateProspectingJob(jobId, { 
        status: 'processing',
        started_at: new Date().toISOString()
      });

      // Step 1: Scrape leads
      console.log('🔍 Step 1: Scraping leads...');
      await this.updateProspectingJob(jobId, { 
        current_step: 'scraping',
        progress: 25
      });
      
      const scrapedLeads = await this.scrapingEngine.scrapeLeads(searchCriteria);
      
      // Step 2: Enrich with emails
      console.log('📧 Step 2: Enriching with emails...');
      await this.updateProspectingJob(jobId, { 
        current_step: 'email_enrichment',
        progress: 50
      });
      
      const enrichedLeads = await this.emailEnrichment.enrichLeadsWithEmails(scrapedLeads);
      
      // Step 3: Store leads in database
      console.log('💾 Step 3: Storing leads...');
      await this.updateProspectingJob(jobId, { 
        current_step: 'storing',
        progress: 75
      });
      
      const storedLeads = await this.storeLeads(enrichedLeads, jobId);
      
      // Step 4: Generate statistics
      console.log('📊 Step 4: Generating statistics...');
      await this.updateProspectingJob(jobId, { 
        current_step: 'finalizing',
        progress: 90
      });
      
      const stats = await this.generateJobStatistics(jobId);
      
      // Complete job
      await this.updateProspectingJob(jobId, { 
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: 100,
        current_step: 'completed',
        total_leads: storedLeads.length,
        statistics: stats
      });

      console.log(`✅ Prospecting job ${jobId} completed successfully with ${storedLeads.length} leads`);
      
    } catch (error) {
      console.error(`❌ Prospecting job ${jobId} failed:`, error);
      
      await this.updateProspectingJob(jobId, { 
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: error.message
      });
    }
  }

  // Create prospecting job record
  async createProspectingJob(searchCriteria) {
    try {
      const query = `
        INSERT INTO prospecting_jobs (
          search_criteria, status, created_at, progress, current_step
        ) VALUES ($1, $2, $3, $4, $5) RETURNING id
      `;
      
      const values = [
        JSON.stringify(searchCriteria),
        'pending',
        new Date().toISOString(),
        0,
        'initializing'
      ];
      
      const result = await this.db.query(query, values);
      return result.rows[0].id;
      
    } catch (error) {
      console.error('❌ Failed to create prospecting job:', error);
      throw error;
    }
  }

  // Update prospecting job
  async updateProspectingJob(jobId, updates) {
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE prospecting_jobs 
        SET ${setClause}, updated_at = $1
        WHERE id = $${Object.keys(updates).length + 2}
      `;
      
      const values = [
        new Date().toISOString(),
        ...Object.values(updates),
        jobId
      ];
      
      await this.db.query(query, values);
      
    } catch (error) {
      console.error('❌ Failed to update prospecting job:', error);
      throw error;
    }
  }

  // Store leads in database
  async storeLeads(leads, jobId) {
    try {
      const storedLeads = [];
      
      for (const lead of leads) {
        try {
          // Insert lead
          const leadQuery = `
            INSERT INTO leads (
              company_name, industry, website, phone, address, city,
              company_size, source, quality_score, email_patterns,
              domain, scraped_at, prospecting_job_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
          `;
          
          const leadValues = [
            lead.company_name,
            lead.industry || null,
            lead.website || null,
            lead.phone || null,
            lead.address || null,
            lead.city || null,
            lead.company_size || null,
            lead.source || 'Lead Prospecting',
            lead.quality_score || 0,
            JSON.stringify(lead.email_patterns || []),
            lead.domain || null,
            lead.scraped_at || new Date().toISOString(),
            jobId
          ];
          
          const leadResult = await this.db.query(leadQuery, leadValues);
          const leadId = leadResult.rows[0].id;
          
          // Store emails if available
          if (lead.emails && lead.emails.length > 0) {
            for (const emailData of lead.emails) {
              const emailQuery = `
                INSERT INTO lead_emails (
                  lead_id, email, pattern, confidence, is_valid_format,
                  overall_score, domain_info, verified_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `;
              
              const emailValues = [
                leadId,
                emailData.email,
                emailData.pattern,
                emailData.confidence || 0,
                emailData.is_valid_format || false,
                emailData.overall_score || 0,
                JSON.stringify(emailData.domain_info || {}),
                emailData.verified_at || new Date().toISOString()
              ];
              
              await this.db.query(emailQuery, emailValues);
            }
          }
          
          storedLeads.push({
            id: leadId,
            ...lead
          });
          
        } catch (error) {
          console.error('❌ Failed to store lead:', error);
          // Continue with next lead
        }
      }
      
      return storedLeads;
      
    } catch (error) {
      console.error('❌ Failed to store leads:', error);
      throw error;
    }
  }

  // Generate job statistics
  async generateJobStatistics(jobId) {
    try {
      // Get lead count
      const leadCountQuery = `
        SELECT COUNT(*) as total_leads
        FROM leads 
        WHERE prospecting_job_id = $1
      `;
      
      const leadCountResult = await this.db.query(leadCountQuery, [jobId]);
      const totalLeads = parseInt(leadCountResult.rows[0].total_leads);
      
      // Get email statistics
      const emailStatsQuery = `
        SELECT 
          COUNT(*) as total_emails,
          COUNT(CASE WHEN is_valid_format = true THEN 1 END) as valid_emails,
          COUNT(CASE WHEN overall_score >= 80 THEN 1 END) as high_confidence_emails,
          AVG(overall_score) as average_score
        FROM lead_emails le
        JOIN leads l ON le.lead_id = l.id
        WHERE l.prospecting_job_id = $1
      `;
      
      const emailStatsResult = await this.db.query(emailStatsQuery, [jobId]);
      const emailStats = emailStatsResult.rows[0];
      
      // Get quality distribution
      const qualityQuery = `
        SELECT 
          quality_score,
          COUNT(*) as count
        FROM leads 
        WHERE prospecting_job_id = $1
        GROUP BY quality_score
        ORDER BY quality_score DESC
      `;
      
      const qualityResult = await this.db.query(qualityQuery, [jobId]);
      
      const stats = {
        total_leads: totalLeads,
        total_emails: parseInt(emailStats.total_emails || 0),
        valid_emails: parseInt(emailStats.valid_emails || 0),
        high_confidence_emails: parseInt(emailStats.high_confidence_emails || 0),
        average_email_score: Math.round(parseFloat(emailStats.average_score || 0)),
        quality_distribution: qualityResult.rows,
        generated_at: new Date().toISOString()
      };
      
      return stats;
      
    } catch (error) {
      console.error('❌ Failed to generate statistics:', error);
      return {};
    }
  }

  // Get prospecting job status
  async getJobStatus(jobId) {
    try {
      const query = `
        SELECT * FROM prospecting_jobs WHERE id = $1
      `;
      
      const result = await this.db.query(query, [jobId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Failed to get job status:', error);
      throw error;
    }
  }

  // Get all prospecting jobs
  async getAllJobs(filters = {}, page = 1, limit = 10) {
    try {
      let whereClause = 'WHERE 1=1';
      const values = [];
      let valueIndex = 1;
      
      if (filters.status) {
        whereClause += ` AND status = $${valueIndex++}`;
        values.push(filters.status);
      }
      
      if (filters.date_from) {
        whereClause += ` AND created_at >= $${valueIndex++}`;
        values.push(filters.date_from);
      }
      
      if (filters.date_to) {
        whereClause += ` AND created_at <= $${valueIndex++}`;
        values.push(filters.date_to);
      }
      
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT 
          id, search_criteria, status, progress, current_step,
          total_leads, statistics, created_at, started_at, completed_at,
          error
        FROM prospecting_jobs 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${valueIndex++} OFFSET $${valueIndex++}
      `;
      
      values.push(limit, offset);
      
      const result = await this.db.query(query, values);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM prospecting_jobs 
        ${whereClause}
      `;
      
      const countResult = await this.db.query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      
      return {
        jobs: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get jobs:', error);
      throw error;
    }
  }

  // Cancel prospecting job
  async cancelJob(jobId) {
    try {
      // Update job status
      await this.updateProspectingJob(jobId, { 
        status: 'cancelled',
        completed_at: new Date().toISOString()
      });
      
      // Remove from scraping queue if still pending
      const job = await this.getJobStatus(jobId);
      if (job && job.scraping_job_id) {
        // Note: In a real implementation, you'd want to cancel the actual scraping
        console.log(`Job ${jobId} cancelled`);
      }
      
      return {
        job_id: jobId,
        status: 'cancelled',
        message: 'Job cancelled successfully'
      };
      
    } catch (error) {
      console.error('❌ Failed to cancel job:', error);
      throw error;
    }
  }

  // Get prospecting statistics
  async getProspectingStats(timeRange = '30d') {
    try {
      let dateFilter = '';
      const values = [];
      
      switch (timeRange) {
        case '7d':
          dateFilter = 'AND created_at >= NOW() - INTERVAL \'7 days\'';
          break;
        case '30d':
          dateFilter = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
          break;
        case '90d':
          dateFilter = 'AND created_at >= NOW() - INTERVAL \'90 days\'';
          break;
        case '1y':
          dateFilter = 'AND created_at >= NOW() - INTERVAL \'1 year\'';
          break;
        default:
          dateFilter = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
      }
      
      const statsQuery = `
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as active_jobs,
          AVG(CASE WHEN status = 'completed' THEN total_leads END) as avg_leads_per_job,
          SUM(CASE WHEN status = 'completed' THEN total_leads END) as total_leads_generated
        FROM prospecting_jobs 
        WHERE 1=1 ${dateFilter}
      `;
      
      const statsResult = await this.db.query(statsQuery, values);
      const stats = statsResult.rows[0];
      
      // Get recent activity
      const recentQuery = `
        SELECT 
          id, status, total_leads, created_at, completed_at
        FROM prospecting_jobs 
        WHERE 1=1 ${dateFilter}
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      const recentResult = await this.db.query(recentQuery, values);
      
      return {
        overview: {
          total_jobs: parseInt(stats.total_jobs || 0),
          completed_jobs: parseInt(stats.completed_jobs || 0),
          failed_jobs: parseInt(stats.failed_jobs || 0),
          active_jobs: parseInt(stats.active_jobs || 0),
          success_rate: stats.total_jobs > 0 ? 
            Math.round((stats.completed_jobs / stats.total_jobs) * 100) : 0,
          avg_leads_per_job: Math.round(parseFloat(stats.avg_leads_per_job || 0)),
          total_leads_generated: parseInt(stats.total_leads_generated || 0)
        },
        recent_activity: recentResult.rows,
        time_range: timeRange,
        generated_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get prospecting stats:', error);
      throw error;
    }
  }
}

module.exports = LeadProspectingService;
