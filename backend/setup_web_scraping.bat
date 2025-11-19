@echo off
echo Setting up Web Scraping Service for LdPy B2B Platform...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Create logs directory if it doesn't exist
if not exist "logs" (
    echo Creating logs directory...
    mkdir logs
)

REM Check if .env file exists
if not exist ".env" (
    echo Warning: .env file not found
    echo Please create .env file with your configuration
    echo See env_template.txt for reference
    echo.
    echo Required for web scraping:
    echo - PROXY_LIST (optional)
    echo - SCRAPING_RATE_LIMIT
    echo - SCRAPING_LOG_LEVEL
    echo.
)

echo.
echo Web Scraping Service Setup Complete!
echo.
echo Next steps:
echo 1. Copy env_template.txt to .env and configure your settings
echo 2. Run the SQL script in your Supabase SQL Editor:
echo    - Copy setup-web-scraping-tables.sql content
echo    - Paste and run in Supabase SQL Editor
echo 3. Start the server: npm run dev
echo 4. Test the service: node test_web_scraping.js
echo.
echo API endpoints will be available at:
echo - Health check: http://localhost:5000/api/web-scraping/health
echo - Bulk scraping: http://localhost:5000/api/web-scraping/bulk-scrape
echo - Job status: http://localhost:5000/api/web-scraping/jobs
echo.
pause
