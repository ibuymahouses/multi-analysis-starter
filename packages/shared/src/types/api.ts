/**
 * Shared API types for the Multi-Analysis application
 * These types ensure consistent API responses across all endpoints
 */

import { Property, CompProperty } from './property';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

export interface APIEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiresAuth?: boolean;
  rateLimit?: number;
}

export interface APIEndpoints {
  [key: string]: APIEndpoint;
}

// Specific API response types
export interface ListingsResponse extends PaginatedResponse<Property> {
  meta?: {
    version?: string;
    lastUpdated?: string;
    coverage?: string;
    totalZips?: number;
    source?: string;
    description?: string;
  };
}

export interface CompsResponse extends PaginatedResponse<CompProperty> {
  meta?: {
    version?: string;
    lastUpdated?: string;
    totalRecords?: number;
    filteredRecords?: number;
  };
}

export interface BHARentalData {
  rents: Array<{
    zip: string;
    rents: Record<string, number>;
    lastUpdated: string;
  }>;
  meta: {
    version: string;
    lastUpdated: string;
    coverage: string;
  };
}

export interface RentalRatesResponse extends APIResponse<BHARentalData> {}

// Authentication types
export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse extends APIResponse<{
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
}> {}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse extends APIResponse<{
  token: string;
  refreshToken: string;
}> {}
