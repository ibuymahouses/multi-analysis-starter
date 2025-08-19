#!/usr/bin/env python3
"""
BHA Data Integration Script
Fetches rent data from Boston Open Data Portal (CKAN API)
"""

import requests
import pandas as pd
import json
import logging
from datetime import datetime
import os
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/bha-data-integration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BHADataIntegration:
    """BHA Data Integration Class"""
    
    def __init__(self):
        self.base_url = "https://data.boston.gov/api/3"
        self.dataset_id = "income-restricted-housing"
        self.data_dir = "/opt/rent-api/data"
        
        # Create data directory if it doesn't exist
        os.makedirs(self.data_dir, exist_ok=True)
    
    def get_dataset_info(self) -> Dict:
        """Get dataset information from CKAN API"""
        try:
            url = f"{self.base_url}/action/package_show"
            params = {"id": self.dataset_id}
            
            logger.info(f"Fetching dataset info from: {url}")
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                logger.info("Successfully retrieved dataset info")
                return data["result"]
            else:
                logger.error("Failed to retrieve dataset info")
                return {}
                
        except Exception as e:
            logger.error(f"Error fetching dataset info: {e}")
            return {}
    
    def get_latest_csv_url(self) -> Optional[str]:
        """Get the URL of the latest CSV file"""
        try:
            dataset_info = self.get_dataset_info()
            if not dataset_info:
                return None
            
            resources = dataset_info.get("resources", [])
            csv_resources = [r for r in resources if r.get("format", "").upper() == "CSV"]
            
            if not csv_resources:
                logger.error("No CSV resources found")
                return None
            
            # Sort by creation date and get the latest
            latest_resource = max(csv_resources, key=lambda x: x.get("created", ""))
            csv_url = latest_resource.get("url")
            
            logger.info(f"Latest CSV URL: {csv_url}")
            return csv_url
            
        except Exception as e:
            logger.error(f"Error getting latest CSV URL: {e}")
            return None
    
    def download_csv_data(self, url: str) -> Optional[pd.DataFrame]:
        """Download and parse CSV data"""
        try:
            logger.info(f"Downloading CSV data from: {url}")
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            
            # Parse CSV data
            df = pd.read_csv(pd.StringIO(response.text))
            logger.info(f"Successfully downloaded {len(df)} records")
            
            return df
            
        except Exception as e:
            logger.error(f"Error downloading CSV data: {e}")
            return None
    
    def transform_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform BHA data to match your database schema"""
        try:
            logger.info("Transforming BHA data...")
            
            # Create a copy to avoid modifying original
            transformed_df = df.copy()
            
            # Add source and timestamp columns
            transformed_df['source'] = 'BHA'
            transformed_df['updated_at'] = datetime.now().isoformat()
            
            # Map BHA columns to your schema (adjust based on actual BHA data structure)
            # This is a placeholder - you'll need to adjust based on actual BHA data columns
            column_mapping = {
                # 'BHA_Column': 'Your_Column'
                # Example mappings (adjust based on actual data):
                # 'zip_code': 'zip_code',
                # 'town': 'town',
                # 'county': 'county',
                # 'studio_rent': 'studio_rent',
                # 'one_br_rent': 'one_br_rent',
                # etc.
            }
            
            # Rename columns if mapping exists
            if column_mapping:
                transformed_df = transformed_df.rename(columns=column_mapping)
            
            logger.info(f"Transformed data shape: {transformed_df.shape}")
            return transformed_df
            
        except Exception as e:
            logger.error(f"Error transforming data: {e}")
            return df
    
    def save_to_database(self, df: pd.DataFrame) -> bool:
        """Save data to PostgreSQL database"""
        try:
            import psycopg2
            from sqlalchemy import create_engine
            
            # Database connection (use environment variables)
            db_url = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/multi_analysis')
            engine = create_engine(db_url)
            
            # Save to database
            table_name = 'rents'
            df.to_sql(table_name, engine, if_exists='append', index=False)
            
            logger.info(f"Successfully saved {len(df)} records to database table '{table_name}'")
            return True
            
        except Exception as e:
            logger.error(f"Error saving to database: {e}")
            return False
    
    def save_to_csv(self, df: pd.DataFrame, filename: str = None) -> str:
        """Save data to CSV file"""
        try:
            if filename is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"bha_rent_data_{timestamp}.csv"
            
            filepath = os.path.join(self.data_dir, filename)
            df.to_csv(filepath, index=False)
            
            logger.info(f"Data saved to: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving to CSV: {e}")
            return ""
    
    def run_full_pipeline(self) -> bool:
        """Run the complete data pipeline"""
        try:
            logger.info("Starting BHA data integration pipeline...")
            
            # Get latest CSV URL
            csv_url = self.get_latest_csv_url()
            if not csv_url:
                logger.error("Could not get CSV URL")
                return False
            
            # Download data
            df = self.download_csv_data(csv_url)
            if df is None:
                logger.error("Could not download data")
                return False
            
            # Transform data
            transformed_df = self.transform_data(df)
            
            # Save to CSV (backup)
            csv_file = self.save_to_csv(transformed_df)
            
            # Save to database
            db_success = self.save_to_database(transformed_df)
            
            if db_success:
                logger.info("BHA data integration pipeline completed successfully")
                return True
            else:
                logger.error("Database save failed")
                return False
                
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            return False

def main():
    """Main function"""
    try:
        # Initialize BHA data integration
        bha_integration = BHADataIntegration()
        
        # Run the pipeline
        success = bha_integration.run_full_pipeline()
        
        if success:
            print("✅ BHA data integration completed successfully")
            exit(0)
        else:
            print("❌ BHA data integration failed")
            exit(1)
            
    except Exception as e:
        logger.error(f"Main function error: {e}")
        print(f"❌ Error: {e}")
        exit(1)

if __name__ == "__main__":
    main()
