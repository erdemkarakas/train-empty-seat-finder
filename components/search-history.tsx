"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SearchHistoryItem } from "@/lib/types";

interface SearchHistoryProps {
  onSelect?: (historyItem: SearchHistoryItem) => void;
}

export default function SearchHistory({ onSelect }: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    // Load search history from localStorage
    const storedHistory = localStorage.getItem("searchHistory");
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }

    // Listen for changes to localStorage from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "searchHistory" && e.newValue) {
        setHistory(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("searchHistory");
    setHistory([]);
  };

  const getClassLabel = (className: string) => {
    if (className === "BUSINESS") return "Business";
    if (className === "ECONOMY") return "Economy";
    return "Tüm Sınıflar";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Son Aramalar</h3>
        {history.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearHistory}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Temizle
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Arama geçmişi bulunmuyor
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-3 border rounded-md hover:bg-accent hover:border-accent transition-colors cursor-pointer"
              onClick={() => onSelect && onSelect(item)}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium">{item.departure.split(" , ")[0]} → {item.arrival.split(" , ")[0]}</div>
                <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full whitespace-nowrap ml-2">
                  {getClassLabel(item.preferredClass)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>📅 {item.date}</div>
                <div>🕒 {item.timeRange}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 