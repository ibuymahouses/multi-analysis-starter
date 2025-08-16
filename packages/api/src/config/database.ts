import { Pool, PoolConfig } from 'pg';
import { DATABASE_CONFIG } from '@multi-analysis/shared';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export function createDatabasePool(config: DatabaseConfig): Pool {
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    min: DATABASE_CONFIG.POOL_MIN,
    max: DATABASE_CONFIG.POOL_MAX,
    idleTimeoutMillis: DATABASE_CONFIG.IDLE_TIMEOUT,
    connectionTimeoutMillis: DATABASE_CONFIG.CONNECTION_TIMEOUT,
  };

  return new Pool(poolConfig);
}

export function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'multi_analysis',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production',
  };

  if (!config.password) {
    throw new Error('Database password is required');
  }

  return config;
}

// Global pool instance
let pool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = createDatabasePool(config);
  }
  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

