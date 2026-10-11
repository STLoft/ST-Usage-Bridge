@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [ST Usage Bridge] 코어 후크를 설치합니다.
node st-usage-bridge-install.mjs
echo.
pause
