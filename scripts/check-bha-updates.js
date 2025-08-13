// scripts/check-bha-updates.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const BHA_BASE_URL = 'https://www.bostonhousing.org';
const BHA_SAFMR_PATH = '/BHA/media/Documents/Leased%20Housing/SAFMRs/';
const CURRENT_YEAR = new Date().getFullYear();

// Load current BHA data to check version
function loadCurrentBHAVersion() {
  const bhaPath = path.join(process.cwd(), 'data', 'bha-rents.json');
  if (!fs.existsSync(bhaPath)) return null;
  
  try {
    const data = JSON.parse(fs.readFileSync(bhaPath, 'utf8'));
    return {
      version: data.metadata?.version,
      lastUpdated: data.metadata?.lastUpdated,
      url: data.metadata?.url
    };
  } catch (e) {
    console.warn('⚠️ Failed to load current BHA data');
    return null;
  }
}

// Check if BHA has new payment standards
async function checkBHAUpdates() {
  console.log('🔍 Checking BHA for new payment standards...');
  
  const current = loadCurrentBHAVersion();
  if (current) {
    console.log(`📊 Current version: ${current.version} (${current.lastUpdated})`);
  }
  
  // Check for current year standards
  const currentYearUrl = `${BHA_BASE_URL}${BHA_SAFMR_PATH}${CURRENT_YEAR}-Payment-Standards-All-BR.pdf`;
  
  try {
    console.log(`🔗 Checking: ${currentYearUrl}`);
    const response = await fetch(currentYearUrl, { method: 'HEAD' });
    
    if (response.ok) {
      const lastModified = response.headers.get('last-modified');
      console.log(`✅ ${CURRENT_YEAR} standards available!`);
      console.log(`📅 Last modified: ${lastModified || 'Unknown'}`);
      
      if (!current || current.version !== CURRENT_YEAR.toString()) {
        console.log('\n🚨 UPDATE NEEDED!');
        console.log(`📥 Download: ${currentYearUrl}`);
        console.log('📝 Update your bha-rents.json file with new rates');
        console.log('🔄 Then run: npm run seed:rents');
        return true;
      } else {
        console.log('✅ You have the latest version!');
        return false;
      }
    } else {
      console.log(`❌ ${CURRENT_YEAR} standards not yet available (${response.status})`);
      
      // Check previous year
      const prevYear = CURRENT_YEAR - 1;
      const prevYearUrl = `${BHA_BASE_URL}${BHA_SAFMR_PATH}${prevYear}-Payment-Standards-All-BR.pdf`;
      
      try {
        const prevResponse = await fetch(prevYearUrl, { method: 'HEAD' });
        if (prevResponse.ok) {
          console.log(`📊 ${prevYear} standards available as fallback`);
          if (!current || current.version !== prevYear.toString()) {
            console.log(`🚨 Consider updating to ${prevYear} version`);
          }
        }
      } catch (e) {
        console.log(`⚠️ Could not check ${prevYear} standards`);
      }
      
      return false;
    }
  } catch (e) {
    console.error(`❌ Error checking BHA: ${e.message}`);
    return false;
  }
}

// Check for other potential sources
async function checkAlternativeSources() {
  console.log('\n🔍 Checking alternative sources...');
  
  const sources = [
    'https://www.huduser.gov/portal/datasets/fmr.html',
    'https://www.mass.gov/info-details/section-8-housing-choice-voucher-program',
    'https://www.bostonhousing.org/BHA/media/Documents/Leased%20Housing/'
  ];
  
  for (const source of sources) {
    try {
      const response = await fetch(source, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ ${source} - accessible`);
      } else {
        console.log(`⚠️ ${source} - ${response.status}`);
      }
    } catch (e) {
      console.log(`❌ ${source} - ${e.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🏠 BHA Payment Standards Update Checker');
  console.log('=====================================\n');
  
  const needsUpdate = await checkBHAUpdates();
  await checkAlternativeSources();
  
  if (needsUpdate) {
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Download the new BHA PDF');
    console.log('2. Extract the rental rates');
    console.log('3. Update data/bha-rents.json');
    console.log('4. Run: npm run seed:rents');
    console.log('5. Restart your development server');
    
    process.exit(1); // Exit with error code to indicate update needed
  } else {
    console.log('\n✅ No updates needed at this time');
    console.log('💡 Check back monthly for new releases');
  }
}

// Run the checker
main().catch(console.error); 