import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUndoRedo } from '../lib/undo-redo-context';
import { useKeyboardShortcuts } from '../lib/use-keyboard-shortcuts';
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

export default function AnalyzeUnlisted() {
  const router = useRouter();
  const [property, setProperty] = useState<Property>({
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
  const [viewMode, setViewMode] = useState<'annual' | 'monthly'>('annual');
  const [closingCostsInput, setClosingCostsInput] = useState<string>('');
  const [dueDiligenceInput, setDueDiligenceInput] = useState<string>('');
  const [downPaymentInput, setDownPaymentInput] = useState<string>('');
  const [interestRateInput, setInterestRateInput] = useState<string>('');
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
      if (JSON.stringify(undoState.property) !== JSON.stringify(property)) {
        setProperty(undoState.property);
      }
    }
  }, [undoState]);

  // Load BHA rental data
  useEffect(() => {
    const fetchBhaData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.rents);
        const bhaData = await response.json();
        setBhaRentalData(bhaData);
      } catch (err) {
        console.error('Failed to load BHA data:', err);
      }
    };
    fetchBhaData();
  }, []);

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

  const updateOverrides = async (updates: any, skipServerUpdate = false) => {
    const newProperty = { ...property, overrides: { ...(property.overrides || {}), ...updates } };
    
    // Update local state immediately
    setProperty(newProperty);
    
    // Save to undo/redo
    setUndoState({ type: 'property-update', property: newProperty });
  };

  // Helper functions for input formatting
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

  const parseInputValue = (formattedValue: string, type: 'currency' | 'percentage') => {
    if (type === 'currency') {
      const cleanValue = formattedValue.replace(/[$,]/g, '');
      return parseFloat(cleanValue) || 0;
    } else if (type === 'percentage') {
      const cleanValue = formattedValue.replace(/%/g, '');
      return (parseFloat(cleanValue) || 0) / 100;
    }
    return parseFloat(formattedValue) || 0;
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

  // Format currency - rounded to nearest dollar
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format cap rate
  const formatCapRate = (capRate: number) => {
    return `${(capRate * 100).toFixed(2)}%`;
  };

  // Format return on capital
  const formatReturnOnCapital = (returnOnCapital: number) => {
    return `${(returnOnCapital * 100).toFixed(1)}%`;
  };

  // Format LTV
  const formatLTV = (ltv: number) => {
    return `${(ltv * 100).toFixed(0)}%`;
  };

  // Format interest rate - 2 decimal places
  const formatInterestRate = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Get current unit mix from overrides or default
  const currentUnitMix = property.overrides?.unitMix || [];

  // Calculate derived values
  const totalUnits = currentUnitMix.reduce((sum, u) => sum + u.count, 0);
  const totalBedrooms = currentUnitMix.reduce((sum, u) => sum + (u.bedrooms * u.count), 0);
  const averageBedrooms = totalUnits > 0 ? totalBedrooms / totalUnits : 0;
  const offerPrice = property.overrides?.offerPrice || property.LIST_PRICE;
  const pricePerUnit = totalUnits > 0 ? offerPrice / totalUnits : 0;
  const pricePerBedroom = totalBedrooms > 0 ? offerPrice / totalBedrooms : 0;

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

  // Calculate annual gross based on unit mix and individual unit rents
  const annualGross = currentUnitMix.reduce((total, unit) => {
    const unitRent = getRentForBedrooms(unit.bedrooms, property.ZIP_CODE);
    return total + (unitRent * unit.count * 12);
  }, 0);
  const vacancyAmount = annualGross * (property.overrides?.vacancy || 0.03);
  const effectiveGrossIncome = annualGross - vacancyAmount;
  const noi = effectiveGrossIncome - totalOpex;
  const downPayment = property.overrides?.downPayment || 0.20;
  const interestRate = property.overrides?.interestRate || 0.07;
  const loanTerm = property.overrides?.loanTerm || 30;
  const loanAmount = offerPrice * (1 - downPayment);
  const monthlyPayment = (loanAmount * (interestRate / 12) * Math.pow(1 + interestRate / 12, loanTerm * 12)) / (Math.pow(1 + interestRate / 12, loanTerm * 12) - 1);
  const annualDebtService = monthlyPayment * 12;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const capRate = offerPrice > 0 ? noi / offerPrice : 0;
  const monthlyCashFlow = (noi / 12) - monthlyPayment;
  const closingCostsPercentage = property.overrides?.closingCostsPercentage ?? 0.03;
  const dueDiligencePercentage = property.overrides?.dueDiligencePercentage ?? 0.01;
  const equityRequired = (offerPrice * downPayment) + (offerPrice * closingCostsPercentage) + (offerPrice * dueDiligencePercentage);
  const returnOnCapital = equityRequired > 0 ? (monthlyCashFlow * 12) / equityRequired : 0;

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
            onClick={() => router.push('/listings')}
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
            Custom Property Analysis
          </h1>
          
          <p style={{ 
            fontSize: '13px', 
            color: '#666', 
            margin: '0 0 8px 0',
            lineHeight: '1.3'
          }}>
            Enter number of units
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

        {/* BHA Data Status */}
        {bhaRentalData && (
          <div style={{ 
            marginTop: '16px', 
            padding: '8px 12px', 
            background: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#155724'
          }}>
            ✓ BHA rental data loaded (ZIP codes)
          </div>
        )}

        {/* Unit Configuration Section */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ 
            background: '#2c3e50', 
            color: 'white', 
            padding: '12px 16px', 
            fontWeight: 'bold',
            fontSize: '16px',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px'
          }}>
            Unit Configuration
          </div>
          <div style={{ 
            border: '1px solid #ddd', 
            borderTop: 'none',
            padding: '20px',
            background: 'white'
          }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>Total Units:</label>
                <input
                  type="number"
                  value={property.UNITS_FINAL || ''}
                  onChange={(e) => {
                    const totalUnits = Number(e.target.value) || 0;
                    setProperty({ ...property, UNITS_FINAL: totalUnits });
                    
                    // Auto-populate unit mix if empty
                    if (totalUnits > 0 && (!property.overrides?.unitMix || property.overrides.unitMix.length === 0)) {
                      const defaultUnitMix = [{ bedrooms: 1, count: totalUnits }];
                      updateOverrides({ unitMix: defaultUnitMix });
                    }
                  }}
                  placeholder="2"
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057', marginBottom: '8px', display: 'block' }}>
                  Unit Mix:
                </label>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {currentUnitMix.map((unit, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '60px 20px 120px 70px', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={unit.count || ''}
                        onChange={(e) => {
                          const newCount = Number(e.target.value) || 0;
                          const updatedUnitMix = currentUnitMix.map((u, i) => 
                            i === index ? { ...u, count: newCount } : u
                          );
                          updateOverrides({ unitMix: updatedUnitMix });
                        }}
                        placeholder="1"
                        style={{
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          textAlign: 'center',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#495057', textAlign: 'center' }}>x</span>
                      <select
                        value={unit.bedrooms}
                        onChange={(e) => {
                          const newBedrooms = Number(e.target.value);
                          const updatedUnitMix = currentUnitMix.map((u, i) => 
                            i === index ? { ...u, bedrooms: newBedrooms } : u
                          );
                          updateOverrides({ unitMix: updatedUnitMix });
                        }}
                        style={{
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value={0}>Studio</option>
                        <option value={1}>1-BR</option>
                        <option value={2}>2-BR</option>
                        <option value={3}>3-BR</option>
                        <option value={4}>4-BR</option>
                        <option value={5}>5-BR</option>
                      </select>
                      <button
                        onClick={() => {
                          const updatedUnitMix = currentUnitMix.filter((_, i) => i !== index);
                          updateOverrides({ unitMix: updatedUnitMix });
                        }}
                        style={{
                          padding: '4px 6px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          width: '100%',
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      const newUnit = { bedrooms: 1, count: 1 };
                      const updatedUnitMix = [...currentUnitMix, newUnit];
                      updateOverrides({ unitMix: updatedUnitMix });
                    }}
                    style={{
                      padding: '8px 12px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginTop: '8px'
                    }}
                  >
                    + Add Unit Type
                  </button>
                </div>
              </div>
              
              {property.ZIP_CODE && currentUnitMix.length > 0 && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  background: '#e3f2fd', 
                  border: '1px solid #2196f3', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#1976d2'
                }}>
                  💡 <strong>Rental Rates:</strong> Based on ZIP {property.ZIP_CODE}
                  {currentUnitMix.map((unit, index) => {
                    const rent = getRentForBedrooms(unit.bedrooms, property.ZIP_CODE);
                    return (
                      <div key={index} style={{ marginTop: '4px' }}>
                        {unit.count} {unit.bedrooms === 0 ? 'Studio' : `${unit.bedrooms}-BR`} unit{unit.count > 1 ? 's' : ''}: ${formatCurrency(rent)}/month
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: '1' }}>
        {/* Top Row - 4 Boxes Across */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', marginTop: '16px' }}>
          {/* Property Address Section */}
          <div style={{ flex: '1' }}>
            <div style={{ 
              background: '#2c3e50', 
              color: 'white', 
              padding: '12px 16px', 
              fontWeight: 'bold',
              fontSize: '16px',
              borderTopLeftRadius: '6px',
              borderTopRightRadius: '6px'
            }}>
              Property Address
            </div>
            <div style={{ 
              border: '1px solid #ddd',
              borderTop: 'none',
              padding: '16px',
              background: 'white'
            }}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>Address #:</label>
                  <input
                    type="text"
                    value={property.ADDRESS.split(' ')[0] || ''}
                    onChange={(e) => {
                      const streetName = property.ADDRESS.split(' ').slice(1).join(' ') || '';
                      const newAddress = `${e.target.value} ${streetName}`.trim();
                      setProperty({ ...property, ADDRESS: newAddress });
                    }}
                    placeholder="123"
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>Street Name:</label>
                  <input
                    type="text"
                    value={property.ADDRESS.split(' ').slice(1).join(' ') || ''}
                    onChange={(e) => {
                      const addressNum = property.ADDRESS.split(' ')[0] || '';
                      const newAddress = `${addressNum} ${e.target.value}`.trim();
                      setProperty({ ...property, ADDRESS: newAddress });
                    }}
                    placeholder="Main Street"
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>Town:</label>
                  <input
                    type="text"
                    value={property.TOWN}
                    onChange={(e) => setProperty({ ...property, TOWN: e.target.value })}
                    placeholder="Boston"
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>State:</label>
                  <input
                    type="text"
                    value={property.STATE}
                    onChange={(e) => setProperty({ ...property, STATE: e.target.value })}
                    placeholder="MA"
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>ZIP Code:</label>
                  <input
                    type="text"
                    value={property.ZIP_CODE}
                    onChange={(e) => setProperty({ ...property, ZIP_CODE: e.target.value })}
                    placeholder="02108"
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Section */}
          <div style={{ flex: '1' }}>
            <div style={{ 
              background: '#2c3e50', 
              color: 'white', 
              padding: '12px 16px', 
              fontWeight: 'bold',
              fontSize: '16px',
              borderTopLeftRadius: '6px',
              borderTopRightRadius: '6px'
            }}>
              Key Metrics
            </div>
            <div style={{ 
              border: '1px solid #ddd', 
              borderTop: 'none',
              padding: '16px',
              background: '#f8f9fa'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr', 
                gap: '12px' 
              }}>
                <div style={{ 
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'left'
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2px'
                  }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#dc3545'
                    }}>
                      DSCR:
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#dc3545'
                    }}>
                      {dscr.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666'
                  }}>
                    {formatLTV(1 - downPayment)} LTV
                  </div>
                </div>
                
                <div style={{ 
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'left'
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2px'
                  }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#2c3e50'
                    }}>
                      Cap Rate:
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#2c3e50'
                    }}>
                      {formatCapRate(capRate)}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666'
                  }}>
                    at offer price
                  </div>
                </div>
                
                <div style={{ 
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'left'
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2px'
                  }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#ffc107'
                    }}>
                      Return:
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#ffc107'
                    }}>
                      {formatReturnOnCapital(returnOnCapital)}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666'
                  }}>
                    on capital
                  </div>
                </div>
                
                <div style={{ 
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'left'
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2px'
                  }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#dc3545'
                    }}>
                      Cash Flow:
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#dc3545'
                    }}>
                      {formatCurrency(monthlyCashFlow)}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666'
                  }}>
                    monthly
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Initial Costs Section */}
          <div style={{ flex: '1' }}>
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
              padding: '16px',
              background: 'white'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', alignItems: 'center', fontSize: '13px' }}>
                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Item</div>
                <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Amount</div>
                
                <div>Purchase Price</div>
                <div style={{ textAlign: 'right' }}>
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
                      width: '100px',
                      textAlign: 'right',
                      fontSize: '12px',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>
                
                <div>Down Payment</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={`${(downPayment * 100).toFixed(1)}%`}
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/%/g, '');
                      const numValue = parseFloat(cleanValue) || 0;
                      if (numValue >= 0 && numValue <= 100) {
                        updateOverrides({ downPayment: numValue / 100 });
                      }
                    }}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '60px',
                      textAlign: 'right',
                      fontSize: '12px',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>
                
                <div>Closing Costs</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={`${(closingCostsPercentage * 100).toFixed(1)}%`}
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/%/g, '');
                      const numValue = parseFloat(cleanValue) || 0;
                      if (numValue >= 0 && numValue <= 10) {
                        updateOverrides({ closingCostsPercentage: numValue / 100 });
                      }
                    }}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '60px',
                      textAlign: 'right',
                      fontSize: '12px',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>
                
                <div>Due Diligence</div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="text"
                    value={`${(dueDiligencePercentage * 100).toFixed(1)}%`}
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/%/g, '');
                      const numValue = parseFloat(cleanValue) || 0;
                      if (numValue >= 0 && numValue <= 5) {
                        updateOverrides({ dueDiligencePercentage: numValue / 100 });
                      }
                    }}
                    style={{ 
                      padding: '4px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      width: '60px',
                      textAlign: 'right',
                      fontSize: '12px',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>
                
                <div style={{ 
                  fontWeight: 'bold', 
                  borderTop: '1px solid #2c3e50', 
                  paddingTop: '6px',
                  gridColumn: '1 / 2'
                }}>
                  Total Equity
                </div>
                <div style={{ 
                  fontWeight: 'bold', 
                  textAlign: 'right', 
                  borderTop: '1px solid #2c3e50', 
                  paddingTop: '6px',
                  gridColumn: '2 / 3'
                }}>
                  {formatCurrency(equityRequired)}
                </div>
              </div>
            </div>
          </div>

          {/* Financing Section */}
          <div style={{ flex: '1' }}>
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
              padding: '16px',
              background: '#f8f9fa'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', alignItems: 'center', fontSize: '13px' }}>
                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Item</div>
                <div style={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' }}>Amount/Rate</div>
                
                <div>Loan Amount</div>
                <div style={{ textAlign: 'right' }}>{formatCurrency(loanAmount)}</div>
                
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
                      width: '60px',
                      textAlign: 'right',
                      fontSize: '12px'
                    }}
                  />
                </div>
                
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
                      width: '60px',
                      textAlign: 'right',
                      fontSize: '12px'
                    }}
                  />
                </div>
                
                <div>Monthly Payment</div>
                <div style={{ textAlign: 'right' }}>{formatCurrency(monthlyPayment)}</div>
                
                <div>Annual Debt Service</div>
                <div style={{ textAlign: 'right' }}>{formatCurrency(annualDebtService)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Operating Budget Section */}
        <div style={{ marginBottom: '24px' }}>
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
                      {unit.count} {unit.bedrooms === 0 ? 'Studio' : `${unit.bedrooms}-BR`} unit{unit.count > 1 ? 's' : ''} @ 
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
                  value={vacancyInput || formatInputValue(property.overrides?.vacancy || 0.03, 'percentage')}
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
        </div>
      </main>
    </div>
  );
}
