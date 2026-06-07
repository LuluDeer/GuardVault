@echo off
cd /d "%~dp0client"
echo Starting TOTP Client...
node_modules\electron\dist\electron.exe src/main/test.js
pause