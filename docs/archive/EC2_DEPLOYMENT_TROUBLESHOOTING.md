# EC2 Deployment Troubleshooting Guide

## Overview
This guide helps troubleshoot common issues with the GitHub Actions deployment to EC2.

## Common Issues and Solutions

### 1. Node.js Not Installed
**Symptoms:** `npm: command not found` or similar errors
**Solution:** The updated workflow automatically installs Node.js 18 if it's missing.

### 2. Dependency Installation Failures
**Symptoms:** `npm run install:all` fails or process gets killed
**Causes:**
- Insufficient disk space
- Insufficient memory (especially for Next.js installations)
- Network connectivity issues
- Corrupted npm cache
- Missing system dependencies

**Solutions:**
- Check disk space: `df -h`
- Check available memory: `free -h`
- Setup swap space: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
- Set Node.js memory limits: `export NODE_OPTIONS="--max-old-space-size=4096"`
- Clear npm cache: `npm cache clean --force`
- Remove node_modules and reinstall: `rm -rf node_modules && npm install`
- Use memory-optimized install: `npm install --no-optional --maxsockets=1`

### 3. Build Failures
**Symptoms:** `npm run build` fails
**Common Causes:**
- TypeScript compilation errors
- Missing dependencies
- Incorrect TypeScript configuration
- Memory issues during build

**Solutions:**
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all dependencies are installed
- Check available memory: `free -h`
- Build packages individually to isolate issues

### 4. Process Manager Issues
**Symptoms:** Application doesn't restart after deployment
**Solutions:**
- Check if Docker Compose is available: `docker-compose --version`
- Check if PM2 is available: `pm2 --version`
- Check systemd services: `systemctl list-units --type=service | grep multi-analysis`

## Debugging Steps

### 1. Manual Debug Script
Run the debug script on your EC2 instance:
```bash
cd ~/app/multi-analysis-starter
bash scripts/deploy-ec2-debug.sh
```

This script will:
- Check system information
- Verify Node.js installation
- Check disk space and memory
- Install dependencies step by step
- Build packages individually
- Report detailed error messages

### 2. Check GitHub Actions Logs
Look for specific error messages in the GitHub Actions logs:
- Dependency installation errors
- Build compilation errors
- Process manager errors

### 3. SSH into EC2 and Check Manually
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to the app directory
cd ~/app/multi-analysis-starter

# Check the current state
ls -la
git status
npm --version
node --version
```

## Environment Requirements

### System Requirements
- Ubuntu 18.04+ or Amazon Linux 2
- At least 2GB RAM
- At least 10GB free disk space
- Node.js 18.x or higher
- npm 8.x or higher

### Required Software
- Git
- Node.js and npm
- Docker (if using Docker deployment)
- PM2 (if using PM2 deployment)

## Deployment Methods

The workflow supports multiple deployment methods:

### 1. Docker Compose (Recommended)
- Uses `docker-compose.yml` or `docker-compose.prod.yml`
- Automatically builds and restarts containers
- Most reliable for production deployments

### 2. PM2
- Uses PM2 process manager
- Good for Node.js applications
- Requires PM2 to be installed on the server

### 3. Systemd
- Uses systemd service
- Requires service configuration
- Good for system-level management

## Monitoring and Logs

### Check Application Status
```bash
# If using Docker
docker-compose ps
docker-compose logs

# If using PM2
pm2 status
pm2 logs

# If using systemd
sudo systemctl status multi-analysis
sudo journalctl -u multi-analysis -f
```

### Check Application Health
```bash
# Test frontend
curl -f http://your-ec2-ip:3000

# Test API
curl -f http://your-ec2-ip:3001
```

## Common Fixes

### Fix 1: Clean Installation
```bash
cd ~/app/multi-analysis-starter
rm -rf node_modules packages/*/node_modules
npm cache clean --force
npm install
npm install --prefix packages/shared
npm install --prefix packages/api
npm install --prefix packages/web
npm install --prefix packages/worker
```

### Fix 2: Rebuild Everything
```bash
npm run build --prefix packages/shared
npm run build --prefix packages/api
npm run build --prefix packages/web
# Note: Worker package is JavaScript and doesn't need to be built
```

### Fix 3: Restart Services
```bash
# Docker
docker-compose down
docker-compose up -d --build

# PM2
pm2 restart all

# Systemd
sudo systemctl restart multi-analysis
```

## Getting Help

If you're still experiencing issues:

1. Run the debug script and share the output
2. Check the GitHub Actions logs for specific error messages
3. Verify your EC2 instance meets the system requirements
4. Ensure all required secrets are configured in GitHub
5. Check that your EC2 security groups allow the necessary ports

## Security Considerations

- Ensure your EC2 instance has proper security groups configured
- Use SSH keys instead of passwords
- Keep Node.js and npm updated
- Regularly update your application dependencies
- Monitor your application logs for security issues
