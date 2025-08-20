# 🚀 Multi-Analysis Deployment Guide

This comprehensive guide covers all deployment options for the Multi-Analysis application.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [AWS EC2 Deployment (Recommended)](#aws-ec2-deployment-recommended)
3. [Docker Deployment](#docker-deployment)
4. [BHA Data Pipeline Deployment](#bha-data-pipeline-deployment)
5. [Troubleshooting](#troubleshooting)
6. [Environment Setup](#environment-setup)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Git
- AWS CLI (for AWS deployment)
- Docker (for Docker deployment)

### Local Development Setup
```bash
# Clone and setup
git clone <repository-url>
cd multi-analysis-starter
npm run install:all

# Start development servers
npm run dev
```

## 🏗️ AWS EC2 Deployment (Recommended)

### Step 1: AWS Infrastructure Setup

1. **Launch EC2 Instance**
   ```bash
   # Use the AWS infrastructure script
   bash scripts/aws-infrastructure.sh
   ```

2. **Configure Environment**
   - Copy `env.example` to `.env`
   - Update with your AWS credentials and EC2 details
   - Set `EC2_IP` to your instance's public IP

### Step 2: Application Deployment

#### Option A: Docker Deployment (Recommended)
```bash
# Deploy using Docker (most reliable)
npm run deploy:aws
# or
bash scripts/deploy-docker.sh
```

#### Option B: Simple Deployment
```bash
# Deploy source code directly
bash scripts/deploy-simple.sh
```

### Step 3: Verify Deployment
```bash
# Check application status
curl http://your-ec2-ip:3000
curl http://your-ec2-ip:3001/api/health

# View logs
docker-compose -f ~/app/deploy-docker/docker-compose.prod.yml logs -f
```

## 🐳 Docker Deployment

### Local Docker Setup
```bash
# Build and run locally
docker-compose up --build
```

### Production Docker Deployment
```bash
# Deploy to production
bash scripts/deploy-docker.sh
```

### Docker Configuration
- **API**: Port 3001, Node.js with TypeScript
- **Web**: Port 3000, Next.js frontend
- **Database**: PostgreSQL (external or containerized)
- **Redis**: For session management (optional)

## 📊 BHA Data Pipeline Deployment

### Automated BHA Data Updates
```bash
# Deploy BHA data pipeline to ECS
bash scripts/deploy-bha-ecs.sh
# or PowerShell
powershell -ExecutionPolicy Bypass -File scripts/deploy-bha-ecs.ps1
```

### Manual BHA Data Setup
```bash
# Setup BHA data pipeline manually
bash scripts/setup-bha-cron.sh
```

### BHA Data Features
- **Automatic Updates**: Monthly updates on 1st of each month at 2 AM
- **Future Year Support**: Automatically handles new years when available
- **Comprehensive Data**: Includes all BHA payment standards
- **Database Integration**: Direct PostgreSQL integration

## 🔧 Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
docker-compose logs -f
# or
pm2 logs

# Check ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
```

#### 2. Database Connection Issues
```bash
# Test database connection
psql -h localhost -U postgres -d multi_analysis

# Check environment variables
echo $DATABASE_URL
```

#### 3. Build Failures
```bash
# Clean and rebuild
npm run clean
npm run install:all
npm run build
```

#### 4. Permission Issues
```bash
# Fix file permissions
chmod +x scripts/*.sh
chmod 600 multi-analysis-key-*.pem
```

### Debug Deployment
```bash
# Run debug script
bash scripts/deploy-ec2-debug.sh
```

## ⚙️ Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/multi_analysis

# AWS Configuration
EC2_IP=your-ec2-public-ip
AWS_REGION=us-east-1

# Application
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# BHA Data Pipeline
BHA_DATA_DIR=/opt/rent-api/data
LOG_DIR=/var/log/bha-data
```

### Environment Files
- `.env` - Local development
- `.env.production` - Production deployment
- `aws-config-*.env` - AWS-specific configuration

## 📚 Additional Resources

### Scripts Reference
- `scripts/deploy-docker.sh` - Main production deployment
- `scripts/deploy-simple.sh` - Simple source deployment
- `scripts/cleanup-aws.sh` - AWS resource cleanup
- `scripts/update-ec2.sh` - EC2 instance updates

### Monitoring
- **Health Checks**: `/api/health` endpoint
- **Logs**: Docker logs or PM2 logs
- **Metrics**: Application metrics via API endpoints

### Security
- **SSH Keys**: Use AWS key pairs for EC2 access
- **Firewall**: Configure security groups for ports 3000, 3001, 22
- **HTTPS**: Use Nginx reverse proxy with SSL certificates

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to EC2
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to EC2
        run: |
          bash scripts/deploy-docker.sh
```

### Manual Deployment
```bash
# Trigger manual deployment
npm run deploy:aws
```

---

## 📝 Notes

- **Backup**: Always backup your database before major deployments
- **Testing**: Test deployments on staging environment first
- **Rollback**: Keep previous deployment packages for quick rollback
- **Monitoring**: Set up alerts for application health and performance

For additional support, check the troubleshooting section or create an issue in the repository.
