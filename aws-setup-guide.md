# AWS Setup Guide for Multi-Analysis Application

## Prerequisites

### 1. AWS Account & CLI Setup
```bash
# Install AWS CLI
# Windows (using PowerShell):
winget install Amazon.AWSCLI

# Or download from: https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID, Secret Access Key, default region (e.g., us-east-1)
```

### 2. Install Required Tools
```bash
# Install Docker Desktop for Windows
# Download from: https://www.docker.com/products/docker-desktop/

# Install Node.js (if not already installed)
# Download from: https://nodejs.org/
```

## Architecture Overview

Your application will be deployed with the following AWS services:

1. **EC2** - Main application server (API + Frontend)
2. **RDS** - PostgreSQL database
3. **ElastiCache** - Redis for caching
4. **S3** - Static file storage
5. **CloudWatch** - Monitoring and logging
6. **Route 53** - DNS management (optional)
7. **ACM** - SSL certificates

## Step-by-Step Deployment

### Step 1: Create AWS Infrastructure

#### 1.1 Create VPC and Security Groups
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications ResourceType=vpc,Tags=[{Key=Name,Value=multi-analysis-vpc}]

# Create subnets
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Create security groups
aws ec2 create-security-group --group-name multi-analysis-api --description "Security group for API"
aws ec2 create-security-group --group-name multi-analysis-db --description "Security group for database"
```

#### 1.2 Create RDS Database
```bash
# Create RDS subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name multi-analysis-db-subnet \
  --db-subnet-group-description "Subnet group for multi-analysis database" \
  --subnet-ids <subnet-1-id> <subnet-2-id>

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier multi-analysis-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username app \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --db-subnet-group-name multi-analysis-db-subnet \
  --vpc-security-group-ids <db-security-group-id>
```

#### 1.3 Create ElastiCache Redis
```bash
# Create ElastiCache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name multi-analysis-redis-subnet \
  --cache-subnet-group-description "Subnet group for Redis" \
  --subnet-ids <subnet-1-id> <subnet-2-id>

# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id multi-analysis-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --cache-subnet-group-name multi-analysis-redis-subnet \
  --vpc-security-group-ids <api-security-group-id>
```

### Step 2: Launch EC2 Instance

#### 2.1 Create EC2 Instance
```bash
# Create key pair
aws ec2 create-key-pair --key-name multi-analysis-key --query 'KeyMaterial' --output text > multi-analysis-key.pem

# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.medium \
  --key-name multi-analysis-key \
  --security-group-ids <api-security-group-id> \
  --subnet-id <subnet-id> \
  --tag-specifications ResourceType=instance,Tags=[{Key=Name,Value=multi-analysis-server}]
```

#### 2.2 Configure Security Groups
```bash
# Allow SSH access
aws ec2 authorize-security-group-ingress \
  --group-id <api-security-group-id> \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP access
aws ec2 authorize-security-group-ingress \
  --group-id <api-security-group-id> \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS access
aws ec2 authorize-security-group-ingress \
  --group-id <api-security-group-id> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow API access
aws ec2 authorize-security-group-ingress \
  --group-id <api-security-group-id> \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0
```

### Step 3: Deploy Application

#### 3.1 Connect to EC2 Instance
```bash
# Get your instance public IP
aws ec2 describe-instances --instance-ids <instance-id> --query 'Reservations[0].Instances[0].PublicIpAddress' --output text

# SSH into your instance
ssh -i multi-analysis-key.pem ec2-user@<public-ip>
```

#### 3.2 Run Deployment Script
```bash
# Clone your repository
git clone <your-repo-url> ~/app
cd ~/app

# Make deployment script executable
chmod +x scripts/deploy-aws.sh

# Run deployment script
./scripts/deploy-aws.sh
```

#### 3.3 Configure Environment Variables
```bash
# Edit environment file
nano ~/app/.env
```

Add the following configuration:
```env
# Database
DATABASE_URL=postgresql://app:<password>@<rds-endpoint>:5432/app
REDIS_URL=redis://<redis-endpoint>:6379

# API Configuration
API_PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=<your-jwt-secret>
CORS_ORIGIN=https://yourdomain.com

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# S3 Configuration (for file uploads)
S3_BUCKET=multi-analysis-files
S3_REGION=us-east-1
```

### Step 4: Set Up Data Pipeline

#### 4.1 Create S3 Bucket for Data
```bash
# Create S3 bucket
aws s3 mb s3://multi-analysis-data-<unique-suffix>

# Upload your data files
aws s3 cp data/ s3://multi-analysis-data-<unique-suffix>/data/ --recursive
```

#### 4.2 Set Up Data Pipeline Worker
```bash
# Create CloudWatch Events rule for scheduled data processing
aws events put-rule \
  --name "multi-analysis-data-pipeline" \
  --schedule-expression "rate(1 day)" \
  --state ENABLED

# Create Lambda function for data processing (optional)
# This can replace the worker process for serverless data pipeline
```

#### 4.3 Configure Worker Service
```bash
# Create systemd service for worker
sudo tee /etc/systemd/system/multi-analysis-worker.service > /dev/null <<EOF
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
EOF

# Enable and start worker service
sudo systemctl daemon-reload
sudo systemctl enable multi-analysis-worker
sudo systemctl start multi-analysis-worker
```

### Step 5: Set Up Monitoring and Logging

#### 5.1 Install CloudWatch Agent
```bash
# Install CloudWatch agent
sudo yum install -y amazon-cloudwatch-agent

# Configure CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

#### 5.2 Set Up Application Logging
```bash
# Create log directory
mkdir -p ~/app/logs

# Configure log rotation
sudo tee /etc/logrotate.d/multi-analysis > /dev/null <<EOF
/home/ec2-user/app/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 ec2-user ec2-user
}
EOF
```

### Step 6: Set Up SSL and Domain (Optional)

#### 6.1 Request SSL Certificate
```bash
# Request certificate from ACM
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com \
  --validation-method DNS
```

#### 6.2 Configure Nginx with SSL
```bash
# Update nginx configuration
sudo tee /etc/nginx/conf.d/api-ssl.conf > /dev/null <<EOF
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

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

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://\$server_name\$request_uri;
}
EOF

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## Cost Optimization

### 1. Use Spot Instances for Development
```bash
# Launch spot instance for cost savings
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.medium \
  --key-name multi-analysis-key \
  --security-group-ids <api-security-group-id> \
  --subnet-id <subnet-id> \
  --instance-market-options MarketType=spot,SpotOptions={MaxPrice=0.05}
```

### 2. Set Up Auto Scaling
```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name multi-analysis-template \
  --version-description v1 \
  --launch-template-data ImageId=ami-0c02fb55956c7d316,InstanceType=t3.medium

# Create auto scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name multi-analysis-asg \
  --launch-template LaunchTemplateName=multi-analysis-template \
  --min-size 1 \
  --max-size 3 \
  --desired-capacity 1 \
  --vpc-zone-identifier <subnet-1-id>,<subnet-2-id>
```

## Monitoring and Maintenance

### 1. Set Up CloudWatch Alarms
```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "multi-analysis-cpu-high" \
  --alarm-description "CPU utilization is high" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Memory utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "multi-analysis-memory-high" \
  --alarm-description "Memory utilization is high" \
  --metric-name MemoryUtilization \
  --namespace System/Linux \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### 2. Regular Maintenance Tasks
```bash
# Update system packages
sudo yum update -y

# Update application
cd ~/app
git pull origin main
npm install
sudo systemctl restart multi-analysis

# Backup database
pg_dump -h <rds-endpoint> -U app -d app > backup_$(date +%Y%m%d_%H%M%S).sql

# Clean up old logs
find ~/app/logs -name "*.log" -mtime +7 -delete
```

## Troubleshooting

### Common Issues and Solutions

1. **Application won't start**
   ```bash
   # Check service status
   sudo systemctl status multi-analysis
   
   # View logs
   sudo journalctl -u multi-analysis -f
   ```

2. **Database connection issues**
   ```bash
   # Test database connection
   psql -h <rds-endpoint> -U app -d app
   
   # Check security group rules
   aws ec2 describe-security-groups --group-ids <db-security-group-id>
   ```

3. **High memory usage**
   ```bash
   # Check memory usage
   free -h
   
   # Check process memory
   ps aux --sort=-%mem | head -10
   ```

## Next Steps

1. **Set up CI/CD pipeline** using GitHub Actions or AWS CodePipeline
2. **Implement backup strategy** for database and application data
3. **Set up monitoring dashboard** using CloudWatch or Grafana
4. **Configure alerting** for critical issues
5. **Implement security best practices** (IAM roles, VPC endpoints, etc.)

## Estimated Costs (Monthly)

- **EC2 t3.medium**: ~$30
- **RDS db.t3.micro**: ~$15
- **ElastiCache cache.t3.micro**: ~$15
- **S3 storage**: ~$5 (for 100GB)
- **CloudWatch**: ~$5
- **Data transfer**: ~$10

**Total estimated cost**: ~$80/month

This setup provides a production-ready environment for your multi-analysis application with proper scaling, monitoring, and security measures.
