const { testConnection, initializeAllTables, testConfig } = require('./config/test-database');

async function testWithTestConfig() {
  console.log('🧪 Testing with Test Configuration...\n');
  console.log('📊 Test Database Config:');
  console.log(`   Host: ${testConfig.database.host}`);
  console.log(`   Port: ${testConfig.database.port}`);
  console.log(`   Database: ${testConfig.database.database}`);
  console.log(`   User: ${testConfig.database.user}`);
  console.log(`   SSL: ${testConfig.database.ssl.require ? 'required' : 'disabled'}\n`);
  
  try {
    // Test basic connection
    console.log('🔍 Testing database connection...');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Database connection successful!\n');
      
      // Test table creation
      console.log('🔧 Initializing complete database schema...');
      await initializeAllTables();
      console.log('\n🎉 Test database setup is complete!');
      console.log('All tables have been created successfully.');
      console.log('Sample test data has been inserted.');
      console.log('\nYou can now start your backend server with: npm run dev');
      
    } else {
      console.log('❌ Database connection failed!');
      console.log('Please check your test configuration in test-config.js');
    }
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your test-config.js file');
    console.log('2. Verify your Supabase project is active');
    console.log('3. Check if your IP is allowed in Supabase settings');
    console.log('4. Ensure your database password is correct');
    console.log('5. Make sure your Supabase project has enough storage space');
    console.log('\n💡 To use your real Supabase database:');
    console.log('   - Update test-config.js with your real connection details');
    console.log('   - Or create a .env file with SUPABASE_DB_URL');
  }
}

// Run the test
testWithTestConfig();
