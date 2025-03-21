import { NextResponse } from 'next/server';

/**
 * Bu API Cloudflare Worker'ın konfigüre edilip edilmediğini kontrol eder.
 * client-side'dan çağrılarak UI'da gösterilir.
 */
export async function GET() {
  // Cloudflare Worker URL'i ve API anahtarı için ortam değişkenlerini kontrol et
  const cloudflareWorkerUrl = process.env.CLOUDFLARE_WORKER_URL;
  const searchSecret = process.env.CLOUDFLARE_SEARCH_SECRET;
  
  // Her ikisi de tanımlanmışsa, Cloudflare aktif kabul edilir
  const isActive = !!cloudflareWorkerUrl && !!searchSecret;
  
  return NextResponse.json({
    active: isActive,
    workerUrl: isActive ? cloudflareWorkerUrl : null
  });
} 