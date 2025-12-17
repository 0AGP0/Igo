// ===== MULTI-SELECTION SİSTEMİ =====
// Çoklu kart seçimi ve taşıma sistemi

// State değişkenleri
let selectedNotes = [];
let selectedFolders = [];
let isSelecting = false;
let selectionStartX = 0;
let selectionStartY = 0;
let selectionBox = null;

// Selection box oluştur
function startSelection(e) {
  // Mevcut seçimleri temizle
  clearSelection();
  
  const boardwrap = document.querySelector('.boardwrap');
  const boardwrapRect = boardwrap.getBoundingClientRect();
  
  // Pan ve zoom'u hesaba katarak koordinat hesapla - SONSUZ BOARD
  const rawX = e.clientX - boardwrapRect.left;
  const rawY = e.clientY - boardwrapRect.top;
  
  // Zoom ve pan'i tersine çevir
  const zoomVars = window.getZoomPanVars();
  const boardZoom = zoomVars.boardZoom || 1;
  const boardPanX = zoomVars.boardPanX || 0;
  const boardPanY = zoomVars.boardPanY || 0;
  
  selectionStartX = (rawX - boardPanX) / boardZoom;
  selectionStartY = (rawY - boardPanY) / boardZoom;
  isSelecting = true;
  
  // Selection box oluştur
  const board = document.getElementById('board');
  selectionBox = document.createElement('div');
  selectionBox.className = 'selection-box';
  selectionBox.style.left = selectionStartX + 'px';
  selectionBox.style.top = selectionStartY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  board.appendChild(selectionBox);
  
  e.preventDefault();
}

// Selection box güncelle
function updateSelection(e) {
  if (!isSelecting || !selectionBox) return;
  
  const boardwrap = document.querySelector('.boardwrap');
  if (!boardwrap) return;
  
  const boardwrapRect = boardwrap.getBoundingClientRect();
  
  // Pan ve zoom'u hesaba katarak current koordinat hesapla - SONSUZ BOARD
  const rawX = e.clientX - boardwrapRect.left;
  const rawY = e.clientY - boardwrapRect.top;
  
  // Zoom ve pan'i tersine çevir
  const zoomVars = window.getZoomPanVars();
  const boardZoom = zoomVars.boardZoom || 1;
  const boardPanX = zoomVars.boardPanX || 0;
  const boardPanY = zoomVars.boardPanY || 0;
  
  const currentX = (rawX - boardPanX) / boardZoom;
  const currentY = (rawY - boardPanY) / boardZoom;
  
  // Selection box pozisyonunu hesapla - SONSUZ BOARD (sınır yok)
  const left = Math.min(selectionStartX, currentX);
  const top = Math.min(selectionStartY, currentY);
  const width = Math.abs(currentX - selectionStartX);
  const height = Math.abs(currentY - selectionStartY);
  
  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
  
  // Tüm kartları kontrol et (board'un her yerinde)
  checkAllCardsInSelection(left, top, width, height);
}

// Selection box bitir
function endSelection() {
  if (!isSelecting) return;
  
  isSelecting = false;
  
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

// Seçim kutusu içindeki kartları kontrol et
function checkAllCardsInSelection(selLeft, selTop, selWidth, selHeight) {
  const noteElements = document.querySelectorAll('.note');
  const folderElements = document.querySelectorAll('.folder-card');
  
  const newSelectedNotes = [];
  const newSelectedFolders = [];
  
  // Not kartlarını kontrol et
  noteElements.forEach(noteElement => {
    const noteLeft = parseFloat(noteElement.style.left) || 0;
    const noteTop = parseFloat(noteElement.style.top) || 0;
    const noteWidth = parseFloat(noteElement.style.width) || 280;
    const noteHeight = parseFloat(noteElement.style.height) || 160;
    
    if (noteLeft < selLeft + selWidth &&
        noteLeft + noteWidth > selLeft &&
        noteTop < selTop + selHeight &&
        noteTop + noteHeight > selTop) {
      
      const noteId = noteElement.id.replace('note-', '');
      newSelectedNotes.push(noteId);
      noteElement.classList.add('multi-selected');
    } else {
      noteElement.classList.remove('multi-selected');
    }
  });
  
  // Klasör kartlarını kontrol et
  folderElements.forEach(folderElement => {
    const folderLeft = parseFloat(folderElement.style.left) || 0;
    const folderTop = parseFloat(folderElement.style.top) || 0;
    const folderWidth = parseFloat(folderElement.style.width) || 200;
    const folderHeight = parseFloat(folderElement.style.height) || 120;
    
    if (folderLeft < selLeft + selWidth &&
        folderLeft + folderWidth > selLeft &&
        folderTop < selTop + selHeight &&
        folderTop + folderHeight > selTop) {
      
      const folderId = folderElement.id.replace('folder-', '');
      newSelectedFolders.push(folderId);
      folderElement.classList.add('multi-selected');
    } else {
      folderElement.classList.remove('multi-selected');
    }
  });
  
  selectedNotes = newSelectedNotes;
  selectedFolders = newSelectedFolders;
  
  // window.selectedNotes ve window.selectedFolders'ı güncelle (state senkronizasyonu)
  window.selectedNotes = selectedNotes;
  window.selectedFolders = selectedFolders;
}

// Seçimi temizle
function clearSelection() {
  selectedNotes = [];
  selectedFolders = [];
  
  // window.selectedNotes ve window.selectedFolders'ı güncelle (state senkronizasyonu)
  window.selectedNotes = selectedNotes;
  window.selectedFolders = selectedFolders;
  
  // Tüm multi-selected sınıflarını kaldır
  const noteElements = document.querySelectorAll('.note.multi-selected');
  const folderElements = document.querySelectorAll('.folder-card.multi-selected');
  
  noteElements.forEach(element => {
    element.classList.remove('multi-selected');
  });
  
  folderElements.forEach(element => {
    element.classList.remove('multi-selected');
  });
  
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
  isSelecting = false;
}

// Tüm seçili kartları birlikte hareket ettiren fonksiyon (optimize edilmiş)
function moveSelectedCards(deltaX, deltaY) {
  const boardZoom = window.boardZoom || 1;
  let hasMoved = false;
  
  // Seçili notları hareket ettir
  selectedNotes.forEach(noteId => {
    const note = window.notes.find(n => n.id === noteId);
    const element = document.getElementById(`note-${noteId}`);
    if (note && element && element.dataset.initialNoteX !== undefined) {
      const initialX = parseFloat(element.dataset.initialNoteX || 0);
      const initialY = parseFloat(element.dataset.initialNoteY || 0);
      
      const newX = initialX + deltaX / boardZoom;
      const newY = initialY + deltaY / boardZoom;
      
      // Sadece pozisyon değiştiyse güncelle
      if (note.x !== newX || note.y !== newY) {
        note.x = newX;
        note.y = newY;
        
        // DOM'u güncelle - transition'ı devre dışı bırak (performans için)
        element.style.transition = 'none';
        element.style.left = note.x + 'px';
        element.style.top = note.y + 'px';
        element.style.transform = 'none';
        
        hasMoved = true;
      }
    }
  });
  
  // Seçili klasörleri hareket ettir
  selectedFolders.forEach(folderId => {
    const folder = window.folders.find(f => f.id === folderId);
    const element = document.getElementById(`folder-${folderId}`);
    if (folder && element && element.dataset.initialFolderX !== undefined) {
      const initialX = parseFloat(element.dataset.initialFolderX || 0);
      const initialY = parseFloat(element.dataset.initialFolderY || 0);
      
      const newX = initialX + deltaX / boardZoom;
      const newY = initialY + deltaY / boardZoom;
      
      // Sadece pozisyon değiştiyse güncelle
      if (folder.x !== newX || folder.y !== newY) {
        folder.x = newX;
        folder.y = newY;
        
        // DOM'u güncelle - transition'ı devre dışı bırak (performans için)
        element.style.transition = 'none';
        element.style.left = folder.x + 'px';
        element.style.top = folder.y + 'px';
        element.style.transform = 'none';
        
        hasMoved = true;
      }
    }
  });
  
  // Sadece hareket varsa ve sadece bir kez kaydet/çiz
  if (hasMoved) {
    // Throttle ile kaydetme - her frame'de değil
    if (!window._multiDragSaveTimer) {
      window._multiDragSaveTimer = setTimeout(() => {
        if (window.scheduleSave) window.scheduleSave();
        window._multiDragSaveTimer = null;
      }, 500);
    }
    
    // Bağlantıları güncelle - throttle ile
    if (!window._multiDragConnectionsTimer) {
      window._multiDragConnectionsTimer = requestAnimationFrame(() => {
        if (window.drawConnections) window.drawConnections();
        window._multiDragConnectionsTimer = null;
      });
    }
  }
}

// Multi-selection CSS sınıflarını yeniden uygula (zoom veya başka işlemlerden sonra)
function refreshMultiSelectionStyles() {
  // ÖNCE local değişkenleri kullan (en güncel state)
  // Eğer local değişkenler boşsa window'dan al (fallback)
  const currentSelectedNotes = (selectedNotes && selectedNotes.length > 0) ? selectedNotes : (window.selectedNotes || []);
  const currentSelectedFolders = (selectedFolders && selectedFolders.length > 0) ? selectedFolders : (window.selectedFolders || []);
  
  // Eğer seçim yoksa hiçbir şey yapma
  if (currentSelectedNotes.length === 0 && currentSelectedFolders.length === 0) {
    return;
  }
  
  // Önce tüm multi-selected sınıflarını kaldır
  document.querySelectorAll('.note.multi-selected, .folder-card.multi-selected').forEach(element => {
    element.classList.remove('multi-selected');
  });
  
  // Seçili notlara multi-selected sınıfını ekle
  currentSelectedNotes.forEach(noteId => {
    const noteElement = document.getElementById(`note-${noteId}`);
    if (noteElement) {
      noteElement.classList.add('multi-selected');
    }
  });
  
  // Seçili klasörlere multi-selected sınıfını ekle
  currentSelectedFolders.forEach(folderId => {
    const folderElement = document.getElementById(`folder-${folderId}`);
    if (folderElement) {
      folderElement.classList.add('multi-selected');
    }
  });
  
  // State senkronizasyonu: window.selectedNotes ve window.selectedFolders'ı güncelle
  window.selectedNotes = currentSelectedNotes;
  window.selectedFolders = currentSelectedFolders;
  
  // Local değişkenleri de güncelle
  selectedNotes = currentSelectedNotes;
  selectedFolders = currentSelectedFolders;
}

// Global exports
window.startSelection = startSelection;
window.updateSelection = updateSelection;
window.endSelection = endSelection;
window.clearSelection = clearSelection;
window.moveSelectedCards = moveSelectedCards;
window.refreshMultiSelectionStyles = refreshMultiSelectionStyles;
window.selectedNotes = selectedNotes;
window.selectedFolders = selectedFolders;

console.log('✅ Multi-selection sistemi yüklendi');

