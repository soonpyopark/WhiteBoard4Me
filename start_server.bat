@echo off
cd /d "%~dp0"

if not exist "node_modules\" (
  echo ERROR: node_modules not found. Run: npm install
  pause
  exit /b 1
)

if not exist "data\" mkdir data

echo Starting WhiteBoard4Me dev server...
echo Open http://localhost:3005
echo Stop with stop_server.bat or Ctrl+C in the server window.
echo.

start "WhiteBoard4Me Dev Server" cmd /k npm run dev
