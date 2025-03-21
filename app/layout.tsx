import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NetworkStatus from "@/components/network-status";
import { Analytics } from '@vercel/analytics/next';
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  title: "Tren Boş Koltuk Bulucu",
  description: "TCDD Tren hatlarında boş koltuk bulunduğunda bildirim gönderen uygulama",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tren Boş Koltuk Bulucu",
  },
  formatDetection: {
    telephone: false,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        {/* iOS PWA ikonları */}
        <link rel="apple-touch-icon" href="/icons/apple-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
        
        {/* Genel ikonlar */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        
        {/* Tren Emoji SVG favicons */}
        <link rel="icon" type="image/svg+xml" href="/train-emoji/train-emoji.svg" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        
        {/* Favicon'ı sadece client tarafında yükleme scripti */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                const link = document.createElement('link');
                link.rel = 'shortcut icon';
                link.href = '/favicon.ico';
                document.head.appendChild(link);
              }
            `,
          }}
        />
        
        {/* Splash screen ların gösterilmesi için */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NetworkStatus />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
