import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUndoRedo } from '../../lib/undo-redo-context';
import { useKeyboardShortcuts } from '../../lib/use-keyboard-shortcuts';
import { API_ENDPOINTS } from '../../lib/config';

import { calculateCompComparisons, formatCompComparison, getCompTooltipText, getUnitRange } from '../../lib/comp-analysis';
import { PercentageInput } from '../../components/ui/percentage-input';

interface UnitMix {
  bedrooms: number;
  count: number;
  rent?: number;
}

interface Property {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  STATE: string;
  ZIP_CODE: string;
  LIST_PRICE: number;
  SALE_PRICE: number | null;
  TAXES: number;
  NO_UNITS_MF: number;
  UNITS_FINAL: number;
  UNIT_MIX: UnitMix[];
  analysis: {
    monthlyGross: number;
    annualGross: number;
    opex: number;
    noi: number;
    loanSized: number;
    annualDebtService: number;
    dscr: number;
    capAtAsk: number;
  };
  overrides: {
    unitMix?: UnitMix[];
    monthlyRent?: number;
    offerPrice?: number;
    vacancy?: number;
         opex?: {
       waterSewer?: number;
       commonElec?: number;
       rubbish?: number;
       insurance?: number;
       pm?: number;
       repairs?: number;
       legal?: number;
       capex?: number;
       taxes?: number;
       licensing?: number;
     };
    downPayment?: number;
    interestRate?: number;
    loanTerm?: number;
    closingCostsPercentage?: number;
    dueDiligencePercentage?: number;
  };
}

export default function PropertyDetails() {
  const router = useRouter();
  const { LIST_NO } = router.query;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bhaRentalData, setBhaRentalData] = useState<any>(null);
  const [compsData, setCompsData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'annual' | 'monthly'>('annual');

  
  // Undo/Redo integration
  const { setState: setUndoState, state: undoState, canUndo, canRedo, undo, redo } = useUndoRedo();
  useKeyboardShortcuts();

  // Effect to restore property state from undo/redo
  useEffect(() => {
    if (undoState && undoState.type === 'property-update' && undoState.property) {
      // Only update if the property is different
      if (!property || JSON.stringify(undoState.property) !== JSON.stringify(property)) {
        setProperty(undoState.property);
        
        // Update server with the restored state
        const updateServer = async () => {
          try {
            const response = await fetch(API_ENDPOINTS.propertyOverrides(LIST_NO as string), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(undoState.property.overrides)
            });
            
            if (!response.ok) {
              console.error('Failed to update server overrides during undo/redo');
            }
          } catch (err) {
            console.error('Failed to update overrides during undo/redo:', err);
          }
        };
        
        updateServer();
      }
    }
  }, [undoState, property, LIST_NO]);

  // Function to get rent for specific bedroom count from BHA data only (no overrides)
  const getBhaRentForBedrooms = (bedrooms: number, zipCode: string): number => {
    if (!bhaRentalData) return 0;
    
    const zipData = bhaRentalData.rents?.find((item: any) => item.zip === zipCode);
    if (!zipData) return 0;
    
    const bedroomKey = String(bedrooms);
    return zipData.rents[bedroomKey] || 0;
  };

  useEffect(() => {
    if (!LIST_NO) return;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        
        // Fetch BHA rental data
        const bhaResponse = await fetch(API_ENDPOINTS.rents);
        const bhaData = await bhaResponse.json();
        setBhaRentalData(bhaData);
        
        // Fetch comps data
        const compsResponse = await fetch('/api/comps');
        const compsData = await compsResponse.json();
        setCompsData(compsData.listings || []);
        
        // Fetch analysis data
        const analysisResponse = await fetch(API_ENDPOINTS.analyze(LIST_NO as string));
        if (!analysisResponse.ok) {
          throw new Error('Property not found');
        }
        const analysisData = await analysisResponse.json();

        // Fetch complete listing data
        const listingsResponse = await fetch(API_ENDPOINTS.listings);
        const listingsData = await listingsResponse.json();
        const fullListing = listingsData.listings.find((l: any) => String(l.LIST_NO) === String(LIST_NO));
        
        if (!fullListing) {
          throw new Error('Listing not found');
        }

        // Fetch overrides
        const overridesResponse = await fetch(API_ENDPOINTS.propertyOverrides(LIST_NO as string));
        const overrides = overridesResponse.ok ? await overridesResponse.json() : {};

        // Merge complete listing and analysis data
        const updatedProperty = {
          ...fullListing,
          analysis: analysisData.analysis,
          overrides
        };

        console.log('Analysis data received:', analysisData);
        console.log('Full listing data:', fullListing);
        console.log('Merged property:', updatedProperty);

        setProperty(updatedProperty);
        
        // Initialize undo/redo state with the loaded property
        setUndoState({
          type: 'property-update',
          property: updatedProperty,
          timestamp: Date.now()
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [LIST_NO]);

  const syncUnitMixToTotal = () => {
    if (!property) return;
    
    const listingTotal = property.UNITS_FINAL;
    const currentTotal = property.overrides?.unitMix?.reduce((sum, u) => sum + u.count, 0) || 0;
    
    if (currentTotal === 0) {
      // If no unit mix, default to 1-bedroom units
      const newUnitMix = [{ bedrooms: 1, count: listingTotal }];
      updateOverrides({ unitMix: newUnitMix });
    } else {
      // Scale existing unit mix proportionally
      const scale = listingTotal / currentTotal;
      const scaledUnitMix = property.overrides!.unitMix!.map(unit => ({
        ...unit,
        count: Math.round(unit.count * scale)
      }));
      
      // Adjust first unit to ensure exact total
      const adjustedTotal = scaledUnitMix.reduce((sum, u) => sum + u.count, 0);
      if (adjustedTotal !== listingTotal && scaledUnitMix.length > 0) {
        scaledUnitMix[0].count += (listingTotal - adjustedTotal);
      }
      
      updateOverrides({ unitMix: scaledUnitMix });
    }
  };

  const updateOverrides = async (updates: any, skipServerUpdate = false) => {
    if (!property) return;
    
    const newProperty = { ...property, overrides: { ...(property.overrides || {}), ...updates } };
    
    // Update local state immediately
    setProperty(newProperty);
    
    // Save to undo/redo system
    setUndoState({
      type: 'property-update',
      property: newProperty,
      timestamp: Date.now()
    });
    
    // Update server unless this is a restoration from undo/redo
    if (!skipServerUpdate) {
      try {
        const response = await fetch(API_ENDPOINTS.propertyOverrides(LIST_NO as string), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProperty.overrides)
        });
        
        if (!response.ok) {
          console.error('Failed to update server overrides');
        }
      } catch (err) {
        console.error('Failed to update overrides:', err);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        Loading property details...
      </div>
    );
  }

  if (error || !property) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <h1>Error</h1>
        <p>{error || 'Property not found'}</p>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', marginTop: '16px' }}>
          Go Back
        </button>
      </div>
    );
  }

  // Function to initialize unit mix if none exists
  const initializeUnitMix = (): UnitMix[] => {
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
      
      const defaultUnitMix: UnitMix[] = [];
      
      // Add units with floor average bedrooms
      if (floorAvg > 0) {
        defaultUnitMix.push({ 
          bedrooms: floorAvg, 
          count: totalUnits - remainder,
          rent: getBhaRentForBedrooms(floorAvg, property.ZIP_CODE)
        });
      }
      
      // Add units with one extra bedroom to handle remainder
      if (remainder > 0) {
        defaultUnitMix.push({ 
          bedrooms: floorAvg + 1, 
          count: remainder,
          rent: getBhaRentForBedrooms(floorAvg + 1, property.ZIP_CODE)
        });
      }
      
      // If we have no units yet (edge case), default to 2-bedroom units
      if (defaultUnitMix.length === 0) {
        defaultUnitMix.push({ 
          bedrooms: 2, 
          count: totalUnits,
          rent: getBhaRentForBedrooms(2, property.ZIP_CODE)
        });
      }
      
      // Save this default to overrides so it persists
      updateOverrides({ unitMix: defaultUnitMix });
      return defaultUnitMix;
    }
    
    return [];
  };

  // Use overrides or fall back to original data
  const currentUnitMix: UnitMix[] = initializeUnitMix();
  
  // Function to get rent for specific bedroom count - check overrides first, then BHA data
  const getRentForBedrooms = (bedrooms: number, zipCode: string): number => {
    // Check if there's a custom rent override for this bedroom type
    const unitOverride = currentUnitMix.find((unit: UnitMix) => unit.bedrooms === bedrooms);
    if (unitOverride && unitOverride.rent) {
      return unitOverride.rent;
    }
    
    // Fall back to BHA data
    return getBhaRentForBedrooms(bedrooms, zipCode);
  };
  const monthlyRent = property.overrides?.monthlyRent || property.analysis.monthlyGross;
  const downPayment = property.overrides?.downPayment ?? 0.20;
  const interestRate = property.overrides?.interestRate ?? 0.07;
  const loanTerm = property.overrides?.loanTerm || 30;
  const vacancy = property.overrides?.vacancy ?? 0.02; // Default to 2%
  
  // Offer price - use override or default to list price
  const offerPrice = property.overrides?.offerPrice ?? property.LIST_PRICE;
  const offerPricePercent = (offerPrice / property.LIST_PRICE) * 100;

     // Dynamic OPEX defaults calculation function
     const calculateOpexDefaults = () => {
       // 1. Vacancy defaults to 2%
       const defaultVacancy = 0.02;
       
       // 2. Taxes: use TAXES value unless it's exactly $9,999, then use Purchase Price * 0.0015
       let defaultTaxes;
       if (property.TAXES === 9999) {
         defaultTaxes = offerPrice * 0.0015;
       } else {
         defaultTaxes = property.TAXES || 0;
       }
       
       // 3. Insurance defaults to $2,000
       const defaultInsurance = 2000;
       
       // 4. Water/Sewer: $400 * number of units
       const defaultWaterSewer = (property.UNITS_FINAL || 0) * 400;
       
       // 5. Rubbish Removal defaults to $1,000
       const defaultRubbish = 1000;
       
       // 6. Maint/Repairs: 3% of effective gross income
       const effectiveGrossForDefaults = annualGross * (1 - defaultVacancy);
       const defaultRepairs = effectiveGrossForDefaults * 0.03;
       
       // 7. Property Management: 8% of effective gross income
       const defaultPM = effectiveGrossForDefaults * 0.08;
       
       // 8. Licensing & Permits defaults to $0
       const defaultLicensing = 0;
       
       // 9. Legal & Professional Fees defaults to $1,000
       const defaultLegal = 1000;
       
       // 10. Capital Reserve: 2% of effective gross income
       const defaultCapex = effectiveGrossForDefaults * 0.02;
       
       // Common Electric: keep as percentage of total OPEX for now
       const defaultCommonElec = property.analysis.opex * 0.10;
       
       return {
         waterSewer: defaultWaterSewer,
         commonElec: defaultCommonElec,
         rubbish: defaultRubbish,
         insurance: defaultInsurance,
         pm: defaultPM,
         repairs: defaultRepairs,
         legal: defaultLegal,
         capex: defaultCapex,
         taxes: defaultTaxes,
         licensing: defaultLicensing
       };
     };
     
     // Get OPEX values - use overrides if they exist, otherwise use calculated defaults
     // Note: opexDefaults will be calculated after annualGross is defined
  // Calculate derived values
  const unitMixTotal = currentUnitMix.length > 0 
    ? currentUnitMix.reduce((sum: number, u: UnitMix) => sum + u.count, 0)
    : 0;
  
  // Use UNITS_FINAL if unit mix is empty or doesn't account for all units
  const totalUnits = unitMixTotal > 0 && unitMixTotal === (property.UNITS_FINAL || 0)
    ? unitMixTotal
    : (property.UNITS_FINAL || 0);
    
  const totalBedrooms = currentUnitMix.length > 0 && unitMixTotal === (property.UNITS_FINAL || 0)
    ? currentUnitMix.reduce((sum: number, u: UnitMix) => sum + (u.bedrooms * u.count), 0)
    : (property.UNITS_FINAL || 0) * 2; // Default to 2 bedrooms per unit if no unit mix or incomplete unit mix
  const averageBedrooms = totalUnits > 0 ? totalBedrooms / totalUnits : 0;
  
  // Calculate price per unit and price per bedroom
  const pricePerUnit = totalUnits > 0 ? offerPrice / totalUnits : 0;
  const pricePerBedroom = totalBedrooms > 0 ? offerPrice / totalBedrooms : 0;
  
  // Calculate comp comparisons
  const compComparisons = calculateCompComparisons(
    offerPrice,
    totalUnits,
    totalBedrooms,
    property.ZIP_CODE,
    compsData
  );
  
  const unitRange = getUnitRange(totalUnits);
  const unitRangeLabel = unitRange ? unitRange.label : '';
  
  // Debug logging
  console.log('Comp comparison debug:', {
    offerPrice,
    totalUnits,
    totalBedrooms,
    zipCode: property.ZIP_CODE,
    compsDataLength: compsData.length,
    compComparisons,
    unitRangeLabel
  });
  
  // Calculate annual gross based on unit mix and individual unit rents
  const annualGross = currentUnitMix.length > 0 && unitMixTotal === (property.UNITS_FINAL || 0)
    ? currentUnitMix.reduce((total, unit) => {
        const unitRent = getRentForBedrooms(unit.bedrooms, property.ZIP_CODE);
        return total + (unitRent * unit.count * 12);
      }, 0)
    : (property.analysis?.monthlyGross || 0) * 12; // Fall back to property's monthly gross if no unit mix or incomplete unit mix
  
  // Now calculate OPEX defaults since annualGross is available
  const opexDefaults = calculateOpexDefaults();
  const opex = property.overrides?.opex || opexDefaults;
  const totalOpex = Object.values(opex).reduce((sum, val) => sum + (val || 0), 0);
  
  const vacancyAmount = annualGross * vacancy;
  const effectiveGrossIncome = annualGross - vacancyAmount;
  const noi = effectiveGrossIncome - totalOpex;
  const loanAmount = offerPrice * (1 - downPayment);
  const monthlyPayment = (loanAmount * (interestRate / 12) * Math.pow(1 + interestRate / 12, loanTerm * 12)) / (Math.pow(1 + interestRate / 12, loanTerm * 12) - 1);
  const annualDebtService = monthlyPayment * 12;
  const dscr = noi / annualDebtService;
  const capRate = noi / offerPrice;
  const monthlyCashFlow = (noi / 12) - monthlyPayment;
  const closingCostsPercentage = property.overrides?.closingCostsPercentage ?? 0.03;
  const dueDiligencePercentage = property.overrides?.dueDiligencePercentage ?? 0.01;
  const equityRequired = (offerPrice * downPayment) + (offerPrice * closingCostsPercentage) + (offerPrice * dueDiligencePercentage); // Down payment + closing costs + due diligence
  const returnOnCapital = (monthlyCashFlow * 12) / equityRequired;

  console.log('Debug values:', {
    property: property,
    currentUnitMix,
    unitMixTotal,
    totalUnits,
    totalBedrooms,
    propertyUNITS_FINAL: property.UNITS_FINAL,
    propertyOverrides: property.overrides,
    monthlyRent,
    opex,
    totalOpex,
    annualGross,
    noi,
    loanAmount,
    monthlyPayment,
    annualDebtService,
    dscr,
    capRate
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

  // Format percentage - general purpose
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Format return on capital - 1 decimal place
  const formatReturnOnCapital = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
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

  // Helper functions for annual/monthly conversion
  const toDisplayValue = (annualValue: number) => {
    return viewMode === 'monthly' ? annualValue / 12 : annualValue;
  };

  const fromDisplayValue = (displayValue: number) => {
    return viewMode === 'monthly' ? displayValue * 12 : displayValue;
  };

  const getDisplayLabel = () => {
    return viewMode === 'monthly' ? 'Monthly ($)' : 'Annual ($)';
  };

  // Helper function to update value from percentage input
  const updateFromPercentage = (percentage: number, field: string) => {
    const newAnnualValue = (percentage / 100) * annualGross;
    updateOverrides({ [field]: newAnnualValue });
  };

  // Helper function to update value from dollar input
  const updateFromDollar = (dollarValue: number, field: string) => {
    const newAnnualValue = fromDisplayValue(dollarValue);
    updateOverrides({ [field]: newAnnualValue });
  };

  // Helper function to format input value for display
  const formatInputValue = (value: number, type: 'currency' | 'percentage') => {
    if (type === 'currency') {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.round(value));
    } else if (type === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toString();
  };

  // Helper function to parse formatted input value
  const parseInputValue = (formattedValue: string, type: 'currency' | 'percentage') => {
    if (type === 'currency') {
      // Remove currency symbols and commas, then parse
      const cleanValue = formattedValue.replace(/[$,]/g, '');
      return parseFloat(cleanValue) || 0;
    } else if (type === 'percentage') {
      // Remove % symbol and parse
      const cleanValue = formattedValue.replace(/%/g, '');
      return (parseFloat(cleanValue) || 0) / 100;
    }
    return parseFloat(formattedValue) || 0;
  };



  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header Box - Full Width */}
      <div style={{
              background: '#f8f9fa', 
              border: '1px solid #ddd', 
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Left Side - Undo/Redo Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '8px' 
        }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: canUndo ? '#f8f9fa' : '#e9ecef',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              color: canUndo ? '#495057' : '#6c757d'
            }}
            title="Undo (Ctrl+Z)"
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: canRedo ? '#f8f9fa' : '#e9ecef',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              color: canRedo ? '#495057' : '#6c757d'
            }}
            title="Redo (Ctrl+Y)"
          >
            ↪ Redo
          </button>
        </div>

        {/* Center - Property Address and MLS */}
        <div style={{ 
          textAlign: 'center',
          flex: '1',
          minWidth: '300px'
        }}>
          <h1 style={{ 
            fontSize: '20px', 
                  fontWeight: 'bold', 
            margin: '0 0 4px 0',
            color: '#2c3e50',
            lineHeight: '1.2'
          }}>
            {property.ADDRESS}
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            margin: '0',
            lineHeight: '1.3'
          }}>
            {property.TOWN} {property.STATE} {property.ZIP_CODE} MLS #{property.LIST_NO}
          </p>
            </div>
            
        {/* Right Side - Tip Box */}
            <div style={{ 
          padding: '8px 12px', 
          background: '#e3f2fd', 
          border: '1px solid #2196f3', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#1976d2',
          maxWidth: '300px'
        }}>
          💡 <strong>Tip:</strong> Changes made to editable fields update all calculations throughout the page.
              </div>
            </div>
            
      {/* Main Content Area */}
              <div style={{ 
                display: 'flex',
        gap: '24px'
      }}>
      <main style={{ flex: '1' }}>

      

             {/* Initial Costs and Financing - Side by Side */}
       <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                   {/* Initial Costs */}
          <section style={{ flex: '1' }}>
            <div style={{ 
              background: '#2c3e50', 
              color: 'white', 
              padding: '12px 16px', 
              fontWeight: 'bold',
              fontSize: '16px',
              borderTopLeftRadius: '6px',
              borderTopRightRadius: '6px',
              textAlign: 'center'
            }}>
              Initial Costs
            </div>
            <div style={{ 
              border: '1px solid #ddd', 
              borderTop: 'none',
              padding: '20px',
              background: 'white'
            }}>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px 16px', alignItems: 'center' }}>
                 <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Item</div>
                 <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' }}>$'s</div>
                 <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' }}>%'s</div>
                 <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Notes</div>
                
                                 <div>Purchase Price</div>
                 <div style={{ textAlign: 'center' }}>
                   <input
                     type="text"
                     value={formatInputValue(offerPrice, 'currency')}
                     onChange={(e) => {
                       const newPrice = parseInputValue(e.target.value, 'currency');
                       updateOverrides({ offerPrice: newPrice });
                     }}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '120px',
                       textAlign: 'right',
                       fontSize: '14px',
                       backgroundColor: '#f8f9fa'
                     }}
                   />
                 </div>
                 <div style={{ textAlign: 'center' }}>
                   <PercentageInput
                     value={offerPrice / property.LIST_PRICE}
                     onChange={(value) => updateOverrides({ offerPrice: value * property.LIST_PRICE })}
                     maxValue={1000}
                     minValue={0}
                     precision={1}
                   />
                 </div>
                 <div style={{ fontSize: '14px', color: '#666' }}>
                   of list price
                 </div>
                
                                 <div>Down Payment</div>
                 <div style={{ textAlign: 'center' }}>
                   <input
                     type="text"
                     value={formatCurrency(offerPrice * downPayment)}
                     onChange={(e) => {
                       const newAmount = parseInputValue(e.target.value, 'currency');
                       const newPercentage = newAmount / offerPrice;
                       if (newPercentage >= 0 && newPercentage <= 1) {
                         updateOverrides({ downPayment: newPercentage });
                       }
                     }}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '120px',
                       textAlign: 'right',
                       fontSize: '14px',
                       backgroundColor: '#f8f9fa'
                     }}
                   />
                 </div>
                 <div style={{ textAlign: 'center' }}>
                   <PercentageInput
                     value={downPayment}
                     onChange={(value) => updateOverrides({ downPayment: value })}
                     maxValue={100}
                     minValue={0}
                     precision={1}
                   />
                 </div>
                 <div style={{ fontSize: '14px', color: '#666' }}>
                   of purchase price
                 </div>
                
                                 <div>Closing Costs</div>
                 <div style={{ textAlign: 'center' }}>
                   <input
                     type="text"
                     value={formatCurrency(offerPrice * closingCostsPercentage)}
                     onChange={(e) => {
                       const newAmount = parseInputValue(e.target.value, 'currency');
                       const newPercentage = newAmount / offerPrice;
                       if (newPercentage >= 0 && newPercentage <= 1) {
                         updateOverrides({ closingCostsPercentage: newPercentage });
                       }
                     }}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '120px',
                       textAlign: 'right',
                       fontSize: '14px',
                       backgroundColor: '#f8f9fa'
                     }}
                   />
                 </div>
                 <div style={{ textAlign: 'center' }}>
                   <PercentageInput
                     value={closingCostsPercentage}
                     onChange={(value) => updateOverrides({ closingCostsPercentage: value })}
                     maxValue={100}
                     minValue={0}
                     precision={1}
                   />
                 </div>
                 <div style={{ fontSize: '14px', color: '#666' }}>
                   of purchase price
                 </div>
                
                                 <div>Due Diligence</div>
                 <div style={{ textAlign: 'center' }}>
                   <input
                     type="text"
                     value={formatCurrency(offerPrice * dueDiligencePercentage)}
                     onChange={(e) => {
                       const newAmount = parseInputValue(e.target.value, 'currency');
                       const newPercentage = newAmount / offerPrice;
                       if (newPercentage >= 0 && newPercentage <= 1) {
                         updateOverrides({ dueDiligencePercentage: newPercentage });
                       }
                     }}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '120px',
                       textAlign: 'right',
                       fontSize: '14px',
                       backgroundColor: '#f8f9fa'
                     }}
                   />
                 </div>
                 <div style={{ textAlign: 'center' }}>
                   <PercentageInput
                     value={dueDiligencePercentage}
                     onChange={(value) => updateOverrides({ dueDiligencePercentage: value })}
                     maxValue={100}
                     minValue={0}
                     precision={1}
                   />
                 </div>
                 <div style={{ fontSize: '14px', color: '#666' }}>
                   of purchase price
                 </div>
                
                                 <div style={{ 
                   fontWeight: 'bold', 
                   borderTop: '2px solid #2c3e50', 
                   paddingTop: '8px',
                   gridColumn: '1 / 2'
                 }}>
                   Total Equity Required
                 </div>
                 <div style={{ 
                   fontWeight: 'bold', 
                   textAlign: 'right', 
                   borderTop: '2px solid #2c3e50', 
                   paddingTop: '8px',
                   gridColumn: '2 / 3'
                 }}>
                   {formatCurrency(equityRequired)}
                 </div>
                 <div style={{ gridColumn: '3 / 4' }}></div>
                 <div style={{ gridColumn: '4 / 5' }}></div>
              </div>
            </div>
          </section>

         {/* Financing */}
         <section style={{ flex: '1' }}>
           <div style={{ 
             background: '#2c3e50', 
             color: 'white', 
             padding: '12px 16px', 
             fontWeight: 'bold',
             fontSize: '16px',
             borderTopLeftRadius: '6px',
             borderTopRightRadius: '6px',
             textAlign: 'center'
           }}>
             Financing
           </div>
           <div style={{ 
             border: '1px solid #ddd', 
             borderTop: 'none',
             padding: '20px',
             background: '#f8f9fa'
           }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
               <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Item</div>
               <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Amount/Rate</div>
               <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Terms</div>
               
               <div>Loan Amount</div>
               <div style={{ textAlign: 'right' }}>{formatCurrency(loanAmount)}</div>
                            <div>{formatLTV(1 - downPayment)} LTV</div>
               
                            <div>Interest Rate</div>
                <div style={{ textAlign: 'right' }}>
                  <PercentageInput
                    value={interestRate}
                    onChange={(value) => updateOverrides({ interestRate: value })}
                    maxValue={20}
                    minValue={0}
                    precision={2}
                  />
                </div>
                <div>Annual Rate</div>
                
                               <div>Loan Term</div>
               <div style={{ textAlign: 'right' }}>
                 <input
                   type="number"
                   value={Math.round(loanTerm)}
                   onChange={(e) => updateOverrides({ loanTerm: Number(e.target.value) })}
                   style={{ 
                     padding: '4px', 
                     border: '1px solid #ddd', 
                     borderRadius: '4px',
                     width: '80px',
                     textAlign: 'right',
                     fontSize: '14px'
                   }}
                 />
               </div>
               <div>Years</div>
             </div>
           </div>
         </section>
       </div>

                           {/* Operating Budget */}
        <section style={{ marginBottom: '24px' }}>
          <div style={{ 
            background: '#2c3e50', 
            color: 'white', 
            padding: '12px 16px', 
            fontWeight: 'bold',
            fontSize: '16px',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            textAlign: 'center'
          }}>
            Operating Budget
          </div>
          <div style={{ 
            border: '1px solid #ddd', 
            borderTop: 'none',
            padding: '20px',
            background: '#f8f9fa'
          }}>
            {/* Unit Mix Section - Separate from financial grid */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px' }}>Rent Details by Unit</div>
              {currentUnitMix.length > 0 && unitMixTotal === (property.UNITS_FINAL || 0) ? (
                <React.Fragment>
                  {currentUnitMix.map((unit, index) => {
                    const unitRent = unit.rent || getRentForBedrooms(unit.bedrooms, property.ZIP_CODE);
                    const unitAnnualRent = unitRent * unit.count * 12;
                    return (
                      <div key={index} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <select
                          value={unit.bedrooms}
                          onChange={(e) => {
                            const newBedrooms = parseInt(e.target.value);
                            const newRent = getRentForBedrooms(newBedrooms, property.ZIP_CODE);
                            const updatedUnitMix = currentUnitMix.map((u, i) => 
                              i === index ? { ...u, bedrooms: newBedrooms, rent: newRent } : u
                            );
                            updateOverrides({ unitMix: updatedUnitMix });
                          }}
                          style={{ 
                            padding: '2px 4px', 
                            border: '1px solid #ddd', 
                            borderRadius: '3px',
                            width: '60px',
                            fontSize: '11px'
                          }}
                        >
                          <option value={0}>0-BR</option>
                          <option value={1}>1-BR</option>
                          <option value={2}>2-BR</option>
                          <option value={3}>3-BR</option>
                          <option value={4}>4-BR</option>
                          <option value={5}>5-BR</option>
                        </select>
                        <select
                          value={unit.count}
                          onChange={(e) => {
                            const newCount = parseInt(e.target.value);
                            const updatedUnitMix = currentUnitMix.map((u, i) => 
                              i === index ? { ...u, count: newCount } : u
                            );
                            updateOverrides({ unitMix: updatedUnitMix });
                          }}
                          style={{ 
                            padding: '2px 4px', 
                            border: '1px solid #ddd', 
                            borderRadius: '3px',
                            width: '50px',
                            fontSize: '11px'
                          }}
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: '11px' }}>@</span>
                        <input
                          type="text"
                          value={formatInputValue(unitRent, 'currency')}
                          onChange={(e) => {
                            const newRent = parseInputValue(e.target.value, 'currency');
                            const updatedUnitMix = currentUnitMix.map((u, i) => 
                              i === index ? { ...u, rent: newRent } : u
                            );
                            updateOverrides({ unitMix: updatedUnitMix });
                          }}
                          style={{ 
                            padding: '2px 4px', 
                            border: '1px solid #ddd', 
                            borderRadius: '3px',
                            width: '70px',
                            textAlign: 'right',
                            fontSize: '11px'
                          }}
                        />
                        <span style={{ fontSize: '11px' }}>/mo</span>
                        <button
                          onClick={() => {
                            const updatedUnitMix = currentUnitMix.filter((_, i) => i !== index);
                            updateOverrides({ unitMix: updatedUnitMix });
                          }}
                          style={{
                            padding: '1px 4px',
                            fontSize: '10px',
                            background: '#ffebee',
                            border: '1px solid #f44336',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            color: '#d32f2f',
                            marginLeft: '4px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* Add new unit button for existing unit mix */}
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        const newUnit = { bedrooms: 1, count: 1, rent: getRentForBedrooms(1, property.ZIP_CODE) };
                        const updatedUnitMix = [...currentUnitMix, newUnit];
                        updateOverrides({ unitMix: updatedUnitMix });
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '10px',
                        background: '#e8f5e8',
                        border: '1px solid #4caf50',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        color: '#2e7d32'
                      }}
                    >
                      + Add Unit
                    </button>
                  </div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  {/* Dynamic Unit Mix Input */}
                  <div style={{ fontSize: '13px' }}>
                    {currentUnitMix.length > 0 ? (
                      // Show existing unit mix with edit capability
                      currentUnitMix.map((unit, index) => {
                        const unitRent = unit.rent || getRentForBedrooms(unit.bedrooms, property.ZIP_CODE);
                        const unitAnnualRent = unitRent * unit.count * 12;
                        return (
                          <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                              value={unit.bedrooms}
                              onChange={(e) => {
                                const newBedrooms = parseInt(e.target.value);
                                const newRent = getRentForBedrooms(newBedrooms, property.ZIP_CODE);
                                const updatedUnitMix = currentUnitMix.map((u, i) => 
                                  i === index ? { ...u, bedrooms: newBedrooms, rent: newRent } : u
                                );
                                updateOverrides({ unitMix: updatedUnitMix });
                              }}
                              style={{ 
                                padding: '2px 4px', 
                                border: '1px solid #ddd', 
                                borderRadius: '3px',
                                width: '60px',
                                fontSize: '11px'
                              }}
                            >
                              <option value={0}>0-BR</option>
                              <option value={1}>1-BR</option>
                              <option value={2}>2-BR</option>
                              <option value={3}>3-BR</option>
                              <option value={4}>4-BR</option>
                              <option value={5}>5-BR</option>
                            </select>
                            <select
                              value={unit.count}
                              onChange={(e) => {
                                const newCount = parseInt(e.target.value);
                                const updatedUnitMix = currentUnitMix.map((u, i) => 
                                  i === index ? { ...u, count: newCount } : u
                                );
                                updateOverrides({ unitMix: updatedUnitMix });
                              }}
                              style={{ 
                                padding: '2px 4px', 
                                border: '1px solid #ddd', 
                                borderRadius: '3px',
                                width: '50px',
                                fontSize: '11px'
                              }}
                            >
                              {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                            <span style={{ fontSize: '11px' }}>@</span>
                            <input
                              type="text"
                              value={formatInputValue(unitRent, 'currency')}
                              onChange={(e) => {
                                const newRent = parseInputValue(e.target.value, 'currency');
                                const updatedUnitMix = currentUnitMix.map((u, i) => 
                                  i === index ? { ...u, rent: newRent } : u
                                );
                                updateOverrides({ unitMix: updatedUnitMix });
                              }}
                              style={{ 
                                padding: '2px 4px', 
                                border: '1px solid #ddd', 
                                borderRadius: '3px',
                                width: '70px',
                                textAlign: 'right',
                                fontSize: '11px'
                              }}
                            />
                            <span style={{ fontSize: '11px' }}>/mo</span>
                            <button
                              onClick={() => {
                                const updatedUnitMix = currentUnitMix.filter((_, i) => i !== index);
                                updateOverrides({ unitMix: updatedUnitMix });
                              }}
                              style={{
                                padding: '1px 4px',
                                fontSize: '10px',
                                background: '#ffebee',
                                border: '1px solid #f44336',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                color: '#d32f2f',
                                marginLeft: '4px'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: '#666', fontStyle: 'italic', marginBottom: '8px' }}>
                        No units defined
                      </div>
                    )}
                    
                    {/* Add new unit button */}
                    <button
                      onClick={() => {
                        const newUnit = { bedrooms: 1, count: 1, rent: getRentForBedrooms(1, property.ZIP_CODE) };
                        const updatedUnitMix = [...currentUnitMix, newUnit];
                        updateOverrides({ unitMix: updatedUnitMix });
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '10px',
                        background: '#e8f5e8',
                        border: '1px solid #4caf50',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        color: '#2e7d32'
                      }}
                    >
                      + Add Unit
                    </button>
                  </div>
                </React.Fragment>
              )}
            </div>

            {/* Financial Data Grid - Properly aligned three columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', lineHeight: '1.2' }}>
              <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Description</div>
              <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>
                {getDisplayLabel()}
                <button
                  onClick={() => setViewMode(viewMode === 'annual' ? 'monthly' : 'annual')}
                  style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    background: '#e3f2fd',
                    border: '1px solid #2196f3',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    color: '#1976d2'
                  }}
                >
                  {viewMode === 'annual' ? '→ Monthly' : '→ Annual'}
                </button>
              </div>
              <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>
                {viewMode === 'monthly' ? 'Monthly (%)' : 'Annual (%)'}
              </div>
              
              {/* Gross Rental Income Total */}
              <div style={{ fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '8px' }}>Gross Rental Income</div>
              <div style={{ fontWeight: 'bold', textAlign: 'right', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                {formatCurrency(toDisplayValue(annualGross))}
              </div>
              <div style={{ fontWeight: 'bold', textAlign: 'right', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                100.0%
              </div>
               
                 {/* Vacancy */}
                 <div>less: Vacancy</div>
                 <div style={{ textAlign: 'right' }}>
                   <input
                     type="text"
                     value={formatInputValue(toDisplayValue(vacancyAmount), 'currency')}
                     onChange={(e) => updateOverrides({ 
                       vacancy: fromDisplayValue(parseInputValue(e.target.value, 'currency')) / annualGross
                     })}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '100px',
                       textAlign: 'right'
                     }}
                   />
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <PercentageInput
                     value={vacancy}
                     onChange={(value) => updateOverrides({ vacancy: value })}
                     maxValue={100}
                     minValue={0}
                     precision={1}
                   />
                 </div>
              
                 {/* Total Effective Gross Income */}
                 <div style={{ fontWeight: 'bold' }}>Total Effective Gross Income</div>
                 <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(toDisplayValue(effectiveGrossIncome))}</div>
                 <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{annualGross > 0 ? `${((effectiveGrossIncome / annualGross) * 100).toFixed(1)}%` : '100.0%'}</div>
               
                 {/* Operating Expenses */}
                 <div>less: Taxes</div>
                 <div style={{ textAlign: 'right' }}>
                   <input
                     type="text"
                     value={formatInputValue(toDisplayValue(opex.taxes || 0), 'currency')}
                     onChange={(e) => updateOverrides({ 
                       opex: { ...opex, taxes: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                     })}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '100px',
                       textAlign: 'right'
                     }}
                   />
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <PercentageInput
                     value={(opex.taxes || 0) / effectiveGrossIncome}
                     onChange={(value) => updateOverrides({ 
                       opex: { ...opex, taxes: value * effectiveGrossIncome }
                     })}
                     maxValue={100}
                     minValue={0}
                     precision={1}
                   />
                 </div>
              
                 <div>less: Insurance</div>
                 <div style={{ textAlign: 'right' }}>
                   <input
                     type="text"
                     value={formatInputValue(toDisplayValue(opex.insurance || 0), 'currency')}
                     onChange={(e) => updateOverrides({ 
                       opex: { ...opex, insurance: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                     })}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '100px',
                       textAlign: 'right'
                     }}
                   />
                 </div>
                                 <div style={{ textAlign: 'right' }}>
                  <PercentageInput
                    value={(opex.insurance || 0) / effectiveGrossIncome}
                    onChange={(value) => updateOverrides({ 
                      opex: { ...opex, insurance: value * effectiveGrossIncome }
                    })}
                    maxValue={100}
                    minValue={0}
                    precision={1}
                  />
                </div>
               
                               <div>less: Water/Sewer</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={formatInputValue(toDisplayValue(opex.waterSewer || 0), 'currency')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, waterSewer: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                    })}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '100px',
                      textAlign: 'right'
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <PercentageInput
                    value={(opex.waterSewer || 0) / effectiveGrossIncome}
                    onChange={(value) => updateOverrides({ 
                      opex: { ...opex, waterSewer: value * effectiveGrossIncome }
                    })}
                    maxValue={100}
                    minValue={0}
                    precision={1}
                  />
                </div>
              
                                                           <div>less: Common Utils (Est)</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={formatInputValue(toDisplayValue(opex.commonElec || 0), 'currency')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, commonElec: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                    })}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '100px',
                      textAlign: 'right'
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <PercentageInput
                    value={(opex.commonElec || 0) / effectiveGrossIncome}
                    onChange={(value) => updateOverrides({ 
                      opex: { ...opex, commonElec: value * effectiveGrossIncome }
                    })}
                    maxValue={100}
                    minValue={0}
                    precision={1}
                  />
                </div>
                
                <div>less: Rubbish Removal</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={formatInputValue(toDisplayValue(opex.rubbish || 0), 'currency')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, rubbish: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                    })}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '100px',
                      textAlign: 'right'
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <PercentageInput
                    value={(opex.rubbish || 0) / effectiveGrossIncome}
                    onChange={(value) => updateOverrides({ 
                      opex: { ...opex, rubbish: value * effectiveGrossIncome }
                    })}
                    maxValue={100}
                    minValue={0}
                    precision={1}
                  />
                </div>
               
                                                                                                                               <div>less: Maint/Repairs</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={formatInputValue(toDisplayValue(opex.repairs || 0), 'currency')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, repairs: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                    })}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '100px',
                      textAlign: 'right'
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <PercentageInput
                    value={(opex.repairs || 0) / effectiveGrossIncome}
                    onChange={(value) => updateOverrides({ 
                      opex: { ...opex, repairs: value * effectiveGrossIncome }
                    })}
                    maxValue={100}
                    minValue={0}
                    precision={1}
                  />
                </div>
               
                                                                                                                        <div>less: Prop. Mgt.</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={formatInputValue(toDisplayValue(opex.pm || 0), 'currency')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, pm: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                    })}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '100px',
                      textAlign: 'right'
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <PercentageInput
                    value={(opex.pm || 0) / effectiveGrossIncome}
                    onChange={(value) => updateOverrides({ 
                      opex: { ...opex, pm: value * effectiveGrossIncome }
                    })}
                    maxValue={100}
                    minValue={0}
                    precision={1}
                  />
                </div>
                
                                                                <div>less: Licensing & Permits</div>
                  <div style={{ textAlign: 'right' }}>
                    <input
                      type="text"
                      value={formatInputValue(toDisplayValue(opex.licensing || 0), 'currency')}
                      onChange={(e) => updateOverrides({ 
                        opex: { ...opex, licensing: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                      })}
                      style={{ 
                        padding: '4px', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        width: '100px',
                        textAlign: 'right'
                      }}
                    />
                  </div>
                                    <div style={{ textAlign: 'right' }}>
                     <PercentageInput
                       value={(opex.licensing || 0) / effectiveGrossIncome}
                       onChange={(value) => updateOverrides({ 
                         opex: { ...opex, licensing: value * effectiveGrossIncome }
                       })}
                       maxValue={100}
                       minValue={0}
                       precision={1}
                     />
                  </div>
                
                                <div>less: Legal & Professional Fees</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={formatInputValue(toDisplayValue(opex.legal || 0), 'currency')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, legal: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                    })}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '100px',
                      textAlign: 'right'
                    }}
                  />
                </div>
                                <div style={{ textAlign: 'right' }}>
                   <PercentageInput
                     value={(opex.legal || 0) / effectiveGrossIncome}
                     onChange={(value) => updateOverrides({ 
                       opex: { ...opex, legal: value * effectiveGrossIncome }
                     })}
                     maxValue={100}
                     minValue={0}
                     precision={1}
                   />
                 </div>
                
                 <div>less: Capital Reserve</div>
                 <div style={{ textAlign: 'right' }}>
                   <input
                     type="text"
                     value={formatInputValue(toDisplayValue(opex.capex || 0), 'currency')}
                     onChange={(e) => updateOverrides({ 
                       opex: { ...opex, capex: fromDisplayValue(parseInputValue(e.target.value, 'currency')) }
                     })}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '100px',
                       textAlign: 'right'
                     }}
                   />
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <PercentageInput
                     value={(opex.capex || 0) / effectiveGrossIncome}
                     onChange={(value) => updateOverrides({ 
                       opex: { ...opex, capex: value * effectiveGrossIncome }
                     })}
                     maxValue={100}
                     minValue={0}
                     precision={1}
                   />
                 </div>
              
                 {/* Total Expenses */}
                 <div style={{ fontWeight: 'bold' }}>Total Expenses</div>
                 <div style={{ fontWeight: 'bold', textAlign: 'right' }}>({formatCurrency(Math.round(toDisplayValue(totalOpex)))})</div>
                 <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{effectiveGrossIncome > 0 ? `-${(totalOpex / effectiveGrossIncome * 100).toFixed(1)}%` : '0.0%'}</div>
                 
                 {/* Net Operating Income */}
                 <div style={{ fontWeight: 'bold' }}>Net Operating Income</div>
                 <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(Math.round(toDisplayValue(noi)))}</div>
                 <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{effectiveGrossIncome > 0 ? `${(noi / effectiveGrossIncome * 100).toFixed(1)}%` : '0.0%'}</div>
                 
                 {/* Bank Debt Service */}
                 <div>Bank Debt Service</div>
                 <div style={{ textAlign: 'right' }}>({formatCurrency(Math.round(toDisplayValue(annualDebtService)))})</div>
                 <div style={{ textAlign: 'right' }}>{effectiveGrossIncome > 0 ? `-${(annualDebtService / effectiveGrossIncome * 100).toFixed(1)}%` : '0.0%'}</div>
                 
                 {/* Net Cash Flow */}
                 <div style={{ fontWeight: 'bold' }}>Net Cash Flow</div>
                 <div style={{ fontWeight: 'bold', textAlign: 'right', color: monthlyCashFlow >= 0 ? '#28a745' : '#dc3545' }}>
                   {monthlyCashFlow >= 0 ? formatCurrency(Math.round(toDisplayValue(monthlyCashFlow * 12))) : `(${formatCurrency(Math.round(Math.abs(toDisplayValue(monthlyCashFlow * 12))))})`}
                 </div>
                 <div style={{ fontWeight: 'bold', textAlign: 'right', color: monthlyCashFlow >= 0 ? '#28a745' : '#dc3545' }}>
                   {effectiveGrossIncome > 0 ? `${((monthlyCashFlow * 12) / effectiveGrossIncome * 100).toFixed(1)}%` : '0.0%'}
                 </div>
           </div>
         </div>
       </section>

                   </main>

      {/* Fixed Right Sidebar */}
      <div style={{
        position: 'sticky',
        top: '20px',
        height: 'fit-content',
        width: '320px',
        flexShrink: 0
      }}>
        {/* Back to Listings Button */}
        <div style={{ marginBottom: '16px' }}>
          <button 
            onClick={() => {
              // Build back URL with current filter parameters
              const currentQuery = { ...router.query };
              delete currentQuery.LIST_NO; // Remove the property-specific parameter
              
              router.push({
                pathname: '/listings',
                query: currentQuery
              });
            }}
            style={{ 
              padding: '8px 16px', 
              background: '#f8f9fa', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
              width: '100%'
            }}
          >
            ← Back to Listings
          </button>
        </div>

        {/* Unit Mix Sync Warning */}
        {currentUnitMix.length > 0 && unitMixTotal !== (property.UNITS_FINAL || 0) && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '8px 12px', 
            background: '#fff3cd', 
            border: '1px solid #ffc107', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#856404'
          }}>
            ⚠️ <strong>Unit Mix Mismatch:</strong> Unit mix shows {unitMixTotal} units but property has {property.UNITS_FINAL} units.
            <button
              onClick={syncUnitMixToTotal}
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                fontSize: '10px',
                background: '#28a745',
                border: '1px solid #28a745',
                borderRadius: '3px',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              Sync to {property.UNITS_FINAL} units
            </button>
          </div>
        )}

        {/* Key Metrics */}
        <div style={{ 
          background: '#2c3e50', 
          color: 'white', 
          padding: '16px 20px', 
          fontWeight: 'bold',
          fontSize: '18px',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          textAlign: 'center'
        }}>
          Key Metrics
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          borderTop: 'none',
          padding: '24px',
          background: '#f8f9fa'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '16px' 
          }}>
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#dc3545'
                }}>
                  DSCR:
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#dc3545'
                }}>
                  {dscr.toFixed(2)}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666'
              }}>
                {formatLTV(1 - downPayment)} LTV
              </div>
            </div>
            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#2c3e50'
                }}>
                  Cap Rate:
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#2c3e50'
                }}>
                  {formatCapRate(capRate)}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666'
              }}>
                at offer price
              </div>
            </div>
            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#ffc107'
                }}>
                  Return:
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#ffc107'
                }}>
                  {formatReturnOnCapital(returnOnCapital)}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666'
              }}>
                on capital
              </div>
            </div>
            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#dc3545'
                }}>
                  Cash Flow:
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#dc3545'
                }}>
                  {formatCurrency(monthlyCashFlow)}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666'
              }}>
                monthly
              </div>
            </div>
            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#2c3e50'
                }}>
                  Equity:
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#2c3e50'
                }}>
                  {formatCurrency(equityRequired)}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666'
              }}>
                required
              </div>
            </div>
            

            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#17a2b8'
                }}>
                  $/Bed:
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#17a2b8'
                }}>
                  {formatCurrency(pricePerBedroom)}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <span>{totalBedrooms} total beds</span>
                {compComparisons.pricePerBed.compCount > 0 && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: compComparisons.pricePerBed.difference >= 0 ? '#dc3545' : '#28a745',
                    fontStyle: 'italic',
                    textAlign: 'right',
                    maxWidth: '60%',
                    lineHeight: '1.2'
                  }}>
                    <div 
                      style={{ cursor: 'help' }}
                      title={getCompTooltipText(compComparisons.pricePerBed.compCount, unitRangeLabel)}
                    >
                      {formatCompComparison(
                        compComparisons.pricePerBed.difference,
                        compComparisons.pricePerBed.percentage,
                        compComparisons.pricePerBed.compCount
                      ).replace(' over comps', '').replace(' under comps', '')}
                    </div>
                    <div 
                      style={{ fontSize: '11px', marginTop: '2px', cursor: 'help' }}
                      title={getCompTooltipText(compComparisons.pricePerBed.compCount, unitRangeLabel)}
                    >
                      {compComparisons.pricePerBed.difference >= 0 ? 'over comps' : 'under comps'}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Comp Comparison for $/Unit */}
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#28a745'
                }}>
                  $/Unit:
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#28a745'
                }}>
                  {formatCurrency(pricePerUnit)}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <span>{totalUnits} units</span>
                {compComparisons.pricePerUnit.compCount > 0 && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: compComparisons.pricePerUnit.difference >= 0 ? '#dc3545' : '#28a745',
                    fontStyle: 'italic',
                    textAlign: 'right',
                    maxWidth: '60%',
                    lineHeight: '1.2'
                  }}>
                    <div 
                      style={{ cursor: 'help' }}
                      title={getCompTooltipText(compComparisons.pricePerUnit.compCount, unitRangeLabel)}
                    >
                      {formatCompComparison(
                        compComparisons.pricePerUnit.difference,
                        compComparisons.pricePerUnit.percentage,
                        compComparisons.pricePerUnit.compCount
                      ).replace(' over comps', '').replace(' under comps', '')}
                    </div>
                    <div 
                      style={{ fontSize: '11px', marginTop: '2px', cursor: 'help' }}
                      title={getCompTooltipText(compComparisons.pricePerUnit.compCount, unitRangeLabel)}
                    >
                      {compComparisons.pricePerUnit.difference >= 0 ? 'over comps' : 'under comps'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
