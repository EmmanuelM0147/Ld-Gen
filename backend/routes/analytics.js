const express = require('express');
const { supabase } = require('../config/supabase-config');
const router = express.Router();

// Get analytics overview
router.get('/', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Get total leads count
    const { count: totalLeads } = await supabase
      .from('business_contacts')
      .select('*', { count: 'exact', head: true });

    // Get total emails count (if company_emails table exists)
    let totalEmails = 0;
    try {
      const { count: emailsCount } = await supabase
        .from('company_emails')
        .select('*', { count: 'exact', head: true });
      totalEmails = emailsCount || 0;
    } catch (error) {
      // Table might not exist yet, that's okay
      console.log('company_emails table not found, skipping email count');
    }

    // Get unique companies count
    const { data: companies } = await supabase
      .from('business_contacts')
      .select('company_name');

    const uniqueCompanies = new Set();
    if (companies) {
      companies.forEach(lead => {
        if (lead.company_name) {
          uniqueCompanies.add(lead.company_name);
        }
      });
    }

    res.json({
      totalLeads: totalLeads || 0,
      totalEmails: totalEmails,
      totalCompanies: uniqueCompanies.size,
      timeRange
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get lead growth over time
router.get('/growth', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    // Get leads created in the last 12 months
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    const { data: leads } = await supabase
      .from('business_contacts')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    // Group by period
    const growthData = {};
    if (leads) {
      leads.forEach(lead => {
        const date = new Date(lead.created_at);
        let key;
        
        if (period === 'monthly') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (period === 'weekly') {
          const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
          key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
        } else {
          key = date.toISOString().split('T')[0];
        }
        
        growthData[key] = (growthData[key] || 0) + 1;
      });
    }

    const sortedData = Object.entries(growthData)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      period,
      data: sortedData
    });

  } catch (error) {
    console.error('Error fetching growth data:', error);
    res.status(500).json({ error: 'Failed to fetch growth data' });
  }
});

// Get industry distribution
router.get('/industries', async (req, res) => {
  try {
    const { data: leads } = await supabase
      .from('business_contacts')
      .select('industry');

    const industryCounts = {};
    if (leads) {
      leads.forEach(lead => {
        const industry = lead.industry || 'Unknown';
        industryCounts[industry] = (industryCounts[industry] || 0) + 1;
      });
    }

    const industryData = Object.entries(industryCounts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);

    res.json(industryData);

  } catch (error) {
    console.error('Error fetching industry data:', error);
    res.status(500).json({ error: 'Failed to fetch industry data' });
  }
});

// Get status distribution
router.get('/statuses', async (req, res) => {
  try {
    const { data: leads } = await supabase
      .from('business_contacts')
      .select('status');

    const statusCounts = {};
    if (leads) {
      leads.forEach(lead => {
        const status = lead.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
    }

    const statusData = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    res.json(statusData);

  } catch (error) {
    console.error('Error fetching status data:', error);
    res.status(500).json({ error: 'Failed to fetch status data' });
  }
});

// Get geographic distribution
router.get('/geography', async (req, res) => {
  try {
    const { data: leads } = await supabase
      .from('business_contacts')
      .select('city, state, country');

    const cityCounts = {};
    const stateCounts = {};
    const countryCounts = {};

    if (leads) {
      leads.forEach(lead => {
        if (lead.city) {
          cityCounts[lead.city] = (cityCounts[lead.city] || 0) + 1;
        }
        if (lead.state) {
          stateCounts[lead.state] = (stateCounts[lead.state] || 0) + 1;
        }
        if (lead.country) {
          countryCounts[lead.country] = (countryCounts[lead.country] || 0) + 1;
        }
      });
    }

    res.json({
      cities: Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20), // Top 20 cities
      states: Object.entries(stateCounts)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20), // Top 20 states
      countries: Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)  // Top 20 countries
    });

  } catch (error) {
    console.error('Error fetching geography data:', error);
    res.status(500).json({ error: 'Failed to fetch geography data' });
  }
});

// Get source performance
router.get('/sources', async (req, res) => {
  try {
    const { data: leads } = await supabase
      .from('business_contacts')
      .select('source, status');

    const sourceStats = {};
    if (leads) {
      leads.forEach(lead => {
        const source = lead.source || 'Unknown';
        if (!sourceStats[source]) {
          sourceStats[source] = {
            total: 0,
            new: 0,
            contacted: 0,
            interested: 0,
            closed: 0
          };
        }
        
        sourceStats[source].total++;
        const status = lead.status || 'new';
        if (sourceStats[source].hasOwnProperty(status)) {
          sourceStats[source][status]++;
        }
      });
    }

    const sourceData = Object.entries(sourceStats).map(([source, stats]) => ({
      source,
      ...stats,
      conversionRate: stats.total > 0 ? 
        ((stats.interested + stats.closed) / stats.total * 100).toFixed(1) : 0
    }));

    res.json(sourceData.sort((a, b) => b.total - a.total));

  } catch (error) {
    console.error('Error fetching source data:', error);
    res.status(500).json({ error: 'Failed to fetch source data' });
  }
});

module.exports = router;
