# Unlisted Property Analysis - System Design

## Overview

The unlisted property analysis feature is designed as a subset of the existing MLS property analysis system, leveraging the same data sources, calculations, and assumptions while being extensible for future data integrations.

## Current Data Interconnectedness

### 1. BHA Rental Data Integration
- **Source**: `api/src/index.js` - `loadRentsComprehensive()` function
- **Format**: ZIP code → rent lookup map with bedroom-specific rents
- **Integration**: Auto-populates market rents when ZIP code is entered
- **Extensibility**: Ready for additional rent data sources (Zillow, RentData, etc.)

### 2. Analysis Engine Integration
- **Source**: `api/src/analysis.js` - `computeAnalysis()` function
- **Shared Logic**: Same OPEX calculations, financing assumptions, and DSCR analysis
- **Consistency**: Ensures unlisted properties use identical financial metrics as MLS listings
- **Extensibility**: Override system allows for custom assumptions

### 3. Override System Integration
- **Source**: Existing property override endpoints (`/property/:list_no/overrides`)
- **Shared State**: Same undo/redo system and override persistence
- **Consistency**: Users can apply the same customizations to unlisted properties

## Future Data Source Extensibility

### 1. Property Tax Auto-Population
```javascript
// Future API endpoint structure
app.get('/property-data/:zip/:address', async (req, res) => {
  // Integration with:
  // - County assessor databases
  // - Property tax APIs (Avalara, etc.)
  // - Public records services
  return {
    taxes: annualPropertyTax,
    assessedValue: currentAssessedValue,
    lastSaleDate: lastSaleDate,
    lastSalePrice: lastSalePrice
  };
});
```

### 2. Unit Count & Bedroom Auto-Population
```javascript
// Future enhancement to property data endpoint
app.get('/property-data/:zip/:address', async (req, res) => {
  // Integration with:
  // - Building permits databases
  // - Zoning records
  // - Property management systems
  return {
    // ... existing tax data
    units: totalUnits,
    bedrooms: totalBedrooms,
    bathrooms: totalBathrooms,
    squareFootage: totalSqFt,
    yearBuilt: constructionYear
  };
});
```

### 3. Enhanced Market Data
```javascript
// Future market data endpoint
app.get('/market-data/:zip', async (req, res) => {
  // Integration with:
  // - MLS comparable sales
  // - Zillow market data
  // - Redfin market insights
  // - Local market reports
  return {
    comparableSales: recentSales,
    marketTrends: priceTrends,
    daysOnMarket: avgDOM,
    pricePerSqFt: avgPricePerSqFt
  };
});
```

## System Architecture

### Frontend Integration
```typescript
// Shared interfaces for consistency
interface PropertyAnalysis {
  monthlyGross: number;
  annualGross: number;
  opex: number;
  noi: number;
  dscr: number;
  capAtAsk: number;
  marketTier: string;
  county: string;
  town: string;
}

// Extensible property data interface
interface PropertyData {
  // Current fields
  ADDRESS: string;
  ZIP_CODE: string;
  TAXES: number;
  
  // Future auto-populated fields
  autoPopulated?: {
    taxes?: number;
    units?: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    yearBuilt?: number;
    lastSaleDate?: string;
    lastSalePrice?: number;
  };
}
```

### Backend Extensibility
```javascript
// Modular data source integration
class PropertyDataService {
  async getTaxData(zip, address) {
    // Integrate with multiple tax data sources
    const sources = [
      new CountyAssessorAPI(),
      new AvalaraTaxAPI(),
      new PublicRecordsAPI()
    ];
    
    for (const source of sources) {
      try {
        const data = await source.getTaxData(zip, address);
        if (data) return data;
      } catch (error) {
        console.warn(`Tax data source failed: ${source.name}`, error);
      }
    }
    return null;
  }
  
  async getPropertyDetails(zip, address) {
    // Similar pattern for property details
  }
}
```

## Data Flow Integration

### 1. ZIP Code Entry
```
User enters ZIP → Check BHA data availability → Auto-populate rents → Show market tier
```

### 2. Address Entry (Future)
```
User enters address → Query property databases → Auto-populate taxes/units → Update analysis
```

### 3. Analysis Execution
```
Property data → computeAnalysis() → Same calculations as MLS → Consistent results
```

## Assumptions Consistency

### Financial Assumptions (Shared with MLS Analysis)
- **DSCR Floor**: 1.20 (same as existing properties)
- **LTV Max**: 80% (same as existing properties)
- **Interest Rate**: 6.5% baseline (same as existing properties)
- **OPEX Percentages**: Same defaults as existing properties
- **Vacancy Rate**: 3% default (same as existing properties)

### Auto-Population Assumptions
- **Rent Data**: Uses BHA SAFMR data (same as MLS properties)
- **Tax Data**: Will use county assessor data when available
- **Unit Data**: Will use building permits/zoning when available

## Extensibility Points

### 1. Data Source Plugins
```javascript
// Plugin architecture for new data sources
class DataSourcePlugin {
  constructor(name, priority) {
    this.name = name;
    this.priority = priority; // Higher priority = tried first
  }
  
  async getData(zip, address) {
    // Implementation specific to data source
  }
}

// Register new data sources
dataSourceRegistry.register(new ZillowDataPlugin(), 1);
dataSourceRegistry.register(new CountyAssessorPlugin(), 2);
dataSourceRegistry.register(new PublicRecordsPlugin(), 3);
```

### 2. Analysis Enhancement
```javascript
// Extend analysis with additional metrics
function computeEnhancedAnalysis(listing, rentLookup, overrides) {
  const baseAnalysis = computeAnalysis(listing, rentLookup, 'avg', overrides);
  
  // Add new metrics
  return {
    ...baseAnalysis,
    // Future enhancements
    pricePerUnit: listing.LIST_PRICE / listing.UNITS_FINAL,
    pricePerBedroom: listing.LIST_PRICE / listing.NO_UNITS_MF,
    rentToValueRatio: (baseAnalysis.annualGross / listing.LIST_PRICE) * 100,
    // ... additional metrics
  };
}
```

### 3. UI Extensibility
```typescript
// Component structure for future enhancements
interface AnalysisSection {
  title: string;
  component: React.ComponentType<AnalysisSectionProps>;
  priority: number;
}

// Register new analysis sections
analysisSectionRegistry.register({
  title: 'Comparable Sales',
  component: ComparableSalesSection,
  priority: 1
});
```

## Integration Benefits

### 1. Data Consistency
- Same rent data sources as MLS properties
- Identical financial calculations and assumptions
- Consistent UI/UX patterns

### 2. User Experience
- Familiar interface for existing users
- Same undo/redo functionality
- Consistent override system

### 3. Maintenance
- Single source of truth for analysis logic
- Shared data loading and caching
- Unified error handling

### 4. Future Development
- Easy to add new data sources
- Modular architecture for enhancements
- Consistent API patterns

## Implementation Status

### ✅ Completed
- Basic unlisted property analysis page
- Integration with existing BHA rental data
- Same analysis engine as MLS properties
- Undo/redo system integration
- Auto-population of market rents by ZIP code

### 🔄 In Progress
- API endpoint for unlisted property analysis
- Landing page integration

### 📋 Future Enhancements
- Property tax auto-population from public records
- Unit count/bedroom auto-population
- Enhanced market data integration
- Additional rent data sources
- Comparable sales analysis
- Market trend integration

## Conclusion

The unlisted property analysis feature is designed as a natural extension of the existing MLS analysis system, ensuring data consistency while providing a foundation for future enhancements. The modular architecture allows for easy integration of new data sources while maintaining the same user experience and analytical rigor as the existing system.
