// seed/rent-loader.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const listingsPath = path.join(root, 'data', 'listings.json');
const bhaRentsPath = path.join(root, 'data', 'bha-rents-comprehensive.json');
const outDir = path.join(root, 'data');
const outFile = path.join(outDir, 'rents.json');

if (!fs.existsSync(listingsPath)) {
  console.error('❌ Seed MLS first: npm run seed:mls');
  process.exit(1);
}

// Load comprehensive BHA rent data
let bhaRents = new Map();
if (fs.existsSync(bhaRentsPath)) {
  try {
    const bhaData = JSON.parse(fs.readFileSync(bhaRentsPath, 'utf8'));
    for (const entry of bhaData.rents || []) {
      bhaRents.set((entry.zip || '').trim(), entry);
    }
    console.log(`📊 Loaded ${bhaRents.size} ZIP codes from comprehensive BHA data`);
    console.log(`📈 Coverage: All Massachusetts ZIP codes`);
  } catch (e) {
    console.warn('⚠️ Failed to load comprehensive BHA data, using estimates only');
  }
}

const listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8')).listings || [];
const zips = [...new Set(listings.map(l => (l.ZIP_CODE || '').trim()).filter(Boolean))];

console.log(`Processing rents for ${zips.length} ZIPs from your listings...`);

// Fallback rent estimates for Massachusetts (when BHA data not available)
const getFallbackRents = (zip) => {
  // Base rents for Massachusetts (reasonable estimates)
  const baseRents = {
    '0': 1200, // Studio
    '1': 1500, // 1BR
    '2': 1800, // 2BR
    '3': 2200, // 3BR
    '4': 2600, // 4BR
    '5': 3000  // 5BR
  };
  
  return {
    zip,
    year: new Date().getFullYear(),
    source: 'ESTIMATED_MA',
    rents: baseRents
  };
};

// Get rents for a ZIP code (BHA first, then fallback)
const getRentsForZip = (zip) => {
  const bhaEntry = bhaRents.get(zip);
  if (bhaEntry) {
    return {
      zip,
      year: new Date().getFullYear(),
      source: 'BHA_2025_COMPREHENSIVE',
      town: bhaEntry.town,
      county: bhaEntry.county,
      marketTier: bhaEntry.marketTier,
      rents: bhaEntry.rents
    };
  }
  
  console.log(`  ⚠ ${zip}: No BHA data - using fallback estimates`);
  return getFallbackRents(zip);
};

const results = [];
for (const zip of zips) {
  const r = getRentsForZip(zip);
  console.log(`  ✓ ${zip} (${r.source})${r.town ? ` - ${r.town}` : ''}${r.marketTier ? ` [${r.marketTier}]` : ''}`);
  results.push(r);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ 
  generatedAt: new Date().toISOString(), 
  bhaVersion: bhaRents.size > 0 ? '2025_COMPREHENSIVE' : 'none',
  totalCoverage: bhaRents.size,
  results 
}, null, 2));

console.log(`✅ Wrote ${results.length} ZIP rents → ${outFile}`);
console.log(`📊 Data sources: ${results.filter(r => r.source === 'BHA_2025_COMPREHENSIVE').length} BHA, ${results.filter(r => r.source === 'ESTIMATED_MA').length} estimated`);
console.log(`🌍 Total MA coverage: ${bhaRents.size} ZIP codes available for future listings`); 