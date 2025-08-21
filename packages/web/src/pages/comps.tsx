import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExcelStyleTable } from "@/components/ui/excel-style-table";
import Header from '@/components/header';
import { useComps } from '@/hooks';
import { CompProperty, PropertyFilters } from '@multi-analysis/shared';
import { API_ENDPOINTS } from '@/lib/config';

type Row = {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  STATE: string;
  ZIP_CODE: string;
  LIST_PRICE: number;
  SALE_PRICE: number;
  SALE_DATE: string;
  UNITS_FINAL: number;
  NO_UNITS_MF: number;
  UNIT_MIX?: Array<{
    bedrooms: number;
    count: number;
  }>;
  analysis: {
    rentMode: string;
    monthlyGross: number;
    annualGross: number;
    opex: number;
    noi: number;
    loanSized: number;
    annualDebtService: number;
    dscr: number;
    capAtAsk: number;
    marketTier: string;
    county: string;
    town: string;
  };
};

type Meta = { 
  version?: string; 
  lastUpdated?: string; 
  coverage?: string; 
  totalZips?: number; 
  source?: string; 
  description?: string 
};

type SortField = 'LIST_NO' | 'ADDRESS' | 'TOWN' | 'LIST_PRICE' | 'SALE_PRICE' | 'SALE_DATE' | 'UNITS_FINAL' | 'pricePerUnit' | 'pricePerBedroom' | 'monthlyGross' | 'noi' | 'capAtAsk' | 'dscr';
type SortDirection = 'asc' | 'desc';

export default function CompsPage() {
  const router = useRouter();
  
  // Use the new useComps hook for data management
  const {
    comps,
    meta,
    loading,
    error,
    filters,
    updateFilters,
    sort,
    updateSort,
    searchInfo,
    setSearchInfo,
    searchFilters,
    updateSearchFilters,
    mode,
    updateMode,
    clearFilters: clearAllFilters
  } = useComps({
    autoLoad: true,
    initialFilters: {
      priceMin: undefined,
      priceMax: undefined,
      unitsMin: undefined,
      unitsMax: undefined
    },
    initialSort: { field: 'SALE_DATE', direction: 'desc' },
    mode: 'avg'
  });
  
  // Convert comps to the expected Row format for backward compatibility
  const rows = React.useMemo(() => {
    return comps.map(comp => ({
      LIST_NO: comp.LIST_NO,
      ADDRESS: comp.ADDRESS,
      TOWN: comp.TOWN,
      STATE: comp.STATE,
      ZIP_CODE: comp.ZIP_CODE,
      LIST_PRICE: comp.LIST_PRICE,
      SALE_PRICE: comp.SALE_PRICE || 0,
      SALE_DATE: comp.SALE_DATE || '',
      UNITS_FINAL: comp.UNITS_FINAL,
      NO_UNITS_MF: comp.NO_UNITS_MF,
      UNIT_MIX: comp.UNIT_MIX,
      analysis: {
        rentMode: 'avg',
        monthlyGross: comp.RENTAL_DATA?.avg_rent || 0,
        annualGross: (comp.RENTAL_DATA?.avg_rent || 0) * 12,
        opex: 0,
        noi: comp.RENTAL_DATA?.total_rent || 0,
        loanSized: 0,
        annualDebtService: 0,
        dscr: 0,
        capAtAsk: comp.RENTAL_DATA?.total_rent && comp.LIST_PRICE ? (comp.RENTAL_DATA.total_rent * 12) / comp.LIST_PRICE : 0,
        marketTier: 'unknown',
        county: '',
        town: comp.TOWN
      }
    }));
  }, [comps]);
  
  // Table filters state
  const [tableFilters, setTableFilters] = useState<Record<string, any>>({});
  
  // Table ref for scrolling
  const tableRef = React.useRef<HTMLDivElement>(null);
  
  // Selected rows state
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Data is now loaded by the useComps hook
  // No need for separate useEffect

  // Data is now filtered and sorted by the useComps hook
  // No need for separate filtering logic

  const handleSort = (field: string) => {
    const sortFieldTyped = field as SortField;
    if (sort.field === sortFieldTyped) {
      updateSort({ direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      updateSort({ field: sortFieldTyped, direction: 'asc' });
    }
  };

  const handleRowSelect = (selectedRows: any[]) => {
    setSelectedRows(selectedRows.map((_, index) => index));
  };

  const handleSelectAll = () => {
    if (selectedRows.length === rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(rows.map((_, index) => index));
    }
  };

  const columns = [
    {
      key: 'LIST_NO',
      label: 'MLS #',
      sortable: true,
      render: (row: Row) => row?.LIST_NO ? (
        <Link 
          href={`/property/${row.LIST_NO}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.LIST_NO}
        </Link>
      ) : 'N/A'
    },
    {
      key: 'ADDRESS',
      label: 'Address',
      sortable: true,
      render: (row: Row) => row?.ADDRESS ? (
        <Link 
          href={`/property/${row.LIST_NO}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.ADDRESS}
        </Link>
      ) : 'N/A'
    },
    {
      key: 'TOWN',
      label: 'Town',
      sortable: true
    },
    {
      key: 'LIST_PRICE',
      label: 'List Price',
      sortable: true,
      render: (row: Row) => row?.LIST_PRICE ? `$${row.LIST_PRICE.toLocaleString()}` : 'N/A'
    },
    {
      key: 'SALE_PRICE',
      label: 'Sale Price',
      sortable: true,
      render: (row: Row) => row?.SALE_PRICE ? `$${row.SALE_PRICE.toLocaleString()}` : 'N/A'
    },
    {
      key: 'SALE_DATE',
      label: 'Sale Date',
      sortable: true,
      render: (row: Row) => row?.SALE_DATE ? new Date(row.SALE_DATE).toLocaleDateString() : 'N/A'
    },
    {
      key: 'UNITS_FINAL',
      label: 'Units',
      sortable: true
    },
    {
      key: 'pricePerUnit',
      label: 'Price/Unit',
      sortable: true,
      render: (row: Row) => {
        if (row?.SALE_PRICE && row?.UNITS_FINAL && row.UNITS_FINAL > 0) {
          return `$${Math.round(row.SALE_PRICE / row.UNITS_FINAL).toLocaleString()}`;
        }
        return 'N/A';
      }
    },
    {
      key: 'analysis.monthlyGross',
      label: 'Monthly Rent',
      sortable: true,
      render: (row: Row) => row?.analysis?.monthlyGross ? `$${row.analysis.monthlyGross.toLocaleString()}` : 'N/A'
    },
    {
      key: 'analysis.noi',
      label: 'NOI',
      sortable: true,
      render: (row: Row) => row?.analysis?.noi ? `$${row.analysis.noi.toLocaleString()}` : 'N/A'
    },
    {
      key: 'analysis.capAtAsk',
      label: 'Cap Rate',
      sortable: true,
      render: (row: Row) => row?.analysis?.capAtAsk ? `${(row.analysis.capAtAsk * 100).toFixed(2)}%` : 'N/A'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sold Properties (Comps)</h1>
          <p className="text-gray-600">
            Properties sold in the past 6 months with analysis
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter sold properties by criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Price
                </label>
                <Input
                  type="number"
                  placeholder="Min sale price"
                  value={filters.priceMin?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateFilters({ priceMin: value ? parseInt(value) : undefined });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Price
                </label>
                <Input
                  type="number"
                  placeholder="Max sale price"
                  value={filters.priceMax?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateFilters({ priceMax: value ? parseInt(value) : undefined });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Units
                </label>
                <Input
                  type="number"
                  placeholder="Min units"
                  value={filters.unitsMin?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateFilters({ unitsMin: value ? parseInt(value) : undefined });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Units
                </label>
                <Input
                  type="number"
                  placeholder="Max units"
                  value={filters.unitsMax?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateFilters({ unitsMax: value ? parseInt(value) : undefined });
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              {rows.length} properties
            </Badge>
            {meta && (
              <span className="text-sm text-gray-500">
                Last updated: {new Date(meta.lastUpdated!).toLocaleDateString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Rent Mode:</span>
            <Select value={mode} onValueChange={(value: 'below' | 'avg' | 'agg') => updateMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="below">Below Market</SelectItem>
                <SelectItem value="avg">Average</SelectItem>
                <SelectItem value="agg">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading comps data...</p>
              </div>
            ) : (
              <ExcelStyleTable
                data={rows}
                columns={columns}
                                  sortField={sort.field}
                  sortDirection={sort.direction}
                onSort={handleSort}
                onRowSelect={handleRowSelect}
                filters={tableFilters}
                onFilterChange={(field: string, value: any) => {
                  setTableFilters(prev => ({ ...prev, [field]: value }));
                }}
                onClearFilter={(field: string) => {
                  setTableFilters(prev => {
                    const newFilters = { ...prev };
                    delete newFilters[field];
                    return newFilters;
                  });
                }}
                onClearAllFilters={() => setTableFilters({})}
                selectable={true}
                copyable={true}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
