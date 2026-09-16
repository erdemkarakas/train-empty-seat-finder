import { SearchRequest, TrainData, SearchResult, SearchInfo } from '@/lib/types';
import axios from 'axios';
import { hasAvailableSeats } from '@/lib/seat-availability';

// Boş koltuk çıkarımı saf modülde; geriye dönük uyumluluk için yeniden dışa aktar.
export { hasAvailableSeats };

// TARAYICI tarafı istek. TCDD'ye impit ile giden sunucu istemcisi (lib/tcdd-client.ts)
// native binding (node:fs) içerdiği için buraya import EDİLMEZ — aksi halde client
// bundle'a sızar ve `next build` webpack "node:fs" hatası verir. Sunucu route'ları
// doğrudan `fetchTrainAvailability`'yi çağırır.
export async function checkTrainAvailability(searchRequest: SearchRequest): Promise<TrainData> {
  try {
    const response = await axios.post<TrainData>('/api/train-availability', searchRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const apiMessage =
          (error.response.data as { message?: string } | undefined)?.message ??
          `${error.response.status} ${error.response.statusText}`;
        throw new Error(`API isteği başarısız oldu: ${apiMessage}`);
      }
      if (error.request) {
        throw new Error('Sunucudan yanıt alınamadı, lütfen internet bağlantınızı kontrol edin');
      }
      throw new Error(`İstek oluşturulurken hata: ${error.message}`);
    }
    throw error;
  }
}

// Send Telegram notification
export const sendTelegramNotification = async (
  result: SearchResult,
  searchInfo: SearchInfo
): Promise<boolean> => {
  try {
    const botToken = localStorage.getItem('telegramApiKey');
    const chatId = localStorage.getItem('telegramChatId');

    if (!botToken || !chatId) {
      return false;
    }

    const title = `🚅 Boş Koltuk Bulundu! 🎉`;
    const details = `
<b>${searchInfo.departure}</b> → <b>${searchInfo.arrival}</b>
📅 Tarih: ${searchInfo.date}
🕒 Saat: ${searchInfo.timeRange}

${result.details ? result.details.replace(/\n/g, '\n') : result.message}
`;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const response = await axios.post(
        url,
        {
          chat_id: chatId,
          text: title + '\n' + details,
          parse_mode: 'HTML',
        },
        { timeout: 10000 }
      );

      return response.status === 200 && response.data.ok;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
};
