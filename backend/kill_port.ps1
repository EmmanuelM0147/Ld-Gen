Write-Host "Killing processes on ports 5000 and 5001..." -ForegroundColor Yellow

# Kill processes on port 5000
$processes5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
foreach ($processId in $processes5000) {
    try {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        Write-Host "Killing process on port 5000: $($process.ProcessName) (PID: $processId)" -ForegroundColor Red
        Stop-Process -Id $processId -Force
    } catch {
        Write-Host "Could not kill process $processId" -ForegroundColor Red
    }
}

# Kill processes on port 5001
$processes5001 = Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
foreach ($processId in $processes5001) {
    try {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        Write-Host "Killing process on port 5001: $($process.ProcessName) (PID: $processId)" -ForegroundColor Red
        Stop-Process -Id $processId -Force
    } catch {
        Write-Host "Could not kill process $processId" -ForegroundColor Red
    }
}

Write-Host "Done! Ports should be free now." -ForegroundColor Green
Read-Host "Press Enter to continue"
