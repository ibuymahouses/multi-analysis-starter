import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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
    opex?: {
      waterSewer?: number;
      commonElec?: number;
      rubbish?: number;
      pm?: number;
      repairs?: number;
      legal?: number;
      capex?: number;
      taxes?: number;
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

  useEffect(() => {
    if (!LIST_NO) return;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        
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
        setProperty(prev => prev ? { ...prev, overrides: { ...(prev.overrides || {}), ...updates } } : null);
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
    taxes: property.TAXES || 0                 // Property taxes
  };

  const opex = property.overrides?.opex || opexDefaults;
  const totalOpex = Object.values(opex).reduce((sum, val) => sum + (val || 0), 0);

  // Calculate derived values
  const totalUnits = currentUnitMix.reduce((sum, u) => sum + u.count, 0);
  const totalBedrooms = currentUnitMix.reduce((sum, u) => sum + (u.bedrooms * u.count), 0);
  const averageBedrooms = totalUnits > 0 ? totalBedrooms / totalUnits : 0;
  
  const annualGross = monthlyRent * 12;
  const noi = annualGross - totalOpex;
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Get market tier based on cap rate
  const getMarketTier = (capRate: number) => {
    if (capRate >= 0.08) return { tier: 'A+', color: '#28a745' };
    if (capRate >= 0.07) return { tier: 'A', color: '#20c997' };
    if (capRate >= 0.06) return { tier: 'B', color: '#ffc107' };
    if (capRate >= 0.05) return { tier: 'C', color: '#fd7e14' };
    return { tier: 'D', color: '#dc3545' };
  };

  const marketTier = getMarketTier(capRate);

  return (
    <main style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
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
          MLS #{property.LIST_NO} • {property.TOWN}, {property.STATE} {property.ZIP_CODE}
        </p>
      </div>

      {/* Editable Assumptions */}
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
          Editable Assumptions
        </div>
        <div style={{ 
          border: '1px solid #ddd', 
          borderTop: 'none',
          padding: '20px',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            
            {/* Offer Price */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Offer Price</h4>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => updateOverrides({ offerPrice: Number(e.target.value) })}
                  style={{ 
                    padding: '8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    width: '120px'
                  }}
                  placeholder="Offer price"
                />
                <span style={{ fontSize: '14px', color: '#666' }}>or</span>
                <input
                  type="number"
                  value={offerPricePercent.toFixed(1)}
                  onChange={(e) => {
                    const percent = Number(e.target.value);
                    const newOfferPrice = (property.LIST_PRICE * percent) / 100;
                    updateOverrides({ offerPrice: newOfferPrice });
                  }}
                  style={{ 
                    padding: '8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    width: '80px'
                  }}
                  placeholder="%"
                />
                <span style={{ fontSize: '14px', color: '#666' }}>% of asking</span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                List price: {formatCurrency(property.LIST_PRICE)}
              </div>
            </div>

            {/* Monthly Rent */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Monthly Rent</h4>
              <input
                type="number"
                value={monthlyRent}
                onChange={(e) => updateOverrides({ monthlyRent: Number(e.target.value) })}
                style={{ 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  width: '120px'
                }}
                placeholder="Monthly rent"
              />
            </div>

            {/* Down Payment */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Down Payment %</h4>
              <input
                type="number"
                value={(downPayment * 100).toFixed(1)}
                onChange={(e) => updateOverrides({ downPayment: Number(e.target.value) / 100 })}
                style={{ 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  width: '80px'
                }}
                placeholder="%"
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                LTV: {((1 - downPayment) * 100).toFixed(1)}%
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Interest Rate %</h4>
              <input
                type="number"
                value={(interestRate * 100).toFixed(2)}
                onChange={(e) => updateOverrides({ interestRate: Number(e.target.value) / 100 })}
                style={{ 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  width: '80px'
                }}
                placeholder="%"
              />
            </div>

            {/* Loan Term */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Loan Term (years)</h4>
              <input
                type="number"
                value={loanTerm}
                onChange={(e) => updateOverrides({ loanTerm: Number(e.target.value) })}
                style={{ 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  width: '80px'
                }}
                placeholder="Years"
              />
            </div>

          </div>
        </div>
      </section>

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
              <div style={{ fontSize: '14px', color: '#666' }}>DSCR ({(1 - downPayment) * 100}% LTV)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                {formatPercent(capRate)}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Cap Rate at Ask</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: returnOnCapital >= 0.12 ? '#28a745' : '#ffc107' }}>
                {formatPercent(returnOnCapital)}
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
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: marketTier.color }}>
                {marketTier.tier}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Market Tier</div>
            </div>
          </div>
        </div>
      </section>

      {/* Unit Count Analysis */}
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
          Unit Count Analysis
        </div>
        <div style={{ 
          border: '1px solid #ddd', 
          borderTop: 'none',
          padding: '20px',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Unit Summary</h3>
              <p><strong>Total Units from Listing:</strong> {property.UNITS_FINAL}</p>
              <p><strong>Unit Mix Total:</strong> {currentUnitMix.reduce((sum, u) => sum + u.count, 0)}</p>
              
              <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px' }}>Unit Breakdown:</h4>
              {currentUnitMix.length > 0 ? (
                currentUnitMix.map(unit => (
                  <div key={unit.bedrooms} style={{ marginBottom: 4 }}>
                    <strong>{unit.bedrooms === 0 ? 'Studio' : `${unit.bedrooms}BR`}:</strong> {unit.count} units
                  </div>
                ))
              ) : (
                <p style={{ color: '#666' }}>No unit mix data available</p>
              )}
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Math Verification</h3>
              <div style={{ padding: 12, background: 'white', borderRadius: 4, border: '1px solid #ddd' }}>
                <p><strong>Total Units:</strong> {currentUnitMix.reduce((sum, u) => sum + u.count, 0)}</p>
                <p><strong>Total Bedrooms:</strong> {currentUnitMix.reduce((sum, u) => sum + (u.bedrooms * u.count), 0)}</p>
                <p><strong>Average Bedrooms per Unit:</strong> {averageBedrooms.toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          {totalUnits !== property.UNITS_FINAL && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7',
              borderRadius: '4px'
            }}>
              <p style={{ margin: '0 0 8px 0', color: '#856404' }}>
                <strong>Warning:</strong> Unit mix total ({totalUnits}) doesn't match listing total ({property.UNITS_FINAL})
              </p>
              <button 
                onClick={syncUnitMixToTotal}
                style={{ 
                  padding: '6px 12px', 
                  background: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sync to {property.UNITS_FINAL} units
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Initial Costs */}
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
            <div style={{ textAlign: 'right' }}>{formatCurrency(offerPrice)}</div>
            <div>{offerPrice === property.LIST_PRICE ? 'List price' : `${formatPercent(offerPricePercent)} of list price`}</div>
            
            <div>Down Payment</div>
            <div style={{ textAlign: 'right' }}>{formatCurrency(offerPrice * downPayment)}</div>
            <div>{formatPercent(downPayment)} of purchase price</div>
            
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
            <div>{formatPercent(1 - downPayment)} LTV ({formatPercent(downPayment)} down)</div>
            
            <div>Interest Rate</div>
            <div style={{ textAlign: 'right' }}>{formatPercent(interestRate)}</div>
            <div>Annual rate</div>
            
            <div>Loan Term</div>
            <div style={{ textAlign: 'right' }}>{loanTerm} years</div>
            <div>Fixed rate</div>
            
            <div>Monthly Payment</div>
            <div style={{ textAlign: 'right' }}>{formatCurrency(monthlyPayment)}</div>
            <div>Principal & interest</div>
            
            <div>Annual Debt Service</div>
            <div style={{ textAlign: 'right' }}>{formatCurrency(annualDebtService)}</div>
            <div>Total annual payments</div>
          </div>
        </div>
      </section>

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Item</div>
            <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Amount</div>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Benchmark</div>
            
            <div>Monthly Gross Rent</div>
            <div style={{ textAlign: 'right' }}>{formatCurrency(monthlyRent)}</div>
            <div>Total monthly income</div>
            
            <div>Annual Gross Rent</div>
            <div style={{ textAlign: 'right' }}>{formatCurrency(annualGross)}</div>
            <div>Total annual income</div>
            
            <div>Total OPEX</div>
            <div style={{ textAlign: 'right' }}>{formatCurrency(totalOpex)}</div>
            <div>{formatPercent(totalOpex / annualGross)} of gross</div>
            
            <div style={{ fontWeight: 'bold', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>Net Operating Income</div>
            <div style={{ fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>
              {formatCurrency(noi)}
            </div>
            <div>{formatPercent(noi / annualGross)} of gross</div>
          </div>
        </div>
      </section>

      {/* OPEX Breakdown */}
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
          OPEX Breakdown
        </div>
        <div style={{ 
          border: '1px solid #ddd', 
          borderTop: 'none',
          padding: '20px',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Expense Category</div>
            <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Annual Amount</div>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>% of Gross</div>
            
            <div>Water & Sewer</div>
            <div style={{ textAlign: 'right' }}>
              <input
                type="number"
                value={opex.waterSewer || 0}
                onChange={(e) => updateOverrides({ 
                  opex: { ...opex, waterSewer: Number(e.target.value) }
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
            <div>{formatPercent((opex.waterSewer || 0) / annualGross)}</div>
            
            <div>Common Electric</div>
            <div style={{ textAlign: 'right' }}>
              <input
                type="number"
                value={opex.commonElec || 0}
                onChange={(e) => updateOverrides({ 
                  opex: { ...opex, commonElec: Number(e.target.value) }
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
            <div>{formatPercent((opex.commonElec || 0) / annualGross)}</div>
            
            <div>Rubbish</div>
            <div style={{ textAlign: 'right' }}>
              <input
                type="number"
                value={opex.rubbish || 0}
                onChange={(e) => updateOverrides({ 
                  opex: { ...opex, rubbish: Number(e.target.value) }
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
            <div>{formatPercent((opex.rubbish || 0) / annualGross)}</div>
            
            <div>Property Management</div>
            <div style={{ textAlign: 'right' }}>
              <input
                type="number"
                value={opex.pm || 0}
                onChange={(e) => updateOverrides({ 
                  opex: { ...opex, pm: Number(e.target.value) }
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
            <div>{formatPercent((opex.pm || 0) / annualGross)}</div>
            
            <div>Repairs & Maintenance</div>
            <div style={{ textAlign: 'right' }}>
              <input
                type="number"
                value={opex.repairs || 0}
                onChange={(e) => updateOverrides({ 
                  opex: { ...opex, repairs: Number(e.target.value) }
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
            <div>{formatPercent((opex.repairs || 0) / annualGross)}</div>
            
            <div>Legal</div>
            <div style={{ textAlign: 'right' }}>
              <input
                type="number"
                value={opex.legal || 0}
                onChange={(e) => updateOverrides({ 
                  opex: { ...opex, legal: Number(e.target.value) }
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
            <div>{formatPercent((opex.legal || 0) / annualGross)}</div>
            
            <div>CapEx</div>
            <div style={{ textAlign: 'right' }}>
              <input
                type="number"
                value={opex.capex || 0}
                onChange={(e) => updateOverrides({ 
                  opex: { ...opex, capex: Number(e.target.value) }
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
            <div>{formatPercent((opex.capex || 0) / annualGross)}</div>
            
            <div>Property Taxes</div>
            <div style={{ textAlign: 'right' }}>
              <input
                type="number"
                value={opex.taxes || 0}
                onChange={(e) => updateOverrides({ 
                  opex: { ...opex, taxes: Number(e.target.value) }
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
            <div>{formatPercent((opex.taxes || 0) / annualGross)}</div>
            
            <div style={{ fontWeight: 'bold', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>Total OPEX</div>
            <div style={{ fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>
              {formatCurrency(totalOpex)}
            </div>
            <div style={{ fontWeight: 'bold', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>
              {formatPercent(totalOpex / annualGross)}
            </div>
          </div>
        </div>
      </section>

      {/* Return Analysis */}
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
          Return Analysis
        </div>
        <div style={{ 
          border: '1px solid #ddd', 
          borderTop: 'none',
          padding: '20px',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Metric</div>
            <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Value</div>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Percentage</div>
            
            <div>Cap Rate</div>
            <div style={{ textAlign: 'right' }}>{formatPercent(capRate)}</div>
            <div>NOI / Purchase Price</div>
            
            <div>DSCR</div>
            <div style={{ textAlign: 'right' }}>{dscr.toFixed(2)}</div>
            <div>NOI / Annual Debt Service</div>
            
            <div>Return on Capital</div>
            <div style={{ textAlign: 'right' }}>{formatPercent(returnOnCapital)}</div>
            <div>Annual Cash Flow / Equity</div>
            
            <div>Monthly Cash Flow</div>
            <div style={{ textAlign: 'right', color: monthlyCashFlow >= 0 ? '#28a745' : '#dc3545' }}>
              {formatCurrency(monthlyCashFlow)}
            </div>
            <div>NOI/12 - Monthly Payment</div>
            
            <div>Annual Cash Flow</div>
            <div style={{ textAlign: 'right', color: monthlyCashFlow >= 0 ? '#28a745' : '#dc3545' }}>
              {formatCurrency(monthlyCashFlow * 12)}
            </div>
            <div>Total annual cash flow</div>
          </div>
        </div>
      </section>

      {/* Rent Roll Details */}
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
          Rent Roll Details
        </div>
        <div style={{ 
          border: '1px solid #ddd', 
          borderTop: 'none',
          padding: '20px',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Unit Type</div>
            <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Count</div>
            <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Monthly Rent</div>
            
            {currentUnitMix.length > 0 ? (
              currentUnitMix.map(unit => {
                const rentPerUnit = monthlyRent / totalUnits;
                return (
                  <React.Fragment key={unit.bedrooms}>
                    <div>{unit.bedrooms === 0 ? 'Studio' : `${unit.bedrooms} Bedroom`}</div>
                    <div style={{ textAlign: 'right' }}>{unit.count}</div>
                    <div style={{ textAlign: 'right' }}>{formatCurrency(rentPerUnit)}</div>
                  </React.Fragment>
                );
              })
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', padding: '20px' }}>
                No unit mix data available
              </div>
            )}
            
            <div style={{ fontWeight: 'bold', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>Total</div>
            <div style={{ fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>
              {totalUnits}
            </div>
            <div style={{ fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid #2c3e50', paddingTop: '8px' }}>
              {formatCurrency(monthlyRent)}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
