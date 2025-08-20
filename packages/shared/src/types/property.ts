/**
 * Shared property types for the Multi-Analysis application
 * These types are used across all packages to ensure consistency
 */

export interface UnitMix {
  bedrooms: number;
  count: number;
  rent?: number;
}

export interface OperatingExpenses {
  waterSewer?: number;
  commonElec?: number;
  rubbish?: number;
  pm?: number;
  repairs?: number;
  legal?: number;
  capex?: number;
  taxes?: number;
  licensing?: number;
}

export interface PropertyAnalysis {
  monthlyGross: number;
  annualGross: number;
  opex: number;
  noi: number;
  loanSized: number;
  annualDebtService: number;
  dscr: number;
  capAtAsk: number;
}

export interface PropertyOverrides {
  unitMix?: UnitMix[];
  monthlyRent?: number;
  offerPrice?: number;
  vacancy?: number;
  opex?: OperatingExpenses;
  downPayment?: number;
  interestRate?: number;
  loanTerm?: number;
  closingCostsPercentage?: number;
  dueDiligencePercentage?: number;
}

export interface Property {
  LIST_NO: string;
  ADDRESS: string;
  TOWN: string;
  STATE: string;
  ZIP_CODE: string;
  LIST_PRICE: number;
  SALE_PRICE?: number;
  TAXES: number;
  NO_UNITS_MF: number;
  UNITS_FINAL: number;
  UNIT_MIX: UnitMix[];
  analysis: PropertyAnalysis;
  overrides: PropertyOverrides;
}

export interface CompProperty extends Omit<Property, 'analysis' | 'overrides'> {
  SALE_DATE?: string;
  NO_BEDROOMS?: number;
  YEAR_BUILT?: number;
  SQUARE_FEET?: number;
  PRICE_PER_SQFT?: number;
  MARKET_TIME?: number;
  LIST_DATE?: string;
  SETTLED_DATE?: string;
  TAX_YEAR?: number;
  TOTAL_BATHS?: number;
  NO_FULL_BATHS?: number;
  NO_HALF_BATHS?: number;
  FIRE_PLACES?: number;
  GARAGE_SPACES_MF?: number;
  PARKING_SPACES_MF?: number;
  STYLE_MF?: string;
  EXTERIOR_MF?: string;
  HEATING_MF?: string;
  FOUNDATION_MF?: string;
  ROOF_MATERIAL_MF?: string;
  REMARKS?: string;
  RENTAL_DATA?: {
    rents: number[];
    total_rent: number;
    avg_rent: number;
  };
}

export interface PropertyFilters {
  priceMin?: number;
  priceMax?: number;
  unitsMin?: number;
  unitsMax?: number;
  town?: string;
  state?: string;
  zipCode?: string;
  onePercentRule?: boolean;
}

export interface PropertySort {
  field: keyof Property | 'pricePerUnit' | 'pricePerBedroom' | 'monthlyGross' | 'noi' | 'capAtAsk' | 'dscr';
  direction: 'asc' | 'desc';
}
