// Data Pipeline Worker for Multi-Analysis Application
// This worker handles data processing, updates, and maintenance tasks

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AWS from 'aws-sdk';

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
    
    console.log('🚀 Data Pipeline Worker initialized');
    console.log(`📁 Data directory: ${this.dataDir}`);
    console.log(`☁️  S3 bucket: ${this.s3Bucket}`);
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting data pipeline worker...');

    try {
      // Run initial data processing
      await this.processData();
      
      // Set up scheduled processing (every 6 hours)
      setInterval(async () => {
        await this.processData();
      }, 6 * 60 * 60 * 1000);

      // Set up health check endpoint
      this.setupHealthCheck();

      console.log('✅ Data pipeline worker started successfully');
    } catch (error) {
      console.error('❌ Failed to start data pipeline worker:', error);
      this.isRunning = false;
    }
  }

  async processData() {
    const startTime = Date.now();
    console.log(`🔄 Starting data processing at ${new Date().toISOString()}`);

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
      console.log(`✅ Data processing completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ Data processing failed:', error);
      await this.sendErrorMetrics(error);
    }
  }

  async downloadDataFromS3() {
    if (!this.s3Bucket) {
      console.log('⚠️  No S3 bucket configured, skipping download');
      return;
    }

    console.log('📥 Downloading data from S3...');
    
    try {
      const dataFiles = [
        'listings.json',
        'bha-rents-comprehensive.json',
        'rents.json',
        'overrides.json'
      ];

      for (const file of dataFiles) {
        try {
          const params = {
            Bucket: this.s3Bucket,
            Key: `data/${file}`
          };

          const data = await s3.getObject(params).promise();
          const filePath = path.join(this.dataDir, file);
          
          // Ensure directory exists
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          
          // Write file
          fs.writeFileSync(filePath, data.Body);
          console.log(`✅ Downloaded ${file}`);
        } catch (error) {
          if (error.code === 'NoSuchKey') {
            console.log(`⚠️  File ${file} not found in S3, skipping`);
          } else {
            console.error(`❌ Failed to download ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to download data from S3:', error);
      throw error;
    }
  }

  async processAndValidateData() {
    console.log('🔍 Processing and validating data...');

    try {
      // Process listings data
      await this.processListingsData();

      // Process rent data
      await this.processRentData();

      // Validate data integrity
      await this.validateDataIntegrity();

      console.log('✅ Data processing and validation completed');
    } catch (error) {
      console.error('❌ Data processing failed:', error);
      throw error;
    }
  }

  async processListingsData() {
    const listingsPath = path.join(this.dataDir, 'listings.json');
    
    if (!fs.existsSync(listingsPath)) {
      console.log('⚠️  No listings data found');
      return;
    }

    try {
      const listingsData = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
      
      // Process and clean listings data
      const processedListings = listingsData.listings?.map(listing => ({
        ...listing,
        lastUpdated: new Date().toISOString(),
        processed: true
      })) || [];

      // Save processed data
      const processedData = {
        ...listingsData,
        listings: processedListings,
        metadata: {
          ...listingsData.metadata,
          lastProcessed: new Date().toISOString(),
          totalListings: processedListings.length
        }
      };

      fs.writeFileSync(listingsPath, JSON.stringify(processedData, null, 2));
      console.log(`✅ Processed ${processedListings.length} listings`);
    } catch (error) {
      console.error('❌ Failed to process listings data:', error);
      throw error;
    }
  }

  async processRentData() {
    const rentsPath = path.join(this.dataDir, 'bha-rents-comprehensive.json');
    
    if (!fs.existsSync(rentsPath)) {
      console.log('⚠️  No rent data found');
      return;
    }

    try {
      const rentData = JSON.parse(fs.readFileSync(rentsPath, 'utf8'));
      
      // Process rent data
      const processedRents = rentData.rents?.map(rent => ({
        ...rent,
        lastUpdated: new Date().toISOString(),
        processed: true
      })) || [];

      // Update metadata
      const processedData = {
        ...rentData,
        rents: processedRents,
        metadata: {
          ...rentData.metadata,
          lastProcessed: new Date().toISOString(),
          totalZips: processedRents.length,
          version: (rentData.metadata?.version || 0) + 1
        }
      };

      fs.writeFileSync(rentsPath, JSON.stringify(processedData, null, 2));
      console.log(`✅ Processed ${processedRents.length} rent records`);
    } catch (error) {
      console.error('❌ Failed to process rent data:', error);
      throw error;
    }
  }

  async validateDataIntegrity() {
    console.log('🔍 Validating data integrity...');

    try {
      // Check if required files exist
      const requiredFiles = ['listings.json', 'bha-rents-comprehensive.json'];
      
      for (const file of requiredFiles) {
        const filePath = path.join(this.dataDir, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required file missing: ${file}`);
        }

        // Validate JSON structure
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!data || typeof data !== 'object') {
          throw new Error(`Invalid JSON structure in ${file}`);
        }
      }

      console.log('✅ Data integrity validation passed');
    } catch (error) {
      console.error('❌ Data integrity validation failed:', error);
      throw error;
    }
  }

  async updateLocalData() {
    console.log('📝 Updating local data files...');

    try {
      // Create data directory if it doesn't exist
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Update data timestamps
      const files = fs.readdirSync(this.dataDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Add processing metadata
          const updatedData = {
            ...data,
            _metadata: {
              ...data._metadata,
              lastProcessed: new Date().toISOString(),
              processedBy: 'data-pipeline-worker'
            }
          };

          fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
        }
      }

      console.log('✅ Local data files updated');
    } catch (error) {
      console.error('❌ Failed to update local data:', error);
      throw error;
    }
  }

  async uploadDataToS3() {
    if (!this.s3Bucket) {
      console.log('⚠️  No S3 bucket configured, skipping upload');
      return;
    }

    console.log('📤 Uploading processed data to S3...');

    try {
      const files = fs.readdirSync(this.dataDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataDir, file);
          const fileContent = fs.readFileSync(filePath);

          const params = {
            Bucket: this.s3Bucket,
            Key: `data/${file}`,
            Body: fileContent,
            ContentType: 'application/json'
          };

          await s3.putObject(params).promise();
          console.log(`✅ Uploaded ${file} to S3`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to upload data to S3:', error);
      throw error;
    }
  }

  async generateReports() {
    console.log('📊 Generating data reports...');

    try {
      const reports = {
        timestamp: new Date().toISOString(),
        dataFiles: {},
        summary: {
          totalListings: 0,
          totalRentRecords: 0,
          lastProcessed: new Date().toISOString()
        }
      };

      // Generate reports for each data file
      const files = fs.readdirSync(this.dataDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          reports.dataFiles[file] = {
            size: fs.statSync(filePath).size,
            records: this.countRecords(data),
            lastModified: fs.statSync(filePath).mtime.toISOString()
          };

          // Update summary
          if (file === 'listings.json') {
            reports.summary.totalListings = data.listings?.length || 0;
          } else if (file === 'bha-rents-comprehensive.json') {
            reports.summary.totalRentRecords = data.rents?.length || 0;
          }
        }
      }

      // Save report
      const reportPath = path.join(this.dataDir, 'processing-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2));

      // Upload report to S3
      if (this.s3Bucket) {
        const reportContent = fs.readFileSync(reportPath);
        await s3.putObject({
          Bucket: this.s3Bucket,
          Key: 'reports/processing-report.json',
          Body: reportContent,
          ContentType: 'application/json'
        }).promise();
      }

      console.log('✅ Data reports generated');
    } catch (error) {
      console.error('❌ Failed to generate reports:', error);
      throw error;
    }
  }

  countRecords(data) {
    if (Array.isArray(data)) {
      return data.length;
    } else if (data.listings) {
      return data.listings.length;
    } else if (data.rents) {
      return data.rents.length;
    } else if (data.map) {
      return data.map.size;
    }
    return 0;
  }

  async sendMetrics(startTime) {
    if (!process.env.AWS_REGION) {
      return;
    }

    try {
      const duration = Date.now() - startTime;
      
      await cloudwatch.putMetricData({
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
      }).promise();

      console.log('📊 Metrics sent to CloudWatch');
    } catch (error) {
      console.error('❌ Failed to send metrics:', error);
    }
  }

  async sendErrorMetrics(error) {
    if (!process.env.AWS_REGION) {
      return;
    }

    try {
      await cloudwatch.putMetricData({
        Namespace: 'MultiAnalysis/DataPipeline',
        MetricData: [
          {
            MetricName: 'ProcessingErrors',
            Value: 1,
            Unit: 'Count',
            Timestamp: new Date()
          }
        ]
      }).promise();
    } catch (metricError) {
      console.error('❌ Failed to send error metrics:', metricError);
    }
  }

  setupHealthCheck() {
    // Simple health check endpoint
    const http = require('http');
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          worker: 'data-pipeline',
          isRunning: this.isRunning,
          lastRun: this.lastRun,
          uptime: process.uptime()
        }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    const port = process.env.WORKER_PORT || 3001;
    server.listen(port, () => {
      console.log(`🏥 Health check endpoint available on port ${port}`);
    });
  }

  stop() {
    console.log('🛑 Stopping data pipeline worker...');
    this.isRunning = false;
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  worker.stop();
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  worker.stop();
});

// Start the worker
const worker = new DataPipelineWorker();
worker.start().catch(error => {
  console.error('❌ Failed to start worker:', error);
  process.exit(1);
}); 