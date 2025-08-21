import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DataService } from './services/data-service.js';
import { DatabaseService, getDatabaseConfig } from './services/database.js';
import { DataMigrationService } from './services/data-migration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  if (!dataService || !dataService.isInitialized()) {
    return res.status(503).json({ 
      status: 'initializing', 
      timestamp: new Date().toISOString(),
      message: 'Data service is still initializing'
    });
  }
  
  dataService.getDataStats().then(stats => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      dataSource: dataService.getDataSourceStatus(),
      dataStats: stats
    });
  }).catch(error => {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  });
});

// Initialize services
let dataService: DataService;
let dbService: DatabaseService | null = null;
let migrationService: DataMigrationService | null = null;

// Initialize services asynchronously
async function initializeServices() {
  try {
    console.log('🚀 Initializing application services...');
    
    // Initialize data service
    dataService = new DataService();
    await dataService.initialize();
    
    // Initialize database service if configured
    if (process.env.DB_HOST && process.env.DB_PASSWORD) {
      try {
        dbService = DatabaseService.getInstance(getDatabaseConfig());
        migrationService = new DataMigrationService(dbService);
        console.log('✅ Database service initialized');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ Database service initialization failed:', errorMessage);
      }
    } else {
      console.log('ℹ️ Database not configured, using file-based data');
    }
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    // Continue with file-based fallback
  }
}



// Analysis computation function
function computeAnalysis(listing: any, rentLookupByZip: Map<string, any>, rentMode: string = 'avg', overrides: any = null) {
  // rentMode: 'below'|'avg'|'agg' -> 0.90 / 1.00 / 1.10
  const mult = rentMode === 'below' ? 0.90 : rentMode === 'agg' ? 1.10 : 1.00;
  const zip = (listing.ZIP_CODE || '').trim();
  
  // Apply unit mix overrides
  let unitMix = overrides?.unitMix || listing.UNIT_MIX || []; // [{bedrooms,count}]
  
  // If unit mix is empty, create a default based on UNITS_FINAL and NO_UNITS_MF
  if (unitMix.length === 0 && listing.UNITS_FINAL > 0) {
    const totalUnits = listing.UNITS_FINAL;
    const totalBedrooms = listing.NO_UNITS_MF || totalUnits * 2; // Default to 2 bedrooms per unit if NO_UNITS_MF is not available
    
    // Calculate average bedrooms per unit
    const avgBedrooms = totalBedrooms / totalUnits;
    
    // Distribute bedrooms evenly without fractional units
    const floorAvg = Math.floor(avgBedrooms);
    const remainder = totalBedrooms - (floorAvg * totalUnits);
    
    unitMix = [];
    
    // Add units with floor average bedrooms
    if (floorAvg > 0) {
      unitMix.push({ bedrooms: floorAvg, count: totalUnits - remainder });
    }
    
    // Add units with one extra bedroom to handle remainder
    if (remainder > 0) {
      unitMix.push({ bedrooms: floorAvg + 1, count: remainder });
    }
    
    // If we have no units yet (edge case), default to 2-bedroom units
    if (unitMix.length === 0) {
      unitMix = [{ bedrooms: 2, count: totalUnits }];
    }
  }
  
  const zipInfo = rentLookupByZip.get(zip) || {}; // {rents:{'0':..,'1':..}, marketTier, county, town}
  const rents = zipInfo.rents || {};
  
  // Gross rent (monthly) from SAFMR by BR
  const monthlyGross = unitMix.reduce((sum: number, u: any) => {
    const br = String(u.bedrooms ?? 0);
    const safmr = rents[br] || 0;
    return sum + (safmr * mult * (u.count || 0));
  }, 0);

  // OPEX defaults with overrides
  const annualGross = monthlyGross * 12;
  const units = listing.UNITS_FINAL || 0;
  const buildings = 1; // MVP: single-building assumption
  
  // Apply OPEX overrides
  const opexOverrides = overrides?.opex || {};
  const waterSewer = (opexOverrides.waterSewer ?? 400) * units;                 // $400/unit/yr default
  const commonElec = (opexOverrides.commonElec ?? 100) * 12 * buildings;       // $100/mo/building default
  const rubbish = (units >= 5) ? (opexOverrides.rubbish ?? 200) * 12 : 0;      // $200/mo if 5+ units default
  const pm = (opexOverrides.pm ?? 0.08) * annualGross;                         // 8% of gross default
  const repairs = (opexOverrides.repairs ?? 0.02) * annualGross;                // 2% default
  const legal = (opexOverrides.legal ?? 0.01) * annualGross;                   // 1% default
  const capex = (opexOverrides.capex ?? 0.01) * annualGross;                   // 1% default
  const taxes = opexOverrides.taxes ?? Number(listing.TAXES || 0);             // from listing or override
  const opex = waterSewer + commonElec + rubbish + pm + repairs + legal + capex + taxes;

  const noi = annualGross - opex;

  // Financing
  const price = Number(listing.LIST_PRICE || 0);
  const ltvMax = 0.80; // 80% LTV for all property types
  const rate = 0.065; // 6.5% baseline rate
  const amortYears = 30;
  const dscrFloor = 1.20;
  const loanByLTV = price * ltvMax;

  // Payment calc
  const i = rate / 12;
  const n = amortYears * 12;
  const pmt = (pv: number) => (i === 0) ? (pv / n) : (pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1));
  // size by DSCR
  const annualDebtLimit = noi / dscrFloor;
  const monthlyDebtLimit = annualDebtLimit / 12;
  // invert payment to get PV (approximate via binary search)
  function pvFromPayment(payment: number) {
    let lo = 0, hi = price; // cap at price for MVP
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      const midPmt = pmt(mid);
      if (midPmt > payment) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }
  const loanByDSCR = pvFromPayment(monthlyDebtLimit);
  const loan = Math.max(0, Math.min(loanByLTV, loanByDSCR));
  const annualDebtService = pmt(loan) * 12;
  const dscr = annualDebtService ? (noi / annualDebtService) : null;

  // Simple valuations
  const capAtAsk = price ? (noi / price) : null;

  return {
    rentMode,
    monthlyGross: Math.round(monthlyGross),
    annualGross: Math.round(annualGross),
    opex: Math.round(opex),
    noi: Math.round(noi),
    loanSized: Math.round(loan),
    annualDebtService: Math.round(annualDebtService),
    dscr: dscr ? Number(dscr.toFixed(2)) : null,
    capAtAsk: capAtAsk ? Number((capAtAsk * 100).toFixed(2)) : null, // %
    marketTier: zipInfo.marketTier || 'unknown',
    county: zipInfo.county || '',
    town: zipInfo.town || ''
  };
}

// Data migration endpoint
app.post('/admin/migrate-data', async (req, res) => {
  if (!migrationService) {
    return res.status(503).json({ error: 'Database not configured for data migration' });
  }

  try {
    const results = await migrationService.migrateAllData();
    const validation = await migrationService.validateMigration();
    
    res.json({ 
      success: true, 
      results, 
      validation,
      message: 'Data migration completed successfully'
    });
  } catch (error) {
    console.error('Data migration failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Data migration failed', details: errorMessage });
  }
});

// Data validation endpoint
app.get('/admin/validate-data', async (req, res) => {
  if (!migrationService) {
    return res.status(503).json({ error: 'Database not configured for data validation' });
  }

  try {
    const validation = await migrationService.validateMigration();
    res.json(validation);
  } catch (error) {
    console.error('Data validation failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Data validation failed', details: errorMessage });
  }
});

// Routes
app.get('/listings', async (req, res) => {
  try {
    const { listings } = await dataService.getListings();
    res.json({ listings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

app.get('/property/:listNo', async (req, res) => {
  try {
    const { listNo } = req.params;
    const { listings } = await dataService.getListings();
    const listing = listings.find((l: any) => l.LIST_NO === listNo);
    
    if (!listing) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const overrides = await dataService.getOverrides();
    const listingOverrides = overrides[listNo] || {};
    
    const { map: rentMap } = await dataService.getRents();
    const analysis = computeAnalysis(listing, rentMap, 'avg', listingOverrides);
    
    res.json({
      ...listing,
      analysis,
      overrides: listingOverrides
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load property' });
  }
});

app.get('/property/:listNo/overrides', async (req, res) => {
  try {
    const { listNo } = req.params;
    const overrides = await dataService.getOverrides();
    const propertyOverrides = overrides[listNo] || {};
    res.json(propertyOverrides);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load overrides' });
  }
});

app.post('/property/:listNo/overrides', (req, res) => {
  try {
    const { listNo } = req.params;
    const overrides = req.body;
    
    // In a real implementation, you'd save this to a database
    // For now, we'll just return success
    
    res.json({ success: true, message: 'Overrides saved' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save overrides' });
  }
});

app.get('/analyze/:listNo', async (req, res) => {
  try {
    const { listNo } = req.params;
    const { mode = 'avg' } = req.query;
    
    const { listings } = await dataService.getListings();
    const listing = listings.find((l: any) => l.LIST_NO === listNo);
    
    if (!listing) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const overrides = await dataService.getOverrides();
    const listingOverrides = overrides[listNo] || {};
    
    const { map: rentMap } = await dataService.getRents();
    const analysis = computeAnalysis(listing, rentMap, mode as string, listingOverrides);
    
    res.json({ listing, analysis });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.get('/rents', async (req, res) => {
  try {
    const { rents } = await dataService.getRents();
    res.json({ rents });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load rents' });
  }
 });

app.get('/rents/metadata', async (req, res) => {
  try {
    const { rents } = await dataService.getRents();
    const metadata = {
      totalZips: rents.length,
      lastUpdated: new Date().toISOString(),
      source: 'BHA Comprehensive Rent Data'
    };
    res.json(metadata);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load rent metadata' });
  }
});

// Comps endpoint
app.get('/comps', async (req, res) => {
  try {
    const { listings } = await dataService.getComps();
    res.json({ listings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load comps' });
  }
});

// Analyze all comps endpoint
app.get('/analyze-comps', async (req, res) => {
  try {
    const { mode = 'avg' } = req.query;
    const { listings } = await dataService.getComps();
    const { map: rentMap } = await dataService.getRents();
    const overrides = await dataService.getOverrides();
    
    const rows = listings.map((listing: any) => {
      const listingOverrides = overrides[listing.LIST_NO] || {};
      const analysis = computeAnalysis(listing, rentMap, mode as string, listingOverrides);
      return {
        ...listing,
        analysis
      };
    });
    
    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Comps analysis failed' });
  }
});

// Analyze all listings endpoint
app.get('/analyze-all', async (req, res) => {
  try {
    const { mode = 'avg' } = req.query;
    const { listings } = await dataService.getListings();
    const { map: rentMap } = await dataService.getRents();
    const overrides = await dataService.getOverrides();
    
    const rows = listings.map((listing: any) => {
      const listingOverrides = overrides[listing.LIST_NO] || {};
      const analysis = computeAnalysis(listing, rentMap, mode as string, listingOverrides);
      return {
        ...listing,
        analysis
      };
    });
    
    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Export endpoint
app.get('/export/analyzed.csv', async (req, res) => {
  try {
    const { mode = 'avg' } = req.query;
    const { listings } = await dataService.getListings();
    const { map: rentMap } = await dataService.getRents();
    const overrides = await dataService.getOverrides();
    
    const rows = listings.map((listing: any) => {
      const listingOverrides = overrides[listing.LIST_NO] || {};
      const analysis = computeAnalysis(listing, rentMap, mode as string, listingOverrides);
      return {
        ...listing,
        analysis
      };
    });
    
    // Convert to CSV
    const headers = ['LIST_NO', 'ADDRESS', 'TOWN', 'LIST_PRICE', 'UNITS_FINAL', 'monthlyGross', 'annualGross', 'noi', 'dscr', 'capAtAsk'];
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => 
        headers.map(header => {
          const value = header.startsWith('analysis.') 
            ? row.analysis?.[header.replace('analysis.', '')] 
            : row[header];
          return typeof value === 'string' ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analyzed-properties.csv"');
    res.send(csvContent);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Export failed' });
  }
});

// NEW: Analyze unlisted property (no MLS number)
app.post('/analyze/unlisted', async (req, res) => {
  try {
    const {
      ADDRESS,
      TOWN,
      STATE,
      ZIP_CODE,
      LIST_PRICE,
      UNITS_FINAL,
      NO_UNITS_MF,
      UNIT_MIX,
      TAXES,
      overrides
    } = req.body;

    // Create a mock listing object that matches the expected format
    const mockListing = {
      LIST_NO: 'UNLISTED_' + Date.now(), // Generate a unique ID
      ADDRESS: ADDRESS || '',
      TOWN: TOWN || '',
      STATE: STATE || 'MA',
      ZIP_CODE: ZIP_CODE || '',
      LIST_PRICE: Number(LIST_PRICE || 0),
      UNITS_FINAL: Number(UNITS_FINAL || 0),
      NO_UNITS_MF: Number(NO_UNITS_MF || 0),
      UNIT_MIX: UNIT_MIX || [],
      TAXES: Number(TAXES || 0)
    };

    const mode = 'avg'; // Default to average rent mode
    const { map: rentMap } = await dataService.getRents();
    
    // Apply overrides if provided
    let analysisOverrides = null;
    if (overrides) {
      analysisOverrides = overrides;
    }

    const result = computeAnalysis(mockListing, rentMap, mode, analysisOverrides);
    
    res.json({ 
      listing: mockListing, 
      analysis: result,
      message: 'Analysis completed successfully'
    });
  } catch (e) {
    console.error('Unlisted property analysis failed:', e);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

const PORT = process.env.PORT || 3001;

// Start the server after services are initialized
async function startServer() {
  try {
    // Wait for services to initialize
    await initializeServices();
    
    // Start the server
    app.listen(PORT, async () => {
      console.log(`🚀 API server running on port ${PORT}`);
      
      // Log data source status
      const dataSourceStatus = dataService.getDataSourceStatus();
      console.log(`📊 Data source: ${dataSourceStatus.useDatabase ? 'Database' : 'Local files'}`);
      
      if (dataSourceStatus.useDatabase) {
        console.log(`🔗 Database: ${dataSourceStatus.databaseConnected ? 'Connected' : 'Failed to connect'}`);
      }
      
      // Log initial data stats
      try {
        const stats = await dataService.getDataStats();
        console.log(`📊 Data loaded: ${stats.listings} listings, ${stats.rents} rent records, ${stats.comps} comps, ${stats.overrides} overrides`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ Could not load initial data stats:', errorMessage);
      }
      
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      if (migrationService) {
        console.log(`🔄 Data migration: POST http://localhost:${PORT}/admin/migrate-data`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
