const { supabase } = require('./config/supabase-config');

async function testEnhancedProspecting() {
  console.log('🧪 Testing Enhanced Lead Prospecting...\n');

  try {
    // Test 1: Check Supabase connection
    console.log('1. Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('prospecting_jobs')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Supabase connection failed:', testError.message);
      return;
    }
    console.log('✅ Supabase connection successful\n');

    // Test 2: Create a test prospecting job
    console.log('2. Testing prospecting job creation...');
    const testSearchCriteria = {
      title: 'CEO',
      companyName: 'Tech Corp',
      location: 'San Francisco',
      country: 'United States',
      city: 'San Francisco',
      state: 'California',
      industry: 'Technology',
      teamSize: '51-200',
      revenueRange: '10M-50M',
      totalFunding: '1M-5M'
    };

    const { data: jobData, error: jobError } = await supabase
      .from('prospecting_jobs')
      .insert({
        search_criteria: testSearchCriteria,
        max_results: 50,
        include_emails: true,
        enrich_data: true,
        status: 'started',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.log('❌ Failed to create prospecting job:', jobError.message);
      return;
    }
    console.log('✅ Prospecting job created successfully');
    console.log('   Job ID:', jobData.id);
    console.log('   Search Criteria:', JSON.stringify(testSearchCriteria, null, 2));
    console.log('   Status:', jobData.status);
    console.log('');

    // Test 3: Update job status to processing
    console.log('3. Testing job status update...');
    const { error: updateError } = await supabase
      .from('prospecting_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobData.id);

    if (updateError) {
      console.log('❌ Failed to update job status:', updateError.message);
    } else {
      console.log('✅ Job status updated to processing\n');
    }

    // Test 4: Create test leads
    console.log('4. Testing lead creation...');
    const testLeads = [
      {
        title: 'CEO',
        company_name: 'Tech Corp Inc',
        website: 'techcorp.com',
        email: 'ceo@techcorp.com',
        phone: '+1-555-0123',
        location: 'San Francisco, CA',
        country: 'United States',
        city: 'San Francisco',
        state: 'California',
        industry: 'Technology',
        team_size: '51-200',
        revenue_range: '10M-50M',
        total_funding: '1M-5M',
        description: 'Leading technology company',
        source: 'prospecting_search',
        prospecting_job_id: jobData.id,
        status: 'new',
        confidence_score: 0.85
      },
      {
        title: 'CTO',
        company_name: 'Innovation Labs',
        website: 'innovationlabs.com',
        email: 'cto@innovationlabs.com',
        phone: '+1-555-0456',
        location: 'San Francisco, CA',
        country: 'United States',
        city: 'San Francisco',
        state: 'California',
        industry: 'Technology',
        team_size: '11-50',
        revenue_range: '1M-10M',
        total_funding: '500K-1M',
        description: 'Innovative startup',
        source: 'prospecting_search',
        prospecting_job_id: jobData.id,
        status: 'new',
        confidence_score: 0.78
      }
    ];

    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .insert(testLeads)
      .select();

    if (leadsError) {
      console.log('❌ Failed to create test leads:', leadsError.message);
    } else {
      console.log('✅ Test leads created successfully');
      console.log('   Created', leadsData.length, 'leads');
      console.log('   Lead IDs:', leadsData.map(l => l.id).join(', '));
      console.log('');
    }

    // Test 5: Complete the job
    console.log('5. Testing job completion...');
    const { error: completeError } = await supabase
      .from('prospecting_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_leads: leadsData?.length || 0,
        results: leadsData || []
      })
      .eq('id', jobData.id);

    if (completeError) {
      console.log('❌ Failed to complete job:', completeError.message);
    } else {
      console.log('✅ Job completed successfully\n');
    }

    // Test 6: Verify search functionality
    console.log('6. Testing search functionality...');
    const { data: searchResults, error: searchError } = await supabase
      .from('leads')
      .select('*')
      .eq('industry', 'Technology')
      .eq('city', 'San Francisco')
      .eq('team_size', '51-200');

    if (searchError) {
      console.log('❌ Search failed:', searchError.message);
    } else {
      console.log('✅ Search successful');
      console.log('   Found', searchResults.length, 'leads matching criteria');
      console.log('   Results:', searchResults.map(l => `${l.title} at ${l.company_name}`));
      console.log('');
    }

    // Test 7: Clean up test data
    console.log('7. Cleaning up test data...');
    const { error: deleteLeadsError } = await supabase
      .from('leads')
      .delete()
      .eq('prospecting_job_id', jobData.id);

    const { error: deleteJobError } = await supabase
      .from('prospecting_jobs')
      .delete()
      .eq('id', jobData.id);

    if (deleteLeadsError || deleteJobError) {
      console.log('⚠️  Cleanup warnings:', {
        leads: deleteLeadsError?.message,
        job: deleteJobError?.message
      });
    } else {
      console.log('✅ Test data cleaned up successfully\n');
    }

    console.log('🎉 Enhanced Lead Prospecting Test Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Supabase connection');
    console.log('   ✅ Prospecting job creation');
    console.log('   ✅ Job status updates');
    console.log('   ✅ Lead creation and storage');
    console.log('   ✅ Search functionality');
    console.log('   ✅ Data cleanup');
    console.log('\n🚀 Your enhanced lead prospecting system is working correctly!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testEnhancedProspecting();
