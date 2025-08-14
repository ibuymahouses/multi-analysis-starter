import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Read the BHA rental data file
    const dataPath = path.join(process.cwd(), '..', 'data', 'bha-rents-comprehensive.json');
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const rentalData = JSON.parse(fileContent);

    res.status(200).json(rentalData);
  } catch (error) {
    console.error('Error reading rental data:', error);
    res.status(500).json({ message: 'Failed to load rental data' });
  }
}
