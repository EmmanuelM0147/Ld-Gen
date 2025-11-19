const { supabase } = require('./config/supabase-config');

async function testLeadSearch() {
  console.log('🔍 Testing Lead Search Functionality...\n');
  
  try {
    // Test 1: Check if leads table exists and has data
    console.log('1. Checking leads table...');
    const { data: leadsCount, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Error accessing leads table:', countError.message);
      console.log('💡 This suggests the table might not exist or there are permission issues.');
      return;
    }
    
    console.log(`✅ Leads table accessible. Found ${leadsCount.length} leads.`);
    
    // Test 2: Try a simple search
    console.log('\n2. Testing simple search...');
    const { data: searchResults, error: searchError } = await supabase
      .from('leads')
      .select('*')
      .ilike('company_name', '%Tech%')
      .limit(5);
    
    if (searchError) {
      console.log('❌ Search error:', searchError.message);
      return;
    }
    
    console.log(`✅ Search successful! Found ${searchResults.length} results for "Tech"`);
    if (searchResults.length > 0) {
      console.log('Sample result:', {
        company: searchResults[0].company_name,
        title: searchResults[0].title,
        industry: searchResults[0].industry
      });
    }
    
    // Test 3: Test industry filter
    console.log('\n3. Testing industry filter...');
    const { data: industryResults, error: industryError } = await supabase
      .from('leads')
      .select('*')
      .eq('industry', 'Technology')
      .limit(3);
    
    if (industryError) {
      console.log('❌ Industry filter error:', industryError.message);
      return;
    }
    
    console.log(`✅ Industry filter successful! Found ${industryResults.length} Technology companies`);
    
    // Test 4: Test location filter
    console.log('\n4. Testing location filter...');
    const { data: locationResults, error: locationError } = await supabase
      .from('leads')
      .select('*')
      .ilike('city', '%San Francisco%')
      .limit(3);
    
    if (locationError) {
      console.log('❌ Location filter error:', locationError.message);
      return;
    }
    
    console.log(`✅ Location filter successful! Found ${locationResults.length} companies in San Francisco`);
    
    // Test 5: Test combined filters
    console.log('\n5. Testing combined filters...');
    const { data: combinedResults, error: combinedError } = await supabase
      .from('leads')
      .select('*')
      .eq('industry', 'Technology')
      .ilike('city', '%San Francisco%')
      .limit(3);
    
    if (combinedError) {
      console.log('❌ Combined filter error:', combinedError.message);
      return;
    }
    
    console.log(`✅ Combined filters successful! Found ${combinedResults.length} Technology companies in San Francisco`);
    
    console.log('\n🎉 All search tests passed! The lead prospecting system should work correctly.');
    console.log('\n💡 If you\'re still not seeing results in the frontend, check:');
    console.log('   - Frontend console for JavaScript errors');
    console.log('   - Backend server logs for API errors');
    console.log('   - Network tab in browser dev tools for failed requests');
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
if (require.main === module) {
  testLeadSearch();
}

module.exports = { testLeadSearch };
