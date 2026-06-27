@echo off
cd /d "%~dp0"

set PORT=3005
if exist ".env" for /f "tokens=2 delims==" %%P in ('findstr /i /b "PORT=" ".env"') do set PORT=%%P

echo Stopping WhiteBoard4Me server on port %PORT%...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
  echo   kill PID %%p
  taskkill /F /PID %%p >nul 2>&1
)
echo Done.
pause
