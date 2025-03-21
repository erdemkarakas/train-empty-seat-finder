import { Redis } from '@upstash/redis';
import { mockKV, MockKV } from './mock-kv';
import { StoredSearch } from './types';

// Define the allowed value types for the KV store, like in MockKV
type KVValueType = StoredSearch | string | number | boolean | null | Record<string, unknown>;

// Define interface for KV implementations
interface KVInterface {
  set(key: string, value: KVValueType, options?: { ex?: number }): Promise<unknown>;
  get(key: string): Promise<KVValueType | null>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  exists(key: string): Promise<number>;
}

// Initialize Upstash Redis client
const upstashRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Check if all required environment variables for Upstash Redis are properly configured
const hasRedisEnvVars = process.env.UPSTASH_REDIS_REST_URL && 
                        process.env.UPSTASH_REDIS_REST_TOKEN;

// Force local development to use mock KV
const isDevelopment = process.env.NODE_ENV === 'development';

// Only use real Redis in production with properly configured env vars
const useRealKV = !isDevelopment && hasRedisEnvVars && upstashRedis !== null;

// Adaptor for Upstash Redis to match our KVInterface
const upstashKV: KVInterface = {
  async set(key: string, value: KVValueType, options?: { ex?: number }): Promise<unknown> {
    if (!upstashRedis) throw new Error('Upstash Redis not configured');
    if (options?.ex) {
      return upstashRedis.set(key, value, { ex: options.ex });
    }
    return upstashRedis.set(key, value);
  },
  
  async get(key: string): Promise<KVValueType | null> {
    if (!upstashRedis) throw new Error('Upstash Redis not configured');
    return upstashRedis.get(key);
  },
  
  async del(key: string): Promise<unknown> {
    if (!upstashRedis) throw new Error('Upstash Redis not configured');
    return upstashRedis.del(key);
  },
  
  async keys(pattern: string): Promise<string[]> {
    if (!upstashRedis) throw new Error('Upstash Redis not configured');
    return upstashRedis.keys(pattern);
  },
  
  async exists(key: string): Promise<number> {
    if (!upstashRedis) throw new Error('Upstash Redis not configured');
    return upstashRedis.exists(key);
  }
};

// Export either the real KV or the mock implementation
export const kv = useRealKV ? upstashKV : mockKV;

// Choose the correct KV implementation based on environment
export function getKVProvider(): KVInterface {
  // Check if running with Upstash Redis enabled
  const useRealKV = 
    process.env.UPSTASH_REDIS_REST_URL && 
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.NODE_ENV !== 'development';
  
  // Use real Upstash Redis if available, otherwise use mock implementation
  return useRealKV ? upstashKV : new MockKV();
} 