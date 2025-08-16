import { ApiResponse, PaginatedResponse } from './types';
import { HTTP_STATUS } from './constants';

// API Response utilities
export function createApiResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  } as ApiResponse<T>;
}

export function createErrorResponse(
  error: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
): ApiResponse<never> {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  };
}

// Validation utilities
export function validatePagination(page?: number, limit?: number) {
  const validPage = Math.max(1, page || 1);
  const validLimit = Math.min(100, Math.max(1, limit || 20));
  return { page: validPage, limit: validLimit };
}

// Database utilities
export function buildWhereClause(filters: Record<string, any>) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

// Cache utilities
export function generateCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}${parts.join(':')}`;
}

// Date utilities
export function formatDate(date: Date | string): string {
  return new Date(date).toISOString();
}

export function isValidDate(date: any): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

// String utilities
export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

export function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Number utilities
export function roundToDecimals(num: number, decimals: number = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// Array utilities
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// Object utilities
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

// Async utilities
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const attempt = async () => {
      try {
        attempts++;
        const result = await fn();
        resolve(result);
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          setTimeout(attempt, delayMs * attempts);
        }
      }
    };

    attempt();
  });
}

// Environment utilities
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isStaging(): boolean {
  return process.env.NODE_ENV === 'staging';
}

// Logging utilities
export function logError(error: Error, context?: Record<string, any>): void {
  console.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

export function logInfo(message: string, data?: any): void {
  console.log({
    level: 'info',
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}
