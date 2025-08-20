# AWS-Only Deployment Guide

This guide covers deploying your multi-analysis application entirely on AWS infrastructure.

## 🎯 Why AWS-Only?

- **Unified Infrastructure**: Everything in one place
- **Cost Control**: Better cost management and optimization
- **Scalability**: AWS provides superior scaling options
- **Integration**: Seamless integration between services
- **Static IP**: Your EC2 instance has a dedicated IP address

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server    │    │   Database      │
│   (EC2)         │◄──►│   (EC2)         │◄──►│   (RDS)         │
│   Port 3000     │    │   Port 3001     │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Redis Cache   │    │   S3 Storage    │
│   (ALB)         │    │   (ElastiCache) │    │   (Static Files)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Prerequisites

- AWS CLI installed and configured
- Domain name (optional but recommended)
- SSH key pair for EC2 access

### 2. Infrastructure Setup

```bash
# Run the AWS infrastructure setup script
bash scripts/aws-infrastructure.sh

# This will create:
# - VPC with public/private subnets
# - EC2 instances for frontend and API
# - RDS PostgreSQL database
# - ElastiCache Redis cluster
# - Application Load Balancer
# - Security groups and IAM roles
```

### 3. Environment Configuration

```bash
# Create production environment file
.\scripts\setup-env.ps1 create production

# Edit .env.production with your AWS values:
NEXT_PUBLIC_API_URL=https://your-ec2-public-ip:3001
CORS_ORIGINS=https://your-ec2-public-ip:3000
DB_HOST=your-rds-endpoint.amazonaws.com
REDIS_HOST=your-elasticache-endpoint.amazonaws.com
```

### 4. Deploy Application

```bash
# Deploy to AWS
npm run deploy:aws

# Or manually:
bash scripts/deploy-aws.sh
```

## 📋 Detailed Setup Steps

### Step 1: AWS Infrastructure

1. **Create VPC and Networking**
   ```bash
   # The script will create:
   # - VPC with CIDR 10.0.0.0/16
   # - 2 public subnets (10.0.1.0/24, 10.0.2.0/24)
   # - 2 private subnets (10.0.3.0/24, 10.0.4.0/24)
   # - Internet Gateway and NAT Gateway
   # - Route tables
   ```

2. **Create Security Groups**
   ```bash
   # Frontend Security Group (Port 3000)
   # API Security Group (Port 3001)
   # Database Security Group (Port 5432)
   # Redis Security Group (Port 6379)
   ```

3. **Launch EC2 Instances**
   ```bash
   # Frontend Instance (t3.micro)
   # API Instance (t3.small)
   # Both with Ubuntu 22.04 LTS
   ```

4. **Create RDS Database**
   ```bash
   # PostgreSQL 15
   # Multi-AZ deployment
   # Automated backups enabled
   ```

5. **Create ElastiCache Redis**
   ```bash
   # Redis 7.0
   # Cluster mode disabled
   # Multi-AZ for high availability
   ```

### Step 2: Application Deployment

1. **SSH into your EC2 instances**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-public-ip
   ```

2. **Install dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install PostgreSQL client
   sudo apt install -y postgresql-client
   ```

3. **Clone and setup application**
   ```bash
   # Clone your repository
   git clone https://github.com/your-username/multi-analysis-starter.git
   cd multi-analysis-starter
   
   # Install dependencies
   npm run install:all
   
   # Build the application
   npm run build
   ```

4. **Configure environment**
   ```bash
   # Copy your production environment file
   cp .env.production .env
   
   # Verify configuration
   .\scripts\setup-env.ps1 validate
   ```

5. **Start the application**
   ```bash
   # Start API server
   cd packages/api
   pm2 start dist/index.js --name "api-server"
   
   # Start frontend server
   cd ../web
   pm2 start npm --name "frontend-server" -- start
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

### Step 3: Load Balancer Configuration

1. **Create Application Load Balancer**
   ```bash
   # The script creates an ALB with:
   # - Target group for frontend (port 3000)
   # - Target group for API (port 3001)
   # - Health checks configured
   # - SSL certificate (if domain provided)
   ```

2. **Configure routing rules**
   ```
   /api/* → API Target Group
   /* → Frontend Target Group
   ```

### Step 4: Domain and SSL (Optional)

1. **Register domain in Route 53**
2. **Request SSL certificate in ACM**
3. **Update ALB with SSL certificate**
4. **Create DNS records pointing to ALB**

## 🔧 Configuration Files

### Environment Variables

```bash
# Production .env file
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_API_URL=https://your-ec2-public-ip:3001
CORS_ORIGINS=https://your-ec2-public-ip:3000

# Database
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis_production
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=your-elasticache-endpoint.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your-s3-bucket-name

# Security
JWT_SECRET=your_very_secure_jwt_secret
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'packages/api/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'frontend-server',
      script: 'npm',
      args: 'start',
      cwd: './packages/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

## 📊 Monitoring and Logging

### CloudWatch Setup

1. **Enable CloudWatch monitoring on EC2 instances**
2. **Set up CloudWatch logs**
3. **Create dashboards for monitoring**

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Check status
pm2 status
```

## 🔄 Deployment Process

### Automated Deployment

```bash
# Run the deployment script
bash scripts/deploy-aws.sh

# This script will:
# 1. SSH into EC2 instances
# 2. Pull latest code
# 3. Install dependencies
# 4. Build application
# 5. Restart services
# 6. Run health checks
```

### Manual Deployment

```bash
# 1. Build locally
npm run build

# 2. Upload to S3
aws s3 sync dist/ s3://your-bucket-name/

# 3. SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# 4. Pull and restart
cd multi-analysis-starter
git pull
npm run build
pm2 restart all
```

## 💰 Cost Optimization

### Estimated Monthly Costs

| Service | Instance Type | Monthly Cost |
|---------|---------------|--------------|
| EC2 Frontend | t3.micro | ~$8 |
| EC2 API | t3.small | ~$15 |
| RDS PostgreSQL | db.t3.micro | ~$15 |
| ElastiCache Redis | cache.t3.micro | ~$12 |
| Load Balancer | ALB | ~$20 |
| **Total** | | **~$70** |

### Cost Optimization Tips

1. **Use Reserved Instances** for predictable workloads
2. **Enable auto-scaling** for variable traffic
3. **Use Spot Instances** for non-critical workloads
4. **Monitor and optimize** database queries
5. **Use S3 lifecycle policies** for old data

## 🔒 Security Best Practices

1. **Network Security**
   - Use private subnets for databases
   - Restrict security group access
   - Use VPC endpoints for AWS services

2. **Application Security**
   - Use strong JWT secrets
   - Enable HTTPS everywhere
   - Implement rate limiting
   - Regular security updates

3. **Data Security**
   - Encrypt data at rest
   - Encrypt data in transit
   - Regular backups
   - Access logging

## 🚨 Troubleshooting

### Common Issues

1. **EC2 Instance Not Accessible**
   ```bash
   # Check security groups
   # Verify SSH key permissions
   # Check instance status
   ```

2. **Database Connection Issues**
   ```bash
   # Verify RDS endpoint
   # Check security group rules
   # Test connection manually
   ```

3. **Application Not Starting**
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Check system logs
   sudo journalctl -u pm2-ubuntu
   
   # Verify environment variables
   cat .env
   ```

### Debug Commands

```bash
# Check application status
pm2 status
pm2 logs

# Check system resources
htop
df -h
free -h

# Check network connectivity
curl -I http://localhost:3000
curl -I http://localhost:3001

# Check database connection
psql -h your-rds-endpoint -U your_user -d your_db
```

## 📚 Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS ElastiCache Documentation](https://docs.aws.amazon.com/elasticache/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review CloudWatch logs
3. Check PM2 application logs
4. Verify all environment variables are set correctly
5. Ensure security groups allow necessary traffic
