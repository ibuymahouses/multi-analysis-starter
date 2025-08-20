# 🔧 Multi-Analysis Troubleshooting Guide

This guide covers common issues and their solutions for the Multi-Analysis application.

## 📋 Table of Contents

1. [Deployment Issues](#deployment-issues)
2. [Application Issues](#application-issues)
3. [Database Issues](#database-issues)
4. [AWS/EC2 Issues](#awsec2-issues)
5. [BHA Data Pipeline Issues](#bha-data-pipeline-issues)
6. [Performance Issues](#performance-issues)
7. [Debug Tools](#debug-tools)

## 🚀 Deployment Issues

### Application Won't Start

#### Symptoms
- Application fails to start on EC2
- Port conflicts
- Missing dependencies

#### Solutions

1. **Check Application Status**
   ```bash
   # Docker deployment
   docker-compose -f ~/app/deploy-docker/docker-compose.prod.yml ps
   docker-compose -f ~/app/deploy-docker/docker-compose.prod.yml logs -f
   
   # PM2 deployment
   pm2 status
   pm2 logs
   
   # Direct Node.js
   ps aux | grep node
   ```

2. **Check Port Availability**
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :3001
   
   # Kill processes using ports if needed
   sudo kill -9 $(lsof -t -i:3000)
   sudo kill -9 $(lsof -t -i:3001)
   ```

3. **Verify File Permissions**
   ```bash
   # Fix script permissions
   chmod +x scripts/*.sh
   chmod 600 multi-analysis-key-*.pem
   
   # Fix application permissions
   sudo chown -R ec2-user:ec2-user ~/app
   ```

### Build Failures

#### Symptoms
- TypeScript compilation errors
- Missing dependencies
- Build timeouts

#### Solutions

1. **Clean and Rebuild**
   ```bash
   # Clean all builds
   npm run clean
   rm -rf node_modules packages/*/node_modules
   
   # Reinstall dependencies
   npm run install:all
   
   # Rebuild
   npm run build
   ```

2. **Check Node.js Version**
   ```bash
   # Verify Node.js version
   node --version  # Should be 18+
   npm --version   # Should be 8+
   
   # Update if needed
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **TypeScript Issues**
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   
   # Fix type errors
   npm run lint
   ```

## 🖥️ Application Issues

### Frontend Issues

#### Symptoms
- White screen
- JavaScript errors
- Styling issues

#### Solutions

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

2. **Clear Browser Cache**
   ```bash
   # Hard refresh (Ctrl+Shift+R)
   # Or clear cache completely
   ```

3. **Check API Connectivity**
   ```bash
   # Test API endpoints
   curl http://localhost:3001/api/health
   curl http://localhost:3001/api/listings
   ```

### API Issues

#### Symptoms
- 500 errors
- Slow responses
- Authentication failures

#### Solutions

1. **Check API Logs**
   ```bash
   # Docker logs
   docker-compose logs api
   
   # PM2 logs
   pm2 logs api
   
   # Direct logs
   tail -f logs/api.log
   ```

2. **Test API Endpoints**
   ```bash
   # Health check
   curl -X GET http://localhost:3001/api/health
   
   # Authentication test
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

3. **Check Environment Variables**
   ```bash
   # Verify environment
   echo $DATABASE_URL
   echo $NODE_ENV
   echo $PORT
   ```

## 🗄️ Database Issues

### Connection Issues

#### Symptoms
- Database connection refused
- Timeout errors
- Authentication failures

#### Solutions

1. **Test Database Connection**
   ```bash
   # Direct connection test
   psql -h localhost -U postgres -d multi_analysis
   
   # Check connection string
   echo $DATABASE_URL
   ```

2. **Check PostgreSQL Status**
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Start if stopped
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. **Verify Database Exists**
   ```bash
   # Connect as postgres user
   sudo -u postgres psql
   
   # List databases
   \l
   
   # Create database if missing
   CREATE DATABASE multi_analysis;
   ```

### Migration Issues

#### Symptoms
- Schema errors
- Missing tables
- Data corruption

#### Solutions

1. **Run Migrations**
   ```bash
   # Run database migrations
   npm run db:migrate
   
   # Check migration status
   npm run db:status
   ```

2. **Reset Database**
   ```bash
   # Drop and recreate database
   sudo -u postgres dropdb multi_analysis
   sudo -u postgres createdb multi_analysis
   
   # Run migrations and seed
   npm run db:migrate
   npm run db:seed
   ```

## ☁️ AWS/EC2 Issues

### SSH Connection Issues

#### Symptoms
- SSH connection refused
- Permission denied
- Key not found

#### Solutions

1. **Check SSH Key**
   ```bash
   # Verify key exists
   ls -la multi-analysis-key-*.pem
   
   # Fix permissions
   chmod 600 multi-analysis-key-*.pem
   ```

2. **Test SSH Connection**
   ```bash
   # Test connection
   ssh -i multi-analysis-key-496-new.pem ec2-user@your-ec2-ip
   
   # Check security groups
   # Ensure port 22 is open in AWS console
   ```

3. **Update SSH Key**
   ```bash
   # Generate new key pair if needed
   aws ec2 create-key-pair --key-name multi-analysis-key-new --query 'KeyMaterial' --output text > multi-analysis-key-new.pem
   chmod 600 multi-analysis-key-new.pem
   ```

### EC2 Instance Issues

#### Symptoms
- Instance not responding
- High CPU/memory usage
- Disk space issues

#### Solutions

1. **Check Instance Status**
   ```bash
   # Check system resources
   top
   df -h
   free -h
   
   # Check running processes
   ps aux | head -20
   ```

2. **Restart Services**
   ```bash
   # Restart Docker
   sudo systemctl restart docker
   
   # Restart application
   docker-compose -f ~/app/deploy-docker/docker-compose.prod.yml restart
   
   # Or restart PM2
   pm2 restart all
   ```

3. **Clean Up Disk Space**
   ```bash
   # Remove old Docker images
   docker system prune -a
   
   # Remove old logs
   sudo journalctl --vacuum-time=7d
   
   # Clean npm cache
   npm cache clean --force
   ```

## 📊 BHA Data Pipeline Issues

### Data Update Issues

#### Symptoms
- BHA data not updating
- Missing rent data
- Pipeline failures

#### Solutions

1. **Check Pipeline Status**
   ```bash
   # Check service status
   sudo systemctl status bha-data-pipeline
   
   # Check logs
   sudo journalctl -u bha-data-pipeline -f
   ```

2. **Manual Data Update**
   ```bash
   # Run manual update
   cd /opt/rent-api
   source venv/bin/activate
   python3 bha-payment-standards-future.py
   ```

3. **Verify Data Files**
   ```bash
   # Check data directory
   ls -la /opt/rent-api/data/
   
   # Check database tables
   psql -h localhost -U postgres -d multi_analysis -c "SELECT COUNT(*) FROM bha_rents;"
   ```

### Cron Job Issues

#### Symptoms
- Scheduled updates not running
- Cron job failures
- Permission issues

#### Solutions

1. **Check Cron Jobs**
   ```bash
   # List cron jobs
   crontab -l
   
   # Check cron logs
   sudo tail -f /var/log/cron
   ```

2. **Fix Cron Permissions**
   ```bash
   # Ensure proper permissions
   sudo chown -R ec2-user:ec2-user /opt/rent-api
   sudo chmod +x /opt/rent-api/setup-bha-cron.sh
   ```

3. **Test Cron Job**
   ```bash
   # Test the cron script manually
   /opt/rent-api/setup-bha-cron.sh
   ```

## ⚡ Performance Issues

### Slow Application

#### Symptoms
- Slow page loads
- API timeouts
- High response times

#### Solutions

1. **Check Resource Usage**
   ```bash
   # Monitor system resources
   htop
   iotop
   
   # Check application metrics
   curl http://localhost:3001/api/metrics
   ```

2. **Database Optimization**
   ```bash
   # Check slow queries
   sudo tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"
   
   # Analyze tables
   psql -h localhost -U postgres -d multi_analysis -c "ANALYZE;"
   ```

3. **Application Optimization**
   ```bash
   # Enable caching
   # Check for memory leaks
   # Optimize queries
   ```

### Memory Issues

#### Symptoms
- Out of memory errors
- Application crashes
- High memory usage

#### Solutions

1. **Check Memory Usage**
   ```bash
   # Monitor memory
   free -h
   cat /proc/meminfo
   
   # Check process memory
   ps aux --sort=-%mem | head -10
   ```

2. **Optimize Node.js Memory**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   
   # Restart application
   pm2 restart all
   ```

## 🛠️ Debug Tools

### Debug Scripts

1. **EC2 Debug Script**
   ```bash
   # Run comprehensive debug
   bash scripts/deploy-ec2-debug.sh
   ```

2. **Version Check**
   ```bash
   # Check for version mismatches
   bash scripts/check-version-mismatch.sh
   ```

3. **Data Loading Debug**
   ```bash
   # Debug data loading issues
   bash scripts/debug-data-loading.sh
   ```

### Log Analysis

1. **Application Logs**
   ```bash
   # Real-time log monitoring
   tail -f logs/application.log
   
   # Search for errors
   grep -i error logs/application.log
   ```

2. **System Logs**
   ```bash
   # System messages
   sudo journalctl -f
   
   # Service logs
   sudo journalctl -u docker -f
   sudo journalctl -u postgresql -f
   ```

### Network Debugging

1. **Port Scanning**
   ```bash
   # Check open ports
   netstat -tulpn
   
   # Test port connectivity
   telnet localhost 3000
   telnet localhost 3001
   ```

2. **Firewall Check**
   ```bash
   # Check firewall status
   sudo ufw status
   
   # Check AWS security groups
   # Verify in AWS console
   ```

## 📞 Getting Help

### Before Asking for Help

1. **Collect Information**
   - Error messages
   - Log files
   - System information
   - Steps to reproduce

2. **Check Documentation**
   - Review this troubleshooting guide
   - Check deployment guide
   - Search existing issues

3. **Test Solutions**
   - Try suggested solutions
   - Document what works
   - Note any side effects

### Useful Commands

```bash
# System information
uname -a
cat /etc/os-release

# Application status
docker ps
pm2 status
systemctl status postgresql

# Network status
ip addr show
route -n

# Disk usage
df -h
du -sh /opt/rent-api/*
```

---

**Remember**: Always backup your data before making significant changes, and test solutions in a staging environment first.
