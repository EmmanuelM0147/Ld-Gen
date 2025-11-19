@echo off
echo ========================================
echo Lead Prospecting Debug Script
echo ========================================
echo.

echo Running debug script to identify the issue...
node debug_prospecting.js

echo.
echo ========================================
echo Debug Complete
echo ========================================
echo.
echo If you see errors above, the issue is likely:
echo 1. Database tables don't exist
echo 2. No sample data in the leads table
echo 3. Database connection issues
echo.
echo To fix:
echo 1. Run the setup SQL script in Supabase
echo 2. Check your backend server logs
echo 3. Verify database connection
echo.

pause
