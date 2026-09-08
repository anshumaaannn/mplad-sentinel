$cwd = "C:\Users\Anshuman Raghuvanshi\Desktop\SIH"

Write-Host "Stopping any running services on ports 8000, 5000, 3000..."
foreach ($port in @(8000, 5000, 3000)) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        }
    }
}

Start-Sleep -Seconds 1

# 1. Start Python ML Engine detached
Write-Host "Starting Python ML Service on port 8000..."
Start-Process -FilePath "$cwd\ml\.venv\Scripts\python.exe" `
    -ArgumentList "-m uvicorn ml.server:app --port 8000 --host 127.0.0.1" `
    -WorkingDirectory $cwd `
    -RedirectStandardOutput "$cwd\ml.log" `
    -RedirectStandardError "$cwd\ml_err.log" `
    -WindowStyle Hidden

# 2. Start Node Backend Server detached
Write-Host "Starting Node Backend Server on port 5000..."
Start-Process -FilePath "node" `
    -ArgumentList "backend/dist/index.js" `
    -WorkingDirectory $cwd `
    -RedirectStandardOutput "$cwd\backend.log" `
    -RedirectStandardError "$cwd\backend_err.log" `
    -WindowStyle Hidden

# 3. Start Vite Frontend Server detached
Write-Host "Starting Vite Frontend Server on port 3000..."
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm.cmd run dev --prefix frontend" `
    -WorkingDirectory $cwd `
    -RedirectStandardOutput "$cwd\frontend.log" `
    -RedirectStandardError "$cwd\frontend_err.log" `
    -WindowStyle Hidden

# Wait for services to initialize
Write-Host "Waiting for services to initialize..."
Start-Sleep -Seconds 4

# Verify connections
$mlHealthy = $false
$backendHealthy = $false
$frontendHealthy = $false

for ($i = 0; $i -lt 10; $i++) {
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/ml/health" -TimeoutSec 2 -ErrorAction Stop
        if ($res.status -eq "HEALTHY") { $mlHealthy = $true; break }
    } catch { Start-Sleep -Seconds 1 }
}

for ($i = 0; $i -lt 10; $i++) {
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -ErrorAction Stop
        if ($res.status -eq "HEALTHY") { $backendHealthy = $true; break }
    } catch { Start-Sleep -Seconds 1 }
}

for ($i = 0; $i -lt 10; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($res.StatusCode -eq 200) { $frontendHealthy = $true; break }
    } catch { Start-Sleep -Seconds 1 }
}

Write-Host "=========================================================="
Write-Host "  MPLAD SENTINEL -- LOCAL DEPLOYMENT STATUS"
Write-Host "=========================================================="
Write-Host "  Frontend Dashboard (Vite HMR):  http://localhost:3000   [$([string]$(if ($frontendHealthy) { 'UP' } else { 'INITIALIZING' } ))]"
Write-Host "  Unified Full-Stack & API:      http://localhost:5000   [$([string]$(if ($backendHealthy) { 'UP' } else { 'INITIALIZING' } ))]"
Write-Host "  Python ML Engine:              http://127.0.0.1:8000   [$([string]$(if ($mlHealthy) { 'UP' } else { 'INITIALIZING' } ))]"
Write-Host "=========================================================="
