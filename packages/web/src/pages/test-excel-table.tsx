import React, { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { API_ENDPOINTS } from '../../lib/config';

// Define the data type
type Property = {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  LIST_PRICE: number;
  UNITS_FINAL: number;
  NO_UNITS_MF: number;
  UNIT_MIX?: Array<{
    bedrooms: number;
    count: number;
  }>;
  analysis: {
    monthlyGross: number;
    noi: number;
    capAtAsk: number;
    dscr: number;
  };
};

export default function TestExcelTablePage() {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.analyzeAll('avg'));
        const result = await response.json();
        setData(result.rows || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Define columns
  const columns = [
    {
      name: 'MLS #',
      selector: (row: Property) => row.LIST_NO,
      sortable: true,
      cell: (row: Property) => (
        <Link 
          href={`/property/${row.LIST_NO}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.LIST_NO}
        </Link>
      ),
    },
    {
      name: 'Address',
      selector: (row: Property) => row.ADDRESS,
      sortable: true,
      cell: (row: Property) => (
        <Link 
          href={`/property/${row.LIST_NO}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.ADDRESS}
        </Link>
      ),
    },
    {
      name: 'Town',
      selector: (row: Property) => row.TOWN,
      sortable: true,
    },
    {
      name: 'List Price',
      selector: (row: Property) => row.LIST_PRICE,
      sortable: true,
      cell: (row: Property) => `$${row.LIST_PRICE.toLocaleString()}`,
    },
    {
      name: 'Units',
      selector: (row: Property) => row.UNITS_FINAL,
      sortable: true,
    },
    {
      name: 'MF Units',
      selector: (row: Property) => row.NO_UNITS_MF,
      sortable: true,
    },
    {
      name: 'Monthly Rent',
      selector: (row: Property) => row.analysis.monthlyGross,
      sortable: true,
      cell: (row: Property) => {
        const monthlyRent = row.analysis.monthlyGross;
        const listPrice = row.LIST_PRICE;
        const onePercentRatio = listPrice > 0 ? (monthlyRent / listPrice) * 100 : 0;
        const passesOnePercent = monthlyRent >= listPrice * 0.01;
        
        return (
          <div>
            <div>
              {monthlyRent.toLocaleString()}
              {passesOnePercent && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  1%
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {onePercentRatio.toFixed(1)}%
            </div>
          </div>
        );
      },
    },
    {
      name: 'NOI (yr)',
      selector: (row: Property) => row.analysis.noi,
      sortable: true,
      cell: (row: Property) => `$${row.analysis.noi.toLocaleString()}`,
    },
    {
      name: 'Cap @ Ask',
      selector: (row: Property) => row.analysis.capAtAsk,
      sortable: true,
      cell: (row: Property) => `${row.analysis.capAtAsk}%`,
    },
    {
      name: 'DSCR',
      selector: (row: Property) => row.analysis.dscr,
      sortable: true,
      cell: (row: Property) => row.analysis.dscr.toFixed(2),
    },
  ];

  // Filter function
  const filteredData = data.filter(
    (item) => {
      const searchText = filterText.toLowerCase();
      return (
        item.LIST_NO.toLowerCase().includes(searchText) ||
        item.ADDRESS.toLowerCase().includes(searchText) ||
        item.TOWN.toLowerCase().includes(searchText) ||
        item.LIST_PRICE.toString().includes(searchText) ||
        item.UNITS_FINAL.toString().includes(searchText) ||
        item.NO_UNITS_MF.toString().includes(searchText) ||
        item.analysis.monthlyGross.toString().includes(searchText) ||
        item.analysis.noi.toString().includes(searchText) ||
        item.analysis.capAtAsk.toString().includes(searchText) ||
        item.analysis.dscr.toString().includes(searchText)
      );
    }
  );

  const subHeaderComponent = (
    <Input
      placeholder="Search all columns..."
      value={filterText}
      onChange={(e) => setFilterText(e.target.value)}
      className="max-w-sm"
    />
  );

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">React Data Table Test</h1>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/listings">
          <Button variant="outline" size="sm">
            ← Back to Original Table
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">React Data Table Test</h1>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          This is a test of react-data-table-component. Try:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside mb-4">
          <li>Click column headers to sort</li>
          <li>Use the search box to filter all columns</li>
          <li>Look for Excel-like filter options in column headers</li>
        </ul>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <DataTable
          title="Property Listings"
          columns={columns}
          data={filteredData}
          pagination
          paginationPerPage={20}
          paginationRowsPerPageOptions={[10, 20, 50, 100]}
          subHeader
          subHeaderComponent={subHeaderComponent}
          persistTableHead
          responsive
          highlightOnHover
          pointerOnHover
          dense
          noDataComponent="No properties found"
          progressPending={loading}
          progressComponent="Loading..."
        />
      </div>
    </div>
  );
}
