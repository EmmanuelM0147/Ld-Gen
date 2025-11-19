const { testConnection, initializeAllTables } = require('./config/database');

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase PostgreSQL connection...\n');
  
  try {
    // Test basic connection
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Database connection successful!\n');
      
      // Test table creation
      console.log('🔧 Initializing complete database schema...');
      await initializeAllTables();
      console.log('\n🎉 Database setup is complete!');
      console.log('All tables have been created successfully.');
      console.log('\nYou can now start your backend server with: npm run dev');
      
    } else {
      console.log('❌ Database connection failed!');
      console.log('Please check your .env file and Supabase connection details.');
    }
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your SUPABASE_DB_URL in .env file');
    console.log('2. Verify your Supabase project is active');
    console.log('3. Check if your IP is allowed in Supabase settings');
    console.log('4. Ensure your database password is correct');
    console.log('5. Make sure your Supabase project has enough storage space');
  }
}

// Run the test
testSupabaseConnection();
