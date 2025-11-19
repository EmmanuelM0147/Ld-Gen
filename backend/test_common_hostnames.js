const { Pool } = require('pg');

// Common Supabase hostname patterns to test
const testHostnames = [
  'db.rwxzzyrtrvdqeriynwhs.supabase.co',  // Your current one (failing)
  'db.lead-manager.supabase.co',           // Based on project name
  'db.lead-dashboard.supabase.co',         // Another possibility
  'db.dashboard.supabase.co',              // Short version
  'db.leads.supabase.co',                  // Another option
  'db.supabase-project.supabase.co',       // Generic pattern
  'db.project.supabase.co'                 // Very generic
];

async function testCommonHostnames() {
  console.log('🔍 Testing common Supabase hostname patterns...\n');
  console.log('💡 This will help us find the correct hostname for your project.\n');
  
  for (const hostname of testHostnames) {
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
          password: 'Exclusive01476767#',
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
        console.log(`\n💡 Update your test-config.js with:`);
        console.log(`   host: '${hostname}'`);
        return; // Found working connection!
        
      } catch (dbError) {
        console.log(`   ❌ Database connection failed: ${dbError.message}`);
      }
      
    } catch (dnsError) {
      console.log(`   ❌ DNS Resolution failed: ${dnsError.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('❌ No working hostnames found.');
  console.log('\n🔧 Next steps:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Check Settings → Database');
  console.log('3. Copy the EXACT hostname (should look like db.xxx.supabase.co)');
  console.log('4. Make sure your project is "Active" (not paused)');
  console.log('5. Check if there are any region-specific settings');
}

// Run the test
testCommonHostnames().catch(console.error);
