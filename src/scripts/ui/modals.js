// ===== MODAL SYSTEM =====

// Yardım Modal Fonksiyonları
function openHelpModal() {
  const helpModal = document.getElementById('helpModal');
  if (helpModal) {
    helpModal.style.display = 'flex';
    helpModal.style.opacity = '0';
    helpModal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      helpModal.style.opacity = '1';
      helpModal.style.transform = 'scale(1)';
    }, 10);
  }
}

function closeHelpModal() {
  const helpModal = document.getElementById('helpModal');
  if (helpModal) {
    helpModal.style.opacity = '0';
    helpModal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      helpModal.style.display = 'none';
    }, 200);
  }
}

// Basit Ayarlar Modal Fonksiyonları
function openSettingsModal() {
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    // Mevcut Always on Top durumunu yükle
    if (window.loadAlwaysOnTopSetting) window.loadAlwaysOnTopSetting();
    
    settingsModal.style.display = 'flex';
    settingsModal.style.opacity = '0';
    settingsModal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      settingsModal.style.opacity = '1';
      settingsModal.style.transform = 'scale(1)';
    }, 10);
  }
}

function closeSettingsModal() {
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.style.opacity = '0';
    settingsModal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      settingsModal.style.display = 'none';
    }, 200);
  }
}

// Modal input sistemi (Electron prompt() yerine)
let inputModalCallback = null;

function showInputModal(title, placeholder, defaultValue = '', callback) {
  const modal = document.getElementById('inputModal');
  const titleEl = document.getElementById('inputModalTitle');
  const inputEl = document.getElementById('inputModalInput');
  
  if (!modal || !titleEl || !inputEl) {
    console.error('❌ Input modal elementleri bulunamadı');
    return;
  }
  
  titleEl.textContent = title;
  inputEl.placeholder = placeholder;
  inputEl.value = defaultValue;
  inputModalCallback = callback;
  
  modal.classList.add('show');
  inputEl.focus();
  inputEl.select();
  
  // Enter tuşu ile onaylama
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') {
      confirmInputModal();
    } else if (e.key === 'Escape') {
      closeInputModal();
    }
  };
}

function closeInputModal() {
  const modal = document.getElementById('inputModal');
  if (modal) {
    modal.classList.remove('show');
  }
  inputModalCallback = null;
}

function confirmInputModal() {
  const inputEl = document.getElementById('inputModalInput');
  if (inputEl && inputModalCallback) {
    const value = inputEl.value.trim();
    inputModalCallback(value);
  }
  closeInputModal();
}

// Notu klasöre taşıma dialog'u
function showMoveToFolderDialog(noteId) {
  const note = window.getNoteById ? window.getNoteById(noteId) : null;
  if (!note) return;
  
  const folders = window.folders || [];
  
  // Mevcut dialog'u kaldır
  const existingDialog = document.querySelector('.move-to-folder-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  const dialog = document.createElement('div');
  dialog.className = 'modal-overlay show move-to-folder-dialog';
  dialog.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">📁 Notu Taşı: "${note.title}"</div>
      
      <div style="margin-bottom: 20px;">
        <div class="folder-option" data-folder-id="null">
          <div class="folder-color" style="background: var(--muted);"></div>
          <div class="folder-name">Klasörsüz Notlar</div>
        </div>
        
        ${folders.map(folder => `
          <div class="folder-option" data-folder-id="${folder.id}">
            <div class="folder-color" style="background: ${folder.color};"></div>
            <div class="folder-name">${folder.name}</div>
            <div class="folder-count">${window.getFolderNotes ? window.getFolderNotes(folder.id).length : 0}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="modal-buttons">
        <button class="modal-btn" onclick="this.closest('.modal-overlay').remove()">İptal</button>
      </div>
    </div>
  `;
  
  // Stil ekle
  const style = document.createElement('style');
  style.textContent = `
    .folder-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .folder-option:hover {
      background: rgba(255,255,255,0.05);
      border-color: var(--accent);
    }
    .folder-option.selected {
      background: rgba(125,211,252,0.1);
      border-color: var(--accent);
    }
    .folder-count {
      font-size: 12px;
      color: var(--muted);
      background: var(--elev);
      padding: 2px 6px;
      border-radius: 10px;
    }
  `;
  
  if (!document.querySelector('#move-dialog-styles')) {
    style.id = 'move-dialog-styles';
    document.head.appendChild(style);
  }
  
  document.body.appendChild(dialog);
  
  // Klasör seçimi
  dialog.querySelectorAll('.folder-option').forEach(option => {
    option.addEventListener('click', () => {
      // Önceki seçimi kaldır
      dialog.querySelectorAll('.folder-option').forEach(opt => opt.classList.remove('selected'));
      
      // Yeni seçimi işaretle
      option.classList.add('selected');
      
      // Klasör ID'sini al
      const folderId = option.dataset.folderId === 'null' ? null : option.dataset.folderId;
      const folderName = option.querySelector('.folder-name').textContent;
      
      // Notu taşı
      if (window.changeNoteFolder) {
        window.changeNoteFolder(noteId, folderId, folderName);
      }
      
      // Dialog'u kapat
      dialog.remove();
    });
  });
  
  // Overlay'e tıklandığında kapat
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });
}

// Global exports
window.openHelpModal = openHelpModal;
// Klasör silme modal fonksiyonları
function closeDeleteFolderModal() {
  const DOM = window.DOM || {};
  if (DOM.hideModal) DOM.hideModal('deleteFolderModal');
  
  const state = window.getState ? window.getState() : {};
  if (window.setState) window.setState({ folderToDelete: null });
  
  // Diğer modal'ları da kontrol et
  const folderModal = document.getElementById('folderModal');
  if (folderModal && folderModal.classList.contains('show')) {
    console.log('⚠️ Klasör modal hala açık, kapatılıyor');
    folderModal.classList.remove('show');
  }
}

function confirmDeleteFolder() {
  const state = window.getState ? window.getState() : {};
  const folderToDelete = state.folderToDelete;
  
  if (!folderToDelete) return;
  
  const folder = window.folders.find(f => f.id === folderToDelete);
  if (!folder) return;
  
  console.log('🗑️ Klasör silme işlemi başlatılıyor:', folder.name);
  
  // Ana klasör mü kontrol et
  const isMainFolder = !folder.parentId || folder.parentId === null;
  
  // Klasördeki notları klasörsüz yap
  let movedNotesCount = 0;
  window.notes.forEach(note => {
    if (note.folderId === folderToDelete) {
      note.folderId = null;
      movedNotesCount++;
    }
  });
  
  // Eğer ana klasörse, alt klasörleri bir seviye yukarı çıkar
  if (isMainFolder) {
    const subFolders = window.folders.filter(f => f.parentId === folderToDelete);
    console.log('📁 Alt klasörler bulundu:', subFolders.map(f => f.name));
    
    subFolders.forEach(subFolder => {
      subFolder.parentId = null;
      subFolder.parentPath = null;
      subFolder.path = subFolder.name;
      console.log('📁 Alt klasör üst seviyeye çıkarıldı:', subFolder.name);
    });
  }
  
  // Klasörü sil
  const deleteIndex = window.folders.findIndex(f => f.id === folderToDelete);
  if (deleteIndex !== -1) {
    window.folders.splice(deleteIndex, 1);
  }
  
  // Seçili klasör silinmişse, null yap
  if (state.selectedFolder === folderToDelete) {
    if (window.setState) window.setState({ selectedFolder: null });
  }
  
  // Dosya sisteminde klasörü sil
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    
    // Alt klasörler için tam path'i gönder
    const folderData = {
      id: folder.id,
      name: folder.name,
      path: folder.path ? folder.path.replace(/\\/g, '/') : folder.name,
      parentId: folder.parentId
    };
    
    console.log('🗑️ Klasör siliniyor:', folderData);
    ipcRenderer.send('delete-folder', folderData);
    
    ipcRenderer.once('folder-deleted', (event, result) => {
      if (result.success) {
        console.log('✅ Klasör başarıyla silindi:', folder.name);
        console.log(`📁 ${movedNotesCount} not klasörsüz yapıldı`);
      } else {
        console.error('❌ Klasör dosya sisteminden silinemedi:', result.error);
        if (window.showNotification) window.showNotification(`Klasör silinemedi: ${result.error}`, 'error');
      }
    });
  }
  
  // UI'yi güncelle
  if (window.saveNotes) window.saveNotes();
  if (window.saveFolders) window.saveFolders();
  if (window.renderFolderList) window.renderFolderList();
  if (window.renderNotes) window.renderNotes();
  
  // Bağlantı çizgilerini yeniden çiz
  setTimeout(() => {
    if (window.drawConnections) window.drawConnections();
  }, 100);
  
  // Modal'ı kapat
  closeDeleteFolderModal();
  
  // Input'u temizle ve hazır hale getir
  setTimeout(() => {
    const folderNameInput = document.getElementById('folderNameInput');
    if (folderNameInput) {
      folderNameInput.value = '';
      folderNameInput.disabled = false;
      folderNameInput.readOnly = false;
      folderNameInput.style.pointerEvents = 'auto';
      console.log('✅ Klasör input temizlendi ve hazır hale getirildi');
    }
  }, 100);
  
  console.log('✅ Klasör silme işlemi tamamlandı');
}

window.closeHelpModal = closeHelpModal;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.showInputModal = showInputModal;
window.closeInputModal = closeInputModal;
window.confirmInputModal = confirmInputModal;
window.showMoveToFolderDialog = showMoveToFolderDialog;
window.closeDeleteFolderModal = closeDeleteFolderModal;
window.confirmDeleteFolder = confirmDeleteFolder;

