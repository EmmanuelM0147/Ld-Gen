const axios = require('axios');
const { supabase } = require('../config/supabase-config');

class B2BContactDatabaseService {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.dataProviders = {
      company: ['clearbit', 'crunchbase', 'linkedin', 'apollo', 'zoominfo'],
      contact: ['apollo', 'zoominfo', 'rocketreach', 'hunter', 'clearbit'],
      email: ['hunter', 'clearbit', 'apollo', 'zoominfo'],
      phone: ['apollo', 'zoominfo', 'clearbit']
    };
  }

  async initialize() {
    try {
      // Initialize Supabase client
      this.db = supabase;
      
      // Test database connection
      const { data, error } = await this.db.from('b2b_companies').select('count').limit(1);
      if (error) {
        console.log('Tables may not exist yet, will create them...');
      }
      
      // Create B2B contact database tables
      await this.createB2BContactTables();
      
      this.isInitialized = true;
      console.log('✅ B2B Contact Database Service initialized successfully with Supabase');
    } catch (error) {
      console.error('❌ Failed to initialize B2B Contact Database Service:', error);
      throw error;
    }
  }

  async createB2BContactTables() {
    const createCompaniesTable = `
      CREATE TABLE IF NOT EXISTS b2b_companies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE,
        industry VARCHAR(100),
        sub_industry VARCHAR(100),
        company_size VARCHAR(50),
        revenue_range VARCHAR(100),
        founded_year INTEGER,
        headquarters VARCHAR(500),
        linkedin_url VARCHAR(500),
        website VARCHAR(500),
        description TEXT,
        technologies JSONB,
        social_profiles JSONB,
        funding_info JSONB,
        employee_count INTEGER,
        annual_revenue DECIMAL(15,2),
        growth_stage VARCHAR(50),
        company_type VARCHAR(50),
        keywords JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_sources JSONB,
        confidence_score DECIMAL(3,2) DEFAULT 0.00
      )
    `;

    const createContactsTable = `
      CREATE TABLE IF NOT EXISTS b2b_contacts (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES b2b_companies(id),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        full_name VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(50),
        job_title VARCHAR(200),
        department VARCHAR(100),
        seniority_level VARCHAR(50),
        linkedin_url VARCHAR(500),
        twitter_url VARCHAR(500),
        location VARCHAR(200),
        timezone VARCHAR(50),
        email_verified BOOLEAN DEFAULT false,
        phone_verified BOOLEAN DEFAULT false,
        contact_score DECIMAL(3,2) DEFAULT 0.00,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_sources JSONB,
        verification_status VARCHAR(20) DEFAULT 'pending'
      )
    `;

    const createCompanyTechnologiesTable = `
      CREATE TABLE IF NOT EXISTS company_technologies (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES b2b_companies(id),
        technology_name VARCHAR(200),
        technology_category VARCHAR(100),
        technology_type VARCHAR(100),
        confidence_score DECIMAL(3,2) DEFAULT 0.00,
        first_seen DATE,
        last_seen DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createCompanyFundingTable = `
      CREATE TABLE IF NOT EXISTS company_funding (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES b2b_companies(id),
        funding_round VARCHAR(100),
        funding_amount DECIMAL(15,2),
        funding_currency VARCHAR(10) DEFAULT 'USD',
        funding_date DATE,
        investors JSONB,
        valuation DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createDataEnrichmentLogTable = `
      CREATE TABLE IF NOT EXISTS data_enrichment_log (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(20) NOT NULL, -- company, contact
        entity_id INTEGER NOT NULL,
        enrichment_type VARCHAR(50) NOT NULL, -- company_data, contact_data, technology, funding
        provider VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
        data_retrieved JSONB,
        error_message TEXT,
        enrichment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createSearchIndexTable = `
      CREATE TABLE IF NOT EXISTS search_index (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(20) NOT NULL, -- company, contact
        entity_id INTEGER NOT NULL,
        search_text TEXT,
        search_vector tsvector,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.db.query(createCompaniesTable);
      await this.db.query(createContactsTable);
      await this.db.query(createCompanyTechnologiesTable);
      await this.db.query(createCompanyFundingTable);
      await this.db.query(createDataEnrichmentLogTable);
      await this.db.query(createSearchIndexTable);
      
      // Create indexes for better performance
      await this.createSearchIndexes();
      
      console.log('✅ B2B contact database tables created successfully');
    } catch (error) {
      console.error('❌ Error creating B2B contact database tables:', error);
      throw error;
    }
  }

  async createSearchIndexes() {
    try {
      // Create GIN index for full-text search
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_search_vector 
        ON search_index USING GIN (search_vector)
      `);
      
      // Create indexes for common queries
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_industry 
        ON b2b_companies (industry)
      `);
      
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_size 
        ON b2b_companies (company_size)
      `);
      
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_location 
        ON b2b_companies (headquarters)
      `);
      
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_contacts_job_title 
        ON b2b_contacts (job_title)
      `);
      
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_contacts_department 
        ON b2b_contacts (department)
      `);
      
      console.log('✅ Search indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating search indexes:', error);
    }
  }

  // Company Data Management
  async addCompany(companyData) {
    try {
      const query = `
        INSERT INTO b2b_companies 
        (company_name, domain, industry, sub_industry, company_size, revenue_range,
         founded_year, headquarters, linkedin_url, website, description, technologies,
         social_profiles, funding_info, employee_count, annual_revenue, growth_stage,
         company_type, keywords, data_sources, confidence_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (domain) 
        DO UPDATE SET
          company_name = EXCLUDED.company_name,
          industry = COALESCE(EXCLUDED.industry, b2b_companies.industry),
          sub_industry = COALESCE(EXCLUDED.sub_industry, b2b_companies.sub_industry),
          company_size = COALESCE(EXCLUDED.company_size, b2b_companies.company_size),
          revenue_range = COALESCE(EXCLUDED.revenue_range, b2b_companies.revenue_range),
          founded_year = COALESCE(EXCLUDED.founded_year, b2b_companies.founded_year),
          headquarters = COALESCE(EXCLUDED.headquarters, b2b_companies.headquarters),
          linkedin_url = COALESCE(EXCLUDED.linkedin_url, b2b_companies.linkedin_url),
          website = COALESCE(EXCLUDED.website, b2b_companies.website),
          description = COALESCE(EXCLUDED.description, b2b_companies.description),
          technologies = COALESCE(EXCLUDED.technologies, b2b_companies.technologies),
          social_profiles = COALESCE(EXCLUDED.social_profiles, b2b_companies.social_profiles),
          funding_info = COALESCE(EXCLUDED.funding_info, b2b_companies.funding_info),
          employee_count = COALESCE(EXCLUDED.employee_count, b2b_companies.employee_count),
          annual_revenue = COALESCE(EXCLUDED.annual_revenue, b2b_companies.annual_revenue),
          growth_stage = COALESCE(EXCLUDED.growth_stage, b2b_companies.growth_stage),
          company_type = COALESCE(EXCLUDED.company_type, b2b_companies.company_type),
          keywords = COALESCE(EXCLUDED.keywords, b2b_companies.keywords),
          data_sources = COALESCE(EXCLUDED.data_sources, b2b_companies.data_sources),
          confidence_score = EXCLUDED.confidence_score,
          last_updated = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        companyData.company_name,
        companyData.domain,
        companyData.industry,
        companyData.sub_industry,
        companyData.company_size,
        companyData.revenue_range,
        companyData.founded_year,
        companyData.headquarters,
        companyData.linkedin_url,
        companyData.website,
        companyData.description,
        JSON.stringify(companyData.technologies || []),
        JSON.stringify(companyData.social_profiles || {}),
        JSON.stringify(companyData.funding_info || {}),
        companyData.employee_count,
        companyData.annual_revenue,
        companyData.growth_stage,
        companyData.company_type,
        JSON.stringify(companyData.keywords || []),
        JSON.stringify(companyData.data_sources || []),
        companyData.confidence_score || 0.8
      ]);
      
      // Update search index
      await this.updateSearchIndex('company', result.rows[0].id, companyData.company_name);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error adding company:', error);
      throw error;
    }
  }

  async addContact(contactData) {
    try {
      const query = `
        INSERT INTO b2b_contacts 
        (company_id, first_name, last_name, full_name, email, phone, job_title,
         department, seniority_level, linkedin_url, twitter_url, location, timezone,
         email_verified, phone_verified, contact_score, data_sources, verification_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        contactData.company_id,
        contactData.first_name,
        contactData.last_name,
        contactData.full_name,
        contactData.email,
        contactData.phone,
        contactData.job_title,
        contactData.department,
        contactData.seniority_level,
        contactData.linkedin_url,
        contactData.twitter_url,
        contactData.location,
        contactData.timezone,
        contactData.email_verified || false,
        contactData.phone_verified || false,
        contactData.contact_score || 0.7,
        JSON.stringify(contactData.data_sources || []),
        contactData.verification_status || 'pending'
      ]);
      
      // Update search index
      const searchText = `${contactData.first_name} ${contactData.last_name} ${contactData.job_title} ${contactData.department}`;
      await this.updateSearchIndex('contact', result.rows[0].id, searchText);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  // Advanced Search and Discovery
  async searchCompanies(searchCriteria) {
    try {
      let query = `
        SELECT c.*, 
               COUNT(cont.id) as contact_count,
               AVG(cont.contact_score) as avg_contact_score
        FROM b2b_companies c
        LEFT JOIN b2b_contacts cont ON c.id = cont.company_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (searchCriteria.query) {
        query += ` AND (
          c.company_name ILIKE $${paramIndex} OR 
          c.description ILIKE $${paramIndex} OR
          c.industry ILIKE $${paramIndex} OR
          c.keywords::text ILIKE $${paramIndex}
        )`;
        params.push(`%${searchCriteria.query}%`);
        paramIndex++;
      }

      if (searchCriteria.industry) {
        query += ` AND c.industry = $${paramIndex}`;
        params.push(searchCriteria.industry);
        paramIndex++;
      }

      if (searchCriteria.company_size) {
        query += ` AND c.company_size = $${paramIndex}`;
        params.push(searchCriteria.company_size);
        paramIndex++;
      }

      if (searchCriteria.location) {
        query += ` AND c.headquarters ILIKE $${paramIndex}`;
        params.push(`%${searchCriteria.location}%`);
        paramIndex++;
      }

      if (searchCriteria.technologies) {
        query += ` AND c.technologies::text ILIKE $${paramIndex}`;
        params.push(`%${searchCriteria.technologies}%`);
        paramIndex++;
      }

      if (searchCriteria.funding_stage) {
        query += ` AND c.funding_info::text ILIKE $${paramIndex}`;
        params.push(`%${searchCriteria.funding_stage}%`);
        paramIndex++;
      }

      query += `
        GROUP BY c.id
        ORDER BY c.confidence_score DESC, c.last_updated DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}
      `;
      
      const limit = searchCriteria.limit || 50;
      const offset = searchCriteria.offset || 0;
      params.push(limit, offset);

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error searching companies:', error);
      throw error;
    }
  }

  async searchContacts(searchCriteria) {
    try {
      let query = `
        SELECT cont.*, c.company_name, c.industry, c.company_size
        FROM b2b_contacts cont
        JOIN b2b_companies c ON cont.company_id = c.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (searchCriteria.query) {
        query += ` AND (
          cont.first_name ILIKE $${paramIndex} OR 
          cont.last_name ILIKE $${paramIndex} OR
          cont.full_name ILIKE $${paramIndex} OR
          cont.job_title ILIKE $${paramIndex} OR
          cont.department ILIKE $${paramIndex}
        )`;
        params.push(`%${searchCriteria.query}%`);
        paramIndex++;
      }

      if (searchCriteria.job_title) {
        query += ` AND cont.job_title ILIKE $${paramIndex}`;
        params.push(`%${searchCriteria.job_title}%`);
        paramIndex++;
      }

      if (searchCriteria.department) {
        query += ` AND cont.department = $${paramIndex}`;
        params.push(searchCriteria.department);
        paramIndex++;
      }

      if (searchCriteria.seniority_level) {
        query += ` AND cont.seniority_level = $${paramIndex}`;
        params.push(searchCriteria.seniority_level);
        paramIndex++;
      }

      if (searchCriteria.company_industry) {
        query += ` AND c.industry = $${paramIndex}`;
        params.push(searchCriteria.company_industry);
        paramIndex++;
      }

      if (searchCriteria.company_size) {
        query += ` AND c.company_size = $${paramIndex}`;
        params.push(searchCriteria.company_size);
        paramIndex++;
      }

      if (searchCriteria.location) {
        query += ` AND cont.location ILIKE $${paramIndex}`;
        params.push(`%${searchCriteria.location}%`);
        paramIndex++;
      }

      query += `
        ORDER BY cont.contact_score DESC, cont.last_updated DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}
      `;
      
      const limit = searchCriteria.limit || 50;
      const offset = searchCriteria.offset || 0;
      params.push(limit, offset);

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  // Data Enrichment
  async enrichCompanyData(companyName, domain = null) {
    try {
      // Check if we have recent enrichment data
      const existingCompany = await this.getCompanyByName(companyName);
      if (existingCompany && this.isEnrichmentRecent(existingCompany.last_updated)) {
        return existingCompany;
      }

      // Enrich with multiple providers
      const enrichmentResults = await Promise.allSettled([
        this.enrichWithApollo(companyName, domain),
        this.enrichWithZoomInfo(companyName, domain),
        this.enrichWithClearbit(companyName, domain),
        this.enrichWithCrunchbase(companyName)
      ]);

      // Aggregate and store results
      const aggregatedData = this.aggregateCompanyEnrichment(enrichmentResults);
      
      if (aggregatedData.status === 'success') {
        const company = await this.addCompany(aggregatedData.data);
        
        // Log enrichment activity
        await this.logEnrichmentActivity('company', company.id, 'company_data', 'success', aggregatedData);
        
        return company;
      } else {
        throw new Error('Failed to enrich company data');
      }
    } catch (error) {
      console.error('Error enriching company data:', error);
      throw error;
    }
  }

  async enrichContactData(email, companyName = null) {
    try {
      // Check if we have recent enrichment data
      const existingContact = await this.getContactByEmail(email);
      if (existingContact && this.isEnrichmentRecent(existingContact.last_updated)) {
        return existingContact;
      }

      // Enrich with multiple providers
      const enrichmentResults = await Promise.allSettled([
        this.enrichWithApollo(email, companyName),
        this.enrichWithZoomInfo(email, companyName),
        this.enrichWithClearbit(email, companyName),
        this.enrichWithHunter(email)
      ]);

      // Aggregate and store results
      const aggregatedData = this.aggregateContactEnrichment(enrichmentResults);
      
      if (aggregatedData.status === 'success') {
        // Ensure company exists
        let company = await this.getCompanyByName(aggregatedData.data.company_name);
        if (!company) {
          company = await this.addCompany({
            company_name: aggregatedData.data.company_name,
            domain: aggregatedData.data.domain,
            confidence_score: 0.7
          });
        }

        // Add contact
        const contact = await this.addContact({
          ...aggregatedData.data,
          company_id: company.id
        });
        
        // Log enrichment activity
        await this.logEnrichmentActivity('contact', contact.id, 'contact_data', 'success', aggregatedData);
        
        return contact;
      } else {
        throw new Error('Failed to enrich contact data');
      }
    } catch (error) {
      console.error('Error enriching contact data:', error);
      throw error;
    }
  }

  // Provider-specific enrichment methods
  async enrichWithApollo(query, companyName = null) {
    try {
      const apiKey = process.env.APOLLO_API_KEY;
      if (!apiKey) {
        throw new Error('Apollo API key not configured');
      }

      // Apollo API integration logic
      // This would make actual API calls to Apollo
      return {
        status: 'success',
        provider: 'apollo',
        data: {
          // Placeholder data structure
          company_name: companyName || 'Sample Company',
          domain: 'samplecompany.com',
          industry: 'Technology',
          company_size: '51-200',
          employee_count: 150,
          annual_revenue: 10000000,
          growth_stage: 'Series B',
          headquarters: 'San Francisco, CA'
        }
      };
    } catch (error) {
      console.error('Apollo enrichment error:', error);
      return { status: 'error', provider: 'apollo', error: error.message };
    }
  }

  async enrichWithZoomInfo(query, companyName = null) {
    try {
      const apiKey = process.env.ZOOMINFO_API_KEY;
      if (!apiKey) {
        throw new Error('ZoomInfo API key not configured');
      }

      // ZoomInfo API integration logic
      return {
        status: 'success',
        provider: 'zoominfo',
        data: {
          company_name: companyName || 'Sample Company',
          domain: 'samplecompany.com',
          industry: 'Technology',
          company_size: '51-200',
          employee_count: 150,
          annual_revenue: 10000000,
          growth_stage: 'Series B',
          headquarters: 'San Francisco, CA'
        }
      };
    } catch (error) {
      console.error('ZoomInfo enrichment error:', error);
      return { status: 'error', provider: 'zoominfo', error: error.message };
    }
  }

  async enrichWithClearbit(query, companyName = null) {
    try {
      const apiKey = process.env.CLEARBIT_API_KEY;
      if (!apiKey) {
        throw new Error('Clearbit API key not configured');
      }

      // Clearbit API integration logic
      return {
        status: 'success',
        provider: 'clearbit',
        data: {
          company_name: companyName || 'Sample Company',
          domain: 'samplecompany.com',
          industry: 'Technology',
          company_size: '51-200',
          employee_count: 150,
          annual_revenue: 10000000,
          growth_stage: 'Series B',
          headquarters: 'San Francisco, CA'
        }
      };
    } catch (error) {
      console.error('Clearbit enrichment error:', error);
      return { status: 'error', provider: 'clearbit', error: error.message };
    }
  }

  async enrichWithCrunchbase(companyName) {
    try {
      const apiKey = process.env.CRUNCHBASE_API_KEY;
      if (!apiKey) {
        throw new Error('Crunchbase API key not configured');
      }

      // Crunchbase API integration logic
      return {
        status: 'success',
        provider: 'crunchbase',
        data: {
          company_name: companyName,
          domain: 'samplecompany.com',
          industry: 'Technology',
          company_size: '51-200',
          employee_count: 150,
          annual_revenue: 10000000,
          growth_stage: 'Series B',
          headquarters: 'San Francisco, CA'
        }
      };
    } catch (error) {
      console.error('Crunchbase enrichment error:', error);
      return { status: 'error', provider: 'crunchbase', error: error.message };
    }
  }

  async enrichWithHunter(email) {
    try {
      const apiKey = process.env.HUNTER_API_KEY;
      if (!apiKey) {
        throw new Error('Hunter API key not configured');
      }

      // Hunter API integration logic
      return {
        status: 'success',
        provider: 'hunter',
        data: {
          email: email,
          first_name: 'John',
          last_name: 'Doe',
          job_title: 'Software Engineer',
          company_name: 'Sample Company',
          domain: 'samplecompany.com'
        }
      };
    } catch (error) {
      console.error('Hunter enrichment error:', error);
      return { status: 'error', provider: 'hunter', error: error.message };
    }
  }

  // Data aggregation methods
  aggregateCompanyEnrichment(results) {
    const successfulResults = results
      .filter(result => result.status === 'fulfilled' && result.value.status === 'success')
      .map(result => result.value);

    if (successfulResults.length === 0) {
      return { status: 'failed', message: 'No enrichment data available' };
    }

    // Merge data from all providers, prioritizing more reliable sources
    const mergedData = {};
    const providerPriority = ['apollo', 'zoominfo', 'clearbit', 'crunchbase'];

    for (const provider of providerPriority) {
      const providerData = successfulResults.find(r => r.provider === provider);
      if (providerData && providerData.data) {
        Object.assign(mergedData, providerData.data);
      }
    }

    return {
      status: 'success',
      data: mergedData,
      providers_used: successfulResults.map(r => r.provider)
    };
  }

  aggregateContactEnrichment(results) {
    const successfulResults = results
      .filter(result => result.status === 'fulfilled' && result.value.status === 'success')
      .map(result => result.value);

    if (successfulResults.length === 0) {
      return { status: 'failed', message: 'No enrichment data available' };
    }

    // Merge data from all providers
    const mergedData = {};
    const providerPriority = ['apollo', 'zoominfo', 'clearbit', 'hunter'];

    for (const provider of providerPriority) {
      const providerData = successfulResults.find(r => r.provider === provider);
      if (providerData && providerData.data) {
        Object.assign(mergedData, providerData.data);
      }
    }

    return {
      status: 'success',
      data: mergedData,
      providers_used: successfulResults.map(r => r.provider)
    };
  }

  // Helper methods
  async getCompanyByName(companyName) {
    try {
      const result = await this.db.query(
        'SELECT * FROM b2b_companies WHERE company_name ILIKE $1 OR domain ILIKE $1',
        [companyName]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting company by name:', error);
      return null;
    }
  }

  async getContactByEmail(email) {
    try {
      const result = await this.db.query(
        'SELECT * FROM b2b_contacts WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting contact by email:', error);
      return null;
    }
  }

  async updateSearchIndex(entityType, entityId, searchText) {
    try {
      const query = `
        INSERT INTO search_index (entity_type, entity_id, search_text, search_vector)
        VALUES ($1, $2, $3, to_tsvector('english', $3))
        ON CONFLICT (entity_type, entity_id) 
        DO UPDATE SET
          search_text = EXCLUDED.search_text,
          search_vector = to_tsvector('english', EXCLUDED.search_text)
      `;
      
      await this.db.query(query, [entityType, entityId, searchText]);
    } catch (error) {
      console.error('Error updating search index:', error);
    }
  }

  async logEnrichmentActivity(entityType, entityId, enrichmentType, status, data) {
    try {
      const query = `
        INSERT INTO data_enrichment_log 
        (entity_type, entity_id, enrichment_type, provider, status, data_retrieved, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await this.db.query(query, [
        entityType,
        entityId,
        enrichmentType,
        data.providers_used?.join(', ') || 'unknown',
        status,
        status === 'success' ? JSON.stringify(data.data) : null,
        status === 'failed' ? data.message : null
      ]);
    } catch (error) {
      console.error('Error logging enrichment activity:', error);
    }
  }

  isEnrichmentRecent(lastUpdated) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(lastUpdated) > sevenDaysAgo;
  }

  // Analytics and Reporting
  async getDatabaseStats() {
    try {
      const stats = await Promise.all([
        this.db.query('SELECT COUNT(*) as total_companies FROM b2b_companies'),
        this.db.query('SELECT COUNT(*) as total_contacts FROM b2b_contacts'),
        this.db.query('SELECT COUNT(*) as verified_contacts FROM b2b_contacts WHERE email_verified = true OR phone_verified = true'),
        this.db.query('SELECT AVG(confidence_score) as avg_company_confidence FROM b2b_companies'),
        this.db.query('SELECT AVG(contact_score) as avg_contact_confidence FROM b2b_contacts'),
        this.db.query('SELECT COUNT(DISTINCT industry) as unique_industries FROM b2b_companies WHERE industry IS NOT NULL'),
        this.db.query('SELECT COUNT(DISTINCT company_size) as unique_company_sizes FROM b2b_companies WHERE company_size IS NOT NULL')
      ]);

      return {
        total_companies: parseInt(stats[0].rows[0].total_companies),
        total_contacts: parseInt(stats[1].rows[0].total_contacts),
        verified_contacts: parseInt(stats[2].rows[0].verified_contacts),
        avg_company_confidence: parseFloat(stats[3].rows[0].avg_company_confidence || 0),
        avg_contact_confidence: parseFloat(stats[4].rows[0].avg_contact_confidence || 0),
        unique_industries: parseInt(stats[5].rows[0].unique_industries),
        unique_company_sizes: parseInt(stats[6].rows[0].unique_company_sizes)
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {};
    }
  }

  async close() {
    if (this.db) {
      await this.db.end();
    }
  }
}

module.exports = B2BContactDatabaseService;
