/**
 * Custom hook for property analysis business logic
 * Extracted from analyze-unlisted.tsx to improve separation of concerns
 */

import { useState, useCallback, useEffect } from 'react';
import { Property, PropertyAnalysis, PropertyOverrides, UnitMix } from '@multi-analysis/shared';
import { API_ENDPOINTS } from '../lib/config';

export interface UsePropertyAnalysisOptions {
  initialProperty?: Property;
  onAnalysisUpdate?: (analysis: PropertyAnalysis) => void;
}

export function usePropertyAnalysis(options: UsePropertyAnalysisOptions = {}) {
  const [property, setProperty] = useState<Property>(options.initialProperty || {
    LIST_NO: 'CUSTOM',
    ADDRESS: '',
    TOWN: '',
    STATE: 'MA',
    ZIP_CODE: '',
    LIST_PRICE: 0,
    TAXES: 0,
    NO_UNITS_MF: 0,
    UNITS_FINAL: 0,
    UNIT_MIX: [],
    analysis: {
      monthlyGross: 0,
      annualGross: 0,
      opex: 0,
      noi: 0,
      loanSized: 0,
      annualDebtService: 0,
      dscr: 0,
      capAtAsk: 0
    },
    overrides: {
      downPayment: 0.20,
      interestRate: 0.07,
      loanTerm: 30,
      closingCostsPercentage: 0.03,
      dueDiligencePercentage: 0.01,
      vacancy: 0.03,
      opex: {
        waterSewer: 0,
        commonElec: 0,
        rubbish: 0,
        pm: 0,
        repairs: 0,
        legal: 0,
        capex: 0,
        taxes: 0,
        licensing: 0
      }
    }
  });

  const [bhaRentalData, setBhaRentalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load BHA rental data
  useEffect(() => {
    const fetchBhaData = async () => {
      try {
        setLoading(true);
        const response = await fetch(API_ENDPOINTS.rents);
        if (!response.ok) {
          throw new Error(`Failed to fetch BHA data: ${response.statusText}`);
        }
        const bhaData = await response.json();
        setBhaRentalData(bhaData);
      } catch (err) {
        console.error('Failed to load BHA data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load BHA data');
      } finally {
        setLoading(false);
      }
    };
    fetchBhaData();
  }, []);

  // Get rent for specific bedroom count
  const getRentForBedrooms = useCallback((bedrooms: number, zipCode: string) => {
    // Check if there's a custom rent override for this bedroom type
    const unitOverride = property.overrides.unitMix?.find(unit => unit.bedrooms === bedrooms);
    if (unitOverride && unitOverride.rent) {
      return unitOverride.rent;
    }
    
    // Fall back to BHA data
    if (!bhaRentalData) return 0;
    
    const zipData = bhaRentalData.rents?.find((item: any) => item.zip === zipCode);
    if (!zipData) return 0;
    
    const bedroomKey = String(bedrooms);
    return zipData.rents[bedroomKey] || 0;
  }, [property.overrides.unitMix, bhaRentalData]);

  // Function to initialize unit mix if none exists
  const initializeUnitMix = useCallback(() => {
    if (property.overrides?.unitMix) {
      return property.overrides.unitMix;
    }
    
    if (property.UNIT_MIX && property.UNIT_MIX.length > 0) {
      return property.UNIT_MIX;
    }
    
    // If no unit mix exists, create a default based on UNITS_FINAL and NO_UNITS_MF
    // Use the same logic as the API to distribute bedrooms evenly without fractional units
    if (property.UNITS_FINAL && property.UNITS_FINAL > 0) {
      const totalUnits = property.UNITS_FINAL;
      const totalBedrooms = property.NO_UNITS_MF || totalUnits * 2; // Default to 2 bedrooms per unit if NO_UNITS_MF is not available
      
      // Calculate average bedrooms per unit
      const avgBedrooms = totalBedrooms / totalUnits;
      
      // Distribute bedrooms evenly without fractional units
      const floorAvg = Math.floor(avgBedrooms);
      const remainder = totalBedrooms - (floorAvg * totalUnits);
      
      const defaultUnitMix: any[] = [];
      
      // Add units with floor average bedrooms
      if (floorAvg > 0) {
        defaultUnitMix.push({ 
          bedrooms: floorAvg, 
          count: totalUnits - remainder
        });
      }
      
      // Add units with one extra bedroom to handle remainder
      if (remainder > 0) {
        defaultUnitMix.push({ 
          bedrooms: floorAvg + 1, 
          count: remainder
        });
      }
      
      // If we have no units yet (edge case), default to 2-bedroom units
      if (defaultUnitMix.length === 0) {
        defaultUnitMix.push({ 
          bedrooms: 2, 
          count: totalUnits
        });
      }
      
      return defaultUnitMix;
    }
    
    return [];
  }, [property.overrides?.unitMix, property.UNIT_MIX, property.UNITS_FINAL, property.NO_UNITS_MF]);

  // Calculate monthly gross income
  const calculateMonthlyGross = useCallback(() => {
    const unitMix = initializeUnitMix();
    return unitMix.reduce((total, unit) => {
      const rent = unit.rent || getRentForBedrooms(unit.bedrooms, property.ZIP_CODE);
      return total + (rent * unit.count);
    }, 0);
  }, [initializeUnitMix, property.ZIP_CODE, getRentForBedrooms]);

  // Calculate annual gross income
  const calculateAnnualGross = useCallback((monthlyGross: number) => {
    return monthlyGross * 12;
  }, []);

  // Calculate operating expenses
  const calculateOperatingExpenses = useCallback(() => {
    const opex = property.overrides.opex || {};
    return Object.values(opex).reduce((total, expense) => total + (expense || 0), 0);
  }, [property.overrides.opex]);

  // Calculate NOI (Net Operating Income)
  const calculateNOI = useCallback((annualGross: number, opex: number) => {
    return annualGross - opex;
  }, []);

  // Calculate loan amount
  const calculateLoanAmount = useCallback((noi: number) => {
    const offerPrice = property.overrides.offerPrice || property.LIST_PRICE;
    const downPayment = property.overrides.downPayment || 0.20;
    return offerPrice * (1 - downPayment);
  }, [property.overrides.offerPrice, property.overrides.downPayment, property.LIST_PRICE]);

  // Calculate annual debt service
  const calculateAnnualDebtService = useCallback((loanAmount: number) => {
    const interestRate = property.overrides.interestRate || 0.07;
    const loanTerm = property.overrides.loanTerm || 30;
    
    if (interestRate === 0) return 0;
    
    const monthlyRate = interestRate / 12;
    const numberOfPayments = loanTerm * 12;
    
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    return monthlyPayment * 12;
  }, [property.overrides.interestRate, property.overrides.loanTerm]);

  // Calculate DSCR (Debt Service Coverage Ratio)
  const calculateDSCR = useCallback((noi: number, annualDebtService: number) => {
    if (annualDebtService === 0) return 0;
    return noi / annualDebtService;
  }, []);

  // Calculate cap rate at ask
  const calculateCapRateAtAsk = useCallback((noi: number) => {
    const offerPrice = property.overrides.offerPrice || property.LIST_PRICE;
    if (offerPrice === 0) return 0;
    return (noi / offerPrice) * 100;
  }, [property.overrides.offerPrice, property.LIST_PRICE]);

  // Calculate complete analysis
  const calculateAnalysis = useCallback(() => {
    const monthlyGross = calculateMonthlyGross();
    const annualGross = calculateAnnualGross(monthlyGross);
    const opex = calculateOperatingExpenses();
    const noi = calculateNOI(annualGross, opex);
    const loanAmount = calculateLoanAmount(noi);
    const annualDebtService = calculateAnnualDebtService(loanAmount);
    const dscr = calculateDSCR(noi, annualDebtService);
    const capAtAsk = calculateCapRateAtAsk(noi);

    const analysis: PropertyAnalysis = {
      monthlyGross,
      annualGross,
      opex,
      noi,
      loanSized: loanAmount,
      annualDebtService,
      dscr,
      capAtAsk
    };

    return analysis;
  }, [
    calculateMonthlyGross,
    calculateAnnualGross,
    calculateOperatingExpenses,
    calculateNOI,
    calculateLoanAmount,
    calculateAnnualDebtService,
    calculateDSCR,
    calculateCapRateAtAsk
  ]);

  // Update property
  const updateProperty = useCallback((updates: Partial<Property>) => {
    setProperty(prev => {
      const newProperty = { ...prev, ...updates };
      const newAnalysis = calculateAnalysis();
      const updatedProperty = { ...newProperty, analysis: newAnalysis };
      
      // Notify parent component of analysis update
      options.onAnalysisUpdate?.(newAnalysis);
      
      return updatedProperty;
    });
  }, [calculateAnalysis, options.onAnalysisUpdate]);

  // Update overrides
  const updateOverrides = useCallback((updates: Partial<PropertyOverrides>) => {
    setProperty(prev => {
      const newOverrides = { ...prev.overrides, ...updates };
      const newProperty = { ...prev, overrides: newOverrides };
      const newAnalysis = calculateAnalysis();
      const updatedProperty = { ...newProperty, analysis: newAnalysis };
      
      // Notify parent component of analysis update
      options.onAnalysisUpdate?.(newAnalysis);
      
      return updatedProperty;
    });
  }, [calculateAnalysis, options.onAnalysisUpdate]);

  // Update unit mix
  const updateUnitMix = useCallback((unitMix: UnitMix[]) => {
    updateOverrides({ unitMix });
  }, [updateOverrides]);

  // Get current unit mix (overrides or default)
  const currentUnitMix = property.overrides.unitMix || property.UNIT_MIX;

  return {
    // State
    property,
    bhaRentalData,
    loading,
    error,
    currentUnitMix,
    
    // Actions
    updateProperty,
    updateOverrides,
    updateUnitMix,
    
    // Calculations
    calculateAnalysis,
    getRentForBedrooms,
    calculateMonthlyGross,
    calculateAnnualGross,
    calculateOperatingExpenses,
    calculateNOI,
    calculateLoanAmount,
    calculateAnnualDebtService,
    calculateDSCR,
    calculateCapRateAtAsk,
  };
}
