@echo off
echo Business Contact Scraper - Windows Launcher
echo ===========================================

echo.
echo Choose an option:
echo 1. Run scraper (technology companies)
echo 2. Run scraper (restaurant chains)
echo 3. Run scraper (healthcare companies)
echo 4. Run scraper (no email scraping)
echo 5. Search database for companies
echo 6. Search emails by domain
echo 7. Run example script
echo 8. Test installation
echo 9. Custom search
echo 10. Exit

set /p choice="Enter your choice (1-10): "

if "%choice%"=="1" goto tech
if "%choice%"=="2" goto restaurant
if "%choice%"=="3" goto healthcare
if "%choice%"=="4" goto no_emails
if "%choice%"=="5" goto search
if "%choice%"=="6" goto search_emails
if "%choice%"=="7" goto example
if "%choice%"=="8" goto test
if "%choice%"=="9" goto custom
if "%choice%"=="10" goto exit

echo Invalid choice. Please try again.
pause
goto :eof

:tech
echo.
echo Running scraper for technology companies...
python main.py "technology companies" --location "San Francisco" --max-results 20
pause
goto :eof

:restaurant
echo.
echo Running scraper for restaurant chains...
python main.py "restaurant chains" --location "New York" --max-results 20
pause
goto :eof

:healthcare
echo.
echo Running scraper for healthcare companies...
python main.py "healthcare companies" --location "Los Angeles" --max-results 20
pause
goto :eof

:no_emails
echo.
echo Running scraper without email extraction...
python main.py "consulting firms" --location "Chicago" --max-results 15 --no-emails
pause
goto :eof

:search
echo.
set /p term="Enter search term: "
python main.py --search-db "%term%"
pause
goto :eof

:search_emails
echo.
set /p domain="Enter domain to search (e.g., google.com): "
python main.py --search-emails "%domain%"
pause
goto :eof

:example
echo.
echo Running example script...
python example_usage.py
pause
goto :eof

:test
echo.
echo Testing installation...
python test_installation.py
pause
goto :eof

:custom
echo.
set /p query="Enter search query: "
set /p location="Enter location (optional): "
set /p max_results="Enter max results (optional): "
set /p scrape_emails="Scrape emails? (y/n, default: y): "

if "%scrape_emails%"=="n" (
    if "%location%"=="" (
        if "%max_results%"=="" (
            python main.py "%query%" --no-emails
        ) else (
            python main.py "%query%" --max-results %max_results% --no-emails
        )
    ) else (
        if "%max_results%"=="" (
            python main.py "%query%" --location "%location%" --no-emails
        ) else (
            python main.py "%query%" --location "%location%" --max-results %max_results% --no-emails
        )
    )
) else (
    if "%location%"=="" (
        if "%max_results%"=="" (
            python main.py "%query%"
        ) else (
            python main.py "%query%" --max-results %max_results%
        )
    ) else (
        if "%max_results%"=="" (
            python main.py "%query%" --location "%location%"
        ) else (
            python main.py "%query%" --location "%location%" --max-results %max_results%
        )
    )
)
pause
goto :eof

:exit
echo.
echo Goodbye!
pause
