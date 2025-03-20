"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function StartSearch() {
  const router = useRouter();
  const [telegramApiKey, setTelegramApiKey] = useState<string>("");
  const [telegramChatId, setTelegramChatId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  // Check if Telegram settings are saved
  useEffect(() => {
    const savedApiKey = localStorage.getItem("telegramApiKey");
    const savedChatId = localStorage.getItem("telegramChatId");
    
    if (savedApiKey) setTelegramApiKey(savedApiKey);
    if (savedChatId) setTelegramChatId(savedChatId);
  }, []);
  
  const handleStartSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!telegramApiKey || !telegramChatId) {
        setError("Telegram ayarlarını girmelisiniz");
        setLoading(false);
        return;
      }
      
      // Telegram ayarlarını kaydet
      localStorage.setItem("telegramApiKey", telegramApiKey);
      localStorage.setItem("telegramChatId", telegramChatId);
      
      // Başarılı mesajı göster
      setSuccess(true);
      
      // 3 saniye sonra ana sayfaya yönlendir
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container py-8 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Sunucu Tarafı Arama Başlat</CardTitle>
          <CardDescription>
            Sunucu tarafında çalışan aramalar için Telegram bildirim ayarlarınızı yapılandırın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-700">
                Telegram ayarlarınız başarıyla kaydedildi! Ana sayfaya yönlendiriliyorsunuz...
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">Telegram Bot API Key</Label>
            <Input
              id="apiKey"
              placeholder="1234567890:AAAA-BBBBbbbCCCcccDDDdddEEEeee"
              value={telegramApiKey}
              onChange={(e) => setTelegramApiKey(e.target.value)}
              disabled={loading || success}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="chatId">Telegram Chat ID</Label>
            <Input
              id="chatId"
              placeholder="123456789"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              disabled={loading || success}
            />
          </div>
          
          <div className="pt-4 space-y-4">
            <Button 
              className="w-full" 
              onClick={handleStartSearch}
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                "Ayarları Kaydet"
              )}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => router.push("/")}
              disabled={loading}
            >
              Ana Sayfaya Dön
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 