Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue
$logFile = "C:\Users\Anshuman Raghuvanshi\Desktop\SIH\tunnel.log"
Remove-Item $logFile -ErrorAction SilentlyContinue
Start-Process -FilePath "C:\Users\Anshuman Raghuvanshi\Desktop\SIH\cloudflared.exe" -ArgumentList "tunnel --url http://localhost:5000 --logfile `"$logFile`"" -WorkingDirectory "C:\Users\Anshuman Raghuvanshi\Desktop\SIH" -WindowStyle Hidden
Start-Sleep -Seconds 8
Get-Content $logFile
