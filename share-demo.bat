@echo off
title MPLAD Sentinel - Public Share Tunnel
echo =======================================================
echo   MPLAD SENTINEL -- Public Demo Tunnel
echo   Exposing http://localhost:3000 to the Public Internet
echo =======================================================
echo.
echo Make sure your 3 servers (ML, Backend, Frontend) are running!
echo.
echo Starting secure public tunnel...
echo Your public link will appear below (look for https://...lhr.life):
echo.
ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run
pause
