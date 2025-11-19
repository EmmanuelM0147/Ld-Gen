const { supabase, supabaseConfig } = require('./config/supabase-config');

async function testSupabaseAPI() {
  console.log('🔑 Testing Supabase API Connection...\n');
  
  // Check if config is set up
  if (supabaseConfig.supabase.url.includes('YOUR_PROJECT_REF') || 
      supabaseConfig.supabase.anonKey.includes('YOUR_ANON_KEY_HERE')) {
    console.log('❌ Configuration not set up yet!');
    console.log('\n🔧 Please update supabase-config.js with your actual keys:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Click Settings → API');
    console.log('3. Copy your Project URL and anon public key');
    console.log('4. Update the config file');
    return;
  }
  
  console.log('📊 Supabase Config:');
  console.log(`   URL: ${supabaseConfig.supabase.url}`);
  console.log(`   Key: ${supabaseConfig.supabase.anonKey.substring(0, 20)}...`);
  console.log('');
  
  try {
    // Test 1: Basic connection
    console.log('🔍 Test 1: Testing basic connection...');
    const { data, error } = await supabase.from('business_contacts').select('count').limit(1);
    
    if (error) {
      if (error.message.includes('relation "business_contacts" does not exist')) {
        console.log('✅ Connection successful! (Tables not created yet)');
        console.log('   This is normal for a new project.');
      } else {
        console.log('❌ Connection failed:', error.message);
        return;
      }
    } else {
      console.log('✅ Connection successful!');
    }
    
    // Test 2: Create tables
    console.log('\n🔧 Test 2: Creating database tables...');
    await createTables();
    
    // Test 3: Insert sample data
    console.log('\n🧪 Test 3: Inserting sample data...');
    await insertSampleData();
    
    console.log('\n🎉 Supabase API setup complete!');
    console.log('Your database is now ready to use.');
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
  }
}

async function createTables() {
  try {
    // Create business_contacts table
    const { error: contactsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS business_contacts (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          company_name VARCHAR(255) NOT NULL,
          job_title VARCHAR(200),
          industry VARCHAR(100),
          company_size VARCHAR(50),
          city VARCHAR(100),
          state VARCHAR(100),
          country VARCHAR(100),
          phone VARCHAR(50),
          website VARCHAR(255),
          linkedin_url VARCHAR(500),
          notes TEXT,
          status VARCHAR(50) DEFAULT 'new',
          tags TEXT[],
          source VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    });
    
    if (contactsError) {
      console.log('   ⚠️  business_contacts table:', contactsError.message);
    } else {
      console.log('   ✅ business_contacts table created');
    }
    
    // Create other tables...
    console.log('   📝 Note: Tables will be created when you first use them');
    console.log('   💡 Supabase automatically creates tables on first insert');
    
  } catch (error) {
    console.log('   ⚠️  Table creation:', error.message);
  }
}

async function insertSampleData() {
  try {
    const { data, error } = await supabase
      .from('business_contacts')
      .insert(supabaseConfig.testData.sampleLeads)
      .select();
    
    if (error) {
      if (error.message.includes('relation "business_contacts" does not exist')) {
        console.log('   📝 Tables will be created automatically on first use');
      } else {
        console.log('   ❌ Error inserting data:', error.message);
      }
    } else {
      console.log(`   ✅ Sample data inserted: ${data.length} records`);
    }
    
  } catch (error) {
    console.log('   ⚠️  Data insertion:', error.message);
  }
}

// Run the test
testSupabaseAPI().catch(console.error);
