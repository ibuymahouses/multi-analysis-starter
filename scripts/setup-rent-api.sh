#!/bin/bash

# Rent Data API Setup Script
# This script sets up the rent data API integration on your EC2 instance

set -e

echo "🏠 Setting up Rent Data API Integration..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if running on EC2
if [ ! -f /sys/hypervisor/uuid ]; then
    echo "❌ This script should be run on the EC2 instance"
    exit 1
fi

# Create rent API directory
print_status "Creating rent API directory..."
sudo mkdir -p /opt/rent-api
sudo chown $USER:$USER /opt/rent-api

# Create Python virtual environment
print_status "Setting up Python environment..."
cd /opt/rent-api
python3 -m venv venv
source venv/bin/activate

# Install required packages
print_status "Installing Python packages..."
pip install requests psycopg2-binary python-dotenv

# Create rent API configuration
print_status "Creating rent API configuration..."
cat > /opt/rent-api/config.py << 'EOF'
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'multi_analysis'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

# Rent API configuration
RENT_API_CONFIG = {
    'api_url': os.getenv('RENT_API_URL'),
    'api_key': os.getenv('RENT_API_KEY'),
    'headers': {
        'Authorization': f'Bearer {os.getenv("RENT_API_KEY")}',
        'Content-Type': 'application/json',
        'User-Agent': 'Multi-Analysis-Rent-API/1.0'
    }
}

# Logging configuration
LOG_CONFIG = {
    'level': 'INFO',
    'file': '/opt/rent-api/logs/rent_api.log'
}
EOF

# Create the main rent API script
print_status "Creating rent API script..."
cat > /opt/rent-api/fetch_rents.py << 'EOF'
#!/usr/bin/env python3
"""
Rent Data API Integration
Fetches rent data from external API and stores in database
"""

import sys
import os
import logging
import requests
import json
import psycopg2
from datetime import datetime
from config import DB_CONFIG, RENT_API_CONFIG, LOG_CONFIG

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

def fetch_rent_data():
    """Fetch rent data from external API"""
    try:
        if not RENT_API_CONFIG['api_url'] or not RENT_API_CONFIG['api_key']:
            logger.warning("Rent API URL or key not configured")
            return None
        
        logger.info(f"Fetching rent data from: {RENT_API_CONFIG['api_url']}")
        
        # Make API request
        response = requests.get(
            RENT_API_CONFIG['api_url'],
            headers=RENT_API_CONFIG['headers'],
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Successfully fetched rent data: {len(data.get('rents', []))} records")
            return data
        else:
            logger.error(f"API request failed: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching rent data: {e}")
        return None

def transform_rent_data(api_data):
    """Transform API data to our database format"""
    try:
        transformed_data = []
        
        # This is a template - adjust based on your actual API response format
        for item in api_data.get('rents', []):
            transformed_item = {
                'zip': item.get('zip_code') or item.get('zip'),
                'town': item.get('town') or item.get('city'),
                'county': item.get('county'),
                'rents': {
                    '0': item.get('studio_rent') or item.get('rent_0'),
                    '1': item.get('one_br_rent') or item.get('rent_1'),
                    '2': item.get('two_br_rent') or item.get('rent_2'),
                    '3': item.get('three_br_rent') or item.get('rent_3'),
                    '4': item.get('four_br_rent') or item.get('rent_4'),
                    '5': item.get('five_br_rent') or item.get('rent_5'),
                    '6': item.get('six_br_rent') or item.get('rent_6')
                }
            }
            transformed_data.append(transformed_item)
        
        logger.info(f"Transformed {len(transformed_data)} rent records")
        return transformed_data
        
    except Exception as e:
        logger.error(f"Error transforming rent data: {e}")
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
                source VARCHAR(50) DEFAULT 'external_api',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(zip_code, source)
            )
        """)
        
        if rent_data:
            for rent_record in rent_data:
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
    logger.info("Starting rent data API fetch")
    
    try:
        # Connect to database
        conn = connect_db()
        
        # Fetch rent data from API
        api_data = fetch_rent_data()
        
        if api_data:
            # Transform the data
            transformed_data = transform_rent_data(api_data)
            
            if transformed_data:
                # Update database
                update_rents_table(conn, transformed_data)
                logger.info("Rent data API fetch completed successfully")
            else:
                logger.error("Failed to transform rent data")
        else:
            logger.warning("No rent data fetched from API")
        
    except Exception as e:
        logger.error(f"Rent data API fetch failed: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
EOF

# Create logs directory
print_status "Creating logs directory..."
mkdir -p /opt/rent-api/logs

# Make script executable
chmod +x /opt/rent-api/fetch_rents.py

# Create environment file template
print_status "Creating environment file template..."
cat > /opt/rent-api/.env.template << 'EOF'
# Database Configuration
DB_HOST=multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=YOUR_DB_PASSWORD_HERE

# Rent API Configuration
RENT_API_URL=https://api.rent-provider.com/v1/rents
RENT_API_KEY=YOUR_RENT_API_KEY_HERE
EOF

# Create systemd service
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/rent-api.service > /dev/null << 'EOF'
[Unit]
Description=Rent Data API Service
After=network.target

[Service]
Type=oneshot
User=ec2-user
WorkingDirectory=/opt/rent-api
Environment=PATH=/opt/rent-api/venv/bin
ExecStart=/opt/rent-api/venv/bin/python /opt/rent-api/fetch_rents.py
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create timer for scheduled runs
print_status "Creating scheduled timer..."
sudo tee /etc/systemd/system/rent-api.timer > /dev/null << 'EOF'
[Unit]
Description=Run Rent API fetch daily
Requires=rent-api.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
print_status "Enabling rent API timer..."
sudo systemctl daemon-reload
sudo systemctl enable rent-api.timer
sudo systemctl start rent-api.timer

print_status "Rent API setup completed!"
print_warning "Next steps:"
echo "1. Copy your database password to /opt/rent-api/.env"
echo "2. Add your rent API URL and key to /opt/rent-api/.env"
echo "3. Test the API: cd /opt/rent-api && source venv/bin/activate && python fetch_rents.py"
echo "4. Check timer status: sudo systemctl status rent-api.timer"
echo "5. View logs: tail -f /opt/rent-api/logs/rent_api.log"
echo ""
echo "The rent API will automatically run daily at midnight"
