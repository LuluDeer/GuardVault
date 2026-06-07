@echo off
echo ========================================
echo   Create Test User
echo ========================================
echo.

:: 管理员登录
echo Step 1: Admin Login...
curl -s -X POST http://localhost:3000/api/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > %TEMP%\admin_login.json

findstr "token" %TEMP%\admin_login.json >nul
if %errorlevel% neq 0 (
    echo   [ERROR] Admin login failed!
    echo   Make sure the server is running.
    del %TEMP%\admin_login.json 2>nul
    pause
    exit /b 1
)

:: 提取 token
for /f "tokens=2 delims=:" %%a in ('findstr "token" %TEMP%\admin_login.json') do (
    set TOKEN=%%a
    set TOKEN=!TOKEN:,=!
    set TOKEN=!TOKEN:"=!
    set TOKEN=!TOKEN: =!
)

echo   Admin login successful!

:: 创建测试用户
echo Step 2: Create Test User...
curl -s -X POST http://localhost:3000/api/admin/user/create ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"username\":\"testuser\",\"password\":\"test123\",\"email\":\"test@example.com\",\"status\":1}" > %TEMP%\create_user.json

findstr "code\":0 %TEMP%\create_user.json >nul
if %errorlevel%==0 (
    echo   Test user created successfully!
    echo.
    echo ========================================
    echo   Test Credentials:
    echo ========================================
    echo   Username: testuser
    echo   Password: test123
    echo ========================================
) else (
    echo   User may already exist or creation failed.
)

:: 清理临时文件
del %TEMP%\admin_login.json 2>nul
del %TEMP%\create_user.json 2>nul

echo.
pause
