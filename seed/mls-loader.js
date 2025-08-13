// seed/mls-loader.js
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const root = process.cwd();
const csvPath = path.join(root, 'seed', 'data', 'mls.csv');
const outDir = path.join(root, 'data');
const outFile = path.join(outDir, 'listings.json');

if (!fs.existsSync(csvPath)) {
  console.error('❌ Place your MLS CSV at seed/data/mls.csv');
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

  // Map common MLS PIN column names (we saw these in your export)
  const item = {
    LIST_NO: r.LIST_NO ?? r['LIST NO'] ?? r['MLS#'] ?? null,
    ADDRESS: r.ADDRESS ?? null,
    TOWN: r.TOWN ?? r.CITY ?? null,
    STATE: r.STATE ?? 'MA',
    ZIP_CODE: r.ZIP_CODE ?? r['ZIP'] ?? r['POSTAL CODE'] ?? null,
    STATUS: r.STATUS ?? null,
    LIST_PRICE: num(r.LIST_PRICE ?? r['LIST OR SALE PRICE'] ?? r.PRICE),
    SALE_PRICE: num(r.SALE_PRICE ?? null),
    TAXES: num(r.TAXES ?? null),
    NO_UNITS_MF: num(r.NO_UNITS_MF ?? r['# UNITS'] ?? r.UNITS)
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

  return { ...item, UNIT_MIX: buckets };
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), count: norm.length, listings: norm }, null, 2));

console.log(`✅ Wrote ${norm.length} listings to ${outFile}`); 