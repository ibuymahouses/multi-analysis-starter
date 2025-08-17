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
  const dbConfig: DatabaseConfig = {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl,
  };

  if (!dbConfig.password) {
    throw new Error('Database password is required');
  }

  return dbConfig;
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

