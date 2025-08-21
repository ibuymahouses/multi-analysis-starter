/**
 * Custom hook for rental rates data management
 * Simple hook for BHA rental rate data
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { API_ENDPOINTS } from '../lib/config';

export interface RentalData {
  zip: string;
  town: string;
  county: string;
  rents: {
    [key: string]: number;
  };
}

export interface UseRentalRatesOptions {
  autoLoad?: boolean;
  initialCounty?: string;
}

export function useRentalRates(options: UseRentalRatesOptions = {}) {
  const [rentalData, setRentalData] = useState<RentalData[]>([]);
  const [loading, setLoading] = useState(options.autoLoad !== false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>(options.initialCounty || 'all');

  // Fetch rental data
  const fetchRentalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_ENDPOINTS.rents);
      if (!response.ok) {
        throw new Error(`Failed to fetch rental data: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRentalData(data.rents || []);
    } catch (err) {
      console.error('Failed to load rental data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rental data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount if autoLoad is enabled
  useEffect(() => {
    if (options.autoLoad !== false) {
      fetchRentalData();
    }
  }, [fetchRentalData, options.autoLoad]);

  // Get unique counties
  const counties = useMemo(() => {
    return Array.from(new Set(rentalData.map(item => item.county))).sort();
  }, [rentalData]);

  // Filter data by county
  const filteredData = useMemo(() => {
    return rentalData.filter(item => {
      if (selectedCounty !== 'all' && item.county !== selectedCounty) return false;
      return true;
    });
  }, [rentalData, selectedCounty]);

  // Update selected county
  const updateSelectedCounty = useCallback((county: string) => {
    setSelectedCounty(county);
  }, []);

  return {
    // State
    rentalData,
    loading,
    error,
    selectedCounty,
    counties,
    filteredData,
    
    // Actions
    fetchRentalData,
    updateSelectedCounty,
  };
}
