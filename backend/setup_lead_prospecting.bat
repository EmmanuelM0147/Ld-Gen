@echo off
echo ========================================
echo Lead Prospecting Setup Script
echo ========================================
echo.

echo Step 1: Testing database connection...
node test_lead_search.js

echo.
echo Step 2: If the test failed, you need to set up the database tables.
echo.
echo Please follow these steps:
echo 1. Go to your Supabase dashboard: https://supabase.com/dashboard
echo 2. Select your project: rwxzzyrtrvdqeriynwhs
echo 3. Click on "SQL Editor" in the left sidebar
echo 4. Click "New Query"
echo 5. Copy and paste the contents of setup-supabase-tables.sql
echo 6. Click "Run" to execute the script
echo.
echo After setting up the tables, run this script again to test.
echo.

pause
