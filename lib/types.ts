// Station type
export interface Station {
  id: string;
  name: string;
  types: string[];
}

// Search form data type
export interface SearchFormData {
  departureStation: Station;
  arrivalStation: Station;
  departureDate: Date;
  startTime: string;
  endTime: string;
  preferredClass: "ANY" | "BUSINESS" | "ECONOMY";
  searchInterval: string;
  backgroundSearch?: boolean;
}

// Search request type
export interface SearchRequest {
  departureStationId: string | number;
  arrivalStationId: string | number;
  departureDate: string;
  searchRoutes?: Array<{
    departureStationId: number;
    departureStationName: string;
    arrivalStationId: number;
    arrivalStationName: string;
    departureDate: string;
  }>;
  passengerTypeCounts?: Array<{
    id: number;
    count: number;
  }>;
  searchReservation?: boolean;
  searchType?: string;
}

// Search history item type
export interface SearchHistoryItem {
  id: number;
  departure: string;
  arrival: string;
  date: string;
  timeRange: string;
  timestamp: string;
  preferredClass: string;
  searchInterval?: string;
}

// Search result type
export interface SearchResult {
  found: boolean;
  message: string;
  details?: string;
  description?: string;
}

// API response cabin class
export interface CabinClass {
  id: number;
  code: string;
  name: string;
  additionalServices: null;
  bookingClassModels: null;
  showAvailabilityOnQuery: boolean;
}

// API response cabin availability
export interface CabinClassAvailability {
  cabinClass: CabinClass;
  availabilityCount: number;
}

// API response train structure
export interface TrainData {
  trainLegs?: Array<{
    trainAvailabilities?: Array<{
      departureTime?: string;
      departureDateTime?: string;
      routeInfo?: string;
      trains?: Array<{
        trainNumber?: string;
        cabinClassAvailabilities?: CabinClassAvailability[];
        segments?: Array<{
          departureTime?: string;
        }>;
      }>;
    }>;
  }>;
}

// Search info for notifications
export interface SearchInfo {
  departure: string;
  arrival: string;
  date: string;
  timeRange: string;
}

/**
 * Vercel KV (Redis) içinde saklanan arama bilgileri için tip tanımlamaları
 */
export interface StoredSearchParams {
  departureStation: {
    id: string;
    name: string;
  };
  arrivalStation: {
    id: string;
    name: string;
  };
  departureDate: string;
  startTime: string;
  endTime: string;
  preferredClass: string;
}

export interface StoredSearch {
  params: StoredSearchParams;
  telegram: {
    apiKey: string;
    chatId: string;
  };
  startedAt: string;
  expiresAt: string;
} 