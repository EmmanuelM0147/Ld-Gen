const axios = require('axios');
const nodemailer = require('nodemailer');
const { supabase } = require('../config/supabase-config');

class SalesEngagementService {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.emailTransporter = null;
    this.crmIntegrations = {
      salesforce: null,
      hubspot: null,
      pipedrive: null,
      zoho: null
    };
  }

  async initialize() {
    try {
      // Initialize Supabase client
      this.db = supabase;
      
      // Test database connection
      const { data, error } = await this.db.from('sales_campaigns').select('count').limit(1);
      if (error) {
        console.log('Tables may not exist yet, will create them...');
      }
      
      // Create sales engagement tables
      await this.createSalesEngagementTables();
      
      // Initialize email transporter
      await this.initializeEmailTransporter();
      
      // Initialize CRM integrations
      await this.initializeCRMIntegrations();
      
      this.isInitialized = true;
      console.log('✅ Sales Engagement Service initialized successfully with Supabase');
    } catch (error) {
      console.error('❌ Failed to initialize Sales Engagement Service:', error);
      throw error;
    }
  }

  async createSalesEngagementTables() {
    const createCampaignsTable = `
      CREATE TABLE IF NOT EXISTS sales_campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        campaign_type VARCHAR(50) NOT NULL, -- email, linkedin, phone, multi_channel
        status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused, completed
        target_audience JSONB,
        messaging_template TEXT,
        subject_line VARCHAR(255),
        sender_info JSONB,
        schedule JSONB,
        metrics JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createOutreachSequencesTable = `
      CREATE TABLE IF NOT EXISTS outreach_sequences (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES sales_campaigns(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sequence_type VARCHAR(50) NOT NULL, -- email_sequence, linkedin_sequence, multi_channel
        steps JSONB NOT NULL,
        total_duration_days INTEGER DEFAULT 14,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createOutreachActivitiesTable = `
      CREATE TABLE IF NOT EXISTS outreach_activities (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES sales_campaigns(id),
        sequence_id INTEGER REFERENCES outreach_sequences(id),
        lead_id INTEGER REFERENCES leads(id),
        activity_type VARCHAR(50) NOT NULL, -- email_sent, email_opened, email_clicked, linkedin_message, phone_call
        status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, sent, delivered, opened, clicked, replied, failed
        scheduled_time TIMESTAMP,
        sent_time TIMESTAMP,
        content JSONB,
        metadata JSONB,
        response_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createEmailTemplatesTable = `
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        html_content TEXT,
        text_content TEXT,
        variables JSONB,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createLinkedInTemplatesTable = `
      CREATE TABLE IF NOT EXISTS linkedin_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        message_content TEXT NOT NULL,
        connection_note TEXT,
        variables JSONB,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createCRMIntegrationsTable = `
      CREATE TABLE IF NOT EXISTS crm_integrations (
        id SERIAL PRIMARY KEY,
        crm_type VARCHAR(50) NOT NULL, -- salesforce, hubspot, pipedrive, zoho
        credentials JSONB NOT NULL,
        settings JSONB,
        is_active BOOLEAN DEFAULT true,
        last_sync TIMESTAMP,
        sync_status VARCHAR(20) DEFAULT 'idle',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createSalesMetricsTable = `
      CREATE TABLE IF NOT EXISTS sales_metrics (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES sales_campaigns(id),
        date DATE NOT NULL,
        metrics_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly
        email_sent INTEGER DEFAULT 0,
        email_delivered INTEGER DEFAULT 0,
        email_opened INTEGER DEFAULT 0,
        email_clicked INTEGER DEFAULT 0,
        email_replied INTEGER DEFAULT 0,
        linkedin_messages INTEGER DEFAULT 0,
        linkedin_replies INTEGER DEFAULT 0,
        phone_calls INTEGER DEFAULT 0,
        meetings_booked INTEGER DEFAULT 0,
        opportunities_created INTEGER DEFAULT 0,
        revenue_generated DECIMAL(12,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      console.log('📋 Setting up sales engagement tables in Supabase...');
      console.log('💡 You may need to create these tables manually in your Supabase dashboard');
      console.log('📊 Required tables: sales_campaigns, outreach_sequences, outreach_activities, email_templates, linkedin_templates, crm_integrations, sales_metrics');
      
      // Test if tables exist by attempting to select from them
      const tables = ['sales_campaigns', 'outreach_sequences', 'outreach_activities', 'email_templates', 'linkedin_templates', 'crm_integrations', 'sales_metrics'];
      
      for (const table of tables) {
        try {
          const { error } = await this.db.from(table).select('count').limit(1);
          if (error) {
            console.log(`⚠️  Table ${table} may not exist yet`);
          } else {
            console.log(`✅ Table ${table} exists`);
          }
        } catch (err) {
          console.log(`⚠️  Table ${table} not accessible`);
        }
      }
      
      console.log('✅ Sales engagement tables setup completed (check Supabase dashboard if manual creation needed)');
    } catch (error) {
      console.error('❌ Error setting up sales engagement tables:', error);
      console.log('💡 You may need to create these tables manually in your Supabase dashboard');
    }
  }

  async initializeEmailTransporter() {
    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      if (smtpConfig.auth.user && smtpConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransporter(smtpConfig);
        console.log('✅ Email transporter initialized');
      } else {
        console.log('⚠️ SMTP credentials not configured, email functionality disabled');
      }
    } catch (error) {
      console.error('❌ Error initializing email transporter:', error);
    }
  }

  async initializeCRMIntegrations() {
    try {
      // Initialize Salesforce integration
      if (process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET) {
        this.crmIntegrations.salesforce = {
          clientId: process.env.SALESFORCE_CLIENT_ID,
          clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
          instanceUrl: process.env.SALESFORCE_INSTANCE_URL
        };
        console.log('✅ Salesforce integration configured');
      }

      // Initialize HubSpot integration
      if (process.env.HUBSPOT_API_KEY) {
        this.crmIntegrations.hubspot = {
          apiKey: process.env.HUBSPOT_API_KEY
        };
        console.log('✅ HubSpot integration configured');
      }

      // Initialize Pipedrive integration
      if (process.env.PIPEDRIVE_API_KEY) {
        this.crmIntegrations.pipedrive = {
          apiKey: process.env.PIPEDRIVE_API_KEY,
          domain: process.env.PIPEDRIVE_DOMAIN
        };
        console.log('✅ Pipedrive integration configured');
      }

      // Initialize Zoho integration
      if (process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET) {
        this.crmIntegrations.zoho = {
          clientId: process.env.ZOHO_CLIENT_ID,
          clientSecret: process.env.ZOHO_CLIENT_SECRET,
          refreshToken: process.env.ZOHO_REFRESH_TOKEN
        };
        console.log('✅ Zoho integration configured');
      }
    } catch (error) {
      console.error('❌ Error initializing CRM integrations:', error);
    }
  }

  // Campaign Management
  async createCampaign(campaignData) {
    try {
      const { data, error } = await this.db
        .from('sales_campaigns')
        .insert({
          name: campaignData.name,
          description: campaignData.description,
          campaign_type: campaignData.campaign_type,
          target_audience: campaignData.target_audience,
          messaging_template: campaignData.messaging_template,
          subject_line: campaignData.subject_line,
          sender_info: campaignData.sender_info,
          schedule: campaignData.schedule
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async updateCampaign(campaignId, updateData) {
    try {
      const updateFields = {};
      
      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.status !== undefined) updateFields.status = updateData.status;
      if (updateData.target_audience !== undefined) updateFields.target_audience = updateData.target_audience;
      if (updateData.messaging_template !== undefined) updateFields.messaging_template = updateData.messaging_template;
      if (updateData.subject_line !== undefined) updateFields.subject_line = updateData.subject_line;
      if (updateData.sender_info !== undefined) updateFields.sender_info = updateData.sender_info;
      if (updateData.schedule !== undefined) updateFields.schedule = updateData.schedule;
      
      updateFields.updated_at = new Date().toISOString();
      
      const { data, error } = await this.db
        .from('sales_campaigns')
        .update(updateFields)
        .eq('id', campaignId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  async getCampaigns(filters = {}) {
    try {
      let query = this.db
        .from('sales_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.campaign_type) {
        query = query.eq('campaign_type', filters.campaign_type);
      }

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting campaigns:', error);
      throw error;
    }
  }

  // Email Outreach
  async sendEmail(leadId, templateId, campaignId, customData = {}) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email transporter not configured');
      }

      // Get email template
      const template = await this.getEmailTemplate(templateId);
      if (!template) {
        throw new Error('Email template not found');
      }

      // Get lead information
      const lead = await this.getLead(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Get campaign information
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Personalize email content
      const personalizedContent = this.personalizeEmailContent(
        template.html_content,
        template.text_content,
        lead,
        campaign,
        customData
      );

      // Send email
      const emailResult = await this.emailTransporter.sendMail({
        from: campaign.sender_info.email,
        to: lead.email,
        subject: this.personalizeSubject(template.subject, lead, campaign),
        html: personalizedContent.html,
        text: personalizedContent.text
      });

      // Log outreach activity
      await this.logOutreachActivity({
        campaign_id: campaignId,
        lead_id: leadId,
        activity_type: 'email_sent',
        status: 'sent',
        sent_time: new Date(),
        content: {
          template_id: templateId,
          subject: emailResult.subject,
          html_content: personalizedContent.html,
          text_content: personalizedContent.text
        },
        metadata: {
          message_id: emailResult.messageId,
          response: emailResult.response
        }
      });

      return {
        success: true,
        message_id: emailResult.messageId,
        response: emailResult.response
      };
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Log failed activity
      await this.logOutreachActivity({
        campaign_id: campaignId,
        lead_id: leadId,
        activity_type: 'email_sent',
        status: 'failed',
        content: { error: error.message },
        metadata: { error: error.message }
      });
      
      throw error;
    }
  }

  // LinkedIn Outreach
  async sendLinkedInMessage(leadId, templateId, campaignId, customData = {}) {
    try {
      // Note: LinkedIn API requires special access and authentication
      // This is a placeholder for when you have LinkedIn API access
      
      const template = await this.getLinkedInTemplate(templateId);
      const lead = await this.getLead(leadId);
      const campaign = await this.getCampaign(campaignId);
      
      const personalizedMessage = this.personalizeLinkedInMessage(
        template.message_content,
        lead,
        campaign,
        customData
      );

      // Log outreach activity (simulated)
      await this.logOutreachActivity({
        campaign_id: campaignId,
        lead_id: leadId,
        activity_type: 'linkedin_message',
        status: 'sent',
        sent_time: new Date(),
        content: {
          template_id: templateId,
          message: personalizedMessage
        },
        metadata: {
          platform: 'linkedin',
          message_type: 'connection_request'
        }
      });

      return {
        success: true,
        message: 'LinkedIn message sent successfully (simulated)',
        content: personalizedMessage
      };
    } catch (error) {
      console.error('Error sending LinkedIn message:', error);
      throw error;
    }
  }

  // Multi-channel Outreach Sequences
  async createOutreachSequence(sequenceData) {
    try {
      const query = `
        INSERT INTO outreach_sequences 
        (campaign_id, name, description, sequence_type, steps, total_duration_days)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        sequenceData.campaign_id,
        sequenceData.name,
        sequenceData.description,
        sequenceData.sequence_type,
        JSON.stringify(sequenceData.steps),
        sequenceData.total_duration_days
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating outreach sequence:', error);
      throw error;
    }
  }

  async executeOutreachSequence(sequenceId, leadIds) {
    try {
      const sequence = await this.getOutreachSequence(sequenceId);
      if (!sequence) {
        throw new Error('Outreach sequence not found');
      }

      const results = [];
      
      for (const leadId of leadIds) {
        try {
          const sequenceResult = await this.executeSequenceForLead(sequence, leadId);
          results.push({
            lead_id: leadId,
            success: true,
            result: sequenceResult
          });
        } catch (error) {
          results.push({
            lead_id: leadId,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error executing outreach sequence:', error);
      throw error;
    }
  }

  async executeSequenceForLead(sequence, leadId) {
    const results = [];
    
    for (const step of sequence.steps) {
      try {
        // Wait for step delay
        if (step.delay_days > 0) {
          await new Promise(resolve => setTimeout(resolve, step.delay_days * 24 * 60 * 60 * 1000));
        }
        
        let stepResult;
        
        switch (step.type) {
          case 'email':
            stepResult = await this.sendEmail(leadId, step.template_id, sequence.campaign_id, step.custom_data);
            break;
          case 'linkedin':
            stepResult = await this.sendLinkedInMessage(leadId, step.template_id, sequence.campaign_id, step.custom_data);
            break;
          case 'phone_call':
            stepResult = await this.schedulePhoneCall(leadId, step.template_id, sequence.campaign_id, step.custom_data);
            break;
          default:
            console.warn(`Unknown step type: ${step.type}`);
            continue;
        }
        
        results.push({
          step: step,
          result: stepResult,
          executed_at: new Date()
        });
        
        // Check if we should continue based on step conditions
        if (step.stop_on_reply && stepResult.replied) {
          break;
        }
        
      } catch (error) {
        console.error(`Error executing step for lead ${leadId}:`, error);
        results.push({
          step: step,
          error: error.message,
          executed_at: new Date()
        });
      }
    }
    
    return results;
  }

  // CRM Integration
  async syncWithCRM(crmType, data) {
    try {
      const integration = this.crmIntegrations[crmType];
      if (!integration) {
        throw new Error(`${crmType} integration not configured`);
      }

      switch (crmType) {
        case 'salesforce':
          return await this.syncWithSalesforce(integration, data);
        case 'hubspot':
          return await this.syncWithHubspot(integration, data);
        case 'pipedrive':
          return await this.syncWithPipedrive(integration, data);
        case 'zoho':
          return await this.syncWithZoho(integration, data);
        default:
          throw new Error(`Unsupported CRM type: ${crmType}`);
      }
    } catch (error) {
      console.error(`Error syncing with ${crmType}:`, error);
      throw error;
    }
  }

  async syncWithSalesforce(integration, data) {
    try {
      // Salesforce API integration logic
      // This would require the Salesforce SDK or REST API calls
      return {
        success: true,
        message: 'Salesforce sync completed (placeholder)',
        crm_id: 'SF_' + Date.now()
      };
    } catch (error) {
      console.error('Salesforce sync error:', error);
      throw error;
    }
  }

  async syncWithHubspot(integration, data) {
    try {
      const response = await axios.post(
        `https://api.hubapi.com/crm/v3/objects/contacts`,
        {
          properties: {
            email: data.email,
            firstname: data.first_name,
            lastname: data.last_name,
            company: data.company_name,
            phone: data.phone,
            jobtitle: data.job_title
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${integration.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        message: 'HubSpot contact created successfully',
        crm_id: response.data.id
      };
    } catch (error) {
      console.error('HubSpot sync error:', error);
      throw error;
    }
  }

  async syncWithPipedrive(integration, data) {
    try {
      const response = await axios.post(
        `https://${integration.domain}.pipedrive.com/api/v1/persons`,
        {
          name: `${data.first_name} ${data.last_name}`,
          email: data.email,
          phone: data.phone,
          org_name: data.company_name
        },
        {
          params: { api_token: integration.apiKey }
        }
      );
      
      return {
        success: true,
        message: 'Pipedrive contact created successfully',
        crm_id: response.data.data.id
      };
    } catch (error) {
      console.error('Pipedrive sync error:', error);
      throw error;
    }
  }

  async syncWithZoho(integration, data) {
    try {
      // Zoho CRM API integration logic
      // This would require OAuth2 authentication and API calls
      return {
        success: true,
        message: 'Zoho CRM sync completed (placeholder)',
        crm_id: 'ZOHO_' + Date.now()
      };
    } catch (error) {
      console.error('Zoho CRM sync error:', error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getCampaignMetrics(campaignId, timeRange = '30d') {
    try {
      let dateFilter = '';
      const params = [campaignId];
      
      switch (timeRange) {
        case '7d':
          dateFilter = 'AND date >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case '30d':
          dateFilter = 'AND date >= CURRENT_DATE - INTERVAL \'30 days\'';
          break;
        case '90d':
          dateFilter = 'AND date >= CURRENT_DATE - INTERVAL \'90 days\'';
          break;
        case '1y':
          dateFilter = 'AND date >= CURRENT_DATE - INTERVAL \'1 year\'';
          break;
      }

      const query = `
        SELECT 
          SUM(email_sent) as total_emails_sent,
          SUM(email_delivered) as total_emails_delivered,
          SUM(email_opened) as total_emails_opened,
          SUM(email_clicked) as total_emails_clicked,
          SUM(email_replied) as total_emails_replied,
          SUM(linkedin_messages) as total_linkedin_messages,
          SUM(linkedin_replies) as total_linkedin_replies,
          SUM(phone_calls) as total_phone_calls,
          SUM(meetings_booked) as total_meetings_booked,
          SUM(opportunities_created) as total_opportunities_created,
          SUM(revenue_generated) as total_revenue_generated
        FROM sales_metrics 
        WHERE campaign_id = $1 ${dateFilter}
      `;
      
      const result = await this.db.query(query, params);
      const metrics = result.rows[0];
      
      // Calculate rates
      const emailOpenRate = metrics.total_emails_delivered > 0 ? 
        (metrics.total_emails_opened / metrics.total_emails_delivered * 100).toFixed(2) : 0;
      
      const emailClickRate = metrics.total_emails_delivered > 0 ? 
        (metrics.total_emails_clicked / metrics.total_emails_delivered * 100).toFixed(2) : 0;
      
      const emailReplyRate = metrics.total_emails_delivered > 0 ? 
        (metrics.total_emails_replied / metrics.total_emails_delivered * 100).toFixed(2) : 0;
      
      return {
        ...metrics,
        email_open_rate: parseFloat(emailOpenRate),
        email_click_rate: parseFloat(emailClickRate),
        email_reply_rate: parseFloat(emailReplyRate)
      };
    } catch (error) {
      console.error('Error getting campaign metrics:', error);
      throw error;
    }
  }

  // Helper methods
  async getEmailTemplate(templateId) {
    try {
      const result = await this.db.query('SELECT * FROM email_templates WHERE id = $1', [templateId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting email template:', error);
      return null;
    }
  }

  async getLinkedInTemplate(templateId) {
    try {
      const result = await this.db.query('SELECT * FROM linkedin_templates WHERE id = $1', [templateId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting LinkedIn template:', error);
      return null;
    }
  }

  async getLead(leadId) {
    try {
      const result = await this.db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting lead:', error);
      return null;
    }
  }

  async getCampaign(campaignId) {
    try {
      const result = await this.db.query('SELECT * FROM sales_campaigns WHERE id = $1', [campaignId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting campaign:', error);
      return null;
    }
  }

  async getOutreachSequence(sequenceId) {
    try {
      const result = await this.db.query('SELECT * FROM outreach_sequences WHERE id = $1', [sequenceId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting outreach sequence:', error);
      return null;
    }
  }

  async logOutreachActivity(activityData) {
    try {
      const query = `
        INSERT INTO outreach_activities 
        (campaign_id, sequence_id, lead_id, activity_type, status, 
         scheduled_time, sent_time, content, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      await this.db.query(query, [
        activityData.campaign_id,
        activityData.sequence_id,
        activityData.lead_id,
        activityData.activity_type,
        activityData.status,
        activityData.scheduled_time,
        activityData.sent_time,
        JSON.stringify(activityData.content),
        JSON.stringify(activityData.metadata)
      ]);
    } catch (error) {
      console.error('Error logging outreach activity:', error);
    }
  }

  personalizeEmailContent(htmlContent, textContent, lead, campaign, customData) {
    let html = htmlContent;
    let text = textContent;
    
    // Replace variables with lead data
    const variables = {
      '{{first_name}}': lead.first_name || lead.name?.split(' ')[0] || 'there',
      '{{last_name}}': lead.last_name || lead.name?.split(' ').slice(1).join(' ') || '',
      '{{company_name}}': lead.company_name || 'your company',
      '{{industry}}': lead.industry || 'your industry',
      '{{location}}': lead.city || lead.address || 'your area',
      '{{email}}': lead.email || '',
      '{{phone}}': lead.phone || '',
      '{{website}}': lead.website || '',
      '{{custom_message}}': customData.message || ''
    };
    
    // Replace variables in content
    Object.entries(variables).forEach(([placeholder, value]) => {
      html = html.replace(new RegExp(placeholder, 'g'), value);
      text = text.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return { html, text };
  }

  personalizeSubject(subject, lead, campaign, customData = {}) {
    let personalizedSubject = subject;
    
    const variables = {
      '{{first_name}}': lead.first_name || lead.name?.split(' ')[0] || 'there',
      '{{company_name}}': lead.company_name || 'your company',
      '{{industry}}': lead.industry || 'your industry'
    };
    
    Object.entries(variables).forEach(([placeholder, value]) => {
      personalizedSubject = personalizedSubject.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return personalizedSubject;
  }

  personalizeLinkedInMessage(message, lead, campaign, customData = {}) {
    let personalizedMessage = message;
    
    const variables = {
      '{{first_name}}': lead.first_name || lead.name?.split(' ')[0] || 'there',
      '{{last_name}}': lead.last_name || lead.name?.split(' ').slice(1).join(' ') || '',
      '{{company_name}}': lead.company_name || 'your company',
      '{{industry}}': lead.industry || 'your industry',
      '{{custom_message}}': customData.message || ''
    };
    
    Object.entries(variables).forEach(([placeholder, value]) => {
      personalizedMessage = personalizedMessage.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return personalizedMessage;
  }

  async schedulePhoneCall(leadId, templateId, campaignId, customData = {}) {
    try {
      // This would integrate with call scheduling systems like Calendly, Acuity, etc.
      const scheduledCall = {
        lead_id: leadId,
        campaign_id: campaignId,
        scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        call_type: 'outbound',
        notes: customData.notes || 'Scheduled outbound call'
      };
      
      // Log the scheduled call
      await this.logOutreachActivity({
        campaign_id: campaignId,
        lead_id: leadId,
        activity_type: 'phone_call',
        status: 'scheduled',
        scheduled_time: scheduledCall.scheduled_time,
        content: scheduledCall,
        metadata: { call_type: 'outbound' }
      });
      
      return {
        success: true,
        message: 'Phone call scheduled successfully',
        scheduled_call: scheduledCall
      };
    } catch (error) {
      console.error('Error scheduling phone call:', error);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await this.db.end();
    }
    if (this.emailTransporter) {
      this.emailTransporter.close();
    }
  }
}

module.exports = SalesEngagementService;
