# 🚀 Enterprise Deployment Guide

## Overview

This guide covers deploying the Multi-Analysis application as an enterprise-grade system with proper architecture, scalability, and best practices.

## 🏗️ Architecture

### **Monorepo Structure**
```
multi-analysis-starter/
├── packages/
│   ├── api/                 # Backend API service (Express.js + TypeScript)
│   ├── web/                 # Frontend Next.js app
│   ├── shared/              # Shared types, utilities, constants
│   └── worker/              # Background job processor
├── infrastructure/          # AWS/CDK/Terraform configs
├── scripts/                 # Build/deploy scripts
└── data/                    # Data files (not in packages)
```

### **Technology Stack**
- **Backend**: Node.js, Express.js, TypeScript, PostgreSQL, Redis
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL (RDS)
- **Cache**: Redis (ElastiCache)
- **Storage**: S3 for files and backups
- **Monitoring**: CloudWatch, Winston logging
- **Deployment**: AWS EC2, Docker, Nginx

## 🔧 Prerequisites

### **Local Development**
```bash
# Install Node.js 18+ and npm 8+
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 8.0.0

# Install Docker and Docker Compose
docker --version
docker-compose --version

# Install AWS CLI
aws --version
```

### **AWS Setup**
1. **Create AWS Account** with billing enabled
2. **Create IAM User** with programmatic access
3. **Configure AWS CLI** with credentials
4. **Set up billing alerts** to monitor costs

## 🚀 Quick Start

### **1. Local Development**
```bash
# Clone and setup
git clone <your-repo>
cd multi-analysis-starter

# Install dependencies
npm run install:all

# Start local databases
docker-compose up -d

# Run migrations
npm run db:migrate

# Start development servers
npm run dev
```

### **2. AWS Deployment**
```bash
# Deploy to AWS (one command)
npm run deploy:aws

# Or step by step:
bash scripts/aws-infrastructure.sh
bash scripts/launch-ec2.sh
```

### **3. Vercel Deployment**
```bash
# Deploy frontend to Vercel
npm run deploy:vercel
```

## 📊 Database Setup

### **Local PostgreSQL**
```bash
# Using Docker Compose
docker-compose up -d postgres

# Connect to database
psql -h localhost -U postgres -d multi_analysis
```

### **AWS RDS**
```bash
# Database will be created automatically by infrastructure script
# Connection details in aws-config-*.env file
```

### **Migrations**
```bash
# Run migrations
npm run db:migrate

# Seed data
npm run db:seed
```

## 🔐 Environment Configuration

### **Local Environment (.env)**
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=24h

# API
PORT=3000
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### **Production Environment**
```bash
# Database (AWS RDS)
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Redis (AWS ElastiCache)
REDIS_HOST=your-redis-endpoint.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_very_secure_jwt_secret
JWT_EXPIRY=24h

# API
PORT=3000
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
```

## 🏢 Enterprise Features

### **1. Authentication & Authorization**
- JWT-based authentication
- Role-based access control (user, admin, analyst)
- Session management with Redis
- Password hashing with bcrypt

### **2. Data Management**
- PostgreSQL for structured data
- Redis for caching and sessions
- S3 for file storage
- Automated backups

### **3. API Features**
- RESTful API with versioning (`/api/v1/`)
- Rate limiting and security headers
- Comprehensive error handling
- Request/response logging
- Input validation with Zod

### **4. Monitoring & Logging**
- Winston logging with different levels
- CloudWatch metrics and alarms
- Health check endpoints
- Performance monitoring

### **5. Security**
- Helmet.js security headers
- CORS configuration
- Rate limiting
- Input sanitization
- SQL injection prevention

## 📈 Scaling Considerations

### **Horizontal Scaling**
- Load balancer for multiple API instances
- Database read replicas
- Redis cluster for high availability
- CDN for static assets

### **Vertical Scaling**
- Larger EC2 instances
- RDS instance upgrades
- ElastiCache node scaling

### **Performance Optimization**
- Database indexing
- Query optimization
- Caching strategies
- CDN implementation

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy:aws
```

## 🛠️ Maintenance

### **Regular Tasks**
- Database backups
- Log rotation
- Security updates
- Performance monitoring
- Cost optimization

### **Monitoring Alerts**
- High CPU/Memory usage
- Database connection issues
- API response times
- Error rates
- Cost thresholds

## 🚨 Troubleshooting

### **Common Issues**

1. **Database Connection Issues**
   ```bash
   # Check database connectivity
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   
   # Check connection pool
   npm run db:status
   ```

2. **Redis Connection Issues**
   ```bash
   # Test Redis connection
   redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
   ```

3. **API Not Starting**
   ```bash
   # Check logs
   journalctl -u multi-analysis-api -f
   
   # Check port availability
   netstat -tlnp | grep :3000
   ```

4. **Frontend Build Issues**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check environment variables
npm run env:check
```

## 📚 API Documentation

### **Base URL**
- Development: `http://localhost:3000/api/v1`
- Production: `https://your-domain.com/api/v1`

### **Authentication**
```bash
# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Response
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": { ... }
  }
}
```

### **Listings**
```bash
# Get all listings
GET /api/v1/listings

# Get listing by MLS number
GET /api/v1/listings/mls/123456

# Search by town
GET /api/v1/listings/search/town/Springfield
```

### **Analysis**
```bash
# Analyze property
POST /api/v1/analysis
{
  "listingId": "uuid",
  "method": "avg"
}
```

## 💰 Cost Optimization

### **AWS Cost Management**
- Use reserved instances for predictable workloads
- Enable auto-scaling based on demand
- Monitor and optimize database queries
- Use S3 lifecycle policies for old data
- Set up billing alerts

### **Resource Sizing**
- Start with t3.micro for development
- Scale up based on actual usage
- Use CloudWatch metrics to right-size

## 🔒 Security Best Practices

1. **Secrets Management**
   - Use AWS Secrets Manager for production secrets
   - Never commit secrets to version control
   - Rotate secrets regularly

2. **Network Security**
   - Use VPC with private subnets
   - Configure security groups properly
   - Enable SSL/TLS everywhere

3. **Application Security**
   - Regular security updates
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection

## 📞 Support

For enterprise support and custom development:
- Email: support@yourcompany.com
- Documentation: https://docs.yourcompany.com
- Status page: https://status.yourcompany.com

---

**Last Updated**: December 2024
**Version**: 1.0.0

