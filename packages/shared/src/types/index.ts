/**
 * Shared types index for the Multi-Analysis application
 * Export all shared types from this central location
 */

// Property types
export * from './property';

// API types
export * from './api';



// Re-export commonly used types for convenience
export type {
  Property,
  CompProperty,
  UnitMix,
  PropertyAnalysis,
  PropertyOverrides,
  OperatingExpenses,
  PropertyFilters,
  PropertySort,
  CompPropertySort,
} from './property';

export type {
  APIResponse,
  PaginatedResponse,
  APIError,
  BHARentalData,
  ListingsResponse,
  CompsResponse,
  RentalRatesResponse,
  AuthRequest,
  AuthResponse,
} from './api';


