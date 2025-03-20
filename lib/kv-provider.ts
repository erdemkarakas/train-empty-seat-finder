import { kv as vercelKV } from '@vercel/kv';
import { mockKV } from './mock-kv';

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

console.log(`Using ${useRealKV ? 'Vercel KV' : 'Mock KV'} for storage in ${process.env.NODE_ENV} environment`); 