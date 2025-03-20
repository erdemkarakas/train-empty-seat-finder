import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

// Geliştirme modunda PWA'yı devre dışı bırakalım
const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev, // Geliştirme modunda PWA'yı devre dışı bırak
  buildExcludes: [/middleware-manifest\.json$/],
  // Development modunda workbox loglarını azaltalım
  mode: isDev ? 'development' as const : 'production' as const,
  // Dev modunda önbellek oluşturmayı engelleyelim
  dynamicStartUrl: !isDev
};

const nextConfig: NextConfig = withPWA(pwaConfig)({
  /* config options here */
  experimental: {
    // turbo özelliğini kaldırdık
  },
  // Webpack yapılandırmasını koruyalım
  webpack: (config) => {
    return config;
  }
});

export default nextConfig;
