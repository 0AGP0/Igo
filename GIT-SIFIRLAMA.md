# Git Sıfırlama Adımları

## ⚠️ DİKKAT: Bu işlem mevcut git geçmişini silecek!

## Adımlar:

### 1. Git klasörünü sil
```bash
rm -rf .git
```
veya Windows'ta:
```bash
rmdir /s /q .git
```

### 2. Yeni git repository oluştur
```bash
git init
git branch -M main
```

### 3. Remote'u ekle
```bash
git remote add origin https://github.com/0AGP0/Igo.git
```

### 4. Tüm dosyaları ekle (.gitignore'a göre)
```bash
git add .
```

### 5. Durumu kontrol et
```bash
git status
```
Bu komut hangi dosyaların ekleneceğini gösterir. `notes/` ve `*.wav` dosyaları görünmemeli!

### 6. İlk commit
```bash
git commit -m "Initial commit - optimized for fast push"
```

### 7. Force push (remote'daki eski geçmişi siler)
```bash
git push --force origin main
```

## Kontrol Listesi:
- ✅ `.gitignore` dosyası doğru mu? (`notes/` ve `assets/*.wav` ignore'da olmalı)
- ✅ `git status` ile kontrol ettin mi?
- ✅ Büyük dosyalar görünmüyor mu?

## Sonuç:
Bu işlemden sonra:
- Temiz bir git geçmişi olacak
- Sadece gerekli dosyalar gönderilecek
- Push çok daha hızlı olacak
