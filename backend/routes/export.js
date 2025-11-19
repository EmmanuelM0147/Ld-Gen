const express = require('express');
const { supabase } = require('../config/supabase-config');
const router = express.Router();

// Export leads data
router.get('/leads', async (req, res) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    let query = supabase
      .from('business_contacts')
      .select('*');

    // Apply filters
    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }

    // Get all matching leads
    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads for export:', error);
      return res.status(500).json({ error: 'Failed to fetch leads for export' });
    }

    if (!leads || leads.length === 0) {
      return res.status(404).json({ error: 'No leads found matching the specified filters' });
    }

    // Format data for export
    const formattedLeads = leads.map(lead => ({
      'Company Name': lead.company_name || '',
      'First Name': lead.first_name || '',
      'Last Name': lead.last_name || '',
      'Email': lead.email || '',
      'Phone': lead.phone || '',
      'Website': lead.website || '',
      'Industry': lead.industry || '',
      'Status': lead.status || '',
      'Source': lead.source || '',
      'City': lead.city || '',
      'State': lead.state || '',
      'Country': lead.country || '',
      'Address': lead.address || '',
      'LinkedIn': lead.linkedin_profile || '',
      'Created At': lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '',
      'Updated At': lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : ''
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="leads_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(formattedLeads);
    } else {
      // CSV format
      const csvHeaders = Object.keys(formattedLeads[0]);
      const csvContent = [
        csvHeaders.join(','),
        ...formattedLeads.map(lead => 
          csvHeaders.map(header => {
            const value = lead[header] || '';
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leads_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// Export campaign data
router.get('/campaigns', async (req, res) => {
  try {
    const { campaignId, format = 'csv' } = req.query;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates(name, subject),
        smtp_credentials(name, host)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get campaign recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select(`
        *,
        business_contacts(company_name, first_name, last_name, email, industry)
      `)
      .eq('campaign_id', campaignId);

    if (recipientsError) {
      return res.status(500).json({ error: 'Failed to fetch campaign recipients' });
    }

    // Get tracking data
    const { data: tracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('campaign_id', campaignId);

    if (trackingError) {
      console.log('No tracking data found for campaign');
    }

    // Format data for export
    const formattedData = recipients.map(recipient => {
      const lead = recipient.business_contacts;
      const trackingEvents = tracking ? tracking.filter(t => t.tracking_id === recipient.tracking_id) : [];
      
      return {
        'Campaign Name': campaign.name || '',
        'Template': campaign.email_templates?.name || '',
        'Subject': campaign.email_templates?.subject || '',
        'Company Name': lead?.company_name || '',
        'First Name': lead?.first_name || '',
        'Last Name': lead?.last_name || '',
        'Email': recipient.email || '',
        'Industry': lead?.industry || '',
        'Status': recipient.status || '',
        'Sent At': recipient.sent_at ? new Date(recipient.sent_at).toLocaleDateString() : '',
        'Opened': trackingEvents.some(t => t.event_type === 'open') ? 'Yes' : 'No',
        'Opened At': trackingEvents.find(t => t.event_type === 'open')?.timestamp ? 
          new Date(trackingEvents.find(t => t.event_type === 'open').timestamp).toLocaleDateString() : '',
        'IP Address': trackingEvents.find(t => t.event_type === 'open')?.ip_address || '',
        'User Agent': trackingEvents.find(t => t.event_type === 'open')?.user_agent || ''
      };
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="campaign_${campaignId}_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(formattedData);
    } else {
      // CSV format
      const csvHeaders = Object.keys(formattedData[0]);
      const csvContent = [
        csvHeaders.join(','),
        ...formattedData.map(row => 
          csvHeaders.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaign_${campaignId}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Error exporting campaign data:', error);
    res.status(500).json({ error: 'Failed to export campaign data' });
  }
});

// Export analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = '30d', format = 'csv' } = req.query;
    
    // Calculate start date based on time range
    const startDate = new Date();
    if (timeRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    } else if (timeRange === '1y') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Get leads created in time range
    const { data: leads, error: leadsError } = await supabase
      .from('business_contacts')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (leadsError) {
      return res.status(500).json({ error: 'Failed to fetch leads data' });
    }

    // Get campaigns in time range
    const { data: campaigns, error: campaignsError } = await supabase
      .from('email_campaigns')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (campaignsError) {
      console.log('No campaigns found in time range');
    }

    // Aggregate data by day
    const dailyStats = {};
    if (leads) {
      leads.forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            leadsCreated: 0,
            leadsByStatus: {},
            leadsByIndustry: {}
          };
        }
        
        dailyStats[date].leadsCreated++;
        
        const status = lead.status || 'unknown';
        dailyStats[date].leadsByStatus[status] = (dailyStats[date].leadsByStatus[status] || 0) + 1;
        
        const industry = lead.industry || 'unknown';
        dailyStats[date].leadsByIndustry[industry] = (dailyStats[date].leadsByIndustry[industry] || 0) + 1;
      });
    }

    // Format data for export
    const formattedData = Object.values(dailyStats).map(day => ({
      'Date': day.date,
      'Leads Created': day.leadsCreated,
      'New Leads': day.leadsByStatus.new || 0,
      'Contacted Leads': day.leadsByStatus.contacted || 0,
      'Interested Leads': day.leadsByStatus.interested || 0,
      'Closed Leads': day.leadsByStatus.closed || 0,
      'Top Industry': Object.entries(day.leadsByIndustry)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
      'Top Industry Count': Object.entries(day.leadsByIndustry)
        .sort(([,a], [,b]) => b - a)[0]?.[1] || 0
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(formattedData);
    } else {
      // CSV format
      const csvHeaders = Object.keys(formattedData[0]);
      const csvContent = [
        csvHeaders.join(','),
        ...formattedData.map(row => 
          csvHeaders.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Error exporting analytics data:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

module.exports = router;
