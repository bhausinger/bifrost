import { createClient, RedisClientType } from 'redis';
import { logger } from '@/utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType | null> => {
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Don't throw error to allow app to run without Redis in development
    return null;
  }
};

export const getRedisClient = (): RedisClientType | null => {
  return redisClient;
};

export const disconnectRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }
};

// Cache utility functions
export class CacheService {
  private client: RedisClientType | null;

  constructor() {
    this.client = getRedisClient();
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number = 3600): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.setEx(key, ttlSeconds, value);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const data = await this.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Cache JSON get error for key ${key}:`, error);
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      const data = JSON.stringify(value);
      return await this.set(key, data, ttlSeconds);
    } catch (error) {
      logger.error(`Cache JSON set error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.client) return 0;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.client.del(keys);
      return result;
    } catch (error) {
      logger.error(`Cache invalidate pattern error for ${pattern}:`, error);
      return 0;
    }
  }
}

export const cacheService = new CacheService();