#!/bin/bash

# Enterprise Frontend Deployment Script
# Deploys the Next.js frontend to EC2 with proper production setup

set -e

echo "🚀 Enterprise Frontend Deployment to EC2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Configuration
KEY_FILE="multi-analysis-key-496-new.pem"
EC2_USER="ec2-user"
EC2_IP="52.44.168.76"
API_URL="http://52.44.168.76:3001"

# Validation
if [ ! -f "$KEY_FILE" ]; then
    print_error "SSH key file not found: $KEY_FILE"
    exit 1
fi

chmod 400 "$KEY_FILE"

print_step "Building Next.js application for production..."
cd packages/web

# Clean previous build
rm -rf .next

# Set production environment
export NODE_ENV=production
export NEXT_PUBLIC_API_URL="$API_URL"

# Build the application
npm run build

if [ ! -d ".next" ]; then
    print_error "Build failed - .next directory not found"
    exit 1
fi

print_step "Creating deployment package..."
cd ../..

# Create deployment directory
DEPLOY_DIR="frontend-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy built application
cp -r packages/web/.next "$DEPLOY_DIR/"
cp packages/web/package.json "$DEPLOY_DIR/"
cp packages/web/next.config.mjs "$DEPLOY_DIR/"

# Copy shared package (needed for runtime)
mkdir -p "$DEPLOY_DIR/shared"
cp -r packages/shared/src "$DEPLOY_DIR/shared/"
cp packages/shared/package.json "$DEPLOY_DIR/shared/"

print_step "Copying deployment package to EC2..."
scp -i "$KEY_FILE" -r "$DEPLOY_DIR" "$EC2_USER@$EC2_IP:~/multi-analysis-starter/"

print_step "Setting up frontend on EC2..."
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
cd ~/multi-analysis-starter/frontend-deploy

# Install dependencies
npm install --production

# Install shared package
cd shared
npm install --production
cd ..

# Create production environment file
cat > .env.production << 'ENVEOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://52.44.168.76:3001
PORT=3000
ENVEOF

# Stop any existing frontend process
pkill -f "next start" || true

# Start the frontend with PM2 (if available) or nohup
if command -v pm2 &> /dev/null; then
    pm2 delete frontend || true
    pm2 start npm --name "frontend" -- start
    pm2 save
    echo "✅ Frontend started with PM2"
else
    nohup npm start > frontend.log 2>&1 &
    echo "✅ Frontend started with nohup (PID: $!)"
fi

# Wait for startup
sleep 5

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is responding on port 3000"
else
    echo "❌ Frontend failed to start - check frontend.log"
    tail -20 frontend.log
fi
EOF

print_step "Cleaning up..."
rm -rf "$DEPLOY_DIR"

print_status "Enterprise frontend deployment completed!"
echo ""
echo "🎉 Your enterprise frontend is now running!"
echo "🌐 Frontend: http://$EC2_IP:3000"
echo "🔌 API: http://$EC2_IP:3001"
echo ""
echo "📋 To check status:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   cd ~/multi-analysis-starter/frontend-deploy"
echo "   pm2 status (if using PM2)"
echo "   tail -f frontend.log (if using nohup)"
echo ""
echo "🔄 To restart:"
echo "   pm2 restart frontend (if using PM2)"
echo "   pkill -f 'next start' && nohup npm start > frontend.log 2>&1 &"
