#!/bin/bash

# Deploy Multi-Analysis App to EC2 Instance
# This script deploys your local application to your AWS EC2 instance

set -e

echo "🚀 Deploying Multi-Analysis App to AWS EC2..."

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
# Prefer IP from environment or aws-config file; fall back to required env
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

print_step "Building application..."
npm run build

print_step "Creating deployment package..."
# Create a temporary deployment directory
DEPLOY_DIR="deploy-temp"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
cp -r packages/api/dist "$DEPLOY_DIR/api"
cp -r packages/web/.next "$DEPLOY_DIR/web"
cp -r packages/web/public "$DEPLOY_DIR/web"
cp -r packages/web/package.json "$DEPLOY_DIR/web"
cp -r packages/api/package.json "$DEPLOY_DIR/api"
cp -r packages/shared/dist "$DEPLOY_DIR/shared"
cp docker-compose.yml "$DEPLOY_DIR/"
cp .env "$DEPLOY_DIR/"

print_step "Copying files to EC2 instance..."
scp -i "$KEY_FILE" -r "$DEPLOY_DIR" "$EC2_USER@$EC2_IP:$APP_DIR"

print_step "Installing dependencies and starting services on EC2..."
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
cd ~/app/deploy-temp

# Install dependencies
npm install --prefix api
npm install --prefix web
npm install --prefix shared

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

# Start services using Docker Compose
docker-compose up -d

echo "✅ Application deployed successfully!"
echo "🌐 Frontend: http://$EC2_IP:3000"
echo "🔌 API: http://$EC2_IP:3001"
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
echo "   docker-compose ps"
echo ""
echo "📝 To view logs:"
echo "   docker-compose logs -f"

