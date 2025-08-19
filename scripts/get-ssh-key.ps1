# Get SSH Key Content for GitHub Secrets
# This script helps you extract your SSH private key content for GitHub Actions

param(
    [string]$KeyFile = "multi-analysis-key-496-new.pem"
)

Write-Host "🔑 Extracting SSH key content for GitHub Secrets..." -ForegroundColor Green
Write-Host ""

# Check if key file exists
if (-not (Test-Path $KeyFile)) {
    Write-Host "[ERROR] SSH key file not found: $KeyFile" -ForegroundColor Red
    Write-Host "Please ensure you have the SSH key file in the current directory" -ForegroundColor Red
    exit 1
}

# Read and display the key content
Write-Host "📋 Copy the content below and paste it into GitHub Secret 'EC2_SSH_KEY':" -ForegroundColor Yellow
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

$keyContent = Get-Content $KeyFile -Raw
Write-Host $keyContent -ForegroundColor White

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Instructions:" -ForegroundColor Green
Write-Host "1. Select and copy the entire content above (including BEGIN and END lines)" -ForegroundColor White
Write-Host "2. Go to your GitHub repository → Settings → Secrets and variables → Actions" -ForegroundColor White
Write-Host "3. Click 'New repository secret'" -ForegroundColor White
Write-Host "4. Name: EC2_SSH_KEY" -ForegroundColor White
Write-Host "5. Value: Paste the copied content" -ForegroundColor White
Write-Host "6. Click 'Add secret'" -ForegroundColor White
Write-Host ""

Write-Host "🔒 Security Note: Keep your SSH private key secure and never commit it to your repository!" -ForegroundColor Red
