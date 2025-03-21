import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv-provider';
import { StoredSearch } from '@/lib/types';

// Cloudflare Worker URL'i ve API anahtarı için ortam değişkenleri
const cloudflareWorkerUrl = process.env.CLOUDFLARE_WORKER_URL;
const searchSecret = process.env.CLOUDFLARE_SEARCH_SECRET;

/**
 * Bu API, client-side'da başlatılan bir aramayı hem Vercel KV'ye kaydeder
 * hem de Cloudflare Worker'a bildirir. Böylece worker aramaları 2 dakikada bir kontrol edebilir.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      searchFormData,
      telegramApiKey, 
      telegramChatId,
      userId,
      duration = 24 // Varsayılan 24 saat
    } = body;
    
    if (!searchFormData || !telegramApiKey || !telegramChatId || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: "Eksik bilgi, gerekli alanlar: searchFormData, telegramApiKey, telegramChatId, userId" 
      }, { status: 400 });
    }
    
    if (!cloudflareWorkerUrl || !searchSecret) {
      console.error("Cloudflare Worker yapılandırması eksik");
      return NextResponse.json({
        success: false,
        message: "Sistem yapılandırması tamamlanmamış, lütfen yöneticiyle iletişime geçin"
      }, { status: 500 });
    }
    
    // Benzersiz bir ID oluştur
    const searchId = generateSearchId();
    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
    
    // Arama verisini hazırla
    const searchData: StoredSearch = {
      params: {
        departureStation: searchFormData.departureStation,
        arrivalStation: searchFormData.arrivalStation,
        departureDate: searchFormData.departureDate.toISOString(),
        startTime: searchFormData.startTime,
        endTime: searchFormData.endTime,
        preferredClass: searchFormData.preferredClass
      },
      telegram: {
        apiKey: telegramApiKey,
        chatId: telegramChatId
      },
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt
    };
    
    // Önce Vercel KV'ye kaydet
    await kv.set(`search:${userId}:${searchId}`, searchData, { ex: duration * 60 * 60 });
    
    // Cloudflare Worker'a bildir
    try {
      const response = await fetch(`${cloudflareWorkerUrl}/register-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchData: {
            id: `${userId}:${searchId}`,
            ...searchData
          },
          secret: searchSecret
        })
      });
      
      if (!response.ok) {
        console.error("Cloudflare Worker'a kayıt başarısız:", await response.text());
      } else {
        console.log("Arama Cloudflare Worker'a başarıyla kaydedildi");
      }
    } catch (error) {
      console.error("Cloudflare Worker'a kayıt hatası:", error);
      // Worker'a kayıt başarısız olsa bile, Vercel KV'ye kaydettik, devam ediyoruz
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Arama başlatıldı",
      searchId: searchId,
      expiresAt: expiresAt
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu" 
    }, { status: 500 });
  }
}

// Benzersiz bir arama ID'si oluştur
function generateSearchId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
} 