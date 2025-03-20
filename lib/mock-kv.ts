// Mock implementation of Vercel KV for local development
import { StoredSearch } from './types';

// Define the allowed value types for the KV store
type KVValueType = StoredSearch | string | number | boolean | null | Record<string, unknown>;

export class MockKV {
  private storage: Map<string, { value: KVValueType, expires?: number }>;
  
  constructor() {
    this.storage = new Map();
    this.loadFromLocalStorage();
    this.addSampleSearchData();
  }
  
  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const storedData = localStorage.getItem('mockKV');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        Object.keys(parsed).forEach(key => {
          this.storage.set(key, parsed[key]);
        });
      }
    } catch {
      // Silent error - just use empty storage
    }
  }
  
  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const data: Record<string, unknown> = {};
      this.storage.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem('mockKV', JSON.stringify(data));
    } catch {
      // Silent error - just continue
    }
  }
  
  private addSampleSearchData() {
    // Add some sample data for testing if empty
    if (this.storage.size === 0) {
      // Add sample data here if needed
    }
  }
  
  async set(key: string, value: KVValueType, options?: { ex?: number }): Promise<void> {
    const item: { value: KVValueType, expires?: number } = { value };
    
    if (options?.ex) {
      item.expires = Date.now() + options.ex * 1000;
    }
    
    this.storage.set(key, item);
    this.saveToLocalStorage();
  }
  
  async get(key: string): Promise<KVValueType | null> {
    const item = this.storage.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (item.expires && item.expires < Date.now()) {
      this.storage.delete(key);
      this.saveToLocalStorage();
      return null;
    }
    
    return item.value;
  }
  
  async del(key: string): Promise<void> {
    this.storage.delete(key);
    this.saveToLocalStorage();
  }
  
  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching for keys (supports only * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matchingKeys = Array.from(this.storage.keys()).filter(key => regex.test(key));
    
    return matchingKeys;
  }
  
  async exists(key: string): Promise<number> {
    return this.storage.has(key) ? 1 : 0;
  }
  
  // For testing and debugging
  dump(): Record<string, KVValueType> {
    const result: Record<string, KVValueType> = {};
    this.storage.forEach((item, key) => {
      result[key] = item.value;
    });
    return result;
  }
}

export const mockKV = new MockKV(); 