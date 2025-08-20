# 📚 Multi-Analysis Documentation

This directory contains the consolidated documentation for the Multi-Analysis application.

## 📁 Structure

```
docs/
├── README.md                    # This file
├── DEPLOYMENT_GUIDE.md          # Comprehensive deployment guide
├── TROUBLESHOOTING.md           # Troubleshooting guide
└── archive/                     # Archived old documentation
    ├── AWS_DEPLOYMENT_GUIDE.md
    ├── aws-setup-guide.md
    ├── BHA_DEPLOYMENT_STATUS.md
    ├── BHA_ECS_DEPLOYMENT_GUIDE.md
    ├── DEPLOYMENT_CHECKLIST.md
    ├── DEPLOYMENT_GUIDE.md
    ├── DEPLOYMENT_LESSONS.md
    ├── EC2_DEPLOYMENT_TROUBLESHOOTING.md
    ├── ENTERPRISE_DEPLOYMENT_GUIDE.md
    ├── ENVIRONMENT_SETUP.md
    ├── GITHUB_ACTIONS_SETUP.md
    └── STATIC_IP_COMPARISON.md
```

## 📖 Current Documentation

### 🚀 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
Comprehensive guide covering all deployment options:
- Quick start guide
- AWS EC2 deployment (recommended)
- Docker deployment
- BHA data pipeline deployment
- Environment setup
- CI/CD integration

### 🔧 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
Complete troubleshooting guide covering:
- Deployment issues
- Application issues
- Database issues
- AWS/EC2 issues
- BHA data pipeline issues
- Performance issues
- Debug tools

## 📦 Archived Documentation

The `archive/` directory contains the original scattered documentation files that have been consolidated into the two main guides above. These files are kept for reference but are no longer maintained.

### Why Archive?
- **Reduced Confusion**: Multiple deployment guides were causing confusion
- **Consolidated Information**: All deployment info is now in one place
- **Easier Maintenance**: Single source of truth for each topic
- **Better Organization**: Clear separation of deployment vs troubleshooting

## 🔄 Migration Notes

### What Changed
1. **12 deployment guides** → **1 comprehensive deployment guide**
2. **Multiple troubleshooting files** → **1 troubleshooting guide**
3. **Scattered information** → **Organized documentation structure**

### What's Preserved
- All original information is preserved in the archive
- No functionality has been lost
- All scripts and commands remain the same
- Environment setup procedures unchanged

## 📝 Contributing

When updating documentation:
1. **Update the main guides** (`DEPLOYMENT_GUIDE.md` or `TROUBLESHOOTING.md`)
2. **Keep information consolidated** - avoid creating new separate files
3. **Cross-reference** between guides when needed
4. **Test all commands** before documenting

## 🔗 Quick Links

- **Getting Started**: [DEPLOYMENT_GUIDE.md#quick-start](./DEPLOYMENT_GUIDE.md#quick-start)
- **AWS Deployment**: [DEPLOYMENT_GUIDE.md#aws-ec2-deployment-recommended](./DEPLOYMENT_GUIDE.md#aws-ec2-deployment-recommended)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Archive**: [archive/](./archive/)

---

**Note**: This documentation structure was created as part of a codebase cleanup to reduce bloat and improve maintainability.
