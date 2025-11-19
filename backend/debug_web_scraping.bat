@echo off
echo ========================================
echo Web Scraping Integration Debug Script
echo ========================================
echo.

echo Testing web scraping integration in lead prospecting...
node debug_web_scraping_integration.js

echo.
echo ========================================
echo Debug Complete
echo ========================================
echo.
echo This test verifies that:
echo 1. The prospecting system can trigger web scraping
echo 2. Leads are generated from scraping (not pre-existing data)
echo 3. The job processing workflow works correctly
echo.
echo If successful, your prospecting system will now:
echo - Generate leads through web scraping pipelines
echo - Not require pre-existing data in the leads table
echo - Show real-time progress from 0% to 100%
echo.

pause
