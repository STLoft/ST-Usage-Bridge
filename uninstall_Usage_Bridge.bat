@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [Usage Bridge] 코어 후크를 제거합니다.
node usage-bridge-uninstall.mjs
echo.
pause
