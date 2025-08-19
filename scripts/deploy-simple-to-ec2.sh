#!/bin/bash

# Deploy Simple Multi-Analysis App to EC2 Instance
# This script deploys the deploy-simple structure to your AWS EC2 instance

set -e

echo "🚀 Deploying Simple Multi-Analysis App to AWS EC2..."

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
KEY_FILE="multi-analysis-key-496-new.pem"
EC2_USER="ec2-user"
EC2_IP="52.44.168.76"
APP_DIR="~/multi-analysis-starter"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    print_error "SSH key file not found: $KEY_FILE"
    print_error "Please ensure you have the SSH key file in the current directory"
    exit 1
fi

# Set proper permissions for key file
chmod 400 "$KEY_FILE"

print_step "Copying deploy-simple files to EC2 instance..."
scp -i "$KEY_FILE" -r deploy-simple "$EC2_USER@$EC2_IP:$APP_DIR/"

print_step "Installing dependencies and starting API on EC2..."
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
cd ~/multi-analysis-starter/deploy-simple

# Install dependencies
npm install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3001
CORS_ORIGINS=http://localhost:3000,http://52.44.168.76:3000
ENVEOF
fi

# Stop any existing API process
pkill -f "node.*api-src/index.js" || true

# Start the API in the background
nohup node api-src/index.js > api.log 2>&1 &

# Wait a moment for the process to start
sleep 3

# Check if the API is running
if pgrep -f "node.*api-src/index.js" > /dev/null; then
    echo "✅ API started successfully!"
    echo "📝 Logs are being written to api.log"
    echo "🔌 API should be available on port 3001"
else
    echo "❌ Failed to start API"
    echo "📝 Check api.log for error details"
    cat api.log
fi
EOF

print_status "Deployment completed!"
echo ""
echo "🎉 Your simple API is now running on AWS!"
echo "🔌 API: http://$EC2_IP:3001"
echo ""
echo "📋 To check the status:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   cd ~/multi-analysis-starter/deploy-simple"
echo "   ps aux | grep node"
echo ""
echo "📝 To view logs:"
echo "   tail -f api.log"
echo ""
echo "🔄 To restart the API:"
echo "   pkill -f 'node.*api-src/index.js'"
echo "   nohup node api-src/index.js > api.log 2>&1 &"
