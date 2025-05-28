import { 
  SearchRequest, 
  TrainData, 
  SearchResult, 
  SearchInfo 
} from '@/lib/types';
import axios from 'axios';

// API call to check for available seats
export async function checkTrainAvailability(searchRequest: SearchRequest): Promise<TrainData> {

  try {
    // Kullanacağımız endpoint ve query parametreleri
    const url = 'https://web-api-prod-ytp.tcddtasimacilik.gov.tr/tms/train/train-availability';
    const queryParams = 'environment=dev&userId=1';
    
    // Axios ile API isteği
    const response = await axios({
      method: 'post',
      url: `${url}?${queryParams}`,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "tr",
        "Authorization": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJlVFFicDhDMmpiakp1cnUzQVk2a0ZnV196U29MQXZIMmJ5bTJ2OUg5THhRIn0.eyJleHAiOjE3MjEzODQ0NzAsImlhdCI6MTcyMTM4NDQxMCwianRpIjoiYWFlNjVkNzgtNmRkZS00ZGY4LWEwZWYtYjRkNzZiYjZlODNjIiwiaXNzIjoiaHR0cDovL3l0cC1wcm9kLW1hc3RlcjEudGNkZHRhc2ltYWNpbGlrLmdvdi50cjo4MDgwL3JlYWxtcy9tYXN0ZXIiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiMDAzNDI3MmMtNTc2Yi00OTBlLWJhOTgtNTFkMzc1NWNhYjA3IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidG1zIiwic2Vzc2lvbl9zdGF0ZSI6IjAwYzM4NTJiLTg1YjEtNDMxNS04OGIwLWQ0MWMxMTcyYzA0MSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1tYXN0ZXIiLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsInNpZCI6IjAwYzM4NTJiLTg1YjEtNDMxNS04OGIwLWQ0MWMxMTcyYzA0MSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJuYW1lIjoid2ViIiwiZ2l2ZW5fbmFtZSI6IiIsImZhbWlseV9uYW1lIjoiIn0.AIW_4Qws2wfwxyVg8dgHRT9jB3qNavob2C4mEQIQGl3urzW2jALPx-e51ZwHUb-TXB-X2RPHakonxKnWG6tDIP5aKhiidzXDcr6pDDoYU5DnQhMg1kywyOaMXsjLFjuYN5PAyGUMh6YSOVsg1PzNh-5GrJF44pS47JnB9zk03Pr08napjsZPoRB-5N4GQ49cnx7ePC82Y7YIc-gTew2baqKQPz9_v381Gbm2V38PZDH9KldlcWut7kqQYJFMJ7dkM_entPJn9lFk7R5h5j_06OlQEpWRMQTn9SQ1AYxxmZxBu5XYMKDkn4rzIIVCkdTPJNCt5PvjENjClKFeUA1DOg",
        "Content-Type": "application/json",
        "unit-id": "3895"
      },
      data: searchRequest
    });

    // Axios otomatik olarak JSON parse eder, response.data'yı direkt kullanabiliriz
    return response.data;
  } catch (error) {
    // Axios hata yakalama
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Sunucu cevabı ile birlikte bir hata (4xx, 5xx durum kodları)
        throw new Error(`API isteği başarısız oldu: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        // İstek yapıldı ancak cevap alınamadı
        throw new Error('Sunucudan yanıt alınamadı, lütfen internet bağlantınızı kontrol edin');
      } else {
        // İstek oluşturulurken bir şeyler ters gitti
        throw new Error(`İstek oluşturulurken hata: ${error.message}`);
      }
    } else {
      // Axios hatası olmayan diğer hatalar
      throw error;
    }
  }
}

// Check if there are available seats based on a preferredClass
export function hasAvailableSeats(data: TrainData, preferredClass: string, startTime?: string, endTime?: string): SearchResult {
  try {
    if (!data || !data.trainLegs || data.trainLegs.length === 0) {
      return { found: false, message: "Hiç tren bulunamadı veya veri geçersiz" };
    }

    if (!data?.trainLegs?.[0]?.trainAvailabilities) {
      return { found: false, message: "Tren bilgisi bulunamadı" };
    }

    const trainAvailabilities = data.trainLegs[0].trainAvailabilities;
    
    // Mevcut koltuklar için tip tanımı
    interface AvailableSeat {
      class: string;
      count: number;
      time: string | number | null;
      trainTimeForDisplay: string;
      trainIndex: number;
      trainNumber: string;
      trainRoute: string;
    }
    
    const availableSeats: AvailableSeat[] = [];
    
    // Saat çevirme yardımcı fonksiyonu
    const timeToMinutes = (timeStr: string | number | undefined | null): number => {
      if (!timeStr) return 0;
      
      // Ensure timeStr is a string
      const timeString = String(timeStr);
      
      try {
        // Handle datetime format: "2023-12-31 14:30:00" -> "14:30:00"
        const timeOnly = timeString.includes(' ') ? timeString.split(' ')[1] : timeString;
        
        // Parse hours and minutes
        const timeParts = timeOnly.split(':');
        if (timeParts.length < 2) return 0;
        
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        
        return hours * 60 + minutes;
      } catch {
        return 0;
      }
    };
    
    // Kullanıcının seçtiği saat aralığı (varsa)
    const startMinutes = startTime ? timeToMinutes(startTime) : 0;
    const endMinutes = endTime ? timeToMinutes(endTime) : 24 * 60;
    
    // Tüm trainAvailabilities dizisini döngüye alalım
    for (let i = 0; i < trainAvailabilities.length; i++) {
      const availability = trainAvailabilities[i];
      
      // Her bir availability içindeki trenleri kontrol edelim
      if (availability?.trains && availability.trains.length > 0) {
        
        for (let j = 0; j < availability.trains.length; j++) {
          const train = availability.trains[j];
          
          // Tren kalkış saatini segments üzerinden al
          const segments = train.segments || [];
          const departureTime = segments.length > 0 ? segments[0].departureTime : null;
          
          // Saat bilgisi için varsayılan değer
          let trainMinutes = 0;
          let trainTimeForDisplay = "Bilinmeyen";
          
          // Saat aralığı kontrolü
          if (departureTime) {
            // Eğer departureTime bir sayı ise (timestamp) bunu Date nesnesine çevir
            if (typeof departureTime === 'number' || !isNaN(Number(departureTime))) {
              // Milliseconds timestamp
              const timestamp = typeof departureTime === 'number' ? departureTime : Number(departureTime);
              const date = new Date(timestamp);
              trainMinutes = date.getHours() * 60 + date.getMinutes();
              trainTimeForDisplay = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            } else {
              trainMinutes = timeToMinutes(departureTime);
              trainTimeForDisplay = typeof departureTime === 'string' ? 
                (departureTime.includes(':') ? departureTime.split(':').slice(0, 2).join(':') : departureTime) : 
                "Bilinmeyen";
            }
            
            if (trainMinutes < startMinutes || trainMinutes > endMinutes) {
              continue; // Bu treni atla
            }
          }
          
          if (train?.cabinClassAvailabilities) {
            
            for (const cabin of train.cabinClassAvailabilities) {
              
              // Check if there are available seats and filter by preferred class
              // Skip TEKERLEKLİ SANDALYE and LOCA type cabins
              if (cabin.availabilityCount > 0 && 
                  cabin.cabinClass.name !== "TEKERLEKLİ SANDALYE" && 
                  cabin.cabinClass.name !== "LOCA") {
                if (
                  preferredClass === "ANY" || 
                  (preferredClass === "BUSINESS" && cabin.cabinClass.name === "BUSİNESS") ||
                  (preferredClass === "ECONOMY" && cabin.cabinClass.name === "EKONOMİ")
                ) {
                  availableSeats.push({
                    class: cabin.cabinClass.name,
                    count: cabin.availabilityCount,
                    time: departureTime || "Bilinmeyen",
                    trainTimeForDisplay: trainTimeForDisplay || "Bilinmeyen",
                    trainIndex: i + 1,
                    trainNumber: train.trainNumber || "Bilinmeyen",
                    trainRoute: availability.routeInfo || "Bilinmeyen"
                  });
                }
              }
            }
          }
        }
      }
    }
    
    if (availableSeats.length > 0) {
      // We found available seats matching the criteria
      const details = availableSeats.map(seat => {
        // Saat formatını doğru şekilde göster
        let timeDisplay = "Bilinmeyen";
        
        if (seat.trainTimeForDisplay && seat.trainTimeForDisplay !== "Bilinmeyen") {
          timeDisplay = seat.trainTimeForDisplay;
        } else if (typeof seat.time === 'number') {
          // Eğer timestamp ise düzgün formata çevir
          const date = new Date(seat.time);
          timeDisplay = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        } else if (typeof seat.time === 'string' && seat.time.includes(' ')) {
          // "2023-09-15 14:30:00" -> "14:30"
          timeDisplay = seat.time.split(' ')[1].substring(0, 5);
        } else if (typeof seat.time === 'string') {
          timeDisplay = seat.time.substring(0, 5);
        }
        
        // Tren numarası ve rota bilgisi ekle
        const trainInfo = seat.trainNumber !== "Bilinmeyen" ? `Tren: ${seat.trainNumber}` : "";
        const routeInfo = seat.trainRoute !== "Bilinmeyen" ? `(${seat.trainRoute})` : "";
        const trainDetails = [trainInfo, routeInfo].filter(Boolean).join(" ");
        
        return `${seat.class}: ${seat.count} koltuk (${timeDisplay}) ${trainDetails}`.trim();
      }).join("\n- ");
      
      const result = { 
        found: true, 
        message: `Boş koltuk bulundu!`, 
        details: `- ${details}` 
      };
      
      return result;
    } else {
      return { found: false, message: "Uygun koltuk bulunamadı", description: "Tarayıcıyıcınızı açık bıraktığınız sürece koltuk aramaya devam edeceksiniz.Telegram kurulumu yaparsanız koltuk bulunduğunda telefonunuzda bildirim alacaksınız." };
    }
  } catch {
    return { found: false, message: "Veri analiz hatası" };
  }
}

// Send Telegram notification
export const sendTelegramNotification = async (
  result: SearchResult,
  searchInfo: SearchInfo
): Promise<boolean> => {
  try {
    // Telegram bilgilerini kontrol et
    const botToken = localStorage.getItem("telegramApiKey");
    const chatId = localStorage.getItem("telegramChatId");
    
    if (!botToken || !chatId) {
      return false;
    }
    
    // Bildirim mesajını hazırla
    const title = `🚅 Boş Koltuk Bulundu! 🎉`;
    const details = `
<b>${searchInfo.departure}</b> → <b>${searchInfo.arrival}</b>
📅 Tarih: ${searchInfo.date}
🕒 Saat: ${searchInfo.timeRange}

${result.details ? result.details.replace(/\n/g, '\n') : result.message}
`;
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // Timeout ile fetch işlemi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await axios.post(url, {
        chat_id: chatId,
        text: title + "\n" + details,
        parse_mode: "HTML"
      }, {
        timeout: 10000
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 200 && response.data.ok) {
        return true;
      } else {
        return false;
      }
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  } catch {
    return false;
  }
};