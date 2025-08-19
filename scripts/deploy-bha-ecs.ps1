# Deploy BHA Data Pipeline to ECS
# This script sets up the BHA 2025 Payment Standards data pipeline on ECS with monthly updates

param(
    [string]$EC2_IP = $env:EC2_IP,
    [string]$SSH_KEY = "multi-analysis-key-496-new.pem",
    [string]$REMOTE_USER = "ec2-user"
)

if (-not $EC2_IP) {
    # Try to read from aws-config-*.env
    $configPath = Join-Path (Get-Location) "aws-config-496.env"
    if (Test-Path $configPath) {
        $line = (Get-Content $configPath | Where-Object { $_ -match '^PUBLIC_IP=' })
        if ($line) { $EC2_IP = $line.Split('=')[1] }
    }
}

if (-not $EC2_IP) {
    Write-Host "EC2_IP is not set. Set EC2_IP env var or update aws-config-*.env" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying BHA Data Pipeline to ECS..." -ForegroundColor Green

# Check if SSH key exists
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "❌ SSH key not found: $SSH_KEY" -ForegroundColor Red
    Write-Host "⚠️  Please ensure the SSH key is in the current directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Deploying BHA data pipeline to EC2 instance at $EC2_IP..." -ForegroundColor Green

# Deploy the BHA data pipeline script
Write-Host "📤 Uploading BHA data pipeline scripts..." -ForegroundColor Cyan
$remoteHost = "$REMOTE_USER@$EC2_IP"

scp -i $SSH_KEY scripts/bha-2025-payment-standards.py "$remoteHost`:/opt/rent-api/"
scp -i $SSH_KEY scripts/bha-payment-standards-future.py "$remoteHost`:/opt/rent-api/"
scp -i $SSH_KEY scripts/bha-data-pipeline.service "$remoteHost`:/tmp/"
scp -i $SSH_KEY scripts/setup-bha-cron.sh "$remoteHost`:/tmp/"

Write-Host "✅ Setting up BHA data pipeline on EC2..." -ForegroundColor Green

# Execute setup commands on EC2
Write-Host "🔧 Running setup commands on EC2..." -ForegroundColor Cyan

ssh -i $SSH_KEY $remoteHost @"
set -e
echo 'Setting up BHA data pipeline...'

# Create necessary directories
sudo mkdir -p /opt/rent-api/data
sudo mkdir -p /var/log/bha-data
sudo chown -R ec2-user:ec2-user /opt/rent-api
sudo chown -R ec2-user:ec2-user /var/log/bha-data

# Install Python dependencies
cd /opt/rent-api
python3 -m venv venv
source venv/bin/activate
pip install requests pandas psycopg2-binary sqlalchemy

# Make scripts executable
chmod +x bha-2025-payment-standards.py
chmod +x bha-payment-standards-future.py

# Set up systemd service
sudo mv /tmp/bha-data-pipeline.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bha-data-pipeline

# Set up monthly cron job (runs on the 1st of each month at 2 AM)
sudo mv /tmp/setup-bha-cron.sh /opt/rent-api/
chmod +x /opt/rent-api/setup-bha-cron.sh
/opt/rent-api/setup-bha-cron.sh

# Create environment file
echo 'DATABASE_URL=postgresql://postgres:password@localhost:5432/multi_analysis' > /opt/rent-api/.env
echo 'BHA_DATA_DIR=/opt/rent-api/data' >> /opt/rent-api/.env
echo 'LOG_DIR=/var/log/bha-data' >> /opt/rent-api/.env

# Run initial data fetch
echo 'Running initial BHA data fetch...'
cd /opt/rent-api
source venv/bin/activate
python3 bha-payment-standards-future.py

echo 'BHA data pipeline setup completed!'
"@

Write-Host "✅ BHA data pipeline deployed successfully!" -ForegroundColor Green
Write-Host "📅 Monthly updates scheduled for the 1st of each month at 2 AM" -ForegroundColor Cyan
Write-Host "🔄 Data will be automatically updated when new years become available" -ForegroundColor Cyan
