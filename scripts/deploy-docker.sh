#!/bin/bash

# Docker-based AWS Deployment Script
# This script deploys your application using Docker to avoid Node.js compatibility issues

set -e

echo "🐳 Docker-based AWS Deployment for Multi-Analysis App..."

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
DEPLOY_DIR="deploy-docker"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy the working application files
cp -r packages/api/dist "$DEPLOY_DIR/api-dist"
cp -r packages/web/.next "$DEPLOY_DIR/web-next"
cp -r packages/web/public "$DEPLOY_DIR/web-public" 2>/dev/null || mkdir -p "$DEPLOY_DIR/web-public"
cp -r packages/web/next.config.mjs "$DEPLOY_DIR/"
cp -r packages/web/package.json "$DEPLOY_DIR/"
cp -r packages/web/tsconfig.json "$DEPLOY_DIR/"
cp -r packages/web/tailwind.config.js "$DEPLOY_DIR/"
cp -r packages/web/postcss.config.js "$DEPLOY_DIR/"
cp -r packages/api/package.json "$DEPLOY_DIR/api-package.json"
cp -r packages/shared/dist "$DEPLOY_DIR/shared-dist"
cp -r packages/shared/package.json "$DEPLOY_DIR/shared-package.json"
cp docker-compose.yml "$DEPLOY_DIR/"
cp .env "$DEPLOY_DIR/"

# Create Dockerfile for the API
cat > "$DEPLOY_DIR/Dockerfile.api" << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY api-package.json ./api/
COPY shared-package.json ./shared/
COPY api-dist ./api/dist/
COPY shared-dist ./shared/dist/
RUN cd shared && npm install --production
RUN cd api && npm install --production
EXPOSE 3001
CMD ["node", "api/dist/index.js"]
EOF

# Create Dockerfile for the web app
cat > "$DEPLOY_DIR/Dockerfile.web" << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
COPY next.config.mjs ./
COPY web-next ./.next/
COPY web-public ./public/
COPY shared-dist ./shared/dist/
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Create docker-compose for production
cat > "$DEPLOY_DIR/docker-compose.prod.yml" << 'EOF'
version: '3.8'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_HOST=multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com
      - DB_PORT=5432
      - DB_NAME=multi_analysis
      - DB_USER=postgres
      - DB_PASSWORD=YOUR_DB_PASSWORD_HERE
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - CORS_ORIGINS=http://52.44.168.76:3000
    depends_on:
      - redis

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://52.44.168.76:3001
    depends_on:
      - api

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
EOF

print_step "Copying files to EC2 instance..."
scp -i "$KEY_FILE" -r "$DEPLOY_DIR" "$EC2_USER@$EC2_IP:$APP_DIR"

print_step "Building and starting Docker containers on EC2..."
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
cd ~/app/deploy-docker

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
    newgrp docker
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Build and start the services
echo "Building and starting Docker containers..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "✅ Application deployed successfully with Docker!"
echo "🌐 Frontend: http://52.44.168.76:3000"
echo "🔌 API: http://52.44.168.76:3001"
echo ""
echo "📋 To check status:"
echo "   docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "📝 To view logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
EOF

print_step "Cleaning up..."
rm -rf "$DEPLOY_DIR"

print_status "Deployment completed successfully!"
echo ""
echo "🎉 Your application is now running on AWS with Docker!"
echo "🌐 Frontend: http://$EC2_IP:3000"
echo "🔌 API: http://$EC2_IP:3001"
echo ""
echo "📋 To check the status:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   docker-compose -f ~/app/deploy-docker/docker-compose.prod.yml ps"
echo ""
echo "📝 To view logs:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   docker-compose -f ~/app/deploy-docker/docker-compose.prod.yml logs -f"
