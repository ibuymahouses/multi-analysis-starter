import fs from 'fs';
import path from 'path';
const csvPath = path.join(process.cwd(), 'seed', 'data', 'mls.csv');
if (!fs.existsSync(csvPath)) {
  console.error('Place your MLS CSV at seed/data/mls.csv');
  process.exit(1);
}
console.log('MLS CSV found:', csvPath);
// TODO: parse and insert into DB 