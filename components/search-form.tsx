"use client";

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useForm, SubmitHandler } from "react-hook-form";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { stations } from "@/app/destination";
import { Station, SearchFormData } from "@/lib/types";
// import { Switch } from "@/components/ui/switch";
// import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from "uuid";

// Etkin arama türü için interface ekleyelim
interface ActiveSearch {
  id: string;
  departureStation: Station;
  arrivalStation: Station;
  departureDate: Date;
  searchInterval: string;
  useBackgroundSearch: boolean;
  isSearching: boolean;
  telegramEnabled: boolean;
}

// Generate time options for every 15 minutes (00, 15, 30, 45)
const timeOptions = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const hourStr = hour.toString().padStart(2, "0");
  const minuteStr = minute.toString().padStart(2, "0");
  return { value: `${hourStr}:${minuteStr}`, label: `${hourStr}:${minuteStr}` };
});

type SearchFormProps = {
  onSearch: (data: SearchFormData) => void;
  loading?: boolean;
  disabled?: boolean;
};

export interface SearchFormRef {
  resetForm: (data: Partial<SearchFormData>) => void;
  onSubmit: (callback: SubmitHandler<SearchFormData>) => void;
  reset: () => void;
  getSearches: () => ActiveSearch[];
}

const SearchForm = forwardRef<SearchFormRef, SearchFormProps>(({ onSearch, loading, disabled }, ref) => {
  const [stationSearchValue, setStationSearchValue] = useState("");
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [showStationSearch, setShowStationSearch] = useState<"departure" | "arrival" | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [searches, setSearches] = useState<ActiveSearch[]>([]);
  const [telegramApiKey, setTelegramApiKey] = useState<string | null>(null);
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);

  // Check if Telegram is configured on load
  useEffect(() => {
    // Safely access localStorage in the browser
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem("telegramApiKey");
      const chatId = localStorage.getItem("telegramChatId");
      setTelegramApiKey(apiKey);
      setTelegramChatId(chatId);
      setTelegramConfigured(!!(apiKey && chatId));
      // Listen for changes in Telegram config
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "telegramApiKey" || e.key === "telegramChatId") {
          const newApiKey = localStorage.getItem("telegramApiKey");
          const newChatId = localStorage.getItem("telegramChatId");

          setTelegramApiKey(newApiKey);
          setTelegramChatId(newChatId);
          setTelegramConfigured(!!(newApiKey && newChatId));
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => {
        window.removeEventListener("storage", handleStorageChange);
      };
    }
  }, []);

  // Telegram durumunu console'a yazdır
  useEffect(() => {
    // telegramApiKey ve telegramChatId değişkenlerini doğrudan kullanarak
    // daha ayrıntılı bir log mesajı oluştur
    console.log(`Telegram durumu: ${telegramConfigured ? 'Yapılandırıldı' : 'Yapılandırılmadı'}`);
    if (telegramConfigured) {
      console.log(`Telegram API Anahtarı: ${telegramApiKey?.substring(0, 5)}...`);
      console.log(`Telegram Chat ID: ${telegramChatId?.substring(0, 3)}...`);
    }
  }, [telegramConfigured, telegramApiKey, telegramChatId]);

  const form = useForm<SearchFormData>({
    defaultValues: {
      departureStation: null as unknown as Station,
      arrivalStation: null as unknown as Station,
      departureDate: new Date(),
      startTime: "07:00",
      endTime: "23:00",
      preferredClass: "ANY",
      searchInterval: "2"
    }
  });

  useImperativeHandle(ref, () => ({
    resetForm: (data: Partial<SearchFormData>) => {
      // Reset with provided data
      if (data.departureStation) form.setValue('departureStation', data.departureStation);
      if (data.arrivalStation) form.setValue('arrivalStation', data.arrivalStation);
      if (data.departureDate) form.setValue('departureDate', data.departureDate);

      // Handle time range validation when resetting
      if (data.startTime) form.setValue('startTime', data.startTime);
      if (data.endTime) form.setValue('endTime', data.endTime);

      // Validate time range
      if (data.startTime && data.endTime) {
        validateTimeRange(data.startTime, data.endTime);
      }

      if (data.preferredClass) form.setValue('preferredClass', data.preferredClass);
      if (data.searchInterval) form.setValue('searchInterval', data.searchInterval);
    },
    onSubmit: (callback: SubmitHandler<SearchFormData>) => {
      form.handleSubmit((values) => {
        // Return form values with backgroundSearch flag
        callback({
          ...values,
          // backgroundSearch: backgroundSearch
        });
      })();
    },
    reset: () => form.reset(),
    getSearches: () => searches,
  }));

  // Helper function to convert time string to minutes
  const timeStringToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Validate time range
  const validateTimeRange = (startTime: string, endTime: string): boolean => {
    const startMinutes = timeStringToMinutes(startTime);
    const endMinutes = timeStringToMinutes(endTime);

    if (startMinutes >= endMinutes) {
      setTimeError("Başlangıç saati bitiş saatinden önce olmalıdır!");
      return false;
    } else {
      setTimeError(null);
      return true;
    }
  };

  // Handle time range changes
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    form.setValue(field, value);

    // Get current values
    const startTime = field === 'startTime' ? value : form.getValues('startTime');
    const endTime = field === 'endTime' ? value : form.getValues('endTime');

    // Validate time range
    validateTimeRange(startTime, endTime);
  };

  const handleStationSearch = (value: string) => {
    setStationSearchValue(value);
    if (value.length > 1) {
      const filtered = Object.values(stations).filter(station =>
        station.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setFilteredStations(filtered);
    } else {
      setFilteredStations([]);
    }
  };

  const selectStation = (station: Station, type: "departure" | "arrival") => {
    form.setValue(type === "departure" ? "departureStation" : "arrivalStation", station);
    setShowStationSearch(null);
    setStationSearchValue("");
  };

  // Add the onSubmit handler that was missing
  const onSubmit = (data: SearchFormData) => {
    // Validate that stations are selected
    if (!data.departureStation || !data.departureStation.id) {
      form.setError("departureStation", {
        type: "manual",
        message: "Lütfen kalkış istasyonu seçin"
      });
      return;
    }
    if (!data.arrivalStation || !data.arrivalStation.id) {
      form.setError("arrivalStation", {
        type: "manual",
        message: "Lütfen varış istasyonu seçin"
      });
      return;
    }

    // Validate time range before submission
    if (validateTimeRange(data.startTime, data.endTime)) {
      // Add backgroundSearch flag to the form data
      const searchData = {
        ...data,
        // backgroundSearch: backgroundSearch
      };
      // Ensure all required ActiveSearch properties are included
      setSearches((prev) => [
        {
          id: uuidv4(),
          departureStation: data.departureStation,
          arrivalStation: data.arrivalStation,
          departureDate: data.departureDate,
          searchInterval: data.searchInterval,
          useBackgroundSearch: false, // Default value since backgroundSearch is commented out
          isSearching: false,
          telegramEnabled: false, // Default value since telegramEnabled is commented out
        },
        ...prev,
      ]);

      onSearch(searchData);
    }
  };

  // Arka plan arama durumuna göre arama sıklığını güncelleyelim
  /*useEffect(() => {
    // Kullanıcı arka plan aramasını etkinleştirirse, kısa aralık seçiliyse otomatik 5'e güncelleyelim
    if (backgroundSearch) {
      const currentInterval = parseInt(form.getValues('searchInterval'));
      if (currentInterval > 0 && currentInterval < 5) {
        form.setValue('searchInterval', "5");
      }
    } else {
      // Arka plan araması kapalıysa ve interval 0 (tek sefer) değilse varsayılan olarak 2 dakika yapalım
      const currentInterval = parseInt(form.getValues('searchInterval'));
      if (currentInterval >= 5) {
        form.setValue('searchInterval', "2");
      }
    }
  }, [backgroundSearch, form]);*/

  // Aramalar oluşturulduğunda tarayıcıda kaydetmek için
  useEffect(() => {
    if (searches.length > 0) {
      // Mevcut aramalar ile bir işlem yapabilirsiniz, örneğin localStorage
      console.log('Güncel aramalar:', searches);
    }
  }, [searches]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Departure Station */}
          <FormField
            control={form.control}
            name="departureStation"
            render={({ field }) => (
              <FormItem className="relative">
                <FormLabel>Nereden</FormLabel>
                <FormControl>
                  <div>
                    <Input
                      value={field.value?.name || ""}
                      readOnly
                      onClick={() => setShowStationSearch("departure")}
                      placeholder="İstasyon seçin"
                      className={form.formState.errors.departureStation ? "border-red-500" : ""}
                    />
                    {showStationSearch === "departure" && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                        <div className="p-2">
                          <Input
                            placeholder="İstasyon ara..."
                            value={stationSearchValue}
                            onChange={(e) => handleStationSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredStations.length > 0 ? (
                            filteredStations.map((station) => (
                              <div
                                key={station.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => selectStation(station, "departure")}
                              >
                                {station.name}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-gray-500">
                              {stationSearchValue.length > 1 ? "İstasyon bulunamadı" : "Arama yapmak için en az 2 karakter girin"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Arrival Station */}
          <FormField
            control={form.control}
            name="arrivalStation"
            render={({ field }) => (
              <FormItem className="relative">
                <FormLabel>Nereye</FormLabel>
                <FormControl>
                  <div>
                    <Input
                      value={field.value?.name || ""}
                      readOnly
                      onClick={() => setShowStationSearch("arrival")}
                      placeholder="İstasyon seçin"
                      className={form.formState.errors.arrivalStation ? "border-red-500" : ""}
                    />
                    {showStationSearch === "arrival" && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                        <div className="p-2">
                          <Input
                            placeholder="İstasyon ara..."
                            value={stationSearchValue}
                            onChange={(e) => handleStationSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredStations.length > 0 ? (
                            filteredStations.map((station) => (
                              <div
                                key={station.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => selectStation(station, "arrival")}
                              >
                                {station.name}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-gray-500">
                              {stationSearchValue.length > 1 ? "İstasyon bulunamadı" : "Arama yapmak için en az 2 karakter girin"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Departure Date */}
          <FormField
            control={form.control}
            name="departureDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Gidiş Tarihi</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: tr })
                        ) : (
                          <span>Tarih seçin</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preferred Class */}
          <FormField
            control={form.control}
            name="preferredClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tercih Edilen Sınıf</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sınıf seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ANY">Fark etmez</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="ECONOMY">Ekonomi</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Başlangıç Saati</FormLabel>
                  <Select
                    onValueChange={(value) => handleTimeChange('startTime', value)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className={timeError ? "border-red-500" : ""}>
                        <SelectValue placeholder="Saat seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bitiş Saati</FormLabel>
                  <Select
                    onValueChange={(value) => handleTimeChange('endTime', value)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className={timeError ? "border-red-500" : ""}>
                        <SelectValue placeholder="Saat seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {timeError && (
            <div className="text-red-500 text-sm mt-1 -mb-4">
              {timeError}
            </div>
          )}

          {/* Search Interval */}
          <FormField
            control={form.control}
            name="searchInterval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arama Sıklığı (dakika)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Arama sıklığı seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Tek seferlik arama</SelectItem>
                    {/* Kısa süreli arama seçenekleri */}
                    <>
                      <SelectItem value="1">1 dakika</SelectItem>
                      <SelectItem value="2">2 dakika</SelectItem>
                    </>
                    <SelectItem value="5">5 dakika</SelectItem>
                    <SelectItem value="10">10 dakika</SelectItem>
                    <SelectItem value="15">15 dakika</SelectItem>
                    <SelectItem value="30">30 dakika</SelectItem>
                    <SelectItem value="60">1 saat</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Arka planda ara seçeneği - Yeniden düzenlenmiş ve genişletilmiş 
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Switch
                  id="background-search"
                  checked={backgroundSearch}
                  onCheckedChange={setBackgroundSearch}
                />
                <Label
                  htmlFor="background-search"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Arka planda ara
                </Label>
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

            <div className="ml-10 mt-2">
              Bilgi metni buraya gelecek
            </div>
          </div>
          */}
        </div>

        <Button type="submit" className="w-full my-4" disabled={loading || disabled}>
          <div className="flex items-center justify-center">
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? "Aranıyor..." : "Koltuk Ara"}
          </div>
        </Button>
      </form>
    </Form>
  );
});

SearchForm.displayName = "SearchForm";

export default SearchForm;