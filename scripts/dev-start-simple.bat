@echo off
echo Starting Multi-Analysis Development Environment...
echo.

REM Get the script directory and set working directory
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
cd /d "%PROJECT_ROOT%"

echo Starting API server on port 3001...
start "API Server" /min cmd /c "npm run dev:api"

echo Waiting for API to start...
timeout /t 8 /nobreak >nul

echo Starting Web server on port 3000...
start "Web Server" /min cmd /c "npm run dev:web"

echo.
echo Development environment started successfully!
echo Web App: http://localhost:3000
echo API: http://localhost:3001
echo.
echo Both servers are running in minimized command windows.
echo To stop all servers, run: npm run dev:clean
echo.
echo Press any key to exit this script (servers will continue running)...
pause >nul
