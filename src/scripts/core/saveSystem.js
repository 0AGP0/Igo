// ===== KESİN KAYDETME SİSTEMİ - PERFORMANS OPTİMİZE =====

let saveTimeout = null;
let lastSaveTime = 0;
let hasUnsavedChanges = false;
let isAppActive = true;

function saveAllData() {
  // Anlık kaydetme - her değişiklikte
  try {
    if (window.saveNotes) window.saveNotes();
    if (window.saveFolders) window.saveFolders(); 
    if (window.saveNotePositions) window.saveNotePositions();
    lastSaveTime = Date.now();
    hasUnsavedChanges = false;
    console.log('✅ Tüm veriler kaydedildi');
  } catch (error) {
    console.error('❌ Kaydetme hatası:', error);
  }
}

function scheduleSave() {
  hasUnsavedChanges = true;
  
  // Çok sık kaydetmeyi önle (performans için)
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // 2000ms sonra kaydet (debounce) - daha performanslı
  saveTimeout = setTimeout(() => {
    saveAllData();
  }, 2000);
}

function forceSave() {
  // Zorla kaydetme (uygulama kapanırken vs.)
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveAllData();
}

// Uygulama aktif/pasif durumu takibi
document.addEventListener('visibilitychange', () => {
  isAppActive = !document.hidden;
  
  // Uygulama aktif olmadığında ve değişiklik varsa kaydet
  if (!isAppActive && hasUnsavedChanges) {
    console.log('🔄 Uygulama pasif oldu, kaydetme yapılıyor...');
    forceSave();
  }
});

// Sadece kritik durumlarda periyodik kontrol (60 saniye - daha performanslı)
setInterval(() => {
  // Sadece uygulama aktif değilse ve değişiklik varsa
  if (!isAppActive && hasUnsavedChanges && (Date.now() - lastSaveTime > 60000)) {
    console.log('🔄 60 saniye geçti ve uygulama pasif, güvenlik kaydetme...');
    forceSave();
  }
}, 60000); // 60 saniye - daha performanslı

// Uygulama kapatılırken pozisyonları kaydet
window.addEventListener('beforeunload', () => {
  forceSave(); // Zorla kaydetme
  console.log('📍 Uygulama kapatılıyor, tüm veriler kaydedildi');
});

// Uygulama başladığında kaydetme sistemini başlat
setTimeout(() => {
  scheduleSave(); // İlk kaydetme
}, 1000); // 1 saniye sonra başlat

// Global exports
window.saveAllData = saveAllData;
window.scheduleSave = scheduleSave;
window.forceSave = forceSave;

console.log('💾 Kaydetme sistemi yüklendi');

