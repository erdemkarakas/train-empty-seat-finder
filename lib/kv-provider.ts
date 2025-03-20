import { kv as vercelKV } from '@vercel/kv';
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

// Check if all required environment variables for Vercel KV are properly configured
const hasKvEnvVars = process.env.KV_REST_API_URL && 
                     process.env.KV_REST_API_TOKEN && 
                     process.env.KV_REST_API_URL.startsWith('https://');

// Force local development to use mock KV
const isDevelopment = process.env.NODE_ENV === 'development';

// Only use real Vercel KV in production with properly configured env vars
const useRealKV = !isDevelopment && hasKvEnvVars;

// Export either the real KV or the mock implementation
export const kv = useRealKV ? vercelKV : mockKV;

// Choose the correct KV implementation based on environment
export function getKVProvider(): KVInterface {
  // Check if running in a Vercel environment with KV enabled
  const useRealKV = 
    process.env.KV_REST_API_URL && 
    process.env.KV_REST_API_TOKEN &&
    process.env.NODE_ENV !== 'development';
  
  // Use real Vercel KV if available, otherwise use mock implementation
  // Using type assertion as vercelKV implements the same interface but with different return types
  return useRealKV ? vercelKV as unknown as KVInterface : new MockKV();
} 