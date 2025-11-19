const { Pool } = require('pg');

// Common Supabase project reference patterns to test
const testReferences = [
  'rwxzzyrtrvdqeriynwhs', // Your current one
  'abcdefghijklmnop',      // Example pattern
  'supabase-project',       // Another example
  'lead-manager',           // Based on your project name
  'dashboard-project'       // Another possibility
];

async function testProjectReferences() {
  console.log('🔍 Testing different Supabase project references...\n');
  console.log('💡 Make sure to check your Supabase dashboard for the correct reference!\n');
  
  for (const ref of testReferences) {
    const hostname = `db.${ref}.supabase.co`;
    console.log(`📊 Testing: ${hostname}`);
    
    try {
      // Test DNS resolution first
      const dns = require('dns');
      const util = require('util');
      const resolve = util.promisify(dns.resolve);
      
      const addresses = await resolve(hostname);
      console.log(`   ✅ DNS Resolution: ${addresses.join(', ')}`);
      
      // If DNS works, test database connection
      try {
        const pool = new Pool({
          host: hostname,
          port: 5432,
          database: 'postgres',
          user: 'postgres',
          password: 'Exclusive0147#',
          ssl: {
            rejectUnauthorized: false,
            require: true
          },
          connectionTimeoutMillis: 5000 // 5 second timeout
        });
        
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        client.release();
        await pool.end();
        
        console.log(`   🎉 DATABASE CONNECTION SUCCESS!`);
        console.log(`   📅 Server time: ${result.rows[0].current_time}`);
        console.log(`   🔗 Use this hostname: ${hostname}`);
        return; // Found working connection!
        
      } catch (dbError) {
        console.log(`   ❌ Database connection failed: ${dbError.message}`);
      }
      
    } catch (dnsError) {
      console.log(`   ❌ DNS Resolution failed: ${dnsError.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('❌ No working project references found.');
  console.log('\n🔧 Next steps:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Check Settings → Database');
  console.log('3. Copy the exact hostname');
  console.log('4. Update test-config.js with the correct hostname');
}

// Run the test
testProjectReferences().catch(console.error);
