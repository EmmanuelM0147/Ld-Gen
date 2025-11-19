@echo off
echo Killing processes on ports 5000 and 5001...

REM Kill processes on port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    echo Killing process on port 5000: %%a
    taskkill /F /PID %%a 2>nul
)

REM Kill processes on port 5001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001') do (
    echo Killing process on port 5001: %%a
    taskkill /F /PID %%a 2>nul
)

echo Done! Ports should be free now.
pause
