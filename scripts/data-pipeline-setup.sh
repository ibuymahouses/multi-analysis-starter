#!/bin/bash

# Data Pipeline Setup Script for EC2
# This script sets up automated data feeds for rent data and listings

set -e

echo "🚀 Setting up Data Pipeline Services on EC2..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running on EC2
if [ ! -f /sys/hypervisor/uuid ]; then
    print_error "This script should be run on the EC2 instance"
    exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install additional dependencies for data processing
print_status "Installing data processing dependencies..."
sudo apt install -y \
    python3-pip \
    python3-venv \
    postgresql-client \
    curl \
    jq \
    cron \
    unzip

# Create data pipeline directory
print_status "Creating data pipeline directory..."
sudo mkdir -p /opt/data-pipeline
sudo chown $USER:$USER /opt/data-pipeline

# Create Python virtual environment for data processing
print_status "Setting up Python virtual environment..."
cd /opt/data-pipeline
python3 -m venv venv
source venv/bin/activate

# Install Python packages for data processing
print_status "Installing Python data processing packages..."
pip install \
    requests \
    pandas \
    psycopg2-binary \
    boto3 \
    schedule \
    python-dotenv

# Create data pipeline configuration
print_status "Creating data pipeline configuration..."
cat > /opt/data-pipeline/config.py << 'EOF'
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'multi_analysis'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

# S3 configuration
S3_CONFIG = {
    'bucket': os.getenv('S3_BUCKET', 'multi-analysis-data-496'),
    'region': os.getenv('AWS_REGION', 'us-east-1')
}

# Data source configurations
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
    }
}

# Logging configuration
LOG_CONFIG = {
    'level': 'INFO',
    'file': '/opt/data-pipeline/logs/pipeline.log',
    'max_size': '10MB',
    'backup_count': 5
}
EOF

# Create data pipeline scripts
print_status "Creating data pipeline scripts..."

# Rent data pipeline
cat > /opt/data-pipeline/update_rents.py << 'EOF'
#!/usr/bin/env python3
"""
Rent Data Pipeline
Updates rental rate data from various sources
"""

import sys
import os
import logging
import requests
import json
import psycopg2
from datetime import datetime
from config import DB_CONFIG, DATA_SOURCES, LOG_CONFIG

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_CONFIG['level']),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_CONFIG['file']),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def connect_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

def fetch_bha_rents():
    """Fetch BHA rental data"""
    try:
        # For now, use local file as fallback
        local_file = '/home/ec2-user/app/data/bha-rents-comprehensive.json'
        if os.path.exists(local_file):
            with open(local_file, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded {len(data.get('rents', []))} BHA rent records from local file")
            return data
        
        # TODO: Implement actual BHA API call
        logger.warning("BHA API not implemented, using local data")
        return None
    except Exception as e:
        logger.error(f"Error fetching BHA rents: {e}")
        return None

def fetch_external_rents():
    """Fetch external rental data"""
    try:
        # TODO: Implement external rent API calls
        logger.info("External rent API not implemented yet")
        return None
    except Exception as e:
        logger.error(f"Error fetching external rents: {e}")
        return None

def update_rents_table(conn, rent_data):
    """Update rents table in database"""
    try:
        cursor = conn.cursor()
        
        # Create rents table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rents (
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
            )
        """)
        
        if rent_data and 'rents' in rent_data:
            for rent_record in rent_data['rents']:
                cursor.execute("""
                    INSERT INTO rents (
                        zip_code, town, county, studio_rent, one_br_rent, 
                        two_br_rent, three_br_rent, four_br_rent, five_br_rent, six_br_rent
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (zip_code, source) 
                    DO UPDATE SET
                        town = EXCLUDED.town,
                        county = EXCLUDED.county,
                        studio_rent = EXCLUDED.studio_rent,
                        one_br_rent = EXCLUDED.one_br_rent,
                        two_br_rent = EXCLUDED.two_br_rent,
                        three_br_rent = EXCLUDED.three_br_rent,
                        four_br_rent = EXCLUDED.four_br_rent,
                        five_br_rent = EXCLUDED.five_br_rent,
                        six_br_rent = EXCLUDED.six_br_rent,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    rent_record.get('zip'),
                    rent_record.get('town'),
                    rent_record.get('county'),
                    rent_record.get('rents', {}).get('0'),
                    rent_record.get('rents', {}).get('1'),
                    rent_record.get('rents', {}).get('2'),
                    rent_record.get('rents', {}).get('3'),
                    rent_record.get('rents', {}).get('4'),
                    rent_record.get('rents', {}).get('5'),
                    rent_record.get('rents', {}).get('6')
                ))
        
        conn.commit()
        logger.info("Rents table updated successfully")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating rents table: {e}")
        raise
    finally:
        cursor.close()

def main():
    """Main function"""
    logger.info("Starting rent data pipeline update")
    
    try:
        # Connect to database
        conn = connect_db()
        
        # Fetch rent data
        bha_data = fetch_bha_rents()
        external_data = fetch_external_rents()
        
        # Update database
        if bha_data:
            update_rents_table(conn, bha_data)
        
        logger.info("Rent data pipeline completed successfully")
        
    except Exception as e:
        logger.error(f"Rent data pipeline failed: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
EOF

# Listings pipeline
cat > /opt/data-pipeline/update_listings.py << 'EOF'
#!/usr/bin/env python3
"""
Listings Data Pipeline
Updates property listings from various sources
"""

import sys
import os
import logging
import requests
import json
import psycopg2
from datetime import datetime
from config import DB_CONFIG, DATA_SOURCES, LOG_CONFIG

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_CONFIG['level']),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_CONFIG['file']),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def connect_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

def fetch_mls_listings():
    """Fetch MLS listings"""
    try:
        # For now, use local file as fallback
        local_file = '/home/ec2-user/app/data/listings.json'
        if os.path.exists(local_file):
            with open(local_file, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded {len(data)} MLS listing records from local file")
            return data
        
        # TODO: Implement actual MLS API call
        logger.warning("MLS API not implemented, using local data")
        return None
    except Exception as e:
        logger.error(f"Error fetching MLS listings: {e}")
        return None

def update_listings_table(conn, listings_data):
    """Update listings table in database"""
    try:
        cursor = conn.cursor()
        
        # Create listings table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS listings (
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
            )
        """)
        
        if listings_data:
            for listing in listings_data:
                cursor.execute("""
                    INSERT INTO listings (
                        list_no, address, city, state, zip_code, price,
                        bedrooms, bathrooms, square_feet, lot_size,
                        year_built, property_type, listing_date, status, raw_data
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (list_no) 
                    DO UPDATE SET
                        address = EXCLUDED.address,
                        city = EXCLUDED.city,
                        state = EXCLUDED.state,
                        zip_code = EXCLUDED.zip_code,
                        price = EXCLUDED.price,
                        bedrooms = EXCLUDED.bedrooms,
                        bathrooms = EXCLUDED.bathrooms,
                        square_feet = EXCLUDED.square_feet,
                        lot_size = EXCLUDED.lot_size,
                        year_built = EXCLUDED.year_built,
                        property_type = EXCLUDED.property_type,
                        listing_date = EXCLUDED.listing_date,
                        status = EXCLUDED.status,
                        raw_data = EXCLUDED.raw_data,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    listing.get('LIST_NO'),
                    listing.get('ADDRESS'),
                    listing.get('CITY'),
                    listing.get('STATE'),
                    listing.get('ZIP'),
                    listing.get('PRICE'),
                    listing.get('BEDROOMS'),
                    listing.get('BATHROOMS'),
                    listing.get('SQFT'),
                    listing.get('LOT_SIZE'),
                    listing.get('YEAR_BUILT'),
                    listing.get('PROPERTY_TYPE'),
                    listing.get('LISTING_DATE'),
                    listing.get('STATUS'),
                    json.dumps(listing)
                ))
        
        conn.commit()
        logger.info("Listings table updated successfully")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating listings table: {e}")
        raise
    finally:
        cursor.close()

def main():
    """Main function"""
    logger.info("Starting listings data pipeline update")
    
    try:
        # Connect to database
        conn = connect_db()
        
        # Fetch listings data
        mls_data = fetch_mls_listings()
        
        # Update database
        if mls_data:
            update_listings_table(conn, mls_data)
        
        logger.info("Listings data pipeline completed successfully")
        
    except Exception as e:
        logger.error(f"Listings data pipeline failed: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
EOF

# Create logs directory
print_status "Creating logs directory..."
mkdir -p /opt/data-pipeline/logs

# Make scripts executable
print_status "Making scripts executable..."
chmod +x /opt/data-pipeline/update_rents.py
chmod +x /opt/data-pipeline/update_listings.py

# Set up cron jobs for automated updates
print_status "Setting up automated data updates..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/data-pipeline/venv/bin/python /opt/data-pipeline/update_rents.py") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/data-pipeline/venv/bin/python /opt/data-pipeline/update_listings.py") | crontab -

# Create systemd service for data pipeline monitoring
print_status "Creating systemd service for data pipeline..."
sudo tee /etc/systemd/system/data-pipeline.service > /dev/null << 'EOF'
[Unit]
Description=Data Pipeline Service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/data-pipeline
Environment=PATH=/opt/data-pipeline/venv/bin
ExecStart=/opt/data-pipeline/venv/bin/python -c "
import schedule
import time
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_rents_update():
    subprocess.run(['/opt/data-pipeline/venv/bin/python', '/opt/data-pipeline/update_rents.py'])

def run_listings_update():
    subprocess.run(['/opt/data-pipeline/venv/bin/python', '/opt/data-pipeline/update_listings.py'])

schedule.every().day.at('02:00').do(run_rents_update)
schedule.every().day.at('03:00').do(run_listings_update)

while True:
    schedule.run_pending()
    time.sleep(60)
"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
print_status "Enabling data pipeline service..."
sudo systemctl daemon-reload
sudo systemctl enable data-pipeline
sudo systemctl start data-pipeline

# Create environment file template
print_status "Creating environment file template..."
cat > /opt/data-pipeline/.env.template << 'EOF'
# Database Configuration
DB_HOST=multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=YOUR_DB_PASSWORD_HERE

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
EOF

print_status "Data pipeline setup completed!"
print_warning "Next steps:"
echo "1. Copy your database password to /opt/data-pipeline/.env"
echo "2. Configure API keys for your data sources"
echo "3. Test the pipelines manually:"
echo "   - /opt/data-pipeline/venv/bin/python /opt/data-pipeline/update_rents.py"
echo "   - /opt/data-pipeline/venv/bin/python /opt/data-pipeline/update_listings.py"
echo "4. Check service status: sudo systemctl status data-pipeline"
echo "5. View logs: tail -f /opt/data-pipeline/logs/pipeline.log"
