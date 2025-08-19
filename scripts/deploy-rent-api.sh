#!/bin/bash

# Deploy Rent API to EC2
# This script deploys the rent data API setup to your existing EC2 instance

set -e

echo "🏠 Deploying Rent API to EC2..."

# Configuration
# Prefer IP from environment or aws-config file; fall back to required env
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
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_status "Connecting to EC2 instance at $EC2_IP..."

# Copy the rent API setup script to EC2
print_status "Copying rent API setup script..."
scp -i "$SSH_KEY" scripts/setup-rent-api.sh "$REMOTE_USER@$EC2_IP:/tmp/"

# Execute the setup script on EC2
print_status "Running rent API setup on EC2..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_IP" << 'EOF'
    # Make the script executable and run it
    chmod +x /tmp/setup-rent-api.sh
    sudo /tmp/setup-rent-api.sh
EOF

# Create environment file
print_status "Setting up environment configuration..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_IP" << 'EOF'
    # Create .env file from template
    if [ -f "/opt/rent-api/.env.template" ]; then
        cp /opt/rent-api/.env.template /opt/rent-api/.env
        echo "Environment file created at /opt/rent-api/.env"
        echo "Please edit this file with your database password and rent API credentials"
    fi
EOF

print_status "Rent API deployment completed!"
print_warning "Next steps:"
echo "1. SSH into your EC2 instance: ssh -i $SSH_KEY $REMOTE_USER@$EC2_IP"
echo "2. Edit the environment file: sudo nano /opt/rent-api/.env"
echo "3. Add your database password and rent API credentials:"
echo "   - DB_PASSWORD=your_actual_db_password"
echo "   - RENT_API_URL=https://your-rent-api-provider.com/api/rents"
echo "   - RENT_API_KEY=your_rent_api_key_here"
echo "4. Test the API: cd /opt/rent-api && source venv/bin/activate && python fetch_rents.py"
echo "5. Check timer status: sudo systemctl status rent-api.timer"
echo "6. View logs: tail -f /opt/rent-api/logs/rent_api.log"
echo ""
echo "The rent API will automatically run daily at midnight"
echo ""
echo "📋 What you need to provide to your rent data provider:"
echo "   - IP Address: $EC2_IP"
echo "   - User Agent: Multi-Analysis-Rent-API/1.0"
echo "   - Expected endpoints: /api/rents (or whatever they specify)"
