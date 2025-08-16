import React, { useEffect, useState } from 'react';
import { ExcelFilterDropdown } from '@/components/ui/excel-filter-dropdown';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { API_ENDPOINTS } from '../lib/config';

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

export default function TestExcelFilterPage() {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sorting, setSorting] = useState<{ id: string; direction: 'asc' | 'desc' } | null>(null);

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

  // Apply filters
  const filteredData = React.useMemo(() => {
    return data.filter(row => {
      for (const [columnId, selectedValues] of Object.entries(filters)) {
        if (selectedValues.length === 0) continue;
        
        let cellValue: any;
        switch (columnId) {
          case 'LIST_NO':
            cellValue = row.LIST_NO;
            break;
          case 'ADDRESS':
            cellValue = row.ADDRESS;
            break;
          case 'TOWN':
            cellValue = row.TOWN;
            break;
          case 'LIST_PRICE':
            cellValue = row.LIST_PRICE.toString();
            break;
          case 'UNITS_FINAL':
            cellValue = row.UNITS_FINAL.toString();
            break;
          case 'NO_UNITS_MF':
            cellValue = row.NO_UNITS_MF.toString();
            break;
          case 'monthlyGross':
            cellValue = row.analysis.monthlyGross.toString();
            break;
          case 'noi':
            cellValue = row.analysis.noi.toString();
            break;
          case 'capAtAsk':
            cellValue = row.analysis.capAtAsk.toString();
            break;
          case 'dscr':
            cellValue = row.analysis.dscr.toString();
            break;
          default:
            continue;
        }
        
        if (!selectedValues.includes(String(cellValue))) {
          return false;
        }
      }
      return true;
    });
  }, [data, filters]);

  // Apply sorting
  const sortedData = React.useMemo(() => {
    if (!sorting) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sorting.id) {
        case 'LIST_NO':
          aValue = a.LIST_NO;
          bValue = b.LIST_NO;
          break;
        case 'ADDRESS':
          aValue = a.ADDRESS;
          bValue = b.ADDRESS;
          break;
        case 'TOWN':
          aValue = a.TOWN;
          bValue = b.TOWN;
          break;
        case 'LIST_PRICE':
          aValue = a.LIST_PRICE;
          bValue = b.LIST_PRICE;
          break;
        case 'UNITS_FINAL':
          aValue = a.UNITS_FINAL;
          bValue = b.UNITS_FINAL;
          break;
        case 'NO_UNITS_MF':
          aValue = a.NO_UNITS_MF;
          bValue = b.NO_UNITS_MF;
          break;
        case 'monthlyGross':
          aValue = a.analysis.monthlyGross;
          bValue = b.analysis.monthlyGross;
          break;
        case 'noi':
          aValue = a.analysis.noi;
          bValue = b.analysis.noi;
          break;
        case 'capAtAsk':
          aValue = a.analysis.capAtAsk;
          bValue = b.analysis.capAtAsk;
          break;
        case 'dscr':
          aValue = a.analysis.dscr;
          bValue = b.analysis.dscr;
          break;
        default:
          return 0;
      }
      
      if (sorting.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredData, sorting]);

  // Handle filter change
  const handleFilterChange = (columnId: string, selectedValues: string[]) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: selectedValues
    }));
  };

  // Handle sort change
  const handleSortChange = (columnId: string, direction: 'asc' | 'desc' | null) => {
    setSorting(direction ? { id: columnId, direction } : null);
  };

  // Get column data for filter dropdown
  const getColumnData = (columnId: string) => {
    return data.map(row => {
      switch (columnId) {
        case 'LIST_NO':
          return row.LIST_NO || '';
        case 'ADDRESS':
          return row.ADDRESS || '';
        case 'TOWN':
          return row.TOWN || '';
        case 'LIST_PRICE':
          return (row.LIST_PRICE || 0).toString();
        case 'UNITS_FINAL':
          return (row.UNITS_FINAL || 0).toString();
        case 'NO_UNITS_MF':
          return (row.NO_UNITS_MF || 0).toString();
        case 'monthlyGross':
          return (row.analysis?.monthlyGross || 0).toString();
        case 'noi':
          return (row.analysis?.noi || 0).toString();
        case 'capAtAsk':
          return (row.analysis?.capAtAsk || 0).toString();
        case 'dscr':
          return (row.analysis?.dscr || 0).toString();
        default:
          return '';
      }
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Excel Filter Test</h1>
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
        <h1 className="text-3xl font-bold">Excel Filter Test</h1>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          This demonstrates the exact Excel-like filter dropdown you requested. Try:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside mb-4">
          <li>Click the filter icon (🔽) next to any column header</li>
          <li>Use the search box to find specific values</li>
          <li>Check/uncheck values to filter</li>
          <li>Use "Select All" to toggle all visible values</li>
          <li>Use the sort buttons (A to Z, Z to A)</li>
          <li>Click "Clear Filter" to remove filters</li>
        </ul>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>MLS #</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'LIST_NO',
                      header: 'MLS #',
                      data: getColumnData('LIST_NO')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['LIST_NO'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>Address</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'ADDRESS',
                      header: 'Address',
                      data: getColumnData('ADDRESS')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['ADDRESS'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>Town</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'TOWN',
                      header: 'Town',
                      data: getColumnData('TOWN')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['TOWN'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>List Price</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'LIST_PRICE',
                      header: 'List Price',
                      data: getColumnData('LIST_PRICE')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['LIST_PRICE'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>Units</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'UNITS_FINAL',
                      header: 'Units',
                      data: getColumnData('UNITS_FINAL')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['UNITS_FINAL'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>MF Units</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'NO_UNITS_MF',
                      header: 'MF Units',
                      data: getColumnData('NO_UNITS_MF')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['NO_UNITS_MF'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>Monthly Rent</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'monthlyGross',
                      header: 'Monthly Rent',
                      data: getColumnData('monthlyGross')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['monthlyGross'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>NOI (yr)</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'noi',
                      header: 'NOI (yr)',
                      data: getColumnData('noi')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['noi'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>Cap @ Ask</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'capAtAsk',
                      header: 'Cap @ Ask',
                      data: getColumnData('capAtAsk')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['capAtAsk'] || []}
                  />
                </div>
              </th>
              <th className="p-2 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>DSCR</span>
                  <ExcelFilterDropdown
                    column={{
                      id: 'dscr',
                      header: 'DSCR',
                      data: getColumnData('dscr')
                    }}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                    currentSort={sorting}
                    currentFilter={filters['dscr'] || []}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr key={index} className="border-t hover:bg-muted/50">
                <td className="p-2">
                  <Link 
                    href={`/property/${row.LIST_NO}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {row.LIST_NO}
                  </Link>
                </td>
                <td className="p-2">
                  <Link 
                    href={`/property/${row.LIST_NO}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {row.ADDRESS}
                  </Link>
                </td>
                <td className="p-2">{row.TOWN}</td>
                <td className="p-2">${row.LIST_PRICE.toLocaleString()}</td>
                <td className="p-2">{row.UNITS_FINAL}</td>
                <td className="p-2">{row.NO_UNITS_MF}</td>
                <td className="p-2">
                  <div>
                    <div>
                      {row.analysis.monthlyGross.toLocaleString()}
                      {row.analysis.monthlyGross >= row.LIST_PRICE * 0.01 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          1%
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((row.analysis.monthlyGross / row.LIST_PRICE) * 100).toFixed(1)}%
                    </div>
                  </div>
                </td>
                <td className="p-2">${row.analysis.noi.toLocaleString()}</td>
                <td className="p-2">{row.analysis.capAtAsk}%</td>
                <td className="p-2">{row.analysis.dscr.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Info */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          Showing {sortedData.length} of {data.length} rows
        </p>
        {Object.keys(filters).length > 0 && (
          <p>Filters applied: {Object.keys(filters).length}</p>
        )}
      </div>
    </div>
  );
}
