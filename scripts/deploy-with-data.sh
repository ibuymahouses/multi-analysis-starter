#!/bin/bash

# Deployment Script with Data Files
# This script deploys your working local application AND data files to AWS EC2

set -e

echo "🚀 Deploying Multi-Analysis App with Data Files to AWS EC2..."

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

print_step "Creating deployment package with data files..."
# Create a temporary deployment directory
DEPLOY_DIR="deploy-with-data"
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

# Copy data files - THIS IS THE KEY ADDITION
print_step "Copying data files..."
cp -r data "$DEPLOY_DIR/"
print_status "Data files copied:"
ls -la "$DEPLOY_DIR/data/"

print_step "Copying files to EC2 instance..."
scp -i "$KEY_FILE" -r "$DEPLOY_DIR" "$EC2_USER@$EC2_IP:$APP_DIR"

print_step "Setting up and starting services on EC2..."
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
cd ~/app/deploy-with-data

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

# Verify data files are present
echo "Verifying data files..."
ls -la data/
echo "Data file sizes:"
du -h data/*.json

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
NEXT_PUBLIC_API_URL=http://$EC2_IP:3001
CORS_ORIGINS=http://$EC2_IP:3000
ENVEOF

# Start the API server
echo "Starting API server..."
cd api-src
nohup node index.js > ../api.log 2>&1 &
API_PID=$!
echo $API_PID > ../api.pid

# Wait a moment for API to start
sleep 3

# Test the API health endpoint
echo "Testing API health endpoint..."
if ! curl -s http://localhost:3001/health; then
    echo "❌ API health check failed"
    echo "This may indicate the API didn't start properly"
fi

# Start the web server
echo "Starting web server..."
cd ../web-src
nohup npm run dev > ../web.log 2>&1 &
WEB_PID=$!
echo $WEB_PID > ../web.pid

echo "✅ Application deployed successfully!"
echo "🌐 Frontend: http://$EC2_IP:3000"
echo "🔌 API: http://$EC2_IP:3001"
echo ""
echo "📋 To check status:"
echo "   ps aux | grep node"
echo ""
echo "📝 To view logs:"
echo "   tail -f api.log"
echo "   tail -f web.log"
echo ""
echo "🔍 To test data loading:"
echo "   curl http://localhost:3001/health"
EOF

print_step "Cleaning up..."
rm -rf "$DEPLOY_DIR"

print_status "Deployment completed successfully!"
echo ""
echo "🎉 Your application with data files is now running on AWS!"
echo "🌐 Frontend: http://$EC2_IP:3000"
echo "🔌 API: http://$EC2_IP:3001"
echo ""
echo "📋 To check the status:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   ps aux | grep node"
echo ""
echo "📝 To view logs:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   tail -f ~/app/deploy-with-data/api.log"
echo "   tail -f ~/app/deploy-with-data/web.log"
echo ""
echo "🔍 To verify data is loaded:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   curl http://localhost:3001/health"
