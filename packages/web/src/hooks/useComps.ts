/**
 * Custom hook for comps data management
 * Similar to useListings but for sold properties (comps)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CompProperty, PropertyFilters, CompPropertySort } from '@multi-analysis/shared';
import { API_ENDPOINTS } from '../lib/config';

export interface UseCompsOptions {
  initialFilters?: PropertyFilters;
  initialSort?: CompPropertySort;
  autoLoad?: boolean;
  mode?: 'below' | 'avg' | 'agg';
}

export function useComps(options: UseCompsOptions = {}) {
  const [comps, setComps] = useState<CompProperty[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(options.autoLoad !== false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<PropertyFilters>(options.initialFilters || {});
  const [sort, setSort] = useState<CompPropertySort>(options.initialSort || { field: 'SALE_DATE', direction: 'desc' });
  const [searchInfo, setSearchInfo] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<{
    mls?: string;
    town?: string;
    radius?: string;
  }>({});
  const [mode, setMode] = useState<'below' | 'avg' | 'agg'>(options.mode || 'avg');

  // Fetch comps data
  const fetchComps = useCallback(async (dataMode?: 'below' | 'avg' | 'agg') => {
    try {
      setLoading(true);
      setError(null);
      
      const currentMode = dataMode || mode;
      const response = await fetch(API_ENDPOINTS.analyzeComps(currentMode));
      if (!response.ok) {
        throw new Error(`Failed to fetch comps: ${response.statusText}`);
      }
      
      const data = await response.json();
      setComps(data.rows || []);
      setMeta(data.meta || {
        lastUpdated: new Date().toISOString(),
        source: 'Sold Properties (Comps)',
        description: 'Properties sold in the past 6 months'
      });
    } catch (err) {
      console.error('Failed to load comps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comps');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  // Load data on mount if autoLoad is enabled
  useEffect(() => {
    if (options.autoLoad !== false) {
      fetchComps();
    }
  }, [fetchComps, options.autoLoad]);

  // Apply filters to comps
  const applyFilters = useCallback((comps: CompProperty[], filters: PropertyFilters) => {
    return comps.filter(comp => {
      // Price filters
      if (filters.priceMin && comp.LIST_PRICE < filters.priceMin) return false;
      if (filters.priceMax && comp.LIST_PRICE > filters.priceMax) return false;
      
      // Units filters
      if (filters.unitsMin && comp.UNITS_FINAL < filters.unitsMin) return false;
      if (filters.unitsMax && comp.UNITS_FINAL > filters.unitsMax) return false;
      
      // Location filters
      if (filters.town && !comp.TOWN.toLowerCase().includes(filters.town.toLowerCase())) return false;
      if (filters.state && comp.STATE !== filters.state) return false;
      if (filters.zipCode && comp.ZIP_CODE !== filters.zipCode) return false;
      
      return true;
    });
  }, []);

  // Sort comps
  const sortComps = useCallback((comps: CompProperty[], sort: CompPropertySort) => {
    return [...comps].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sort.field) {
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
        case 'SALE_PRICE':
          aValue = a.SALE_PRICE || 0;
          bValue = b.SALE_PRICE || 0;
          break;
        case 'SALE_DATE':
          aValue = new Date(a.SALE_DATE || '');
          bValue = new Date(b.SALE_DATE || '');
          break;
        case 'UNITS_FINAL':
          aValue = a.UNITS_FINAL;
          bValue = b.UNITS_FINAL;
          break;
        case 'pricePerUnit':
          aValue = a.LIST_PRICE / (a.UNITS_FINAL || 1);
          bValue = b.LIST_PRICE / (b.UNITS_FINAL || 1);
          break;
        case 'pricePerBedroom':
          const aBedrooms = a.NO_BEDROOMS || 0;
          const bBedrooms = b.NO_BEDROOMS || 0;
          aValue = aBedrooms > 0 ? a.LIST_PRICE / aBedrooms : 0;
          bValue = bBedrooms > 0 ? b.LIST_PRICE / bBedrooms : 0;
          break;
        case 'monthlyGross':
          aValue = a.RENTAL_DATA?.avg_rent || 0;
          bValue = b.RENTAL_DATA?.avg_rent || 0;
          break;
        case 'noi':
          aValue = a.RENTAL_DATA?.total_rent || 0;
          bValue = b.RENTAL_DATA?.total_rent || 0;
          break;
        case 'capAtAsk':
          const aCap = a.RENTAL_DATA?.total_rent && a.LIST_PRICE ? (a.RENTAL_DATA.total_rent * 12) / a.LIST_PRICE : 0;
          const bCap = b.RENTAL_DATA?.total_rent && b.LIST_PRICE ? (b.RENTAL_DATA.total_rent * 12) / b.LIST_PRICE : 0;
          aValue = aCap;
          bValue = bCap;
          break;
        case 'dscr':
          aValue = 0; // DSCR not available for comps
          bValue = 0;
          break;
        default:
          aValue = a[sort.field as keyof CompProperty];
          bValue = b[sort.field as keyof CompProperty];
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, []);

  // Get filtered and sorted comps
  const filteredComps = useMemo(() => {
    let result = comps;
    
    // Apply filters
    if (Object.keys(filters).length > 0) {
      result = applyFilters(result, filters);
    }
    
    // Apply sorting
    if (sort.field && sort.direction) {
      result = sortComps(result, sort);
    }
    
    return result;
  }, [comps, filters, sort, applyFilters, sortComps]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<PropertyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Update sort
  const updateSort = useCallback((newSort: Partial<CompPropertySort>) => {
    setSort(prev => ({ ...prev, ...newSort }));
  }, []);

  // Update search filters
  const updateSearchFilters = useCallback((newSearchFilters: Partial<typeof searchFilters>) => {
    setSearchFilters(prev => ({ ...prev, ...newSearchFilters }));
  }, []);

  // Update mode
  const updateMode = useCallback((newMode: 'below' | 'avg' | 'agg') => {
    setMode(newMode);
    fetchComps(newMode);
  }, [fetchComps]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchFilters({});
    setSearchInfo('');
  }, []);

  // Get filter summary
  const getFilterSummary = useCallback(() => {
    const activeFilters = [];
    
    if (filters.priceMin) activeFilters.push(`Min Price: $${filters.priceMin.toLocaleString()}`);
    if (filters.priceMax) activeFilters.push(`Max Price: $${filters.priceMax.toLocaleString()}`);
    if (filters.unitsMin) activeFilters.push(`Min Units: ${filters.unitsMin}`);
    if (filters.unitsMax) activeFilters.push(`Max Units: ${filters.unitsMax}`);
    if (filters.town) activeFilters.push(`Town: ${filters.town}`);
    if (filters.state) activeFilters.push(`State: ${filters.state}`);
    if (filters.zipCode) activeFilters.push(`ZIP: ${filters.zipCode}`);
    
    return activeFilters;
  }, [filters]);

  return {
    // State
    comps: filteredComps,
    meta,
    loading,
    error,
    filters,
    sort,
    searchInfo,
    searchFilters,
    mode,
    
    // Actions
    fetchComps,
    updateFilters,
    updateSort,
    updateSearchFilters,
    updateMode,
    setSearchInfo,
    clearFilters,
    
    // Computed
    getFilterSummary,
    totalComps: comps.length,
    filteredCount: filteredComps.length,
  };
}
