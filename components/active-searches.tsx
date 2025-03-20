"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, X } from "lucide-react";
import { generateUniqueId } from "@/lib/utils";

interface ActiveSearch {
  searchId: string;
  startedAt: string;
  expiresAt: string;
  params: {
    departureStation: { id: string; name: string };
    arrivalStation: { id: string; name: string };
    departureDate: string;
    startTime: string;
    endTime: string;
    preferredClass: string;
  };
}

export default function ActiveSearches() {
  const [userId, setUserId] = useState<string>("");
  const [searches, setSearches] = useState<ActiveSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Kullanıcı ID'sini localStorage'dan al veya oluştur
    let id = localStorage.getItem("userId");
    if (!id) {
      id = generateUniqueId();
      localStorage.setItem("userId", id);
    }
    setUserId(id);

    // Debug için userId'yi console'a yazdır
    console.log(`[ActiveSearches] Using userId: ${id}`);

    // Aktif aramaları yükle
    fetchActiveSearches(id);
  }, []);

  const fetchActiveSearches = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Yerel geliştirme için örnek kullanıcı ID'si kullan
      let userId = id;
      if (!userId || userId === "") {
        userId = "test-user-id"; // MockKV'de örnek veri için kullanılan kullanıcı ID'si
        console.log(`[ActiveSearches] Using test user ID instead of empty ID`);
      }
      
      console.log(`[ActiveSearches] Fetching searches with userId: ${userId}`);
      const response = await fetch(`/api/user-searches?userId=${userId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ActiveSearches] API error: ${response.status} - ${errorText}`);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setSearches(data.searches || []);
        console.log(`[ActiveSearches] Loaded ${data.searches?.length || 0} searches`);
      } else {
        setError(data.message || "Aktif aramalar yüklenemedi");
        setSearches([]);
      }
    } catch (err) {
      console.error("[ActiveSearches] Fetch searches error:", err);
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
      setSearches([]);
    } finally {
      setLoading(false);
    }
  };

  const cancelSearch = async (searchId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/user-searches", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, searchId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Aramayı listeden kaldır
        setSearches(searches.filter(s => s.searchId !== searchId));
        
        // Sayfa sonuçlarını temizlemek için özel bir event gönder
        const clearResultsEvent = new CustomEvent('clearSearchResults', {
          detail: { searchId }
        });
        window.dispatchEvent(clearResultsEvent);
      } else {
        setError(data.message || "Arama iptal edilemedi");
      }
    } catch (err) {
      console.error("[ActiveSearches] Cancel search error:", err);
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Aktif Aramalar</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fetchActiveSearches(userId)}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}
        
        {searches.length === 0 && !loading ? (
          <div className="text-center text-muted-foreground p-4">
            Aktif arama bulunmuyor
          </div>
        ) : (
          <div className="space-y-4">
            {searches.map((search) => (
              <div 
                key={search.searchId}
                className="p-3 border rounded-md relative"
              >
                <div className="absolute top-2 right-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => cancelSearch(search.searchId)}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center">
                    <div className="text-base font-medium">
                      {search.params.departureStation.name.split(' , ')[0]} → {search.params.arrivalStation.name.split(' , ')[0]}
                    </div>
                    <Badge className="ml-2">
                      {search.params.preferredClass === "ALL" ? "Tüm Sınıflar" : 
                       search.params.preferredClass === "BUSINESS" ? "Business" : 
                       search.params.preferredClass === "ECONOMY" ? "Economy" : 
                       search.params.preferredClass}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Tarih: {new Date(search.params.departureDate).toLocaleDateString("tr-TR")}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Saat: {search.params.startTime} - {search.params.endTime}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    <span className="block">Başlangıç: {formatDate(search.startedAt)}</span>
                    <span className="block">Bitiş: {formatDate(search.expiresAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 