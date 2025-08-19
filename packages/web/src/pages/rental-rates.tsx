import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/config';

interface RentalData {
  zip: string;
  town: string;
  county: string;
  rents: {
    [key: string]: number;
  };
}

export default function RentalRatesPage() {
  const [rentalData, setRentalData] = useState<RentalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCounty, setSelectedCounty] = useState<string>('all');

  useEffect(() => {
    const loadRentalData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.rents);
        const data = await response.json();
        setRentalData(data.rents || []);
      } catch (error) {
        console.error('Failed to load rental data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRentalData();
  }, []);

  // Get unique counties
  const counties = Array.from(new Set(rentalData.map(item => item.county))).sort();

  // Filter data
  const filteredData = rentalData.filter(item => {
    if (selectedCounty !== 'all' && item.county !== selectedCounty) return false;
    return true;
  });



  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">BHA Rental Rate Data</h1>
        <p>Loading rental data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/listings">
          <Button variant="outline" size="sm">
            ← Back to Listings
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">BHA Rental Rate Data</h1>
      </div>

      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-4">
          This shows the rental rates by bedroom count for different ZIP codes across Massachusetts.
          All rates are from the official BHA seed data with specific values for each ZIP code.
        </p>
      </div>



      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">County:</label>
          <select 
            value={selectedCounty} 
            onChange={(e) => setSelectedCounty(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="all">All Counties</option>
            {counties.map(county => (
              <option key={county} value={county}>{county}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Rental Data</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">ZIP</th>
                <th className="p-2 text-left font-medium">Town</th>
                <th className="p-2 text-left font-medium">County</th>
                <th className="p-2 text-left font-medium">Studio</th>
                <th className="p-2 text-left font-medium">1 BR</th>
                <th className="p-2 text-left font-medium">2 BR</th>
                <th className="p-2 text-left font-medium">3 BR</th>
                <th className="p-2 text-left font-medium">4 BR</th>
                <th className="p-2 text-left font-medium">5+ BR</th>
                <th className="p-2 text-left font-medium">6+ BR</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 50).map((item, index) => (
                <tr key={index} className="border-t hover:bg-muted/50 bg-green-50">
                  <td className="p-2 font-mono">{item.zip}</td>
                  <td className="p-2">{item.town}</td>
                  <td className="p-2">{item.county}</td>
                  <td className="p-2 font-mono">${item.rents['0']?.toLocaleString()}</td>
                  <td className="p-2 font-mono">${item.rents['1']?.toLocaleString()}</td>
                  <td className="p-2 font-mono">${item.rents['2']?.toLocaleString()}</td>
                  <td className="p-2 font-mono">${item.rents['3']?.toLocaleString()}</td>
                  <td className="p-2 font-mono">${item.rents['4']?.toLocaleString()}</td>
                  <td className="p-2 font-mono">${item.rents['5']?.toLocaleString()}</td>
                  <td className="p-2 font-mono">${item.rents['6']?.toLocaleString() || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length > 50 && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing first 50 of {filteredData.length} records. Use filters to narrow results.
          </p>
        )}
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Rental Rates Are Used</h3>
        <p className="text-sm text-blue-800">
          The analysis calculates gross monthly rent by:
        </p>
        <ul className="text-sm text-blue-800 list-disc list-inside mt-2 space-y-1">
          <li>Looking up the ZIP code in the BHA rental data</li>
          <li>For each unit in the property's UNIT_MIX, using the appropriate bedroom count rate</li>
          <li>Multiplying by the number of units of that type</li>
          <li>Summing all unit types to get total monthly gross rent</li>
          <li>Applying the rent mode multiplier (below/avg/agg: 0.90/1.00/1.10)</li>
        </ul>
        <p className="text-sm text-blue-800 mt-2">
          <strong>Note:</strong> All rental rates are from the official BHA seed data with specific values for each ZIP code.
        </p>
      </div>
    </div>
  );
}
