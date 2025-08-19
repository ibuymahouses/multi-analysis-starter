# BHA Rent Data Integration Setup Guide

## 🏠 **Correct BHA Rent Data Sources**

I found the **actual BHA rent data sources**! Here's what you need to know:

### **📊 Available BHA Rent Data Sources**

**1. BHA Payment Standards (Primary Source)**
- **URL**: `https://www.bostonhousing.org/en/Section-8-Leased-Housing/Finding-An-Apartment/Payment-Standards.aspx`
- **Data Type**: PDF files with rent data by ZIP code and bedroom size
- **Update Frequency**: Annual (effective July 1st each year)
- **Latest Data**: 2025 Payment Standards (effective 07/1/2025)
- **No API Key Required** - Public data

**2. BHA Rent Estimator Tool**
- **URL**: `https://boston.maxrent.org`
- **Data Type**: Interactive tool for rent affordability calculations
- **Purpose**: Helps tenants determine if they can afford specific apartments
- **No API Key Required** - Public tool

**3. HUD Fair Market Rents (Reference)**
- **URL**: `https://www.huduser.gov/portal/datasets/fmr.html`
- **Data Type**: Federal rent standards that BHA Payment Standards are based on
- **Update Frequency**: Annual
- **No API Key Required** - Public data

### **📋 Available Payment Standards Files**

From the BHA website, you can access:

**Current (2025) Payment Standards:**
- All Bedroom Sizes: `2025-Payment-Standards-All-BR.pdf`
- Studio: `2025-Payment-Standards-Studio.pdf`
- 1 Bedroom: `2025-Payment-Standards-1-BR.pdf`
- 2 Bedroom: `2025-Payment-Standards-2-BR.pdf`
- 3 Bedroom: `2025-Payment-Standards-3-BR.pdf`
- 4 Bedroom: `2025-Payment-Standards-4-BR.pdf`
- 5 Bedroom: `2025-Payment-Standards-5-BR.pdf`
- 6 Bedroom: `2025-Payment-Standards-6-BR.pdf`

**Historical Data:**
- 2021, 2022, 2023, 2024 Payment Standards (PDF files)

### **🔧 Implementation Steps**

#### **Step 1: Set Up Data Pipeline**

```bash
# Make the script executable
chmod +x scripts/bha-rent-data-integration.py

# Install required dependencies
pip install requests pandas psycopg2-binary sqlalchemy pdfplumber tabula-py
```

#### **Step 2: Configure Environment Variables**

```bash
# Database connection
export DATABASE_URL="postgresql://username:password@localhost:5432/multi_analysis"

# Data directory
export BHA_DATA_DIR="/opt/rent-api/data"
```

#### **Step 3: Run the Data Pipeline**

```bash
# Run the BHA rent data integration
python scripts/bha-rent-data-integration.py
```

### **📊 Data Structure**

The BHA Payment Standards data includes:

| Column | Description | Example |
|--------|-------------|---------|
| `zip_code` | Boston ZIP code | `02108` |
| `town` | City name | `Boston` |
| `county` | County name | `Suffolk` |
| `studio_rent` | Studio apartment rent | `1800` |
| `one_br_rent` | 1-bedroom apartment rent | `2100` |
| `two_br_rent` | 2-bedroom apartment rent | `2500` |
| `three_br_rent` | 3-bedroom apartment rent | `3000` |
| `four_br_rent` | 4-bedroom apartment rent | `3500` |
| `five_br_rent` | 5-bedroom apartment rent | `4000` |
| `six_br_rent` | 6-bedroom apartment rent | `4500` |
| `source` | Data source | `BHA Payment Standards` |
| `updated_at` | Last update timestamp | `2025-01-15T10:30:00` |

### **🔍 PDF Data Extraction**

To extract data from the PDF files, you'll need to implement PDF parsing:

```python
# Example using pdfplumber
import pdfplumber

def extract_rent_data_from_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        # Extract tables from PDF
        tables = []
        for page in pdf.pages:
            tables.extend(page.extract_tables())
        
        # Process tables to extract rent data
        # Implementation depends on PDF structure
        return process_tables(tables)
```

### **🚀 Automated Updates**

Set up a cron job for automated updates:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * /usr/bin/python3 /path/to/scripts/bha-rent-data-integration.py
```

### **📈 API Endpoints**

Once the data is in your database, you can serve it via API:

```javascript
// Example API endpoint
app.get('/api/rents', async (req, res) => {
  const { zipCode, bedrooms } = req.query;
  
  let query = 'SELECT * FROM rents WHERE 1=1';
  if (zipCode) query += ` AND zip_code = '${zipCode}'`;
  if (bedrooms) query += ` AND ${bedrooms}_br_rent IS NOT NULL`;
  
  const rents = await db.query(query);
  res.json({ rents });
});
```

### **🔗 Important Notes**

1. **Payment Standards vs. Actual Rents**: BHA Payment Standards are **not suggested contract rents**. They are maximum amounts BHA will pay for Section 8 vouchers.

2. **Market Analysis**: BHA conducts market analysis to determine actual approved rents.

3. **Data Updates**: Payment Standards are updated annually, effective July 1st.

4. **ZIP Code Coverage**: Data covers all Boston ZIP codes (02108-02137).

5. **Bedroom Sizes**: Data includes studio through 6-bedroom apartments.

### **📞 Contact Information**

For questions about BHA data:
- **BHA Website**: https://www.bostonhousing.org
- **Payment Standards**: https://www.bostonhousing.org/en/Section-8-Leased-Housing/Finding-An-Apartment/Payment-Standards.aspx
- **Rent Estimator**: https://boston.maxrent.org

### **✅ Next Steps**

1. **Deploy the data pipeline** to your EC2 instance
2. **Set up automated PDF parsing** for the Payment Standards files
3. **Configure database storage** for the rent data
4. **Create API endpoints** to serve the data to your frontend
5. **Set up monitoring** for data updates and pipeline health

This setup will give you access to the official BHA rent data that's used for Section 8 housing programs in Boston.
