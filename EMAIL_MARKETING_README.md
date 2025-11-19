# Email Marketing Automation Feature

This document describes the comprehensive email marketing automation system added to the Lead Manager Dashboard.

## 🚀 Features

### 1. SMTP Credentials Management
- **Multiple SMTP Providers**: Support for Gmail, Outlook, and Custom SMTP servers
- **Connection Testing**: Automatic SMTP connection validation before saving credentials
- **Daily Sending Limits**: Configurable limits per SMTP account (default: 200 emails/day)
- **Rate Limiting**: Built-in protection against email blacklisting
- **Credential Security**: Encrypted storage of SMTP passwords

### 2. Email Templates
- **Variable Support**: Dynamic content with placeholders like `{{first_name}}`, `{{company}}`, `{{industry}}`
- **HTML Support**: Rich email formatting with HTML content
- **Template Library**: Reusable templates for different campaign types
- **Variable Extraction**: Automatic detection of available template variables

### 3. Email Campaigns
- **Targeted Campaigns**: Filter leads by industry, location, and other criteria
- **Campaign Scheduling**: Set specific send times for campaigns
- **Status Tracking**: Monitor campaign progress (draft, sending, completed, failed)
- **Recipient Management**: Automatic lead selection based on filters

### 4. Email Tracking & Analytics
- **Open Tracking**: 1x1 pixel tracking for email opens
- **Click Tracking**: Monitor link clicks and engagement
- **Reply Tracking**: Track email replies and responses
- **Bounce Detection**: Identify and handle bounced emails
- **Performance Metrics**: Open rates, click rates, and conversion tracking

### 5. Smart Email Queue
- **Background Processing**: Non-blocking email sending
- **Retry Logic**: Automatic retry for failed emails
- **Priority System**: Configurable email priority levels
- **Error Handling**: Comprehensive error logging and management

## 🗄️ Database Schema

### New Tables Created

#### `smtp_credentials`
```sql
- id: Primary key
- name: Credential name/description
- provider: SMTP provider (gmail, outlook, custom)
- host: SMTP server hostname
- port: SMTP server port
- username: Email username
- password: Encrypted password
- encryption: Security type (tls, ssl, none)
- daily_limit: Maximum emails per day
- daily_sent: Current day's sent count
- is_active: Whether credentials are active
```

#### `email_templates`
```sql
- id: Primary key
- name: Template name
- subject: Email subject line
- body: Email body content (HTML)
- variables: JSON array of available variables
- is_active: Template status
```

#### `email_campaigns`
```sql
- id: Primary key
- name: Campaign name
- template_id: Reference to email template
- subject: Campaign subject
- body: Campaign body content
- target_filters: JSON filters for lead targeting
- status: Campaign status
- total_recipients: Number of target recipients
- sent_count: Emails sent successfully
- opened_count: Emails opened
- clicked_count: Links clicked
```

#### `campaign_recipients`
```sql
- id: Primary key
- campaign_id: Reference to campaign
- lead_id: Reference to lead
- email: Recipient email address
- status: Email status (pending, sent, opened, clicked, replied, bounced)
- tracking_id: Unique tracking identifier
- timestamps: Various event timestamps
```

#### `email_tracking`
```sql
- id: Primary key
- recipient_id: Reference to recipient
- campaign_id: Reference to campaign
- event_type: Tracking event (open, click, reply, bounce)
- event_data: Additional event information
- ip_address: Recipient IP address
- user_agent: Recipient browser/device info
```

#### `email_queue`
```sql
- id: Primary key
- campaign_id: Reference to campaign
- recipient_id: Reference to recipient
- smtp_credential_id: SMTP account to use
- priority: Email priority level
- retry_count: Number of retry attempts
- status: Queue status (pending, sent, failed)
```

## 🔧 API Endpoints

### SMTP Credentials
- `POST /api/email-marketing/smtp` - Create new SMTP credentials
- `GET /api/email-marketing/smtp` - List all SMTP credentials
- `PUT /api/email-marketing/smtp/:id` - Update SMTP credentials
- `DELETE /api/email-marketing/smtp/:id` - Delete SMTP credentials

### Email Templates
- `POST /api/email-marketing/templates` - Create new template
- `GET /api/email-marketing/templates` - List all templates
- `PUT /api/email-marketing/templates/:id` - Update template
- `DELETE /api/email-marketing/templates/:id` - Delete template

### Email Campaigns
- `POST /api/email-marketing/campaigns` - Create new campaign
- `GET /api/email-marketing/campaigns` - List all campaigns
- `GET /api/email-marketing/campaigns/:id` - Get campaign details
- `POST /api/email-marketing/campaigns/:id/send` - Start campaign

### Tracking
- `GET /api/email-marketing/track/:trackingId` - Email open tracking pixel
- `POST /api/email-marketing/reset-daily-limits` - Reset daily sending limits

## 🎯 Usage Examples

### 1. Setting Up Gmail SMTP
```javascript
// Create Gmail SMTP credentials
const gmailCredentials = {
  name: "My Gmail Account",
  provider: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  username: "your-email@gmail.com",
  password: "your-app-password", // Use App Password, not regular password
  encryption: "tls",
  daily_limit: 200
};

await createSMTPCredentials(gmailCredentials);
```

### 2. Creating an Email Template
```javascript
// Create welcome email template
const welcomeTemplate = {
  name: "Welcome Email",
  subject: "Welcome to {{company}}!",
  body: `
    <h1>Welcome {{first_name}}!</h1>
    <p>We're excited to have you join {{company}}.</p>
    <p>Your industry: {{industry}}</p>
    <p>Location: {{location}}</p>
    <p>Best regards,<br>The {{company}} Team</p>
  `
};

await createEmailTemplate(welcomeTemplate);
```

### 3. Creating and Sending a Campaign
```javascript
// Create targeted campaign
const campaign = {
  name: "Q1 Product Launch",
  template_id: templateId,
  subject: "Exciting New Product Launch!",
  body: "Custom campaign content...",
  target_filters: {
    industry: "Technology",
    location: "New York"
  }
};

const newCampaign = await createEmailCampaign(campaign);

// Send the campaign
await sendEmailCampaign(newCampaign.id, smtpCredentialId);
```

## 🛡️ Security Features

### SMTP Security
- **Connection Testing**: Validates SMTP credentials before saving
- **Encryption Support**: TLS/SSL encryption for secure email transmission
- **Password Protection**: Encrypted storage of sensitive credentials
- **Rate Limiting**: Prevents abuse and blacklisting

### Email Security
- **Tracking Protection**: Respects user privacy with transparent tracking
- **Bounce Handling**: Automatic detection and handling of bounced emails
- **Spam Prevention**: Built-in sending limits and best practices
- **Error Logging**: Comprehensive logging for troubleshooting

## 📊 Monitoring & Analytics

### Real-time Metrics
- **Campaign Status**: Live updates on campaign progress
- **Send Rates**: Monitor email delivery performance
- **Engagement Tracking**: Track opens, clicks, and replies
- **Bounce Rates**: Monitor email deliverability

### Performance Insights
- **Open Rates**: Industry-standard email open tracking
- **Click-through Rates**: Measure link engagement
- **Reply Rates**: Track customer responses
- **Delivery Rates**: Monitor email deliverability

## 🚦 Best Practices

### SMTP Configuration
1. **Use App Passwords**: For Gmail, use App Passwords instead of regular passwords
2. **Start Small**: Begin with lower daily limits and gradually increase
3. **Monitor Reputation**: Check sender reputation regularly
4. **Warm Up Accounts**: Gradually increase sending volume for new accounts

### Email Content
1. **Personalization**: Use available variables for dynamic content
2. **Clear Subject Lines**: Write compelling, non-spammy subject lines
3. **Mobile Optimization**: Ensure emails look good on mobile devices
4. **Call-to-Action**: Include clear next steps for recipients

### Campaign Management
1. **Segment Your Audience**: Use filters to target relevant leads
2. **Test Before Sending**: Preview campaigns before launching
3. **Monitor Performance**: Track metrics and optimize based on results
4. **Respect Limits**: Stay within daily sending limits to avoid blacklisting

## 🔍 Troubleshooting

### Common Issues

#### SMTP Connection Failed
- Verify credentials are correct
- Check if 2FA is enabled (use App Password for Gmail)
- Ensure firewall allows SMTP connections
- Verify port and encryption settings

#### Emails Not Sending
- Check daily sending limits
- Verify SMTP credentials are active
- Check email queue status
- Review error logs for specific issues

#### Low Open Rates
- Review subject lines for spam triggers
- Check sender reputation
- Ensure emails are reaching inbox (not spam)
- Test with different email clients

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
NODE_ENV=development
```

## 📈 Future Enhancements

### Planned Features
- **A/B Testing**: Test different subject lines and content
- **Advanced Segmentation**: More sophisticated lead filtering
- **Email Automation**: Triggered emails based on lead behavior
- **Integration**: Connect with CRM and marketing tools
- **Advanced Analytics**: More detailed reporting and insights

### Customization Options
- **Webhook Support**: Real-time campaign updates
- **Custom Tracking**: Additional tracking parameters
- **Template Editor**: Rich text editor for email creation
- **Campaign Templates**: Pre-built campaign workflows

## 📚 Additional Resources

### Documentation
- [Nodemailer Documentation](https://nodemailer.com/)
- [Email Best Practices](https://www.emailbestpractices.com/)
- [SMTP Configuration Guide](https://support.google.com/mail/answer/7126229)

### Support
For technical support or feature requests, please refer to the main project documentation or create an issue in the project repository.

---

**Note**: This email marketing system is designed for legitimate business use. Please ensure compliance with email marketing laws and regulations in your jurisdiction (CAN-SPAM, GDPR, etc.).
