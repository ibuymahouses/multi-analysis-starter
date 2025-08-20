# 📋 Script Analysis & Consolidation Plan

## 🔍 Current Script Inventory

### **Actively Used Scripts** (Keep)
These scripts are referenced in current documentation, package.json, or are essential:

#### **Core Deployment Scripts**
- `scripts/deploy-docker.sh` ✅ **KEEP** - Main production deployment (referenced in package.json)
- `scripts/deploy-simple.sh` ✅ **KEEP** - Simple source deployment (referenced in docs)
- `scripts/deploy-ec2-debug.sh` ✅ **KEEP** - Debug tool (referenced in troubleshooting)

#### **AWS Infrastructure Scripts**
- `scripts/aws-infrastructure.sh` ✅ **KEEP** - AWS setup (referenced in docs)
- `scripts/cleanup-aws.sh` ✅ **KEEP** - AWS cleanup (referenced in docs)
- `scripts/update-ec2.sh` ✅ **KEEP** - EC2 updates (referenced in package.json)
- `scripts/update-ec2.ps1` ✅ **KEEP** - PowerShell EC2 updates (referenced in package.json)
- `scripts/get-ssh-key.ps1` ✅ **KEEP** - SSH key management (referenced in package.json)

#### **BHA Data Pipeline Scripts**
- `scripts/deploy-bha-ecs.sh` ✅ **KEEP** - BHA deployment (referenced in docs)
- `scripts/deploy-bha-ecs.ps1` ✅ **KEEP** - PowerShell BHA deployment (referenced in docs)
- `scripts/setup-bha-cron.sh` ✅ **KEEP** - BHA cron setup (referenced in docs)
- `scripts/bha-2025-payment-standards.py` ✅ **KEEP** - BHA data processing
- `scripts/bha-payment-standards-future.py` ✅ **KEEP** - Future BHA data processing
- `scripts/bha-data-pipeline.service` ✅ **KEEP** - BHA systemd service

#### **Data Pipeline Scripts**
- `scripts/deploy-data-pipeline.sh` ✅ **KEEP** - Data pipeline deployment (referenced in DATA_PIPELINE_SETUP.md)
- `scripts/bha-rent-data-integration.py` ✅ **KEEP** - BHA rent data integration (referenced in BHA_RENT_DATA_SETUP.md)

#### **Setup & Utility Scripts**
- `scripts/setup-new-laptop.sh` ✅ **KEEP** - New laptop setup (referenced in QUICK_START.md)
- `scripts/setup-env.sh` ✅ **KEEP** - Environment setup (referenced in archived docs)
- `scripts/setup-env.ps1` ✅ **KEEP** - PowerShell environment setup (referenced in archived docs)
- `scripts/setup-rent-api.sh` ✅ **KEEP** - Rent API setup (referenced in archived docs)

#### **Debug & Maintenance Scripts**
- `scripts/check-version-mismatch.sh` ✅ **KEEP** - Version checking (referenced in troubleshooting)
- `scripts/debug-data-loading.sh` ✅ **KEEP** - Data loading debug (referenced in troubleshooting)
- `scripts/check-local-versions.ps1` ✅ **KEEP** - Local version checking

### **Potentially Redundant Scripts** (Analyze for Removal)
These scripts appear to be duplicates or outdated versions:

#### **Deployment Scripts (Potential Consolidation)**
- `scripts/deploy-aws.sh` ⚠️ **ANALYZE** - Appears to be older version of deploy-docker.sh
- `scripts/deploy-enterprise-frontend.sh` ⚠️ **ANALYZE** - Not referenced in current docs
- `scripts/deploy-rent-api.sh` ⚠️ **ANALYZE** - Not referenced in current docs

#### **Cleanup Scripts**
- `scripts/cleanup-other-platforms.sh` ⚠️ **ANALYZE** - Platform cleanup, check if needed

#### **Data Processing Scripts**
- `scripts/fix-all-bha-rents.js` ⚠️ **ANALYZE** - One-time fix script
- `scripts/fix-bha-rents.js` ⚠️ **ANALYZE** - One-time fix script
- `scripts/fix-missing-zips.js` ⚠️ **ANALYZE** - One-time fix script
- `scripts/replace-all-bha-rents.js` ⚠️ **ANALYZE** - One-time fix script
- `scripts/update-bha-rents.js` ⚠️ **ANALYZE** - One-time update script
- `scripts/update-bha-rents-complete.js` ⚠️ **ANALYZE** - One-time update script

#### **Data Generation Scripts**
- `scripts/generate-all-ma-zips.js` ⚠️ **ANALYZE** - One-time generation script
- `scripts/migrate-to-enterprise.js` ⚠️ **ANALYZE** - One-time migration script

#### **Infrastructure Scripts**
- `scripts/launch-ec2.sh` ⚠️ **ANALYZE** - EC2 launch, check if needed
- `scripts/quick-start-aws.sh` ⚠️ **ANALYZE** - Quick start, check if needed

## 🎯 Consolidation Strategy

### **Phase 1: Keep Essential Scripts**
- All scripts marked ✅ **KEEP** should remain
- These are actively used and essential for the application

### **Phase 2: Analyze Redundant Scripts**
- Review scripts marked ⚠️ **ANALYZE**
- Check if they're one-time scripts that can be archived
- Verify if functionality is duplicated in other scripts

### **Phase 3: Archive One-Time Scripts**
- Move one-time fix/update scripts to `scripts/archive/`
- Keep them available but not cluttering the main scripts directory

### **Phase 4: Consolidate Similar Scripts**
- Merge similar deployment scripts if possible
- Create unified deployment script with options

## 📊 Impact Analysis

### **Current State**
- **Total Scripts**: ~35 scripts
- **Actively Used**: ~20 scripts
- **Potentially Redundant**: ~15 scripts

### **After Consolidation**
- **Total Scripts**: ~20 scripts
- **Reduction**: ~43% fewer scripts
- **Maintained Functionality**: 100%

## 🔄 Next Steps

1. **Verify Usage**: Double-check that "analyze" scripts aren't used elsewhere
2. **Test Functionality**: Ensure consolidated scripts work correctly
3. **Archive Redundant**: Move one-time scripts to archive
4. **Update Documentation**: Update references to consolidated scripts
5. **Create Script Index**: Document all remaining scripts with their purposes

---

**Note**: This analysis is based on current documentation and package.json references. Some scripts may be used in ways not captured in this analysis.
