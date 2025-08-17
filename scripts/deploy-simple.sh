#!/bin/bash

# Simple AWS Deployment Script
# This script deploys your working local application to AWS EC2

set -e

echo "🚀 Simple AWS Deployment for Multi-Analysis App..."

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
EC2_IP="52.44.168.76"
KEY_FILE="multi-analysis-key-496.pem"
EC2_USER="ec2-user"
APP_DIR="~/app"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    print_error "SSH key file not found: $KEY_FILE"
    print_error "Please ensure you have the SSH key file in the current directory"
    exit 1
fi

# Set proper permissions for key file
chmod 400 "$KEY_FILE"

print_step "Creating deployment package..."
# Create a temporary deployment directory
DEPLOY_DIR="deploy-simple"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy the working application files
cp -r packages/api/src "$DEPLOY_DIR/api-src"
cp -r packages/web/src "$DEPLOY_DIR/web-src"
cp -r packages/web/next.config.mjs "$DEPLOY_DIR/"
cp -r packages/web/package.json "$DEPLOY_DIR/"
cp -r packages/web/tsconfig.json "$DEPLOY_DIR/"
cp -r packages/web/tailwind.config.js "$DEPLOY_DIR/"
cp -r packages/web/postcss.config.js "$DEPLOY_DIR/"
cp -r packages/api/package.json "$DEPLOY_DIR/api-package.json"
cp -r packages/shared/src "$DEPLOY_DIR/shared-src"
cp -r packages/shared/package.json "$DEPLOY_DIR/shared-package.json"
cp docker-compose.yml "$DEPLOY_DIR/"
cp .env "$DEPLOY_DIR/"

print_step "Copying files to EC2 instance..."
scp -i "$KEY_FILE" -r "$DEPLOY_DIR" "$EC2_USER@$EC2_IP:$APP_DIR"

print_step "Setting up and starting services on EC2..."
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
cd ~/app/deploy-simple

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    source ~/.bashrc
    nvm install 18
    nvm use 18
    nvm alias default 18
fi

# Install dependencies
echo "Installing dependencies..."
npm install --prefix shared-src
npm install --prefix api-src
npm install --prefix web-src

# Create production environment
cat > .env.production << 'ENVEOF'
NODE_ENV=production
API_PORT=3001
WEB_PORT=3000
DB_HOST=multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=YOUR_DB_PASSWORD_HERE
REDIS_HOST=localhost
REDIS_PORT=6379
NEXT_PUBLIC_API_URL=http://52.44.168.76:3001
CORS_ORIGINS=http://52.44.168.76:3000
ENVEOF

# Start the API server
echo "Starting API server..."
cd api-src
nohup node index.js > ../api.log 2>&1 &
API_PID=$!
echo $API_PID > ../api.pid

# Start the web server
echo "Starting web server..."
cd ../web-src
nohup npm run dev > ../web.log 2>&1 &
WEB_PID=$!
echo $WEB_PID > ../web.pid

echo "✅ Application deployed successfully!"
echo "🌐 Frontend: http://52.44.168.76:3000"
echo "🔌 API: http://52.44.168.76:3001"
echo ""
echo "📋 To check status:"
echo "   ps aux | grep node"
echo ""
echo "📝 To view logs:"
echo "   tail -f api.log"
echo "   tail -f web.log"
EOF

print_step "Cleaning up..."
rm -rf "$DEPLOY_DIR"

print_status "Deployment completed successfully!"
echo ""
echo "🎉 Your application is now running on AWS!"
echo "🌐 Frontend: http://$EC2_IP:3000"
echo "🔌 API: http://$EC2_IP:3001"
echo ""
echo "📋 To check the status:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   ps aux | grep node"
echo ""
echo "📝 To view logs:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   tail -f ~/app/deploy-simple/api.log"
echo "   tail -f ~/app/deploy-simple/web.log"
