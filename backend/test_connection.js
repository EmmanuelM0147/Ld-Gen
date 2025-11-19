const { Pool } = require('pg');

// Test different connection methods
async function testConnections() {
  console.log('🔍 Testing different connection methods...\n');
  
  // Method 1: Individual parameters
  console.log('📊 Method 1: Individual parameters');
  try {
    const pool1 = new Pool({
      host: 'db.rwxzzyrtrvdqeriynwhs.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'Exclusive0147#',
      ssl: {
        rejectUnauthorized: false,
        require: true
      }
    });
    
    const client1 = await pool1.connect();
    const result1 = await client1.query('SELECT NOW() as current_time');
    client1.release();
    await pool1.end();
    
    console.log('✅ Method 1 SUCCESS:', result1.rows[0].current_time);
  } catch (error) {
    console.log('❌ Method 1 FAILED:', error.message);
  }
  
  // Method 2: Connection string with encoded password
  console.log('\n📊 Method 2: Connection string with encoded password');
  try {
    const pool2 = new Pool({
      connectionString: 'postgresql://postgres:Exclusive0147%23@db.rwxzzyrtrvdqeriynwhs.supabase.co:5432/postgres',
      ssl: {
        rejectUnauthorized: false,
        require: true
      }
    });
    
    const client2 = await pool2.connect();
    const result2 = await client2.query('SELECT NOW() as current_time');
    client2.release();
    await pool2.end();
    
    console.log('✅ Method 2 SUCCESS:', result2.rows[0].current_time);
  } catch (error) {
    console.log('❌ Method 2 FAILED:', error.message);
  }
  
  // Method 3: Test DNS resolution
  console.log('\n📊 Method 3: Testing DNS resolution');
  try {
    const dns = require('dns');
    const util = require('util');
    const resolve = util.promisify(dns.resolve);
    
    const addresses = await resolve('db.rwxzzyrtrvdqeriynwhs.supabase.co');
    console.log('✅ DNS Resolution SUCCESS:', addresses);
  } catch (error) {
    console.log('❌ DNS Resolution FAILED:', error.message);
  }
  
  // Method 4: Test with different SSL settings
  console.log('\n📊 Method 4: Different SSL settings');
  try {
    const pool4 = new Pool({
      host: 'db.rwxzzyrtrvdqeriynwhs.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'Exclusive0147#',
      ssl: false // Try without SSL first
    });
    
    const client4 = await pool4.connect();
    const result4 = await client4.query('SELECT NOW() as current_time');
    client4.release();
    await pool4.end();
    
    console.log('✅ Method 4 SUCCESS (no SSL):', result4.rows[0].current_time);
  } catch (error) {
    console.log('❌ Method 4 FAILED (no SSL):', error.message);
  }
}

// Run the tests
testConnections().catch(console.error);
