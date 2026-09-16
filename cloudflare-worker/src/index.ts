/// <reference types="@cloudflare/workers-types" />

/**
 * TCDD Tren Boş Koltuk Bulucu Cloudflare Worker
 * Bu worker 2 dakikada bir çalışarak tren aramalarını gerçekleştirir
 */

// Worker environment tipini tanımlayalım
export interface Env {
  TRAIN_SEARCH_KV: KVNamespace;
  APP_URL: string; // Vercel app URL'iniz
  SEARCH_SECRET: string; // Güvenlik için secret key
}

// Arama bilgilerini tutan tip tanımları 
interface StoredSearchParams {
  departureStation: {
    id: string;
    name: string;
  };
  arrivalStation: {
    id: string;
    name: string;
  };
  departureDate: string;
  startTime: string;
  endTime: string;
  preferredClass: string;
}

interface StoredSearch {
  params: StoredSearchParams;
  telegram: {
    apiKey: string;
    chatId: string;
  };
  startedAt: string;
  expiresAt: string;
}

interface SearchResult {
  found: boolean;
  message: string;
  details?: string;
}

interface SearchRequest {
  searchRoutes: {
    departureStationId: number;
    departureStationName: string;
    arrivalStationId: number;
    arrivalStationName: string;
    departureDate: string;
  }[];
  passengerTypeCounts: { id: number; count: number }[];
  searchReservation: boolean;
  blTrainTypes: string[];
}

// İstasyon id'sinden sayısal kısmı çıkar ("gidis-48" -> 48)
function stationNumericId(stationId: string): number {
  const parts = stationId.split('-');
  return parseInt(parts[parts.length - 1], 10);
}

// e-bilet ile aynı tarih kuralı: seçilen günden bir gün önce, 21:00:00
function formatDepartureDateForAPI(input: string): string {
  const prevDay = new Date(input);
  prevDay.setDate(prevDay.getDate() - 1);
  const dateStr = prevDay
    .toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\./g, '-');
  return `${dateStr} 21:00:00`;
}

// Worker ana fonksiyonu
const workerHandler = {
  // Cron ile çalıştırılacak
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(checkAllTrains(env));
  },
  
  // HTTP isteği ile de çalıştırılabilir
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // POST route for handling search registration
    if (request.method === "POST" && new URL(request.url).pathname === "/register-search") {
      return await handleRegisterSearch(request, env);
    }
    
    // GET route for immediate check
    if (request.method === "GET") {
      ctx.waitUntil(checkAllTrains(env));
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Tren aramaları başlatıldı" 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};

export default workerHandler;

// Yeni bir arama kaydını işle
async function handleRegisterSearch(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { 
      searchData: { 
        id: string; 
        params: StoredSearchParams;
        telegram: { apiKey: string; chatId: string };
        startedAt: string;
        expiresAt: string;
      }; 
      secret: string 
    };
    const { searchData, secret } = body;
    
    // Güvenlik kontrolü
    if (secret !== env.SEARCH_SECRET) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Unauthorized" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (!searchData || !searchData.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Geçersiz arama verisi" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // KV'ye aramayı kaydet
    await env.TRAIN_SEARCH_KV.put(`search:${searchData.id}`, JSON.stringify(searchData));
    
    // Aktif aramalar listesini güncelle
    const activeSearchesRaw = await env.TRAIN_SEARCH_KV.get("active_searches");
    let activeSearches: string[] = [];
    
    if (activeSearchesRaw) {
      activeSearches = JSON.parse(activeSearchesRaw);
    }
    
    if (!activeSearches.includes(searchData.id)) {
      activeSearches.push(searchData.id);
      await env.TRAIN_SEARCH_KV.put("active_searches", JSON.stringify(activeSearches));
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Arama başarıyla kaydedildi" 
    }), { 
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "İstek işlenirken hata oluştu: " + (error instanceof Error ? error.message : String(error)) 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Tüm aktif aramaları kontrol et
async function checkAllTrains(env: Env): Promise<void> {
  try {
    // Aktif aramaları getir
    const activeSearchesRaw = await env.TRAIN_SEARCH_KV.get("active_searches");
    
    if (!activeSearchesRaw) {
      console.log("Aktif arama bulunamadı");
      return;
    }
    
    const activeSearches: string[] = JSON.parse(activeSearchesRaw);
    console.log(`${activeSearches.length} aktif arama kontrol ediliyor...`);
    
    let processedCount = 0;
    
    for (const searchId of activeSearches) {
      try {
        const searchDataRaw = await env.TRAIN_SEARCH_KV.get(`search:${searchId}`);
        
        if (!searchDataRaw) {
          console.log(`Arama verisi bulunamadı: ${searchId}`);
          continue;
        }
        
        const searchData: StoredSearch = JSON.parse(searchDataRaw as string);
        
        // Süresi dolmuş mu kontrol et
        if (new Date(searchData.expiresAt) < new Date()) {
          console.log(`Arama süresi dolmuş, siliniyor: ${searchId}`);
          await removeSearch(env, searchId);
          continue;
        }
        
        // API isteği gönder 
        const searchResult = await checkTrainAvailability(searchData, env.APP_URL);
        
        if (searchResult.found) {
          console.log(`Boş koltuk bulundu, bildirim gönderiliyor: ${searchId}`);
          
          const searchInfo = {
            departure: searchData.params.departureStation.name,
            arrival: searchData.params.arrivalStation.name,
            date: new Date(searchData.params.departureDate).toLocaleDateString('tr-TR', { 
              day: '2-digit', month: '2-digit', year: 'numeric' 
            }).replace(/\./g, '-'),
            timeRange: `${searchData.params.startTime} - ${searchData.params.endTime}`
          };
          
          // Telegram bildirimi gönder
          await sendTelegramNotification(
            searchResult,
            searchInfo,
            searchData.telegram.apiKey,
            searchData.telegram.chatId
          );
          
          // Arama başarılı olduğu için KV'den kaldır
          await removeSearch(env, searchId);
        }
        
        processedCount++;
      } catch (error) {
        console.error(`Arama hatası (${searchId}):`, error);
      }
    }
    
    console.log(`${processedCount} arama kontrolü tamamlandı`);
  } catch (error) {
    console.error("CheckAllTrains error:", error);
  }
}

// Aramayı KV'den kaldır
async function removeSearch(env: Env, searchId: string): Promise<void> {
  // Aramayı sil
  await env.TRAIN_SEARCH_KV.delete(`search:${searchId}`);
  
  // Aktif aramalar listesinden kaldır
  const activeSearchesRaw = await env.TRAIN_SEARCH_KV.get("active_searches");
  
  if (activeSearchesRaw) {
    let activeSearches: string[] = JSON.parse(activeSearchesRaw);
    activeSearches = activeSearches.filter(id => id !== searchId);
    await env.TRAIN_SEARCH_KV.put("active_searches", JSON.stringify(activeSearches));
  }
}

// TCDD API'sine istek gönder
async function checkTrainAvailability(searchData: StoredSearch, appUrl: string): Promise<SearchResult> {
  try {
    // SearchRequest oluştur — gerçek e-bilet gövdesiyle birebir
    const departureDate = formatDepartureDateForAPI(searchData.params.departureDate);
    const searchRequest: SearchRequest = {
      searchRoutes: [{
        departureStationId: stationNumericId(searchData.params.departureStation.id),
        departureStationName: searchData.params.departureStation.name.split(' , ')[0],
        arrivalStationId: stationNumericId(searchData.params.arrivalStation.id),
        arrivalStationName: searchData.params.arrivalStation.name.split(' , ')[0],
        departureDate: departureDate
      }],
      passengerTypeCounts: [
        { id: 0, count: 1 }
      ],
      searchReservation: false,
      blTrainTypes: ["TURISTIK_TREN"]
    };
    
    // Vercel API'sine istek gönder
    const response = await fetch(`${appUrl}/api/check-train-availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchRequest,
        preferredClass: searchData.params.preferredClass,
        startTime: searchData.params.startTime,
        endTime: searchData.params.endTime
      })
    });
    
    if (!response.ok) {
      throw new Error(`API hatası: HTTP ${response.status}`);
    }
    
    const data = await response.json() as {
      found: boolean;
      message: string;
      details?: string;
    };
    
    return {
      found: data.found || false,
      message: data.message || "Bilinmeyen sonuç",
      details: data.details
    };
  } catch (error) {
    console.error("checkTrainAvailability error:", error);
    return {
      found: false,
      message: "Arama sırasında bir hata oluştu: " + (error instanceof Error ? error.message : String(error))
    };
  }
}

// Telegram bildirimi gönder
async function sendTelegramNotification(
  result: SearchResult,
  searchInfo: { 
    departure: string;
    arrival: string;
    date: string;
    timeRange: string;
  },
  apiKey: string,
  chatId: string
): Promise<boolean> {
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
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: title + "\n" + details,
        parse_mode: "HTML"
      })
    });
    
    const responseData = await response.json() as { ok: boolean };
    
    if (response.ok && responseData.ok) {
      console.log("Telegram bildirimi başarıyla gönderildi");
      return true;
    } else {
      console.error("Telegram bildirimi gönderilirken hata:", responseData);
      return false;
    }
  } catch (error) {
    console.error("Telegram bildirimi gönderilirken hata:", error);
    return false;
  }
} 