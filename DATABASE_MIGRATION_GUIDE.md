# Database Migration Guide

## Overview

This guide explains how to fix the "no data" issue on EC2 by implementing a proper database-backed data system instead of relying on local JSON files.

## The Problem

Your application was designed to read data from local JSON files in the `data/` directory. When deployed to EC2, these files weren't copied over, causing the API to return empty data.

## The Solution

We've implemented a **hybrid data system** that:

1. **Automatically detects** whether to use database or local files
2. **Gracefully falls back** to local files if database is unavailable
3. **Provides migration tools** to populate the database from JSON files
4. **Maintains backward compatibility** with your existing code

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Server    │    │   Data Service  │
│                 │    │                 │    │                 │
│  Next.js App   │◄──►│  Express API    │◄──►│  Database OR    │
│                 │    │                 │    │  Local Files    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  PostgreSQL     │    │  JSON Files     │
                       │  Database       │    │  (Fallback)     │
                       └─────────────────┘    └─────────────────┘
```

## How It Works

### 1. Automatic Data Source Detection

The system automatically detects your environment:

- **Local Development**: Uses local JSON files (fast, simple)
- **EC2 with Database**: Uses PostgreSQL database (scalable, persistent)
- **EC2 without Database**: Falls back to local files (reliable)

### 2. Data Service Layer

The `DataService` class provides a unified interface:

```typescript
// Works the same way regardless of data source
const listings = await dataService.getListings();
const rents = await dataService.getRents();
const overrides = await dataService.getOverrides();
```

### 3. Automatic Fallback

If the database is unavailable, the system automatically falls back to local files:

```typescript
try {
  // Try database first
  return await this.getRentsFromDatabase();
} catch (error) {
  // Fall back to files
  return this.getRentsFromFile();
}
```

## Setup Instructions

### Option 1: Quick Fix (Copy Data Files)

If you just want to get your app working immediately:

```powershell
# Use the simple deployment script
.\scripts\deploy-with-data.ps1 -EC2_IP "your-ec2-ip"
```

This copies your data files to EC2, but doesn't solve the root problem.

### Option 2: Proper Database Solution (Recommended)

This implements the full database-backed system:

#### Step 1: Set Environment Variables

Create a `.env` file on your EC2 instance:

```bash
NODE_ENV=production
API_PORT=3001
WEB_PORT=3000
DB_HOST=multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=your_actual_password_here
DB_SSL=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Step 2: Deploy with Database Setup

```powershell
# Use the database deployment script
.\scripts\deploy-with-database.ps1 -EC2_IP "your-ec2-ip" -DB_PASSWORD "your_password"
```

This script will:
- Deploy your application
- Set up database connection
- Automatically migrate all data from JSON files to database
- Validate the migration
- Start the application with database-backed data

#### Step 3: Verify Migration

Check that your data was migrated successfully:

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check the migration status
curl http://localhost:3001/admin/validate-data

# Check the health endpoint
curl http://localhost:3001/health
```

## API Endpoints

### New Admin Endpoints

- **`POST /admin/migrate-data`**: Migrate all data from files to database
- **`GET /admin/validate-data`**: Validate that migration was successful

### Enhanced Health Endpoint

The health endpoint now shows data source information:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dataSource": {
    "useDatabase": true,
    "databaseConnected": true
  },
  "dataStats": {
    "rents": 3982,
    "listings": 25835,
    "comps": 1500,
    "overrides": 161,
    "dataSource": "database"
  }
}
```

## Data Migration Process

### What Gets Migrated

1. **Rent Data**: BHA comprehensive rent data (3,982 records)
2. **Listings**: MLS property listings (25,835 records)
3. **Comps**: Comparable properties (1,500+ records)
4. **Overrides**: User-defined property overrides (161 records)

### Migration Steps

1. **Schema Creation**: Creates database tables if they don't exist
2. **Data Import**: Reads JSON files and inserts into database
3. **Conflict Resolution**: Updates existing records, adds new ones
4. **Validation**: Ensures record counts match between files and database
5. **Fallback**: If migration fails, continues using local files

### Migration Logs

The migration process provides detailed logging:

```
🚀 Starting full data migration from files to database...
🔧 Ensuring database schema is up to date...
✅ Database schema verified
📊 Migrating rent data...
✅ Rent migration completed: 3982 added, 0 updated
🏠 Migrating listing data...
✅ Listing migration completed: 25835 added, 0 updated
📈 Migrating comps data...
✅ Comps migration completed: 1500 added, 0 updated
⚙️ Migrating overrides data...
✅ Overrides migration completed: 161 added, 0 updated
✅ Full data migration completed in 15420ms
```

## Benefits of This Approach

### 1. **Reliability**
- No more "no data" issues on EC2
- Automatic fallback to local files if database fails
- Data persistence across deployments

### 2. **Scalability**
- Database can handle much larger datasets
- Efficient queries with proper indexing
- Support for real-time data updates

### 3. **Maintainability**
- Single source of truth for data
- Easy to add new data sources
- Automated data synchronization

### 4. **Performance**
- Database queries are faster than file I/O
- Proper indexing for complex queries
- Connection pooling for multiple requests

## Troubleshooting

### Database Connection Issues

If the database connection fails:

1. **Check credentials**: Verify `DB_PASSWORD` is correct
2. **Check network**: Ensure EC2 security groups allow database access
3. **Check SSL**: Verify `DB_SSL=true` if using RDS

### Migration Failures

If data migration fails:

1. **Check logs**: Look at the API server logs
2. **Verify schema**: Ensure database tables exist
3. **Check permissions**: Verify database user has CREATE/INSERT permissions

### Fallback to Files

The system will automatically fall back to local files if:
- Database is not configured
- Database connection fails
- Migration fails

## Future Enhancements

### 1. **Automated Data Updates**
- Cron jobs to sync new data
- Webhook support for real-time updates
- Data versioning and rollback

### 2. **Additional Data Sources**
- MLS API integration
- BHA API integration
- External rent data APIs

### 3. **Data Analytics**
- Query performance monitoring
- Data usage analytics
- Automated reporting

## Conclusion

This solution provides a **robust, scalable foundation** for your data needs while maintaining **backward compatibility** with your existing code. The hybrid approach ensures your application works reliably in any environment, and the database backend gives you room to grow and add new features.

The key benefits are:
- ✅ **Immediate fix** for your "no data" issue
- ✅ **Long-term solution** that scales with your needs
- ✅ **Zero downtime** during deployment
- ✅ **Automatic fallback** if anything goes wrong
- ✅ **Easy to maintain** and extend

Choose **Option 2 (Database Solution)** for the best long-term results, or use **Option 1 (Quick Fix)** if you need immediate relief and can implement the full solution later.
