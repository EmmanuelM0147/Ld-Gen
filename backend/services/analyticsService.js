const { supabase } = require('../config/supabase-config');

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.db = null;
  }

  async initialize() {
    try {
      // Initialize Supabase client
      this.db = supabase;
      
      // Test database connection
      const { data, error } = await this.db.from('lead_analytics').select('count').limit(1);
      if (error) {
        console.log('Tables may not exist yet, will create them...');
      }
      
      // Create analytics tables if they don't exist
      await this.createAnalyticsTables();
      
      this.isInitialized = true;
      console.log('✅ Analytics Service initialized successfully with Supabase');
    } catch (error) {
      console.error('❌ Failed to initialize Analytics Service:', error);
      throw error;
    }
  }

  async createAnalyticsTables() {
    const createLeadAnalyticsTable = `
      CREATE TABLE IF NOT EXISTS lead_analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        total_leads INTEGER DEFAULT 0,
        new_leads INTEGER DEFAULT 0,
        qualified_leads INTEGER DEFAULT 0,
        converted_leads INTEGER DEFAULT 0,
        lead_sources JSONB,
        industry_distribution JSONB,
        location_distribution JSONB,
        quality_score_distribution JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createSalesAnalyticsTable = `
      CREATE TABLE IF NOT EXISTS sales_analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        total_opportunities INTEGER DEFAULT 0,
        new_opportunities INTEGER DEFAULT 0,
        won_opportunities INTEGER DEFAULT 0,
        lost_opportunities INTEGER DEFAULT 0,
        total_revenue DECIMAL(15,2) DEFAULT 0.00,
        avg_deal_size DECIMAL(15,2) DEFAULT 0.00,
        sales_cycle_length INTEGER DEFAULT 0,
        conversion_rates JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createCampaignAnalyticsTable = `
      CREATE TABLE IF NOT EXISTS campaign_analytics (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER,
        date DATE NOT NULL,
        emails_sent INTEGER DEFAULT 0,
        emails_delivered INTEGER DEFAULT 0,
        emails_opened INTEGER DEFAULT 0,
        emails_clicked INTEGER DEFAULT 0,
        emails_replied INTEGER DEFAULT 0,
        linkedin_messages INTEGER DEFAULT 0,
        linkedin_replies INTEGER DEFAULT 0,
        phone_calls INTEGER DEFAULT 0,
        meetings_booked INTEGER DEFAULT 0,
        opportunities_created INTEGER DEFAULT 0,
        revenue_generated DECIMAL(15,2) DEFAULT 0.00,
        open_rate DECIMAL(5,2) DEFAULT 0.00,
        click_rate DECIMAL(5,2) DEFAULT 0.00,
        reply_rate DECIMAL(5,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createPerformanceMetricsTable = `
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(10,4) NOT NULL,
        metric_unit VARCHAR(50),
        date DATE NOT NULL,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createROIAnalyticsTable = `
      CREATE TABLE IF NOT EXISTS roi_analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        campaign_id INTEGER,
        total_investment DECIMAL(15,2) DEFAULT 0.00,
        total_revenue DECIMAL(15,2) DEFAULT 0.00,
        roi_percentage DECIMAL(8,2) DEFAULT 0.00,
        cost_per_lead DECIMAL(10,2) DEFAULT 0.00,
        cost_per_opportunity DECIMAL(10,2) DEFAULT 0.00,
        cost_per_customer DECIMAL(10,2) DEFAULT 0.00,
        customer_lifetime_value DECIMAL(15,2) DEFAULT 0.00,
        payback_period INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.db.query(createLeadAnalyticsTable);
      await this.db.query(createSalesAnalyticsTable);
      await this.db.query(createCampaignAnalyticsTable);
      await this.db.query(createPerformanceMetricsTable);
      await this.db.query(createROIAnalyticsTable);
      console.log('✅ Analytics tables created successfully');
    } catch (error) {
      console.error('❌ Error creating analytics tables:', error);
      throw error;
    }
  }

  // Lead Generation Analytics
  async getLeadGenerationMetrics(timeRange = '30d', filters = {}) {
    try {
      let dateFilter = '';
      const params = [];
      
      switch (timeRange) {
        case '7d':
          dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case '30d':
          dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'30 days\'';
          break;
        case '90d':
          dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'90 days\'';
          break;
        case '1y':
          dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 year\'';
          break;
        case 'custom':
          if (filters.startDate && filters.endDate) {
            dateFilter = 'WHERE date BETWEEN $1 AND $2';
            params.push(filters.startDate, filters.endDate);
          }
          break;
      }

      const query = `
        SELECT 
          DATE_TRUNC('day', date) as date,
          SUM(total_leads) as total_leads,
          SUM(new_leads) as new_leads,
          SUM(qualified_leads) as qualified_leads,
          SUM(converted_leads) as converted_leads,
          AVG(quality_score_distribution->>'avg_score')::DECIMAL(5,2) as avg_quality_score
        FROM lead_analytics 
        ${dateFilter}
        GROUP BY DATE_TRUNC('day', date)
        ORDER BY date
      `;
      
      const result = await this.db.query(query, params);
      
      // Calculate additional metrics
      const metrics = this.calculateLeadMetrics(result.rows);
      
      return {
        daily_data: result.rows,
        summary: metrics,
        time_range: timeRange
      };
    } catch (error) {
      console.error('Error getting lead generation metrics:', error);
      throw error;
    }
  }

  calculateLeadMetrics(data) {
    if (!data || data.length === 0) {
      return {
        total_leads: 0,
        new_leads: 0,
        qualified_leads: 0,
        converted_leads: 0,
        qualification_rate: 0,
        conversion_rate: 0,
        avg_quality_score: 0,
        growth_rate: 0
      };
    }

    const totalLeads = data.reduce((sum, row) => sum + parseInt(row.total_leads || 0), 0);
    const newLeads = data.reduce((sum, row) => sum + parseInt(row.new_leads || 0), 0);
    const qualifiedLeads = data.reduce((sum, row) => sum + parseInt(row.qualified_leads || 0), 0);
    const convertedLeads = data.reduce((sum, row) => sum + parseInt(row.converted_leads || 0), 0);
    
    const qualificationRate = totalLeads > 0 ? (qualifiedLeads / totalLeads * 100) : 0;
    const conversionRate = qualifiedLeads > 0 ? (convertedLeads / qualifiedLeads * 100) : 0;
    
    const avgQualityScore = data.reduce((sum, row) => sum + parseFloat(row.avg_quality_score || 0), 0) / data.length;
    
    // Calculate growth rate (comparing first and last period)
    const firstPeriod = data[0];
    const lastPeriod = data[data.length - 1];
    const growthRate = firstPeriod && lastPeriod && firstPeriod.new_leads > 0 ? 
      ((lastPeriod.new_leads - firstPeriod.new_leads) / firstPeriod.new_leads * 100) : 0;

    return {
      total_leads: totalLeads,
      new_leads: newLeads,
      qualified_leads: qualifiedLeads,
      converted_leads: convertedLeads,
      qualification_rate: Math.round(qualificationRate * 100) / 100,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      avg_quality_score: Math.round(avgQualityScore * 100) / 100,
      growth_rate: Math.round(growthRate * 100) / 100
    };
  }

  // Sales Performance Analytics
  async getSalesPerformanceMetrics(timeRange = '30d', filters = {}) {
    try {
      let dateFilter = '';
      const params = [];
      
      switch (timeRange) {
        case '7d':
          dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case '30d':
          dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'30 days\'';
          break;
        case '90d':
          dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'90 days\'';
          break;
        case '1y':
          dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 year\'';
          break;
        case 'custom':
          if (filters.startDate && filters.endDate) {
            dateFilter = 'WHERE date BETWEEN $1 AND $2';
            params.push(filters.startDate, filters.endDate);
          }
          break;
      }

      const query = `
        SELECT 
          DATE_TRUNC('day', date) as date,
          SUM(total_opportunities) as total_opportunities,
          SUM(new_opportunities) as new_opportunities,
          SUM(won_opportunities) as won_opportunities,
          SUM(lost_opportunities) as lost_opportunities,
          SUM(total_revenue) as total_revenue,
          AVG(avg_deal_size) as avg_deal_size,
          AVG(sales_cycle_length) as avg_sales_cycle
        FROM sales_analytics 
        ${dateFilter}
        GROUP BY DATE_TRUNC('day', date)
        ORDER BY date
      `;
      
      const result = await this.db.query(query, params);
      
      // Calculate additional metrics
      const metrics = this.calculateSalesMetrics(result.rows);
      
      return {
        daily_data: result.rows,
        summary: metrics,
        time_range: timeRange
      };
    } catch (error) {
      console.error('Error getting sales performance metrics:', error);
      throw error;
    }
  }

  calculateSalesMetrics(data) {
    if (!data || data.length === 0) {
      return {
        total_opportunities: 0,
        new_opportunities: 0,
        won_opportunities: 0,
        lost_opportunities: 0,
        total_revenue: 0,
        win_rate: 0,
        avg_deal_size: 0,
        avg_sales_cycle: 0,
        revenue_growth: 0
      };
    }

    const totalOpportunities = data.reduce((sum, row) => sum + parseInt(row.total_opportunities || 0), 0);
    const newOpportunities = data.reduce((sum, row) => sum + parseInt(row.new_opportunities || 0), 0);
    const wonOpportunities = data.reduce((sum, row) => sum + parseInt(row.won_opportunities || 0), 0);
    const lostOpportunities = data.reduce((sum, row) => sum + parseInt(row.lost_opportunities || 0), 0);
    const totalRevenue = data.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0);
    
    const winRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities * 100) : 0;
    const avgDealSize = wonOpportunities > 0 ? (totalRevenue / wonOpportunities) : 0;
    const avgSalesCycle = data.reduce((sum, row) => sum + parseFloat(row.avg_sales_cycle || 0), 0) / data.length;
    
    // Calculate revenue growth
    const firstPeriod = data[0];
    const lastPeriod = data[data.length - 1];
    const revenueGrowth = firstPeriod && lastPeriod && firstPeriod.total_revenue > 0 ? 
      ((lastPeriod.total_revenue - firstPeriod.total_revenue) / firstPeriod.total_revenue * 100) : 0;

    return {
      total_opportunities: totalOpportunities,
      new_opportunities: newOpportunities,
      won_opportunities: wonOpportunities,
      lost_opportunities: lostOpportunities,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      win_rate: Math.round(winRate * 100) / 100,
      avg_deal_size: Math.round(avgDealSize * 100) / 100,
      avg_sales_cycle: Math.round(avgSalesCycle * 100) / 100,
      revenue_growth: Math.round(revenueGrowth * 100) / 100
    };
  }

  // Campaign Performance Analytics
  async getCampaignPerformanceMetrics(campaignId = null, timeRange = '30d') {
    try {
      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (campaignId) {
        whereClause = `WHERE campaign_id = $${paramIndex}`;
        params.push(campaignId);
        paramIndex++;
      }

      switch (timeRange) {
        case '7d':
          whereClause += whereClause ? ' AND' : 'WHERE';
          whereClause += ` date >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case '30d':
          whereClause += whereClause ? ' AND' : 'WHERE';
          whereClause += ` date >= CURRENT_DATE - INTERVAL '30 days'`;
          break;
        case '90d':
          whereClause += whereClause ? ' AND' : 'WHERE';
          whereClause += ` date >= CURRENT_DATE - INTERVAL '90 days'`;
          break;
        case '1y':
          whereClause += whereClause ? ' AND' : 'WHERE';
          whereClause += ` date >= CURRENT_DATE - INTERVAL '1 year'`;
          break;
      }

      const query = `
        SELECT 
          DATE_TRUNC('day', date) as date,
          SUM(emails_sent) as emails_sent,
          SUM(emails_delivered) as emails_delivered,
          SUM(emails_opened) as emails_opened,
          SUM(emails_clicked) as emails_clicked,
          SUM(emails_replied) as emails_replied,
          SUM(linkedin_messages) as linkedin_messages,
          SUM(linkedin_replies) as linkedin_replies,
          SUM(phone_calls) as phone_calls,
          SUM(meetings_booked) as meetings_booked,
          SUM(opportunities_created) as opportunities_created,
          SUM(revenue_generated) as revenue_generated,
          AVG(open_rate) as avg_open_rate,
          AVG(click_rate) as avg_click_rate,
          AVG(reply_rate) as avg_reply_rate
        FROM campaign_analytics 
        ${whereClause}
        GROUP BY DATE_TRUNC('day', date)
        ORDER BY date
      `;
      
      const result = await this.db.query(query, params);
      
      // Calculate additional metrics
      const metrics = this.calculateCampaignMetrics(result.rows);
      
      return {
        daily_data: result.rows,
        summary: metrics,
        time_range: timeRange,
        campaign_id: campaignId
      };
    } catch (error) {
      console.error('Error getting campaign performance metrics:', error);
      throw error;
    }
  }

  calculateCampaignMetrics(data) {
    if (!data || data.length === 0) {
      return {
        total_emails_sent: 0,
        total_emails_delivered: 0,
        total_emails_opened: 0,
        total_emails_clicked: 0,
        total_emails_replied: 0,
        total_linkedin_messages: 0,
        total_linkedin_replies: 0,
        total_phone_calls: 0,
        total_meetings_booked: 0,
        total_opportunities_created: 0,
        total_revenue_generated: 0,
        overall_open_rate: 0,
        overall_click_rate: 0,
        overall_reply_rate: 0,
        linkedin_response_rate: 0,
        meeting_conversion_rate: 0
      };
    }

    const totalEmailsSent = data.reduce((sum, row) => sum + parseInt(row.emails_sent || 0), 0);
    const totalEmailsDelivered = data.reduce((sum, row) => sum + parseInt(row.emails_delivered || 0), 0);
    const totalEmailsOpened = data.reduce((sum, row) => sum + parseInt(row.emails_opened || 0), 0);
    const totalEmailsClicked = data.reduce((sum, row) => sum + parseInt(row.emails_clicked || 0), 0);
    const totalEmailsReplied = data.reduce((sum, row) => sum + parseInt(row.emails_replied || 0), 0);
    const totalLinkedinMessages = data.reduce((sum, row) => sum + parseInt(row.linkedin_messages || 0), 0);
    const totalLinkedinReplies = data.reduce((sum, row) => sum + parseInt(row.linkedin_replies || 0), 0);
    const totalPhoneCalls = data.reduce((sum, row) => sum + parseInt(row.phone_calls || 0), 0);
    const totalMeetingsBooked = data.reduce((sum, row) => sum + parseInt(row.meetings_booked || 0), 0);
    const totalOpportunitiesCreated = data.reduce((sum, row) => sum + parseInt(row.opportunities_created || 0), 0);
    const totalRevenueGenerated = data.reduce((sum, row) => sum + parseFloat(row.revenue_generated || 0), 0);

    const overallOpenRate = totalEmailsDelivered > 0 ? (totalEmailsOpened / totalEmailsDelivered * 100) : 0;
    const overallClickRate = totalEmailsDelivered > 0 ? (totalEmailsClicked / totalEmailsDelivered * 100) : 0;
    const overallReplyRate = totalEmailsDelivered > 0 ? (totalEmailsReplied / totalEmailsDelivered * 100) : 0;
    const linkedinResponseRate = totalLinkedinMessages > 0 ? (totalLinkedinReplies / totalLinkedinMessages * 100) : 0;
    const meetingConversionRate = totalPhoneCalls > 0 ? (totalMeetingsBooked / totalPhoneCalls * 100) : 0;

    return {
      total_emails_sent: totalEmailsSent,
      total_emails_delivered: totalEmailsDelivered,
      total_emails_opened: totalEmailsOpened,
      total_emails_clicked: totalEmailsClicked,
      total_emails_replied: totalEmailsReplied,
      total_linkedin_messages: totalLinkedinMessages,
      total_linkedin_replies: totalLinkedinReplies,
      total_phone_calls: totalPhoneCalls,
      total_meetings_booked: totalMeetingsBooked,
      total_opportunities_created: totalOpportunitiesCreated,
      total_revenue_generated: Math.round(totalRevenueGenerated * 100) / 100,
      overall_open_rate: Math.round(overallOpenRate * 100) / 100,
      overall_click_rate: Math.round(overallClickRate * 100) / 100,
      overall_reply_rate: Math.round(overallReplyRate * 100) / 100,
      linkedin_response_rate: Math.round(linkedinResponseRate * 100) / 100,
      meeting_conversion_rate: Math.round(meetingConversionRate * 100) / 100
    };
  }

  // ROI Analytics
  async getROIAnalytics(timeRange = '30d', campaignId = null) {
    try {
      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (campaignId) {
        whereClause = `WHERE campaign_id = $${paramIndex}`;
        params.push(campaignId);
        paramIndex++;
      }

      switch (timeRange) {
        case '7d':
          whereClause += whereClause ? ' AND' : 'WHERE';
          whereClause += ` date >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case '30d':
          whereClause += whereClause ? ' AND' : 'WHERE';
          whereClause += ` date >= CURRENT_DATE - INTERVAL '30 days'`;
          break;
        case '90d':
          whereClause += whereClause ? ' AND' : 'WHERE';
          whereClause += ` date >= CURRENT_DATE - INTERVAL '90 days'`;
          break;
        case '1y':
          whereClause += whereClause ? ' AND' : 'WHERE';
          whereClause += ` date >= CURRENT_DATE - INTERVAL '1 year'`;
          break;
      }

      const query = `
        SELECT 
          DATE_TRUNC('day', date) as date,
          SUM(total_investment) as total_investment,
          SUM(total_revenue) as total_revenue,
          AVG(roi_percentage) as avg_roi,
          AVG(cost_per_lead) as avg_cost_per_lead,
          AVG(cost_per_opportunity) as avg_cost_per_opportunity,
          AVG(cost_per_customer) as avg_cost_per_customer,
          AVG(customer_lifetime_value) as avg_customer_lifetime_value,
          AVG(payback_period) as avg_payback_period
        FROM roi_analytics 
        ${whereClause}
        GROUP BY DATE_TRUNC('day', date)
        ORDER BY date
      `;
      
      const result = await this.db.query(query, params);
      
      // Calculate additional metrics
      const metrics = this.calculateROIMetrics(result.rows);
      
      return {
        daily_data: result.rows,
        summary: metrics,
        time_range: timeRange,
        campaign_id: campaignId
      };
    } catch (error) {
      console.error('Error getting ROI analytics:', error);
      throw error;
    }
  }

  calculateROIMetrics(data) {
    if (!data || data.length === 0) {
      return {
        total_investment: 0,
        total_revenue: 0,
        total_roi: 0,
        avg_roi: 0,
        avg_cost_per_lead: 0,
        avg_cost_per_opportunity: 0,
        avg_cost_per_customer: 0,
        avg_customer_lifetime_value: 0,
        avg_payback_period: 0,
        profit_margin: 0
      };
    }

    const totalInvestment = data.reduce((sum, row) => sum + parseFloat(row.total_investment || 0), 0);
    const totalRevenue = data.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0);
    const totalROI = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment * 100) : 0;
    const avgROI = data.reduce((sum, row) => sum + parseFloat(row.avg_roi || 0), 0) / data.length;
    const avgCostPerLead = data.reduce((sum, row) => sum + parseFloat(row.avg_cost_per_lead || 0), 0) / data.length;
    const avgCostPerOpportunity = data.reduce((sum, row) => sum + parseFloat(row.avg_cost_per_opportunity || 0), 0) / data.length;
    const avgCostPerCustomer = data.reduce((sum, row) => sum + parseFloat(row.avg_cost_per_customer || 0), 0) / data.length;
    const avgCustomerLifetimeValue = data.reduce((sum, row) => sum + parseFloat(row.avg_customer_lifetime_value || 0), 0) / data.length;
    const avgPaybackPeriod = data.reduce((sum, row) => sum + parseFloat(row.avg_payback_period || 0), 0) / data.length;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalInvestment) / totalRevenue * 100) : 0;

    return {
      total_investment: Math.round(totalInvestment * 100) / 100,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_roi: Math.round(totalROI * 100) / 100,
      avg_roi: Math.round(avgROI * 100) / 100,
      avg_cost_per_lead: Math.round(avgCostPerLead * 100) / 100,
      avg_cost_per_opportunity: Math.round(avgCostPerOpportunity * 100) / 100,
      avg_cost_per_customer: Math.round(avgCostPerCustomer * 100) / 100,
      avg_customer_lifetime_value: Math.round(avgCustomerLifetimeValue * 100) / 100,
      avg_payback_period: Math.round(avgPaybackPeriod * 100) / 100,
      profit_margin: Math.round(profitMargin * 100) / 100
    };
  }

  // Performance Tracking
  async trackPerformanceMetric(metricName, metricValue, metricUnit = null, category = null, subcategory = null, metadata = {}) {
    try {
      const query = `
        INSERT INTO performance_metrics 
        (metric_name, metric_value, metric_unit, date, category, subcategory, metadata)
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        metricName,
        metricValue,
        metricUnit,
        category,
        subcategory,
        JSON.stringify(metadata)
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error tracking performance metric:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(metricName = null, category = null, timeRange = '30d') {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (metricName) {
        whereClause += ` AND metric_name = $${paramIndex}`;
        params.push(metricName);
        paramIndex++;
      }

      if (category) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      switch (timeRange) {
        case '7d':
          whereClause += ` AND date >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case '30d':
          whereClause += ` AND date >= CURRENT_DATE - INTERVAL '30 days'`;
          break;
        case '90d':
          whereClause += ` AND date >= CURRENT_DATE - INTERVAL '90 days'`;
          break;
        case '1y':
          whereClause += ` AND date >= CURRENT_DATE - INTERVAL '1 year'`;
          break;
      }

      const query = `
        SELECT 
          metric_name,
          metric_value,
          metric_unit,
          date,
          category,
          subcategory,
          metadata
        FROM performance_metrics 
        ${whereClause}
        ORDER BY date DESC, metric_name
      `;
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  // Dashboard Summary
  async getDashboardSummary() {
    try {
      const [leadMetrics, salesMetrics, campaignMetrics, roiMetrics] = await Promise.all([
        this.getLeadGenerationMetrics('30d'),
        this.getSalesPerformanceMetrics('30d'),
        this.getCampaignPerformanceMetrics(null, '30d'),
        this.getROIAnalytics('30d')
      ]);

      return {
        lead_generation: leadMetrics.summary,
        sales_performance: salesMetrics.summary,
        campaign_performance: campaignMetrics.summary,
        roi_analytics: roiMetrics.summary,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  // Data Export
  async exportAnalyticsData(format = 'json', timeRange = '30d', filters = {}) {
    try {
      const [leadData, salesData, campaignData, roiData] = await Promise.all([
        this.getLeadGenerationMetrics(timeRange, filters),
        this.getSalesPerformanceMetrics(timeRange, filters),
        this.getCampaignPerformanceMetrics(null, timeRange),
        this.getROIAnalytics(timeRange)
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        time_range: timeRange,
        filters: filters,
        lead_generation: leadData,
        sales_performance: salesData,
        campaign_performance: campaignData,
        roi_analytics: roiData
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      } else if (format === 'excel') {
        return this.convertToExcel(exportData);
      } else {
        return exportData;
      }
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      throw error;
    }
  }

  convertToCSV(data) {
    // CSV conversion logic would go here
    // This is a placeholder for actual CSV conversion
    return 'CSV data placeholder';
  }

  convertToExcel(data) {
    // Excel conversion logic would go here
    // This is a placeholder for actual Excel conversion
    return 'Excel data placeholder';
  }

  // Data Cleanup and Maintenance
  async cleanupOldData(olderThanDays = 365) {
    try {
      const cleanupQueries = [
        `DELETE FROM lead_analytics WHERE date < CURRENT_DATE - INTERVAL '${olderThanDays} days'`,
        `DELETE FROM sales_analytics WHERE date < CURRENT_DATE - INTERVAL '${olderThanDays} days'`,
        `DELETE FROM campaign_analytics WHERE date < CURRENT_DATE - INTERVAL '${olderThanDays} days'`,
        `DELETE FROM roi_analytics WHERE date < CURRENT_DATE - INTERVAL '${olderThanDays} days'`,
        `DELETE FROM performance_metrics WHERE date < CURRENT_DATE - INTERVAL '${olderThanDays} days'`
      ];

      for (const query of cleanupQueries) {
        await this.db.query(query);
      }

      console.log(`✅ Cleaned up analytics data older than ${olderThanDays} days`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await this.db.end();
    }
  }
}

module.exports = AnalyticsService;
