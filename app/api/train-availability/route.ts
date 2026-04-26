import { NextResponse } from 'next/server';
import axios from 'axios';
import { SearchRequest, TrainData } from '@/lib/types';

/**
 * Tarayıcının doğrudan TCDD API'sine yaptığı çağrı CORS politikası nedeniyle
 * bloke ediliyor (TCDD yalnızca ebilet.tcddtasimacilik.gov.tr origin'ini kabul ediyor).
 *
 * Bu route Next.js sunucusu üzerinden TCDD API'sine istek atan saf bir proxy'dir.
 * Sunucudan sunucuya yapılan isteklerde CORS uygulanmadığı için tarayıcı bu route'a
 * güvenle istek atabilir ve aynı ham TrainData yanıtını alabilir.
 */
export async function POST(request: Request) {
  try {
    const searchRequest: SearchRequest = await request.json();

    if (!searchRequest || !searchRequest.departureStationId || !searchRequest.arrivalStationId) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz arama isteği' },
        { status: 400 }
      );
    }

    const url = 'https://web-api-prod-ytp.tcddtasimacilik.gov.tr/tms/train/train-availability';
    const queryParams = 'environment=dev&userId=1';

    const response = await axios.post<TrainData>(`${url}?${queryParams}`, searchRequest, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'tr',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Origin: 'https://ebilet.tcddtasimacilik.gov.tr',
        Referer: 'https://ebilet.tcddtasimacilik.gov.tr/sefer-listesi',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        Authorization:
          'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJlVFFicDhDMmpiakp1cnUzQVk2a0ZnV196U29MQXZIMmJ5bTJ2OUg5THhRIn0.eyJleHAiOjE3MjEzODQ0NzAsImlhdCI6MTcyMTM4NDQxMCwianRpIjoiYWFlNjVkNzgtNmRkZS00ZGY4LWEwZWYtYjRkNzZiYjZlODNjIiwiaXNzIjoiaHR0cDovL3l0cC1wcm9kLW1hc3RlcjEudGNkZHRhc2ltYWNpbGlrLmdvdi50cjo4MDgwL3JlYWxtcy9tYXN0ZXIiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiMDAzNDI3MmMtNTc2Yi00OTBlLWJhOTgtNTFkMzc1NWNhYjA3IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidG1zIiwic2Vzc2lvbl9zdGF0ZSI6IjAwYzM4NTJiLTg1YjEtNDMxNS04OGIwLWQ0MWMxMTcyYzA0MSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1tYXN0ZXIiLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsInNpZCI6IjAwYzM4NTJiLTg1YjEtNDMxNS04OGIwLWQ0MWMxMTcyYzA0MSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJuYW1lIjoid2ViIiwiZ2l2ZW5fbmFtZSI6IiIsImZhbWlseV9uYW1lIjoiIn0.AIW_4Qws2wfwxyVg8dgHRT9jB3qNavob2C4mEQIQGl3urzW2jALPx-e51ZwHUb-TXB-X2RPHakonxKnWG6tDIP5aKhiidzXDcr6pDDoYU5DnQhMg1kywyOaMXsjLFjuYN5PAyGUMh6YSOVsg1PzNh-5GrJF44pS47JnB9zk03Pr08napjsZPoRB-5N4GQ49cnx7ePC82Y7YIc-gTew2baqKQPz9_v381Gbm2V38PZDH9KldlcWut7kqQYJFMJ7dkM_entPJn9lFk7R5h5j_06OlQEpWRMQTn9SQ1AYxxmZxBu5XYMKDkn4rzIIVCkdTPJNCt5PvjENjClKFeUA1DOg',
        'Content-Type': 'application/json',
        'unit-id': '3895',
      },
      timeout: 15000,
    });

    return NextResponse.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const message = error.response
        ? `TCDD API isteği başarısız: ${error.response.status} ${error.response.statusText}`
        : error.request
          ? 'TCDD sunucusundan yanıt alınamadı'
          : `İstek oluşturulurken hata: ${error.message}`;

      return NextResponse.json({ success: false, message }, { status });
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
