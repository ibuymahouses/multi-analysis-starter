#!/bin/bash

# Deploy Data Pipeline to EC2
# This script deploys the data pipeline setup to your existing EC2 instance

set -e

echo "🚀 Deploying Data Pipeline to EC2..."

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

print_status "Connecting to EC2 instance at $EC2_IP..."

# Copy the data pipeline setup script to EC2
print_status "Copying data pipeline setup script..."
scp -i "$SSH_KEY" scripts/data-pipeline-setup.sh "$REMOTE_USER@$EC2_IP:/tmp/"

# Copy data files to EC2 (if they exist locally)
if [ -d "data" ]; then
    print_status "Copying data files..."
    scp -i "$SSH_KEY" -r data "$REMOTE_USER@$EC2_IP:/home/$REMOTE_USER/app/"
fi

# Execute the setup script on EC2
print_status "Running data pipeline setup on EC2..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_IP" << 'EOF'
    # Make the script executable and run it
    chmod +x /tmp/data-pipeline-setup.sh
    sudo /tmp/data-pipeline-setup.sh
EOF

# Copy environment configuration
print_status "Setting up environment configuration..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_IP" << 'EOF'
    # Create .env file from template
    if [ -f "/opt/data-pipeline/.env.template" ]; then
        cp /opt/data-pipeline/.env.template /opt/data-pipeline/.env
        echo "Environment file created. Please edit /opt/data-pipeline/.env with your database password and API keys."
    fi
EOF

# Test the data pipeline
print_status "Testing data pipeline..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_IP" << 'EOF'
    cd /opt/data-pipeline
    source venv/bin/activate
    
    # Test rent data pipeline
    echo "Testing rent data pipeline..."
    python update_rents.py
    
    # Test listings pipeline
    echo "Testing listings pipeline..."
    python update_listings.py
EOF

# Check service status
print_status "Checking data pipeline service status..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_IP" << 'EOF'
    sudo systemctl status data-pipeline --no-pager
EOF

print_status "Data pipeline deployment completed!"
print_warning "Next steps:"
echo "1. SSH into your EC2 instance: ssh -i $SSH_KEY $REMOTE_USER@$EC2_IP"
echo "2. Edit the environment file: sudo nano /opt/data-pipeline/.env"
echo "3. Add your database password and API keys"
echo "4. Restart the service: sudo systemctl restart data-pipeline"
echo "5. Monitor logs: tail -f /opt/data-pipeline/logs/pipeline.log"
echo ""
echo "The data pipeline will automatically run:"
echo "- Rent data updates: Daily at 2:00 AM"
echo "- Listings updates: Daily at 3:00 AM"
