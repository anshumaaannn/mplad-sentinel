$cwd = "C:\Users\Anshuman Raghuvanshi\Desktop\SIH"

# Stop existing processes on ports 5000 and 8000, and cloudflared
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$p5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($p5000) {
    Stop-Process -Id $p5000.OwningProcess -Force -ErrorAction SilentlyContinue
}

$p8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($p8000) {
    Stop-Process -Id $p8000.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1

# 1. Start Python ML Engine detached
Write-Host "Starting Python ML Service..."
Start-Process -FilePath "$cwd\ml\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn ml.server:app --port 8000" -WorkingDirectory $cwd -WindowStyle Hidden

# 2. Start Node Backend detached
Write-Host "Starting Node Backend..."
Start-Process -FilePath "node" -ArgumentList "backend/dist/index.js" -WorkingDirectory $cwd -RedirectStandardOutput "$cwd\backend.log" -RedirectStandardError "$cwd\backend_err.log" -WindowStyle Hidden

# Wait for services to initialize
Start-Sleep -Seconds 4

# 3. Start Cloudflare Tunnel detached with HTTP2
Clear-Content "$cwd\tunnel_err.log" -ErrorAction SilentlyContinue
Clear-Content "$cwd\tunnel.log" -ErrorAction SilentlyContinue
Write-Host "Starting Cloudflare Public Edge Tunnel..."
Start-Process -FilePath "$cwd\cloudflared.exe" -ArgumentList "tunnel --protocol http2 --url http://localhost:5000" -WorkingDirectory $cwd -RedirectStandardOutput "$cwd\tunnel.log" -RedirectStandardError "$cwd\tunnel_err.log" -WindowStyle Hidden

# Wait for tunnel URL
Start-Sleep -Seconds 8
$log = Get-Content "$cwd\tunnel_err.log" -ErrorAction SilentlyContinue
$tunnelUrl = ($log | Select-String -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com").Matches.Value | Select-Object -First 1

if ($tunnelUrl) {
    Write-Host "========================================================"
    Write-Host "  MPLAD SENTINEL IS LIVE AT:"
    Write-Host "  $tunnelUrl"
    Write-Host "========================================================"
} else {
    Write-Host "Tunnel initializing, check tunnel_err.log"
}
