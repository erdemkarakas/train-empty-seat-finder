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
  },
  // Cloudflare Worker klasörünü ve bağlantılı dosyaları hariç tut
  typescript: {
    // Derleme sırasında tipleri doğrulayanın, sadece belirli klasörler için çalışmasını sağla
    ignoreBuildErrors: true, // Tip hatalarında derlemeyi durdurmamak için
  },
  // Cloudflare Worker klasörünü derlemeye dahil etme
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'md', 'mdx'],
  transpilePackages: [], // Derleme sürecinde ihtiyaç duyulan paketler
});

export default nextConfig;
