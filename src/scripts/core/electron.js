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
  
  // Window resize eventlerini dinle - board boyutunu güncelle
  ipcRenderer.on('window-resized', () => {
    console.log('🔄 Pencere boyutu değişti - board boyutu güncelleniyor');
    setTimeout(() => {
      if (window.updateBoardSize) window.updateBoardSize();
      // Board transform'u da güncelle (pan/zoom pozisyonunu koru)
      if (window.updateBoardTransform) window.updateBoardTransform();
      if (window.drawConnections) window.drawConnections();
      if (window.renderGraph) window.renderGraph();
    }, 100);
  });
  
  // Widget drag başladı/bitti eventlerini dinle - render optimizasyonu için
  ipcRenderer.on('widget-drag-started', () => {
    console.log('🔄 Widget drag başladı - AGRESİF render optimizasyonu aktif');
    window.widgetIsDragging = true;
    
    // ÖNCE widget ve body'yi aktif tut - sonra board'u etkisizleştir
    // Body'yi aktif tut ki widget içindeki butonlar çalışsın
    document.body.style.pointerEvents = 'auto';
    
    // Widget içindeki tüm interaktif elementler - ÖNCE BUNU YAP
    const widget = document.getElementById('widget');
    if (widget) {
      widget.style.pointerEvents = 'auto';
      // Widget içindeki tüm butonları aktif tut
      const allWidgetButtons = widget.querySelectorAll('button, .btn, input, select, textarea, a, .toolbar, .top, .drag');
      allWidgetButtons.forEach(el => {
        el.style.pointerEvents = 'auto';
      });
    }
    
    // Widget toolbar butonları
    const widgetToolbar = document.querySelector('.widget .toolbar');
    if (widgetToolbar) {
      widgetToolbar.style.pointerEvents = 'auto';
      const widgetButtons = widgetToolbar.querySelectorAll('.btn');
      widgetButtons.forEach(btn => {
        btn.style.pointerEvents = 'auto';
      });
    }
    
    // Widget header butonları (top içindeki tüm butonlar)
    const widgetTop = document.querySelector('.widget .top');
    if (widgetTop) {
      widgetTop.style.pointerEvents = 'auto';
      const topButtons = widgetTop.querySelectorAll('.btn, .toolbar .btn, button');
      topButtons.forEach(btn => {
        btn.style.pointerEvents = 'auto';
      });
    }
    
    // Board elementini bul ve render optimizasyonu yap
    // Header butonlarından drag başladığında kart düzlemi ile etkileşime geçilebilir olmalı
    const board = document.getElementById('board');
    if (board) {
      board.style.willChange = 'auto';
      // pointer-events: none YAPMA - kart düzlemi ile etkileşime geçilebilir olmalı
      // board.style.pointerEvents = 'none'; // KALDIRILDI
    }
    
    // Board wrapper'ı bul - render optimizasyonu için
    // Header butonlarından drag başladığında kart düzlemi ile etkileşime geçilebilir olmalı
    const boardWrap = document.querySelector('.body .boardwrap');
    if (boardWrap) {
      // Boardwrap'ı etkisizleştirme - kart düzlemi ile etkileşime geçilebilir olmalı
      // boardWrap.style.pointerEvents = 'none'; // KALDIRILDI
    }
    
    // Tüm render timeout'ları iptal et
    if (window._renderNotesTimeout) {
      clearTimeout(window._renderNotesTimeout);
      window._renderNotesTimeout = null;
    }
    if (window._connectionUpdateTimer) {
      cancelAnimationFrame(window._connectionUpdateTimer);
      window._connectionUpdateTimer = null;
    }
  });
  
  ipcRenderer.on('widget-drag-stopped', () => {
    console.log('✅ Widget drag bitti - render optimizasyonu kapatıldı');
    window.widgetIsDragging = false;
    
    // Body'yi sıfırla
    document.body.style.pointerEvents = '';
    
    // Widget içindeki tüm elementlerin pointer-events'ini sıfırla
    const widget = document.getElementById('widget');
    if (widget) {
      widget.style.pointerEvents = '';
      const allWidgetButtons = widget.querySelectorAll('button, .btn, input, select, textarea, a, .toolbar, .top, .drag');
      allWidgetButtons.forEach(el => {
        el.style.pointerEvents = '';
      });
    }
    
    // Board elementini tekrar aktif et
    const board = document.getElementById('board');
    if (board) {
      board.style.willChange = 'transform';
      board.style.pointerEvents = 'auto';
    }
    
    // Board wrapper'ı tekrar aktif et
    const boardWrap = document.querySelector('.boardwrap');
    if (boardWrap) {
      boardWrap.style.pointerEvents = 'auto';
    }
    
    // Render işlemlerini tekrar başlat
    setTimeout(() => {
      if (window.renderNotes) window.renderNotes();
      if (window.drawConnections) window.drawConnections();
      if (window.renderGraph) window.renderGraph();
    }, 100);
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
  // Board görünümünü yükle (DOM hazır olduktan sonra)
  // Sadece değerleri set et, transform'u notlar render edildikten sonra uygula
  setTimeout(() => {
    if (window.loadBoardView) {
      window.loadBoardView();
    }
  }, 100);
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

