# Supabase Setup Guide for B2B Platform

## Overview
This guide will help you set up Supabase as your primary database for the B2B lead generation and sales engagement platform.

## Prerequisites
- A Supabase account and project
- Access to your Supabase project dashboard

## Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `ldpy-b2b-platform` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose closest to your users
5. Click "Create new project"

## Step 2: Get Project Credentials
1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xyz.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)
   - **Service role key** (starts with `eyJ...`)

## Step 3: Configure Environment Variables
1. Copy `env_template.txt` to `.env` in your backend directory
2. Update the Supabase configuration:
   ```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Step 4: Create Database Tables
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `setup-supabase-tables.sql`
3. Paste into the SQL editor and click "Run"
4. Verify all tables are created successfully

## Step 5: Configure Row Level Security (Optional)
For production use, you may want to enable Row Level Security:
1. In the SQL editor, uncomment the RLS lines in the setup script
2. Run the script again
3. Create appropriate policies for your use case

## Step 6: Test Connection
1. Start your backend server
2. Check the console for successful Supabase connection messages
3. Test the health endpoint: `http://localhost:5001/health`

## Table Structure
The platform creates the following main table groups:

### 1. Contact Verification
- `contact_verifications` - Email/phone verification logs
- `company_enrichments` - Company data enrichment

### 2. Sales Engagement
- `sales_campaigns` - Marketing campaigns
- `outreach_sequences` - Multi-step outreach sequences
- `outreach_activities` - Individual outreach activities
- `email_templates` - Email templates
- `linkedin_templates` - LinkedIn message templates
- `crm_integrations` - CRM system connections
- `sales_metrics` - Campaign performance metrics

### 3. B2B Contact Database
- `b2b_companies` - Company information
- `b2b_contacts` - Contact details
- `company_technologies` - Technology stack data
- `company_funding` - Funding information
- `data_enrichment_log` - Data enrichment tracking
- `search_index` - Search optimization

### 4. Analytics
- `lead_analytics` - Lead generation metrics
- `sales_analytics` - Sales performance data
- `campaign_analytics` - Campaign effectiveness
- `performance_metrics` - KPI tracking
- `roi_analytics` - Return on investment data

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify your Supabase URL and keys
   - Check if your project is active
   - Ensure your IP is not blocked

2. **Tables Not Found**
   - Run the setup script in Supabase SQL Editor
   - Check for any SQL errors in the execution log
   - Verify table names match exactly

3. **Permission Denied**
   - Check if RLS is enabled and policies are configured
   - Verify your API keys have the correct permissions
   - Check table grants in the setup script

4. **Service Initialization Failed**
   - Check console logs for specific error messages
   - Verify all required environment variables are set
   - Ensure Supabase client is properly imported

### Getting Help
- Check Supabase documentation: [docs.supabase.com](https://docs.supabase.com)
- Review the service logs in your backend console
- Verify your environment configuration

## Next Steps
After successful setup:
1. Configure your API keys for external services
2. Test lead generation functionality
3. Set up email templates and campaigns
4. Configure CRM integrations
5. Test analytics and reporting features

## Security Notes
- Keep your service role key secure and never expose it in frontend code
- Use the anon key for public operations
- Consider enabling RLS for production deployments
- Regularly rotate your API keys
- Monitor your Supabase usage and limits
