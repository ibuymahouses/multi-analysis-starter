import { config } from '@multi-analysis/shared';

// Use shared configuration for API base URL
export const API_BASE_URL = config.apiBaseUrl;

// Debug logging (only in development)
if (config.isDevelopment) {
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL);
  console.log('NODE_ENV:', config.nodeEnv);
}

// API Endpoints
export const API_ENDPOINTS = {
  analyzeAll: (mode: string) => `${API_BASE_URL}/analyze-all?mode=${mode}`,
  property: (listNo: string) => `${API_BASE_URL}/property/${listNo}`,
  propertyOverrides: (listNo: string) => `${API_BASE_URL}/property/${listNo}/overrides`,
  analyze: (listNo: string) => `${API_BASE_URL}/analyze/${listNo}`,
  listings: `${API_BASE_URL}/listings`,
  rentsMetadata: `${API_BASE_URL}/rents/metadata`,
  export: (mode: string) => `${API_BASE_URL}/export/analyzed.csv?mode=${mode}`,
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`
  }
};
