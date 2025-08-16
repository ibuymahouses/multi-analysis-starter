/**
 * Shared configuration utility for environment variables
 * This ensures consistent configuration across all packages
 */

export interface AppConfig {
  // Environment
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  
  // API Configuration
  apiPort: number;
  apiBaseUrl: string;
  
  // CORS Configuration
  corsOrigins: string[];
  
  // Database Configuration
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  
  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  // JWT Configuration
  jwtSecret: string;
  
  // AWS Configuration
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    s3Bucket?: string;
  };
  
  // Worker Configuration
  workerPort: number;
  
  // Logging Configuration
  logLevel: string;
}

/**
 * Parse comma-separated environment variable into array
 */
function parseCommaSeparated(value?: string): string[] {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Get configuration based on environment variables
 */
export function getConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Parse CORS origins
  const corsOrigins = process.env.CORS_ORIGINS 
    ? parseCommaSeparated(process.env.CORS_ORIGINS)
    : nodeEnv === 'production'
    ? ['https://your-aws-domain.com', 'https://your-frontend-domain.com']
    : ['http://localhost:3000'];
  
  // Get API base URL
  const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const url = process.env.NEXT_PUBLIC_API_URL;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return `https://${url}`;
    }
    
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('localhost:3000')) {
        return origin.replace(':3000', ':3001');
      }
      return origin;
    }
    
    return 'http://localhost:3001';
  };
  
  return {
    // Environment
    nodeEnv,
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    isStaging: nodeEnv === 'staging',
    
    // API Configuration
    apiPort: parseInt(process.env.PORT || '3001'),
    apiBaseUrl: getApiBaseUrl(),
    
    // CORS Configuration
    corsOrigins,
    
    // Database Configuration
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      name: process.env.DB_NAME || 'multi_analysis',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: nodeEnv === 'production',
    },
    
    // Redis Configuration
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    
    // JWT Configuration
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    
    // AWS Configuration
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      s3Bucket: process.env.S3_BUCKET,
    },
    
    // Worker Configuration
    workerPort: parseInt(process.env.WORKER_PORT || '3002'),
    
    // Logging Configuration
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

/**
 * Get configuration with validation
 */
export function getValidatedConfig(): AppConfig {
  const config = getConfig();
  
  // Validation warnings
  if (config.isProduction && config.jwtSecret === 'your-secret-key-change-in-production') {
    console.warn('⚠️  WARNING: Using default JWT secret in production!');
  }
  
  if (config.isProduction && !config.aws.accessKeyId) {
    console.warn('⚠️  WARNING: AWS credentials not configured for production!');
  }
  
  return config;
}

// Export default config instance
export const config = getValidatedConfig();
