@echo off
title MPLAD Sentinel - Stop Local Services
echo Stopping services on ports 8000, 5000, 3000...
powershell.exe -ExecutionPolicy Bypass -Command "foreach ($p in @(8000, 5000, 3000)) { $c = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($c) { $c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } }; Write-Host 'All local services stopped.'"
pause
