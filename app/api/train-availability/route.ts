import { NextResponse } from 'next/server';
import { SearchRequest } from '@/lib/types';
import { fetchTrainAvailability, TcddApiError } from '@/lib/tcdd-client';

// impit native binding (napi) kullanır: edge değil Node.js runtime gerekli.
export const runtime = 'nodejs';

/**
 * Tarayıcının doğrudan TCDD API'sine yaptığı çağrı CORS politikası nedeniyle
 * bloke ediliyor. Ayrıca TCDD kenarındaki nginx WAF, tarayıcı olmayan (Node/axios)
 * TLS parmak izini `train-availability` endpoint'inde 403 ile kesiyor.
 *
 * Bu route Chrome TLS taklidi yapan impit tabanlı istemciyi (lib/tcdd-client.ts)
 * kullanarak isteği sunucu tarafından iletir.
 */
export async function POST(request: Request) {
  try {
    const searchRequest: SearchRequest = await request.json();

    if (!searchRequest?.searchRoutes?.length) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz arama isteği: searchRoutes eksik' },
        { status: 400 }
      );
    }

    const data = await fetchTrainAvailability(searchRequest);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TcddApiError) {
      // TCDD gövdesinin kısa özetini logla (HTML/WAF mı JSON mu ayırt etmek için)
      console.error(
        `TCDD ${error.status} yanıt önizleme: ${error.bodyPreview}`
      );
      return NextResponse.json(
        {
          success: false,
          message: `TCDD API isteği başarısız: ${error.status} Forbidden`,
        },
        { status: error.status || 502 }
      );
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
