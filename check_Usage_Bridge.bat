@echo off
chcp 65001 >nul
cd /d "%~dp0"
node usage-bridge-check.mjs
echo.
pause
