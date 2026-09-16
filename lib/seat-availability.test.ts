import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasAvailableSeats, extractCabinCounts, departureInIstanbul } from './seat-availability.ts';
import type { Train, TrainData } from './types.ts';

// 21:00 İstanbul (UTC+3, DST yok) = 18:00 UTC
const dep2100 = Date.UTC(2026, 8, 18, 18, 0, 0);
const dep0900 = Date.UTC(2026, 8, 18, 6, 0, 0); // 09:00 İstanbul

const trainWith = (over: Partial<Train>): Train => ({
  number: '81002',
  segments: [{ departureTime: dep2100 }],
  ...over,
});

const wrap = (train: Train): TrainData => ({
  trainLegs: [{ trainAvailabilities: [{ trains: [train] }] }],
});

test('kalkış saatini Europe/Istanbul olarak okur (UTC kayması yok)', () => {
  assert.equal(departureInIstanbul(trainWith({})).display, '21:00');
  assert.equal(departureInIstanbul(trainWith({ segments: [{ departureTime: dep0900 }] })).display, '09:00');
});

test('kaynak 1: cabinClassAvailabilities', () => {
  const train = trainWith({
    cabinClassAvailabilities: [
      { cabinClass: { id: 2, code: 'Y', name: 'EKONOMİ' } as never, availabilityCount: 25 },
    ],
  });
  const counts = extractCabinCounts(train);
  assert.deepEqual(counts, [{ name: 'EKONOMİ', count: 25 }]);
  assert.equal(hasAvailableSeats(wrap(train), 'ANY').found, true);
});

test('kaynak 2: availableFareInfo (cabinClassAvailabilities yoksa)', () => {
  const train = trainWith({
    availableFareInfo: [
      {
        cabinClasses: [
          { cabinClass: { id: 2, name: 'EKONOMİ' } as never, availabilityCount: 25 },
          { cabinClass: { id: 1, name: 'BUSİNESS' } as never, availabilityCount: 5 },
        ],
      },
    ],
  });
  const counts = extractCabinCounts(train).sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(counts, [
    { name: 'BUSİNESS', count: 5 },
    { name: 'EKONOMİ', count: 25 },
  ]);
  assert.equal(hasAvailableSeats(wrap(train), 'BUSINESS').found, true);
});

test('kaynak 3: cars[].availabilities (vagonlar toplanır)', () => {
  const train = trainWith({
    cars: [
      { availabilities: [{ cabinClass: { id: 1, name: 'BUSİNESS' } as never, availability: 5, pricingList: [] }] },
      { availabilities: [{ cabinClass: { id: 1, name: 'BUSİNESS' } as never, availability: 3, pricingList: [] }] },
    ],
  });
  assert.deepEqual(extractCabinCounts(train), [{ name: 'BUSİNESS', count: 8 }]);
});

test('TEKERLEKLİ SANDALYE ve LOCA elenir', () => {
  const train = trainWith({
    cabinClassAvailabilities: [
      { cabinClass: { name: 'TEKERLEKLİ SANDALYE' } as never, availabilityCount: 4 },
      { cabinClass: { name: 'LOCA' } as never, availabilityCount: 2 },
    ],
  });
  assert.equal(hasAvailableSeats(wrap(train), 'ANY').found, false);
});

test('saat aralığı filtresi kapsam dışını atar', () => {
  const train = trainWith({
    segments: [{ departureTime: dep0900 }], // 09:00
    cabinClassAvailabilities: [{ cabinClass: { name: 'EKONOMİ' } as never, availabilityCount: 10 }],
  });
  assert.equal(hasAvailableSeats(wrap(train), 'ANY', '12:00', '23:00').found, false);
  assert.equal(hasAvailableSeats(wrap(train), 'ANY', '08:00', '10:00').found, true);
});

test('boş/geçersiz veri', () => {
  assert.equal(hasAvailableSeats({}, 'ANY').found, false);
  assert.equal(hasAvailableSeats({ trainLegs: [] }, 'ANY').found, false);
});
