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

## Lisans

MIT
