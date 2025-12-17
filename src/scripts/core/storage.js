// ===== DATA UTILITY FUNCTIONS =====
const DataManager = {
  save(key, data) {
    const jsonData = JSON.stringify(data);
    
    // 1. Ana kaydetme (localStorage)
    try {
      localStorage.setItem(key, jsonData);
      console.log(`✅ ${key} localStorage'a kaydedildi`);
    } catch (error) {
      console.warn(`⚠️ ${key} localStorage hatası:`, error);
    }
    
    // 2. Yedek kaydetme (sessionStorage)
    try {
      sessionStorage.setItem(key, jsonData);
      console.log(`✅ ${key} sessionStorage'a yedeklendi`);
    } catch (error) {
      console.warn(`⚠️ ${key} sessionStorage hatası:`, error);
    }
    
    // 3. Çoklu yedek (farklı key'lerle)
    try {
      localStorage.setItem(key + '_backup1', jsonData);
      localStorage.setItem(key + '_backup2', jsonData);
      sessionStorage.setItem(key + '_backup', jsonData);
    } catch (error) {
      console.warn(`⚠️ ${key} çoklu yedek hatası:`, error);
    }
    
    return true;
  },
  
  load(key, defaultValue = '[]') {
    // 1. Ana kaynaktan yükle (localStorage)
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`✅ ${key} localStorage'dan yüklendi`);
        return parsed;
      }
    } catch (error) {
      console.warn(`⚠️ ${key} localStorage yükleme hatası:`, error);
    }
    
    // 2. Yedek kaynaklardan dene (öncelik sırasıyla)
    const backupKeys = [
      key + '_backup1',
      key + '_backup2', 
      key + '_backup',
      key // sessionStorage'dan
    ];
    
    for (const backupKey of backupKeys) {
      try {
        let data;
        if (backupKey === key) {
          data = sessionStorage.getItem(key);
        } else {
          data = localStorage.getItem(backupKey);
        }
        
        if (data) {
          const parsed = JSON.parse(data);
          console.log(`✅ ${key} ${backupKey} kaynağından yüklendi`);
          return parsed;
        }
      } catch (error) {
        console.warn(`⚠️ ${key} ${backupKey} yükleme hatası:`, error);
      }
    }
    
    console.warn(`⚠️ ${key} hiçbir kaynaktan yüklenemedi, varsayılan kullanılıyor`);
    return JSON.parse(defaultValue);
  }
};

// Global export
window.DataManager = DataManager;

