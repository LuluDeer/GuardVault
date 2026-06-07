@echo off
cd /d "%~dp0client"
echo Starting TOTP Client...
node_modules\.bin\electron .
pause