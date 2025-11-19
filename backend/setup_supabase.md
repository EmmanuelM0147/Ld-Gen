# 🚀 Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project name: `lead-manager-dashboard`
5. Enter database password (save this!)
6. Choose region closest to you
7. Click "Create new project"

## 2. Get Connection Details

1. Wait for project to be created (1-2 minutes)
2. Go to **Settings** → **Database**
3. Copy the **Connection string** or individual parameters

## 3. Create .env File

1. Copy `env_template.txt` to `.env`
2. Replace `[YOUR-PASSWORD]` with your database password
3. Replace `[YOUR-PROJECT-REF]` with your project reference

Example:
```bash
SUPABASE_DB_URL=postgresql://postgres:mypassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## 4. Test Connection

Run the backend to test the connection:
```bash
cd backend
npm run dev
```

You should see: `✅ Database connected successfully`

## 5. Create Core Tables

The system will automatically create these tables:
- `business_contacts` - Lead information
- `company_emails` - Email addresses
- `lead_enrichment` - Additional lead data
- `email_validation` - Email validation results
- `lead_quality_scores` - Lead quality metrics
- `spam_detection` - Spam indicators
- `smtp_credentials` - Email sending credentials
- `email_templates` - Email templates
- `email_campaigns` - Email campaigns
- `campaign_recipients` - Campaign recipients
- `email_tracking` - Email tracking data
- `email_queue` - Email sending queue

## 6. Start Frontend

```bash
cd dashboard
npm start
```

Your dashboard will be available at: http://localhost:3000

## 🔧 Troubleshooting

### Connection Issues
- Check your `.env` file has the correct `SUPABASE_DB_URL`
- Ensure your IP is allowed in Supabase (Settings → Database → Connection pooling)
- Verify the password is correct

### SSL Issues
- The configuration already handles SSL for Supabase
- If you get SSL errors, check that `rejectUnauthorized: false` is set

### Table Creation Issues
- Check the console logs for specific error messages
- Ensure your database user has CREATE TABLE permissions
