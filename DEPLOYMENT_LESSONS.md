# Deployment Lessons Learned

## Overview
This document captures the lessons learned from our 3-hour AWS deployment experience to prevent repeating the same mistakes.

## Critical Issues & Solutions

### 1. SSH Command Escaping Problems
**Problem:** SSH commands to create Dockerfiles were getting corrupted due to PowerShell escaping issues.
```
# This kept getting corrupted:
CMD [" node\, \api/dist/index.js\]
```

**Solution:** 
- ✅ Create all files locally first, then copy via SCP
- ✅ Use `scp -i key.pem file.txt user@ip:~/path/` instead of SSH echo commands
- ✅ Never rely on complex SSH commands for file creation

**Time Wasted:** ~1.5 hours

### 2. AWS CLI Environment Issues
**Problem:** AWS CLI not in PATH, commands hanging, pagination issues in PowerShell.

**Solution:**
- ✅ Use Git Bash for AWS CLI commands when possible
- ✅ Set `export AWS_PAGER=''` to prevent hanging
- ✅ Verify AWS credentials with `aws sts get-caller-identity`
- ✅ Check region configuration with `aws configure get region`

**Time Wasted:** ~30 minutes

### 3. Security Group Configuration
**Problem:** Port 3001 wasn't open in the security group.

**Solution:**
- ✅ Always include ALL necessary ports in initial security group setup
- ✅ API port (3001), Web port (3000), SSH port (22)
- ✅ Use AWS CLI to add missing rules: `aws ec2 authorize-security-group-ingress`

**Time Wasted:** ~15 minutes

### 4. Node.js GLIBC Compatibility
**Problem:** Amazon Linux 2 is too old for Node.js 18+.

**Solution:**
- ✅ Use Docker from the start - don't try direct Node.js deployment
- ✅ Amazon Linux 2 has GLIBC 2.17, Node.js 18+ needs 2.27+
- ✅ Docker containers provide the right environment

**Time Wasted:** ~30 minutes

### 5. Docker Build Context Issues
**Problem:** Package.json files weren't in the right locations for npm install.

**Solution:**
- ✅ Ensure package.json files are copied to correct paths
- ✅ Verify file structure before building: `ls -la` in deployment directory
- ✅ Test Docker builds locally before deploying

**Time Wasted:** ~45 minutes

## Best Practices Going Forward

### File Creation
```bash
# ❌ DON'T: Create files via SSH commands
ssh -i key.pem user@ip "cat > file.txt << 'EOF'..."

# ✅ DO: Create files locally, then copy
scp -i key.pem file.txt user@ip:~/path/
```

### Docker Deployment
```bash
# ✅ DO: Create Dockerfiles locally first
# ✅ DO: Test builds locally if possible
# ✅ DO: Use proper file paths in Dockerfile
# ✅ DO: Copy files with correct names and locations
```

### AWS Setup
```bash
# ✅ DO: Set up console access for IAM users
# ✅ DO: Include all necessary ports in security groups
# ✅ DO: Use the correct AWS region
# ✅ DO: Verify connectivity before deploying
```

## Deployment Checklist

### Pre-Deployment
- [ ] Create all configuration files locally
- [ ] Test Docker builds locally (if possible)
- [ ] Verify AWS credentials and region
- [ ] Check security group includes all necessary ports
- [ ] Ensure all dependencies are properly copied

### During Deployment
- [ ] Use SCP for file transfers, not SSH commands
- [ ] Verify file structure on remote server
- [ ] Check Docker build logs for errors
- [ ] Test application endpoints after deployment

### Post-Deployment
- [ ] Verify all containers are running
- [ ] Test web application (port 3000)
- [ ] Test API endpoints (port 3001)
- [ ] Check application logs for errors

## Common Commands

### Check Container Status
```bash
ssh -i key.pem user@ip "docker ps"
ssh -i key.pem user@ip "docker logs container-name"
```

### Test Application
```bash
# PowerShell
Invoke-WebRequest -Uri http://ip:3000 -TimeoutSec 10
Invoke-WebRequest -Uri http://ip:3001/health -TimeoutSec 10

# Bash
curl -s http://ip:3000
curl -s http://ip:3001/health
```

### AWS CLI
```bash
aws sts get-caller-identity
aws ec2 describe-instances --filters "Name=tag:Name,Values=app-*"
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 3001 --cidr 0.0.0.0/0
```

## Time Estimates
- **Proper deployment:** 30 minutes
- **With common issues:** 2-3 hours
- **With major problems:** 4+ hours

## Key Principle
**Fix root causes, not symptoms. Don't keep trying workarounds that don't address the fundamental problem.**

---

*Last updated: [Current Date]*
*Add new lessons as they are learned*

