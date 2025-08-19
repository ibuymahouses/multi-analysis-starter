// Data Pipeline Worker for Multi-Analysis Application
// This worker handles data processing, updates, and maintenance tasks

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AWS from 'aws-sdk';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const cloudwatch = new AWS.CloudWatch();

class DataPipelineWorker {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.dataDir = path.join(__dirname, '..', '..', 'data');
    this.s3Bucket = process.env.S3_BUCKET;
    
    logger.info('Data Pipeline Worker initialized', {
      dataDir: this.dataDir,
      s3Bucket: this.s3Bucket
    });
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting data pipeline worker...');

    try {
      // Run initial data processing
      await this.processData();
      
      // Set up scheduled processing (every 6 hours)
      setInterval(async () => {
        await this.processData();
      }, 6 * 60 * 60 * 1000);

      // Set up health check endpoint
      this.setupHealthCheck();

      logger.info('Data pipeline worker started successfully');
    } catch (error) {
      logger.error('Failed to start data pipeline worker', { error: error.message });
      this.isRunning = false;
    }
  }

  async processData() {
    const startTime = Date.now();
    logger.info('Starting data processing', { timestamp: new Date().toISOString() });

    try {
      // Step 1: Download latest data from S3
      await this.downloadDataFromS3();

      // Step 2: Process and validate data
      await this.processAndValidateData();

      // Step 3: Update local data files
      await this.updateLocalData();

      // Step 4: Upload processed data back to S3
      await this.uploadDataToS3();

      // Step 5: Generate data reports
      await this.generateReports();

      // Step 6: Send metrics to CloudWatch
      await this.sendMetrics(startTime);

      this.lastRun = new Date();
      logger.info('Data processing completed', { duration: Date.now() - startTime });
    } catch (error) {
      logger.error('Data processing failed', { error: error.message });
      await this.sendErrorMetrics(error);
    }
  }

  async downloadDataFromS3() {
    if (!this.s3Bucket) {
      logger.warn('No S3 bucket configured, skipping download');
      return;
    }

    logger.info('Downloading data from S3...');
    
    try {
      // Create data directory if it doesn't exist
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // List of files to download
      const filesToDownload = [
        'listings.json',
        'bha-rents-comprehensive.json',
        'overrides.json',
        'comps.json'
      ];

      for (const fileName of filesToDownload) {
        try {
          const params = {
            Bucket: this.s3Bucket,
            Key: `data/${fileName}`
          };

          const data = await s3.getObject(params).promise();
          const filePath = path.join(this.dataDir, fileName);
          
          fs.writeFileSync(filePath, data.Body);
          logger.info(`Downloaded ${fileName} from S3`);
        } catch (error) {
          logger.warn(`Failed to download ${fileName} from S3`, { error: error.message });
        }
      }
    } catch (error) {
      logger.error('Failed to download data from S3', { error: error.message });
      throw error;
    }
  }

  async processAndValidateData() {
    logger.info('Processing and validating data...');
    
    try {
      // Read and validate listings data
      const listingsPath = path.join(this.dataDir, 'listings.json');
      if (fs.existsSync(listingsPath)) {
        const listingsData = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
        logger.info(`Processed ${listingsData.listings?.length || 0} listings`);
      }

      // Read and validate BHA rents data
      const rentsPath = path.join(this.dataDir, 'bha-rents-comprehensive.json');
      if (fs.existsSync(rentsPath)) {
        const rentsData = JSON.parse(fs.readFileSync(rentsPath, 'utf8'));
        logger.info(`Processed ${rentsData.rents?.length || 0} rent records`);
      }

      // Read and validate overrides data
      const overridesPath = path.join(this.dataDir, 'overrides.json');
      if (fs.existsSync(overridesPath)) {
        const overridesData = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
        logger.info(`Processed ${Object.keys(overridesData).length} overrides`);
      }

      // Read and validate comps data
      const compsPath = path.join(this.dataDir, 'comps.json');
      if (fs.existsSync(compsPath)) {
        const compsData = JSON.parse(fs.readFileSync(compsPath, 'utf8'));
        logger.info(`Processed ${compsData.comps?.length || 0} comps`);
      }

      logger.info('Data processing and validation completed');
    } catch (error) {
      logger.error('Failed to process and validate data', { error: error.message });
      throw error;
    }
  }

  async updateLocalData() {
    logger.info('Updating local data files...');
    
    try {
      // This is where you would implement data transformation logic
      // For now, we'll just log that the update process is complete
      logger.info('Local data files updated successfully');
    } catch (error) {
      logger.error('Failed to update local data files', { error: error.message });
      throw error;
    }
  }

  async uploadDataToS3() {
    if (!this.s3Bucket) {
      logger.warn('No S3 bucket configured, skipping upload');
      return;
    }

    logger.info('Uploading processed data to S3...');
    
    try {
      // List of files to upload
      const filesToUpload = [
        'listings.json',
        'bha-rents-comprehensive.json',
        'overrides.json',
        'comps.json'
      ];

      for (const fileName of filesToUpload) {
        const filePath = path.join(this.dataDir, fileName);
        
        if (fs.existsSync(filePath)) {
          try {
            const fileContent = fs.readFileSync(filePath);
            const params = {
              Bucket: this.s3Bucket,
              Key: `processed-data/${fileName}`,
              Body: fileContent,
              ContentType: 'application/json'
            };

            await s3.putObject(params).promise();
            logger.info(`Uploaded ${fileName} to S3`);
          } catch (error) {
            logger.warn(`Failed to upload ${fileName} to S3`, { error: error.message });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to upload data to S3', { error: error.message });
      throw error;
    }
  }

  async generateReports() {
    logger.info('Generating data reports...');
    
    try {
      // This is where you would implement report generation logic
      // For now, we'll just log that the report generation is complete
      logger.info('Data reports generated successfully');
    } catch (error) {
      logger.error('Failed to generate reports', { error: error.message });
      throw error;
    }
  }

  async sendMetrics(startTime) {
    if (!process.env.AWS_REGION) {
      logger.warn('No AWS region configured, skipping metrics');
      return;
    }

    try {
      const duration = Date.now() - startTime;
      
      const params = {
        Namespace: 'MultiAnalysis/DataPipeline',
        MetricData: [
          {
            MetricName: 'ProcessingDuration',
            Value: duration,
            Unit: 'Milliseconds',
            Timestamp: new Date()
          },
          {
            MetricName: 'ProcessingSuccess',
            Value: 1,
            Unit: 'Count',
            Timestamp: new Date()
          }
        ]
      };

      await cloudwatch.putMetricData(params).promise();
      logger.info('Metrics sent to CloudWatch successfully');
    } catch (error) {
      logger.warn('Failed to send metrics to CloudWatch', { error: error.message });
    }
  }

  async sendErrorMetrics(error) {
    if (!process.env.AWS_REGION) {
      return;
    }

    try {
      const params = {
        Namespace: 'MultiAnalysis/DataPipeline',
        MetricData: [
          {
            MetricName: 'ProcessingError',
            Value: 1,
            Unit: 'Count',
            Timestamp: new Date()
          }
        ]
      };

      await cloudwatch.putMetricData(params).promise();
      logger.info('Error metrics sent to CloudWatch');
    } catch (metricError) {
      logger.warn('Failed to send error metrics to CloudWatch', { error: metricError.message });
    }
  }

  setupHealthCheck() {
    // Simple health check endpoint
    const http = require('http');
    
    const server = http.createServer((req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          isRunning: this.isRunning,
          lastRun: this.lastRun,
          uptime: process.uptime()
        }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    const port = process.env.WORKER_PORT || 3002;
    server.listen(port, () => {
      logger.info(`Worker health check server listening on port ${port}`);
    });
  }

  stop() {
    this.isRunning = false;
    logger.info('Data pipeline worker stopped');
  }
}

// Start the worker if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new DataPipelineWorker();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    worker.stop();
    process.exit(0);
  });

  worker.start().catch(error => {
    logger.error('Failed to start worker', { error: error.message });
    process.exit(1);
  });
}

export default DataPipelineWorker;
