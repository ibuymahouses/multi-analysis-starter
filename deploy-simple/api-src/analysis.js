// api/src/analysis.js
export function computeAnalysis(listing, rentLookupByZip, rentMode = 'avg', overrides = null) {
  // rentMode: 'below'|'avg'|'agg' -> 0.90 / 1.00 / 1.10
  const mult = rentMode === 'below' ? 0.90 : rentMode === 'agg' ? 1.10 : 1.00;
  const zip = (listing.ZIP_CODE || '').trim();
  
  // Apply unit mix overrides
  let unitMix = overrides?.unitMix || listing.UNIT_MIX || []; // [{bedrooms,count}]
  
  // If unit mix is empty, create a default based on UNITS_FINAL and NO_UNITS_MF
  if (unitMix.length === 0 && listing.UNITS_FINAL > 0) {
    const totalUnits = listing.UNITS_FINAL;
    const totalBedrooms = listing.NO_UNITS_MF || totalUnits * 2; // Default to 2 bedrooms per unit if NO_UNITS_MF is not available
    
    // Calculate average bedrooms per unit
    const avgBedrooms = totalBedrooms / totalUnits;
    
    // Distribute bedrooms evenly without fractional units
    const floorAvg = Math.floor(avgBedrooms);
    const remainder = totalBedrooms - (floorAvg * totalUnits);
    
    unitMix = [];
    
    // Add units with floor average bedrooms
    if (floorAvg > 0) {
      unitMix.push({ bedrooms: floorAvg, count: totalUnits - remainder });
    }
    
    // Add units with one extra bedroom to handle remainder
    if (remainder > 0) {
      unitMix.push({ bedrooms: floorAvg + 1, count: remainder });
    }
    
    // If we have no units yet (edge case), default to 2-bedroom units
    if (unitMix.length === 0) {
      unitMix = [{ bedrooms: 2, count: totalUnits }];
    }
  }
  
  const zipInfo = rentLookupByZip.get(zip) || {}; // {rents:{'0':..,'1':..}, marketTier, county, town}
  const rents = zipInfo.rents || {};
  
  // Gross rent (monthly) from SAFMR by BR
  const monthlyGross = unitMix.reduce((sum, u) => {
    const br = String(u.bedrooms ?? 0);
    const safmr = rents[br] || 0;
    return sum + (safmr * mult * (u.count || 0));
  }, 0);

  // OPEX defaults with overrides
  const annualGross = monthlyGross * 12;
  const units = listing.UNITS_FINAL || 0;
  const buildings = 1; // MVP: single-building assumption
  
  // Apply OPEX overrides
  const opexOverrides = overrides?.opex || {};
  const waterSewer = (opexOverrides.waterSewer ?? 400) * units;                 // $400/unit/yr default
  const commonElec = (opexOverrides.commonElec ?? 100) * 12 * buildings;       // $100/mo/building default
  const rubbish = (units >= 5) ? (opexOverrides.rubbish ?? 200) * 12 : 0;      // $200/mo if 5+ units default
  const pm = (opexOverrides.pm ?? 0.08) * annualGross;                         // 8% of gross default
  const repairs = (opexOverrides.repairs ?? 0.02) * annualGross;                // 2% default
  const legal = (opexOverrides.legal ?? 0.01) * annualGross;                   // 1% default
  const capex = (opexOverrides.capex ?? 0.01) * annualGross;                   // 1% default
  const taxes = opexOverrides.taxes ?? Number(listing.TAXES || 0);             // from listing or override
  const opex = waterSewer + commonElec + rubbish + pm + repairs + legal + capex + taxes;

  const noi = annualGross - opex;

  // Financing
  const price = Number(listing.LIST_PRICE || 0);
  const ltvMax = 0.80; // 80% LTV for all property types
  const rate = 0.065; // 6.5% baseline rate
  const amortYears = 30;
  const dscrFloor = 1.20;
  const loanByLTV = price * ltvMax;

  // Payment calc
  const i = rate / 12;
  const n = amortYears * 12;
  const pmt = (pv) => (i === 0) ? (pv / n) : (pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1));
  // size by DSCR
  const annualDebtLimit = noi / dscrFloor;
  const monthlyDebtLimit = annualDebtLimit / 12;
  // invert payment to get PV (approximate via binary search)
  function pvFromPayment(payment) {
    let lo = 0, hi = price; // cap at price for MVP
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      const midPmt = pmt(mid);
      if (midPmt > payment) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }
  const loanByDSCR = pvFromPayment(monthlyDebtLimit);
  const loan = Math.max(0, Math.min(loanByLTV, loanByDSCR));
  const annualDebtService = pmt(loan) * 12;
  const dscr = annualDebtService ? (noi / annualDebtService) : null;

  // Simple valuations
  const capAtAsk = price ? (noi / price) : null;

  return {
    rentMode,
    monthlyGross: Math.round(monthlyGross),
    annualGross: Math.round(annualGross),
    opex: Math.round(opex),
    noi: Math.round(noi),
    loanSized: Math.round(loan),
    annualDebtService: Math.round(annualDebtService),
    dscr: dscr ? Number(dscr.toFixed(2)) : null,
    capAtAsk: capAtAsk ? Number((capAtAsk * 100).toFixed(2)) : null, // %
    marketTier: zipInfo.marketTier || 'unknown',
    county: zipInfo.county || '',
    town: zipInfo.town || ''
  };
} 