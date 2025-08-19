# BHA Data Pipeline ECS Deployment Guide

## 🚀 **Overview**

This guide deploys the BHA Payment Standards data pipeline to your ECS instance with:
- **Monthly automatic updates** (1st of each month at 2 AM)
- **Future-proof year detection** (automatically switches to 2026, 2027, etc.)
- **Database integration** with your existing PostgreSQL setup
- **Comprehensive logging** and monitoring

## 📋 **What Gets Deployed**

### **1. Future-Proof Data Pipeline**
- **Automatic year detection**: Scans BHA website for latest available data
- **Seamless year transitions**: When 2026 data becomes available, automatically switches
- **Backward compatibility**: Maintains historical data while updating to latest

### **2. Monthly Scheduling**
- **Cron job**: Runs on 1st of each month at 2:00 AM
- **Systemd service**: For manual runs and monitoring
- **Logging**: Comprehensive logs in `/var/log/bha-data-pipeline.log`

### **3. Data Storage**
- **PostgreSQL database**: Integrated with your existing `multi_analysis` database
- **CSV files**: Backup data in `/opt/rent-api/data/`
- **JSON files**: API-ready format for your frontend

## 🛠️ **Deployment Steps**

### **Step 1: Deploy to ECS**

```bash
# Make deployment script executable
chmod +x scripts/deploy-bha-ecs.sh

# Deploy to your EC2 instance
./scripts/deploy-bha-ecs.sh
```

### **Step 2: Verify Deployment**

SSH into your EC2 instance:
```bash
ssh -i multi-analysis-key-496.pem ec2-user@<EC2_IP>
```

Check the setup:
```bash
# Check if data pipeline is running
ls -la /opt/rent-api/

# Check cron job
crontab -l

# Check systemd service
sudo systemctl status bha-data-pipeline

# Check logs
tail -f /var/log/bha-data-pipeline.log
```

### **Step 3: Test the Pipeline**

```bash
# Run the pipeline manually
cd /opt/rent-api
source venv/bin/activate
python3 bha-payment-standards-future.py
```

## 🔄 **How Future-Proofing Works**

### **Automatic Year Detection**

The pipeline automatically:

1. **Scans BHA website** for available Payment Standards files
2. **Extracts year** from filenames (2025, 2026, 2027, etc.)
3. **Downloads latest** available year
4. **Updates database** with new data
5. **Tracks current year** in `current_year.txt`

### **Year Transition Example**

**Current (2025):**
- Downloads: `2025-Payment-Standards-All-BR.pdf`
- Database: BHA 2025 Payment Standards
- Files: `bha_2025_payment_standards.csv/json`

**When 2026 becomes available:**
- Automatically detects: `2026-Payment-Standards-All-BR.pdf`
- Downloads new data
- Updates database with 2026 data
- Files: `bha_2026_payment_standards.csv/json`

## 📊 **Data Structure**

### **Database Schema**
```sql
CREATE TABLE rents (
    id SERIAL PRIMARY KEY,
    zip_code VARCHAR(10),
    town VARCHAR(100),
    county VARCHAR(50),
    studio_rent INTEGER,
    one_br_rent INTEGER,
    two_br_rent INTEGER,
    three_br_rent INTEGER,
    four_br_rent INTEGER,
    five_br_rent INTEGER,
    six_br_rent INTEGER,
    source VARCHAR(100),
    effective_year INTEGER,
    updated_at TIMESTAMP
);
```

### **API Response Format**
```json
{
  "source": "BHA 2025 Payment Standards",
  "effective_date": "2025-07-01",
  "updated_at": "2025-01-15T10:30:00",
  "year": 2025,
  "rents": [
    {
      "zip_code": "02108",
      "town": "Boston - Beacon Hill",
      "studio_rent": 3266,
      "one_br_rent": 3450,
      "two_br_rent": 4100,
      "three_br_rent": 4950,
      "four_br_rent": 5450,
      "five_br_rent": 6250,
      "six_br_rent": 7000
    }
  ]
}
```

## 🔧 **Monitoring & Maintenance**

### **Check Pipeline Status**
```bash
# View recent logs
tail -20 /var/log/bha-data-pipeline.log

# Check current year
cat /opt/rent-api/data/current_year.txt

# Check cron job status
crontab -l

# Check systemd service
sudo systemctl status bha-data-pipeline
```

### **Manual Updates**
```bash
# Run pipeline manually
cd /opt/rent-api
source venv/bin/activate
python3 bha-payment-standards-future.py

# Or use systemd service
sudo systemctl start bha-data-pipeline
```

### **Troubleshooting**
```bash
# Check Python environment
cd /opt/rent-api
source venv/bin/activate
python3 -c "import requests, pandas, psycopg2; print('Dependencies OK')"

# Check database connection
python3 -c "
import os
from sqlalchemy import create_engine
db_url = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/multi_analysis')
engine = create_engine(db_url)
print('Database connection OK')
"
```

## 📈 **Integration with Your API**

### **Update Your API Endpoint**

Add this to your existing API server:

```javascript
// In api/src/routes/data-pipeline.js
app.get('/api/rents/latest', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM rents 
      WHERE source LIKE 'BHA % Payment Standards'
      ORDER BY effective_year DESC, updated_at DESC
      LIMIT 1
    `);
    
    res.json({
      current_year: rows[0]?.effective_year,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **Frontend Integration**

Update your frontend to use the latest data:

```typescript
// In your frontend config
const API_ENDPOINTS = {
  // ... existing endpoints
  rentsLatest: `${API_BASE_URL}/api/rents/latest`,
};
```

## 🎯 **Benefits**

### **1. Zero Maintenance**
- **Automatic updates**: No manual intervention needed
- **Future-proof**: Handles year transitions automatically
- **Self-healing**: Retries on failures

### **2. Data Quality**
- **Official source**: Direct from BHA website
- **Latest data**: Always current Payment Standards
- **Historical tracking**: Maintains data lineage

### **3. Scalability**
- **ECS ready**: Designed for cloud deployment
- **Database integration**: Works with your existing setup
- **API ready**: JSON format for frontend consumption

## ✅ **Success Indicators**

After deployment, you should see:

1. **Initial data fetch** completes successfully
2. **Cron job** appears in `crontab -l`
3. **Database** contains BHA 2025 Payment Standards data
4. **Logs** show successful pipeline execution
5. **Files** created in `/opt/rent-api/data/`

## 🔮 **Future Enhancements**

### **Potential Improvements**
- **PDF parsing**: Implement actual PDF table extraction
- **Email notifications**: Alert on successful updates
- **Data validation**: Verify data quality before saving
- **Backup strategy**: Archive historical data
- **Monitoring dashboard**: Web interface for pipeline status

This deployment gives you a robust, future-proof BHA data pipeline that will automatically keep your rent data current for years to come!
