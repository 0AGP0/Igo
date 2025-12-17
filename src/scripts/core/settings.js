// ===== SETTINGS SYSTEM =====

// Always on top ayarını kontrol et
async function checkAlwaysOnTop() {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    try {
      const isAlwaysOnTop = await ipcRenderer.invoke('get-always-on-top');
      console.log('🔝 Always on top durumu:', isAlwaysOnTop ? 'Açık' : 'Kapalı');
      return isAlwaysOnTop;
    } catch (error) {
      console.error('❌ Always on top durumu alınamadı:', error);
      return false;
    }
  }
  return false;
}

// Always on top ayarını değiştir
async function setAlwaysOnTop(enabled) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    try {
      const result = await ipcRenderer.invoke('set-always-on-top', enabled);
      console.log('🔝 Always on top ayarı değiştirildi:', enabled ? 'Açık' : 'Kapalı', 'Sonuç:', result);
      return result;
    } catch (error) {
      console.error('❌ Always on top ayarı değiştirilemedi:', error);
      return false;
    }
  }
  return false;
}

// Always on Top ayarını yükle
async function loadAlwaysOnTopSetting() {
  try {
    const isAlwaysOnTop = await checkAlwaysOnTop();
    const checkbox = document.getElementById('alwaysOnTopCheckbox');
    if (checkbox) {
      checkbox.checked = isAlwaysOnTop;
      console.log('🔝 Always on Top ayarı yüklendi:', isAlwaysOnTop);
    }
  } catch (error) {
    console.error('❌ Always on Top ayarı yüklenemedi:', error);
  }
}

// Always on Top toggle
function toggleAlwaysOnTop() {
  const checkbox = document.getElementById('alwaysOnTopCheckbox');
  console.log('🔧 toggleAlwaysOnTop çağrıldı, checkbox:', checkbox);
  
  if (checkbox && typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    const isChecked = checkbox.checked;
    
    console.log('🔧 IPC çağrısı yapılıyor, isChecked:', isChecked);
    
    // Always on Top ayarını uygula
    ipcRenderer.invoke('set-always-on-top', isChecked).then(result => {
      console.log('🔧 IPC sonucu:', result);
      if (result.success) {
        console.log('🔝 Always on Top ayarı değiştirildi:', isChecked ? 'Açık' : 'Kapalı');
        
        // Ayar main.js'de dosyaya kaydediliyor
        
        if (window.showNotification) {
          window.showNotification(
            isChecked ? 'Widget her zaman üstte kalacak' : 'Widget normal modda', 
            'success'
          );
        }
      } else {
        console.error('❌ Always on Top ayarı değiştirilemedi:', result.error);
        // Checkbox'ı eski durumuna geri döndür
        checkbox.checked = !isChecked;
      }
    }).catch(error => {
      console.error('❌ IPC çağrısı hatası:', error);
    });
  } else {
    console.error('❌ Checkbox bulunamadı veya require yok');
  }
}

// Global exports
window.checkAlwaysOnTop = checkAlwaysOnTop;
window.setAlwaysOnTop = setAlwaysOnTop;
window.loadAlwaysOnTopSetting = loadAlwaysOnTopSetting;
window.toggleAlwaysOnTop = toggleAlwaysOnTop;

