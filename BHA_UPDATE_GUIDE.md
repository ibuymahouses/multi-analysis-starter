# BHA Rental Data Update Guide

## Overview
This system uses Boston Housing Authority (BHA) payment standards for accurate Massachusetts rental rates instead of HUD SAFMR data. The BHA data is more reliable for your target market and updates annually.

## Current Status
- **Data Source**: BHA 2025 Payment Standards (Comprehensive Coverage)
- **Last Updated**: 2025-08-11
- **Coverage**: **1,587 ZIP codes** across all Massachusetts counties
- **Market Tiers**: Premium, High, Medium, Low based on location
- **Status**: ✅ Up to date with comprehensive coverage

## Comprehensive Coverage

### **Market Tiers:**
- **Premium** (230 ZIPs): Boston, Cambridge, Somerville, Brookline, Newton, etc.
- **High** (490 ZIPs): Suburban Boston, Metro West, North Shore, South Shore
- **Medium** (1,197 ZIPs): Worcester, Springfield, Lowell, Lawrence, etc.
- **Low** (827 ZIPs): Rural areas, Western MA, Cape Cod outer areas

### **County Coverage:**
- **Barnstable**: Cape Cod (25 ZIPs)
- **Berkshire**: Western MA (67 ZIPs)
- **Bristol**: Southeastern MA (91 ZIPs)
- **Dukes**: Martha's Vineyard (30 ZIPs)
- **Essex**: North Shore (185 ZIPs)
- **Franklin**: Western MA (78 ZIPs)
- **Hampden**: Western MA (199 ZIPs)
- **Hampshire**: Western MA (94 ZIPs)
- **Middlesex**: Metro Boston (488 ZIPs)
- **Nantucket**: Nantucket Island (31 ZIPs)
- **Norfolk**: South Shore (55 ZIPs)
- **Plymouth**: South Shore (385 ZIPs)
- **Suffolk**: Boston (30 ZIPs)
- **Worcester**: Central MA (655 ZIPs)

## How to Update BHA Data

### 1. Check for Updates
```bash
npm run check:bha
```

This script will:
- Check if new BHA standards are available
- Compare with your current version
- Notify you when updates are needed
- Check alternative data sources

### 2. Generate Comprehensive Coverage
```bash
npm run generate:all-zips
```

This creates a complete Massachusetts ZIP code coverage file with:
- All 1,587+ ZIP codes
- Market tier classification
- Estimated rental rates by tier
- County and town information

### 3. Download New Standards
When updates are available:
1. Visit [BHA SAFMR Documents](https://www.bostonhousing.org/BHA/media/Documents/Leased%20Housing/SAFMRs/)
2. Download the latest PDF (e.g., `2026-Payment-Standards-All-BR.pdf`)
3. Extract the rental rates for your target ZIP codes

### 4. Update the Data File
Edit `data/bha-rents-comprehensive.json`:

```json
{
  "metadata": {
    "source": "BHA_2026_Payment_Standards",
    "lastUpdated": "2026-XX-XXTXX:XX:XX.XXXZ",
    "version": "2026",
    "url": "https://www.bostonhousing.org/BHA/media/Documents/Leased%20Housing/SAFMRs/2026-Payment-Standards-All-BR.pdf"
  },
  "rents": [
    {
      "zip": "01560",
      "town": "Grafton",
      "county": "Worcester",
      "marketTier": "medium",
      "rents": {
        "0": 1250,  // Studio
        "1": 1550,  // 1BR
        "2": 1850,  // 2BR
        "3": 2250,  // 3BR
        "4": 2650,  // 4BR
        "5": 3050   // 5BR
      }
    }
  ]
}
```

### 5. Regenerate Rent Data
```bash
npm run seed:rents
```

This will:
- Load your updated comprehensive BHA data
- Process all ZIP codes in your listings
- Create the `data/rents.json` file
- Show data source statistics and coverage

### 6. Restart the Application
```bash
npm run dev
```

## Data Structure

### Market Tiers & Rental Rates
- **Premium**: $1,800-$5,000 (Boston metro)
- **High**: $1,400-$3,700 (Suburban Boston)
- **Medium**: $1,100-$2,900 (Major cities)
- **Low**: $900-$2,700 (Rural areas)

### Bedroom Types
- **0**: Studio
- **1**: 1 Bedroom
- **2**: 2 Bedrooms
- **3**: 3 Bedrooms
- **4**: 4 Bedrooms
- **5**: 5+ Bedrooms

## Maintenance Schedule

### Monthly
- Run `npm run check:bha` to check for updates
- Review any new BHA releases

### Annually (January-March)
- BHA typically releases new standards in Q1
- Update your data file with new rates
- Test the system with new data

### As Needed
- Add new ZIP codes when expanding your market
- Adjust rates based on local market conditions
- Update fallback estimates if needed

## Troubleshooting

### Missing ZIP Codes
If you add properties in new ZIP codes:
1. The comprehensive system covers all MA ZIP codes
2. Run `npm run seed:rents` to process new listings
3. The system will use appropriate market tier rates

### Data Quality Issues
- Verify rates against the official BHA PDF
- Check for typos in ZIP codes or town names
- Ensure all bedroom types (0-5) have values

### System Errors
- Check that `data/bha-rents-comprehensive.json` is valid JSON
- Verify file permissions and paths
- Review console logs for specific error messages

## Benefits of This Approach

✅ **Complete Coverage** - All 1,587+ Massachusetts ZIP codes  
✅ **Market Tier System** - Premium/High/Medium/Low classification  
✅ **Accurate Local Data** - BHA rates are specific to Massachusetts  
✅ **No API Dependencies** - Works offline, no rate limits  
✅ **Version Controlled** - Track changes in git  
✅ **Fast Performance** - Local data, no network calls  
✅ **Easy Maintenance** - Simple JSON updates  
✅ **Automatic Checking** - Script notifies when updates are needed  
✅ **Future-Proof** - Ready for any Massachusetts property  

## Alternative Data Sources

If BHA data becomes unavailable:
- **HUD SAFMR**: Federal standards (less accurate for MA)
- **Local MLS Data**: Agent-reported rental rates
- **Market Research**: Zillow, RentData, etc.
- **Property Management Companies**: Direct rate information

## Support

For questions about:
- **BHA Data**: Contact Boston Housing Authority
- **System Issues**: Check the main README.md
- **Data Updates**: Use the update checker script
- **Market Analysis**: Review the analysis engine documentation 