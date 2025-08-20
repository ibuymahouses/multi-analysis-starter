const fs = require('fs');
const path = require('path');

// BHA rental data from the user's screenshot
const bhaRentalData = {
  "01719": { // Boxborough
    "0": 2369,
    "1": 2506,
    "2": 2969,
    "3": 3578,
    "4": 3936,
    "5": 4527
  },
  "01921": { // Boxford
    "0": 2101,
    "1": 2248,
    "2": 2678,
    "3": 3235,
    "4": 3561,
    "5": 4094
  },
  "02184": { // Braintree
    "0": 2324,
    "1": 2497,
    "2": 2969,
    "3": 3590,
    "4": 3955,
    "5": 4547
  },
  "02324": { // Bridgewater
    "0": 1764,
    "1": 1890,
    "2": 2478,
    "3": 3140,
    "4": 3518,
    "5": 4045
  },
  "02301": { // Brockton
    "0": 1450,
    "1": 1520,
    "2": 1980,
    "3": 2509,
    "4": 2714,
    "5": 3120
  }
};

// Read the current BHA comprehensive data
const bhaFilePath = path.join(__dirname, '..', 'data', 'bha-rents-comprehensive.json');
const bhaData = JSON.parse(fs.readFileSync(bhaFilePath, 'utf8'));

// Update the rental data for each zip code
let updatedCount = 0;
bhaData.rents.forEach(rentEntry => {
  const zipCode = rentEntry.zip;
  if (bhaRentalData[zipCode]) {
    // Update the rental values with the exact BHA data
    rentEntry.rents = bhaRentalData[zipCode];
    // Remove the marketTier since we're using specific values
    delete rentEntry.marketTier;
    updatedCount++;
    console.log(`Updated zip code ${zipCode} with BHA rental data`);
  }
});

// Update the metadata to reflect the changes
bhaData.metadata.lastUpdated = new Date().toISOString();
bhaData.metadata.description = "Comprehensive Massachusetts ZIP code coverage with BHA rental rates";
bhaData.metadata.note = "Updated with specific BHA rental data - no longer using market tiers";

// Write the updated data back to the file
fs.writeFileSync(bhaFilePath, JSON.stringify(bhaData, null, 2));

console.log(`\nUpdated ${updatedCount} zip codes with BHA rental data:`);
Object.keys(bhaRentalData).forEach(zipCode => {
  console.log(`  ${zipCode}: ${JSON.stringify(bhaRentalData[zipCode])}`);
});

console.log(`\nBHA data file updated: ${bhaFilePath}`);
