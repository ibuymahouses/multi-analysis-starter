import { createClient, RedisClientType } from 'redis';
import { CACHE_CONFIG } from '@multi-analysis/shared';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export function getRedisConfig(): RedisConfig {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
  };
}

// Global Redis client instance
let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    const config = getRedisConfig();
    redisClient = createClient({
      socket: {
        host: config.host,
        port: config.port,
      },
      password: config.password,
      database: config.db,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Cache utility functions
export async function setCache(
  key: string,
  value: any,
  ttl: number = CACHE_CONFIG.TTL.LISTINGS
): Promise<void> {
  const client = await getRedisClient();
  await client.setEx(key, ttl, JSON.stringify(value));
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

export async function deleteCache(key: string): Promise<void> {
  const client = await getRedisClient();
  await client.del(key);
}

export async function clearCache(pattern: string): Promise<void> {
  const client = await getRedisClient();
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(keys);
  }
}

