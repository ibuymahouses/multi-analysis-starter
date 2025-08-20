# 📜 Multi-Analysis Scripts Directory

This directory contains all deployment, maintenance, and utility scripts for the Multi-Analysis application.

## 📁 Directory Structure

```
scripts/
├── README.md                           # This file
├── archive/                            # Archived one-time scripts
│   ├── deploy-aws.sh                   # Old AWS setup script
│   ├── deploy-enterprise-frontend.sh   # Old enterprise deployment
│   ├── deploy-rent-api.sh              # Old rent API deployment
│   ├── cleanup-other-platforms.sh      # Platform cleanup script
│   ├── launch-ec2.sh                   # EC2 launch script
│   ├── quick-start-aws.sh              # Quick start script
│   ├── fix-all-bha-rents.js            # One-time BHA fix
│   ├── fix-bha-rents.js                # One-time BHA fix
│   ├── fix-missing-zips.js             # One-time zip fix
│   ├── replace-all-bha-rents.js        # One-time BHA replacement
│   ├── update-bha-rents.js             # One-time BHA update
│   ├── update-bha-rents-complete.js    # One-time BHA update
│   ├── generate-all-ma-zips.js         # One-time zip generation
│   └── migrate-to-enterprise.js        # One-time migration
└── [active scripts listed below]
```

## 🚀 Core Deployment Scripts

### **Production Deployment**
- **`deploy-docker.sh`** - Main production deployment using Docker
  - **Usage**: `bash scripts/deploy-docker.sh`
  - **Purpose**: Deploys the application to EC2 using Docker containers
  - **Referenced in**: package.json (`npm run deploy:aws`)

### **Development Deployment**
- **`deploy-simple.sh`** - Simple source code deployment
  - **Usage**: `bash scripts/deploy-simple.sh`
  - **Purpose**: Deploys source code directly to EC2 (no Docker)
  - **Referenced in**: docs/DEPLOYMENT_GUIDE.md

### **Debug & Troubleshooting**
- **`deploy-ec2-debug.sh`** - Comprehensive EC2 debugging
  - **Usage**: `bash scripts/deploy-ec2-debug.sh`
  - **Purpose**: Diagnoses and fixes common EC2 deployment issues
  - **Referenced in**: docs/TROUBLESHOOTING.md

## ☁️ AWS Infrastructure Scripts

### **Infrastructure Setup**
- **`aws-infrastructure.sh`** - AWS infrastructure creation
  - **Usage**: `bash scripts/aws-infrastructure.sh`
  - **Purpose**: Creates EC2 instances, security groups, and other AWS resources
  - **Referenced in**: docs/DEPLOYMENT_GUIDE.md

### **Maintenance & Updates**
- **`cleanup-aws.sh`** - AWS resource cleanup
  - **Usage**: `bash scripts/cleanup-aws.sh`
  - **Purpose**: Removes AWS resources to avoid charges
  - **Referenced in**: docs/DEPLOYMENT_GUIDE.md

- **`update-ec2.sh`** - EC2 instance updates (Bash)
  - **Usage**: `bash scripts/update-ec2.sh`
  - **Purpose**: Updates EC2 instances with latest code
  - **Referenced in**: package.json (`npm run update:ec2`)

- **`update-ec2.ps1`** - EC2 instance updates (PowerShell)
  - **Usage**: `powershell -ExecutionPolicy Bypass -File scripts/update-ec2.ps1`
  - **Purpose**: Windows PowerShell version of EC2 updates
  - **Referenced in**: package.json (`npm run update:ec2:ps`)

### **SSH Key Management**
- **`get-ssh-key.ps1`** - SSH key retrieval
  - **Usage**: `powershell -ExecutionPolicy Bypass -File scripts/get-ssh-key.ps1`
  - **Purpose**: Retrieves SSH keys from AWS
  - **Referenced in**: package.json (`npm run get-ssh-key`)

## 📊 BHA Data Pipeline Scripts

### **Deployment**
- **`deploy-bha-ecs.sh`** - BHA pipeline deployment (Bash)
  - **Usage**: `bash scripts/deploy-bha-ecs.sh`
  - **Purpose**: Deploys BHA data pipeline to ECS
  - **Referenced in**: docs/DEPLOYMENT_GUIDE.md

- **`deploy-bha-ecs.ps1`** - BHA pipeline deployment (PowerShell)
  - **Usage**: `powershell -ExecutionPolicy Bypass -File scripts/deploy-bha-ecs.ps1`
  - **Purpose**: Windows PowerShell version of BHA deployment
  - **Referenced in**: docs/DEPLOYMENT_GUIDE.md

### **Setup & Configuration**
- **`setup-bha-cron.sh`** - BHA cron job setup
  - **Usage**: `bash scripts/setup-bha-cron.sh`
  - **Purpose**: Sets up monthly BHA data updates
  - **Referenced in**: docs/DEPLOYMENT_GUIDE.md

- **`bha-data-pipeline.service`** - Systemd service file
  - **Purpose**: Systemd service configuration for BHA pipeline
  - **Location**: `/etc/systemd/system/bha-data-pipeline.service`

### **Data Processing**
- **`bha-2025-payment-standards.py`** - 2025 BHA data processing
  - **Usage**: `python3 scripts/bha-2025-payment-standards.py`
  - **Purpose**: Processes BHA 2025 payment standards data

- **`bha-payment-standards-future.py`** - Future BHA data processing
  - **Usage**: `python3 scripts/bha-payment-standards-future.py`
  - **Purpose**: Processes future BHA payment standards (auto-detects years)

- **`bha-rent-data-integration.py`** - BHA rent data integration
  - **Usage**: `python3 scripts/bha-rent-data-integration.py`
  - **Purpose**: Integrates BHA rent data into the system
  - **Referenced in**: BHA_RENT_DATA_SETUP.md

## 🔧 Data Pipeline Scripts

- **`deploy-data-pipeline.sh`** - Data pipeline deployment
  - **Usage**: `bash scripts/deploy-data-pipeline.sh`
  - **Purpose**: Deploys the complete data pipeline
  - **Referenced in**: DATA_PIPELINE_SETUP.md

## 🛠️ Setup & Utility Scripts

### **Environment Setup**
- **`setup-new-laptop.sh`** - New laptop setup
  - **Usage**: `bash scripts/setup-new-laptop.sh`
  - **Purpose**: Sets up development environment on new laptop
  - **Referenced in**: QUICK_START.md

- **`setup-env.sh`** - Environment setup (Bash)
  - **Usage**: `bash scripts/setup-env.sh [create|use|validate] [local|production]`
  - **Purpose**: Sets up environment variables and configuration

- **`setup-env.ps1`** - Environment setup (PowerShell)
  - **Usage**: `powershell -ExecutionPolicy Bypass -File scripts/setup-env.ps1`
  - **Purpose**: Windows PowerShell version of environment setup

- **`setup-rent-api.sh`** - Rent API setup
  - **Usage**: `bash scripts/setup-rent-api.sh`
  - **Purpose**: Sets up the rent API infrastructure

## 🔍 Debug & Maintenance Scripts

### **Version Management**
- **`check-version-mismatch.sh`** - Version mismatch detection
  - **Usage**: `bash scripts/check-version-mismatch.sh`
  - **Purpose**: Detects version mismatches across packages
  - **Referenced in**: docs/TROUBLESHOOTING.md

- **`check-local-versions.ps1`** - Local version checking
  - **Usage**: `powershell -ExecutionPolicy Bypass -File scripts/check-local-versions.ps1`
  - **Purpose**: Checks local package versions

### **Debugging**
- **`debug-data-loading.sh`** - Data loading debug
  - **Usage**: `bash scripts/debug-data-loading.sh`
  - **Purpose**: Debugs data loading issues
  - **Referenced in**: docs/TROUBLESHOOTING.md

## 📋 Usage Examples

### **Typical Deployment Workflow**
```bash
# 1. Set up AWS infrastructure
bash scripts/aws-infrastructure.sh

# 2. Deploy application
npm run deploy:aws  # Uses deploy-docker.sh

# 3. Deploy BHA data pipeline
bash scripts/deploy-bha-ecs.sh

# 4. Update application
npm run update:ec2
```

### **Troubleshooting Workflow**
```bash
# 1. Debug deployment issues
bash scripts/deploy-ec2-debug.sh

# 2. Check version mismatches
bash scripts/check-version-mismatch.sh

# 3. Debug data loading
bash scripts/debug-data-loading.sh
```

### **Development Setup**
```bash
# 1. Set up new laptop
bash scripts/setup-new-laptop.sh

# 2. Set up environment
bash scripts/setup-env.sh create local

# 3. Validate setup
bash scripts/setup-env.sh validate
```

## 🔄 Script Maintenance

### **Adding New Scripts**
1. Add script to appropriate category
2. Update this README with usage and purpose
3. Add references in relevant documentation
4. Test script thoroughly

### **Updating Scripts**
1. Test changes in staging environment
2. Update documentation if usage changes
3. Update this README if purpose changes
4. Version control all changes

### **Archiving Scripts**
1. Move to `scripts/archive/` directory
2. Update this README to reflect archive location
3. Document why script was archived
4. Keep for reference if needed

## 📝 Notes

- **PowerShell Scripts**: Use `-ExecutionPolicy Bypass` for Windows execution
- **Bash Scripts**: Ensure executable permissions with `chmod +x`
- **Python Scripts**: May require virtual environment activation
- **Dependencies**: Some scripts require AWS CLI, Docker, or other tools

---

**Last Updated**: Script consolidation completed as part of codebase cleanup
