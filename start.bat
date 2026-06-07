@echo off
chcp 65001 > nul
echo ========================================
echo   TOTP System Quick Start
echo ========================================
echo.

echo [1/2] Starting TOTP Server...
cd /d "%~dp0server"
start "TOTP-Server" cmd /k "npm.cmd start"

echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo [2/2] Starting TOTP Client...
cd /d "%~dp0client"
start "TOTP-Client" cmd /k "npm.cmd run dev"

echo.
echo ========================================
echo   System Started Successfully!
echo ========================================
echo.
echo Server: http://localhost:3000
echo.
pause