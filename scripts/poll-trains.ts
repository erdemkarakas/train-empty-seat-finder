/**
 * Standalone TCDD koltuk yoklayıcı — RESIDENTIAL bir makinede çalışır.
 *
 * Neden: TCDD, veri merkezi (Vercel/AWS) IP'lerinden gelen bağlantıları
 * resetliyor. Bu script senin evindeki always-on makinede (residential IP)
 * çalışarak ücretsiz çözüm sağlar. Vercel yalnızca UI + arama kaydı için kalır.
 *
 * Çalıştırma (Node 22, native TS type-stripping):
 *   node --env-file=.env.local scripts/poll-trains.ts
 *   node --env-file=.env.local scripts/poll-trains.ts --watch 60   # 60 sn'de bir tekrar
 *
 * Gerekli env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * Opsiyonel env: TCDD_AUTH_TOKEN (taze Bearer token — yoksa süresi dolmuş fallback)
 */
import { Redis } from '@upstash/redis';
import { fetchTrainAvailability, TcddApiError } from '../lib/tcdd-client.ts';
import { createSearchRequestFromStations } from '../lib/search-request.ts';
import { hasAvailableSeats } from '../lib/seat-availability.ts';
import type { StoredSearch, SearchResult } from '../lib/types.ts';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN eksik. .env.local yükleyin (--env-file=.env.local).');
  process.exit(1);
}

const redis = new Redis({ url, token });

async function sendTelegram(
  result: SearchResult,
  search: StoredSearch
): Promise<boolean> {
  const { apiKey, chatId } = search.telegram ?? {};
  if (!apiKey || !chatId) return false;

  const p = search.params;
  const dateStr =
    typeof p.departureDate === 'string' ? p.departureDate.split('T')[0] : String(p.departureDate);

  const text =
    `🚅 Boş Koltuk Bulundu! 🎉\n\n` +
    `<b>${p.departureStation.name}</b> → <b>${p.arrivalStation.name}</b>\n` +
    `📅 Tarih: ${dateStr}\n` +
    `🕒 Saat: ${p.startTime} - ${p.endTime}\n\n` +
    `${result.details ?? result.message}\n\n` +
    `🎫 Bilet: https://ebilet.tcddtasimacilik.gov.tr`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${apiKey}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    const data = (await res.json()) as { ok?: boolean };
    return res.ok && Boolean(data.ok);
  } catch (err) {
    console.error('Telegram gönderilemedi:', err instanceof Error ? err.message : err);
    return false;
  }
}

async function pollOnce(): Promise<void> {
  const keys = await redis.keys('search:*');
  if (keys.length === 0) {
    console.log(`[${new Date().toLocaleTimeString('tr-TR')}] Aktif arama yok.`);
    return;
  }

  console.log(`[${new Date().toLocaleTimeString('tr-TR')}] ${keys.length} arama kontrol ediliyor...`);

  for (const key of keys) {
    try {
      const search = (await redis.get(key)) as StoredSearch | null;
      if (!search) continue;

      if (new Date(search.expiresAt) < new Date()) {
        console.log(`  Süresi dolmuş, siliniyor: ${key}`);
        await redis.del(key);
        continue;
      }

      const p = search.params;
      const searchRequest = createSearchRequestFromStations({
        departureStation: p.departureStation,
        arrivalStation: p.arrivalStation,
        departureDate: p.departureDate,
      });

      const data = await fetchTrainAvailability(searchRequest);
      const result = hasAvailableSeats(data, p.preferredClass, p.startTime, p.endTime);

      console.log(`  ${p.departureStation.name} → ${p.arrivalStation.name}: ${result.found ? 'BULUNDU ✅' : result.message}`);

      if (result.found) {
        const sent = await sendTelegram(result, search);
        if (sent) {
          console.log(`  Bildirim gönderildi, arama siliniyor: ${key}`);
          await redis.del(key);
        }
      }
    } catch (err) {
      if (err instanceof TcddApiError) {
        console.error(`  TCDD hatası (${err.status}) ${key}: ${err.message} ${err.bodyPreview}`);
      } else {
        console.error(`  Arama hatası ${key}:`, err instanceof Error ? err.message : err);
      }
    }
  }
}

function parseWatchSeconds(): number | null {
  const i = process.argv.indexOf('--watch');
  if (i === -1) return null;
  const n = parseInt(process.argv[i + 1] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

const watch = parseWatchSeconds();

if (watch) {
  console.log(`Watch modu: her ${watch} sn. Durdurmak için Ctrl+C.`);
  const loop = async () => {
    await pollOnce().catch((e) => console.error('poll hatası:', e));
    setTimeout(loop, watch * 1000);
  };
  loop();
} else {
  pollOnce()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('poll hatası:', e);
      process.exit(1);
    });
}
