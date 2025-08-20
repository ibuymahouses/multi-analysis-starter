const fs = require('fs');
const path = require('path');

// Read the current comprehensive file
const comprehensivePath = path.join(__dirname, '..', 'data', 'bha-rents-comprehensive.json');
const rentsPath = path.join(__dirname, '..', 'data', 'rents.json');

console.log('Reading files...');
const comprehensive = JSON.parse(fs.readFileSync(comprehensivePath, 'utf8'));
const rents = JSON.parse(fs.readFileSync(rentsPath, 'utf8'));

// Create a map of existing ZIP codes in comprehensive file
const existingZips = new Set();
for (const item of comprehensive.rents) {
  existingZips.add(item.zip);
}

console.log(`Comprehensive file has ${comprehensive.rents.length} ZIP codes`);
console.log(`Rents file has ${rents.results.length} ZIP codes`);

// Find missing ZIP codes
const missingZips = [];
for (const item of rents.results) {
  if (!existingZips.has(item.zip)) {
    missingZips.push({
      zip: item.zip,
      town: item.town,
      county: item.county,
      rents: item.rents
    });
  }
}

console.log(`Found ${missingZips.length} missing ZIP codes`);

// Add missing ZIP codes to comprehensive file
for (const missing of missingZips) {
  comprehensive.rents.push(missing);
}

// Update metadata
comprehensive.metadata = {
  ...comprehensive.metadata,
  lastUpdated: new Date().toISOString(),
  coverage: `All Massachusetts ZIP codes with BHA data (${comprehensive.rents.length} total)`,
  note: `Updated with missing ZIP codes from rents.json`
};

// Write back to file
fs.writeFileSync(comprehensivePath, JSON.stringify(comprehensive, null, 2));

console.log(`Updated comprehensive file with ${missingZips.length} new ZIP codes`);
console.log(`Total ZIP codes now: ${comprehensive.rents.length}`);
