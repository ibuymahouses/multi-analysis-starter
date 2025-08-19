# PowerShell script to check local versions
Write-Host "🔍 Checking local environment versions..." -ForegroundColor Green
Write-Host ""

Write-Host "📋 LOCAL ENVIRONMENT VERSIONS:" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
Write-Host "Node.js: $(node --version)"
Write-Host "npm: $(npm --version)"
Write-Host ""

Write-Host "📦 LOCAL PACKAGE VERSIONS:" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

# Check web package versions
if (Test-Path "packages/web") {
    Set-Location "packages/web"
    Write-Host "Next.js: $(npm list next --depth=0 | Select-String 'next@')"
    Write-Host "React: $(npm list react --depth=0 | Select-String 'react@')"
    Write-Host "TypeScript: $(npm list typescript --depth=0 | Select-String 'typescript@')"
    Set-Location "../.."
} else {
    Write-Host "❌ Web package not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔍 COMPARISON GUIDE:" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
Write-Host "Compare these versions with what you see on EC2:"
Write-Host "1. Node.js version (should be 18.x)"
Write-Host "2. npm version (should be 8.x or higher)"
Write-Host "3. Next.js version (should be 14.2.31)"
Write-Host "4. TypeScript version (should be 5.9.2)"
Write-Host "5. React version (should be 18.2.0)"
Write-Host ""
Write-Host "⚠️  If versions differ, that could explain the build failures!" -ForegroundColor Red
