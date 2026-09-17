import { Impit } from 'impit';
import { SearchRequest, TrainData } from '@/lib/types';

export const TCDD_API_URL =
  'https://web-api-prod-ytp.tcddtasimacilik.gov.tr/tms/train/train-availability?environment=dev&userId=1';

const FALLBACK_AUTH_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJlVFFicDhDMmpiakp1cnUzQVk2a0ZnV196U29MQXZIMmJ5bTJ2OUg5THhRIn0.eyJleHAiOjE3MjEzODQ0NzAsImlhdCI6MTcyMTM4NDQxMCwianRpIjoiYWFlNjVkNzgtNmRkZS00ZGY4LWEwZWYtYjRkNzZiYjZlODNjIiwiaXNzIjoiaHR0cDovL3l0cC1wcm9kLW1hc3RlcjEudGNkZHRhc2ltYWNpbGlrLmdvdi50cjo4MDgwL3JlYWxtcy9tYXN0ZXIiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiMDAzNDI3MmMtNTc2Yi00OTBlLWJhOTgtNTFkMzc1NWNhYjA3IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidG1zIiwic2Vzc2lvbl9zdGF0ZSI6IjAwYzM4NTJiLTg1YjEtNDMxNS04OGIwLWQ0MWMxMTcyYzA0MSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1tYXN0ZXIiLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsInNpZCI6IjAwYzM4NTJiLTg1YjEtNDMxNS04OGIwLWQ0MWMxMTcyYzA0MSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJuYW1lIjoid2ViIiwiZ2l2ZW5fbmFtZSI6IiIsImZhbWlseV9uYW1lIjoiIn0.AIW_4Qws2wfwxyVg8dgHRT9jB3qNavob2C4mEQIQGl3urzW2jALPx-e51ZwHUb-TXB-X2RPHakonxKnWG6tDIP5aKhiidzXDcr6pDDoYU5DnQhMg1kywyOaMXsjLFjuYN5PAyGUMh6YSOVsg1PzNh-5GrJF44pS47JnB9zk03Pr08napjsZPoRB-5N4GQ49cnx7ePC82Y7YIc-gTew2baqKQPz9_v381Gbm2V38PZDH9KldlcWut7kqQYJFMJ7dkM_entPJn9lFk7R5h5j_06OlQEpWRMQTn9SQ1AYxxmZxBu5XYMKDkn4rzIIVCkdTPJNCt5PvjENjClKFeUA1DOg';

export class TcddApiError extends Error {
  status: number;
  bodyPreview: string;

  constructor(message: string, status: number, bodyPreview = '') {
    super(message);
    this.name = 'TcddApiError';
    this.status = status;
    this.bodyPreview = bodyPreview;
  }
}

const buildHeaders = (token: string): Record<string, string> => ({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'tr',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  Origin: 'https://ebilet.tcddtasimacilik.gov.tr',
  Referer: 'https://ebilet.tcddtasimacilik.gov.tr/sefer-listesi',
  Authorization: token,
  'Content-Type': 'application/json',
  'unit-id': '3895',
});

const previewBody = (text: string): string => text.replace(/\s+/g, ' ').slice(0, 280);

const parseJsonOrThrow = (text: string, status: number): TrainData => {
  try {
    return JSON.parse(text) as TrainData;
  } catch {
    throw new TcddApiError(
      `TCDD yanıtı JSON değil (${status})`,
      status,
      previewBody(text)
    );
  }
};

const requestWithBrowser = async (
  browser: 'chrome' | 'firefox',
  searchRequest: SearchRequest,
  token: string
): Promise<{ status: number; text: string }> => {
  // TCDD, veri merkezi (Vercel/AWS) IP'lerinden gelen bağlantıları TCP/TLS
  // seviyesinde resetliyor. Residential/mobil bir proxy tanımlıysa impit onu kullanır.
  const proxyUrl = process.env.TCDD_PROXY_URL || undefined;
  const client = new Impit({ browser, proxyUrl });
  const response = await client.fetch(TCDD_API_URL, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(searchRequest),
    timeout: 15000,
  });

  const text = await response.text();
  return { status: response.status, text };
};

export const fetchTrainAvailability = async (
  searchRequest: SearchRequest
): Promise<TrainData> => {
  const token = process.env.TCDD_AUTH_TOKEN || FALLBACK_AUTH_TOKEN;
  const usingProxy = Boolean(process.env.TCDD_PROXY_URL);
  const browsers: Array<'chrome' | 'firefox'> = ['chrome', 'firefox'];
  let lastStatus = 0;
  let lastText = '';
  let transportError: Error | null = null;

  for (const browser of browsers) {
    try {
      const { status, text } = await requestWithBrowser(browser, searchRequest, token);
      lastStatus = status;
      lastText = text;
      transportError = null;

      if (status >= 200 && status < 300) {
        return parseJsonOrThrow(text, status);
      }

      console.error(`TCDD ${browser} isteği ${status}: ${previewBody(text)}`);

      if (status !== 403) {
        break;
      }
    } catch (err) {
      // Bağlantı reset / timeout gibi taşıma katmanı hataları (yanıt gelmedi)
      transportError = err instanceof Error ? err : new Error(String(err));
      console.error(`TCDD ${browser} bağlantı hatası: ${transportError.message}`);
    }
  }

  if (transportError) {
    const reset = /reset|connect|timeout|refused/i.test(transportError.message);
    const hint =
      reset && !usingProxy
        ? ' TCDD veri merkezi IP\'lerini engelliyor olabilir; TCDD_PROXY_URL (residential proxy) tanımlayın.'
        : '';
    throw new TcddApiError(
      `TCDD sunucusuna bağlanılamadı.${hint}`,
      502,
      previewBody(transportError.message)
    );
  }

  throw new TcddApiError(
    `TCDD API isteği başarısız: ${lastStatus}`,
    lastStatus,
    previewBody(lastText)
  );
};
