@echo off
title MPLAD Sentinel - Production Deployment & Live Tunnel
echo ====================================================================
echo   MPLAD SENTINEL -- Production Deployment & Global Public Tunnel
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/4] Building optimized production assets...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Check console errors.
    pause
    exit /b %errorlevel%
)

echo [2/4] Starting Python ML Service (Port 8000)...
start "MPLAD-Sentinel-ML" /min .\ml\.venv\Scripts\python.exe -m uvicorn ml.server:app --port 8000

echo [3/4] Starting Full-Stack Node Server (Port 5000)...
start "MPLAD-Sentinel-Backend" /min node backend/dist/index.js

echo Waiting 5 seconds for services to initialize...
timeout /t 5 /nobreak > nul

echo [4/4] Launching High-Speed Cloudflare Public Edge Tunnel...
echo ====================================================================
echo Your public HTTPS link will appear below (copy and share with anyone):
echo ====================================================================
echo.
.\cloudflared.exe tunnel --url http://localhost:5000

pause
