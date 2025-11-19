const { supabase } = require('./config/supabase-config');

async function debugProspecting() {
  console.log('🔍 Debugging Lead Prospecting Process...\n');
  
  try {
    // Step 1: Check if tables exist
    console.log('1. Checking if tables exist...');
    
    const { data: leadsTable, error: leadsError } = await supabase
      .from('leads')
      .select('count', { count: 'exact', head: true });
    
    if (leadsError) {
      console.log('❌ Leads table error:', leadsError.message);
      console.log('💡 The leads table might not exist. You need to run the setup SQL script first.');
      return;
    }
    
    console.log('✅ Leads table exists');
    
    // Step 2: Check if there's data
    console.log('\n2. Checking if there\'s data in the leads table...');
    
    const { data: leadsCount, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Count error:', countError.message);
      return;
    }
    
    console.log(`✅ Found ${leadsCount.length} leads in the table`);
    
    if (leadsCount.length === 0) {
      console.log('⚠️  No leads found! This is why prospecting returns no results.');
      console.log('💡 You need to insert sample data or the search will always be empty.');
      return;
    }
    
    // Step 3: Test the search function
    console.log('\n3. Testing search function...');
    
    const searchCriteria = {
      industry: 'Technology',
      title: '',
      companyName: '',
      location: '',
      city: '',
      state: '',
      country: '',
      teamSize: '',
      revenueRange: '',
      totalFunding: ''
    };
    
    console.log('Search criteria:', searchCriteria);
    
    // Simulate the search process
    let query = supabase
      .from('leads')
      .select('*')
      .limit(100);
    
    if (searchCriteria.industry && searchCriteria.industry.trim()) {
      query = query.eq('industry', searchCriteria.industry.trim());
    }
    
    console.log('Executing search query...');
    const { data: searchResults, error: searchError } = await query;
    
    if (searchError) {
      console.log('❌ Search error:', searchError.message);
      return;
    }
    
    console.log(`✅ Search successful! Found ${searchResults?.length || 0} results`);
    
    if (searchResults && searchResults.length > 0) {
      console.log('Sample results:');
      searchResults.slice(0, 3).forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.company_name} - ${lead.title} - ${lead.industry}`);
      });
    }
    
    // Step 4: Test prospecting job creation
    console.log('\n4. Testing prospecting job creation...');
    
    const { data: jobData, error: jobError } = await supabase
      .from('prospecting_jobs')
      .insert({
        search_criteria: searchCriteria,
        max_results: 100,
        include_emails: true,
        enrich_data: true,
        status: 'started',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (jobError) {
      console.log('❌ Job creation error:', jobError.message);
      console.log('💡 The prospecting_jobs table might not exist.');
      return;
    }
    
    console.log('✅ Prospecting job created successfully:', jobData.id);
    
    // Step 5: Test job status update
    console.log('\n5. Testing job status update...');
    
    const { error: updateError } = await supabase
      .from('prospecting_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobData.id);
    
    if (updateError) {
      console.log('❌ Job update error:', updateError.message);
      return;
    }
    
    console.log('✅ Job status updated to processing');
    
    // Step 6: Test job completion
    console.log('\n6. Testing job completion...');
    
    const { error: completeError } = await supabase
      .from('prospecting_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_leads: searchResults?.length || 0,
        results: searchResults || []
      })
      .eq('id', jobData.id);
    
    if (completeError) {
      console.log('❌ Job completion error:', completeError.message);
      return;
    }
    
    console.log('✅ Job completed successfully');
    
    // Clean up test job
    await supabase
      .from('prospecting_jobs')
      .delete()
      .eq('id', jobData.id);
    
    console.log('\n🎉 All tests passed! The prospecting system should work correctly.');
    console.log('\n💡 If you\'re still having issues, check:');
    console.log('   - Backend server logs for errors');
    console.log('   - Database connection status');
    console.log('   - Table permissions in Supabase');
    
  } catch (error) {
    console.error('❌ Unexpected error during debugging:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugProspecting();
}

module.exports = { debugProspecting };
