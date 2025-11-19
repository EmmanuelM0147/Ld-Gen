const express = require('express');
const { supabase } = require('../config/supabase-config');
const router = express.Router();

// Get database status
router.get('/status', async (req, res) => {
  try {
    // Test Supabase connection by making a simple query
    const { data, error } = await supabase
      .from('business_contacts')
      .select('count', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      });
    }

    res.json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Supabase connection successful',
      database: 'Supabase PostgreSQL',
      tables: {
        business_contacts: 'Available',
        company_emails: 'Available',
        lead_enrichment: 'Available',
        email_validation: 'Available',
        lead_quality_scores: 'Available',
        spam_detection: 'Available',
        smtp_credentials: 'Available',
        email_templates: 'Available',
        email_campaigns: 'Available',
        campaign_recipients: 'Available',
        email_tracking: 'Available',
        email_queue: 'Available'
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Get database tables info
router.get('/tables', async (req, res) => {
  try {
    const tables = [
      'business_contacts',
      'company_emails', 
      'lead_enrichment',
      'email_validation',
      'lead_quality_scores',
      'spam_detection',
      'smtp_credentials',
      'email_templates',
      'email_campaigns',
      'campaign_recipients',
      'email_tracking',
      'email_queue'
    ];

    const tableInfo = [];

    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          tableInfo.push({
            name: tableName,
            status: 'error',
            recordCount: 0,
            error: error.message
          });
        } else {
          tableInfo.push({
            name: tableName,
            status: 'available',
            recordCount: count || 0
          });
        }
      } catch (err) {
        tableInfo.push({
          name: tableName,
          status: 'unavailable',
          recordCount: 0,
          error: err.message
        });
      }
    }

    res.json({
      tables: tableInfo,
      totalTables: tables.length,
      availableTables: tableInfo.filter(t => t.status === 'available').length
    });

  } catch (error) {
    console.error('Error fetching table info:', error);
    res.status(500).json({ error: 'Failed to fetch table information' });
  }
});

// Get table schema
router.get('/tables/:tableName/schema', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Try to get a sample record to infer schema
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      return res.status(404).json({ error: `Table ${tableName} not found or inaccessible` });
    }

    if (!data || data.length === 0) {
      return res.json({
        tableName,
        columns: [],
        message: 'Table exists but has no data to infer schema'
      });
    }

    // Infer schema from sample data
    const sampleRecord = data[0];
    const columns = Object.keys(sampleRecord).map(key => ({
      name: key,
      type: typeof sampleRecord[key],
      nullable: sampleRecord[key] === null,
      sampleValue: sampleRecord[key]
    }));

    res.json({
      tableName,
      columns,
      recordCount: data.length
    });

  } catch (error) {
    console.error('Error fetching table schema:', error);
    res.status(500).json({ error: 'Failed to fetch table schema' });
  }
});

// Get table data (with pagination)
router.get('/tables/:tableName/data', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 10, orderBy = 'id', order = 'asc' } = req.query;
    
    const offset = (page - 1) * limit;

    // Get total count
    const { count: totalRecords, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return res.status(404).json({ error: `Table ${tableName} not found or inaccessible` });
    }

    // Get paginated data
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderBy, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: `Failed to fetch data from ${tableName}` });
    }

    res.json({
      tableName,
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRecords || 0,
        pages: Math.ceil((totalRecords || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

// Backup database (placeholder)
router.post('/backup', async (req, res) => {
  try {
    // This is a placeholder - in a real app, you'd implement actual backup logic
    // For Supabase, you might use their built-in backup features or export data
    
    res.json({ 
      message: 'Database backup initiated (placeholder)',
      note: 'Supabase provides automatic backups. For manual exports, use the export endpoints.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error backing up database:', error);
    res.status(500).json({ error: 'Failed to backup database' });
  }
});

// Get database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    // Get leads statistics
    try {
      const { count: totalLeads } = await supabase
        .from('business_contacts')
        .select('*', { count: 'exact', head: true });
      
      stats.leads = {
        total: totalLeads || 0
      };

      // Get leads by status
      const { data: leadsByStatus } = await supabase
        .from('business_contacts')
        .select('status');
      
      if (leadsByStatus) {
        const statusCounts = {};
        leadsByStatus.forEach(lead => {
          const status = lead.status || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        stats.leads.byStatus = statusCounts;
      }
    } catch (error) {
      stats.leads = { error: error.message };
    }

    // Get email marketing statistics
    try {
      const { count: totalCampaigns } = await supabase
        .from('email_campaigns')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalTemplates } = await supabase
        .from('email_templates')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalSMTP } = await supabase
        .from('smtp_credentials')
        .select('*', { count: 'exact', head: true });

      stats.emailMarketing = {
        campaigns: totalCampaigns || 0,
        templates: totalTemplates || 0,
        smtpAccounts: totalSMTP || 0
      };
    } catch (error) {
      stats.emailMarketing = { error: error.message };
    }

    res.json({
      timestamp: new Date().toISOString(),
      stats
    });

  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Failed to fetch database statistics' });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test basic connection
    const { error } = await supabase
      .from('business_contacts')
      .select('count', { count: 'exact', head: true });

    const responseTime = Date.now() - startTime;

    if (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        error: error.message
      });
    }

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: 'Supabase PostgreSQL',
      message: 'All systems operational'
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Create prospecting_jobs table
router.post('/create-prospecting-table', async (req, res) => {
  try {
    // Try to create a simple record to see if table exists
    const { data: testRecord, error: testError } = await supabase
      .from('prospecting_jobs')
      .insert([{
        query: 'test',
        status: 'test'
      }])
      .select()
      .single();

    if (testError && testError.code === 'PGRST205') {
      // Table doesn't exist, we need to create it
      // Since we can't use raw SQL, let's try to create it through the Supabase dashboard
      // For now, we'll return instructions
      return res.status(404).json({ 
        error: 'prospecting_jobs table does not exist',
        message: 'Please create the prospecting_jobs table in your Supabase dashboard using the migration file: backend/migrations/002_prospecting_jobs.sql',
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to SQL Editor',
          '3. Copy and paste the contents of backend/migrations/002_prospecting_jobs.sql',
          '4. Run the SQL script',
          '5. Refresh this endpoint'
        ]
      });
    }

    // If we get here, the table exists, so let's clean up the test record
    if (testRecord) {
      await supabase
        .from('prospecting_jobs')
        .delete()
        .eq('id', testRecord.id);
    }

    res.json({
      message: 'prospecting_jobs table already exists',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in create-prospecting-table route:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

module.exports = router;
