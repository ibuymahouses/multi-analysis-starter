#!/bin/bash

# AWS EC2 Deployment Script for Multi-Analysis App
# This script helps automate the deployment process

set -e

echo "🚀 Starting AWS EC2 deployment for Multi-Analysis App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running on EC2
if [ -f /sys/hypervisor/uuid ] && [ `head -c 3 /sys/hypervisor/uuid` == ec2 ]; then
    print_status "Detected EC2 environment"
    IS_EC2=true
else
    print_warning "This script should be run on an EC2 instance"
    IS_EC2=false
fi

# Update system
print_status "Updating system packages..."
sudo yum update -y

# Install Docker
print_status "Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
print_status "Installing Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# Install nginx
print_status "Installing nginx..."
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create nginx configuration
print_status "Configuring nginx..."
sudo tee /etc/nginx/conf.d/api.conf > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Create application directory
print_status "Setting up application directory..."
mkdir -p ~/app
cd ~/app

# Create .env file template
print_status "Creating environment configuration..."
cat > .env <<EOF
# Database
DATABASE_URL=postgresql://app:app@localhost:5432/app
REDIS_URL=redis://localhost:6379

# API Configuration
API_PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=*

# Add your specific configuration here
EOF

print_warning "Please edit ~/app/.env with your specific configuration"

# Create systemd service for the application
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/multi-analysis.service > /dev/null <<EOF
[Unit]
Description=Multi Analysis API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app
Environment=NODE_ENV=production
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable multi-analysis.service

print_status "Deployment script completed!"
echo ""
echo "📋 Next steps:"
echo "1. Clone your repository: git clone <your-repo-url> ~/app"
echo "2. Edit environment variables: nano ~/app/.env"
echo "3. Start the application: sudo systemctl start multi-analysis"
echo "4. Check status: sudo systemctl status multi-analysis"
echo "5. View logs: sudo journalctl -u multi-analysis -f"
echo ""
echo "🌐 Your API will be available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "🔒 Don't forget to:"
echo "   - Configure your security groups"
echo "   - Set up SSL certificate (Let's Encrypt)"
echo "   - Monitor your application logs"
