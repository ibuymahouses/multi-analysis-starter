/**
 * Custom hook for listings data management
 * Extracted from listings.tsx to improve separation of concerns
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Property, PropertyFilters, PropertySort } from '@multi-analysis/shared';
import { API_ENDPOINTS } from '../lib/config';

export interface UseListingsOptions {
  initialFilters?: PropertyFilters;
  initialSort?: PropertySort;
  autoLoad?: boolean;
  rentMode?: 'below' | 'avg' | 'agg';
}

export function useListings(options: UseListingsOptions = {}) {
  const [listings, setListings] = useState<Property[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(options.autoLoad !== false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<PropertyFilters>(options.initialFilters || {});
  const [sort, setSort] = useState<PropertySort>(options.initialSort || { field: 'LIST_NO', direction: 'asc' });
  const [searchInfo, setSearchInfo] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<{
    mls?: string;
    town?: string;
    radius?: string;
  }>({});
  const [rentMode, setRentMode] = useState<'below' | 'avg' | 'agg'>(options.rentMode || 'avg');

  // Fetch listings data
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the analyze-all endpoint to get listings with analysis data
      const response = await fetch(API_ENDPOINTS.analyzeAll(rentMode));
      if (!response.ok) {
        throw new Error(`Failed to fetch listings: ${response.statusText}`);
      }
      
      const data = await response.json();
      setListings(data.rows || []);
      setMeta(data.meta || null);
    } catch (err) {
      console.error('Failed to load listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [rentMode]);

  // Load data on mount if autoLoad is enabled
  useEffect(() => {
    if (options.autoLoad !== false) {
      fetchListings();
    }
  }, [fetchListings, options.autoLoad]);

  // Apply filters to listings
  const applyFilters = useCallback((listings: Property[], filters: PropertyFilters) => {
    return listings.filter(listing => {
      // Price filters
      if (filters.priceMin && listing.LIST_PRICE < filters.priceMin) return false;
      if (filters.priceMax && listing.LIST_PRICE > filters.priceMax) return false;
      
      // Units filters
      if (filters.unitsMin && listing.UNITS_FINAL < filters.unitsMin) return false;
      if (filters.unitsMax && listing.UNITS_FINAL > filters.unitsMax) return false;
      
      // Location filters
      if (filters.town && !listing.TOWN.toLowerCase().includes(filters.town.toLowerCase())) return false;
            if (filters.state && listing.STATE !== filters.state) return false;
      if (filters.zipCode && listing.ZIP_CODE !== filters.zipCode) return false;
      if (filters.county && listing.analysis?.county !== filters.county) return false;
            
      // One percent rule filter
      if (filters.onePercentRule) {
        const monthlyGross = listing.analysis?.monthlyGross || 0;
        const onePercentOfPrice = listing.LIST_PRICE * 0.01;
        if (monthlyGross < onePercentOfPrice) return false;
      }
      
      return true;
    });
  }, []);

  // Sort listings
  const sortListings = useCallback((listings: Property[], sort: PropertySort) => {
    return [...listings].sort((a, b) => {
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
        case 'UNITS_FINAL':
          aValue = a.UNITS_FINAL;
          bValue = b.UNITS_FINAL;
          break;
        case 'pricePerUnit':
          aValue = a.LIST_PRICE / (a.UNITS_FINAL || 1);
          bValue = b.LIST_PRICE / (b.UNITS_FINAL || 1);
          break;
        case 'pricePerBedroom':
          const aBedrooms = a.UNIT_MIX.reduce((total, unit) => total + (unit.bedrooms * unit.count), 0);
          const bBedrooms = b.UNIT_MIX.reduce((total, unit) => total + (unit.bedrooms * unit.count), 0);
          aValue = a.LIST_PRICE / (aBedrooms || 1);
          bValue = b.LIST_PRICE / (bBedrooms || 1);
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
          aValue = a[sort.field as keyof Property];
          bValue = b[sort.field as keyof Property];
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

  // Get filtered and sorted listings
  const filteredListings = useMemo(() => {
    let result = listings;
    
    // Apply filters
    if (Object.keys(filters).length > 0) {
      result = applyFilters(result, filters);
    }
    
    // Apply sorting
    if (sort.field && sort.direction) {
      result = sortListings(result, sort);
    }
    
    return result;
  }, [listings, filters, sort, applyFilters, sortListings]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<PropertyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Update sort
  const updateSort = useCallback((newSort: Partial<PropertySort>) => {
    setSort(prev => ({ ...prev, ...newSort }));
  }, []);

  // Update search filters
  const updateSearchFilters = useCallback((newSearchFilters: Partial<typeof searchFilters>) => {
    setSearchFilters(prev => ({ ...prev, ...newSearchFilters }));
  }, []);

  // Update rent mode and refetch data
  const updateRentMode = useCallback((newRentMode: 'below' | 'avg' | 'agg') => {
    setRentMode(newRentMode);
  }, []);

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
    if (filters.county) activeFilters.push(`County: ${filters.county}`);
    if (filters.onePercentRule) activeFilters.push('1% Rule');
    
    return activeFilters;
  }, [filters]);

  return {
    // State
    listings: filteredListings,
    meta,
    loading,
    error,
    filters,
    sort,
    searchInfo,
    searchFilters,
    rentMode,
    
    // Actions
    fetchListings,
    updateFilters,
    updateSort,
    updateSearchFilters,
    updateRentMode,
    setSearchInfo,
    clearFilters,
    
    // Computed
    getFilterSummary,
    totalListings: listings.length,
    filteredCount: filteredListings.length,
  };
}
