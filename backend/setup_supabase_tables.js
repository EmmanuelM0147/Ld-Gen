const { supabase } = require('./config/supabase-config');

async function setupSupabaseTables() {
  console.log('🔧 Setting up Supabase tables for lead prospecting...');
  
  try {
    // Create prospecting_jobs table
    console.log('Creating prospecting_jobs table...');
    const { error: jobsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS prospecting_jobs (
          id SERIAL PRIMARY KEY,
          search_criteria JSONB NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          current_step VARCHAR(100) DEFAULT 'initializing',
          total_leads INTEGER DEFAULT 0,
          statistics JSONB,
          scraping_job_id VARCHAR(100),
          error TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        );
      `
    });
    
    if (jobsError) {
      console.log('Note: prospecting_jobs table might already exist or need manual creation');
    }

    // Create leads table
    console.log('Creating leads table...');
    const { error: leadsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS leads (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL,
          title VARCHAR(200),
          industry VARCHAR(100),
          website VARCHAR(500),
          phone VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          country VARCHAR(100),
          postal_code VARCHAR(20),
          team_size VARCHAR(50),
          revenue_range VARCHAR(100),
          total_funding VARCHAR(100),
          founded_year INTEGER,
          employee_count INTEGER,
          source VARCHAR(100) DEFAULT 'Lead Prospecting',
          quality_score DECIMAL(3,2) DEFAULT 0.00 CHECK (quality_score >= 0.00 AND quality_score <= 1.00),
          email_patterns JSONB,
          domain VARCHAR(255),
          linkedin_url VARCHAR(500),
          twitter_url VARCHAR(500),
          facebook_url VARCHAR(500),
          description TEXT,
          keywords TEXT[],
          status VARCHAR(50) DEFAULT 'new',
          priority VARCHAR(20) DEFAULT 'medium',
          assigned_to VARCHAR(100),
          prospecting_job_id INTEGER,
          scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_contacted_at TIMESTAMP WITH TIME ZONE,
          contact_count INTEGER DEFAULT 0,
          is_verified BOOLEAN DEFAULT FALSE,
          verification_date TIMESTAMP WITH TIME ZONE
        );
      `
    });
    
    if (leadsError) {
      console.log('Note: leads table might already exist or need manual creation');
    }

    // Insert sample data for testing
    console.log('Inserting sample leads for testing...');
    const sampleLeads = [
      {
        company_name: 'TechCorp Inc',
        title: 'CEO',
        industry: 'Technology',
        city: 'San Francisco',
        state: 'CA',
        country: 'United States',
        team_size: '51-200',
        revenue_range: '10M-50M',
        total_funding: '5M-10M',
        website: 'techcorp.com',
        email: 'ceo@techcorp.com',
        phone: '+1-555-0123',
        status: 'new',
        source: 'Lead Prospecting'
      },
      {
        company_name: 'Marketing Pro Solutions',
        title: 'Marketing Manager',
        industry: 'Marketing',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        team_size: '11-50',
        revenue_range: '1M-10M',
        total_funding: '100K-500K',
        website: 'marketingpro.com',
        email: 'marketing@marketingpro.com',
        phone: '+1-555-0456',
        status: 'new',
        source: 'Lead Prospecting'
      },
      {
        company_name: 'StartupXYZ',
        title: 'CTO',
        industry: 'SaaS',
        city: 'Austin',
        state: 'TX',
        country: 'United States',
        team_size: '1-10',
        revenue_range: '0-1M',
        total_funding: '500K-1M',
        website: 'startupxyz.com',
        email: 'cto@startupxyz.com',
        phone: '+1-555-0789',
        status: 'new',
        source: 'Lead Prospecting'
      },
      {
        company_name: 'Healthcare Innovations',
        title: 'VP of Sales',
        industry: 'Healthcare',
        city: 'Boston',
        state: 'MA',
        country: 'United States',
        team_size: '201-500',
        revenue_range: '50M-100M',
        total_funding: '10M-50M',
        website: 'healthcareinnovations.com',
        email: 'sales@healthcareinnovations.com',
        phone: '+1-555-0321',
        status: 'new',
        source: 'Lead Prospecting'
      },
      {
        company_name: 'Finance First',
        title: 'Business Development Manager',
        industry: 'Finance',
        city: 'Chicago',
        state: 'IL',
        country: 'United States',
        team_size: '51-200',
        revenue_range: '100M-500M',
        total_funding: '50M+',
        website: 'financefirst.com',
        email: 'bdm@financefirst.com',
        phone: '+1-555-0654',
        status: 'new',
        source: 'Lead Prospecting'
      }
    ];

    for (const lead of sampleLeads) {
      const { error: insertError } = await supabase
        .from('leads')
        .insert(lead);
      
      if (insertError) {
        console.log(`Note: Lead ${lead.company_name} might already exist:`, insertError.message);
      } else {
        console.log(`✅ Added sample lead: ${lead.company_name}`);
      }
    }

    console.log('\n🎉 Supabase tables setup completed!');
    console.log('Sample data has been inserted for testing.');
    console.log('\nYou can now test the lead prospecting functionality.');
    
  } catch (error) {
    console.error('❌ Error setting up Supabase tables:', error);
    console.log('\n🔧 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL commands from the migration files');
    console.log('4. Insert sample data manually if needed');
  }
}

// Run the setup
if (require.main === module) {
  setupSupabaseTables();
}

module.exports = { setupSupabaseTables };
