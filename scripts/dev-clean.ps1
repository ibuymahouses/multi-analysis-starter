#!/usr/bin/env pwsh

Write-Host "🧹 Cleaning up Multi-Analysis Development Environment..." -ForegroundColor Green
Write-Host ""

# Function to kill processes using a specific port
function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        if ($processes) {
            Write-Host "🔄 Stopping $ServiceName processes on port $Port..." -ForegroundColor Yellow
            foreach ($pid in $processes) {
                if ($pid -gt 0) {
                    try {
                        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                        if ($process) {
                            Write-Host "  - Stopping process $pid ($($process.ProcessName))" -ForegroundColor Gray
                            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        }
                    }
                    catch {
                        Write-Host "  - Process $pid already stopped" -ForegroundColor Gray
                    }
                }
            }
        } else {
            Write-Host "✅ No $ServiceName processes found on port $Port" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Warning: Could not check processes on port $Port" -ForegroundColor Yellow
    }
}

# Function to kill npm processes
function Stop-NpmProcesses {
    try {
        $npmProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" }
        if ($npmProcesses) {
            Write-Host "🔄 Stopping Node.js processes..." -ForegroundColor Yellow
            foreach ($process in $npmProcesses) {
                try {
                    $processPath = $process.Path
                    if ($processPath -and ($processPath -like "*multi-analysis*" -or $processPath -like "*packages*")) {
                        Write-Host "  - Stopping Node.js process $($process.Id) ($processPath)" -ForegroundColor Gray
                        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                    }
                }
                catch {
                    Write-Host "  - Could not stop process $($process.Id)" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "✅ No Node.js processes found" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Warning: Could not check Node.js processes" -ForegroundColor Yellow
    }
}

# Stop processes on specific ports
Write-Host "🔍 Checking for processes to stop..." -ForegroundColor Blue

Stop-ProcessOnPort -Port 3001 -ServiceName "API"
Stop-ProcessOnPort -Port 3000 -ServiceName "Web"

# Stop npm processes
Stop-NpmProcesses

# Wait a moment for processes to fully stop
Write-Host "⏳ Waiting for processes to fully stop..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify ports are free
Write-Host "🔍 Verifying ports are free..." -ForegroundColor Blue

$apiPortFree = $true
$webPortFree = $true

try {
    $apiConnections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($apiConnections) {
        $apiPortFree = $false
        Write-Host "⚠️  Port 3001 (API) still has connections" -ForegroundColor Yellow
    }
} catch {
    $apiPortFree = $true
}

try {
    $webConnections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($webConnections) {
        $webPortFree = $false
        Write-Host "⚠️  Port 3000 (Web) still has connections" -ForegroundColor Yellow
    }
} catch {
    $webPortFree = $true
}

if ($apiPortFree -and $webPortFree) {
    Write-Host "✅ All ports are now free" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some ports may still be in use" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Cleanup completed!" -ForegroundColor Green
Write-Host "💡 You can now run 'npm run dev' to start fresh" -ForegroundColor Cyan
Write-Host ""
