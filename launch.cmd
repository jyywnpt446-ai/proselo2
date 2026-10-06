@echo off
setlocal
set "PORT=8765"
set "ROOT=%~dp0"
start "AgroStart Server" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%ROOT%server.ps1" -Port %PORT%
timeout /t 1 /nobreak >nul
start "" "http://localhost:%PORT%/index.html"
