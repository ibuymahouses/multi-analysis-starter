// api/src/index.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import { computeAnalysis } from './analysis.js';

const app = express();

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Parse JSON bodies
app.use(express.json());

const dataDir = path.join(process.cwd(), '..', 'data');
const listingsPath = path.join(dataDir, 'listings.json');
const rentsPath = path.join(dataDir, 'bha-rents-comprehensive.json');
const overridesPath = path.join(dataDir, 'overrides.json');

function loadListings() {
  if (!fs.existsSync(listingsPath)) return { listings: [] };
  return JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
}

function loadRentsComprehensive() {
  if (!fs.existsSync(rentsPath)) return { map: new Map(), meta: null };
  const json = JSON.parse(fs.readFileSync(rentsPath, 'utf8'));
  const map = new Map(); // zip -> { rents:{'0'..'5'}, marketTier, county, town }
  for (const row of json.rents || []) {
    map.set(String(row.zip).trim(), {
      rents: row.rents || {},
      marketTier: row.marketTier || 'unknown',
      county: row.county || '',
      town: row.town || ''
    });
  }
  return { map, meta: json.metadata || null };
}

function loadOverrides() {
  if (!fs.existsSync(overridesPath)) return {};
  return JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
}

function saveOverrides(overrides) {
  fs.mkdirSync(path.dirname(overridesPath), { recursive: true });
  fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2));
}

// health
app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/listings', (_, res) => {
  try {
    res.json(loadListings());
  } catch {
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

// Rent metadata endpoint
app.get('/rents/metadata', (_, res) => {
  if (!fs.existsSync(rentsPath)) return res.json({ loaded: false });
  try {
    const j = JSON.parse(fs.readFileSync(rentsPath, 'utf8'));
    res.json({
      loaded: true,
      version: j.metadata?.version,
      lastUpdated: j.metadata?.lastUpdated,
      coverage: j.metadata?.coverage,
      totalZips: (j.rents || []).length,
      source: j.metadata?.source,
      description: j.metadata?.description
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load rent metadata' });
  }
});

// Property overrides endpoints
app.get('/property/:list_no/overrides', (req, res) => {
  try {
    const { list_no } = req.params;
    const overrides = loadOverrides();
    const propertyOverrides = overrides[list_no] || null;
    res.json(propertyOverrides);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load overrides' });
  }
});

app.post('/property/:list_no/overrides', (req, res) => {
  try {
    const { list_no } = req.params;
    const newOverrides = req.body;
    const overrides = loadOverrides();
    overrides[list_no] = newOverrides;
    saveOverrides(overrides);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save overrides' });
  }
});

// Analyze one listing by LIST_NO with rentMode query (?mode=below|avg|agg) and overrides
app.get('/analyze/:list_no', (req, res) => {
  try {
    const { list_no } = req.params;
    const mode = (req.query.mode || 'avg').toString();
    const overridesParam = req.query.overrides;
    
    const { listings } = loadListings();
    const listing = listings.find(l => String(l.LIST_NO) === String(list_no));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const { map: rentMap } = loadRentsComprehensive();
    
    // Apply overrides if provided
    let overrides = null;
    if (overridesParam) {
      try {
        overrides = JSON.parse(decodeURIComponent(overridesParam));
      } catch (e) {
        console.warn('Failed to parse overrides:', e);
      }
    }

    const result = computeAnalysis(listing, rentMap, mode, overrides);
    res.json({ listing: { LIST_NO: listing.LIST_NO, ADDRESS: listing.ADDRESS }, analysis: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Bulk analyze all (for the table)
app.get('/analyze-all', (req, res) => {
  try {
    const mode = (req.query.mode || 'avg').toString();
    const { listings } = loadListings();
    const { map: rentMap } = loadRentsComprehensive();
    const rows = listings.map(l => ({
      LIST_NO: l.LIST_NO,
      ADDRESS: l.ADDRESS,
      TOWN: l.TOWN,
      STATE: l.STATE,
      ZIP_CODE: l.ZIP_CODE,
      LIST_PRICE: l.LIST_PRICE,
      UNITS_FINAL: l.UNITS_FINAL,
      analysis: computeAnalysis(l, rentMap, mode)
    }));
    res.json({ count: rows.length, mode, rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Bulk analysis failed' });
  }
});

// CSV export endpoint
app.get('/export/analyzed.csv', (req, res) => {
  try {
    const mode = (req.query.mode || 'avg').toString();
    const { listings } = loadListings();
    const { map: rentMap } = loadRentsComprehensive();
    const rows = listings.map(l => {
      const a = computeAnalysis(l, rentMap, mode);
      return {
        LIST_NO: l.LIST_NO, 
        ADDRESS: l.ADDRESS, 
        TOWN: l.TOWN, 
        STATE: l.STATE, 
        ZIP: l.ZIP_CODE,
        MARKET_TIER: a.marketTier, 
        COUNTY: a.county,
        LIST_PRICE: l.LIST_PRICE, 
        UNITS: l.UNITS_FINAL,
        MONTHLY_RENT: a.monthlyGross, 
        NOI: a.noi, 
        CAP_AT_ASK_PCT: a.capAtAsk, 
        DSCR: a.dscr
      };
    });
    const header = Object.keys(rows[0] || {});
    const csv = [header.join(','), ...rows.map(r => header.map(k => r[k] ?? '').join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analyzed_${mode}.csv"`);
    res.send(csv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'CSV export failed' });
  }
});

// NEW: Search endpoints
app.get('/search/mls/:mls_number', (req, res) => {
  try {
    const { mls_number } = req.params;
    const { listings } = loadListings();
    const listing = listings.find(l => String(l.LIST_NO) === String(mls_number));
    
    if (!listing) {
      return res.json({ found: false, message: 'MLS number not found' });
    }
    
    const { map: rentMap } = loadRentsComprehensive();
    const analysis = computeAnalysis(listing, rentMap, 'avg');
    
    res.json({ 
      found: true, 
      listing: { ...listing, analysis } 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/search/town/:town_name', (req, res) => {
  try {
    const { town_name } = req.params;
    const { listings } = loadListings();
    
    // Case-insensitive search
    const matchingListings = listings.filter(l => 
      l.TOWN && l.TOWN.toLowerCase().includes(town_name.toLowerCase())
    );
    
    if (matchingListings.length === 0) {
      return res.json({ 
        found: false, 
        message: `No properties found in ${town_name}`,
        count: 0,
        listings: []
      });
    }
    
    const { map: rentMap } = loadRentsComprehensive();
    const analyzedListings = matchingListings.map(l => ({
      ...l,
      analysis: computeAnalysis(l, rentMap, 'avg')
    }));
    
    res.json({ 
      found: true, 
      count: analyzedListings.length,
      listings: analyzedListings
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/search/radius', (req, res) => {
  try {
    const { town, radius = 10 } = req.query;
    const radiusMiles = parseInt(radius);
    
    if (!town) {
      return res.status(400).json({ error: 'Town parameter required' });
    }
    
    const { listings } = loadListings();
    
    // For now, we'll do a simple town name match since we don't have coordinates
    // In a real implementation, you'd use geocoding and distance calculations
    const matchingListings = listings.filter(l => 
      l.TOWN && l.TOWN.toLowerCase().includes(town.toLowerCase())
    );
    
    if (matchingListings.length === 0) {
      return res.json({ 
        found: false, 
        message: `No properties found within ${radiusMiles} miles of ${town}`,
        count: 0,
        listings: []
      });
    }
    
    const { map: rentMap } = loadRentsComprehensive();
    const analyzedListings = matchingListings.map(l => ({
      ...l,
      analysis: computeAnalysis(l, rentMap, 'avg')
    }));
    
    res.json({ 
      found: true, 
      count: analyzedListings.length,
      radius: radiusMiles,
      town: town,
      listings: analyzedListings
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.listen(4000, () => console.log('API listening on :4000')); 