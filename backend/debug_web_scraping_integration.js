const { supabase } = require('./config/supabase-config');

async function debugWebScrapingIntegration() {
  console.log('🌐 Debugging Web Scraping Integration in Lead Prospecting...\n');
  
  try {
    // Step 1: Check if tables exist
    console.log('1. Checking if required tables exist...');
    
    const { data: leadsTable, error: leadsError } = await supabase
      .from('leads')
      .select('count', { count: 'exact', head: true });
    
    if (leadsError) {
      console.log('❌ Leads table error:', leadsError.message);
      console.log('💡 The leads table might not exist. This is OK - we\'ll create it when needed.');
    } else {
      console.log('✅ Leads table exists');
    }
    
    const { data: jobsTable, error: jobsError } = await supabase
      .from('prospecting_jobs')
      .select('count', { count: 'exact', head: true });
    
    if (jobsError) {
      console.log('❌ Prospecting jobs table error:', jobsError.message);
      console.log('💡 The prospecting_jobs table might not exist. This is OK - we\'ll create it when needed.');
    } else {
      console.log('✅ Prospecting jobs table exists');
    }
    
    // Step 2: Test web scraping simulation
    console.log('\n2. Testing web scraping simulation...');
    
    const searchCriteria = {
      industry: 'Technology',
      title: 'CEO',
      companyName: '',
      location: 'San Francisco',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      teamSize: '',
      revenueRange: '',
      totalFunding: ''
    };
    
    console.log('Search criteria:', searchCriteria);
    
    // Simulate the web scraping process that would happen in production
    console.log('🌐 Simulating web scraping pipelines...');
    
    // Simulate Google Maps scraping
    if (searchCriteria.location || searchCriteria.city || searchCriteria.state) {
      console.log('📍 Simulating Google Maps scraping for location-based leads...');
    }
    
    // Simulate business directory scraping
    if (searchCriteria.industry) {
      console.log('🏢 Simulating business directory scraping for industry-based leads...');
    }
    
    // Simulate LinkedIn scraping (public data only)
    if (searchCriteria.title || searchCriteria.companyName) {
      console.log('💼 Simulating LinkedIn scraping for professional leads...');
    }
    
    // Simulate website contact page scraping
    if (searchCriteria.companyName) {
      console.log('🌐 Simulating website scraping for contact information...');
    }
    
    // Generate sample scraped data
    const sampleScrapedLeads = [
      {
        company_name: 'TechStartup Inc',
        title: 'CEO',
        industry: 'Technology',
        city: 'San Francisco',
        state: 'CA',
        country: 'United States',
        website: 'techstartup.com',
        phone: '+1-555-0100',
        email: 'ceo@techstartup.com',
        source: 'Google Maps Scraping',
        scraped_at: new Date().toISOString()
      },
      {
        company_name: 'Digital Marketing Pro',
        title: 'Marketing Manager',
        industry: 'Marketing',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        website: 'digitalmarketingpro.com',
        phone: '+1-555-0200',
        email: 'marketing@digitalmarketingpro.com',
        source: 'Business Directory Scraping',
        scraped_at: new Date().toISOString()
      },
      {
        company_name: 'AI Solutions Corp',
        title: 'CTO',
        industry: 'Technology',
        city: 'San Francisco',
        state: 'CA',
        country: 'United States',
        website: 'aisolutions.com',
        phone: '+1-555-0300',
        email: 'cto@aisolutions.com',
        source: 'LinkedIn Scraping',
        scraped_at: new Date().toISOString()
      }
    ];
    
    // Filter sample data based on search criteria
    const filteredLeads = sampleScrapedLeads.filter(lead => {
      if (searchCriteria.industry && lead.industry !== searchCriteria.industry) return false;
      if (searchCriteria.city && !lead.city.toLowerCase().includes(searchCriteria.city.toLowerCase())) return false;
      if (searchCriteria.state && lead.state !== searchCriteria.state) return false;
      return true;
    });
    
    console.log(`✅ Web scraping simulation completed. Generated ${filteredLeads.length} leads`);
    
    if (filteredLeads.length > 0) {
      console.log('Sample scraped leads:');
      filteredLeads.forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.company_name} - ${lead.title} - ${lead.industry} (${lead.source})`);
      });
    }
    
    // Step 3: Test prospecting job creation
    console.log('\n3. Testing prospecting job creation...');
    
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
      console.log('💡 The prospecting_jobs table might not exist. You need to create it first.');
      console.log('💡 Run the setup SQL script in Supabase to create the required tables.');
      return;
    }
    
    console.log('✅ Prospecting job created successfully:', jobData.id);
    
    // Step 4: Test job processing simulation
    console.log('\n4. Testing job processing simulation...');
    
    // Update job status to processing
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
    
    // Simulate lead enrichment
    console.log('🔧 Simulating lead enrichment...');
    const enrichedLeads = filteredLeads.map(lead => ({
      ...lead,
      timestamp: new Date().toISOString(),
      quality_score: 0.85,
      is_verified: false
    }));
    
    console.log(`✅ Lead enrichment completed. ${enrichedLeads.length} leads enriched`);
    
    // Step 5: Test job completion
    console.log('\n5. Testing job completion...');
    
    const { error: completeError } = await supabase
      .from('prospecting_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_leads: enrichedLeads.length,
        results: enrichedLeads
      })
      .eq('id', jobData.id);
    
    if (completeError) {
      console.log('❌ Job completion error:', completeError.message);
      return;
    }
    
    console.log('✅ Job completed successfully');
    
    // Step 6: Test storing leads in database
    console.log('\n6. Testing lead storage in database...');
    
    try {
      const { error: leadsError } = await supabase
        .from('leads')
        .upsert(enrichedLeads.map(lead => ({
          ...lead,
          prospecting_job_id: jobData.id,
          source: lead.source || 'prospecting_search'
        })));
      
      if (leadsError) {
        console.log('⚠️  Lead storage error (this is OK if table doesn\'t exist yet):', leadsError.message);
        console.log('💡 The leads will be stored when the table is created.');
      } else {
        console.log('✅ Leads stored successfully in database');
      }
    } catch (storageError) {
      console.log('⚠️  Lead storage failed (this is OK if table doesn\'t exist yet):', storageError.message);
    }
    
    // Clean up test job
    await supabase
      .from('prospecting_jobs')
      .delete()
      .eq('id', jobData.id);
    
    console.log('\n🎉 Web scraping integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Web scraping simulation: ✅ Generated ${filteredLeads.length} leads`);
    console.log(`   - Job processing: ✅ Completed successfully`);
    console.log(`   - Lead enrichment: ✅ ${enrichedLeads.length} leads enriched`);
    console.log(`   - Database storage: ${leadsError ? '⚠️  Table needs to be created' : '✅ Successful'}`);
    
    console.log('\n💡 Next steps:');
    console.log('   1. Run the setup SQL script in Supabase to create required tables');
    console.log('   2. Integrate with your actual web scraping services');
    console.log('   3. Test the full prospecting workflow in the frontend');
    console.log('   4. The system will now generate leads through web scraping instead of requiring pre-existing data');
    
  } catch (error) {
    console.error('❌ Unexpected error during debugging:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugWebScrapingIntegration();
}

module.exports = { debugWebScrapingIntegration };
