// ===== FOLDER MANAGER =====
// Klasör CRUD işlemleri

function createFolder() {
  // Diğer modal'ları kapat
  const deleteModalOverlay = document.getElementById('deleteFolderModalOverlay');
  if (deleteModalOverlay && deleteModalOverlay.classList.contains('active')) {
    deleteModalOverlay.classList.remove('active');
  }
  
  openFolderModal();
}

function openFolderModal(parentFolderId = null) {
  const DOM = window.DOM;
  
  const modal = DOM.get('folderModal');
  const nameInput = DOM.get('folderNameInput');
  const colorPicker = DOM.get('colorPicker');
  
  // Modal'ı göster
  DOM.addClass(modal, 'show');
  
  // Eski renk seçiciyi kaldır, yeni RGB renk seçiciyi göster
  colorPicker.innerHTML = `
    <div class="folder-color-selector">
      <div class="current-color-display" id="currentFolderColor" style="background: #3b82f6;"></div>
      <button class="color-select-btn" onclick="openColorPickerForNewFolder()">Renk Seç</button>
    </div>
  `;
  
  // State'i ayarla
  const state = window.getState();
  state.selectedColor = '#3b82f6';
  state.subFolderParentId = parentFolderId || null;
  window.setState(state);
  
  // Modal başlığını güncelle
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) {
    if (parentFolderId) {
      const parentFolder = window.folders.find(f => f.id === parentFolderId);
      if (parentFolder) {
        modalTitle.textContent = `📁 Alt Klasör Oluştur: ${parentFolder.name}`;
      }
    } else {
      modalTitle.textContent = '📁 Yeni Klasör';
    }
  }
  
  // Input'u temizle ve aktif hale getir
  nameInput.value = '';
  nameInput.disabled = false;
  nameInput.readOnly = false;
  nameInput.style.pointerEvents = 'auto';
  
  // Input'a focus
  setTimeout(() => {
    nameInput.focus();
    console.log('✅ Klasör modal açıldı ve input focus verildi');
  }, 100);
  
  // ESC ile kapatma
  document.addEventListener('keydown', handleModalKeydown);
}

// Yeni klasör için renk seçiciyi aç
function openColorPickerForNewFolder() {
  const currentColorDisplay = document.getElementById('currentFolderColor');
  const currentColor = currentColorDisplay ? currentColorDisplay.style.background || '#3b82f6' : '#3b82f6';
  
  // Callback ile renk seçiciyi aç
  if (window.showColorPickerModal) {
    window.showColorPickerModal((selectedColor) => {
    // Seçilen rengi state'e kaydet
    const state = window.getState();
    state.selectedColor = selectedColor;
    window.setState(state);
    
    // Görseli güncelle
    if (currentColorDisplay) {
      currentColorDisplay.style.background = selectedColor;
    }
    }, currentColor);
  }
}

// selectColor fonksiyonu artık gerekli değil, RGB renk seçici kullanılıyor

function handleModalKeydown(e) {
  if (e.key === 'Escape') {
    closeFolderModal();
  } else if (e.key === 'Enter') {
    confirmCreateFolder();
  }
}

function closeFolderModal() {
  const DOM = window.DOM;
  const modal = DOM.get('folderModal');
  const nameInput = DOM.get('folderNameInput');
  
  DOM.removeClass(modal, 'show');
  nameInput.value = '';
  
  // State'i temizle
  if (window.setState) {
    const state = window.getState();
    state.subFolderParentId = null;
    window.setState(state);
  }
  
  // Modal başlığını varsayılana döndür
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = '📁 Yeni Klasör Oluştur';
  }
  
  // Event listener'ı kaldır
  document.removeEventListener('keydown', handleModalKeydown);
}

function confirmCreateFolder() {
  const nameInput = document.getElementById('folderNameInput');
  const name = nameInput.value.trim();
  
  if (!name) {
    // Input'u highlight et
    nameInput.style.borderColor = 'var(--danger)';
    nameInput.focus();
    setTimeout(() => {
      nameInput.style.borderColor = '';
    }, 2000);
    return;
  }
  
  // Aynı isimde klasör kontrolü (tüm klasörler arasında)
  const folders = window.folders || [];
  const state = window.getState();
  const isSubFolder = state.subFolderParentId !== null && state.subFolderParentId !== undefined;
  
  // Aynı isimde klasör var mı kontrol et
  const existingFolder = folders.find(f => f.name === name);
  if (existingFolder) {
    if (window.showNotification) {
      window.showNotification(`"${name}" isimli bir klasör zaten mevcut!`, 'error');
    }
    nameInput.style.borderColor = 'var(--danger)';
    nameInput.focus();
    setTimeout(() => {
      nameInput.style.borderColor = '';
    }, 2000);
    return;
  }
  
  let folder;
  
  try {
    if (isSubFolder) {
      // Alt klasör oluşturma
      const parentFolder = folders.find(f => f.id === state.subFolderParentId);
      if (!parentFolder) {
        if (window.showNotification) {
          window.showNotification('Ana klasör bulunamadı!', 'error');
        }
        return;
      }
      
      folder = {
        id: window.generateUniqueId(name, 'folder'),
        name: name,
        color: state.selectedColor,
        path: parentFolder.path ? `${parentFolder.path}/${name}` : `${parentFolder.name}/${name}`,
        parentId: state.subFolderParentId,
        parentPath: parentFolder.path || parentFolder.name,
        level: (parentFolder.level || 0) + 1,
        createdAt: new Date().toISOString()
      };
    } else {
      // Ana klasör oluşturma
      folder = {
        id: window.generateUniqueId(name, 'folder'), // Benzersiz ID
        name: name,
        color: state.selectedColor,
        parentId: null, // Ana klasör
        level: 0, // Ana klasör seviyesi
        createdAt: new Date().toISOString()
      };
    }
    
    window.folders.push(folder);
    if (window.saveFolders) window.saveFolders();
  } catch (error) {
    // Hata mesajını göster
    if (window.showNotification) window.showNotification(error.message, 'error');
    console.log('❌ Klasör oluşturulamadı:', error.message);
    return;
  }
  
  // Akıllı kaydetme - klasör oluşturma sonrası
  if (window.scheduleSave) window.scheduleSave();
  
  // Dosya sisteminde klasör oluştur
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    
    if (isSubFolder) {
      // Alt klasör için parentPath gönder
      const parentFolder = folders.find(f => f.id === state.subFolderParentId);
      ipcRenderer.send('create-folder', {
        name: folder.name,
        parentPath: parentFolder.path || parentFolder.name
      });
    } else {
      ipcRenderer.send('create-folder', folder);
    }
    
    ipcRenderer.once('folder-created', (event, result) => {
      if (result.success) {
        console.log('📁 Klasör dosya sisteminde oluşturuldu:', folder.name);
      } else {
        console.error('❌ Klasör dosya sisteminde oluşturulamadı:', result.error);
        if (window.showNotification) {
          window.showNotification('Klasör oluşturulamadı: ' + result.error, 'error');
        }
        // Hata durumunda klasörü geri al
        const index = window.folders.findIndex(f => f.id === folder.id);
        if (index !== -1) {
          window.folders.splice(index, 1);
          if (window.saveFolders) window.saveFolders();
        }
        return;
      }
    });
  }
  
  // State'i temizle
  state.subFolderParentId = null;
  window.setState(state);
  
  if (window.renderFolderList) window.renderFolderList();
  if (window.renderNotesImmediate) window.renderNotesImmediate(); // Board üzerindeki klasörleri anında güncelle
  closeFolderModal();
}

function toggleFolder(folderId) {
  const state = window.getState();
  if (state.expandedFolders.includes(folderId)) {
    state.expandedFolders = state.expandedFolders.filter(id => id !== folderId);
  } else {
    state.expandedFolders.push(folderId);
  }
  window.setState(state);
  if (window.renderFolderList) window.renderFolderList();
}

function toggleAllFolders() {
  const state = window.getState();
  // Tüm klasör ID'lerini al (orphan dahil)
  const allFolderIds = ['orphan', ...(window.folders || []).map(f => f.id)];
  
  // Eğer tüm klasörler açıksa, hepsini kapat
  const allExpanded = allFolderIds.every(id => state.expandedFolders.includes(id));
  
  if (allExpanded) {
    state.expandedFolders = []; // Hepsini kapat
  } else {
    state.expandedFolders = [...allFolderIds]; // Hepsini aç
  }
  
  window.setState(state);
  if (window.renderFolderList) window.renderFolderList();
}

function selectFolder(folderId) {
  // Yeni utility fonksiyonunu kullan
  if (window.SelectionManager) {
    window.SelectionManager.selectItem('folder', folderId);
  }
  
  if (window.renderFolderList) window.renderFolderList();
  if (window.renderNotes) window.renderNotes();
  if (window.renderGraph) window.renderGraph();
}

function getFolderNotes(folderId) {
  const notes = window.notes || [];
  const folders = window.folders || [];
  
  // Klasörü bul
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return [];
  
  // Genel eşleştirme fonksiyonu kullan
  if (window.doesNoteMatchFolder) {
    return notes.filter(note => window.doesNoteMatchFolder(note.folderId, folderId, folder));
  }
  
  // Fallback: eski mantık
  return notes.filter(note => note.folderId === folderId);
}

// Klasöre odaklan
function centerOnFolder(folderId) {
  const folders = window.folders || [];
  const folder = folders.find(f => f.id === folderId);
  if (!folder || folder.x === undefined || folder.y === undefined) return;
  
  const boardwrap = document.querySelector('.boardwrap');
  if (!boardwrap) return;
  
  const boardwrapRect = boardwrap.getBoundingClientRect();
  
  // Klasörün boyutları (200x100)
  const folderWidth = 200;
  const folderHeight = 100;
  
  // Klasörün merkez koordinatları (stored x,y + half size)
  const folderCenterX = folder.x + folderWidth / 2;
  const folderCenterY = folder.y + folderHeight / 2;
  
  // Boardwrap'in merkez koordinatları
  const viewportCenterX = boardwrapRect.width / 2;
  const viewportCenterY = boardwrapRect.height / 2;
  
  const boardZoom = window.boardZoom || 1;
  
  // Pan değerlerini hesapla (klasörün merkezini viewport merkezine getir)
  const zoomVars = window.getZoomPanVars();
  zoomVars.boardPanX = viewportCenterX - (folderCenterX * boardZoom);
  zoomVars.boardPanY = viewportCenterY - (folderCenterY * boardZoom);
  window.setZoomPanVars(zoomVars);
  
  if (window.updateBoardTransform) window.updateBoardTransform();
}

// Global exports
window.createFolder = createFolder;
window.openFolderModal = openFolderModal;
window.openColorPickerForNewFolder = openColorPickerForNewFolder;
window.handleModalKeydown = handleModalKeydown;
window.closeFolderModal = closeFolderModal;
window.confirmCreateFolder = confirmCreateFolder;
// Klasör için dinamik genişlik hesaplama fonksiyonu
function calculateFolderWidth(folder, isSubFolder) {
  // Sabit font boyutu kullan
  const fontSize = isSubFolder ? 16 : 20;
  
  // Başlık genişliğini hesapla
  const tempDiv = document.createElement('div');
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.position = 'absolute';
  tempDiv.style.fontSize = fontSize + 'px';
  tempDiv.style.fontWeight = '600';
  tempDiv.style.lineHeight = '1.4';
  tempDiv.style.wordWrap = 'break-word';
  tempDiv.style.overflowWrap = 'break-word';
  tempDiv.style.wordBreak = 'break-word';
  tempDiv.style.whiteSpace = 'normal';
  tempDiv.style.width = isSubFolder ? '200px' : '300px'; // Maksimum genişlik sınırı
  tempDiv.textContent = folder.name;
  
  document.body.appendChild(tempDiv);
  const textWidth = tempDiv.scrollWidth;
  const textHeight = tempDiv.offsetHeight;
  document.body.removeChild(tempDiv);
  
  // Eğer metin çok satıra yayıldıysa, genişliği artır
  const expectedHeight = fontSize * 1.4;
  const isMultiLine = textHeight > expectedHeight * 1.5;
  
  // Başlık genişliği + padding + not sayısı için alan
  const padding = 32; // 16px her iki tarafta
  const noteCountWidth = 40; // Not sayısı için alan
  const requiredWidth = textWidth + padding + noteCountWidth;
  
  // Alt klasör için minimum genişlik
  const minWidth = isSubFolder ? 160 : 200;
  const maxWidth = isSubFolder ? 300 : 400;
  
  return Math.min(Math.max(minWidth, requiredWidth), maxWidth);
}

window.createFolder = createFolder;
window.toggleFolder = toggleFolder;
window.toggleAllFolders = toggleAllFolders;
window.selectFolder = selectFolder;
window.getFolderNotes = getFolderNotes;
window.centerOnFolder = centerOnFolder;
window.calculateFolderWidth = calculateFolderWidth;

console.log('📁 Folder Manager yüklendi');

