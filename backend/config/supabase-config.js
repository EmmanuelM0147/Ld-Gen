// Supabase Configuration using API Keys
// This is the recommended approach - more reliable and secure

const { createClient } = require('@supabase/supabase-js');

const supabaseConfig = {
  // Supabase API configuration
  supabase: {
    // Your Supabase project URL (from Settings → API)
    url: 'https://rwxzzyrtrvdqeriynwhs.supabase.co',
    
    // Your anon public key (from Settings → API)
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eHp6eXJ0cnZkcWVyaXlud2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzOTUzOTgsImV4cCI6MjA3MDk3MTM5OH0.3eEtIApTffyqWQeZNy_q-rRSfVOkAea-LMd9hXdXkto',
    
    // Optional: Service role key for admin operations (keep secret!)
    // serviceRoleKey: 'YOUR_SERVICE_ROLE_KEY_HERE'
  },
  
  // Server configuration
  server: {
    port: 5002,
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

// Create Supabase client
const supabase = createClient(
  supabaseConfig.supabase.url,
  supabaseConfig.supabase.anonKey
);

module.exports = {
  supabaseConfig,
  supabase
};
