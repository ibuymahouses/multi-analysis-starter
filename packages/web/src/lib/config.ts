import { config } from '@multi-analysis/shared';

// Use shared configuration for API base URL
export const API_BASE_URL = config.apiBaseUrl;

// Configuration loaded from shared package

// API Endpoints
export const API_ENDPOINTS = {
  analyzeAll: (mode: string) => `${API_BASE_URL}/analyze-all?mode=${mode}`,
  property: (listNo: string) => `${API_BASE_URL}/property/${listNo}`,
  propertyOverrides: (listNo: string) => `${API_BASE_URL}/property/${listNo}/overrides`,
  analyze: (listNo: string) => `${API_BASE_URL}/analyze/${listNo}`,
  analyzeUnlisted: `${API_BASE_URL}/analyze/unlisted`,
  listings: `${API_BASE_URL}/listings`,
  comps: `${API_BASE_URL}/comps`,
  analyzeComps: (mode: string) => `${API_BASE_URL}/analyze-comps?mode=${mode}`,
  rentsMetadata: `${API_BASE_URL}/rents/metadata`,
  rents: `${API_BASE_URL}/rents`,
  export: (mode: string) => `${API_BASE_URL}/export/analyzed.csv?mode=${mode}`,
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`
  }
};
