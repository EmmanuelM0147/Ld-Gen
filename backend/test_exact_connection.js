const { Pool } = require('pg');

async function testExactConnection() {
  console.log('🔍 Testing your exact Supabase connection...\n');
  
  // Test 1: Individual parameters
  console.log('📊 Test 1: Individual parameters');
  try {
    const pool1 = new Pool({
      host: 'db.rwxzzyrtrvdqeriynwhs.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'Exclusive01476767#',
      ssl: {
        rejectUnauthorized: false,
        require: true
      },
      connectionTimeoutMillis: 10000 // 10 second timeout
    });
    
    const client1 = await pool1.connect();
    const result1 = await client1.query('SELECT NOW() as current_time');
    client1.release();
    await pool1.end();
    
    console.log('✅ SUCCESS! Database connected with individual parameters');
    console.log(`📅 Server time: ${result1.rows[0].current_time}`);
    return true;
    
  } catch (error) {
    console.log('❌ Individual parameters failed:', error.message);
  }
  
  // Test 2: Connection string with encoded password
  console.log('\n📊 Test 2: Connection string with encoded password');
  try {
    const pool2 = new Pool({
      connectionString: 'postgresql://postgres:Exclusive01476767%23@db.rwxzzyrtrvdqeriynwhs.supabase.co:5432/postgres',
      ssl: {
        rejectUnauthorized: false,
        require: true
      }
    });
    
    const client2 = await pool2.connect();
    const result2 = await client2.query('SELECT NOW() as current_time');
    client2.release();
    await pool2.end();
    
    console.log('✅ SUCCESS! Database connected with connection string');
    console.log(`📅 Server time: ${result2.rows[0].current_time}`);
    return true;
    
  } catch (error) {
    console.log('❌ Connection string failed:', error.message);
  }
  
  // Test 3: DNS resolution
  console.log('\n📊 Test 3: DNS resolution');
  try {
    const dns = require('dns');
    const util = require('util');
    const resolve = util.promisify(dns.resolve);
    
    const addresses = await resolve('db.rwxzzyrtrvdqeriynwhs.supabase.co');
    console.log('✅ DNS Resolution SUCCESS:', addresses.join(', '));
  } catch (error) {
    console.log('❌ DNS Resolution FAILED:', error.message);
    console.log('\n🔧 This suggests the hostname is incorrect.');
    console.log('Please double-check your Supabase project settings.');
  }
  
  return false;
}

// Run the test
testExactConnection()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Your Supabase connection is working!');
      console.log('You can now run: node test_with_test_config.js');
    } else {
      console.log('\n❌ Connection failed. Please check your Supabase settings.');
    }
  })
  .catch(console.error);
