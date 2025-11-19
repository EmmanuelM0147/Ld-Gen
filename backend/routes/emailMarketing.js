const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase-config');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const router = express.Router();

// Validation middleware
const validateSMTPCredentials = [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('host').trim().isLength({ min: 1 }).withMessage('Host is required'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),
  body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
  body('password').trim().isLength({ min: 1 }).withMessage('Password is required'),
  body('encryption').isIn(['none', 'ssl', 'tls']).withMessage('Encryption must be none, ssl, or tls'),
  body('daily_limit').isInt({ min: 1, max: 1000 }).withMessage('Daily limit must be between 1 and 1000')
];

const validateEmailTemplate = [
  body('name').trim().isLength({ min: 1 }).withMessage('Template name is required'),
  body('subject').trim().isLength({ min: 1 }).withMessage('Subject is required'),
  body('body').trim().isLength({ min: 10 }).withMessage('Body must be at least 10 characters')
];

const validateEmailCampaign = [
  body('name').trim().isLength({ min: 1 }).withMessage('Campaign name is required'),
  body('template_id').isInt({ min: 1 }).withMessage('Template ID is required'),
  body('filters').isObject().withMessage('Filters must be an object')
];

// Helper function to test SMTP connection
const testSMTPConnection = async (credentials) => {
  try {
    const transporter = nodemailer.createTransporter({
      host: credentials.host,
      port: credentials.port,
      secure: credentials.encryption === 'ssl',
      auth: {
        user: credentials.username,
        pass: credentials.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to replace template variables
const replaceTemplateVariables = (template, variables) => {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
};

// Helper function to generate tracking ID
const generateTrackingId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// SMTP Credentials Routes
router.post('/smtp', validateSMTPCredentials, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const credentials = req.body;
    
    // Test SMTP connection
    const testResult = await testSMTPConnection(credentials);
    if (!testResult.success) {
      return res.status(400).json({ error: 'SMTP connection failed', details: testResult.error });
    }

    const { data, error } = await supabase
      .from('smtp_credentials')
      .insert([credentials])
      .select()
      .single();

    if (error) {
      console.error('Error creating SMTP credentials:', error);
      return res.status(500).json({ error: 'Failed to create SMTP credentials' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in SMTP creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/smtp', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('smtp_credentials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching SMTP credentials:', error);
      return res.status(500).json({ error: 'Failed to fetch SMTP credentials' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in SMTP fetch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/smtp/:id', validateSMTPCredentials, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const credentials = req.body;

    // Test SMTP connection
    const testResult = await testSMTPConnection(credentials);
    if (!testResult.success) {
      return res.status(400).json({ error: 'SMTP connection failed', details: testResult.error });
    }

    const { data, error } = await supabase
      .from('smtp_credentials')
      .update(credentials)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'SMTP credentials not found' });
      }
      console.error('Error updating SMTP credentials:', error);
      return res.status(500).json({ error: 'Failed to update SMTP credentials' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in SMTP update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/smtp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('smtp_credentials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting SMTP credentials:', error);
      return res.status(500).json({ error: 'Failed to delete SMTP credentials' });
    }

    res.json({ message: 'SMTP credentials deleted successfully' });
  } catch (error) {
    console.error('Error in SMTP deletion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email Templates Routes
router.post('/templates', validateEmailTemplate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = req.body;
    
    // Extract variables from template body
    const variableRegex = /{{(\w+)}}/g;
    const variables = [];
    let match;
    while ((match = variableRegex.exec(template.body)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    template.variables = variables;

    const { data, error } = await supabase
      .from('email_templates')
      .insert([template])
      .select()
      .single();

    if (error) {
      console.error('Error creating email template:', error);
      return res.status(500).json({ error: 'Failed to create email template' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in template creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching email templates:', error);
      return res.status(500).json({ error: 'Failed to fetch email templates' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in template fetch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/templates/:id', validateEmailTemplate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const template = req.body;
    
    // Extract variables from template body
    const variableRegex = /{{(\w+)}}/g;
    const variables = [];
    let match;
    while ((match = variableRegex.exec(template.body)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    template.variables = variables;

    const { data, error } = await supabase
      .from('email_templates')
      .update(template)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Email template not found' });
      }
      console.error('Error updating email template:', error);
      return res.status(500).json({ error: 'Failed to update email template' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in template update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting email template:', error);
      return res.status(500).json({ error: 'Failed to delete email template' });
    }

    res.json({ message: 'Email template deleted successfully' });
  } catch (error) {
    console.error('Error in template deletion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email Campaigns Routes
router.post('/campaigns', validateEmailCampaign, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const campaign = req.body;
    campaign.status = 'draft';
    campaign.created_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('email_campaigns')
      .insert([campaign])
      .select()
      .single();

    if (error) {
      console.error('Error creating email campaign:', error);
      return res.status(500).json({ error: 'Failed to create email campaign' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in campaign creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/campaigns', async (req, res) => {
  try {
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates(name, subject),
        smtp_credentials(name, host)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching email campaigns:', error);
      return res.status(500).json({ error: 'Failed to fetch email campaigns' });
    }

    // Get aggregated stats for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const { count: totalRecipients } = await supabase
          .from('campaign_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id);

        const { count: sentEmails } = await supabase
          .from('campaign_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'sent');

        const { count: openedEmails } = await supabase
          .from('email_tracking')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('event_type', 'open');

        return {
          ...campaign,
          stats: {
            totalRecipients: totalRecipients || 0,
            sentEmails: sentEmails || 0,
            openedEmails: openedEmails || 0,
            openRate: totalRecipients > 0 ? ((openedEmails || 0) / totalRecipients * 100).toFixed(1) : 0
          }
        };
      })
    );

    res.json(campaignsWithStats);
  } catch (error) {
    console.error('Error in campaign fetch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates(*),
        smtp_credentials(*)
      `)
      .eq('id', id)
      .single();

    if (campaignError) {
      if (campaignError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      console.error('Error fetching campaign:', campaignError);
      return res.status(500).json({ error: 'Failed to fetch campaign' });
    }

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', id);

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError);
      return res.status(500).json({ error: 'Failed to fetch campaign recipients' });
    }

    res.json({
      ...campaign,
      recipients: recipients || []
    });

  } catch (error) {
    console.error('Error in campaign fetch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Campaign
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { smtp_credential_id } = req.body;

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates(*),
        smtp_credentials(*)
      `)
      .eq('id', id)
      .single();

    if (campaignError) {
      if (campaignError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      console.error('Error fetching campaign:', campaignError);
      return res.status(500).json({ error: 'Failed to fetch campaign' });
    }

    // Get SMTP credentials
    const { data: smtpCredentials, error: smtpError } = await supabase
      .from('smtp_credentials')
      .select('*')
      .eq('id', smtp_credential_id)
      .single();

    if (smtpError) {
      return res.status(400).json({ error: 'Invalid SMTP credentials' });
    }

    // Check daily limit
    if (smtpCredentials.daily_sent >= smtpCredentials.daily_limit) {
      return res.status(400).json({ error: 'Daily sending limit reached for this SMTP account' });
    }

    // Get leads based on campaign filters
    let query = supabase.from('business_contacts').select('*');
    
    if (campaign.filters.industry) {
      query = query.eq('industry', campaign.filters.industry);
    }
    if (campaign.filters.status) {
      query = query.eq('status', campaign.filters.status);
    }
    if (campaign.filters.city) {
      query = query.eq('city', campaign.filters.city);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return res.status(500).json({ error: 'Failed to fetch leads for campaign' });
    }

    if (!leads || leads.length === 0) {
      return res.status(400).json({ error: 'No leads found matching campaign filters' });
    }

    // Create campaign recipients
    const recipients = leads.map(lead => ({
      campaign_id: id,
      lead_id: lead.id,
      email: lead.email,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    const { error: recipientsError } = await supabase
      .from('campaign_recipients')
      .insert(recipients);

    if (recipientsError) {
      console.error('Error creating recipients:', recipientsError);
      return res.status(500).json({ error: 'Failed to create campaign recipients' });
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({ status: 'sending', sent_at: new Date().toISOString() })
      .eq('id', id);

    // Start sending emails in background
    processEmailQueue(id, smtpCredentials, campaign, leads);

    res.json({
      message: 'Campaign started successfully',
      recipientsCount: leads.length,
      campaignId: id
    });

  } catch (error) {
    console.error('Error in campaign send:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email tracking pixel
router.get('/track/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    // Record email open
    const { error } = await supabase
      .from('email_tracking')
      .insert([{
        tracking_id: trackingId,
        event_type: 'open',
        timestamp: new Date().toISOString(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }]);

    if (error) {
      console.error('Error recording email open:', error);
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(pixel);

  } catch (error) {
    console.error('Error in email tracking:', error);
    res.status(500).send('Error');
  }
});

// Reset daily sending limits
router.post('/reset-daily-limits', async (req, res) => {
  try {
    const { error } = await supabase
      .from('smtp_credentials')
      .update({ daily_sent: 0 });

    if (error) {
      console.error('Error resetting daily limits:', error);
      return res.status(500).json({ error: 'Failed to reset daily limits' });
    }

    res.json({ message: 'Daily limits reset successfully' });
  } catch (error) {
    console.error('Error in daily limit reset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to process email queue
async function processEmailQueue(campaignId, smtpCredentials, campaign, leads) {
  try {
    const transporter = nodemailer.createTransporter({
      host: smtpCredentials.host,
      port: smtpCredentials.port,
      secure: smtpCredentials.encryption === 'ssl',
      auth: {
        user: smtpCredentials.username,
        pass: smtpCredentials.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    let sentCount = 0;
    const maxEmails = Math.min(leads.length, smtpCredentials.daily_limit - smtpCredentials.daily_sent);

    for (let i = 0; i < maxEmails; i++) {
      const lead = leads[i];
      
      try {
        // Replace template variables
        const subject = replaceTemplateVariables(campaign.email_templates.subject, {
          first_name: lead.first_name || 'there',
          company: lead.company_name || 'your company',
          industry: lead.industry || 'your industry'
        });

        const body = replaceTemplateVariables(campaign.email_templates.body, {
          first_name: lead.first_name || 'there',
          company: lead.company_name || 'your company',
          industry: lead.industry || 'your industry',
          city: lead.city || 'your location'
        });

        // Generate tracking ID
        const trackingId = generateTrackingId();

        // Add tracking pixel
        const trackingPixel = `<img src="${process.env.BACKEND_URL || 'http://localhost:5000'}/api/email-marketing/track/${trackingId}" width="1" height="1" style="display:none;" />`;
        const bodyWithTracking = body + trackingPixel;

        // Send email
        await transporter.sendMail({
          from: smtpCredentials.username,
          to: lead.email,
          subject: subject,
          html: bodyWithTracking
        });

        // Update recipient status
        await supabase
          .from('campaign_recipients')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString(),
            tracking_id: trackingId
          })
          .eq('campaign_id', campaignId)
          .eq('lead_id', lead.id);

        // Update SMTP daily count
        await supabase
          .from('smtp_credentials')
          .update({ daily_sent: smtpCredentials.daily_sent + 1 })
          .eq('id', smtpCredentials.id);

        sentCount++;
        
        // Add delay to avoid overwhelming SMTP server
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error sending email to ${lead.email}:`, error);
        
        // Update recipient status to failed
        await supabase
          .from('campaign_recipients')
          .update({ 
            status: 'failed', 
            error_message: error.message 
          })
          .eq('campaign_id', campaignId)
          .eq('lead_id', lead.id);
      }
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        emails_sent: sentCount
      })
      .eq('id', campaignId);

    console.log(`Campaign ${campaignId} completed. Sent ${sentCount} emails.`);

  } catch (error) {
    console.error('Error processing email queue:', error);
    
    // Update campaign status to failed
    await supabase
      .from('email_campaigns')
      .update({ 
        status: 'failed', 
        error_message: error.message 
      })
      .eq('id', campaignId);
  }
}

module.exports = router;
