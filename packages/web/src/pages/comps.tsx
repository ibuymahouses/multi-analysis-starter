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
  const [mode, setMode] = useState<'below' | 'avg' | 'agg'>('avg');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [unitsMin, setUnitsMin] = useState<string>('');
  const [unitsMax, setUnitsMax] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('SALE_DATE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchInfo, setSearchInfo] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<{
    mls?: string;
    town?: string;
    radius?: string;
  }>({});
  
  // Table filters state
  const [tableFilters, setTableFilters] = useState<Record<string, any>>({});
  
  // Table ref for scrolling
  const tableRef = React.useRef<HTMLDivElement>(null);
  
  // Selected rows state
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch(API_ENDPOINTS.analyzeComps(mode));
        const result = await response.json();
        
        if (result.rows) {
          setRows(result.rows);
          setMeta({
            lastUpdated: new Date().toISOString(),
            source: 'Sold Properties (Comps)',
            description: 'Properties sold in the past 6 months'
          });
        }
      } catch (error) {
        console.error('Failed to load comps data:', error);
        setSearchInfo('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mode]);

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    let filtered = rows;

    // Apply price filters
    if (priceMin) {
      filtered = filtered.filter(row => row.SALE_PRICE && row.SALE_PRICE >= parseInt(priceMin));
    }
    if (priceMax) {
      filtered = filtered.filter(row => row.SALE_PRICE && row.SALE_PRICE <= parseInt(priceMax));
    }

    // Apply unit filters
    if (unitsMin) {
      filtered = filtered.filter(row => row.UNITS_FINAL && row.UNITS_FINAL >= parseInt(unitsMin));
    }
    if (unitsMax) {
      filtered = filtered.filter(row => row.UNITS_FINAL && row.UNITS_FINAL <= parseInt(unitsMax));
    }

    // Apply search filters
    if (searchFilters.mls) {
      filtered = filtered.filter(row => 
        row.LIST_NO.toLowerCase().includes(searchFilters.mls!.toLowerCase())
      );
    }
    if (searchFilters.town) {
      filtered = filtered.filter(row => 
        row.TOWN.toLowerCase().includes(searchFilters.town!.toLowerCase())
      );
    }

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortField === 'pricePerUnit') {
        aValue = (a.SALE_PRICE && a.UNITS_FINAL && a.UNITS_FINAL > 0) ? a.SALE_PRICE / a.UNITS_FINAL : 0;
        bValue = (b.SALE_PRICE && b.UNITS_FINAL && b.UNITS_FINAL > 0) ? b.SALE_PRICE / b.UNITS_FINAL : 0;
      } else if (sortField === 'pricePerBedroom') {
        const aBedrooms = a.UNIT_MIX?.reduce((sum, unit) => sum + (unit.bedrooms * unit.count), 0) || 0;
        const bBedrooms = b.UNIT_MIX?.reduce((sum, unit) => sum + (unit.bedrooms * unit.count), 0) || 0;
        aValue = (aBedrooms > 0 && a.SALE_PRICE) ? a.SALE_PRICE / aBedrooms : 0;
        bValue = (bBedrooms > 0 && b.SALE_PRICE) ? b.SALE_PRICE / bBedrooms : 0;
      } else if (sortField === 'monthlyGross') {
        aValue = a.analysis?.monthlyGross || 0;
        bValue = b.analysis?.monthlyGross || 0;
      } else if (sortField === 'noi') {
        aValue = a.analysis?.noi || 0;
        bValue = b.analysis?.noi || 0;
      } else if (sortField === 'capAtAsk') {
        aValue = a.analysis?.capAtAsk || 0;
        bValue = b.analysis?.capAtAsk || 0;
      } else if (sortField === 'dscr') {
        aValue = a.analysis?.dscr || 0;
        bValue = b.analysis?.dscr || 0;
      } else if (sortField.startsWith('analysis.')) {
        const field = sortField.replace('analysis.', '') as keyof typeof a.analysis;
        aValue = a.analysis?.[field] || 0;
        bValue = b.analysis?.[field] || 0;
      } else {
        // Safe indexing for direct Row properties
        aValue = (a as any)[sortField];
        bValue = (b as any)[sortField];
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [rows, priceMin, priceMax, unitsMin, unitsMax, searchFilters, sortField, sortDirection]);

  const handleSort = (field: string) => {
    const sortFieldTyped = field as SortField;
    if (sortField === sortFieldTyped) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sortFieldTyped);
      setSortDirection('asc');
    }
  };

  const handleRowSelect = (selectedRows: any[]) => {
    setSelectedRows(selectedRows.map((_, index) => index));
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredAndSortedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredAndSortedData.map((_, index) => index));
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
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Price
                </label>
                <Input
                  type="number"
                  placeholder="Max sale price"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Units
                </label>
                <Input
                  type="number"
                  placeholder="Min units"
                  value={unitsMin}
                  onChange={(e) => setUnitsMin(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Units
                </label>
                <Input
                  type="number"
                  placeholder="Max units"
                  value={unitsMax}
                  onChange={(e) => setUnitsMax(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              {filteredAndSortedData.length} properties
            </Badge>
            {meta && (
              <span className="text-sm text-gray-500">
                Last updated: {new Date(meta.lastUpdated!).toLocaleDateString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Rent Mode:</span>
            <Select value={mode} onValueChange={(value: 'below' | 'avg' | 'agg') => setMode(value)}>
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
                data={filteredAndSortedData}
                columns={columns}
                sortField={sortField}
                sortDirection={sortDirection}
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
