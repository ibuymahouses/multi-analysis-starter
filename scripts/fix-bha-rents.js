const fs = require('fs');
const path = require('path');

// Correct BHA rental data with proper town names and rental rates
const bhaRentalData = {
  "01460": { // Littleton
    "0": 2324, "1": 2497, "2": 2969, "3": 3590, "4": 3955, "5": 4547, "6": 5140
  },
  "01719": { // Boxborough
    "0": 2369, "1": 2506, "2": 2969, "3": 3578, "4": 3936, "5": 4527, "6": 5117
  },
  "01921": { // Boxford
    "0": 2101, "1": 2248, "2": 2678, "3": 3235, "4": 3561, "5": 4094, "6": 4629
  },
  "02184": { // Braintree
    "0": 2324, "1": 2497, "2": 2969, "3": 3590, "4": 3955, "5": 4547, "6": 5140
  },
  "02324": { // Bridgewater
    "0": 1764, "1": 1890, "2": 2478, "3": 3140, "4": 3518, "5": 4045, "6": 4572
  },
  "02301": { // Brockton
    "0": 1450, "1": 1520, "2": 1980, "3": 2509, "4": 2714, "5": 3120, "6": 3527
  }
};

// Town name mapping
const townNames = {
  "01460": "Littleton",
  "01719": "Boxborough", 
  "01921": "Boxford",
  "02184": "Braintree",
  "02324": "Bridgewater",
  "02301": "Brockton"
};

// Read the current BHA comprehensive data
const bhaFilePath = path.join(__dirname, '..', 'data', 'bha-rents-comprehensive.json');
const bhaData = JSON.parse(fs.readFileSync(bhaFilePath, 'utf8'));

// Update specific entries with correct data
Object.keys(bhaRentalData).forEach(zipCode => {
  const entry = bhaData.rents.find(item => item.zip === zipCode);
  if (entry) {
    entry.rents = bhaRentalData[zipCode];
    entry.town = townNames[zipCode] || entry.town;
    console.log(`Updated ${zipCode} (${townNames[zipCode]}) with correct rental rates`);
  }
});

// Update metadata
bhaData.metadata.lastUpdated = new Date().toISOString();
bhaData.metadata.note = "Fixed specific ZIP codes with correct rental rates and town names from seed data";

// Write the updated data back to the file
fs.writeFileSync(bhaFilePath, JSON.stringify(bhaData, null, 2));

console.log(`\nFixed rental rates for ${Object.keys(bhaRentalData).length} ZIP codes`);
console.log(`BHA data file updated: ${bhaFilePath}`);
