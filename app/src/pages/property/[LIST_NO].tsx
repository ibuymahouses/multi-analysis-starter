import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUndoRedo } from '../../lib/undo-redo-context';
import { useKeyboardShortcuts } from '../../lib/use-keyboard-shortcuts';

interface UnitMix {
  bedrooms: number;
  count: number;
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
  
  // Undo/Redo integration
  const { setState: setUndoState, state: undoState, canUndo, canRedo, undo, redo } = useUndoRedo();
  useKeyboardShortcuts();

  // Function to get BHA rent for specific bedroom count and ZIP code
  const getBHARentForBedrooms = (bedrooms: number, zipCode: string) => {
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
        const analysisResponse = await fetch(`http://localhost:4000/analyze/${LIST_NO}`);
        if (!analysisResponse.ok) {
          throw new Error('Property not found');
        }
        const analysisData = await analysisResponse.json();

        // Fetch complete listing data
        const listingsResponse = await fetch('http://localhost:4000/listings');
        const listingsData = await listingsResponse.json();
        const fullListing = listingsData.listings.find((l: any) => String(l.LIST_NO) === String(LIST_NO));
        
        if (!fullListing) {
          throw new Error('Listing not found');
        }

        // Fetch overrides
        const overridesResponse = await fetch(`http://localhost:4000/property/${LIST_NO}/overrides`);
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

  const updateOverrides = async (updates: any) => {
    if (!property) return;
    
    try {
      const response = await fetch(`http://localhost:4000/property/${LIST_NO}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(property.overrides || {}), ...updates })
      });
      
      if (response.ok) {
        const newProperty = { ...property, overrides: { ...(property.overrides || {}), ...updates } };
        setProperty(newProperty);
        
        // Save to undo/redo system
        setUndoState({
          type: 'property-update',
          property: newProperty,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('Failed to update overrides:', err);
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
  const downPayment = property.overrides?.downPayment || 0.25;
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
  
  const annualGross = monthlyRent * 12;
  const vacancyAmount = annualGross * vacancy;
  const effectiveGrossIncome = annualGross - vacancyAmount;
  const noi = effectiveGrossIncome - totalOpex;
  const loanAmount = offerPrice * (1 - downPayment);
  const monthlyPayment = (loanAmount * (interestRate / 12) * Math.pow(1 + interestRate / 12, loanTerm * 12)) / (Math.pow(1 + interestRate / 12, loanTerm * 12) - 1);
  const annualDebtService = monthlyPayment * 12;
  const dscr = noi / annualDebtService;
  const capRate = noi / offerPrice;
  const monthlyCashFlow = (noi / 12) - monthlyPayment;
  const equityRequired = (offerPrice * downPayment) + (offerPrice * 0.03) + (offerPrice * 0.01); // Down payment + 3% closing costs + 1% due diligence
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
    <main style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
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
              color: '#666'
            }}
          >
            ← Back to Listings
          </button>
        </div>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          margin: '0 0 8px 0',
          color: '#2c3e50'
        }}>
          {property.ADDRESS}
        </h1>
                 <p style={{ 
           fontSize: '16px', 
           color: '#666', 
           margin: '0 0 16px 0' 
         }}>
           MLS #{property.LIST_NO} • {property.TOWN}, {property.STATE} {property.ZIP_CODE} • {property.UNITS_FINAL}-unit property
         </p>
      </div>

      

                           {/* Editable Fields Note */}
        <div style={{ 
          marginBottom: '16px', 
          padding: '8px 12px', 
          background: '#e3f2fd', 
          border: '1px solid #2196f3', 
          borderRadius: '4px',
          fontSize: '14px',
          color: '#1976d2',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            💡 <strong>Tip:</strong> Blue-bordered fields are editable. Changes will update all calculations throughout the page.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                background: canUndo ? '#f8f9fa' : '#e9ecef',
                border: '1px solid #ddd',
                borderRadius: '3px',
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
                padding: '4px 8px',
                fontSize: '12px',
                background: canRedo ? '#f8f9fa' : '#e9ecef',
                border: '1px solid #ddd',
                borderRadius: '3px',
                cursor: canRedo ? 'pointer' : 'not-allowed',
                color: canRedo ? '#495057' : '#6c757d'
              }}
              title="Redo (Ctrl+Y)"
            >
              ↪ Redo
            </button>
          </div>
        </div>

       {/* Key Metrics Summary */}
       <section style={{ marginBottom: '32px' }}>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: dscr >= 1.2 ? '#28a745' : dscr >= 1.0 ? '#ffc107' : '#dc3545' }}>
                {dscr.toFixed(2)}
              </div>
                             <div style={{ fontSize: '14px', color: '#666' }}>DSCR ({formatLTV(1 - downPayment)} LTV)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                             <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                 {formatCapRate(capRate)}
               </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Cap Rate at Ask</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: returnOnCapital >= 0.12 ? '#28a745' : '#ffc107' }}>
                {formatReturnOnCapital(returnOnCapital)}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Return on Capital</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: monthlyCashFlow >= 0 ? '#28a745' : '#dc3545' }}>
                {formatCurrency(monthlyCashFlow)}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Monthly Cash Flow</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                {formatCurrency(equityRequired)}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Equity Required</div>
            </div>
          </div>
        </div>
      </section>

      

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
               <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Amount</div>
               <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Notes</div>
               
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
                              <div>{offerPrice === property.LIST_PRICE ? 'List price' : `${formatLTV(offerPricePercent / 100)} of list price`}</div>
               
                            <div>Down Payment</div>
                                 <div style={{ textAlign: 'right' }}>
                   <input
                     type="text"
                     value={formatInputValue(downPayment, 'percentage')}
                     onChange={(e) => updateOverrides({ downPayment: parseInputValue(e.target.value, 'percentage') })}
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
                              <div>{formatLTV(downPayment)} of purchase price</div>
               
               <div>Closing Costs</div>
               <div style={{ textAlign: 'right' }}>{formatCurrency(offerPrice * 0.03)}</div>
               <div>3% of purchase price</div>
               
               <div>Due Diligence</div>
               <div style={{ textAlign: 'right' }}>{formatCurrency(offerPrice * 0.01)}</div>
               <div>1% of purchase price</div>
               
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
                            <div>{formatLTV(1 - downPayment)} LTV ({formatLTV(downPayment)} down)</div>
               
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
                <div>Annual rate</div>
                
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
                 <span style={{ fontSize: '12px', marginLeft: '4px' }}>years</span>
               </div>
               <div>Fixed rate</div>
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
                  const unitRent = getBHARentForBedrooms(unit.bedrooms, property.ZIP_CODE);
                  const unitAnnualRent = unitRent * unit.count * 12;
                  return (
                    <React.Fragment key={index}>
                      <div style={{ paddingLeft: '20px', fontSize: '13px' }}>
                        {unit.count} {unit.bedrooms}-BR unit{unit.count > 1 ? 's' : ''} @ ${unitRent}/mo
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
               <div style={{ textAlign: 'right' }}>
                 <input
                   type="text"
                   value={formatInputValue(toDisplayValue(annualGross), 'currency')}
                   onChange={(e) => updateOverrides({ monthlyRent: fromDisplayValue(parseInputValue(e.target.value, 'currency')) / 12 })}
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
               <div style={{ textAlign: 'right' }}>
                 <input
                   type="number"
                   value="100.0"
                   disabled
                   style={{ 
                     padding: '4px', 
                     border: '1px solid #ddd', 
                     borderRadius: '4px',
                     width: '80px',
                     textAlign: 'right',
                     fontSize: '14px',
                     background: '#f8f9fa'
                   }}
                 />
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
                   value={formatInputValue(vacancy, 'percentage')}
                   onChange={(e) => updateOverrides({ 
                     vacancy: parseInputValue(e.target.value, 'percentage')
                   })}
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
                     value={formatInputValue((opex.taxes || 0) / effectiveGrossIncome, 'percentage')}
                     onChange={(e) => updateOverrides({ 
                       opex: { ...opex, taxes: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                     })}
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
                    value={formatInputValue((opex.pm || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, pm: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                    })}
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
                    value={formatInputValue((opex.waterSewer || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, waterSewer: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                    })}
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
                    value={formatInputValue((opex.commonElec || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, commonElec: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                    })}
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
                    value={formatInputValue((opex.rubbish || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, rubbish: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                    })}
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
                    value={formatInputValue((opex.repairs || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, repairs: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                    })}
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
                    value={formatInputValue((opex.pm || 0) / effectiveGrossIncome, 'percentage')}
                    onChange={(e) => updateOverrides({ 
                      opex: { ...opex, pm: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                    })}
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
                       value={formatInputValue((opex.licensing || 0) / effectiveGrossIncome, 'percentage')}
                       onChange={(e) => updateOverrides({ 
                         opex: { ...opex, licensing: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                       })}
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
                     value={formatInputValue((opex.legal || 0) / effectiveGrossIncome, 'percentage')}
                     onChange={(e) => updateOverrides({ 
                       opex: { ...opex, legal: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                     })}
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
                     value={formatInputValue((opex.capex || 0) / effectiveGrossIncome, 'percentage')}
                     onChange={(e) => updateOverrides({ 
                       opex: { ...opex, capex: parseInputValue(e.target.value, 'percentage') * effectiveGrossIncome }
                     })}
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
                  ({formatCurrency(Math.round(Math.abs(toDisplayValue(monthlyCashFlow * 12))))})
                </div>
                <div style={{ fontWeight: 'bold', textAlign: 'right', color: monthlyCashFlow >= 0 ? '#28a745' : '#dc3545' }}>
                  {effectiveGrossIncome > 0 ? `${((monthlyCashFlow * 12) / effectiveGrossIncome * 100).toFixed(1)}%` : '0.0%'}
                </div>
           </div>
         </div>
       </section>

      

      

      
    </main>
  );
}
