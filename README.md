# Igo Desktop Widget

Modern ve şık masaüstü not widget'ı. Electron ile geliştirilmiş, güçlü ve kullanıcı dostu not alma deneyimi.

## ✨ Özellikler

### 🎯 Ana Özellikler
- **Floating Orb**: Masaüstünde her zaman erişilebilir orb
- **Instant Notes**: Hızlı not oluşturma ve düzenleme
- **Todo Sistemi**: Gelişmiş görev yönetimi ve takibi
- **Canvas Görünümü**: Notları ve todo'ları canvas'ta düzenleme
- **Bilgi Haritası**: Notlar arası bağlantıları görselleştirme
- **Multi-Selection**: Çoklu not/todo seçimi ve toplu işlemler
- **Folder System**: Notları ve todo'ları klasörlerle organize etme
- **Real-time Search**: Anlık arama ve filtreleme
- **Markdown Support**: Zengin metin formatting (H1-H6, listeler)
- **System Tray**: Simge durumuna küçültme

### 🎨 Tasarım
- **Modern UI**: Koyu tema ile modern arayüz
- **Responsive Design**: Zoom desteği ile esnek boyutlandırma
- **Smooth Animations**: Akıcı geçişler ve animasyonlar
- **Visual Feedback**: Net görsel geri bildirimler

### 🔧 Gelişmiş Özellikler
- **Drag & Drop**: Sürükle-bırak ile kolay organizasyon
- **Resize Cards**: Kartları istediğiniz boyutta ayarlayın
- **Context Menus**: Sağ tık menüleri ile hızlı erişim
- **Auto-save**: Otomatik kaydetme sistemi
- **Connection System**: Not-not, not-todo, klasör-not bağlantıları
- **Visual Connections**: Bağlantı çizgileri ile görsel ilişkiler
- **Connection Modal**: Gelişmiş bağlantı yönetimi
- **Etiket Sistemi**: Notları etiketlerle kategorize etme

## 🚀 Kurulum

1. **Setup Dosyası**: `Igo Setup 1.0.1.exe` dosyasını çalıştırın
2. **Kurulum**: Kurulum sihirbazını takip edin
3. **Başlatın**: Masaüstü kısayolundan veya başlat menüsünden çalıştırın

### Portable Versiyon
Kurulum gerektirmeyen portable versiyonu da mevcuttur: `Igo Portable 1.0.1.exe`

## 📖 Kullanım

### Orb Kontrolü
- **Sol Tık**: Widget'ı aç/kapat
- **Sürükle**: Orb'u masaüstünde taşı
- **Sağ Tık**: Context menü (Widget aç/kapat, Gizle, Çıkış)

### Widget Kontrolü
- **Tab Sistemi**: Sol panelde 4 farklı görünüm
  - 📝 **Not Yönetimi**: Notları ve klasörleri yönetin
  - ✅ **Todo Listesi**: Görevleri organize edin
  - 🏷️ **Etiketler**: Etiketlerle filtreleme yapın
  - 🗺️ **Bilgi Haritası**: Bağlantıları görselleştirin

### Not Yönetimi
- **Yeni Not**: "📝 Yeni Not" butonuna tıklayın
- **Düzenle**: Nota çift tıklayın veya sağ tık → Düzenle
- **Sil**: Sağ tık → Sil
- **Taşı**: Notu sürükleyip bırakın
- **Canvas Görünümü**: Bilgi Haritası sekmesinde canvas'ta düzenleyin

### Todo Sistemi
- **Yeni Todo**: "✅ Yeni Todo" butonuna tıklayın
- **Başlık Sistemi**: Todo içinde başlıklar ve alt görevler
- **Öncelik Seviyeleri**: Yüksek, Orta, Düşük öncelik
- **Filtreleme**: Öncelik ve arama ile filtreleme
- **Canvas Görünümü**: Todo'ları canvas'ta düzenleyin

### Bağlantı Sistemi
- **Bağlantı Yönetimi**: Sağ tık → "🔗 Bağlantıları Yönet"
- **Bağlantı Türleri**: Not-Not, Not-Todo, Klasör-Not, Todo-Klasör
- **Görsel Çizgiler**: Canvas'ta bağlantı çizgileri
- **Modal Arayüz**: Arama ve filtreleme ile kolay yönetim

### Multi-Selection
1. Boş alanda sol tık + sürükle
2. Seçili notları/todo'ları birlikte taşıyın
3. ESC ile seçimi temizleyin

### Klasör Sistemi
- **Yeni Klasör**: "📁 Yeni Klasör" butonuna tıklayın
- **Notları Taşı**: Notları klasörlere sürükleyin
- **Todo'ları Taşı**: Todo'ları klasörlere bağlayın
- **Renk Değiştir**: Klasör rengine tıklayın
- **Klasörde Not Oluştur**: Klasöre sağ tık → "📝 Not Ekle"

## ⌨️ Kısayollar

- **ESC**: Seçimleri temizle / Modal'ları kapat
- **Ctrl+F**: Arama kutusuna odaklan
- **Enter**: Not/Todo düzenlemede kaydet
- **Sağ Tık**: Context menü
- **Çift Tık**: Not/Todo düzenleme
- **Sürükle**: Kartları taşıma
- **Sürükle + Seçim**: Multi-selection

## 🔧 Sistem Gereksinimleri

- **OS**: Windows 10/11 (64-bit)
- **RAM**: Minimum 4GB
- **Disk**: 200MB boş alan
- **Display**: 1366x768 minimum çözünürlük

## 📂 Dosya Konumları

- **Veri**: `%APPDATA%/igo-desktop-widget/`
- **Ayarlar**: `settings.json`
- **Notlar**: `notes/` klasörü (Markdown/TXT dosyaları)
- **Todo'lar**: `todos.json`
- **Klasörler**: `folders.json`
- **Bağlantılar**: Notların metadata'sında saklanır

## 🆘 Sorun Giderme

### Uygulama Açılmıyor
1. Yönetici olarak çalıştırmayı deneyin
2. Windows Defender'ı kontrol edin
3. Uygulamayı yeniden kurun

### Orb Görünmüyor
1. Sağ tık → Context menü ile kontrol edin
2. System tray'den uygulamayı açın
3. Ayarları sıfırlayın

### Performans Sorunları
1. Çok fazla not/todo varsa klasörlere ayırın
2. Zoom seviyesini düşürün
3. Bağlantı çizgilerini gizleyin (Bilgi Haritası)
4. Uygulamayı yeniden başlatın

### Bağlantı Sorunları
1. Canvas'ta bağlantı çizgileri görünmüyorsa "Bilgi Haritası" sekmesine geçin
2. Todo bağlantıları için todo'ların canvas'ta olması gerekir
3. Bağlantı modal'ında arama kullanın


