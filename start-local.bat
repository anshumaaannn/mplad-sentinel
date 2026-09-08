@echo off
title MPLAD Sentinel - Local Deployment
echo ====================================================================
echo   MPLAD SENTINEL -- Launching Full-Stack Local Deployment
echo ====================================================================
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0start_local.ps1"

echo.
pause
