# Data Pipeline Setup Guide

## Overview

This guide sets up automated data feeds for rent data and listings on your existing EC2 instance (`<EC2_IP>`). The data pipeline will:

- **Automatically fetch and update rent data** from BHA and external sources
- **Automatically fetch and update property listings** from MLS and other sources
- **Store data in PostgreSQL database** for fast querying
- **Provide REST API endpoints** for your frontend application
- **Run on a schedule** (daily updates)

## 🚀 Quick Deployment

### Step 1: Deploy Data Pipeline to EC2

```bash
# Make scripts executable
chmod +x scripts/deploy-data-pipeline.sh

# Deploy to your EC2 instance
./scripts/deploy-data-pipeline.sh
```

### Step 2: Configure Environment

SSH into your EC2 instance:
```bash
ssh -i multi-analysis-key-496-new.pem ec2-user@<EC2_IP>
```

Edit the environment file:
```bash
sudo nano /opt/data-pipeline/.env
```

Add your database password and API keys:
```bash
# Database Configuration
DB_HOST=multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=YOUR_ACTUAL_DB_PASSWORD

# AWS Configuration
AWS_REGION=us-east-1
S3_BUCKET=multi-analysis-data-496

# Data Source APIs (configure as needed)
MLS_API_URL=https://api.mls.example.com
MLS_API_KEY=your_mls_api_key_here

BHA_API_URL=https://api.bha.gov
BHA_API_KEY=your_bha_api_key_here

EXTERNAL_RENT_API_URL=https://rent-api.example.com
EXTERNAL_RENT_API_KEY=your_external_rent_api_key_here
```

### Step 3: Test the Pipeline

```bash
# Test rent data pipeline
cd /opt/data-pipeline
source venv/bin/activate
python update_rents.py

# Test listings pipeline
python update_listings.py
```

### Step 4: Restart Services

```bash
# Restart the data pipeline service
sudo systemctl restart data-pipeline

# Restart your main API server
sudo systemctl restart api-server
```

## 📊 New API Endpoints

Once deployed, you'll have these new endpoints:

### Rent Data Endpoints
- `GET /api/pipeline/rents` - Get all rent data
- `GET /api/pipeline/rents/:zipCode` - Get rent data for specific ZIP code

### Listings Endpoints
- `GET /api/pipeline/listings` - Get all listings (with pagination and filters)
- `GET /api/pipeline/listings/:listNo` - Get specific listing by list number

### Status Endpoint
- `GET /api/pipeline/status` - Check data pipeline health and statistics

### Example Usage

```bash
# Check pipeline status
curl http://<EC2_IP>:3001/api/pipeline/status

# Get all rent data
curl http://<EC2_IP>:3001/api/pipeline/rents

# Get rent data for ZIP 02108
curl http://<EC2_IP>:3001/api/pipeline/rents/02108

# Get listings with filters
curl "http://<EC2_IP>:3001/api/pipeline/listings?city=Boston&min_price=500000&max_price=1000000"

# Get specific listing
curl http://<EC2_IP>:3001/api/pipeline/listings/123456
```

## 🔄 Automated Schedule

The data pipeline runs automatically:

- **Rent data updates**: Daily at 2:00 AM
- **Listings updates**: Daily at 3:00 AM

### Manual Updates

You can also run updates manually:

```bash
# Update rent data
cd /opt/data-pipeline
source venv/bin/activate
python update_rents.py

# Update listings
python update_listings.py
```

## 📈 Monitoring

### Check Service Status
```bash
sudo systemctl status data-pipeline
```

### View Logs
```bash
# Real-time logs
tail -f /opt/data-pipeline/logs/pipeline.log

# Recent logs
tail -n 100 /opt/data-pipeline/logs/pipeline.log
```

### Check Database Tables
```bash
# Connect to database
psql -h multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com -U postgres -d multi_analysis

# Check rent data
SELECT COUNT(*) FROM rents;
SELECT * FROM rents LIMIT 5;

# Check listings
SELECT COUNT(*) FROM listings;
SELECT * FROM listings LIMIT 5;
```

## 🗄️ Database Schema

### Rents Table
```sql
CREATE TABLE rents (
    id SERIAL PRIMARY KEY,
    zip_code VARCHAR(10) NOT NULL,
    town VARCHAR(100),
    county VARCHAR(100),
    studio_rent DECIMAL(10,2),
    one_br_rent DECIMAL(10,2),
    two_br_rent DECIMAL(10,2),
    three_br_rent DECIMAL(10,2),
    four_br_rent DECIMAL(10,2),
    five_br_rent DECIMAL(10,2),
    six_br_rent DECIMAL(10,2),
    source VARCHAR(50) DEFAULT 'bha',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(zip_code, source)
);
```

### Listings Table
```sql
CREATE TABLE listings (
    id SERIAL PRIMARY KEY,
    list_no VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(10),
    zip_code VARCHAR(10),
    price DECIMAL(12,2),
    bedrooms INTEGER,
    bathrooms DECIMAL(4,2),
    square_feet INTEGER,
    lot_size DECIMAL(10,2),
    year_built INTEGER,
    property_type VARCHAR(100),
    listing_date DATE,
    status VARCHAR(50),
    source VARCHAR(50) DEFAULT 'mls',
    raw_data JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Configuration

### Adding New Data Sources

To add new data sources, edit `/opt/data-pipeline/config.py`:

```python
DATA_SOURCES = {
    'mls': {
        'api_url': os.getenv('MLS_API_URL'),
        'api_key': os.getenv('MLS_API_KEY'),
        'update_frequency': 'daily'
    },
    'bha': {
        'api_url': os.getenv('BHA_API_URL'),
        'api_key': os.getenv('BHA_API_KEY'),
        'update_frequency': 'weekly'
    },
    'external_rent': {
        'api_url': os.getenv('EXTERNAL_RENT_API_URL'),
        'api_key': os.getenv('EXTERNAL_RENT_API_KEY'),
        'update_frequency': 'daily'
    },
    # Add new sources here
    'new_source': {
        'api_url': os.getenv('NEW_SOURCE_API_URL'),
        'api_key': os.getenv('NEW_SOURCE_API_KEY'),
        'update_frequency': 'daily'
    }
}
```

### Changing Update Schedule

Edit the cron jobs:
```bash
crontab -e
```

Current schedule:
```
0 2 * * * /opt/data-pipeline/venv/bin/python /opt/data-pipeline/update_rents.py
0 3 * * * /opt/data-pipeline/venv/bin/python /opt/data-pipeline/update_listings.py
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database connectivity
   psql -h multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com -U postgres -d multi_analysis
   
   # Check environment variables
   cat /opt/data-pipeline/.env
   ```

2. **Service Not Running**
   ```bash
   # Check service status
   sudo systemctl status data-pipeline
   
   # Restart service
   sudo systemctl restart data-pipeline
   
   # Check logs
   journalctl -u data-pipeline -f
   ```

3. **Permission Issues**
   ```bash
   # Fix permissions
   sudo chown -R ec2-user:ec2-user /opt/data-pipeline
   chmod +x /opt/data-pipeline/*.py
   ```

4. **Python Dependencies Missing**
   ```bash
   cd /opt/data-pipeline
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### Log Locations

- **Data Pipeline Logs**: `/opt/data-pipeline/logs/pipeline.log`
- **System Service Logs**: `journalctl -u data-pipeline`
- **Cron Logs**: `/var/log/cron`

## 📞 Support

If you encounter issues:

1. Check the logs: `tail -f /opt/data-pipeline/logs/pipeline.log`
2. Verify database connectivity
3. Check service status: `sudo systemctl status data-pipeline`
4. Test manually: Run the Python scripts directly

The data pipeline is designed to be robust and will continue working even if individual data sources are temporarily unavailable.
