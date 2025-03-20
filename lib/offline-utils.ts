/**
 * PWA çevrimdışı kullanım için yardımcı fonksiyonlar
 */

// Service Worker'ın kayıtlı olup olmadığını kontrol eder
export const isServiceWorkerRegistered = (): boolean => {
  return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
};

// Çevrimiçi/Çevrimdışı durumunu kontrol eder
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true;
};

// Bildirim izinlerini kontrol eder
export const checkNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  // İzin daha önce verilmişse
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  // İzin daha önce reddedilmişse
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  // İzin istemek için
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Bildirim izni alınamadı:', error);
    return 'default';
  }
};

// Veriyi yerel depolamaya kaydeder
export const saveToLocalStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Veri kaydedilemedi (${key}):`, error);
  }
};

// Veriyi yerel depolamadan alır
export const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Veri alınamadı (${key}):`, error);
    return defaultValue;
  }
};

// Arama verisi tipi tanımı
export interface SearchData {
  id: number;
  departure: string;
  arrival: string;
  date: string;
  timeRange: string;
  timestamp: string;
  preferredClass?: string;
  searchInterval?: string;
  [key: string]: string | number | boolean | undefined; // Diğer dinamik alanlar için spesifik tipler
}

// Son yapılan aramaları önbelleğe alır
export const cacheLastSearches = (searchData: SearchData[]): void => {
  saveToLocalStorage('lastSearches', searchData);
};

// Son yapılan aramaları önbellekten alır
export const getLastSearches = (): SearchData[] => {
  return getFromLocalStorage<SearchData[]>('lastSearches', []);
};

// Service Worker'a bildirim gönderir
export const sendNotificationToServiceWorker = async (
  title: string,
  options: NotificationOptions & { url?: string }
): Promise<boolean> => {
  if (!isServiceWorkerRegistered()) {
    console.warn('Service Worker kayıtlı değil, bildirim gönderilemiyor');
    return false;
  }
  
  const permission = await checkNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Bildirim izni verilmedi');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
    return true;
  } catch (error) {
    console.error('Bildirim gönderilemedi:', error);
    return false;
  }
}; 