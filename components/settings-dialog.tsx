"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BellRing, HelpCircle, Link2, Copy, CheckCheck } from "lucide-react";

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [telegramApiKey, setTelegramApiKey] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<null | { success: boolean; message: string }>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const storedApiKey = localStorage.getItem("telegramApiKey");
    const storedChatId = localStorage.getItem("telegramChatId");
    
    if (storedApiKey) setTelegramApiKey(storedApiKey);
    if (storedChatId) setTelegramChatId(storedChatId);
  }, []);

  const saveSettings = () => {
    localStorage.setItem("telegramApiKey", telegramApiKey);
    localStorage.setItem("telegramChatId", telegramChatId);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    
    // Reset test status after saving new settings
    setTestStatus(null);
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event("localStorageUpdated"));
  };

  const testTelegramNotification = async () => {
    if (!telegramApiKey || !telegramChatId) {
      setTestStatus({
        success: false,
        message: "Lütfen önce Telegram API key ve Chat ID bilgilerini girin."
      });
      return;
    }

    try {
      const message = `🔔 Test notification from Tren Boş Koltuk Bulucu\n\nBu bir test mesajıdır. Telegram bildirimleri başarıyla ayarlandı.`;
      
      setTestStatus({ success: true, message: "Bildirim gönderiliyor..." });
      
      const url = `https://api.telegram.org/bot${telegramApiKey}/sendMessage`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: message,
            parse_mode: "HTML"
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP Hata: ${response.status} ${response.statusText}`);
        }
  
        const data = await response.json();
        
        if (data.ok) {
          setTestStatus({ success: true, message: "Test mesajı başarıyla gönderildi! ✓" });
        } else {
          setTestStatus({ 
            success: false, 
            message: `Hata: ${data.description || "Bilinmeyen hata"}`
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          setTestStatus({ 
            success: false, 
            message: "Zaman aşımı: İstek çok uzun sürdü. API anahtarınızı kontrol edin."
          });
        } else if (fetchError instanceof Error && fetchError.message.includes('CORS')) {
          setTestStatus({
            success: false,
            message: "CORS hatası: Tarayıcı güvenlik kısıtlaması nedeniyle istek engellendi. Telegram API anahtarınızın doğru olduğundan emin olun."
          });
        } else {
          setTestStatus({ 
            success: false, 
            message: `Ağ hatası: ${fetchError instanceof Error ? fetchError.message : "Bilinmeyen hata"}`
          });
        }
      }
    } catch (error) {
      setTestStatus({ 
        success: false, 
        message: `Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`
      });
    }
  };
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const areTelegramSettingsConfigured = !!(telegramApiKey && telegramChatId);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setTestStatus(null);
        setShowHelp(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full shadow-sm hover:shadow-md hover:bg-blue-50 transition-all flex items-center justify-center gap-2 py-5 border border-blue-200 rounded-md relative overflow-hidden group"
          data-settings-trigger
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <BellRing className="h-5 w-5 text-blue-500" />
          <span className="font-medium text-blue-700">Telegram Bildirimleri</span>
          <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full ml-2">
            Ayarla
          </span>
          {areTelegramSettingsConfigured && (
            <span className="ml-auto h-2 w-2 rounded-full bg-green-500" title="Ayarlandı"></span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <BellRing className="mr-2 h-5 w-5 text-blue-500" />
            Telegram Bildirimleri
          </DialogTitle>
          <DialogDescription>
            Boş koltuk bulunduğunda anında bildirim almak için Telegram botunuzu yapılandırın.
          </DialogDescription>
        </DialogHeader>
        
        {testStatus && (
          <Alert className={`mt-2 ${testStatus.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <AlertDescription className={`flex items-center ${testStatus.success ? 'text-green-800' : 'text-red-800'}`}>
              {testStatus.message}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="telegram-api-key" className="text-sm font-medium block mb-1.5">
              Bot Token:
            </Label>
            <div className="flex space-x-2">
              <Input
                id="telegram-api-key"
                value={telegramApiKey}
                onChange={(e) => setTelegramApiKey(e.target.value)}
                placeholder="123456789:AbCdEfGhIjKlMnOpQrStUvWxYz"
                className="flex-1"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => copyToClipboard(telegramApiKey, 'token')}
                className="h-10 w-10 flex-shrink-0"
                disabled={!telegramApiKey}
                title="Kopyala"
              >
                {copied === 'token' ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telegram-chat-id" className="text-sm font-medium block mb-1.5">
              Chat ID:
            </Label>
            <div className="flex space-x-2">
              <Input
                id="telegram-chat-id"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="123456789"
                className="flex-1"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => copyToClipboard(telegramChatId, 'chatid')}
                className="h-10 w-10 flex-shrink-0"
                disabled={!telegramChatId}
                title="Kopyala"
              >
                {copied === 'chatid' ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600 h-auto py-1 px-2 text-xs flex items-center"
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle className="mr-1 h-3 w-3" />
              {showHelp ? "Yardımı Gizle" : "Nasıl Ayarlanır?"}
            </Button>
            
            {showHelp && (
              <div className="bg-blue-50 p-3 rounded-md mt-2 text-sm text-blue-800 space-y-2 overflow-x-auto">
                <h3 className="font-medium">Telegram Bot Oluşturma:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <a 
                      href="https://t.me/botfather" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      BotFather&apos;a gidin <Link2 className="ml-1 h-3 w-3" />
                    </a> ve mesaj gönderin
                  </li>
                  <li><code className="bg-blue-100 px-1 rounded">/newbot</code> komutunu kullanın</li>
                  <li>Botunuza bir isim verin</li>
                  <li>Botunuza bir kullanıcı adı verin (sonu &quot;bot&quot; ile bitmeli)</li>
                  <li>BotFather size <strong>bot token</strong> verecek, yukarıya kopyalayın</li>
                </ol>
                
                <h3 className="font-medium mt-3">Chat ID Bulma:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Oluşturduğunuz botla bir konuşma başlatın</li>
                  <li>Bota herhangi bir mesaj gönderin</li>
                  <li>
                    <span>Tarayıcınızda şu adresi açın:</span>
                    <div className="flex items-center mt-1 mb-1">
                      <code className="bg-blue-100 px-1 py-0.5 rounded text-xs break-all overflow-auto max-w-full">
                        https://api.telegram.org/bot<span className="text-red-500">{"{TOKEN}"}</span>/getUpdates
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="ml-1 h-6 w-6 flex-shrink-0"
                        onClick={() => copyToClipboard(`https://api.telegram.org/bot${telegramApiKey}/getUpdates`, 'url')}
                      >
                        {copied === 'url' ? <CheckCheck className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <span className="text-xs italic block mt-1">(<span className="text-red-500">{"{TOKEN}"}</span> yerine bot token&apos;ınızı yazın)</span>
                  </li>
                  <li>JSON çıktısında <code className="bg-blue-100 px-1 rounded">&quot;id&quot;:</code> değerini bulun ve yukarıya kopyalayın</li>
                </ol>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={testTelegramNotification} 
            className="sm:w-auto w-full"
            disabled={!telegramApiKey || !telegramChatId}
          >
            Test Mesajı Gönder
          </Button>
          <Button 
            onClick={saveSettings} 
            className="sm:w-auto w-full"
            disabled={!telegramApiKey || !telegramChatId}
          >
            {isSaved ? "Kaydedildi! ✓" : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 