// scripts/generate-all-ma-zips.js
import fs from 'fs';
import path from 'path';

// Massachusetts ZIP code ranges by county
const MA_ZIP_RANGES = {
  'Barnstable': ['02532', '02675'], // Cape Cod
  'Berkshire': ['01201', '01267'], // Western MA
  'Bristol': ['02702', '02791'], // Southeastern MA
  'Dukes': ['02539', '02568'], // Martha's Vineyard
  'Essex': ['01810', '01985'], // North Shore
  'Franklin': ['01026', '01378'], // Western MA
  'Hampden': ['01001', '01199'], // Western MA
  'Hampshire': ['01002', '01094'], // Western MA
  'Middlesex': ['01420', '01888'], // Metro Boston
  'Nantucket': ['02554', '02584'], // Nantucket Island
  'Norfolk': ['02018', '02072'], // South Shore
  'Plymouth': ['02030', '02385'], // South Shore
  'Suffolk': ['02108', '02137'], // Boston
  'Worcester': ['01005', '01655'] // Central MA
};

// Base rental rates by market tier
const MARKET_TIERS = {
  'premium': { // Boston, Cambridge, etc.
    '0': 1800, '1': 2200, '2': 2800, '3': 3500, '4': 4200, '5': 5000
  },
  'high': { // Suburban Boston
    '0': 1400, '1': 1700, '2': 2100, '3': 2600, '4': 3100, '5': 3700
  },
  'medium': { // Worcester, Springfield, etc.
    '0': 1100, '1': 1400, '2': 1700, '3': 2100, '4': 2500, '5': 2900
  },
  'low': { // Rural areas
    '0': 900, '1': 1200, '2': 1500, '3': 1900, '4': 2300, '5': 2700
  }
};

// Major cities and their market tiers
const CITY_TIERS = {
  'Boston': 'premium',
  'Cambridge': 'premium',
  'Somerville': 'premium',
  'Brookline': 'premium',
  'Newton': 'premium',
  'Waltham': 'high',
  'Framingham': 'high',
  'Worcester': 'medium',
  'Springfield': 'medium',
  'Lowell': 'medium',
  'Lawrence': 'medium',
  'New Bedford': 'medium',
  'Fall River': 'medium',
  'Brockton': 'medium',
  'Plymouth': 'high',
  'Quincy': 'high',
  'Weymouth': 'high',
  'Braintree': 'high',
  'Milton': 'high',
  'Dedham': 'high',
  'Needham': 'high',
  'Wellesley': 'premium',
  'Lexington': 'premium',
  'Concord': 'high',
  'Acton': 'high',
  'Westford': 'high',
  'Chelmsford': 'high',
  'Billerica': 'high',
  'Burlington': 'high',
  'Woburn': 'high',
  'Reading': 'high',
  'Wakefield': 'high',
  'Melrose': 'high',
  'Malden': 'high',
  'Medford': 'high',
  'Arlington': 'high',
  'Belmont': 'premium',
  'Watertown': 'high',
  'Brighton': 'premium',
  'Allston': 'premium',
  'Jamaica Plain': 'premium',
  'Dorchester': 'medium',
  'Roxbury': 'medium',
  'Mattapan': 'medium',
  'Hyde Park': 'medium',
  'West Roxbury': 'high',
  'Roslindale': 'high',
  'Charlestown': 'premium',
  'East Boston': 'high',
  'South Boston': 'premium',
  'North End': 'premium',
  'Beacon Hill': 'premium',
  'Back Bay': 'premium',
  'South End': 'premium',
  'Fenway': 'premium',
  'Mission Hill': 'high',
  'Longwood': 'premium'
};

// Generate ZIP codes for a range
function generateZIPRange(start, end) {
  const zips = [];
  const startNum = parseInt(start);
  const endNum = parseInt(end);
  
  for (let i = startNum; i <= endNum; i++) {
    const zip = i.toString().padStart(5, '0');
    if (zip >= start && zip <= end) {
      zips.push(zip);
    }
  }
  return zips;
}

// Determine market tier for a ZIP code
function getMarketTier(zip) {
  // Premium areas (Boston metro)
  if (zip.startsWith('021') || zip.startsWith('022') || zip.startsWith('024')) {
    return 'premium';
  }
  
  // High tier suburbs
  if (zip.startsWith('017') || zip.startsWith('018') || zip.startsWith('020') || zip.startsWith('023')) {
    return 'high';
  }
  
  // Medium tier (major cities)
  if (zip.startsWith('010') || zip.startsWith('011') || zip.startsWith('014') || zip.startsWith('015') || zip.startsWith('016')) {
    return 'medium';
  }
  
  // Default to low tier
  return 'low';
}

// Generate comprehensive BHA data
function generateComprehensiveBHAData() {
  const allZips = [];
  
  // Generate all ZIP codes from ranges
  for (const [county, range] of Object.entries(MA_ZIP_RANGES)) {
    const zips = generateZIPRange(range[0], range[1]);
    
    for (const zip of zips) {
      const marketTier = getMarketTier(zip);
      const rents = MARKET_TIERS[marketTier];
      
      allZips.push({
        zip,
        town: `ZIP_${zip}`, // Placeholder - would be filled with actual town names
        county,
        marketTier,
        rents
      });
    }
  }
  
  return {
    metadata: {
      source: "COMPREHENSIVE_MA_COVERAGE",
      lastUpdated: new Date().toISOString(),
      version: "2025",
      description: "Comprehensive Massachusetts ZIP code coverage with estimated rental rates",
      coverage: `All Massachusetts ZIP codes (${allZips.length} total)`,
      note: "Town names are placeholders - update with actual BHA data when available"
    },
    rents: allZips
  };
}

// Main execution
function main() {
  console.log('🏠 Generating comprehensive Massachusetts ZIP code coverage...');
  
  const data = generateComprehensiveBHAData();
  const outputPath = path.join(process.cwd(), 'data', 'bha-rents-comprehensive.json');
  
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Generated ${data.rents.length} ZIP codes`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log('\n📊 Market Tier Distribution:');
  
  const tierCounts = {};
  data.rents.forEach(entry => {
    tierCounts[entry.marketTier] = (tierCounts[entry.marketTier] || 0) + 1;
  });
  
  Object.entries(tierCounts).forEach(([tier, count]) => {
    console.log(`  ${tier}: ${count} ZIP codes`);
  });
  
  console.log('\n💡 Next steps:');
  console.log('1. Replace placeholder town names with actual BHA data');
  console.log('2. Update rental rates with official BHA payment standards');
  console.log('3. Run: npm run seed:rents');
}

main(); 