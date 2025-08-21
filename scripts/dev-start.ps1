#!/usr/bin/env pwsh

Write-Host "🚀 Starting Multi-Analysis Development Environment..." -ForegroundColor Green
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $connection -ne $null
    }
    catch {
        return $false
    }
}

# Function to kill processes using a specific port
function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        foreach ($pid in $processes) {
            if ($pid -gt 0) {
                Write-Host "🔄 Stopping process $pid on port $Port..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Seconds 2
    }
    catch {
        Write-Host "⚠️  Warning: Could not stop process on port $Port" -ForegroundColor Yellow
    }
}

# Function to wait for a port to be available
function Wait-ForPort {
    param([int]$Port, [int]$TimeoutSeconds = 30)
    $startTime = Get-Date
    while ((Get-Date) -lt $startTime.AddSeconds($TimeoutSeconds)) {
        if (-not (Test-Port -Port $Port)) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

# Check and clean ports if needed
Write-Host "🔍 Checking for existing processes..." -ForegroundColor Blue

if (Test-Port -Port 3001) {
    Write-Host "⚠️  Port 3001 (API) is in use. Cleaning up..." -ForegroundColor Yellow
    Stop-ProcessOnPort -Port 3001
}

if (Test-Port -Port 3000) {
    Write-Host "⚠️  Port 3000 (Web) is in use. Cleaning up..." -ForegroundColor Yellow
    Stop-ProcessOnPort -Port 3000
}

Write-Host "✅ Ports cleared successfully" -ForegroundColor Green
Write-Host ""

# Start API server first
Write-Host "🚀 Starting API server on port 3001..." -ForegroundColor Blue
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "packages/api" -WindowStyle Minimized
$apiPid = $null

# Wait for API to start
Write-Host "⏳ Waiting for API server to start..." -ForegroundColor Yellow
if (Wait-ForPort -Port 3001 -TimeoutSeconds 30) {
    Write-Host "✅ API server started successfully on port 3001" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start API server on port 3001" -ForegroundColor Red
    Write-Host "💡 Try running 'npm run dev:clean' to reset everything" -ForegroundColor Yellow
    exit 1
}

# Start Web server
Write-Host "🚀 Starting Web server on port 3000..." -ForegroundColor Blue
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "packages/web" -WindowStyle Minimized

# Wait for Web to start
Write-Host "⏳ Waiting for Web server to start..." -ForegroundColor Yellow
if (Wait-ForPort -Port 3000 -TimeoutSeconds 30) {
    Write-Host "✅ Web server started successfully on port 3000" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start Web server on port 3000" -ForegroundColor Red
    Write-Host "💡 Try running 'npm run dev:clean' to reset everything" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 Development environment started successfully!" -ForegroundColor Green
Write-Host "📱 Web App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 API: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 To stop all servers, run: npm run dev:clean" -ForegroundColor Yellow
Write-Host "💡 To start individual servers, run: npm run dev:api or npm run dev:web" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏳ Servers are running in background. Press Ctrl+C to exit this script (servers will continue running)." -ForegroundColor Gray

# Keep script running to show status
try {
    while ($true) {
        $apiStatus = if (Test-Port -Port 3001) { "✅" } else { "❌" }
        $webStatus = if (Test-Port -Port 3000) { "✅" } else { "❌" }
        
        Write-Host "`rStatus: API $apiStatus Web $webStatus" -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}
catch {
    Write-Host ""
    Write-Host "👋 Script stopped. Servers continue running in background." -ForegroundColor Yellow
}
