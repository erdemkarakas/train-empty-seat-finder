#!/bin/bash
# Bu script, PWA için gerekli olan ikon dosyalarını oluşturur.
# Kullanım: ./generate-icons.sh <kaynak-ikon.png>

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# ImageMagick'in kurulu olup olmadığını kontrol et
if ! command -v convert &> /dev/null; then
  echo -e "${RED}ImageMagick kurulu değil. İkonları oluşturmak için ImageMagick gerekli.${NC}"
  echo -e "${YELLOW}Aşağıdaki yöntemlerden birini deneyebilirsiniz:${NC}"
  echo -e "1. ${GREEN}ImageMagick'i yükleyin:${NC}"
  echo "   - macOS: brew install imagemagick"
  echo "   - Ubuntu/Debian: sudo apt-get install imagemagick"
  echo "   - Windows: https://imagemagick.org/script/download.php"
  echo -e "2. ${GREEN}Online araçları kullanın:${NC}"
  echo "   - https://app-manifest.firebaseapp.com/"
  echo "   - https://maskable.app/"
  echo "   - https://favicon.io/favicon-converter/"
  exit 1
fi

# Parametre kontrolü
if [ -z "$1" ]; then
  echo -e "${RED}Hata: Kaynak dosya belirtilmedi!${NC}"
  echo -e "${YELLOW}Kullanım: $0 <kaynak-ikon.png>${NC}"
  exit 1
fi

SOURCE_ICON="$1"

# Kaynak dosyanın varlığını kontrol et
if [ ! -f "$SOURCE_ICON" ]; then
  echo -e "${RED}Hata: Kaynak dosya '$SOURCE_ICON' bulunamadı!${NC}"
  exit 1
fi

# Hedef dizini belirle ve oluştur
TARGET_DIR="$(dirname "$0")"

# İkon boyutları
SIZES=(16 32 48 72 96 128 144 152 192 384 512)

# Her boyut için ikon oluştur
for size in "${SIZES[@]}"; do
  echo -e "${GREEN}$size x $size boyutunda ikon oluşturuluyor...${NC}"
  convert "$SOURCE_ICON" -resize ${size}x${size} "$TARGET_DIR/icon-${size}x${size}.png"
done

# Favicon için özel ikonlar
echo -e "${GREEN}favicon.ico oluşturuluyor...${NC}"
convert "$SOURCE_ICON" -resize 16x16 "$TARGET_DIR/favicon-16x16.png"
convert "$SOURCE_ICON" -resize 32x32 "$TARGET_DIR/favicon-32x32.png"
convert "$SOURCE_ICON" -resize 48x48 "$TARGET_DIR/favicon-48x48.png"

# favicon.ico oluştur (16x16, 32x32 ve 48x48 boyutlarını içerir)
convert "$TARGET_DIR/favicon-16x16.png" "$TARGET_DIR/favicon-32x32.png" "$TARGET_DIR/favicon-48x48.png" "$TARGET_DIR/../favicon.ico"

# Apple Touch Icon için özel ikonlar
echo -e "${GREEN}Apple Touch ikonları oluşturuluyor...${NC}"
convert "$SOURCE_ICON" -resize 180x180 "$TARGET_DIR/apple-icon-180x180.png"
convert "$SOURCE_ICON" -resize 152x152 "$TARGET_DIR/apple-icon-152x152.png"
convert "$SOURCE_ICON" -resize 120x120 "$TARGET_DIR/apple-icon-120x120.png"
convert "$SOURCE_ICON" -resize 76x76 "$TARGET_DIR/apple-icon-76x76.png"
convert "$SOURCE_ICON" -resize 60x60 "$TARGET_DIR/apple-icon-60x60.png"

echo -e "${GREEN}Tüm ikonlar başarıyla oluşturuldu!${NC}"
echo -e "${YELLOW}İkonlar şu konumda: $TARGET_DIR${NC}" 