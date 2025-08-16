import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExcelStyleTable } from "@/components/ui/excel-style-table";
import { AssumptionsDialog } from "@/components/ui/assumptions-dialog";
import Header from '@/components/header';
import { ValidationModal } from '@/components/ui/validation-modal';
import { validateDataCompleteness, validateDataQuality, quickValidation } from '@/lib/data-validation';
import { API_ENDPOINTS } from '@/lib/config';

type Row = {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  STATE: string;
  ZIP_CODE: string;
  LIST_PRICE: number;
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

type SortField = 'LIST_NO' | 'ADDRESS' | 'TOWN' | 'LIST_PRICE' | 'UNITS_FINAL' | 'pricePerUnit' | 'pricePerBedroom' | 'monthlyGross' | 'noi' | 'capAtAsk' | 'dscr';
type SortDirection = 'asc' | 'desc';

export default function ListingsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'below' | 'avg' | 'agg'>('avg');
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
   const [tableFilters, setTableFilters] = useState<Record<string, any>>({});
   
   // Data validation state
   const [validationResult, setValidationResult] = useState<any>(null);
   const [showValidationModal, setShowValidationModal] = useState(false);
   const [modalType, setModalType] = useState<'error' | 'warning' | 'info'>('warning');
   const [modalIssues, setModalIssues] = useState<any[]>([]);
   const [modalTitle, setModalTitle] = useState('');
   
   // Table ref for scrolling
   const tableRef = React.useRef<HTMLDivElement>(null);
   
   // Selected rows state
   const [selectedRows, setSelectedRows] = useState<number[]>([]);
  
  // Assumptions state
  const [assumptions, setAssumptions] = useState({
    ltv: 0.80,
    interestRate: 0.065,
    loanTerm: 30,
    dscrFloor: 1.20
  });

     // Format currency - rounded to nearest dollar
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  };

  // Format LTV percentage - no decimals
  const formatLTV = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  // Format interest rate - 2 decimal places
  const formatInterestRate = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Format cap rate - 1 decimal place
  const formatCapRate = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format return on capital - 1 decimal place
  const formatReturnOnCapital = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Function to build property URL with current filters
   const buildPropertyURL = (listNo: string) => {
     const currentQuery = { ...router.query };
     // Remove search-specific parameters that shouldn't be in property URL
     delete currentQuery.mls;
     delete currentQuery.town;
     delete currentQuery.radius;
     
     return {
       pathname: `/property/${listNo}`,
       query: currentQuery
     };
   };

      // Function to update URL with current filter state
   const updateURL = (newFilters: any) => {
     const currentQuery = { ...router.query };
     
     // Update or remove filter parameters
     if (newFilters.mode !== undefined) {
       if (newFilters.mode === 'avg') {
         delete currentQuery.mode;
       } else {
         currentQuery.mode = newFilters.mode;
       }
     }
     
     if (newFilters.priceMin !== undefined) {
       if (newFilters.priceMin === '') {
         delete currentQuery.priceMin;
       } else {
         currentQuery.priceMin = newFilters.priceMin;
       }
     }
     
     if (newFilters.priceMax !== undefined) {
       if (newFilters.priceMax === '') {
         delete currentQuery.priceMax;
       } else {
         currentQuery.priceMax = newFilters.priceMax;
       }
     }
     
     if (newFilters.unitsMin !== undefined) {
       if (newFilters.unitsMin === '') {
         delete currentQuery.unitsMin;
       } else {
         currentQuery.unitsMin = newFilters.unitsMin;
       }
     }
     
     if (newFilters.unitsMax !== undefined) {
       if (newFilters.unitsMax === '') {
         delete currentQuery.unitsMax;
       } else {
         currentQuery.unitsMax = newFilters.unitsMax;
       }
     }
     
     if (newFilters.onePercentRule !== undefined) {
       if (newFilters.onePercentRule === false) {
         delete currentQuery.onePercentRule;
       } else {
         currentQuery.onePercentRule = 'true';
       }
     }
     
            // Handle table filters
       if (newFilters.tableFilters !== undefined) {
         const hasActiveTableFilters = Object.values(newFilters.tableFilters).some((f: any) => {
           if (Array.isArray(f)) {
             return f.length > 0;
           } else if (typeof f === 'string') {
             return f.trim() !== '';
           } else if (typeof f === 'object' && f !== null) {
             return f.value || f.secondValue;
           }
           return false;
         });
       
       if (hasActiveTableFilters) {
         currentQuery.tableFilters = JSON.stringify(newFilters.tableFilters);
       } else {
         delete currentQuery.tableFilters;
       }
     }
     
     // Update URL without triggering a page reload
     router.replace({
       pathname: router.pathname,
       query: currentQuery
     }, undefined, { shallow: true });
   };

  const load = async (m: 'below' | 'avg' | 'agg') => {
    setLoading(true);
    try {
      const r = await fetch(API_ENDPOINTS.analyzeAll(m));
      const d = await r.json();
      setRows(d.rows || []);
      
      // Run data completeness check in background
      setTimeout(() => {
        const result = checkDataCompleteness(d.rows || []);
        setValidationResult(result);
      }, 100);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to specific property in table
  const navigateToProperty = (listNo: string) => {
    // First check if the property is in the current filtered view
    let rowIndex = sortedRows.findIndex(row => row.LIST_NO === listNo);
    
    // If not found in filtered view, check if it's in the original data
    if (rowIndex === -1) {
      const originalIndex = rows.findIndex(row => row.LIST_NO === listNo);
      if (originalIndex !== -1) {
        // Property exists but is filtered out - clear filters to show it
        clearFilters();
        // Wait for re-render, then find the row again
        setTimeout(() => {
          const newRowIndex = sortedRows.findIndex(row => row.LIST_NO === listNo);
          if (newRowIndex !== -1) {
            highlightRow(newRowIndex);
          }
        }, 100);
        return;
      }
    }
    
    if (rowIndex !== -1) {
      highlightRow(rowIndex);
    }
  };

  // Helper function to highlight a specific row
  const highlightRow = (rowIndex: number) => {
    // Add a small delay to ensure the table is rendered
    setTimeout(() => {
      // Find all table rows and highlight the target one
      const tableRows = document.querySelectorAll('[data-row-index]');
      tableRows.forEach((row, index) => {
        if (index === rowIndex) {
          // Add more prominent highlighting with animation
          row.classList.add('bg-yellow-100', 'border-l-4', 'border-yellow-500');
          
          // Add a pulsing animation effect
          (row as HTMLElement).style.animation = 'pulse-highlight 2s ease-in-out';
          (row as HTMLElement).style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
          
          // Scroll the specific row into view with proper positioning
          row.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center', // Center the row in the viewport
            inline: 'nearest'
          });
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            row.classList.remove('bg-yellow-100', 'border-l-4', 'border-yellow-500');
            (row as HTMLElement).style.animation = '';
            (row as HTMLElement).style.boxShadow = '';
          }, 3000);
        }
      });
    }, 100);
  };

  // Data completeness checker - runs asynchronously without blocking UI
  const checkDataCompleteness = (data: Row[]) => {
    // Use the comprehensive validation utility
    const validation = validateDataCompleteness(data);
    
    // Log detailed report
    console.group('📊 Data Completeness Report');
    console.log(validation.summary);
    console.log(`Missing rent data: ${validation.stats.missingRent} (${((validation.stats.missingRent/validation.stats.total)*100).toFixed(1)}%)`);
    console.log(`Missing analysis: ${validation.stats.missingAnalysis} (${((validation.stats.missingAnalysis/validation.stats.total)*100).toFixed(1)}%)`);
    console.log(`Missing ZIP codes: ${validation.stats.missingZip} (${((validation.stats.missingZip/validation.stats.total)*100).toFixed(1)}%)`);
    console.log(`Missing unit mix: ${validation.stats.missingUnitMix} (${((validation.stats.missingUnitMix/validation.stats.total)*100).toFixed(1)}%)`);
    console.log(`Invalid prices: ${validation.stats.invalidPrices} (${((validation.stats.invalidPrices/validation.stats.total)*100).toFixed(1)}%)`);
    
    if (validation.issues.length > 0) {
      console.warn('⚠️ Data issues found:');
      validation.issues.slice(0, 10).forEach(issue => {
        const prefix = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        console.warn(`  ${prefix} ${issue.message}${issue.listNo ? ` (${issue.listNo})` : ''}`);
      });
      if (validation.issues.length > 10) {
        console.warn(`  ... and ${validation.issues.length - 10} more issues`);
      }
    } else {
      console.log('✅ All data looks complete!');
    }
    console.groupEnd();

    // Store validation result for potential UI display
    if (!validation.isValid) {
      console.warn(`Found ${validation.issues.length} data issues (${validation.stats.errors} errors, ${validation.stats.warnings} warnings)`);
    }
    
    return validation;
  };

     useEffect(() => { 
     load(mode); 
     updateURL({ mode });
   }, [mode]);

  useEffect(() => { 
          fetch(API_ENDPOINTS.rentsMetadata)
      .then(r => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

     // Parse search parameters from URL and apply them
   useEffect(() => {
     const { mls, town, radius, mode: urlMode, priceMin: urlPriceMin, priceMax: urlPriceMax, unitsMin: urlUnitsMin, unitsMax: urlUnitsMax, onePercentRule: urlOnePercentRule, tableFilters: urlTableFilters } = router.query;
     
     // Set mode from URL if present
     if (urlMode && ['below', 'avg', 'agg'].includes(urlMode as string)) {
       setMode(urlMode as 'below' | 'avg' | 'agg');
     }
     
     // Set price filters from URL if present
     if (urlPriceMin) setPriceMin(urlPriceMin as string);
     if (urlPriceMax) setPriceMax(urlPriceMax as string);
     
     // Set units filters from URL if present
     if (urlUnitsMin) setUnitsMin(urlUnitsMin as string);
     if (urlUnitsMax) setUnitsMax(urlUnitsMax as string);
     
     // Set one percent rule from URL if present
     if (urlOnePercentRule) setOnePercentRule(urlOnePercentRule === 'true');
     
     // Set table filters from URL if present
     if (urlTableFilters) {
       try {
         const parsedTableFilters = JSON.parse(urlTableFilters as string);
         setTableFilters(parsedTableFilters);
       } catch (e) {
         console.error('Failed to parse table filters from URL:', e);
       }
     }
     
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
    for (const [field, filterConfig] of Object.entries(tableFilters)) {
      if (!filterConfig) continue;
      
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
         case 'LIST_PRICE':
          cellValue = Number(r.LIST_PRICE || 0);
          break;
        case 'UNITS_FINAL':
          cellValue = Number(r.UNITS_FINAL || 0);
          break;
        case 'monthlyGross':
          cellValue = Number(r.analysis?.monthlyGross || 0);
          break;
        case 'noi':
          cellValue = Number(r.analysis?.noi || 0);
          break;
        case 'capAtAsk':
          cellValue = Number(r.analysis?.capAtAsk || 0);
          break;
        case 'dscr':
          cellValue = Number(r.analysis?.dscr || 0);
          break;
      }
      
      // Handle different filter types
      if (Array.isArray(filterConfig)) {
        // Multi-select filter (from ExcelFilterDropdown)
        if (filterConfig.length === 0) continue; // Skip empty arrays
        if (!filterConfig.includes(String(cellValue))) {
          return false;
        }
      } else if (typeof filterConfig === 'string') {
        // Simple string filter
        if (filterConfig === 'all') continue; // Skip "all" filters
        if (!String(cellValue).toLowerCase().includes(filterConfig.toLowerCase())) {
          return false;
        }
      } else if (typeof filterConfig === 'object' && filterConfig !== null) {
        // Advanced filter with operator
        const { operator, value, secondValue } = filterConfig;
        
        if (!value && !secondValue) continue; // Skip empty filters
        
        switch (operator) {
          case 'equals':
            if (String(cellValue) !== String(value)) return false;
            break;
          case 'contains':
            if (!String(cellValue).toLowerCase().includes(String(value).toLowerCase())) return false;
            break;
          case 'startsWith':
            if (!String(cellValue).toLowerCase().startsWith(String(value).toLowerCase())) return false;
            break;
          case 'endsWith':
            if (!String(cellValue).toLowerCase().endsWith(String(value).toLowerCase())) return false;
            break;
          case 'greaterThan':
            if (Number(cellValue) <= Number(value)) return false;
            break;
          case 'lessThan':
            if (Number(cellValue) >= Number(value)) return false;
            break;
          case 'between':
            if (Number(cellValue) < Number(value) || Number(cellValue) > Number(secondValue)) return false;
            break;
          default:
            // Fallback to contains if no operator specified
            if (!String(cellValue).toLowerCase().includes(String(value).toLowerCase())) return false;
            break;
        }
      }
    }
    
    return true;
  });

  

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
       case 'LIST_PRICE':
        aValue = a.LIST_PRICE || 0;
        bValue = b.LIST_PRICE || 0;
        break;
             case 'UNITS_FINAL':
         aValue = a.UNITS_FINAL || 0;
         bValue = b.UNITS_FINAL || 0;
         break;
       case 'pricePerUnit':
         aValue = (a.LIST_PRICE || 0) / (a.NO_UNITS_MF || 1);
         bValue = (b.LIST_PRICE || 0) / (b.NO_UNITS_MF || 1);
         break;
       case 'pricePerBedroom':
         const aTotalBedrooms = (a.UNIT_MIX || []).reduce((sum: number, u: any) => sum + (u.bedrooms * u.count), 0);
         const bTotalBedrooms = (b.UNIT_MIX || []).reduce((sum: number, u: any) => sum + (u.bedrooms * u.count), 0);
         aValue = (a.LIST_PRICE || 0) / (aTotalBedrooms || 1);
         bValue = (b.LIST_PRICE || 0) / (bTotalBedrooms || 1);
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
     setPriceMin('');
     setPriceMax('');
     setUnitsMin('');
     setUnitsMax('');
     setOnePercentRule(false);
     setTableFilters({});
     // Don't clear search filters - those come from URL
     
     // Update URL to remove filter parameters
     updateURL({
       priceMin: '',
       priceMax: '',
       unitsMin: '',
       unitsMax: '',
       onePercentRule: false,
       tableFilters: {}
     });
   };

     // Check if any filters are active
   const hasActiveFilters = priceMin || priceMax || unitsMin || unitsMax || onePercentRule || Object.values(tableFilters).some(f => {
    if (Array.isArray(f)) {
      return f.length > 0;
    } else if (typeof f === 'string') {
      return f.trim() !== '';
    } else if (typeof f === 'object' && f !== null) {
      return f.value || f.secondValue;
    }
    return false;
  });

  

  // Table columns configuration
  const columns = [
         {
       key: 'ADDRESS',
       label: 'Address',
       sortable: true,
       filterable: true,
       type: 'text' as const,
       width: 200,
       render: (value: string, row: Row, isEditing: boolean, onEdit: (value: any) => void) => (
         <Link 
           href={buildPropertyURL(row.LIST_NO)}
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
       filterable: true,
       type: 'text' as const,
       width: 120
     },
    {
      key: 'LIST_PRICE',
      label: 'List Price',
      sortable: true,
      filterable: true,
      type: 'number' as const,
      align: 'right' as const,
      width: 120,
      format: (value: number) => value ? formatCurrency(value) : ''
    },
    {
      key: 'UNITS_FINAL',
      label: 'Units',
      sortable: true,
      filterable: true,
      type: 'number' as const,
      align: 'right' as const,
      width: 80
    },
    {
      key: 'monthlyGross',
      label: 'Monthly Rent',
      sortable: true,
      filterable: true,
      type: 'number' as const,
      align: 'right' as const,
      width: 140,
      render: (value: number, row: Row, isEditing: boolean, onEdit: (value: any) => void) => {
        const monthlyRent = value || 0;
        const listPrice = row.LIST_PRICE || 0;
        const onePercentRatio = listPrice > 0 ? (monthlyRent / listPrice) * 100 : 0;
        const passesOnePercent = monthlyRent >= listPrice * 0.01;
        
        return (
          <div>
            <div>
              {monthlyRent ? formatCurrency(monthlyRent) : ''}
              {passesOnePercent && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  1%
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCapRate(onePercentRatio / 100)}
            </div>
          </div>
        )
      }
    },
    {
      key: 'capAtAsk',
      label: 'Cap @ Ask',
      sortable: true,
      filterable: true,
      type: 'number' as const,
      align: 'right' as const,
      width: 100,
      format: (value: number) => value ? formatCapRate(value / 100) : ''
    },
    {
      key: 'pricePerUnit',
      label: 'Price/Unit',
      sortable: true,
      filterable: true,
      type: 'number' as const,
      align: 'right' as const,
      width: 120,
      format: (value: number) => value ? formatCurrency(value) : ''
    },
    {
      key: 'pricePerBedroom',
      label: 'Price/Bed',
      sortable: true,
      filterable: true,
      type: 'number' as const,
      align: 'right' as const,
      width: 120,
      format: (value: number) => value ? formatCurrency(value) : ''
    }
  ];

     // Prepare data for the enhanced table
   const tableData = sortedRows.map(row => {
     const totalBedrooms = (row.UNIT_MIX || []).reduce((sum: number, u: any) => sum + (u.bedrooms * u.count), 0);
     const pricePerUnit = row.NO_UNITS_MF > 0 ? row.LIST_PRICE / row.NO_UNITS_MF : 0;
     const pricePerBedroom = totalBedrooms > 0 ? row.LIST_PRICE / totalBedrooms : 0;
     

     
     return {
       LIST_NO: row.LIST_NO,
       ADDRESS: row.ADDRESS,
       TOWN: row.TOWN,
       LIST_PRICE: row.LIST_PRICE,
       UNITS_FINAL: row.UNITS_FINAL,
       pricePerUnit,
       pricePerBedroom,
       monthlyGross: row.analysis?.monthlyGross,
       noi: row.analysis?.noi,
       capAtAsk: row.analysis?.capAtAsk,
       dscr: row.analysis?.dscr,
       // Keep the full row for render functions
       _row: row
     };
   });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
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

      {validationResult && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          validationResult.isValid 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {validationResult.isValid ? '✅' : '⚠️'} Data Quality
            </span>
            <span>
              {validationResult.stats.valid}/{validationResult.stats.total} properties valid
              {validationResult.stats.errors > 0 && (
                <button
                  onClick={() => {
                    setModalIssues(validationResult.issues.filter((i: any) => i.type === 'error'));
                    setModalTitle('Data Errors');
                    setModalType('error');
                    setShowValidationModal(true);
                  }}
                  className="text-red-700 hover:text-red-900 underline cursor-pointer"
                >
                  • {validationResult.stats.errors} errors
                </button>
              )}
              {validationResult.stats.warnings > 0 && (
                <button
                  onClick={() => {
                    setModalIssues(validationResult.issues.filter((i: any) => i.type === 'warning'));
                    setModalTitle('Data Warnings');
                    setModalType('warning');
                    setShowValidationModal(true);
                  }}
                  className="text-yellow-700 hover:text-yellow-900 underline cursor-pointer"
                >
                  • {validationResult.stats.warnings} warnings
                </button>
              )}
            </span>
          </div>
        </div>
      )}

      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        issues={modalIssues}
        title={modalTitle}
        type={modalType}
        onNavigateToProperty={navigateToProperty}
      />

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
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">Filters</CardTitle>
            {!loading && (
              <div className="text-xs text-muted-foreground mt-1">
                Showing {sortedRows.length} of {rows.length} listings • {selectedRows.length} of {rows.length} selected
                {(sortField !== 'LIST_NO' || hasActiveFilters) && (
                  <>
                    {sortField !== 'LIST_NO' && (
                      <span> • Sorted by {sortField} ({sortDirection})</span>
                    )}
                    {hasActiveFilters && (
                      <span> • Filters applied</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <AssumptionsDialog 
              assumptions={assumptions}
              onAssumptionsChange={setAssumptions}
            />
            <a 
                              href={API_ENDPOINTS.export(mode)} 
              target="_blank" 
              rel="noreferrer"
            >
              <Button>
                Export CSV
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rent Mode</label>
                             <Select value={mode} onValueChange={(value: any) => {
                 setMode(value);
                 updateURL({ mode: value });
               }}>
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
              <label className="text-sm font-medium">Price Range</label>
              <div className="flex gap-2">
                                 <Input
                 type="number"
                 placeholder="Min"
                 value={priceMin}
                 onChange={(e) => {
                   setPriceMin(e.target.value);
                   updateURL({ priceMin: e.target.value });
                 }}
               />
                 <Input
                 type="number"
                 placeholder="Max"
                 value={priceMax}
                 onChange={(e) => {
                   setPriceMax(e.target.value);
                   updateURL({ priceMax: e.target.value });
                 }}
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
                 onChange={(e) => {
                   setUnitsMin(e.target.value);
                   updateURL({ unitsMin: e.target.value });
                 }}
               />
                 <Input
                 type="number"
                 placeholder="Max"
                 value={unitsMax}
                 onChange={(e) => {
                   setUnitsMax(e.target.value);
                   updateURL({ unitsMax: e.target.value });
                 }}
               />
            </div>
          </div>
          
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                             <input
                 type="checkbox"
                 checked={onePercentRule}
                 onChange={(e) => {
                   setOnePercentRule(e.target.checked);
                   updateURL({ onePercentRule: e.target.checked });
                 }}
                   className="rounded"
               />
              1% Rule Only
            </label>
              <p className="text-xs text-muted-foreground">
              Monthly rent ≥ 1% of list price
              </p>
          </div>
        </div>
        
        {hasActiveFilters && (
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
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
          
          <div ref={tableRef}>
            <ExcelStyleTable
              columns={columns}
              data={tableData}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
                           filters={tableFilters}
               onFilterChange={(field, value) => {
                 const newTableFilters = { ...tableFilters, [field]: value };
                 setTableFilters(newTableFilters);
                 updateURL({ tableFilters: newTableFilters });
               }}
               onClearFilter={(field) => {
                 const newTableFilters = { ...tableFilters, [field]: null };
                 setTableFilters(newTableFilters);
                 updateURL({ tableFilters: newTableFilters });
               }}
               onClearAllFilters={() => {
                 setTableFilters({});
                 updateURL({ tableFilters: {} });
               }}
              selectable={true}
              copyable={true}
              onRowSelect={setSelectedRows}
            />
          </div>
        </>
      )}
      
             <p className="mt-4 text-sm text-muted-foreground">
         Data: Comprehensive MA coverage ({meta?.totalZips || '?'} ZIPs), your OPEX defaults, financing at {formatLTV(assumptions.ltv)} LTV, {formatInterestRate(assumptions.interestRate)} rate, {assumptions.loanTerm}yr term.
      </p>
      </main>
    </div>
  );
} 