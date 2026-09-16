import { SearchFormData, SearchRequest } from '@/lib/types';

const parseStationNumericId = (stationId: string): number => {
  const parts = stationId.split('-');
  return parseInt(parts[parts.length - 1], 10);
};

const stationDisplayName = (name: string): string => name.split(' , ')[0];

/**
 * TCDD e-bilet ile aynı tarih kuralı: seçilen günden bir gün önce, 21:00:00.
 */
export const formatDepartureDateForAPI = (selectedDate: Date): string => {
  const prevDay = new Date(selectedDate);
  prevDay.setDate(prevDay.getDate() - 1);

  const dateStr = prevDay
    .toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\./g, '-');

  return `${dateStr} 21:00:00`;
};

export const createSearchRequestFromStations = (params: {
  departureStation: { id: string; name: string };
  arrivalStation: { id: string; name: string };
  departureDate: string | Date;
}): SearchRequest => {
  const selectedDate =
    params.departureDate instanceof Date
      ? params.departureDate
      : new Date(params.departureDate);

  const departureDate = formatDepartureDateForAPI(selectedDate);

  return {
    searchRoutes: [
      {
        departureStationId: parseStationNumericId(params.departureStation.id),
        departureStationName: stationDisplayName(params.departureStation.name),
        arrivalStationId: parseStationNumericId(params.arrivalStation.id),
        arrivalStationName: stationDisplayName(params.arrivalStation.name),
        departureDate,
      },
    ],
    passengerTypeCounts: [{ id: 0, count: 1 }],
    searchReservation: false,
    blTrainTypes: ['TURISTIK_TREN'],
  };
};

export const createSearchRequest = (formData: SearchFormData): SearchRequest =>
  createSearchRequestFromStations({
    departureStation: formData.departureStation,
    arrivalStation: formData.arrivalStation,
    departureDate: formData.departureDate,
  });
