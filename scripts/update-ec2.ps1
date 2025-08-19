# Update EC2 Deployment with Latest GitHub Changes
# PowerShell version for Windows users

param(
    [string]$EC2_IP,
    [string]$KeyFile = "multi-analysis-key-496-new.pem",
    [string]$EC2User = "ec2-user"
)

Write-Host "🔄 Updating EC2 deployment with latest GitHub changes..." -ForegroundColor Green

# Load IP from aws-config if present and not overridden
if (-not $EC2_IP -and (Test-Path "aws-config-496.env")) {
    $configContent = Get-Content "aws-config-496.env"
    $publicIpLine = $configContent | Where-Object { $_ -match "^PUBLIC_IP=" }
    if ($publicIpLine) {
        $EC2_IP = $publicIpLine.Split('=')[1]
    }
}

if (-not $EC2_IP) {
    Write-Host "[ERROR] EC2_IP is not set. Please provide -EC2_IP parameter or update aws-config-*.env" -ForegroundColor Red
    exit 1
}

# Check if key file exists
if (-not (Test-Path $KeyFile)) {
    Write-Host "[ERROR] SSH key file not found: $KeyFile" -ForegroundColor Red
    Write-Host "[ERROR] Please ensure you have the SSH key file in the current directory" -ForegroundColor Red
    exit 1
}

Write-Host "[STEP] Connecting to EC2 and updating application..." -ForegroundColor Blue

# Create the SSH command
$sshCommand = @"
echo "🔄 Starting EC2 update process..."

# Navigate to app directory
cd ~/app

# Check if git repository exists
if [ -d "multi-analysis-starter" ]; then
    echo "📁 Found existing repository, pulling latest changes..."
    cd multi-analysis-starter
    
    # Stash any local changes (if any)
    git stash
    
    # Pull latest changes
    git pull origin main
    
    # If there were stashed changes, pop them back
    git stash pop 2>/dev/null || true
else
    echo "📁 No existing repository found, cloning fresh..."
    rm -rf multi-analysis-starter
    git clone https://github.com/your-username/multi-analysis-starter.git
    cd multi-analysis-starter
fi

echo "📦 Installing dependencies..."
npm run install:all

echo "🔨 Building application..."
npm run build

echo "🔄 Restarting application..."

# Check which deployment method is being used
if [ -f "docker-compose.yml" ] || [ -f "docker-compose.prod.yml" ]; then
    echo "🐳 Restarting Docker containers..."
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml up -d --build
    else
        docker-compose down
        docker-compose up -d --build
    fi
elif command -v pm2 &> /dev/null; then
    echo "⚡ Restarting PM2 processes..."
    pm2 restart all
elif systemctl is-active --quiet multi-analysis; then
    echo "🔧 Restarting systemd service..."
    sudo systemctl restart multi-analysis
else
    echo "⚠️  No known process manager found. Please restart manually."
fi

echo "✅ Update completed successfully!"
echo "🌐 Frontend: http://$EC2_IP:3000"
echo "🔌 API: http://$EC2_IP:3001"
"@

# Execute SSH command
Write-Host "Executing update on EC2 instance..." -ForegroundColor Yellow
ssh -i $KeyFile "$EC2User@$EC2_IP" $sshCommand

Write-Host "[INFO] EC2 update completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Your EC2 instance has been updated with the latest changes!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://$EC2_IP:3000" -ForegroundColor Cyan
Write-Host "🔌 API: http://$EC2_IP:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 To verify the update:" -ForegroundColor Yellow
Write-Host "   ssh -i $KeyFile $EC2User@$EC2_IP" -ForegroundColor White
Write-Host "   curl -I http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📝 To view logs:" -ForegroundColor Yellow
Write-Host "   ssh -i $KeyFile $EC2User@$EC2_IP" -ForegroundColor White
Write-Host "   # For Docker: docker-compose logs -f" -ForegroundColor White
Write-Host "   # For PM2: pm2 logs" -ForegroundColor White
Write-Host "   # For systemd: sudo journalctl -u multi-analysis -f" -ForegroundColor White
