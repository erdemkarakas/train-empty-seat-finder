import { NextRequest, NextResponse } from 'next/server';
import { startServerSearch } from '@/lib/server-service';

// Cloudflare Worker URL'i ve API anahtarı için ortam değişkenleri
const cloudflareWorkerUrl = process.env.CLOUDFLARE_WORKER_URL;
const searchSecret = process.env.CLOUDFLARE_SEARCH_SECRET;

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
    
    // Vercel KV'de aramayı başlat
    const result = await startServerSearch(
      searchFormData,
      telegramApiKey,
      telegramChatId,
      userId,
      duration
    );
    
    // Cloudflare Worker yapılandırması varsa bildirim gönder
    if (cloudflareWorkerUrl && searchSecret) {
      try {
        // Aramayı Cloudflare Worker'a da bildir
        const searchData = {
          id: `${userId}:${result.searchId}`,
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
          expiresAt: result.expiresAt
        };
        
        const response = await fetch(`${cloudflareWorkerUrl}/register-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            searchData,
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
    }
    
    return NextResponse.json({ 
      success: true, 
      message: cloudflareWorkerUrl ? "Arama başlatıldı (Cloudflare Worker etkin)" : "Arama başlatıldı",
      searchId: result.searchId,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu" 
    }, { status: 500 });
  }
} 