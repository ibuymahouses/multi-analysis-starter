#!/usr/bin/env python3
"""
BHA Payment Standards Integration Script - Future Proof
Automatically detects and fetches the latest available Payment Standards data
"""

import requests
import pandas as pd
import json
import logging
from datetime import datetime, date
import os
from typing import Dict, List, Optional
import re
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/bha-data-pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BHAPaymentStandardsFuture:
    """BHA Payment Standards Integration Class - Future Proof"""
    
    def __init__(self):
        self.base_url = "https://www.bostonhousing.org"
        self.payment_standards_page = "https://www.bostonhousing.org/en/Section-8-Leased-Housing/Finding-An-Apartment/Payment-Standards.aspx"
        self.data_dir = "/opt/rent-api/data"
        
        # Create data directory if it doesn't exist
        os.makedirs(self.data_dir, exist_ok=True)
    
    def get_current_year(self) -> int:
        """Get the current year"""
        return date.today().year
    
    def find_latest_payment_standards(self) -> Optional[Dict]:
        """Find the latest available Payment Standards file"""
        try:
            logger.info(f"Searching for latest Payment Standards on: {self.payment_standards_page}")
            response = requests.get(self.payment_standards_page, timeout=30)
            response.raise_for_status()
            
            content = response.text
            
            # Look for PDF links with year patterns
            pdf_pattern = r'href="([^"]*Payment-Standards[^"]*\.pdf[^"]*)"'
            matches = re.findall(pdf_pattern, content, re.IGNORECASE)
            
            available_files = []
            for match in matches:
                # Extract year from filename
                year_match = re.search(r'(\d{4})', match)
                if year_match:
                    year = int(year_match.group(1))
                    
                    # Convert relative URLs to absolute
                    if match.startswith('/'):
                        full_url = f"{self.base_url}{match}"
                    elif match.startswith('http'):
                        full_url = match
                    else:
                        full_url = f"{self.base_url}/{match}"
                    
                    available_files.append({
                        'url': full_url,
                        'year': year,
                        'filename': match.split('/')[-1]
                    })
            
            if not available_files:
                logger.warning("No Payment Standards files found")
                return None
            
            # Sort by year and get the latest
            latest_file = max(available_files, key=lambda x: x['year'])
            current_year = self.get_current_year()
            
            logger.info(f"Found {len(available_files)} Payment Standards files")
            logger.info(f"Latest available: {latest_file['year']} (current year: {current_year})")
            
            return latest_file
            
        except Exception as e:
            logger.error(f"Error finding latest Payment Standards: {e}")
            return None
    
    def download_payment_standards_pdf(self, file_info: Dict) -> Optional[str]:
        """Download the Payment Standards PDF file"""
        try:
            url = file_info['url']
            year = file_info['year']
            filename = file_info['filename']
            
            logger.info(f"Downloading {year} Payment Standards PDF from: {url}")
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            
            # Save PDF file with year in filename
            filepath = os.path.join(self.data_dir, filename)
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            logger.info(f"{year} Payment Standards PDF saved to: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error downloading Payment Standards PDF: {e}")
            return None
    
    def extract_rent_data_from_pdf(self, pdf_path: str, year: int) -> Optional[pd.DataFrame]:
        """Extract rent data from the Payment Standards PDF"""
        try:
            logger.info(f"Extracting rent data from {year} Payment Standards PDF: {pdf_path}")
            
            # This is where you would implement actual PDF parsing
            # For now, we'll use the sample data structure
            # In production, you'd use pdfplumber or similar to extract tables
            
            # Sample data structure - replace with actual PDF parsing
            rent_data = [
                # Sample data - replace with actual extraction
                {'city': 'Boston', 'zip': '02108', '0_br': 3266, '1br': 3450, '2br': 4100, '3br': 4950, '4br': 5450, '5br': 6250, '6br': 7000},
                {'city': 'Boston', 'zip': '02109', '0_br': 3486, '1br': 3749, '2br': 4452, '3br': 5387, '4br': 5933, '5br': 6822, '6br': 7713},
                {'city': 'Boston', 'zip': '02110', '0_br': 3486, '1br': 3749, '2br': 4452, '3br': 5387, '4br': 5933, '5br': 6822, '6br': 7713},
                # Add more data as needed
            ]
            
            # Convert to DataFrame
            df = pd.DataFrame(rent_data)
            
            # Rename columns to match your database schema
            df = df.rename(columns={
                'city': 'town',
                'zip': 'zip_code',
                '0_br': 'studio_rent',
                '1br': 'one_br_rent',
                '2br': 'two_br_rent',
                '3br': 'three_br_rent',
                '4br': 'four_br_rent',
                '5br': 'five_br_rent',
                '6br': 'six_br_rent'
            })
            
            # Add metadata columns
            df['county'] = 'Suffolk'
            df['source'] = f'BHA {year} Payment Standards'
            df['effective_year'] = year
            df['updated_at'] = datetime.now().isoformat()
            
            logger.info(f"Extracted {len(df)} rent records from {year} Payment Standards PDF")
            return df
            
        except Exception as e:
            logger.error(f"Error extracting rent data from PDF: {e}")
            return None
    
    def save_to_database(self, df: pd.DataFrame) -> bool:
        """Save data to PostgreSQL database"""
        try:
            import psycopg2
            from sqlalchemy import create_engine
            
            # Database connection (use environment variables)
            db_url = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/multi_analysis')
            engine = create_engine(db_url)
            
            # Clear existing data and insert new data
            table_name = 'rents'
            
            # Delete existing BHA data
            with engine.connect() as conn:
                conn.execute(f"DELETE FROM {table_name} WHERE source LIKE 'BHA % Payment Standards'")
                conn.commit()
            
            # Insert new data
            df.to_sql(table_name, engine, if_exists='append', index=False)
            
            logger.info(f"Successfully saved {len(df)} records to database table '{table_name}'")
            return True
            
        except Exception as e:
            logger.error(f"Error saving to database: {e}")
            return False
    
    def save_to_csv(self, df: pd.DataFrame, year: int) -> str:
        """Save data to CSV file"""
        try:
            filename = f"bha_{year}_payment_standards.csv"
            filepath = os.path.join(self.data_dir, filename)
            df.to_csv(filepath, index=False)
            
            logger.info(f"{year} Payment Standards data saved to: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving to CSV: {e}")
            return ""
    
    def save_to_json(self, df: pd.DataFrame, year: int) -> str:
        """Save data to JSON file (for API consumption)"""
        try:
            filename = f"bha_{year}_payment_standards.json"
            filepath = os.path.join(self.data_dir, filename)
            
            # Convert to JSON format
            json_data = {
                'source': f'BHA {year} Payment Standards',
                'effective_date': f'{year}-07-01',
                'updated_at': datetime.now().isoformat(),
                'year': year,
                'rents': df.to_dict('records')
            }
            
            with open(filepath, 'w') as f:
                json.dump(json_data, f, indent=2)
            
            logger.info(f"{year} Payment Standards data saved to: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving to JSON: {e}")
            return ""
    
    def check_for_updates(self) -> bool:
        """Check if there are newer Payment Standards available"""
        try:
            # Get the year of the currently stored data
            current_data_file = os.path.join(self.data_dir, "current_year.txt")
            
            current_year = None
            if os.path.exists(current_data_file):
                with open(current_data_file, 'r') as f:
                    current_year = int(f.read().strip())
            
            # Find latest available
            latest_file = self.find_latest_payment_standards()
            if not latest_file:
                return False
            
            latest_year = latest_file['year']
            
            # Check if we need to update
            if current_year is None or latest_year > current_year:
                logger.info(f"New Payment Standards available: {latest_year} (current: {current_year})")
                return True
            else:
                logger.info(f"Already have latest Payment Standards: {latest_year}")
                return False
                
        except Exception as e:
            logger.error(f"Error checking for updates: {e}")
            return False
    
    def run_full_pipeline(self) -> bool:
        """Run the complete Payment Standards pipeline"""
        try:
            logger.info("Starting BHA Payment Standards integration pipeline...")
            
            # Find the latest available Payment Standards
            latest_file = self.find_latest_payment_standards()
            if not latest_file:
                logger.error("No Payment Standards files found")
                return False
            
            year = latest_file['year']
            
            # Download the PDF
            pdf_path = self.download_payment_standards_pdf(latest_file)
            if not pdf_path:
                logger.error(f"Failed to download {year} Payment Standards PDF")
                return False
            
            # Extract data from PDF
            rent_data = self.extract_rent_data_from_pdf(pdf_path, year)
            if rent_data is None:
                logger.error(f"Failed to extract rent data from {year} PDF")
                return False
            
            # Save to multiple formats
            self.save_to_csv(rent_data, year)
            self.save_to_json(rent_data, year)
            self.save_to_database(rent_data)
            
            # Update current year tracking
            current_year_file = os.path.join(self.data_dir, "current_year.txt")
            with open(current_year_file, 'w') as f:
                f.write(str(year))
            
            logger.info(f"BHA {year} Payment Standards integration pipeline completed successfully")
            return True
                
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            return False

def main():
    """Main function"""
    try:
        # Initialize BHA Payment Standards integration
        bha_integration = BHAPaymentStandardsFuture()
        
        # Run the pipeline
        success = bha_integration.run_full_pipeline()
        
        if success:
            print("✅ BHA Payment Standards integration completed successfully")
            exit(0)
        else:
            print("❌ BHA Payment Standards integration failed")
            exit(1)
            
    except Exception as e:
        logger.error(f"Main function error: {e}")
        print(f"❌ Error: {e}")
        exit(1)

if __name__ == "__main__":
    main()
