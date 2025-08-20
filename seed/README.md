# 🌱 Multi-Analysis Seed Data

This directory contains the seed data architecture for processing raw CSV data into application-ready JSON files.

## 📁 Directory Structure

```
seed/
├── README.md                           # This file
├── mls-loader.js                       # MLS data processor
├── comps-loader.js                     # Comps data processor
├── rent-loader.js                      # Rental data processor
└── data/                               # Raw CSV data
    ├── mls.csv                         # MLS listing data (3.8MB)
    └── comps.csv                       # Comparable sales data (8.0MB)
```

## 🔄 Data Processing Flow

### **Current Flow**
```
CSV Files (seed/data/) → Loaders (seed/*.js) → JSON Files (data/)
```

### **Future Flow (API Integration)**
```
API Endpoints → Loaders (seed/*.js) → JSON Files (data/)
```

## 📋 Loader Scripts

### **MLS Data Processor**
- **File**: `mls-loader.js`
- **Input**: `seed/data/mls.csv`
- **Output**: `data/listings.json`
- **Purpose**: Process MLS listing data into application format

**Key Features**:
- Normalizes field names and data types
- Processes unit mix from bedroom counts
- Validates required fields
- Generates consistent JSON structure

### **Comps Data Processor**
- **File**: `comps-loader.js`
- **Input**: `seed/data/comps.csv`
- **Output**: `data/comps.json`
- **Purpose**: Process comparable sales data for market analysis

**Key Features**:
- Processes sales history and market data
- Calculates price per square foot
- Handles multiple date formats
- Filters invalid records

### **Rental Data Processor**
- **File**: `rent-loader.js`
- **Input**: Various rental data sources
- **Output**: `data/rents.json`
- **Purpose**: Process rental market data

## 🏗️ Architecture Design

### **Modular Design**
Each loader is independent and follows consistent patterns:
- **Input validation**: Check for required files
- **Data transformation**: Normalize and validate data
- **Error handling**: Clear error messages
- **Output generation**: Consistent JSON structure

### **API Integration Ready**
The loaders are designed for easy API integration:
- **Service abstraction**: Can replace CSV with API calls
- **Same output format**: Maintains JSON structure
- **Error handling**: Consistent error patterns
- **Configuration**: Easy to switch data sources

## 📊 Data Transformation

### **MLS Data Processing**
```javascript
// Input: CSV with various field names
{
  "LIST NO": "12345",
  "LIST OR SALE PRICE": "$500,000",
  "BEDRMS_1_MF": "2",
  "BEDRMS_2_MF": "1"
}

// Output: Normalized JSON
{
  "LIST_NO": "12345",
  "LIST_PRICE": 500000,
  "UNIT_MIX": [
    { "bedrooms": 1, "count": 2 },
    { "bedrooms": 2, "count": 1 }
  ]
}
```

### **Comps Data Processing**
```javascript
// Input: CSV with sales data
{
  "SALE_PRICE": "$450,000",
  "SETTLED_DATE": "2024-01-15",
  "SQUARE_FEET": "2000"
}

// Output: Processed JSON
{
  "SALE_PRICE": 450000,
  "SALE_DATE": "2024-01-15",
  "PRICE_PER_SQFT": 225
}
```

## 🚀 API Integration Strategy

### **Data Service Abstraction**
```javascript
// Current implementation (CSV-based)
const raw = fs.readFileSync(csvPath, 'utf8');
const rows = parse(raw, { columns: true });

// Future implementation (API-based)
const dataService = new APIDataService();
const rows = await dataService.getListings();
```

### **Migration Steps**
1. **Create data service interface**
2. **Implement API service class**
3. **Update loaders to use service**
4. **Add configuration for data source**
5. **Maintain backward compatibility**

### **Configuration Example**
```javascript
// config.js
const DATA_SOURCE = process.env.DATA_SOURCE || 'csv';

const dataService = DATA_SOURCE === 'api' 
  ? new APIDataService() 
  : new CSVDataService();
```

## 📝 Usage

### **Running Loaders**
```bash
# Process MLS data
node seed/mls-loader.js

# Process comps data
node seed/comps-loader.js

# Process rental data
node seed/rent-loader.js
```

### **VS Code Tasks**
The project includes VS Code tasks for easy data processing:
- **Seed MLS**: Process MLS data
- **Seed Rents**: Process rental data

### **Error Handling**
```bash
# Missing CSV file
❌ Place your MLS CSV at seed/data/mls.csv

# Successful processing
✅ Wrote 25835 listings to data/listings.json
```

## 🔧 Data Validation

### **Required Fields**
- **MLS Data**: LIST_NO, ADDRESS, LIST_PRICE
- **Comps Data**: LIST_NO, ADDRESS, SALE_PRICE
- **Rental Data**: ZIP_CODE, rental rates

### **Data Quality Checks**
- **Type validation**: Numbers for prices, dates for timestamps
- **Range validation**: Reasonable values for prices, dates
- **Consistency checks**: Cross-field validation
- **Completeness**: Required field presence

## 📊 Performance

### **Processing Statistics**
- **MLS Data**: ~25,000 records, ~515KB output
- **Comps Data**: ~4.2MB output
- **Processing Time**: <30 seconds for full dataset

### **Optimization**
- **Streaming**: Process large files efficiently
- **Validation**: Early filtering of invalid records
- **Memory**: Efficient data structures
- **Caching**: Avoid reprocessing unchanged data

## 🔄 Data Updates

### **Current Process**
1. **Update CSV files** in `seed/data/`
2. **Run loader scripts** to regenerate JSON
3. **Application loads** new data on restart

### **Future Process**
1. **API data updates** automatically
2. **Scheduled processing** via cron jobs
3. **Incremental updates** for efficiency
4. **Real-time updates** for critical data

## 🧪 Testing

### **Loader Testing**
```bash
# Test MLS loader
node seed/mls-loader.js

# Test comps loader
node seed/comps-loader.js

# Validate output
node -e "console.log(JSON.parse(require('fs').readFileSync('data/listings.json')).count)"
```

### **Data Validation**
```bash
# Check file sizes
ls -lh data/*.json

# Validate JSON syntax
jq . data/listings.json > /dev/null

# Check record counts
jq '.count' data/*.json
```

## 🔍 Troubleshooting

### **Common Issues**
1. **Missing CSV files**: Check `seed/data/` directory
2. **Invalid CSV format**: Validate CSV structure
3. **Memory issues**: Process large files in chunks
4. **Permission errors**: Check file permissions

### **Debug Commands**
```bash
# Check CSV file existence
ls -la seed/data/*.csv

# Validate CSV format
head -5 seed/data/mls.csv

# Check loader output
tail -10 data/listings.json
```

## 📚 Related Documentation

- **[Data Directory](../data/README.md)** - Processed data files
- **[API Integration Plan](../docs/API_INTEGRATION_PLAN.md)** - Future API integration
- **[Data Schema](../docs/DATA_SCHEMA.md)** - Data structure documentation

---

**Note**: This seed data architecture is designed for easy migration from CSV to API sources while maintaining data quality and processing efficiency.
