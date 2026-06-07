@echo off
chcp 65001 >nul

echo ================================================
echo    GuardVault - 停止服务
echo ================================================
echo.

echo [INFO] 正在停止服务...

taskkill /FI "WINDOWTITLE eq GuardVault Server" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GuardVault Web Admin" /F >nul 2>&1

echo [INFO] 服务已停止
echo.
echo 按任意键退出...
pause >nul