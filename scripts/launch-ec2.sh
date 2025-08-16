#!/bin/bash

# EC2 Instance Launch Script for Multi-Analysis Application
# This script launches an EC2 instance and deploys the application

set -e

echo "🚀 Launching EC2 instance for Multi-Analysis App..."

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

# Check if configuration file exists
if [ ! -f "aws-config-*.env" ]; then
    print_error "No AWS configuration file found. Please run aws-infrastructure.sh first."
    exit 1
fi

# Load configuration
CONFIG_FILE=$(ls aws-config-*.env | head -1)
print_status "Loading configuration from: $CONFIG_FILE"
source $CONFIG_FILE

# Check required variables
if [ -z "$API_SG_ID" ] || [ -z "$SUBNET1_ID" ] || [ -z "$KEY_NAME" ]; then
    print_error "Missing required configuration variables. Please check $CONFIG_FILE"
    exit 1
fi

# Get current region
REGION=$(aws configure get region)
print_status "Using AWS region: $REGION"

# Step 1: Get latest Amazon Linux 2 AMI
print_step "Getting latest Amazon Linux 2 AMI..."
AMI_ID=$(aws ssm get-parameters \
    --names /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2 \
    --region $REGION \
    --query 'Parameters[0].Value' \
    --output text)

print_status "Using AMI: $AMI_ID"

# Step 2: Create user data script
print_step "Creating user data script..."
USER_DATA=$(cat <<'EOF'
#!/bin/bash
yum update -y
yum install -y docker git

# Start and enable Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# Install nginx
yum install -y nginx
systemctl start nginx
systemctl enable nginx

# Create application directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Clone repository (replace with your actual repository URL)
git clone https://github.com/yourusername/multi-analysis-starter.git .

# Create .env file
cat > .env <<'ENVEOF'
# Database
DATABASE_URL=postgresql://app:${DB_PASSWORD}@${DB_ENDPOINT}:5432/app
REDIS_URL=redis://${REDIS_ENDPOINT}:6379

# API Configuration
API_PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=*

# AWS Configuration
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
ENVEOF

# Install dependencies
cd api && npm install
cd ../app && npm install

# Create nginx configuration
cat > /etc/nginx/conf.d/api.conf <<'NGINXEOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Reload nginx
nginx -t && systemctl reload nginx

# Create systemd service
cat > /etc/systemd/system/multi-analysis.service <<'SERVICEEOF'
[Unit]
Description=Multi Analysis API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Enable and start service
systemctl daemon-reload
systemctl enable multi-analysis
systemctl start multi-analysis

# Create worker service
cat > /etc/systemd/system/multi-analysis-worker.service <<'WORKEREOF'
[Unit]
Description=Multi Analysis Data Pipeline Worker
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app/worker
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
WORKEREOF

# Enable and start worker service
systemctl enable multi-analysis-worker
systemctl start multi-analysis-worker

echo "Deployment completed!"
EOF
)

# Step 3: Launch EC2 instance
print_step "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type t3.medium \
    --key-name $KEY_NAME \
    --security-group-ids $API_SG_ID \
    --subnet-id $SUBNET1_ID \
    --user-data "$USER_DATA" \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=multi-analysis-server}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

print_status "Launched EC2 instance: $INSTANCE_ID"

# Step 4: Wait for instance to be running
print_step "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Step 5: Get public IP
print_step "Getting public IP address..."
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

print_status "Instance public IP: $PUBLIC_IP"

# Step 6: Wait for deployment to complete
print_step "Waiting for deployment to complete (this may take 5-10 minutes)..."
print_warning "The instance is installing and configuring the application. Please wait..."

# Wait for SSH to be available
while ! nc -z $PUBLIC_IP 22; do
    sleep 10
    echo "Waiting for SSH to be available..."
done

# Wait for application to be ready
while ! curl -s http://$PUBLIC_IP/health > /dev/null 2>&1; do
    sleep 30
    echo "Waiting for application to be ready..."
done

print_status "Deployment completed successfully!"

# Step 7: Update configuration file
cat >> $CONFIG_FILE <<EOF

# EC2 Instance
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
EOF

# Step 8: Display summary
echo ""
echo "🎉 EC2 instance deployment completed!"
echo ""
echo "📋 Summary:"
echo "  Instance ID: $INSTANCE_ID"
echo "  Public IP: $PUBLIC_IP"
echo "  Security Group: $API_SG_ID"
echo "  Key Pair: $KEY_NAME"
echo ""
echo "🌐 Your application is available at:"
echo "  API: http://$PUBLIC_IP"
echo "  Health Check: http://$PUBLIC_IP/health"
echo ""
echo "🔧 SSH Access:"
echo "  ssh -i $KEY_FILE ec2-user@$PUBLIC_IP"
echo ""
echo "📊 Monitor your application:"
echo "  Check logs: ssh -i $KEY_FILE ec2-user@$PUBLIC_IP 'sudo journalctl -u multi-analysis -f'"
echo "  Check worker logs: ssh -i $KEY_FILE ec2-user@$PUBLIC_IP 'sudo journalctl -u multi-analysis-worker -f'"
echo ""
echo "⚠️  Important:"
echo "  - Keep your key pair file secure"
echo "  - Consider setting up SSL certificate"
echo "  - Monitor your AWS costs"
echo "  - Set up CloudWatch alarms for monitoring"
echo ""
echo "🚀 Next steps:"
echo "1. Test your application: curl http://$PUBLIC_IP/health"
echo "2. Upload your data files to S3: aws s3 cp data/ s3://$S3_BUCKET/data/ --recursive"
echo "3. Configure your domain name (optional)"
echo "4. Set up monitoring and alerting"
