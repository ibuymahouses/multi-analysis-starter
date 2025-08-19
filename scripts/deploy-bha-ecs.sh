#!/bin/bash

# Deploy BHA Data Pipeline to ECS
# This script sets up the BHA 2025 Payment Standards data pipeline on ECS with monthly updates

set -e

echo "🚀 Deploying BHA Data Pipeline to ECS..."

# Configuration
# Prefer IP from environment or aws-config file; fall back to script default
SSH_KEY="multi-analysis-key-496.pem"
REMOTE_USER="ec2-user"

# Load IP from aws-config if present and not overridden
if [ -z "$EC2_IP" ] && [ -f "aws-config-496.env" ]; then
    EC2_IP=$(grep -E '^PUBLIC_IP=' aws-config-496.env | cut -d'=' -f2)
fi

if [ -z "$EC2_IP" ]; then
    echo "EC2_IP is not set. Please export EC2_IP or update aws-config-*.env"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found: $SSH_KEY"
    print_warning "Please ensure the SSH key is in the current directory"
    exit 1
fi

# Set proper permissions for SSH key
chmod 400 "$SSH_KEY"

print_status "Deploying BHA data pipeline to EC2 instance..."

# Deploy the BHA data pipeline script
scp -i "$SSH_KEY" scripts/bha-2025-payment-standards.py "$REMOTE_USER@$EC2_IP:/opt/rent-api/"

# Deploy the enhanced future-proof version
scp -i "$SSH_KEY" scripts/bha-payment-standards-future.py "$REMOTE_USER@$EC2_IP:/opt/rent-api/"

# Deploy the systemd service
scp -i "$SSH_KEY" scripts/bha-data-pipeline.service "$REMOTE_USER@$EC2_IP:/tmp/"

# Deploy the cron job setup
scp -i "$SSH_KEY" scripts/setup-bha-cron.sh "$REMOTE_USER@$EC2_IP:/tmp/"

print_status "Setting up BHA data pipeline on EC2..."

# SSH into EC2 and set up the pipeline
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_IP" << 'EOF'
set -e

echo "Setting up BHA data pipeline..."

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
cat > /opt/rent-api/.env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:password@localhost:5432/multi_analysis
BHA_DATA_DIR=/opt/rent-api/data
LOG_DIR=/var/log/bha-data
ENVEOF

# Run initial data fetch
echo "Running initial BHA data fetch..."
cd /opt/rent-api
source venv/bin/activate
python3 bha-payment-standards-future.py

echo "BHA data pipeline setup completed!"
EOF

print_status "BHA data pipeline deployed successfully!"
print_status "Monthly updates scheduled for the 1st of each month at 2 AM"
print_status "Data will be automatically updated when new years become available"
