import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUndoRedo } from '../../lib/undo-redo-context';
import { useKeyboardShortcuts } from '../../lib/use-keyboard-shortcuts';
import { API_ENDPOINTS } from '../lib/config';

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
  const [viewMode, setViewMode] = useState<'annual' | 'monthly'>('annual');
  const [closingCostsInput, setClosingCostsInput] = useState<string>('');
  const [dueDiligenceInput, setDueDiligenceInput] = useState<string>('');
  const [vacancyInput, setVacancyInput] = useState<string>('');
  const [taxesInput, setTaxesInput] = useState<string>('');
  const [insuranceInput, setInsuranceInput] = useState<string>('');
  const [waterSewerInput, setWaterSewerInput] = useState<string>('');
  const [commonElecInput, setCommonElecInput] = useState<string>('');
  const [rubbishInput, setRubbishInput] = useState<string>('');
  const [repairsInput, setRepairsInput] = useState<string>('');
  const [pmInput, setPmInput] = useState<string>('');
  const [licensingInput, setLicensingInput] = useState<string>('');
  const [legalInput, setLegalInput] = useState<string>('');
  const [capexInput, setCapexInput] = useState<string>('');
  
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

  // Function to get rent for specific bedroom count - check overrides first, then BHA data
  const getRentForBedrooms = (bedrooms: number, zipCode: string) => {
    // Check if there's a custom rent override for this bedroom type
    const unitOverride = currentUnitMix.find(unit => unit.bedrooms === bedrooms);
    if (unitOverride && unitOverride.rent) {
      return unitOverride.rent;
    }
    
    // Fall back to BHA data
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
        const bhaResponse = await fetch('/api/rental-rates');
        const bhaData = await bhaResponse.json();
        setBhaRentalData(bhaData);
        
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

  // Use overrides or fall back to original data
  const currentUnitMix = property.overrides?.unitMix || property.UNIT_MIX || [];
  const monthlyRent = property.overrides?.monthlyRent || property.analysis.monthlyGross;
  const downPayment = property.overrides?.downPayment || 0.20;
  const interestRate = property.overrides?.interestRate || 0.07;
  const loanTerm = property.overrides?.loanTerm || 30;
  const vacancy = property.overrides?.vacancy || 0.03; // Default to 3%
  
  // Offer price - use override or default to list price
  const offerPrice = property.overrides?.offerPrice || property.LIST_PRICE;
  const offerPricePercent = (offerPrice / property.LIST_PRICE) * 100;

     // OPEX breakdown - use overrides or defaults
   const opexDefaults = {
     waterSewer: property.analysis.opex * 0.15, // 15% of total OPEX
     commonElec: property.analysis.opex * 0.10, // 10% of total OPEX
     rubbish: property.analysis.opex * 0.05,    // 5% of total OPEX
     pm: property.analysis.opex * 0.10,         // 10% of total OPEX
     repairs: property.analysis.opex * 0.20,    // 20% of total OPEX
     legal: property.analysis.opex * 0.05,      // 5% of total OPEX
     capex: property.analysis.opex * 0.15,      // 15% of total OPEX
     taxes: property.TAXES || 0,                // Property taxes
     licensing: 0                               // Licensing & Permits
   };

  const opex = property.overrides?.opex || opexDefaults;
  const totalOpex = Object.values(opex).reduce((sum, val) => sum + (val || 0), 0);

  // Calculate derived values
  const totalUnits = currentUnitMix.reduce((sum, u) => sum + u.count, 0);
  const totalBedrooms = currentUnitMix.reduce((sum, u) => sum + (u.bedrooms * u.count), 0);
  const averageBedrooms = totalUnits > 0 ? totalBedrooms / totalUnits : 0;
  
  // Calculate annual gross based on unit mix and individual unit rents
  const annualGross = currentUnitMix.reduce((total, unit) => {
    const unitRent = getRentForBedrooms(unit.bedrooms, property.ZIP_CODE);
    return total + (unitRent * unit.count * 12);
  }, 0);
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
    monthlyRent,
    opex,
    totalOpex,
    totalUnits,
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
      display: 'flex',
      gap: '24px',
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Fixed Left Sidebar */}
      <div style={{
        position: 'sticky',
        top: '20px',
        height: 'fit-content',
        width: '320px',
        flexShrink: 0
      }}>
        {/* Header Section */}
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
              fontSize: '13px', 
              color: '#666', 
              margin: '0 0 8px 0',
              lineHeight: '1.3'
            }}>
              {property.TOWN} {property.ZIP_CODE}
            </p>
            <p style={{ 
              fontSize: '13px', 
              color: '#666', 
              margin: '0 0 8px 0',
              lineHeight: '1.3'
            }}>
              MLS #{property.LIST_NO}
            </p>
            <p style={{ 
              fontSize: '13px', 
              color: '#666', 
              margin: '0 0 16px 0',
              lineHeight: '1.3'
            }}>
              {property.UNITS_FINAL}-unit property
            </p>
        </div>

        {/* Editable Fields Note */}
        <div style={{ 
          marginBottom: '16px', 
          padding: '8px 12px', 
          background: '#e3f2fd', 
          border: '1px solid #2196f3', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#1976d2'
        }}>
          💡 <strong>Tip:</strong> Changes made to editable fields update all calculations throughout the page.
        </div>

        {/* Undo/Redo Buttons */}
        <div style={{ 
          marginBottom: '16px',
          display: 'flex', 
          gap: '8px' 
        }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: canUndo ? '#f8f9fa' : '#e9ecef',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              color: canUndo ? '#495057' : '#6c757d',
              flex: '1'
            }}
            title="Undo (Ctrl+Z)"
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: canRedo ? '#f8f9fa' : '#e9ecef',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              color: canRedo ? '#495057' : '#6c757d',
              flex: '1'
            }}
            title="Redo (Ctrl+Y)"
          >
            ↪ Redo
          </button>
        </div>

        {/* Key Metrics Summary */}
        <div style={{ 
          background: '#2c3e50', 
          color: 'white', 
          padding: '16px 20px', 
          fontWeight: 'bold',
          fontSize: '18px',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px'
        }}>
          Key Metrics Summary
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
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: dscr >= 1.2 ? '#28a745' : dscr >= 1.0 ? '#ffc107' : '#dc3545'
              }}>
                DSCR: {dscr.toFixed(2)}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666', 
                fontStyle: 'italic'
              }}>
                {formatLTV(1 - downPayment)} LTV
              </div>
            </div>
            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#2c3e50'
              }}>
                Cap Rate: {formatCapRate(capRate)}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666', 
                fontStyle: 'italic'
              }}>
                at ask price
              </div>
            </div>
            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: returnOnCapital >= 0.12 ? '#28a745' : '#ffc107'
              }}>
                Return: {formatReturnOnCapital(returnOnCapital)}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666', 
                fontStyle: 'italic'
              }}>
                on capital
              </div>
            </div>
            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: monthlyCashFlow >= 0 ? '#28a745' : '#dc3545'
              }}>
                Cash Flow: {formatCurrency(monthlyCashFlow)}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666', 
                fontStyle: 'italic'
              }}>
                monthly
              </div>
            </div>
            
            <div style={{ 
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#2c3e50'
              }}>
                Equity: {formatCurrency(equityRequired)}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666', 
                fontStyle: 'italic'
              }}>
                required
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
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
             borderTopRightRadius: '6px'
           }}>
             Initial Costs
           </div>
           <div style={{ 
             border: '1px solid #ddd', 
             borderTop: 'none',
             padding: '20px',
             background: '#f8f9fa'
           }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
               <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Item</div>
               <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>$'s</div>
               <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>%'s</div>
               
                            <div>Purchase Price</div>
                                 <div style={{ textAlign: 'right' }}>
                   <input
                     type="text"
                     value={formatInputValue(offerPrice, 'currency')}
                     onChange={(e) => updateOverrides({ offerPrice: parseInputValue(e.target.value, 'currency') })}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '120px',
                       textAlign: 'right',
                       fontSize: '14px'
                     }}
                   />
                 </div>
                              <div>
                                <input
                                  type="text"
                                  value={offerPrice === property.LIST_PRICE ? '100%' : `${(offerPricePercent).toFixed(1)}%`}
                                  onChange={(e) => {
                                    const cleanValue = e.target.value.replace(/%/g, '');
                                    const numValue = parseFloat(cleanValue) || 0;
                                    if (numValue > 0) {
                                      const newOfferPrice = (property.LIST_PRICE * numValue) / 100;
                                      updateOverrides({ offerPrice: newOfferPrice });
                                    }
                                  }}
                                  style={{ 
                                    padding: '4px', 
                                    border: '1px solid #ddd', 
                                    borderRadius: '4px',
                                    width: '80px',
                                    textAlign: 'right',
                                    fontSize: '14px'
                                  }}
                                />
                                <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>of list price</span>
                              </div>
               
                            <div>Down Payment</div>
                                 <div style={{ textAlign: 'right' }}>
                   <input
                     type="text"
                     value={`${Math.round(downPayment * 100)}%`}
                     onChange={(e) => {
                       const cleanValue = e.target.value.replace(/%/g, '');
                       const numValue = parseInt(cleanValue) || 0;
                       if (numValue >= 0 && numValue <= 100) {
                         updateOverrides({ downPayment: numValue / 100 });
                       }
                     }}
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
                              <div>of purchase price</div>
               
                               <div>Closing Costs</div>
                <div style={{ textAlign: 'right' }}>{formatCurrency(offerPrice * closingCostsPercentage)}</div>
                                 <div>
                   <input
                     type="text"
                     value={closingCostsInput || `${(closingCostsPercentage * 100).toFixed(1)}%`}
                     onChange={(e) => {
                       setClosingCostsInput(e.target.value);
                     }}
                     onFocus={(e) => {
                       setClosingCostsInput(e.target.value);
                     }}
                     onBlur={(e) => {
                       const value = e.target.value.replace('%', '');
                       const numValue = parseFloat(value);
                       if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                         updateOverrides({ closingCostsPercentage: numValue / 100 });
                       }
                       setClosingCostsInput('');
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.currentTarget.blur();
                       }
                     }}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '60px',
                       textAlign: 'right',
                       fontSize: '14px'
                     }}
                   />
                 </div>
               
                               <div>Due Diligence</div>
                <div style={{ textAlign: 'right' }}>{formatCurrency(offerPrice * dueDiligencePercentage)}</div>
                                 <div>
                   <input
                     type="text"
                     value={dueDiligenceInput || `${(dueDiligencePercentage * 100).toFixed(1)}%`}
                     onChange={(e) => {
                       setDueDiligenceInput(e.target.value);
                     }}
                     onFocus={(e) => {
                       setDueDiligenceInput(e.target.value);
                     }}
                     onBlur={(e) => {
                       const value = e.target.value.replace('%', '');
                       const numValue = parseFloat(value);
                       if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                         updateOverrides({ dueDiligencePercentage: numValue / 100 });
                       }
                       setDueDiligenceInput('');
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.currentTarget.blur();
                       }
                     }}
                     style={{ 
                       padding: '4px', 
                       border: '1px solid #ddd', 
                       borderRadius: '4px',
                       width: '60px',
                       textAlign: 'right',
                       fontSize: '14px'
                     }}
                   />
                 </div>
               
               <div style={{ fontWeight: 'bold', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>Total Equity Required</div>
               <div style={{ fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>
                 {formatCurrency(equityRequired)}
               </div>
               <div></div>
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
             borderTopRightRadius: '6px'
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
                  <input
                    type="text"
                    value={formatInputValue(interestRate, 'percentage')}
                    onChange={(e) => updateOverrides({ interestRate: parseInputValue(e.target.value, 'percentage') })}
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
            borderTopRightRadius: '6px'
          }}>
            Operating Budget
          </div>
          <div style={{ 
            border: '1px solid #ddd', 
            borderTop: 'none',
            padding: '20px',
            background: '#f8f9fa'
          }}>
                                                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', lineHeight: '1.2' }}>
                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Rental Income</div>
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
              
                                                                                       {/* Unit-level income detail */}
                 {currentUnitMix.map((unit, index) => {
                   const unitRent = getRentForBedrooms(unit.bedrooms, property.ZIP_CODE);
                   const unitAnnualRent = unitRent * unit.count * 12;
                   return (
                     <React.Fragment key={index}>
                       <div style={{ paddingLeft: '20px', fontSize: '13px' }}>
                         {unit.count} {unit.bedrooms}-BR unit{unit.count > 1 ? 's' : ''} @ 
                         <input
                           type="text"
                           value={formatInputValue(unitRent, 'currency')}
                           onChange={(e) => {
                             const newRent = parseInputValue(e.target.value, 'currency');
                             // Update the unit mix with new rent for this bedroom type
                             const updatedUnitMix = currentUnitMix.map((u, i) => 
                               u.bedrooms === unit.bedrooms ? { ...u, rent: newRent } : u
                             );
                             updateOverrides({ unitMix: updatedUnitMix });
                           }}
                           style={{ 
                             padding: '2px 4px', 
                             border: '1px solid #ddd', 
                             borderRadius: '3px',
                             width: '80px',
                             textAlign: 'right',
                             fontSize: '12px',
                             marginLeft: '4px'
                           }}
                         />
                         /mo
                       </div>
                       <div style={{ textAlign: 'right', fontSize: '13px' }}>
                         {formatCurrency(toDisplayValue(unitAnnualRent))}
                       </div>
                       <div style={{ textAlign: 'right', fontSize: '13px' }}>
                         {annualGross > 0 ? `${(unitAnnualRent / annualGross * 100).toFixed(1)}%` : '0.0%'}
                       </div>
                     </React.Fragment>
                   );
                 })}
               
                                            {/* Gross Rental Income Total */}
                 <div style={{ fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '8px' }}>Gross Rental Income</div>
                <div style={{ fontWeight: 'bold', textAlign: 'right' }}>
                  {formatCurrency(toDisplayValue(annualGross))}
                </div>
                <div style={{ fontWeight: 'bold', textAlign: 'right' }}>
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
                  <input
                    type="text"
                    value={vacancyInput || formatInputValue(vacancy, 'percentage')}
                    onChange={(e) => {
                      setVacancyInput(e.target.value);
                    }}
                    onFocus={(e) => {
                      setVacancyInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace('%', '');
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateOverrides({ vacancy: numValue / 100 });
                      }
                      setVacancyInput('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
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
                    <input
                      type="text"
                      value={taxesInput || formatInputValue((opex.taxes || 0) / effectiveGrossIncome, 'percentage')}
                      onChange={(e) => {
                        setTaxesInput(e.target.value);
                      }}
                      onFocus={(e) => {
                        setTaxesInput(e.target.value);
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.replace('%', '');
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                          updateOverrides({ 
                            opex: { ...opex, taxes: (numValue / 100) * effectiveGrossIncome }
                          });
                        }
                        setTaxesInput('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
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
              
                                                                                                                       <div>less: Insurance</div>
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
                  <input
                    type="text"
                    value={insuranceInput || formatInputValue((opex.pm || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => {
                      setInsuranceInput(e.target.value);
                    }}
                    onFocus={(e) => {
                      setInsuranceInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace('%', '');
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateOverrides({ 
                          opex: { ...opex, pm: (numValue / 100) * effectiveGrossIncome }
                        });
                      }
                      setInsuranceInput('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
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
                  <input
                    type="text"
                    value={waterSewerInput || formatInputValue((opex.waterSewer || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => {
                      setWaterSewerInput(e.target.value);
                    }}
                    onFocus={(e) => {
                      setWaterSewerInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace('%', '');
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateOverrides({ 
                          opex: { ...opex, waterSewer: (numValue / 100) * effectiveGrossIncome }
                        });
                      }
                      setWaterSewerInput('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
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
                  <input
                    type="text"
                    value={commonElecInput || formatInputValue((opex.commonElec || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => {
                      setCommonElecInput(e.target.value);
                    }}
                    onFocus={(e) => {
                      setCommonElecInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace('%', '');
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateOverrides({ 
                          opex: { ...opex, commonElec: (numValue / 100) * effectiveGrossIncome }
                        });
                      }
                      setCommonElecInput('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
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
                  <input
                    type="text"
                    value={rubbishInput || formatInputValue((opex.rubbish || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => {
                      setRubbishInput(e.target.value);
                    }}
                    onFocus={(e) => {
                      setRubbishInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace('%', '');
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateOverrides({ 
                          opex: { ...opex, rubbish: (numValue / 100) * effectiveGrossIncome }
                        });
                      }
                      setRubbishInput('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
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
                  <input
                    type="text"
                    value={repairsInput || formatInputValue((opex.repairs || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => {
                      setRepairsInput(e.target.value);
                    }}
                    onFocus={(e) => {
                      setRepairsInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace('%', '');
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateOverrides({ 
                          opex: { ...opex, repairs: (numValue / 100) * effectiveGrossIncome }
                        });
                      }
                      setRepairsInput('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
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
                  <input
                    type="text"
                    value={pmInput || formatInputValue((opex.pm || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => {
                      setPmInput(e.target.value);
                    }}
                    onFocus={(e) => {
                      setPmInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace('%', '');
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateOverrides({ 
                          opex: { ...opex, pm: (numValue / 100) * effectiveGrossIncome }
                        });
                      }
                      setPmInput('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
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
                     <input
                       type="text"
                       value={licensingInput || formatInputValue((opex.licensing || 0) / effectiveGrossIncome, 'percentage')}
                       onChange={(e) => {
                         setLicensingInput(e.target.value);
                       }}
                       onFocus={(e) => {
                         setLicensingInput(e.target.value);
                       }}
                       onBlur={(e) => {
                         const value = e.target.value.replace('%', '');
                         const numValue = parseFloat(value);
                         if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                           updateOverrides({ 
                             opex: { ...opex, licensing: (numValue / 100) * effectiveGrossIncome }
                           });
                         }
                         setLicensingInput('');
                       }}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                           e.currentTarget.blur();
                         }
                       }}
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
                   <input
                     type="text"
                     value={legalInput || formatInputValue((opex.legal || 0) / effectiveGrossIncome, 'percentage')}
                     onChange={(e) => {
                       setLegalInput(e.target.value);
                     }}
                     onFocus={(e) => {
                       setLegalInput(e.target.value);
                     }}
                     onBlur={(e) => {
                       const value = e.target.value.replace('%', '');
                       const numValue = parseFloat(value);
                       if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                         updateOverrides({ 
                           opex: { ...opex, legal: (numValue / 100) * effectiveGrossIncome }
                         });
                       }
                       setLegalInput('');
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.currentTarget.blur();
                       }
                     }}
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
                   <input
                     type="text"
                     value={capexInput || formatInputValue((opex.capex || 0) / effectiveGrossIncome, 'percentage')}
                     onChange={(e) => {
                       setCapexInput(e.target.value);
                     }}
                     onFocus={(e) => {
                       setCapexInput(e.target.value);
                     }}
                     onBlur={(e) => {
                       const value = e.target.value.replace('%', '');
                       const numValue = parseFloat(value);
                       if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                         updateOverrides({ 
                           opex: { ...opex, capex: (numValue / 100) * effectiveGrossIncome }
                         });
                       }
                       setCapexInput('');
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.currentTarget.blur();
                       }
                     }}
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
    </div>
  );
}
