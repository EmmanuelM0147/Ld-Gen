// Test Configuration for Development
// This file contains test database credentials for development
// In production, use environment variables instead

const testConfig = {
  // Test Supabase PostgreSQL connection
  database: {
    // Individual connection parameters (more reliable than connection string)
    host: 'db.rwxzzyrtrvdqeriynwhs.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Exclusive01476767#',
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  },
  
  // Server configuration
  server: {
    port: 5001,
    environment: 'development',
    frontendUrl: 'http://localhost:3000'
  },
  
  // Email marketing settings
  emailMarketing: {
    dailyLimit: 200,
    trackingEnabled: true,
    maxRetries: 3
  },
  
  // Test data
  testData: {
    sampleLeads: [
      {
        company_name: 'TechCorp Inc',
        industry: 'Technology',
        city: 'San Francisco',
        status: 'new'
      },
      {
        company_name: 'Marketing Pro',
        industry: 'Marketing',
        city: 'New York',
        status: 'new'
      },
      {
        company_name: 'StartupXYZ',
        industry: 'SaaS',
        city: 'Austin',
        status: 'new'
      }
    ]
  }
};

module.exports = testConfig;
