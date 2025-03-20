declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  // RuntimeCaching tipi
  interface RuntimeCaching {
    urlPattern: RegExp | string;
    handler: string;
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      cacheableResponse?: {
        statuses?: number[];
        headers?: Record<string, string>;
      };
      networkTimeoutSeconds?: number;
      plugins?: unknown[];
    };
  }
  
  interface PWAConfig {
    /** Output directory for PWA files */
    dest?: string;
    /** Enable or disable PWA features in development mode */
    disable?: boolean;
    /** Enable or disable PWA registration */
    register?: boolean;
    /** Enable or disable skipWaiting in service worker */
    skipWaiting?: boolean;
    /** Custom path to service worker file */
    sw?: string;
    /** Scope of service worker */
    scope?: string;
    /** Fallback value for browser mode navigator.onLine on server side */
    fallbacks?: {
      document?: string;
    }
    /** Other workbox options */
    runtimeCaching?: RuntimeCaching[];
    /** Files to exclude from PWA build */
    buildExcludes?: Array<string | RegExp>;
    /** Workbox development/production mode */
    mode?: 'production' | 'development';
    /** Dynamic start URL configuration */
    dynamicStartUrl?: boolean;
  }
  
  export default function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
} 