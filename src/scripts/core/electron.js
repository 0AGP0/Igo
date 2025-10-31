// ===== ELECTRON INTEGRATION =====

// Electron entegrasyonu
let ipcRenderer;
try {
  ipcRenderer = require('electron').ipcRenderer;
  
  // Window show/hide eventlerini dinle
  ipcRenderer.on('main-window-shown', () => {
    if (window.openWidget) window.openWidget();
  });
  
  ipcRenderer.on('main-window-hidden', () => {
    if (window.closeWidget) window.closeWidget();
  });
  
  // Main process'ten gelen kaydetme sinyali (Ctrl+C ile kapatma için)
  ipcRenderer.on('save-before-quit', () => {
    console.log('🔄 Main process kaydetme sinyali aldı');
    if (window.forceSave) window.forceSave(); // Zorla kaydetme
    console.log('📍 Veriler kaydedildi (Ctrl+C ile kapatma)');
  });
  
  console.log('⚡ Electron IPC entegrasyonu aktif');
  
  // window.electronAPI'yi tanımla
  window.electronAPI = {
    invoke: (channel, data) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke(channel, data)
          .then(result => resolve(result))
          .catch(error => reject(error));
      });
    },
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    }
  };
  
} catch (e) {
  // Web tarayıcısında çalışıyorsa mock ipcRenderer
  ipcRenderer = {
    send: (channel, data) => {
      if (channel === 'toggle-main-window') {
        // Mock ortamda toggle
        const widget = document.getElementById('widget');
        if (widget.classList.contains('open')) {
          if (window.closeWidget) window.closeWidget();
        } else {
          if (window.openWidget) window.openWidget();
        }
      }
    }
  };
  
  // Mock window.electronAPI
  window.electronAPI = {
    invoke: (channel, data) => {
      console.log(`🌐 Mock IPC invoke: ${channel}`, data);
      return Promise.resolve({ success: true, message: 'Mock mode' });
    },
    send: (channel, data) => {
      console.log(`🌐 Mock IPC send: ${channel}`, data);
    }
  };
  
  console.log('🌐 Browser modunda çalışıyor (mock IPC)');
}

// Electron için özel ayarlar
if (typeof require !== 'undefined') {
  // Electron ortamında çalışıyor
  const { webFrame } = require('electron');
  // Zoom seviyesini sıfırla
  webFrame.setZoomLevel(0);
  // DevTools'u kapat
  webFrame.setVisualZoomLevelLimits(1, 1);
  
  // Memory optimization
  webFrame.clearCache();
  
  // GPU ayarları
  if (process.platform === 'win32') {
    // Windows'ta GPU bellek optimizasyonu
    document.body.style.transform = 'translateZ(0)';
  }
  
  console.log('⚡ Electron optimizasyonları uygulandı');
}

// Uygulama başladığında ayarları kontrol et
document.addEventListener('DOMContentLoaded', () => {
  // Always on Top durumunu kontrol et (main.js'de ayar zaten uygulanmış olmalı)
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke('get-always-on-top').then(isAlwaysOnTop => {
      console.log('🔝 Widget başlangıç Always on Top durumu:', isAlwaysOnTop ? 'Açık' : 'Kapalı');
    });
  }
});

// Global export
window.ipcRenderer = ipcRenderer;

console.log('⚡ Electron entegrasyonu yüklendi');

