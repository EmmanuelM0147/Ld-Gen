const { Pool } = require('pg');
require('dotenv').config();

// Supabase PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    console.log('✅ Database connected successfully:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute a query
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Executed query:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
};

// Get a client for transactions
const getClient = async () => {
  return await pool.connect();
};

// Close the pool
const closePool = async () => {
  await pool.end();
};

// Initialize all database tables
const initializeAllTables = async () => {
  try {
    console.log('🔧 Initializing database schema...');

    // Create business_contacts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_contacts (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company_name VARCHAR(255) NOT NULL,
        job_title VARCHAR(200),
        industry VARCHAR(100),
        company_size VARCHAR(50),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        phone VARCHAR(50),
        website VARCHAR(255),
        linkedin_url VARCHAR(500),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'new',
        tags TEXT[],
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create company_emails table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_emails (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES business_contacts(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL UNIQUE,
        email_type VARCHAR(50) DEFAULT 'business',
        is_primary BOOLEAN DEFAULT FALSE,
        is_validated BOOLEAN DEFAULT FALSE,
        validation_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create lead_enrichment table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_enrichment (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER REFERENCES business_contacts(id) ON DELETE CASCADE,
        domain_authority INTEGER,
        linkedin_presence BOOLEAN DEFAULT FALSE,
        company_revenue VARCHAR(100),
        employee_count INTEGER,
        founded_year INTEGER,
        technologies TEXT[],
        social_media JSONB,
        last_enriched TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_validation table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_validation (
        id SERIAL PRIMARY KEY,
        email_id INTEGER REFERENCES company_emails(id) ON DELETE CASCADE,
        validation_method VARCHAR(50),
        is_valid BOOLEAN,
        mx_record_exists BOOLEAN,
        smtp_response VARCHAR(255),
        validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT
      )
    `);

    // Create lead_quality_scores table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_quality_scores (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER REFERENCES business_contacts(id) ON DELETE CASCADE,
        overall_score DECIMAL(3,2),
        email_quality_score DECIMAL(3,2),
        company_info_score DECIMAL(3,2),
        linkedin_score DECIMAL(3,2),
        domain_authority_score DECIMAL(3,2),
        last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create spam_detection table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spam_detection (
        id SERIAL PRIMARY KEY,
        email_id INTEGER REFERENCES company_emails(id) ON DELETE CASCADE,
        spam_score DECIMAL(3,2),
        spam_indicators TEXT[],
        is_spam BOOLEAN DEFAULT FALSE,
        detection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create SMTP credentials table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS smtp_credentials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider VARCHAR(100) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        encryption VARCHAR(50) DEFAULT 'tls',
        daily_limit INTEGER DEFAULT 200,
        daily_sent INTEGER DEFAULT 0,
        last_reset_date DATE DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email campaigns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
        subject VARCHAR(500),
        body TEXT,
        target_filters JSONB DEFAULT '{}',
        total_recipients INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        clicked_count INTEGER DEFAULT 0,
        replied_count INTEGER DEFAULT 0,
        bounced_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create campaign recipients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
        lead_id INTEGER REFERENCES business_contacts(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        replied_at TIMESTAMP,
        bounced_at TIMESTAMP,
        bounce_reason TEXT,
        tracking_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_tracking (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER REFERENCES campaign_recipients(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email sending queue table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
        recipient_id INTEGER REFERENCES campaign_recipients(id) ON DELETE CASCADE,
        smtp_credential_id INTEGER REFERENCES smtp_credentials(id) ON DELETE SET NULL,
        priority INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        error_message TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ All database tables initialized successfully');
    console.log('📊 Tables created:');
    console.log('   - business_contacts (leads)');
    console.log('   - company_emails (email addresses)');
    console.log('   - lead_enrichment (additional data)');
    console.log('   - email_validation (email verification)');
    console.log('   - lead_quality_scores (lead scoring)');
    console.log('   - spam_detection (spam filtering)');
    console.log('   - smtp_credentials (email sending)');
    console.log('   - email_templates (email templates)');
    console.log('   - email_campaigns (email campaigns)');
    console.log('   - campaign_recipients (campaign targets)');
    console.log('   - email_tracking (open/click tracking)');
    console.log('   - email_queue (sending queue)');

  } catch (error) {
    console.error('❌ Error initializing database tables:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
const initializeEmailMarketingTables = async () => {
  console.log('⚠️  This function is deprecated. Use initializeAllTables() instead.');
  return await initializeAllTables();
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
  initializeAllTables,
  initializeEmailMarketingTables
};
