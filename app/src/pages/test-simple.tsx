import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../lib/config';

export default function TestSimplePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Fetching data...');
        const response = await fetch(API_ENDPOINTS.analyzeAll('avg'));
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Data received:', result);
        setData(result);
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Simple Test</h1>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Simple Test</h1>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Simple Test</h1>
      <p>Data loaded successfully!</p>
      <p>Count: {data?.count}</p>
      <p>Mode: {data?.mode}</p>
      <p>Rows: {data?.rows?.length}</p>
      
      {data?.rows && data.rows.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">First 3 rows:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(data.rows.slice(0, 3), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
