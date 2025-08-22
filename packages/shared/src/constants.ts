// API Constants
export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

// Environment Constants
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

export const NODE_ENV = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;

// Database Constants
export const DATABASE_CONFIG = {
  POOL_MIN: 2,
  POOL_MAX: 10,
  IDLE_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 2000,
} as const;

// Cache Constants
export const CACHE_CONFIG = {
  TTL: {
    LISTINGS: 3600, // 1 hour
    RENT_DATA: 86400, // 24 hours
    USER_SESSION: 7200, // 2 hours
    ANALYSIS_RESULT: 1800, // 30 minutes
  },
  PREFIXES: {
    LISTINGS: 'listings:',
    RENT_DATA: 'rent:',
    USER_SESSION: 'session:',
    ANALYSIS: 'analysis:',
  },
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Rate Limiting Constants
export const RATE_LIMITS = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: {
    AUTH: 5,
    API: 100,
    ANALYSIS: 50,
  },
} as const;

// File Upload Constants
export const FILE_UPLOADS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_FILES: 10,
} as const;

// Analysis Constants
export const ANALYSIS_CONFIG = {
  DEFAULT_RENT_METHOD: 'avg',
  CAP_RATE_THRESHOLD: 0.08, // 8%
  MIN_RENT_TO_PRICE_RATIO: 0.005, // 0.5%
  MAX_RENT_TO_PRICE_RATIO: 0.02, // 2%
  DEFAULT_VACANCY_RATE: 0.02, // 2% default vacancy rate
} as const;

// Security Constants
export const SECURITY = {
  JWT_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT: 7200, // 2 hours
} as const;

// Logging Constants
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

