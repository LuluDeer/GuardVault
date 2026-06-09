@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ================================================
echo    GuardVault - 企业级 2FA 集中管理系统
echo ================================================
echo.

if not exist "server\node_modules" (
    echo [ERROR] 服务端依赖未安装，请先运行：
    echo         cd server && npm install && cd ..
    pause
    exit /b 1
)

if not exist "server\.env" (
    echo [ERROR] 环境变量文件不存在，请先创建：
    echo         copy server\.env.example server\.env
    echo         然后编辑 server\.env 配置数据库连接
    pause
    exit /b 1
)

if not exist "logs" mkdir logs

echo [INFO] 正在启动服务端...
start "GuardVault Server" /D "%~dp0server" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo [INFO] 正在启动 Web 管理后台...
start "GuardVault Web Admin" /D "%~dp0web-admin" cmd /k "npm run dev"

echo.
echo ================================================
echo    服务已启动
echo ================================================
echo.
echo 服务端 API: http://localhost:3001
echo Web 管理后台: http://localhost:5173
echo.
echo 按任意键退出...
pause >nul