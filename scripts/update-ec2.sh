#!/bin/bash

# Update EC2 Deployment with Latest GitHub Changes
# This script updates your EC2 instance with the latest code from GitHub

set -e

echo "🔄 Updating EC2 deployment with latest GitHub changes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Configuration
KEY_FILE="multi-analysis-key-496.pem"
EC2_USER="ec2-user"
APP_DIR="~/app"

# Load IP from aws-config if present and not overridden
if [ -z "$EC2_IP" ] && [ -f "aws-config-496.env" ]; then
    EC2_IP=$(grep -E '^PUBLIC_IP=' aws-config-496.env | cut -d'=' -f2)
fi

if [ -z "$EC2_IP" ]; then
    print_error "EC2_IP is not set. Please export EC2_IP or update aws-config-*.env"
    exit 1
fi

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    print_error "SSH key file not found: $KEY_FILE"
    print_error "Please ensure you have the SSH key file in the current directory"
    exit 1
fi

# Set proper permissions for key file
chmod 400 "$KEY_FILE"

print_step "Connecting to EC2 and updating application..."

ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
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
EOF

print_status "EC2 update completed successfully!"
echo ""
echo "🎉 Your EC2 instance has been updated with the latest changes!"
echo "🌐 Frontend: http://$EC2_IP:3000"
echo "🔌 API: http://$EC2_IP:3001"
echo ""
echo "📋 To verify the update:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   curl -I http://localhost:3000"
echo ""
echo "📝 To view logs:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   # For Docker: docker-compose logs -f"
echo "   # For PM2: pm2 logs"
echo "   # For systemd: sudo journalctl -u multi-analysis -f"
