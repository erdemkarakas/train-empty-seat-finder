# TCDD Tren Boş Koltuk Bulucu

TCDD tren hatlarında belirli bir tarih ve saat aralığında boş koltuk olup olmadığını kontrol eden ve boş koltuk bulunduğunda bildirim gönderen web uygulaması.

## Özellikler

- 🚆 TCDD  tren seferlerinde boş koltuk kontrolü
- 🔄 Otomatik periyodik arama
- 📱 Progressive Web App (PWA) - cihazınıza yükleyebilirsiniz
- 📶 Çevrimdışı çalışabilme
- 🔔 Boş koltuk bulunduğunda bildirim gönderme
- 📝 Arama geçmişini kaydetme
- 🌙 Koyu/açık tema desteği
- 📊 YHT hatları için gerçek zamanlı doluluk verileri

## Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18 veya üzeri

### Geliştirme Ortamında Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

### Üretim Ortamında Çalıştırma

```bash
# Projeyi build edin
npm run build

# Sunucuyu başlatın
npm run start
```

## PWA (Progressive Web App) Özellikleri

Bu uygulama bir PWA olarak geliştirilmiştir. Bu, aşağıdaki özellikleri sunmaktadır:

- **Yüklenebilirlik**: Uygulamayı mobil veya masaüstü cihazlarınıza doğrudan yükleyebilirsiniz
- **Çevrimdışı Çalışma**: İnternet bağlantınız olmadığında bile temel işlevleri kullanabilirsiniz
- **Mobil Deneyim**: Mobil cihazlarda doğal uygulama deneyimi sunar
- **Güncellenebilirlik**: Uygulama otomatik olarak güncellenebilir

### PWA Kurulumu

Uygulamayı cihazınıza yüklemek için:

1. Uygulamayı Chrome veya Safari gibi modern bir tarayıcıda açın
2. Adres çubuğunda veya menü kısmında "Yükle" seçeneğine tıklayın
3. Kurulum tamamlandıktan sonra uygulamayı cihazınızın ana ekranından açabilirsiniz

## İkonların Oluşturulması

PWA için gerekli ikonları oluşturmak için:

```bash
# Ikon oluşturma scriptini çalıştırılabilir yapın
chmod +x public/icons/generate-icons.sh

# Kaynak ikon dosyasını kullanarak tüm boyutlarda ikonları oluşturun
./public/icons/generate-icons.sh path/to/source-icon.png
```

## TCDD API Ortam Değişkenleri

TCDD `train-availability` uç noktası botlara karşı üç katmanlı koruma uygular:

1. **nginx WAF / TLS parmak izi** — tarayıcı olmayan istemciler 403 alır. Uygulama
   `impit` ile Chrome/Firefox TLS taklidi yaparak bunu aşar (kod içinde, ayar gerekmez).
2. **Veri merkezi IP bloğu** — Vercel/AWS gibi datacenter IP'lerinden gelen bağlantılar
   TCP seviyesinde resetlenir (`Connection reset by peer`). Bunu aşmak için
   **residential/mobil bir proxy** gerekir.
3. **Yetkilendirme token'ı** — geçerli bir `Authorization` token'ı gerekir.

Aşağıdaki değişkenleri Vercel proje ayarlarına (veya yerel `.env.local`) ekleyin:

```bash
# Residential/mobil proxy (HTTP, HTTPS, SOCKS4 veya SOCKS5 desteklenir).
# Vercel'de zorunlu — datacenter IP'si TCDD tarafından resetlenir.
TCDD_PROXY_URL=http://kullanici:parola@proxy-host:port

# TCDD Bearer token'ı. Giriş yapılmış bir tarayıcı oturumundan alın:
# DevTools > Network > train-availability isteği > Authorization header'ı.
# Tanımsızsa kod içindeki (süresi dolmuş) public token'a düşer.
TCDD_AUTH_TOKEN=eyJhbGciOi...
```

Yerelde (residential IP) `TCDD_PROXY_URL` gerekmez; yalnızca datacenter ortamlarında (Vercel) zorunludur.

## Ücretsiz Çözüm: Yerel Yoklayıcı (Residential IP)

Ücretli proxy istemiyorsanız, koltuk taramasını kendi always-on makinenizde
(residential IP) çalıştırın. Vercel yalnızca arayüz + arama kaydı için kalır;
TCDD sorgusu residential IP'den gittiği için datacenter reset'i yaşanmaz.

Script Upstash Redis'teki (`search:*`) aramaları okur, `impit` ile TCDD'yi
sorgular, boş koltuk bulununca Telegram bildirimi atar ve aramayı siler.

```bash
# Tek seferlik çalıştırma
yarn poll

# veya doğrudan (Node 22+ gerekli — native TS type-stripping)
node --env-file=.env.local scripts/poll-trains.ts

# 60 saniyede bir tekrar (Ctrl+C ile durur)
node --env-file=.env.local scripts/poll-trains.ts --watch 60
```

`.env.local` içinde `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` ve
(taze) `TCDD_AUTH_TOKEN` bulunmalı. `TCDD_PROXY_URL` gerekmez.

Sürekli çalışması için cron/launchd örneği (her dakika):

```bash
# crontab -e
* * * * * cd /path/to/fast-train-empty-seat-finder && /usr/local/bin/node --env-file=.env.local scripts/poll-trains.ts >> /tmp/tcdd-poll.log 2>&1
```

## Lisans

MIT
