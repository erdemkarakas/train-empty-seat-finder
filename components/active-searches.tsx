"use client";

/* Bu bileşen şu anda kullanım dışıdır. Vercel Hobby planında 
 * cron job'lar günde sadece 1 kez çalıştığı için arka plan
 * araması özelliği geçici olarak devre dışı bırakılmıştır.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, CloudOff, CloudCog } from "lucide-react";
import axios from "axios";

export default function ActiveSearches() {
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [cloudflareStatus, setCloudflareStatus] = useState<'checking' | 'active' | 'inactive'>('checking');

  // Cloudflare Worker durumunu kontrol et
  useEffect(() => {
    const checkCloudflareStatus = async () => {
      try {
        // Bu endpoint Cloudflare yapılandırmasının olup olmadığını kontrol eder
        const response = await axios.get("/api/cloudflare-status");
        setCloudflareStatus(response.data.active ? 'active' : 'inactive');
      } catch (err) {
        console.error("Cloudflare durum kontrolü hatası:", err);
        setCloudflareStatus('inactive');
      }
    };

    checkCloudflareStatus();
  }, []);

  // Tarayıcı açıkken manuel kontrol için interval
  useEffect(() => {
    if (!isActive) return;
    
    // Son ziyaret zamanını localStorage'a kaydet
    localStorage.setItem('lastVisitTime', new Date().toISOString());
    
    // 2 dakikada bir kontrol yap (eğer Cloudflare aktif değilse veya client-side kontrolü istenmişse)
    const interval = setInterval(async () => {
      try {
        const response = await axios.get("/api/check-trains");
        if (response.data.success) {
          setLastCheckTime(new Date().toLocaleTimeString());
          setError(null);
        } else {
          setError("Kontrol sırasında bir hata oluştu");
        }
      } catch (err) {
        console.error("Arama kontrolü hatası:", err);
        setError("Kontrol sırasında bir hata oluştu");
      }
    }, 2 * 60 * 1000); // 2 dakika
    
    return () => clearInterval(interval);
  }, [isActive]);

  const CloudflareStatusIcon = () => {
    if (cloudflareStatus === 'checking') return <CloudCog className="ml-2 h-4 w-4 animate-spin" />;
    if (cloudflareStatus === 'active') return <CheckCircle className="ml-2 h-4 w-4 text-green-500" />;
    return <CloudOff className="ml-2 h-4 w-4 text-gray-500" />;
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          Aktif Aramalar 
          <CloudflareStatusIcon />
        </h3>
        <Button 
          variant={isActive ? "default" : "outline"}
          size="sm"
          onClick={() => setIsActive(!isActive)}
        >
          {isActive ? "Aktif" : "Devre Dışı"}
        </Button>
      </div>

      <div className="mt-3">
        {cloudflareStatus === 'active' && (
          <div className="text-sm py-1 px-2 bg-green-50 text-green-700 rounded-md mb-2 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Cloudflare Worker aktif (2dk arayla kontrol sağlanıyor)
          </div>
        )}
        
        {lastCheckTime && (
          <p className="text-sm">Son kontrol: {lastCheckTime}</p>
        )}
        
        {error && (
          <div className="text-sm py-1 px-2 bg-red-50 text-red-600 rounded-md mt-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
      </div>
      
      <p className="text-sm text-gray-500 mt-2">
        {cloudflareStatus === 'active'
          ? "Cloudflare Worker 2 dakikada bir otomatik kontrol yapar (tarayıcı kapalıyken de)"
          : "Tarayıcı açık olduğu sürece 2 dakikada bir kontrol yapılmaktadır"}
      </p>
    </Card>
  );
} 