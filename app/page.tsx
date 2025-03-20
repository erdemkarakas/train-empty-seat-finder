"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SearchForm, { SearchFormRef } from "@/components/search-form";
import SearchHistory from "@/components/search-history";
import SettingsDialog from "@/components/settings-dialog";
import ActiveSearches from "@/components/active-searches";
import { checkTrainAvailability, hasAvailableSeats, sendTelegramNotification } from "@/lib/train-service";
import { SearchFormData, SearchRequest, SearchResult, SearchInfo, SearchHistoryItem } from "@/lib/types";
import { stations } from "@/app/destination";
import { startServerSearch, createSearchRequest } from "@/lib/server-service";
import { Button } from "@/components/ui/button";
import { generateUniqueId } from "@/lib/utils";

// Safari için standalone özelliği tanımlaması
interface SafariNavigator extends Navigator {
  standalone?: boolean;
}

// BeforeInstallPromptEvent tipi tanımlama
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchInterval, setSearchInterval] = useState<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const searchCountRef = useRef(0);
  const searchFormRef = useRef<SearchFormRef>(null);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const currentSearch = useRef<SearchFormData | null>(null);
  
  // PWA kurulum durumunu takip etmek için state
  const [isPWAInstalled, setIsPWAInstalled] = useState<boolean>(false);
  
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  
  // Mobil cihaz kontrolü için state
  const [isMobile, setIsMobile] = useState(false);
  
  // Kullanıcı ID
  useEffect(() => {
    // Kullanıcı ID'sini localStorage'dan al veya oluştur
    let id = localStorage.getItem("userId");
    if (!id) {
      id = generateUniqueId();
      localStorage.setItem("userId", id);
    }
    setUserId(id);
  }, []);
  
  // PWA kurulum teşvikini kontrol et
  useEffect(() => {
    // Event handler referanslarını saklayalım
    const handleBeforeInstallPrompt = (e: Event) => {
      // Tarayıcının varsayılan teşvikini engelle
      e.preventDefault();
      // Daha sonra kullanmak için teşviki sakla
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      // Kurulum butonunu göster
      setIsPWAInstalled(false);
    };
    
    const handleAppInstalled = () => {
      // Uygulamanın kurulduğunu kaydet
      setIsPWAInstalled(true);
      deferredPromptRef.current = null;
      console.log('PWA başarıyla kuruldu');
    };
    
    // Event listener'ları ekle
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Temizleme işlemi - aynı referansları kullanarak kaldır
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // Mobil cihaz tespiti için useEffect
  useEffect(() => {
    const checkMobile = () => {
      // 768px'den küçük ekranları mobil olarak kabul et (Tailwind'in md breakpoint'i)
      setIsMobile(window.innerWidth < 768);
    };
    
    // İlk yükleme anında kontrol et
    checkMobile();
    
    // Ekran boyutu değiştiğinde yeniden kontrol et
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // PWA kurulum fonksiyonu
  const installPWA = async () => {
    if (!deferredPromptRef.current) {
      return;
    }
    
    // Kurulum teşvikini göster
    deferredPromptRef.current.prompt();
    
    // Kullanıcının yanıtını bekle
    const { outcome } = await deferredPromptRef.current.userChoice;
    
    // Sonucu logla
    console.log(`Kullanıcı PWA kurulumu: ${outcome}`);
    
    // Teşviki temizle
    deferredPromptRef.current = null;
    setIsPWAInstalled(true);
  };

  // Check if Telegram is configured
  useEffect(() => {
    const checkTelegramConfig = () => {
      const apiKey = localStorage.getItem("telegramApiKey");
      const chatId = localStorage.getItem("telegramChatId");
      setTelegramConfigured(!!(apiKey && chatId));
    };
    
    // Check on initial load
    checkTelegramConfig();
    
    // Set up storage event listener to detect changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "telegramApiKey" || e.key === "telegramChatId") {
        checkTelegramConfig();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Custom event for same-tab updates
    const handleCustomStorageChange = () => checkTelegramConfig();
    window.addEventListener("localStorageUpdated", handleCustomStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageUpdated", handleCustomStorageChange);
    };
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (searchInterval) clearInterval(searchInterval);
    };
  }, [searchInterval]);

  // Aktif Aramalar sayfasından gönderilen temizleme eventini dinle
  useEffect(() => {
    const handleClearResults = () => {
      // Arama sonuçlarını temizle
      setSearchResult(null);
    };

    // Event listener'ı ekle
    window.addEventListener('clearSearchResults', handleClearResults);

    // Cleanup
    return () => {
      window.removeEventListener('clearSearchResults', handleClearResults);
    };
  }, []);

  const stopSearch = () => {
    console.log("[stopSearch] Stopping search...", { hasInterval: !!searchInterval });
    
    // Always update UI state even if there's no interval
    setIsSearching(false);
    
    // Arama sonucunu temizle
    setSearchResult(null);
    
    if (searchInterval) {
      console.log("[stopSearch] Clearing interval");
      clearInterval(searchInterval);
      setSearchInterval(null);
    }
    
    // Reset search count
    searchCountRef.current = 0;
  };

  const handleSearch = async (formData: SearchFormData) => {
    try {
      setError(null);
      setLoading(true);
      setIsSearching(true);
      
      // Mevcut arama varsa durdur
      if (searchInterval) {
        stopSearch();
      }
      
      // Arama formunu referansta sakla
      currentSearch.current = formData;
      
      // Save to search history
      updateSearchHistory(formData);
      
      // Telegram bilgileri
      const telegramApiKey = localStorage.getItem("telegramApiKey") || "";
      const telegramChatId = localStorage.getItem("telegramChatId") || "";
      
      // Create the search request - use the createSearchRequest helper function
      const searchRequest = createSearchRequest(formData);
      
      // Check if this is a background search request
      const isBackgroundSearch = formData.backgroundSearch === true;
      
      // Background search with Telegram notifications
      if (isBackgroundSearch && telegramApiKey && telegramChatId) {
        try {
          setLoading(true);
          
          // Server-side search
          console.log(`[ServerSearch] Starting background search with userId: ${userId}`);
          
          const result = await startServerSearch(
            formData,
            telegramApiKey,
            telegramChatId,
            userId,
            24 // 24 saat
          );
          
          // Kullanıcıya bilgi ver
          setSearchResult({
            found: false,
            message: `Sunucu tarafında arama başlatıldı! 24 saat boyunca her 5 dakikada bir kontrol edilecek. Telegram bildirimi gelecektir.`,
            details: `Arama ID: ${result.searchId}\nBitiş: ${new Date(result.expiresAt).toLocaleString('tr-TR')}`
          });
          
          // İstemci tarafında da hemen bir arama yap
          await performSearch(searchRequest, formData);
          
        } catch (error) {
          console.error("Server search error:", error);
          setError(error instanceof Error ? error.message : "Sunucu tarafı arama başlatılamadı");
        }
        
        setLoading(false);
      } else {
        // İstemci tarafında tek seferlik arama yap
        await performSearch(searchRequest, formData);
        
        // Eğer periyodik arama talep edildiyse başlat
        if (formData.searchInterval && formData.searchInterval !== "0") {
          startPeriodicSearch(searchRequest, formData);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
      setLoading(false);
    }
  };
  
  const performSearch = async (searchRequest: SearchRequest, formData: SearchFormData) => {
    try {
      searchCountRef.current += 1;
      setLastCheckTime(new Date().toLocaleTimeString('tr-TR'));

      // Check train availability from API
      const data = await checkTrainAvailability(searchRequest);
      
      // Başarılı bir yanıt alındığında hata mesajını temizle
      setError(null);
      
      // Check if there are available seats
      const result = hasAvailableSeats(
        data, 
        formData.preferredClass,
        formData.startTime,
        formData.endTime
      );
      setSearchResult(result);
      
      // If seats are found, send telegram notification and stop searching
      if (result.found) {
        const searchInfo: SearchInfo = {
          departure: formData.departureStation.name,
          arrival: formData.arrivalStation.name,
          date: formData.departureDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '-'),
          timeRange: `${formData.startTime} - ${formData.endTime}`
        };
        
        try {
          await sendTelegramNotification(result, searchInfo);
        } catch (error) {
          console.error("Telegram bildirimi gönderilirken hata oluştu:", error);
          // Bildirim gönderme hatası nedeniyle aramayı durdurmuyoruz
        }
        stopSearch();
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Arama sırasında bir hata oluştu");
      setLoading(false);
    }
  };

  // Client-side periyodik arama fonksiyonu
  const startPeriodicSearch = (searchRequest: SearchRequest, formData: SearchFormData) => {
    console.log(`[ClientSearch] Starting periodic search every ${formData.searchInterval} minutes`);
    
    // Seçilen aralığı dakikadan milisaniyeye çevirelim
    const intervalMs = parseInt(formData.searchInterval) * 60 * 1000;
    
    // Yeni bir interval oluşturup sonraki aramaları planlayalım
    const newInterval = setInterval(async () => {
      console.log(`[ClientSearch] Performing periodic search (interval: ${formData.searchInterval} min)`);
      await performSearch(searchRequest, formData);
    }, intervalMs);
    
    // Interval'i state'e kaydet ki daha sonra durdurabilelim
    setSearchInterval(newInterval);
    setIsSearching(true);
  };

  const handleHistorySelect = (historyItem: SearchHistoryItem) => {
    // Parse station names from history item
    const departureStationName = historyItem.departure.split(" , ")[0];
    const arrivalStationName = historyItem.arrival.split(" , ")[0];
    
    // Find station objects by name with exact matching
    const departureStation = Object.values(stations).find(
      s => s.name.split(" , ")[0] === departureStationName
    );
    
    const arrivalStation = Object.values(stations).find(
      s => s.name.split(" , ")[0] === arrivalStationName
    );
    
    // If exact match fails, try includes as fallback
    const departureStationFallback = !departureStation ? 
      Object.values(stations).find(s => s.name.includes(departureStationName)) : 
      departureStation;
    
    const arrivalStationFallback = !arrivalStation ? 
      Object.values(stations).find(s => s.name.includes(arrivalStationName)) : 
      arrivalStation;
    
    if (!departureStationFallback || !arrivalStationFallback) {
      setError("İstasyon bilgileri bulunamadı");
      return;
    }
    
    // Parse date from history
    const dateParts = historyItem.date.split('-');
    if (dateParts.length !== 3) {
      setError("Geçmiş arama tarih formatı hatalı");
      return;
    }
    
    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // month is 0-indexed
    const year = parseInt(dateParts[2]);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      setError("Geçmiş arama tarih formatı hatalı");
      return;
    }
    
    const dateObj = new Date(year, month, day);
    
    // Geçersiz tarih kontrolü
    if (dateObj.toString() === 'Invalid Date') {
      setError("Geçmiş arama tarih formatı hatalı");
      return;
    }
    
    // Parse time range
    const timeRange = historyItem.timeRange.split(' - ');
    const startTime = timeRange[0];
    const endTime = timeRange[1];
    
    // Reset form with history data
    searchFormRef.current?.resetForm({
      departureStation: departureStationFallback,
      arrivalStation: arrivalStationFallback,
      departureDate: dateObj,
      startTime,
      endTime,
      preferredClass: historyItem.preferredClass as "ANY" | "BUSINESS" | "ECONOMY",
      searchInterval: historyItem.searchInterval || "2" // Use saved interval or default
    });
    
    // Scroll to form
    document.querySelector('.search-form-container')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  useEffect(() => {
    // Service worker kaydını kontrol et
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('Service Worker registration successful with scope: ', registration.scope);
          },
          function(err) {
            console.log('Service Worker registration failed: ', err);
          }
        );
      };
      
      window.addEventListener('load', registerServiceWorker);
      
      return () => {
        window.removeEventListener('load', registerServiceWorker);
      };
    }

    // PWA kurulum durumunu kontrol et
    const checkPWAInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as SafariNavigator).standalone === true) {
        setIsPWAInstalled(true);
      }
    };

    checkPWAInstalled();
  }, []);

  // Arama geçmişini güncelle
  const updateSearchHistory = (formData: SearchFormData) => {
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const newSearchItem = {
      id: Date.now(),
      departure: formData.departureStation.name,
      arrival: formData.arrivalStation.name,
      date: formData.departureDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '-'),
      timeRange: `${formData.startTime} - ${formData.endTime}`,
      timestamp: new Date().toISOString(),
      preferredClass: formData.preferredClass,
      searchInterval: formData.searchInterval
    };
    
    searchHistory.unshift(newSearchItem);
    
    // Keep only the latest 10 searches
    if (searchHistory.length > 10) {
      searchHistory.pop();
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    
    // Trigger custom event to notify other components of localStorage change
    window.dispatchEvent(new Event('localStorageUpdated'));
  };

  return (
    <div className="container px-4 py-4 md:py-6 mx-auto max-w-7xl">
      {/* Ana başlık */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-primary">🚅 Tren Boş Koltuk Bulucu</h1>
        <p className="text-center text-muted-foreground mt-1">Boş koltuğu hızlıca bulun, bildirim alın</p>
      </header>
      
      {/* Ana içerik - İki sütunlu düzen (mobilde tek sütun) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Sol taraf: Arama formu */}
        <div className="lg:col-span-6 space-y-4">
          {/* Arama kartı */}
          <Card className="shadow-md">
            <CardHeader className="pb-2 bg-slate-100 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Tren Bileti Ara</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    Tarih ve saat aralığında boş koltuk arayın
                  </CardDescription>
                </div>
                {telegramConfigured ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Telegram Hazır
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Telegram Kurulmadı
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 search-form-container">
              <SearchForm ref={searchFormRef} onSearch={handleSearch} disabled={loading || isSearching} />
            </CardContent>
          </Card>
        </div>
        
        {/* Sağ taraf: Sonuçlar, telegram bildirimleri ve aramalar */}
        <div className="lg:col-span-6 space-y-4">
          {/* Telegram ayarları */}
          <div className="mb-1">
            <SettingsDialog />
          </div>
          
          {/* Sonuçlar kartı */}
          <Card className="shadow-md">
            <CardHeader className="pb-2 bg-slate-100 rounded-t-xl">
              <CardTitle>Arama Sonuçları</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="mb-3">
                    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-center text-muted-foreground">Trenler kontrol ediliyor...</p>
                </div>
              ) : error ? (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="flex items-center text-red-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </AlertDescription>
                </Alert>
              ) : null}
              
              {isSearching && !loading && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-blue-800 font-medium">Otomatik arama devam ediyor</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={stopSearch}
                      className="bg-white hover:bg-red-50 border-red-300 text-red-600 hover:text-red-700"
                    >
                      Durdur
                    </Button>
                  </div>
                  <p className="text-sm text-blue-700 ml-7">
                    Son kontrol: {lastCheckTime || "Henüz yok"} 
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 rounded-full text-blue-800 text-xs">
                      {searchCountRef.current} arama yapıldı
                    </span>
                  </p>
                </div>
              )}
              
              {!loading && searchResult && (
                <div className={`p-4 border rounded-md mb-4 shadow-sm ${
                  searchResult.found 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-start">
                    <div className={`mt-0.5 mr-3 ${
                      searchResult.found ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {searchResult.found ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${
                        searchResult.found ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {searchResult.message}
                      </p>
                      {searchResult.details && (
                        <div className="mt-2 text-sm whitespace-pre-line">
                          {searchResult.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {!loading && !error && !searchResult && !isSearching && (
                <div className="text-center py-6 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <p>Tren aramak için form alanlarını doldurun</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Son Aramalar - İyileştirilmiş Tasarım */}
          <Card className="shadow-md overflow-hidden">
            <CardHeader className="pb-2 bg-slate-50">
              <CardTitle className="flex items-center text-base">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="pl-0.5">Son Aramalar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-4 py-2">
                <SearchHistory onSelect={handleHistorySelect} />
              </div>
            </CardContent>
          </Card>
          
          {/* Aktif aramalar - Card başlığı kaldırıldı çünkü component kendi başlığını içeriyor */}
          <div className="overflow-hidden">
            <ActiveSearches />
          </div>
        </div>
      </div>
      
      {/* PWA Kurulum Banner - Sadece mobil cihazlarda göster */}
      {!isPWAInstalled && deferredPromptRef.current && isMobile && (
        <div className="fixed inset-x-0 bottom-0 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg z-50">
          <div className="container max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-medium">Uygulamayı telefonunuza ekleyin</p>
                <p className="text-sm text-blue-100">Daha hızlı erişim ve çevrimdışı çalışma imkanı</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              onClick={installPWA}
              className="whitespace-nowrap bg-white text-blue-600 hover:bg-blue-50"
            >
              Yükle
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
