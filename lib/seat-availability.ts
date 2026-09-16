import type { TrainData, SearchResult, Train } from './types';

// Saf boş-koltuk çıkarımı. TCDD istemcisinden (impit) bağımsız olduğu için
// TCDD'ye gitmeden birim testi yazılabilir.

interface CabinCount {
  name: string;
  count: number;
}

// Bir trendeki sınıf/adet bilgisini üç olası kaynaktan sırayla okur:
// 1) cabinClassAvailabilities (özet)  2) availableFareInfo[].cabinClasses  3) cars[].availabilities
export function extractCabinCounts(train: Train): CabinCount[] {
  if (train.cabinClassAvailabilities?.length) {
    return train.cabinClassAvailabilities
      .filter((c) => c?.cabinClass?.name)
      .map((c) => ({ name: c.cabinClass.name, count: c.availabilityCount ?? 0 }));
  }

  if (train.availableFareInfo?.length) {
    const byName = new Map<string, number>();
    for (const fare of train.availableFareInfo) {
      for (const cc of fare.cabinClasses ?? []) {
        const name = cc?.cabinClass?.name;
        if (!name) continue;
        // Aynı sınıf birden çok fare ailesinde görünebilir; en yüksek müsaitliği al.
        byName.set(name, Math.max(byName.get(name) ?? 0, cc.availabilityCount ?? 0));
      }
    }
    return [...byName].map(([name, count]) => ({ name, count }));
  }

  if (train.cars?.length) {
    const byName = new Map<string, number>();
    for (const car of train.cars) {
      for (const av of car.availabilities ?? []) {
        const name = av?.cabinClass?.name;
        if (!name) continue;
        const count =
          av.availability ??
          (av.pricingList ?? []).reduce((m, p) => Math.max(m, p.availability ?? 0), 0);
        // Vagonlar arasında aynı sınıfın koltukları toplanır.
        byName.set(name, (byName.get(name) ?? 0) + (count ?? 0));
      }
    }
    return [...byName].map(([name, count]) => ({ name, count }));
  }

  return [];
}

// Kalkış saatini Europe/Istanbul saat diliminde döndür (sunucu UTC olsa bile kaymasın).
export function departureInIstanbul(train: Train): { minutes: number | null; display: string } {
  const raw = train.segments?.[0]?.departureTime;
  if (raw === undefined || raw === null) return { minutes: null, display: 'Bilinmeyen' };

  // Epoch (ms) veya "YYYY-MM-DD HH:mm:ss" formatı
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isNaN(asNumber)) {
    const parts = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(asNumber));
    const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return { minutes: parseInt(hh, 10) * 60 + parseInt(mm, 10), display: `${hh}:${mm}` };
  }

  const str = String(raw);
  const timeOnly = str.includes(' ') ? str.split(' ')[1] : str;
  const [h, m] = timeOnly.split(':');
  const hh = parseInt(h ?? '0', 10) || 0;
  const mm = parseInt(m ?? '0', 10) || 0;
  return {
    minutes: hh * 60 + mm,
    display: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
  };
}

export function timeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const timeOnly = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
  const parts = timeOnly.split(':');
  if (parts.length < 2) return null;
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

export function classMatches(preferredClass: string, cabinName: string): boolean {
  if (cabinName === 'TEKERLEKLİ SANDALYE' || cabinName === 'LOCA') return false;
  if (preferredClass === 'ANY') return true;
  if (preferredClass === 'BUSINESS') return cabinName === 'BUSİNESS';
  if (preferredClass === 'ECONOMY') return cabinName === 'EKONOMİ';
  return false;
}

// Check if there are available seats based on a preferredClass
export function hasAvailableSeats(
  data: TrainData,
  preferredClass: string,
  startTime?: string,
  endTime?: string
): SearchResult {
  try {
    const trainAvailabilities = data?.trainLegs?.[0]?.trainAvailabilities;
    if (!trainAvailabilities?.length) {
      return { found: false, message: 'Hiç tren bulunamadı veya veri geçersiz' };
    }

    const startMinutes = timeToMinutes(startTime) ?? 0;
    const endMinutes = timeToMinutes(endTime) ?? 24 * 60;

    interface AvailableSeat {
      class: string;
      count: number;
      timeDisplay: string;
      trainNumber: string;
      trainRoute: string;
    }
    const availableSeats: AvailableSeat[] = [];

    for (let i = 0; i < trainAvailabilities.length; i++) {
      const availability = trainAvailabilities[i];
      for (const train of availability?.trains ?? []) {
        const dep = departureInIstanbul(train);

        // Saat aralığı filtresi (saat biliniyorsa)
        if (dep.minutes !== null && (dep.minutes < startMinutes || dep.minutes > endMinutes)) {
          continue;
        }

        const trainNumber = train.number || train.trainNumber || 'Bilinmeyen';

        for (const cabin of extractCabinCounts(train)) {
          if (cabin.count > 0 && classMatches(preferredClass, cabin.name)) {
            availableSeats.push({
              class: cabin.name,
              count: cabin.count,
              timeDisplay: dep.display,
              trainNumber,
              trainRoute: availability.routeInfo || 'Bilinmeyen',
            });
          }
        }
      }
    }

    if (availableSeats.length === 0) {
      return {
        found: false,
        message: 'Uygun koltuk bulunamadı',
        description:
          'Tarayıcıyıcınızı açık bıraktığınız sürece koltuk aramaya devam edeceksiniz.Telegram kurulumu yaparsanız koltuk bulunduğunda telefonunuzda bildirim alacaksınız.',
      };
    }

    const details = availableSeats
      .map((seat) => {
        const trainInfo = seat.trainNumber !== 'Bilinmeyen' ? `Tren: ${seat.trainNumber}` : '';
        const routeInfo = seat.trainRoute !== 'Bilinmeyen' ? `(${seat.trainRoute})` : '';
        const trainDetails = [trainInfo, routeInfo].filter(Boolean).join(' ');
        return `${seat.class}: ${seat.count} koltuk (${seat.timeDisplay}) ${trainDetails}`.trim();
      })
      .join('\n- ');

    return { found: true, message: 'Boş koltuk bulundu!', details: `- ${details}` };
  } catch {
    return { found: false, message: 'Veri analiz hatası' };
  }
}
