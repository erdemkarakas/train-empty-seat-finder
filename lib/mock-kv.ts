// Mock implementation of Vercel KV for local development
import { StoredSearch } from './types';

// Define a type that can handle all supported KV value types
type KVValue = StoredSearch | string | number | boolean | null | { [key: string]: KVValue };

class MockKV {
  private storage: Map<string, KVValue> = new Map();
  
  constructor() {
    // Add sample data for development
    this.addSampleData();
    
    // Log all sample data keys for debugging
    console.log('[MockKV] Initialized with keys:', [...this.storage.keys()]);
  }
  
  // Add sample data for testing
  private addSampleData() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Sample search data
    const sampleSearch: StoredSearch = {
      params: {
        departureStation: {
          id: "100",
          name: "Ankara Gar"
        },
        arrivalStation: {
          id: "200",
          name: "İstanbul Söğütlüçeşme"
        },
        departureDate: tomorrow.toISOString(),
        startTime: "08:00",
        endTime: "20:00",
        preferredClass: "ANY"
      },
      telegram: {
        apiKey: "sample-api-key",
        chatId: "sample-chat-id"
      },
      startedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Add sample search to storage
    this.storage.set("search:test-user-id:sample-search-id", sampleSearch);
    console.log('[MockKV] Added sample search data for testing');
  }
  
  async set(key: string, value: KVValue, options?: { ex?: number }): Promise<string> {
    this.storage.set(key, value);
    
    // If expiration is set, schedule deletion
    if (options?.ex) {
      const expiryMs = options.ex * 1000;
      setTimeout(() => {
        this.storage.delete(key);
        console.log(`[MockKV] Auto-expired: ${key}`);
      }, expiryMs);
    }
    
    console.log(`[MockKV] Set: ${key}`);
    return 'OK';
  }
  
  async get(key: string): Promise<KVValue | null> {
    const value = this.storage.get(key);
    console.log(`[MockKV] Get: ${key}`);
    return value || null;
  }
  
  async del(key: string): Promise<number> {
    const deleted = this.storage.delete(key);
    console.log(`[MockKV] Delete: ${key}`);
    return deleted ? 1 : 0;
  }
  
  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching for 'search:*' type patterns
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys = [...this.storage.keys()].filter(key => regex.test(key));
    console.log(`[MockKV] Keys with pattern: ${pattern}, found: ${matchingKeys.length}`, matchingKeys);
    return matchingKeys;
  }
  
  async exists(key: string): Promise<number> {
    const exists = this.storage.has(key);
    console.log(`[MockKV] Exists: ${key}`);
    return exists ? 1 : 0;
  }
}

export const mockKV = new MockKV(); 