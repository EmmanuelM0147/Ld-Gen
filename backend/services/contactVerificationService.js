const axios = require('axios');
const { supabase } = require('../config/supabase-config');

class ContactVerificationService {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.verificationProviders = {
      email: ['hunter.io', 'clearbit', 'zerobounce'],
      phone: ['twilio', 'numverify'],
      company: ['clearbit', 'crunchbase', 'linkedin']
    };
  }

  async initialize() {
    try {
      // Initialize Supabase client
      this.db = supabase;
      
      // Test database connection
      const { data, error } = await this.db.from('contact_verifications').select('count').limit(1);
      if (error) {
        console.log('Tables may not exist yet, will create them...');
      }
      
      // Create verification tables if they don't exist
      await this.createVerificationTables();
      
      this.isInitialized = true;
      console.log('✅ Contact Verification Service initialized successfully with Supabase');
    } catch (error) {
      console.error('❌ Failed to initialize Contact Verification Service:', error);
      throw error;
    }
  }

  async createVerificationTables() {
    const createVerificationLogTable = `
      CREATE TABLE IF NOT EXISTS contact_verifications (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER NOT NULL,
        contact_type VARCHAR(20) NOT NULL, -- email, phone, company
        original_value TEXT NOT NULL,
        verified_value TEXT,
        verification_status VARCHAR(20) NOT NULL, -- pending, verified, invalid, unknown
        confidence_score DECIMAL(3,2) DEFAULT 0.00,
        verification_provider VARCHAR(50),
        verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createCompanyEnrichmentTable = `
      CREATE TABLE IF NOT EXISTS company_enrichments (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        domain VARCHAR(255),
        industry VARCHAR(100),
        company_size VARCHAR(50),
        revenue_range VARCHAR(100),
        founded_year INTEGER,
        headquarters VARCHAR(255),
        linkedin_url VARCHAR(500),
        website VARCHAR(500),
        description TEXT,
        technologies JSONB,
        social_profiles JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      // Use Supabase's SQL execution for table creation
      const { error: error1 } = await this.db.rpc('exec_sql', { sql: createVerificationLogTable });
      if (error1) {
        console.log('Note: Tables may already exist or need manual creation in Supabase dashboard');
      }
      
      const { error: error2 } = await this.db.rpc('exec_sql', { sql: createCompanyEnrichmentTable });
      if (error2) {
        console.log('Note: Tables may already exist or need manual creation in Supabase dashboard');
      }
      
      console.log('✅ Verification tables setup completed (check Supabase dashboard if manual creation needed)');
    } catch (error) {
      console.error('❌ Error setting up verification tables:', error);
      console.log('💡 You may need to create these tables manually in your Supabase dashboard');
    }
  }

  // Verify email address using multiple providers
  async verifyEmail(email) {
    try {
      // Check if we have a recent verification
      const existingVerification = await this.getRecentVerification('email', email);
      if (existingVerification && this.isVerificationRecent(existingVerification.verification_date)) {
        return existingVerification;
      }

      // Verify with multiple providers
      const verificationResults = await Promise.allSettled([
        this.verifyWithHunter(email),
        this.verifyWithClearbit(email),
        this.verifyWithZerobounce(email)
      ]);

      // Aggregate results
      const aggregatedResult = this.aggregateVerificationResults(verificationResults, 'email');
      
      // Store verification result
      await this.storeVerificationResult('email', email, aggregatedResult);
      
      return aggregatedResult;
    } catch (error) {
      console.error('Error verifying email:', error);
      return {
        status: 'error',
        message: 'Failed to verify email',
        error: error.message
      };
    }
  }

  // Verify phone number
  async verifyPhone(phone) {
    try {
      const existingVerification = await this.getRecentVerification('phone', phone);
      if (existingVerification && this.isVerificationRecent(existingVerification.verification_date)) {
        return existingVerification;
      }

      const verificationResults = await Promise.allSettled([
        this.verifyWithTwilio(phone),
        this.verifyWithNumverify(phone)
      ]);

      const aggregatedResult = this.aggregateVerificationResults(verificationResults, 'phone');
      await this.storeVerificationResult('phone', phone, aggregatedResult);
      
      return aggregatedResult;
    } catch (error) {
      console.error('Error verifying phone:', error);
      return {
        status: 'error',
        message: 'Failed to verify phone',
        error: error.message
      };
    }
  }

  // Enrich company information
  async enrichCompany(companyName, domain = null) {
    try {
      const existingEnrichment = await this.getCompanyEnrichment(companyName);
      if (existingEnrichment && this.isEnrichmentRecent(existingEnrichment.last_updated)) {
        return existingEnrichment;
      }

      const enrichmentResults = await Promise.allSettled([
        this.enrichWithClearbit(companyName, domain),
        this.enrichWithCrunchbase(companyName),
        this.enrichWithLinkedIn(companyName)
      ]);

      const aggregatedEnrichment = this.aggregateEnrichmentResults(enrichmentResults);
      await this.storeCompanyEnrichment(companyName, aggregatedEnrichment);
      
      return aggregatedEnrichment;
    } catch (error) {
      console.error('Error enriching company:', error);
      return {
        status: 'error',
        message: 'Failed to enrich company',
        error: error.message
      };
    }
  }

  // Verify with Hunter.io
  async verifyWithHunter(email) {
    try {
      const apiKey = process.env.HUNTER_API_KEY;
      if (!apiKey) {
        throw new Error('Hunter.io API key not configured');
      }

      const response = await axios.get(`https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${apiKey}`);
      
      if (response.data && response.data.data) {
        const data = response.data.data;
        return {
          status: 'success',
          verified: data.status === 'valid',
          confidence: data.score / 100,
          provider: 'hunter.io',
          metadata: {
            disposable: data.disposable,
            webmail: data.webmail,
            mx_record: data.mx_record,
            smtp_server: data.smtp_server,
            smtp_check: data.smtp_check
          }
        };
      }
      
      return { status: 'failed', provider: 'hunter.io' };
    } catch (error) {
      console.error('Hunter.io verification error:', error);
      return { status: 'error', provider: 'hunter.io', error: error.message };
    }
  }

  // Verify with Clearbit
  async verifyWithClearbit(email) {
    try {
      const apiKey = process.env.CLEARBIT_API_KEY;
      if (!apiKey) {
        throw new Error('Clearbit API key not configured');
      }

      const response = await axios.get(`https://person.clearbit.com/v2/combined/find?email=${email}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (response.data && response.data.person) {
        const person = response.data.person;
        const company = response.data.company;
        
        return {
          status: 'success',
          verified: true,
          confidence: 0.95,
          provider: 'clearbit',
          metadata: {
            person: {
              name: person.name,
              title: person.title,
              location: person.location,
              linkedin: person.linkedin
            },
            company: company ? {
              name: company.name,
              domain: company.domain,
              industry: company.category?.industry,
              size: company.metrics?.employees,
              revenue: company.metrics?.annualRevenue
            } : null
          }
        };
      }
      
      return { status: 'failed', provider: 'clearbit' };
    } catch (error) {
      console.error('Clearbit verification error:', error);
      return { status: 'error', provider: 'clearbit', error: error.message };
    }
  }

  // Verify with ZeroBounce
  async verifyWithZerobounce(email) {
    try {
      const apiKey = process.env.ZEROBOUNCE_API_KEY;
      if (!apiKey) {
        throw new Error('ZeroBounce API key not configured');
      }

      const response = await axios.get(`https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${email}`);
      
      if (response.data) {
        const data = response.data;
        return {
          status: 'success',
          verified: data.status === 'valid',
          confidence: data.sub_status === 'valid' ? 0.9 : 0.7,
          provider: 'zerobounce',
          metadata: {
            sub_status: data.sub_status,
            account: data.account,
            domain: data.domain,
            disposable: data.disposable,
            toxic: data.toxic,
            firstname: data.firstname,
            lastname: data.lastname
          }
        };
      }
      
      return { status: 'failed', provider: 'zerobounce' };
    } catch (error) {
      console.error('ZeroBounce verification error:', error);
      return { status: 'error', provider: 'zerobounce', error: error.message };
    }
  }

  // Verify with Twilio
  async verifyWithTwilio(phone) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }

      const response = await axios.get(
        `https://lookups.twilio.com/v1/PhoneNumbers/${phone}`,
        {
          auth: { username: accountSid, password: authToken }
        }
      );

      if (response.data) {
        const data = response.data;
        return {
          status: 'success',
          verified: true,
          confidence: 0.95,
          provider: 'twilio',
          metadata: {
            country_code: data.country_code,
            national_format: data.national_format,
            carrier: data.carrier,
            line_type: data.line_type
          }
        };
      }
      
      return { status: 'failed', provider: 'twilio' };
    } catch (error) {
      console.error('Twilio verification error:', error);
      return { status: 'error', provider: 'twilio', error: error.message };
    }
  }

  // Verify with Numverify
  async verifyWithNumverify(phone) {
    try {
      const apiKey = process.env.NUMVERIFY_API_KEY;
      if (!apiKey) {
        throw new Error('Numverify API key not configured');
      }

      const response = await axios.get(`http://apilayer.net/api/validate?access_key=${apiKey}&number=${phone}`);
      
      if (response.data && response.data.valid) {
        const data = response.data;
        return {
          status: 'success',
          verified: true,
          confidence: 0.9,
          provider: 'numverify',
          metadata: {
            country_code: data.country_code,
            country_name: data.country_name,
            location: data.location,
            carrier: data.carrier,
            line_type: data.line_type
          }
        };
      }
      
      return { status: 'failed', provider: 'numverify' };
    } catch (error) {
      console.error('Numverify verification error:', error);
      return { status: 'error', provider: 'numverify', error: error.message };
    }
  }

  // Enrich company with Clearbit
  async enrichWithClearbit(companyName, domain) {
    try {
      const apiKey = process.env.CLEARBIT_API_KEY;
      if (!apiKey) {
        throw new Error('Clearbit API key not configured');
      }

      const searchQuery = domain || companyName;
      const response = await axios.get(`https://company.clearbit.com/v2/companies/find?domain=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (response.data) {
        const company = response.data;
        return {
          status: 'success',
          provider: 'clearbit',
          data: {
            name: company.name,
            domain: company.domain,
            industry: company.category?.industry,
            company_size: company.metrics?.employees,
            revenue_range: company.metrics?.annualRevenue,
            founded_year: company.foundedYear,
            headquarters: company.geo?.city + ', ' + company.geo?.state + ', ' + company.geo?.country,
            linkedin_url: company.linkedin?.handle,
            website: company.domain,
            description: company.description,
            technologies: company.tech,
            social_profiles: company.twitter
          }
        };
      }
      
      return { status: 'failed', provider: 'clearbit' };
    } catch (error) {
      console.error('Clearbit enrichment error:', error);
      return { status: 'error', provider: 'clearbit', error: error.message };
    }
  }

  // Enrich company with Crunchbase
  async enrichWithCrunchbase(companyName) {
    try {
      const apiKey = process.env.CRUNCHBASE_API_KEY;
      if (!apiKey) {
        throw new Error('Crunchbase API key not configured');
      }

      const response = await axios.get(`https://api.crunchbase.com/v3.1/organizations?name=${encodeURIComponent(companyName)}&user_key=${apiKey}`);
      
      if (response.data && response.data.data && response.data.data.items) {
        const company = response.data.data.items[0];
        return {
          status: 'success',
          provider: 'crunchbase',
          data: {
            name: company.properties.name,
            domain: company.properties.homepage_url,
            industry: company.properties.category_groups?.[0]?.properties?.name,
            company_size: company.properties.num_employees_enum,
            revenue_range: company.properties.revenue_range,
            founded_year: company.properties.founded_on_year,
            headquarters: company.properties.headquarters_location,
            description: company.properties.short_description,
            funding: company.properties.total_funding_usd
          }
        };
      }
      
      return { status: 'failed', provider: 'crunchbase' };
    } catch (error) {
      console.error('Crunchbase enrichment error:', error);
      return { status: 'error', provider: 'crunchbase', error: error.message };
    }
  }

  // Enrich company with LinkedIn
  async enrichWithLinkedIn(companyName) {
    try {
      // Note: LinkedIn API requires special access and authentication
      // This is a placeholder for when you have LinkedIn API access
      return {
        status: 'not_configured',
        provider: 'linkedin',
        message: 'LinkedIn API not configured'
      };
    } catch (error) {
      console.error('LinkedIn enrichment error:', error);
      return { status: 'error', provider: 'linkedin', error: error.message };
    }
  }

  // Aggregate verification results from multiple providers
  aggregateVerificationResults(results, type) {
    const successfulResults = results
      .filter(result => result.status === 'fulfilled' && result.value.status === 'success')
      .map(result => result.value);

    if (successfulResults.length === 0) {
      return {
        verification_status: 'unknown',
        confidence_score: 0.0,
        verification_provider: 'none',
        metadata: {}
      };
    }

    // Calculate weighted confidence score
    const totalConfidence = successfulResults.reduce((sum, result) => sum + result.confidence, 0);
    const averageConfidence = totalConfidence / successfulResults.length;

    // Determine overall verification status
    let verificationStatus = 'unknown';
    if (successfulResults.some(r => r.verified)) {
      verificationStatus = 'verified';
    } else if (successfulResults.some(r => !r.verified)) {
      verificationStatus = 'invalid';
    }

    return {
      verification_status: verificationStatus,
      confidence_score: Math.min(averageConfidence, 1.0),
      verification_provider: successfulResults.map(r => r.provider).join(', '),
      metadata: this.mergeMetadata(successfulResults.map(r => r.metadata))
    };
  }

  // Aggregate enrichment results
  aggregateEnrichmentResults(results) {
    const successfulResults = results
      .filter(result => result.status === 'fulfilled' && result.value.status === 'success')
      .map(result => result.value);

    if (successfulResults.length === 0) {
      return { status: 'failed', message: 'No enrichment data available' };
    }

    // Merge data from all providers, prioritizing more reliable sources
    const mergedData = {};
    const providerPriority = ['clearbit', 'crunchbase', 'linkedin'];

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

  // Merge metadata from multiple providers
  mergeMetadata(metadataArray) {
    const merged = {};
    metadataArray.forEach(metadata => {
      if (metadata) {
        Object.assign(merged, metadata);
      }
    });
    return merged;
  }

  // Store verification result
  async storeVerificationResult(type, value, result) {
    try {
      const { error } = await this.db
        .from('contact_verifications')
        .insert({
          contact_type: type,
          original_value: value,
          verification_status: result.verification_status,
          confidence_score: result.confidence_score,
          verification_provider: result.verification_provider,
          metadata: result.metadata
        });
      
      if (error) {
        console.error('Error storing verification result:', error);
      }
    } catch (error) {
      console.error('Error storing verification result:', error);
    }
  }

  // Store company enrichment
  async storeCompanyEnrichment(companyName, enrichment) {
    try {
      if (enrichment.status !== 'success' || !enrichment.data) {
        return;
      }

      const { error } = await this.db
        .from('company_enrichments')
        .upsert({
          company_name: companyName,
          domain: enrichment.data.domain,
          industry: enrichment.data.industry,
          company_size: enrichment.data.company_size,
          revenue_range: enrichment.data.revenue_range,
          founded_year: enrichment.data.founded_year,
          headquarters: enrichment.data.headquarters,
          linkedin_url: enrichment.data.linkedin_url,
          website: enrichment.data.website,
          description: enrichment.data.description,
          technologies: enrichment.data.technologies,
          social_profiles: enrichment.data.social_profiles,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'company_name'
        });
      
      if (error) {
        console.error('Error storing company enrichment:', error);
      }
    } catch (error) {
      console.error('Error storing company enrichment:', error);
    }
  }

  // Get recent verification
  async getRecentVerification(type, value) {
    try {
      const { data, error } = await this.db
        .from('contact_verifications')
        .select('*')
        .eq('contact_type', type)
        .eq('original_value', value)
        .order('verification_date', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error getting recent verification:', error);
        return null;
      }
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting recent verification:', error);
      return null;
    }
  }

  // Get company enrichment
  async getCompanyEnrichment(companyName) {
    try {
      const { data, error } = await this.db
        .from('company_enrichments')
        .select('*')
        .ilike('company_name', `%${companyName}%`)
        .order('last_updated', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error getting company enrichment:', error);
        return null;
      }
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting company enrichment:', error);
      return null;
    }
  }

  // Check if verification is recent (within 30 days)
  isVerificationRecent(verificationDate) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(verificationDate) > thirtyDaysAgo;
  }

  // Check if enrichment is recent (within 7 days)
  isEnrichmentRecent(lastUpdated) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(lastUpdated) > sevenDaysAgo;
  }

  // Bulk verify contacts
  async bulkVerifyContacts(contacts) {
    const results = [];
    
    for (const contact of contacts) {
      try {
        if (contact.email) {
          const emailVerification = await this.verifyEmail(contact.email);
          results.push({
            contact_id: contact.id,
            type: 'email',
            result: emailVerification
          });
        }
        
        if (contact.phone) {
          const phoneVerification = await this.verifyPhone(contact.phone);
          results.push({
            contact_id: contact.id,
            type: 'phone',
            result: phoneVerification
          });
        }
        
        if (contact.company_name) {
          const companyEnrichment = await this.enrichCompany(contact.company_name, contact.domain);
          results.push({
            contact_id: contact.id,
            type: 'company',
            result: companyEnrichment
          });
        }
      } catch (error) {
        console.error(`Error verifying contact ${contact.id}:`, error);
        results.push({
          contact_id: contact.id,
          type: 'error',
          result: { status: 'error', message: error.message }
        });
      }
    }
    
    return results;
  }

  // Get verification statistics
  async getVerificationStats() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await this.db
        .from('contact_verifications')
        .select('verification_status, confidence_score')
        .gte('verification_date', thirtyDaysAgo.toISOString());
      
      if (error) {
        console.error('Error getting verification stats:', error);
        return [];
      }
      
      // Group and calculate stats manually since Supabase doesn't support GROUP BY in select
      const stats = {};
      data.forEach(record => {
        const status = record.verification_status;
        if (!stats[status]) {
          stats[status] = { count: 0, total_confidence: 0 };
        }
        stats[status].count++;
        stats[status].total_confidence += record.confidence_score || 0;
      });
      
      return Object.entries(stats).map(([status, data]) => ({
        verification_status: status,
        count: data.count,
        avg_confidence: data.total_confidence / data.count
      }));
    } catch (error) {
      console.error('Error getting verification stats:', error);
      return [];
    }
  }

  async close() {
    // Supabase client doesn't need explicit closing
    console.log('Contact Verification Service closed');
  }
}

module.exports = ContactVerificationService;
