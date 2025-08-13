import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EnhancedTable } from "@/components/ui/enhanced-table";
import { AssumptionsDialog } from "@/components/ui/assumptions-dialog";

type Row = {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  STATE: string;
  ZIP_CODE: string;
  LIST_PRICE: number;
  UNITS_FINAL: number;
  analysis: {
    rentMode: string;
    monthlyGross: number;
    annualGross: number;
    opex: number;
    noi: number;
    loanSized: number;
    annualDebtService: number;
    dscr: number;
    capAtAsk: number; // percent
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

type SortField = 'LIST_NO' | 'ADDRESS' | 'TOWN' | 'marketTier' | 'county' | 'LIST_PRICE' | 'UNITS_FINAL' | 'monthlyGross' | 'noi' | 'capAtAsk' | 'dscr';
type SortDirection = 'asc' | 'desc';

export default function ListingsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'below' | 'avg' | 'agg'>('avg');
  const [tier, setTier] = useState<string>('all');
  const [county, setCounty] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [unitsMin, setUnitsMin] = useState<string>('');
  const [unitsMax, setUnitsMax] = useState<string>('');
  const [onePercentRule, setOnePercentRule] = useState<boolean>(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('LIST_NO');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchInfo, setSearchInfo] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<{
    mls?: string;
    town?: string;
    radius?: string;
  }>({});
  
  // New table filters state
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({});
  
  // Assumptions state
  const [assumptions, setAssumptions] = useState({
    ltv: 0.80,
    interestRate: 0.065,
    loanTerm: 30,
    dscrFloor: 1.20
  });

  const load = async (m: 'below' | 'avg' | 'agg') => {
    setLoading(true);
    try {
      const r = await fetch(`http://localhost:4000/analyze-all?mode=${m}`);
      const d = await r.json();
      setRows(d.rows || []);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(mode); 
  }, [mode]);

  useEffect(() => { 
    fetch('http://localhost:4000/rents/metadata')
      .then(r => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  // Parse search parameters from URL and apply them
  useEffect(() => {
    const { mls, town, radius } = router.query;
    let searchText = '';
    const filters: any = {};
    
    if (mls) {
      searchText = `MLS: ${mls}`;
      filters.mls = mls as string;
    } else if (town && radius) {
      searchText = `Within ${radius} miles of ${town}`;
      filters.town = town as string;
      filters.radius = radius as string;
    } else if (town) {
      searchText = `Town: ${town}`;
      filters.town = town as string;
    }
    
    setSearchInfo(searchText);
    setSearchFilters(filters);
  }, [router.query]);

  // Apply all filters including search filters and table filters
  const filtered = rows.filter(r => {
    // Search filters (applied first)
    if (searchFilters.mls) {
      if (String(r.LIST_NO) !== String(searchFilters.mls)) return false;
    }
    
    if (searchFilters.town) {
      const searchTown = searchFilters.town.toLowerCase().replace(/, ma$/, '').trim();
      const propertyTown = r.TOWN?.toLowerCase().trim();
      if (!propertyTown || !propertyTown.includes(searchTown)) return false;
    }
    
    // Regular filters
    const t = r.analysis?.marketTier || 'unknown';
    if (tier !== 'all' && t !== tier) return false;
    
    const c = r.analysis?.county || '';
    if (county !== 'all' && c !== county) return false;
    
    const price = r.LIST_PRICE || 0;
    if (priceMin && price < parseInt(priceMin)) return false;
    if (priceMax && price > parseInt(priceMax)) return false;
    
    const units = r.UNITS_FINAL || 0;
    if (unitsMin && units < parseInt(unitsMin)) return false;
    if (unitsMax && units > parseInt(unitsMax)) return false;
    
    if (onePercentRule) {
      const monthlyRent = r.analysis?.monthlyGross || 0;
      const listPrice = r.LIST_PRICE || 0;
      if (monthlyRent < listPrice * 0.01) return false;
    }
    
    // Table filters
    Object.entries(tableFilters).forEach(([field, filterValue]) => {
      if (!filterValue.trim()) return;
      
      let cellValue: string | number = '';
      switch (field) {
        case 'LIST_NO':
          cellValue = String(r.LIST_NO || '');
          break;
        case 'ADDRESS':
          cellValue = String(r.ADDRESS || '');
          break;
        case 'TOWN':
          cellValue = String(r.TOWN || '');
          break;
        case 'marketTier':
          cellValue = String(r.analysis?.marketTier || '');
          break;
        case 'county':
          cellValue = String(r.analysis?.county || '');
          break;
        case 'LIST_PRICE':
          cellValue = String(r.LIST_PRICE || '');
          break;
        case 'UNITS_FINAL':
          cellValue = String(r.UNITS_FINAL || '');
          break;
        case 'monthlyGross':
          cellValue = String(r.analysis?.monthlyGross || '');
          break;
        case 'noi':
          cellValue = String(r.analysis?.noi || '');
          break;
        case 'capAtAsk':
          cellValue = String(r.analysis?.capAtAsk || '');
          break;
        case 'dscr':
          cellValue = String(r.analysis?.dscr || '');
          break;
      }
      
      if (!cellValue.toLowerCase().includes(filterValue.toLowerCase())) {
        return false;
      }
    });
    
    return true;
  });

  const counties = Array.from(new Set(rows.map(r => r.analysis?.county).filter(Boolean))).sort();

  // Sorting function
  const sortedRows = [...filtered].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
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
      case 'marketTier':
        aValue = a.analysis?.marketTier || 'unknown';
        bValue = b.analysis?.marketTier || 'unknown';
        break;
      case 'county':
        aValue = a.analysis?.county || '';
        bValue = b.analysis?.county || '';
        break;
      case 'LIST_PRICE':
        aValue = a.LIST_PRICE || 0;
        bValue = b.LIST_PRICE || 0;
        break;
      case 'UNITS_FINAL':
        aValue = a.UNITS_FINAL || 0;
        bValue = b.UNITS_FINAL || 0;
        break;
      case 'monthlyGross':
        aValue = a.analysis?.monthlyGross || 0;
        bValue = b.analysis?.monthlyGross || 0;
        break;
      case 'noi':
        aValue = a.analysis?.noi || 0;
        bValue = b.analysis?.noi || 0;
        break;
      case 'capAtAsk':
        aValue = a.analysis?.capAtAsk || 0;
        bValue = b.analysis?.capAtAsk || 0;
        break;
      case 'dscr':
        aValue = a.analysis?.dscr || 0;
        bValue = b.analysis?.dscr || 0;
        break;
      default:
        return 0;
    }

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    }

    // Handle number comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setTier('all');
    setCounty('all');
    setPriceMin('');
    setPriceMax('');
    setUnitsMin('');
    setUnitsMax('');
    setOnePercentRule(false);
    setTableFilters({});
    // Don't clear search filters - those come from URL
  };

  // Check if any filters are active
  const hasActiveFilters = tier !== 'all' || county !== 'all' || priceMin || priceMax || unitsMin || unitsMax || onePercentRule || Object.values(tableFilters).some(f => f.trim() !== '');

  // Get badge variant for market tier
  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'premium': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Table columns configuration
  const columns = [
    {
      key: 'LIST_NO',
      label: 'MLS #',
      sortable: true,
      filterable: true,
      render: (value: string, row: Row) => (
        <Link 
          href={`/property/${row.LIST_NO}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
          title="View property details"
        >
          {value}
        </Link>
      )
    },
    {
      key: 'ADDRESS',
      label: 'Address',
      sortable: true,
      filterable: true,
      render: (value: string, row: Row) => (
        <Link 
          href={`/property/${row.LIST_NO}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
          title="View property details"
        >
          {value}
        </Link>
      )
    },
    {
      key: 'TOWN',
      label: 'Town',
      sortable: true,
      filterable: true
    },
    {
      key: 'marketTier',
      label: 'Tier',
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <Badge variant={getTierBadgeVariant(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'county',
      label: 'County',
      sortable: true,
      filterable: true
    },
    {
      key: 'LIST_PRICE',
      label: 'List Price',
      sortable: true,
      filterable: true,
      align: 'right' as const,
      render: (value: number) => value?.toLocaleString?.()
    },
    {
      key: 'UNITS_FINAL',
      label: 'Units',
      sortable: true,
      filterable: true,
      align: 'right' as const
    },
    {
      key: 'monthlyGross',
      label: 'Monthly Rent',
      sortable: true,
      filterable: true,
      align: 'right' as const,
      render: (value: number, row: Row) => {
        const monthlyRent = row.analysis?.monthlyGross || 0;
        const listPrice = row.LIST_PRICE || 0;
        const onePercentRatio = listPrice > 0 ? (monthlyRent / listPrice) * 100 : 0;
        const passesOnePercent = monthlyRent >= listPrice * 0.01;
        
        return (
          <div>
            <div>
              {monthlyRent?.toLocaleString?.()}
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
        )
      }
    },
    {
      key: 'noi',
      label: 'NOI (yr)',
      sortable: true,
      filterable: true,
      align: 'right' as const,
      render: (value: number) => value?.toLocaleString?.()
    },
    {
      key: 'capAtAsk',
      label: 'Cap @ Ask',
      sortable: true,
      filterable: true,
      align: 'right' as const,
      render: (value: number) => value ? `${value}%` : ''
    },
    {
      key: 'dscr',
      label: 'DSCR',
      sortable: true,
      filterable: true,
      align: 'right' as const,
             render: (value: number, row: any) => {
         return (
           <div>
             <div>{value}</div>
             <div className="text-xs text-muted-foreground">{(assumptions.ltv * 100).toFixed(0)}% LTV</div>
           </div>
         );
       }
    }
  ];

  // Prepare data for the enhanced table
  const tableData = sortedRows.map(row => ({
    LIST_NO: row.LIST_NO,
    ADDRESS: row.ADDRESS,
    TOWN: row.TOWN,
    marketTier: row.analysis?.marketTier || 'unknown',
    county: row.analysis?.county || '',
    LIST_PRICE: row.LIST_PRICE,
    UNITS_FINAL: row.UNITS_FINAL,
    monthlyGross: row.analysis?.monthlyGross,
    noi: row.analysis?.noi,
    capAtAsk: row.analysis?.capAtAsk,
    dscr: row.analysis?.dscr,
    // Keep the full row for render functions
    _row: row
  }));

  return (
    <main className="p-6 max-w-7xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="outline" size="sm">
          ← Back to Search
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Property Listings</h1>
      </div>
      
      {meta && (
        <p className="mb-2 text-sm text-muted-foreground">
          Rents: <span className="font-medium">{meta.source}</span> v{meta.version} • {meta.coverage} • Updated {meta.lastUpdated}
        </p>
      )}

      {searchInfo && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Search</Badge>
              <span className="text-blue-800">{searchInfo}</span>
        </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rent Mode</label>
              <Select value={mode} onValueChange={(value: any) => setMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below">Below Average (0.90×)</SelectItem>
                  <SelectItem value="avg">Average (1.00×)</SelectItem>
                  <SelectItem value="agg">Aggressive (1.10×)</SelectItem>
                </SelectContent>
              </Select>
          </div>
          
            <div className="space-y-2">
              <label className="text-sm font-medium">Market Tier</label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
          </div>
          
            <div className="space-y-2">
              <label className="text-sm font-medium">County</label>
              <Select value={county} onValueChange={setCounty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counties</SelectItem>
                  {counties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
          </div>
          
            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <div className="flex gap-2">
                <Input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
                <Input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
          </div>
          
            <div className="space-y-2">
              <label className="text-sm font-medium">Units Range</label>
              <div className="flex gap-2">
                <Input
                type="number"
                placeholder="Min"
                value={unitsMin}
                onChange={(e) => setUnitsMin(e.target.value)}
              />
                <Input
                type="number"
                placeholder="Max"
                value={unitsMax}
                onChange={(e) => setUnitsMax(e.target.value)}
              />
            </div>
          </div>
          
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={onePercentRule}
                onChange={(e) => setOnePercentRule(e.target.checked)}
                  className="rounded"
              />
              1% Rule Only
            </label>
              <p className="text-xs text-muted-foreground">
              Monthly rent ≥ 1% of list price
              </p>
          </div>
        </div>
        
                     <div className="flex gap-3 items-center">
          <a 
            href={`http://localhost:4000/export/analyzed.csv?mode=${mode}`} 
            target="_blank" 
            rel="noreferrer"
             >
               <Button>
            Export CSV
               </Button>
          </a>
             
             <AssumptionsDialog 
               assumptions={assumptions}
               onAssumptionsChange={setAssumptions}
             />
          
          {hasActiveFilters && (
               <Button variant="outline" onClick={clearFilters}>
              Clear Filters
               </Button>
          )}
        </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">Loading…</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
            Showing {sortedRows.length} of {rows.length} listings
            {sortField !== 'LIST_NO' && (
              <span> • Sorted by {sortField} ({sortDirection})</span>
            )}
            {hasActiveFilters && (
              <span> • Filters applied</span>
            )}
          </p>
          </div>
          
          <EnhancedTable
            columns={columns}
            data={tableData}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            filters={tableFilters}
            onFilterChange={(field, value) => setTableFilters(prev => ({ ...prev, [field]: value }))}
            onClearFilter={(field) => setTableFilters(prev => ({ ...prev, [field]: '' }))}
            onClearAllFilters={() => setTableFilters({})}
          />
        </>
      )}
      
             <p className="mt-4 text-sm text-muted-foreground">
         Data: Comprehensive MA coverage ({meta?.totalZips || '?'} ZIPs), your OPEX defaults, financing at {(assumptions.ltv * 100).toFixed(0)}% LTV, {(assumptions.interestRate * 100).toFixed(2)}% rate, {assumptions.loanTerm}yr term.
      </p>
    </main>
  );
} 