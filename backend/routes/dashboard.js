const express = require('express');
const { supabase } = require('../config/supabase-config');
const router = express.Router();

// Get dashboard overview data
router.get('/overview', async (req, res) => {
  try {
    // Get total leads count
    const { count: totalLeads } = await supabase
      .from('business_contacts')
      .select('*', { count: 'exact', head: true });

    // Get leads by status
    const { data: statusData } = await supabase
      .from('business_contacts')
      .select('status');

    // Get leads by industry
    const { data: industryData } = await supabase
      .from('business_contacts')
      .select('industry');

    // Calculate status distribution
    const statusCounts = {};
    if (statusData) {
      statusData.forEach(lead => {
        const status = lead.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
    }

    // Calculate industry distribution
    const industryCounts = {};
    if (industryData) {
      industryData.forEach(lead => {
        const industry = lead.industry || 'unknown';
        industryCounts[industry] = (industryCounts[industry] || 0) + 1;
      });
    }

    // Get recent leads
    const { data: recentLeads } = await supabase
      .from('business_contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      totalLeads: totalLeads || 0,
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      })),
      industryDistribution: Object.entries(industryCounts).map(([industry, count]) => ({
        industry,
        count
      })),
      recentLeads: recentLeads || []
    });

  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get dashboard charts data
router.get('/charts', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    // Get leads created in the specified time range
    let startDate = new Date();
    if (timeRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    }

    const { data: leads } = await supabase
      .from('business_contacts')
      .select('created_at, status, industry')
      .gte('created_at', startDate.toISOString());

    // Process data for charts
    const dailyData = {};
    const statusData = {};
    const industryData = {};

    if (leads) {
      leads.forEach(lead => {
        // Daily data
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        dailyData[date] = (dailyData[date] || 0) + 1;

        // Status data
        const status = lead.status || 'unknown';
        statusData[status] = (statusData[status] || 0) + 1;

        // Industry data
        const industry = lead.industry || 'unknown';
        industryData[industry] = (industryData[industry] || 0) + 1;
      });
    }

    res.json({
      dailyLeads: Object.entries(dailyData).map(([date, count]) => ({
        date,
        count
      })),
      statusBreakdown: Object.entries(statusData).map(([status, count]) => ({
        status,
        count
      })),
      industryBreakdown: Object.entries(industryData).map(([industry, count]) => ({
        industry,
        count
      }))
    });

  } catch (error) {
    console.error('Error fetching dashboard charts:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Get quick actions data
router.get('/quick-actions', async (req, res) => {
  try {
    // Get counts for quick actions
    const { count: newLeads } = await supabase
      .from('business_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');

    const { count: contactedLeads } = await supabase
      .from('business_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'contacted');

    const { count: interestedLeads } = await supabase
      .from('business_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'interested');

    res.json({
      newLeads: newLeads || 0,
      contactedLeads: contactedLeads || 0,
      interestedLeads: interestedLeads || 0,
      actions: [
        {
          id: 'add-lead',
          title: 'Add New Lead',
          description: 'Add a new business contact',
          action: 'navigate',
          target: '/leads/new'
        },
        {
          id: 'export-leads',
          title: 'Export Leads',
          description: 'Export leads to CSV/Excel',
          action: 'navigate',
          target: '/export'
        },
        {
          id: 'email-campaign',
          title: 'Create Campaign',
          description: 'Start an email marketing campaign',
          action: 'navigate',
          target: '/email-marketing'
        }
      ]
    });

  } catch (error) {
    console.error('Error fetching quick actions:', error);
    res.status(500).json({ error: 'Failed to fetch quick actions' });
  }
});

module.exports = router;
