import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Try multiple possible paths for the comps data
    const possiblePaths = [
      path.join(process.cwd(), '..', '..', 'data', 'comps.json'), // From packages/web
      path.join(process.cwd(), 'data', 'comps.json'), // From project root
      path.join(process.cwd(), '..', 'data', 'comps.json'), // From packages
    ];
    
    let dataPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        dataPath = testPath;
        break;
      }
    }
    
    if (!dataPath) {
      console.error('Comps data not found. Tried paths:', possiblePaths);
      return res.status(404).json({ message: 'Comps data not found' });
    }

    const compsData = fs.readFileSync(dataPath, 'utf8');
    const parsedData = JSON.parse(compsData);

    res.status(200).json(parsedData);
  } catch (error) {
    console.error('Error loading comps data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
