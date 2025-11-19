const express = require('express');
const { supabase } = require('../config/supabase-config');
const router = express.Router();

// Get application settings
router.get('/', async (req, res) => {
  try {
    // For now, return default settings
    // In a real app, you'd store these in a settings table
    const settings = {
      emailMarketing: {
        dailyLimit: 200,
        trackingEnabled: true,
        maxRetries: 3,
        defaultFromEmail: 'noreply@yourcompany.com',
        defaultFromName: 'Your Company'
      },
      notifications: {
        emailNotifications: true,
        slackNotifications: false,
        slackWebhook: '',
        notificationEmails: ['admin@yourcompany.com']
      },
      security: {
        requireEmailVerification: false,
        maxLoginAttempts: 5,
        sessionTimeout: 24, // hours
        passwordMinLength: 8
      },
      general: {
        companyName: 'Your Company',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD'
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update application settings
router.put('/', async (req, res) => {
  try {
    const { emailMarketing, notifications, security, general } = req.body;
    
    // Validate settings
    if (emailMarketing && emailMarketing.dailyLimit) {
      if (emailMarketing.dailyLimit < 1 || emailMarketing.dailyLimit > 1000) {
        return res.status(400).json({ error: 'Daily limit must be between 1 and 1000' });
      }
    }

    if (security && security.passwordMinLength) {
      if (security.passwordMinLength < 6 || security.passwordMinLength > 50) {
        return res.status(400).json({ error: 'Password minimum length must be between 6 and 50' });
      }
    }

    // In a real app, you'd save these to a settings table
    // For now, just return success
    res.json({ 
      message: 'Settings updated successfully',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get email marketing settings
router.get('/email-marketing', async (req, res) => {
  try {
    const settings = {
      dailyLimit: 200,
      trackingEnabled: true,
      maxRetries: 3,
      defaultFromEmail: 'noreply@yourcompany.com',
      defaultFromName: 'Your Company',
      smtpSettings: {
        host: 'smtp.gmail.com',
        port: 587,
        encryption: 'tls'
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching email marketing settings:', error);
    res.status(500).json({ error: 'Failed to fetch email marketing settings' });
  }
});

// Update email marketing settings
router.put('/email-marketing', async (req, res) => {
  try {
    const { dailyLimit, trackingEnabled, maxRetries, defaultFromEmail, defaultFromName } = req.body;
    
    // Validate settings
    if (dailyLimit && (dailyLimit < 1 || dailyLimit > 1000)) {
      return res.status(400).json({ error: 'Daily limit must be between 1 and 1000' });
    }

    if (maxRetries && (maxRetries < 1 || maxRetries > 10)) {
      return res.status(400).json({ error: 'Max retries must be between 1 and 10' });
    }

    res.json({ 
      message: 'Email marketing settings updated successfully',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating email marketing settings:', error);
    res.status(500).json({ error: 'Failed to update email marketing settings' });
  }
});

// Get notification settings
router.get('/notifications', async (req, res) => {
  try {
    const settings = {
      emailNotifications: true,
      slackNotifications: false,
      slackWebhook: '',
      notificationEmails: ['admin@yourcompany.com'],
      notificationTypes: {
        newLead: true,
        campaignComplete: true,
        systemAlerts: true,
        dailyReports: false
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// Update notification settings
router.put('/notifications', async (req, res) => {
  try {
    const { emailNotifications, slackNotifications, slackWebhook, notificationEmails, notificationTypes } = req.body;
    
    // Validate email addresses
    if (notificationEmails) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of notificationEmails) {
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: `Invalid email address: ${email}` });
        }
      }
    }

    res.json({ 
      message: 'Notification settings updated successfully',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Get security settings
router.get('/security', async (req, res) => {
  try {
    const settings = {
      requireEmailVerification: false,
      maxLoginAttempts: 5,
      sessionTimeout: 24, // hours
      passwordMinLength: 8,
      twoFactorAuth: false,
      allowedIPs: [],
      passwordPolicy: {
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({ error: 'Failed to fetch security settings' });
  }
});

// Update security settings
router.put('/security', async (req, res) => {
  try {
    const { requireEmailVerification, maxLoginAttempts, sessionTimeout, passwordMinLength, twoFactorAuth, allowedIPs, passwordPolicy } = req.body;
    
    // Validate settings
    if (maxLoginAttempts && (maxLoginAttempts < 1 || maxLoginAttempts > 20)) {
      return res.status(400).json({ error: 'Max login attempts must be between 1 and 20' });
    }

    if (sessionTimeout && (sessionTimeout < 1 || sessionTimeout > 168)) {
      return res.status(400).json({ error: 'Session timeout must be between 1 and 168 hours' });
    }

    if (passwordMinLength && (passwordMinLength < 6 || passwordMinLength > 50)) {
      return res.status(400).json({ error: 'Password minimum length must be between 6 and 50' });
    }

    res.json({ 
      message: 'Security settings updated successfully',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({ error: 'Failed to update security settings' });
  }
});

module.exports = router;
