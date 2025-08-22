@echo off
echo Starting Multi-Analysis Development Environment...
echo.

REM Check if ports are in use and clean them
echo Checking for existing processes...

REM Check port 3001 (API)
netstat -ano | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo Port 3001 (API) is in use. Cleaning up...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /PID %%a /F >nul 2>&1
    )
)

REM Check port 3000 (Web)
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo Port 3000 (Web) is in use. Cleaning up...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        taskkill /PID %%a /F >nul 2>&1
    )
)

echo Ports cleared successfully
echo.

REM Start API server
echo Starting API server on port 3001...
start /min cmd /c "cd packages/api && npm run dev"

REM Wait a bit for API to start
timeout /t 5 /nobreak >nul

REM Start Web server
echo Starting Web server on port 3000...
start /min cmd /c "cd packages/web && npm run dev"

echo.
echo Development environment started successfully!
echo Web App: http://localhost:3000
echo API: http://localhost:3001
echo.
echo To stop all servers, run: npm run dev:clean
echo To start individual servers, run: npm run dev:api or npm run dev:web

