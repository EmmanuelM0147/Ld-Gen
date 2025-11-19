# Troubleshooting: Prospecting Progress Stuck at 0%

## Problem Description
The Lead Prospecting system gets stuck at:
- **Progress**: 0%
- **Status**: "Initializing prospecting..."

## Root Causes & Solutions

### 1. Database Tables Don't Exist ❌

**Symptoms**: Backend logs show "relation 'leads' does not exist" errors

**Solution**: 
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `rwxzzyrtrvdqeriynwhs`
3. Click "SQL Editor" → "New Query"
4. Copy and paste the contents of `backend/setup-supabase-tables.sql`
5. Click "Run"

**Verify**: Check "Table Editor" to see `leads` and `prospecting_jobs` tables

### 2. No Sample Data in Database ❌

**Symptoms**: Tables exist but are empty, search returns no results

**Solution**: 
1. Run the setup SQL script (includes sample data)
2. Or manually insert sample leads:

```sql
INSERT INTO leads (company_name, title, industry, city, state, country, team_size, revenue_range, total_funding, website, phone, status, source) VALUES
('TechCorp Inc', 'CEO', 'Technology', 'San Francisco', 'CA', 'United States', '51-200', '10M-50M', '5M-10M', 'techcorp.com', '+1-555-0123', 'new', 'Lead Prospecting'),
('Marketing Pro Solutions', 'Marketing Manager', 'Marketing', 'New York', 'NY', 'United States', '11-50', '1M-10M', '100K-500K', 'marketingpro.com', '+1-555-0456', 'new', 'Lead Prospecting');
```

### 3. Database Connection Issues ❌

**Symptoms**: Backend can't connect to Supabase

**Solution**:
1. Check `backend/config/supabase-config.js` for correct credentials
2. Verify Supabase project is active
3. Check if your IP is allowed in Supabase settings

### 4. Backend Process Crashes ❌

**Symptoms**: Prospecting starts but never progresses

**Solution**:
1. Check backend console for error messages
2. Restart the backend server
3. Look for JavaScript errors in the logs

## Debugging Steps

### Step 1: Run Debug Script
```bash
cd backend
node debug_prospecting.js
```

**Expected Output**:
```
✅ Leads table exists
✅ Found 5 leads in the table
✅ Search successful! Found 2 results
✅ Prospecting job created successfully
✅ Job status updated to processing
✅ Job completed successfully
```

### Step 2: Check Backend Logs
Look for these log messages:
```
🚀 Processing prospecting job 123...
🔍 Starting lead search...
🔍 Search completed. Found 2 leads
🔧 Enriching leads...
✅ Job completed successfully
```

**If you see errors**, they will indicate the specific issue.

### Step 3: Test Database Connection
```bash
cd backend
node test_lead_search.js
```

### Step 4: Check Job Status
Use the debug endpoint to check a specific job:
```
GET /api/lead-prospecting/debug/{job_id}
```

## Quick Fix Checklist

- [ ] Run `backend/setup-supabase-tables.sql` in Supabase
- [ ] Verify tables exist in Table Editor
- [ ] Check sample data is present
- [ ] Restart backend server
- [ ] Test with `node debug_prospecting.js`
- [ ] Check backend console for errors

## Common Error Messages

### "relation 'leads' does not exist"
**Fix**: Run the setup SQL script

### "permission denied for table leads"
**Fix**: Check RLS policies in Supabase

### "connection failed"
**Fix**: Verify Supabase credentials and project status

### "job not found"
**Fix**: Check if the prospecting_jobs table exists

## Testing the Fix

1. **Start a new prospecting job** with simple criteria:
   - Industry: "Technology"
   - Leave other fields empty

2. **Watch the progress** - it should now advance through:
   - Initializing → Processing → Completed

3. **Check results** - you should see leads appear in the Real-time Leads Feed

## If Still Not Working

1. **Check browser console** for JavaScript errors
2. **Check Network tab** for failed API requests
3. **Check backend logs** for detailed error messages
4. **Run debug scripts** to identify the exact issue
5. **Verify database setup** by running the test scripts

## Success Indicators

✅ Tables created in Supabase  
✅ Sample data inserted  
✅ Debug script passes all tests  
✅ Backend logs show successful progression  
✅ Frontend shows results after search  
✅ Progress bar advances from 0% to 100%  

After completing these steps, your lead prospecting should work correctly and show real-time progress updates!
