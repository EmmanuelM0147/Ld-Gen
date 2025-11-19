@echo off
echo Starting Lead Manager Dashboard Backend with Email Marketing and Supabase...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo.
    echo ========================================
    echo SETUP REQUIRED: .env file not found!
    echo ========================================
    echo.
    echo Please follow these steps:
    echo 1. Go to https://supabase.com and create a project
    echo 2. Copy env_template.txt to .env
    echo 3. Update .env with your Supabase connection details
    echo.
    echo See setup_supabase.md for detailed instructions
    echo.
    echo Press any key to continue anyway...
    pause >nul
)

echo.
echo ========================================
echo Starting Email Marketing Dashboard...
echo ========================================
echo.
echo Backend will be available at: http://localhost:5000
echo Health check: http://localhost:5000/health
echo Email Marketing API: http://localhost:5000/api/email-marketing
echo.
echo Database: Supabase PostgreSQL
echo Frontend: React Dashboard
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
