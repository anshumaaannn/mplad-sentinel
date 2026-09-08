@echo off
title MPLAD Sentinel - High-Speed Cloudflare Tunnel
echo ====================================================================
echo   MPLAD SENTINEL -- High-Speed Global Edge Tunnel (Cloudflare Anycast)
echo   Serving Optimized Production Bundle on http://localhost:5000
echo ====================================================================
echo.
echo Launching Cloudflare Edge Tunnel...
echo.
.\cloudflared.exe tunnel --url http://localhost:5000
pause
