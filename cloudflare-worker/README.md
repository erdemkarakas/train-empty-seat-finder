# TCDD Tren Boş Koltuk Bulucu Cloudflare Worker

Bu Cloudflare Worker, tren boş koltuk uygulamasının arkaplanda 2 dakikada bir kontrol yapmasını sağlar. Vercel Hobby planındaki günlük cron job kısıtlamasını aşmak için geliştirilmiştir.

## Kurulum Adımları

### 1. Cloudflare'da Hesap Oluşturma

Eğer henüz bir Cloudflare hesabınız yoksa, [Cloudflare Workers](https://workers.cloudflare.com/) sitesinden ücretsiz bir hesap oluşturun.

### 2. Wrangler CLI Kurulumu

```bash
# Wrangler CLI'ı global olarak yükleyin
npm install -g wrangler

# Cloudflare hesabınıza giriş yapın
wrangler login
```

### 3. Worker Projesini Hazırlama

```bash
# Bu dizine geçiş yapın
cd cloudflare-worker

# Bağımlılıkları yükleyin
npm install
```

### 4. KV Namespace Oluşturma

```bash
# "TRAIN_SEARCH_KV" adında bir KV Namespace oluşturun
wrangler kv namespace create "TRAIN_SEARCH_KV"
```

Çıktıda görünecek `id` değerini `wrangler.toml` dosyasında `DOLDURULACAK_KV_ID` kısmı ile değiştirin.

### 5. TypeScript Hatalarını Çözme

TypeScript hatalarıyla karşılaşırsanız, aşağıdaki adımları izleyin:

```bash
# Cloudflare Workers için TypeScript desteğini yeniden yükleyin
npm uninstall @cloudflare/workers-types
npm install @cloudflare/workers-types@latest --save-dev

# Derlemeyi test edin
npx tsc --noEmit
```

Hala TypeScript hataları alıyorsanız, projeyi sıfırdan oluşturmayı deneyin:

```bash
# Yeni bir Workers projesi oluşturun
cd ..
wrangler init yeni-worker-projesi
cd yeni-worker-projesi

# Mevcut kodları src/ dizinine kopyalayın
cp ../cloudflare-worker/src/* src/
```

### 6. Worker'ı Dağıtma (Deploy)

```bash
# Worker'ı Cloudflare'a deploy edin
npm run deploy
```

### 7. Vercel Ortam Değişkenlerini Ayarlama

Vercel dashboard'a gidin ve projenizin Environment Variables bölümüne aşağıdaki değişkenleri ekleyin:

- `CLOUDFLARE_WORKER_URL`: Dağıtımdan sonra size verilecek URL (örn: https://train-search-worker.your-account.workers.dev)
- `CLOUDFLARE_SEARCH_SECRET`: Güvenlik için rastgele bir string oluşturun (örn: kullanıcıları doğrulamak için)

### 8. Worker Ortam Değişkenlerini Ayarlama

Cloudflare Workers dashboard'a gidin, worker'ınızı seçin ve Settings > Variables bölümünden aşağıdaki değişkenleri ekleyin:

- `APP_URL`: Vercel uygulamanızın URL'i (örn: https://your-app.vercel.app)
- `SEARCH_SECRET`: Vercel'de ayarladığınız ile aynı secret değer

## Hata Ayıklama ve Test

Kurulumu test etmek için:

1. Cloudflare Worker'ınızı tarayıcıda ziyaret edin: `https://[worker-adınız].workers.dev`
2. Vercel uygulamanızda yeni bir arama başlatın ve "Aktif Aramalar" bölümünde "Cloudflare Worker aktif" mesajını görüp görmediğinizi kontrol edin.

## Nasıl Çalışır?

1. Kullanıcı uygulamadan bir tren araması başlattığında, bu bilgi hem Vercel KV'ye hem de Cloudflare Worker'a kaydedilir.
2. Cloudflare Worker 2 dakikada bir çalışarak kayıtlı tüm aramaları kontrol eder.
3. Boş koltuk bulunduğunda, kullanıcıya Telegram ile bildirim gönderilir ve arama otomatik olarak sonlandırılır.

## Limitler

Cloudflare Workers ücretsiz planında:
- Günde 100,000 istek yapabilirsiniz (2 dakikada bir çalışan bir job için fazlasıyla yeterli)
- KV'de 1GB depolama alanınız var
- İstek başına 10ms CPU süresi (aşıldığında hata verir)

## Sorun Giderme

- Logları kontrol etmek için Cloudflare Workers dashboard'da "Logs" bölümünü kullanabilirsiniz.
- Yerel geliştirme için `npm run dev` komutunu kullanın.
- Worker'ın çalışıp çalışmadığını test etmek için worker URL'ine tarayıcınızdan erişebilirsiniz. 