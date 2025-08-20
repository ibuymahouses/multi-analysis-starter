// seed/comps-loader.js
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const root = process.cwd();
const csvPath = path.join(root, 'seed', 'data', 'comps.csv');
const outDir = path.join(root, 'data');
const outFile = path.join(outDir, 'comps.json');

if (!fs.existsSync(csvPath)) {
  console.error('❌ Place your comps CSV at seed/data/comps.csv');
  process.exit(1);
}

const raw = fs.readFileSync(csvPath, 'utf8');
const rows = parse(raw, { columns: true, skip_empty_lines: true });

const norm = rows.map(r => {
  // Helper to coerce numbers
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/[$,]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    // Handle various date formats
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  };

  // Map comp data fields
  const item = {
    LIST_NO: r.LIST_NO ?? null,
    ADDRESS: r.ADDRESS ?? null,
    TOWN: r.TOWN ?? null,
    STATE: r.STATE ?? 'MA',
    ZIP_CODE: r.ZIP_CODE ?? null,
    STATUS: r.STATUS ?? null,
    LIST_PRICE: num(r.LIST_PRICE ?? r['LIST OR SALE PRICE']),
    SALE_PRICE: num(r.SALE_PRICE),
    SALE_DATE: formatDate(r.SETTLED_DATE ?? r.SALE_DATE),
    TAXES: num(r.TAXES),
    NO_UNITS_MF: num(r.NO_UNITS_MF ?? r['# UNITS'] ?? r.UNITS),
    NO_BEDROOMS: num(r.NO_BEDROOMS),
    YEAR_BUILT: num(r.YEAR_BUILT),
    SQUARE_FEET: num(r.SQUARE_FEET),
    PRICE_PER_SQFT: num(r.PRICE_PER_SQFT ?? r.SOLD_PRICE_PER_SQFT),
    MARKET_TIME: num(r.MARKET_TIME),
    LIST_DATE: formatDate(r.LIST_DATE),
    SETTLED_DATE: formatDate(r.SETTLED_DATE),
    TAX_YEAR: num(r.TAX_YEAR),
    TOTAL_BATHS: num(r.TOTAL_BATHS),
    NO_FULL_BATHS: num(r.NO_FULL_BATHS),
    NO_HALF_BATHS: num(r.NO_HALF_BATHS),
    FIRE_PLACES: num(r.FIRE_PLACES),
    GARAGE_SPACES_MF: num(r.GARAGE_SPACES_MF),
    PARKING_SPACES_MF: num(r.PARKING_SPACES_MF),
    STYLE_MF: r.STYLE_MF ?? null,
    EXTERIOR_MF: r.EXTERIOR_MF ?? null,
    HEATING_MF: r.HEATING_MF ?? null,
    FOUNDATION_MF: r.FOUNDATION_MF ?? null,
    ROOF_MATERIAL_MF: r.ROOF_MATERIAL_MF ?? null,
    REMARKS: r.REMARKS ?? null
  };

  // BEDRMS_X fields represent bedrooms in each unit (not count of units with X bedrooms)
  const b1 = num(r.BEDRMS_1_MF), b2 = num(r.BEDRMS_2_MF), b3 = num(r.BEDRMS_3_MF), b4 = num(r.BEDRMS_4_MF), b5 = num(r.BEDRMS_5_MF);
  
  // Create unit mix by counting how many units have each bedroom count
  const unitBedrooms = [b1, b2, b3, b4, b5].filter(b => b && b > 0); // Get actual unit bedroom counts
  
  // Count units by bedroom type
  const bedroomCounts = {};
  unitBedrooms.forEach(bedrooms => {
    bedroomCounts[bedrooms] = (bedroomCounts[bedrooms] || 0) + 1;
  });
  
  // Convert to unit mix format
  const buckets = Object.entries(bedroomCounts).map(([bedrooms, count]) => ({
    bedrooms: parseInt(bedrooms),
    count: count
  })).sort((a, b) => a.bedrooms - b.bedrooms);

  // If NO_UNITS_MF missing, derive from buckets
  const unitsFromBuckets = buckets.reduce((s, x) => s + x.count, 0);
  item.UNITS_FINAL = item.NO_UNITS_MF ?? (unitsFromBuckets || null);

  // Add rental data if available
  const rents = [r.RENT1_MF, r.RENT2_MF, r.RENT3_MF, r.RENT4_MF, r.RENT5_MF]
    .map(rent => num(rent))
    .filter(rent => rent && rent > 0);
  
  if (rents.length > 0) {
    item.RENTAL_DATA = {
      rents: rents,
      total_rent: rents.reduce((sum, rent) => sum + rent, 0),
      avg_rent: rents.reduce((sum, rent) => sum + rent, 0) / rents.length
    };
  }

  return { ...item, UNIT_MIX: buckets };
});

// Filter out records without essential data
const filtered = norm.filter(item => 
  item.LIST_NO && 
  (item.LIST_PRICE || item.SALE_PRICE) && 
  item.ADDRESS
);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ 
  generatedAt: new Date().toISOString(), 
  count: filtered.length, 
  listings: filtered 
}, null, 2));

console.log(`✅ Wrote ${filtered.length} comps to ${outFile}`);
console.log(`📊 Processed ${rows.length} total records, filtered to ${filtered.length} valid comps`);
