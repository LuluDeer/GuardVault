@echo off
echo ========================================
echo   TOTP System Stop
echo ========================================
echo.

:: 停止 Electron 客户端
echo Stopping TOTP Client...
taskkill /F /IM electron.exe 2>nul
if %errorlevel%==0 (
    echo   - Client stopped
) else (
    echo   - Client not running
)

:: 停止 Node.js 服务端 (totp-server)
echo Stopping TOTP Server...
for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq TOTP-Server*" /FO LIST ^| find "PID:"') do (
    taskkill /F /PID %%a 2>nul
    if not errorlevel==1 echo   - Server stopped
)

echo.
echo ========================================
echo   System Stopped
echo ========================================
pause
