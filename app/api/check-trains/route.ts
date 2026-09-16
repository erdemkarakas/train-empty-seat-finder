import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv-provider';
import { fetchTrainAvailability } from '@/lib/tcdd-client';
import { hasAvailableSeats } from '@/lib/seat-availability';
import { createSearchRequestFromStations } from '@/lib/search-request';
import { SearchResult, StoredSearch } from '@/lib/types';
import axios from 'axios';

// impit native binding kullanır: Node.js runtime gerekli.
export const runtime = 'nodejs';

// Cron job çalıştığında keyleri açığa çıkarmadan sorgular yapacağız
// Client-side localStorage olmadığı için custom bir sendTelegramNotification implementasyonu
async function sendNotification(result: SearchResult, searchInfo: { 
  departure: string;
  arrival: string;
  date: string;
  timeRange: string;
}, apiKey: string, chatId: string): Promise<boolean> {
  try {
    const title = `🚅 Boş Koltuk Bulundu! 🎉`;
    const details = `
<b>${searchInfo.departure}</b> → <b>${searchInfo.arrival}</b>
📅 Tarih: ${searchInfo.date}
🕒 Saat: ${searchInfo.timeRange}

${result.details ? result.details.replace(/\n/g, '\n') : result.message}

🎫 <b>Bilet almak için:</b> https://ebilet.tcddtasimacilik.gov.tr
`;
    
    const url = `https://api.telegram.org/bot${apiKey}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: chatId,
      text: title + "\n" + details,
      parse_mode: "HTML"
    }, {
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.ok) {
      console.log("Telegram bildirimi başarıyla gönderildi");
      return true;
    } else {
      console.error("Telegram bildirimi gönderilirken hata:", response.data);
      return false;
    }
  } catch (error) {
    console.error("Telegram bildirimi gönderilirken hata:", error);
    return false;
  }
}

// API route handler
export async function GET() {
  try {
    // Tüm aktif aramaları getir
    // Yeni format: search:<userId>:<searchId>
    // Eski format: search:<searchId>
    const searchKeys = await kv.keys('search:*');
    
    if (searchKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aktif arama bulunamadı",
        searchCount: 0
      });
    }
    
    console.log(`${searchKeys.length} aktif arama kontrol ediliyor...`);
    
    const results = [];
    let processedCount = 0;
    
    for (const key of searchKeys) {
      try {
        // Redis'ten arama bilgilerini al
        const search = await kv.get(key) as StoredSearch;
        
        if (!search) {
          continue;
        }
        
        // Süresi dolmuş mu kontrol et
        if (new Date(search.expiresAt) < new Date()) {
          console.log(`Arama süresi dolmuş, siliniyor: ${key}`);
          await kv.del(key);
          continue;
        }
        
        // Aramayı gerçekleştir
        console.log(`Arama yapılıyor: ${key}`);
        const searchParams = search.params;

        // SearchRequest oluştur — gerçek e-bilet gövdesiyle birebir (id 0, searchReservation false, blTrainTypes)
        const searchRequest = createSearchRequestFromStations({
          departureStation: searchParams.departureStation,
          arrivalStation: searchParams.arrivalStation,
          departureDate: searchParams.departureDate,
        });

        // TCDD API sorgusu (sunucu: impit)
        const data = await fetchTrainAvailability(searchRequest);
        
        // Boş koltuk kontrolü
        const result = hasAvailableSeats(
          data,
          searchParams.preferredClass,
          searchParams.startTime,
          searchParams.endTime
        );
        
        // Key'i parçalara ayır: search:<userId/searchId> veya search:<userId>:<searchId>
        const keyParts = key.split(':');
        const searchId = keyParts.length === 3 ? keyParts[2] : keyParts[1];
        
        // Sonuçları kaydet
        results.push({
          searchId: searchId,
          found: result.found,
          message: result.message
        });
        
        // Boş koltuk bulunduysa bildirim gönder ve aramayı sonlandır
        if (result.found) {
          const searchInfo = {
            departure: searchParams.departureStation.name,
            arrival: searchParams.arrivalStation.name,
            date: typeof searchParams.departureDate === 'string' ? 
              searchParams.departureDate : 
              new Date(searchParams.departureDate).toLocaleDateString('tr-TR', { 
                day: '2-digit', month: '2-digit', year: 'numeric' 
              }).replace(/\./g, '-'),
            timeRange: `${searchParams.startTime} - ${searchParams.endTime}`
          };
          
          const notificationSent = await sendNotification(
            result,
            searchInfo,
            search.telegram.apiKey,
            search.telegram.chatId
          );
          
          if (notificationSent) {
            console.log(`Bildirim gönderildi, arama siliniyor: ${key}`);
            await kv.del(key);
          }
        }
        
        processedCount++;
      } catch (searchError) {
        console.error(`Arama hatası (${key}):`, searchError);
        
        // Key'i parçalara ayır: search:<userId/searchId> veya search:<userId>:<searchId>
        const keyParts = key.split(':');
        const searchId = keyParts.length === 3 ? keyParts[2] : keyParts[1];
        
        results.push({
          searchId: searchId,
          error: searchError instanceof Error ? searchError.message : "Bilinmeyen hata"
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${processedCount} arama kontrolü tamamlandı`,
      searchCount: searchKeys.length,
      results: results
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu"
    }, { status: 500 });
  }
} 