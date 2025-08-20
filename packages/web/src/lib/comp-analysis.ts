// packages/web/src/lib/comp-analysis.ts

interface CompData {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  STATE: string;
  ZIP_CODE: string;
  SALE_PRICE: number;
  NO_UNITS_MF: number;
  NO_BEDROOMS: number;
  SALE_DATE: string;
}

interface CompComparison {
  pricePerUnit: {
    difference: number;
    percentage: number;
    compCount: number;
  };
  pricePerBed: {
    difference: number;
    percentage: number;
    compCount: number;
  };
}

// Unit count ranges for comp filtering
const UNIT_RANGES = [
  { min: 2, max: 2, label: '2 units' },
  { min: 3, max: 4, label: '3-4 units' },
  { min: 5, max: 10, label: '5-10 units' },
  { min: 11, max: Infinity, label: '10+ units' }
];

export function getUnitRange(unitCount: number): { min: number; max: number; label: string } | null {
  return UNIT_RANGES.find(range => unitCount >= range.min && unitCount <= range.max) || null;
}

export function calculateCompComparisons(
  listingPrice: number,
  listingUnits: number,
  listingBedrooms: number,
  listingZipCode: string,
  compsData: CompData[]
): CompComparison {
  const unitRange = getUnitRange(listingUnits);
  if (!unitRange) {
    return {
      pricePerUnit: { difference: 0, percentage: 0, compCount: 0 },
      pricePerBed: { difference: 0, percentage: 0, compCount: 0 }
    };
  }

  // Filter comps by zip code and unit range
  const relevantComps = compsData.filter(comp => 
    comp.ZIP_CODE === listingZipCode &&
    comp.NO_UNITS_MF >= unitRange.min &&
    comp.NO_UNITS_MF <= unitRange.max &&
    comp.SALE_PRICE > 0 &&
    comp.NO_UNITS_MF > 0 &&
    comp.NO_BEDROOMS > 0
  );

  // Calculate price per unit comparison
  const unitComps = relevantComps.filter(comp => comp.NO_UNITS_MF > 0);
  const avgPricePerUnit = unitComps.length > 0 
    ? unitComps.reduce((sum, comp) => sum + (comp.SALE_PRICE / comp.NO_UNITS_MF), 0) / unitComps.length
    : 0;
  
  const listingPricePerUnit = listingUnits > 0 ? listingPrice / listingUnits : 0;
  const unitDifference = listingPricePerUnit - avgPricePerUnit;
  const unitPercentage = avgPricePerUnit > 0 ? (unitDifference / avgPricePerUnit) * 100 : 0;

  // Calculate price per bedroom comparison
  const bedComps = relevantComps.filter(comp => comp.NO_BEDROOMS > 0);
  const avgPricePerBed = bedComps.length > 0
    ? bedComps.reduce((sum, comp) => sum + (comp.SALE_PRICE / comp.NO_BEDROOMS), 0) / bedComps.length
    : 0;
  
  const listingPricePerBed = listingBedrooms > 0 ? listingPrice / listingBedrooms : 0;
  const bedDifference = listingPricePerBed - avgPricePerBed;
  const bedPercentage = avgPricePerBed > 0 ? (bedDifference / avgPricePerBed) * 100 : 0;

  return {
    pricePerUnit: {
      difference: unitDifference,
      percentage: unitPercentage,
      compCount: unitComps.length
    },
    pricePerBed: {
      difference: bedDifference,
      percentage: bedPercentage,
      compCount: bedComps.length
    }
  };
}

export function formatCompComparison(difference: number, percentage: number, compCount: number): string {
  if (compCount === 0) return '';
  
  const sign = difference >= 0 ? '+' : '';
  const absDifference = Math.abs(difference);
  const absPercentage = Math.abs(percentage);
  const direction = difference >= 0 ? 'over' : 'under';
  
  const dollarFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return `${sign}${dollarFormat.format(absDifference)} (${sign}${absPercentage.toFixed(1)}%) ${direction} comps`;
}

export function getCompTooltipText(compCount: number, unitRange: string): string {
  if (compCount === 0) {
    return `No comparable sales found in ${unitRange} range for this zip code`;
  }
  return `Based on ${compCount} comparable sales in ${unitRange} range for this zip code`;
}
