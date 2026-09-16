import { kv } from '@/lib/kv-provider';
import { SearchFormData, SearchRequest, StoredSearch } from './types';
import {
  createSearchRequest as buildSearchRequest,
  formatDepartureDateForAPI as buildDepartureDate,
} from './search-request';

/**
 * Sunucu tarafında bir tren araması başlatır ve Vercel KV'de saklar
 */
export async function startServerSearch(
  searchFormData: SearchFormData,
  telegramApiKey: string,
  telegramChatId: string,
  userId: string,
  duration: number = 24 // Varsayılan 24 saat
) {
  try {
    const searchId = generateSearchId();
    
    // Redis'e arama bilgilerini kaydet
    // duration saat sonra otomatik silinecek şekilde
    await kv.set(`search:${userId}:${searchId}`, {
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
      expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString()
    }, { ex: duration * 60 * 60 });
    
    return {
      success: true,
      searchId,
      expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString()
    };
  } catch (error) {
    console.error('Server search start error:', error);
    throw new Error(error instanceof Error ? error.message : "Sunucu araması başlatılamadı");
  }
}

/**
 * Kullanıcının aktif aramalarını kontrol eder
 */
export async function getUserActiveSearches(userId: string) {
  try {
    // Kullanıcının aktif aramalarını getir
    const searchKeys = await kv.keys(`search:${userId}:*`);
    
    if (searchKeys.length === 0) {
      return {
        success: true,
        message: "Aktif arama bulunamadı",
        searchCount: 0,
        searches: []
      };
    }
    
    const searches = [];
    
    for (const key of searchKeys) {
      const search = await kv.get(key) as StoredSearch;
      if (search) {
        searches.push({
          searchId: key.split(':')[2],
          startedAt: search.startedAt,
          expiresAt: search.expiresAt,
          params: search.params
        });
      }
    }
    
    return {
      success: true,
      message: `${searches.length} aktif arama bulundu`,
      searchCount: searches.length,
      searches
    };
  } catch (error) {
    console.error('Get user searches error:', error);
    throw new Error(error instanceof Error ? error.message : "Aktif aramalar getirilemedi");
  }
}

/**
 * Kullanıcının bir aramasını iptal eder
 */
export async function cancelUserSearch(userId: string, searchId: string) {
  try {
    const key = `search:${userId}:${searchId}`;
    const exists = await kv.exists(key);
    
    if (!exists) {
      return {
        success: false,
        message: "Belirtilen arama bulunamadı"
      };
    }
    
    await kv.del(key);
    
    return {
      success: true,
      message: "Arama başarıyla iptal edildi"
    };
  } catch (error) {
    console.error('Cancel search error:', error);
    throw new Error(error instanceof Error ? error.message : "Arama iptal edilemedi");
  }
}

// Yardımcı fonksiyonlar
function generateSearchId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * TCDD API isteği için SearchRequest oluşturur.
 * Gerçek e-bilet gövdesiyle birebir eşleşir (lib/search-request.ts).
 */
export function createSearchRequest(formData: SearchFormData): SearchRequest {
  return buildSearchRequest(formData);
}

/**
 * Helper function to format departure date for API (one day earlier at 21:00)
 */
export function formatDepartureDateForAPI(selectedDate: Date): string {
  return buildDepartureDate(selectedDate);
} 