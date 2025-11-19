# Lead Prospecting Search Fix

## Problem
After inputting search fields in the Lead Prospecting page, no results appear. This is caused by missing database tables in Supabase.

## Solution

### Step 1: Set up Supabase Database Tables

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `rwxzzyrtrvdqeriynwhs`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Setup Script**
   - Copy and paste the contents of `backend/setup-supabase-tables.sql`
   - Click "Run" to execute the script

   This will create:
   - `prospecting_jobs` table
   - `leads` table with sample data
   - Proper indexes for performance
   - Row Level Security policies

### Step 2: Verify Tables Were Created

1. **Check Tables**
   - Go to "Table Editor" in the left sidebar
   - You should see `leads` and `prospecting_jobs` tables

2. **Check Sample Data**
   - Click on the `leads` table
   - You should see 5 sample leads with data

### Step 3: Test the Backend

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Run the test script**
   ```bash
   node test_lead_search.js
   ```

   This will test if the search functionality works correctly.

### Step 4: Restart Your Backend Server

1. **Stop the current server** (Ctrl+C)
2. **Start it again**
   ```bash
   npm run dev
   # or
   node server.js
   ```

### Step 5: Test the Frontend

1. **Go to Lead Prospecting page**
2. **Enter search criteria** (e.g., "Technology" in Industry)
3. **Click Search**
4. **You should now see results!**

## Alternative: Manual Table Creation

If the SQL script doesn't work, you can manually create the tables:

### Create `leads` table:
```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(200),
  industry VARCHAR(100),
  website VARCHAR(500),
  phone VARCHAR(50),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  team_size VARCHAR(50),
  revenue_range VARCHAR(100),
  total_funding VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new',
  source VARCHAR(100) DEFAULT 'Lead Prospecting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Insert sample data:
```sql
INSERT INTO leads (company_name, title, industry, city, state, country, team_size, revenue_range, total_funding, website, phone, status, source) VALUES
('TechCorp Inc', 'CEO', 'Technology', 'San Francisco', 'CA', 'United States', '51-200', '10M-50M', '5M-10M', 'techcorp.com', '+1-555-0123', 'new', 'Lead Prospecting'),
('Marketing Pro Solutions', 'Marketing Manager', 'Marketing', 'New York', 'NY', 'United States', '11-50', '1M-10M', '100K-500K', 'marketingpro.com', '+1-555-0456', 'new', 'Lead Prospecting');
```

## Troubleshooting

### If you still don't see results:

1. **Check browser console** for JavaScript errors
2. **Check backend logs** for API errors
3. **Check Network tab** in browser dev tools for failed requests
4. **Verify database connection** by running the test script

### Common Issues:

1. **Table doesn't exist**: Run the setup SQL script
2. **Permission denied**: Check RLS policies in Supabase
3. **Connection failed**: Verify Supabase credentials in `backend/config/supabase-config.js`

## Files Modified

- `backend/setup-supabase-tables.sql` - Database setup script
- `backend/test_lead_search.js` - Test script for search functionality
- `backend/routes/leadProspecting.js` - Fixed search query syntax
- `backend/setup_supabase_tables.js` - Node.js setup script

## Success Indicators

✅ Tables created in Supabase  
✅ Sample data inserted  
✅ Backend test passes  
✅ Frontend search returns results  
✅ No console errors  

After completing these steps, your lead prospecting search should work correctly!
