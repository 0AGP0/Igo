// ===== KEYBOARD SHORTCUTS =====

// Klavye Kısayolları
document.addEventListener('keydown', (e) => {
  // F1 veya ? için yardım aç
  if (e.key === 'F1' || (e.key === '?' && !e.ctrlKey && !e.shiftKey && !e.altKey)) {
    e.preventDefault();
    if (window.openHelpModal) window.openHelpModal();
    return;
  }
  
  // Ctrl kombinasyonları
  if (e.ctrlKey) {
    switch (e.key) {
      case 'n':
        e.preventDefault();
        // Ctrl+N - Yeni not
        if (window.createNote) window.createNote();
        break;
        
      case 'f':
        e.preventDefault();
        // Arama kutusuna odaklan
        const searchInput = document.getElementById('q');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        break;
        
      case 's':
        e.preventDefault();
        // Açık not varsa kaydet
        if (window.currentEditingNote && window.saveCurrentNote) {
          window.saveCurrentNote();
        }
        break;
        
      case 'q':
        e.preventDefault();
        // Uygulamayı kapat
        if (typeof require !== 'undefined') {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('close-main-window');
        }
        break;
        
      case 'w':
        if (e.shiftKey) {
          e.preventDefault();
          // Ctrl+Shift+W - Widget aç/kapat
          if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('toggle-main-window');
          }
        }
        break;
    }
  }
});

console.log('⌨️ Klavye kısayolları yüklendi');

