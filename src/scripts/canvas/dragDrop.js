// ===== DRAG & DROP SYSTEM =====
// Not ve klasör sürükleme işlemleri

// Klasörleri droppable yap (notları kabul edebilir)
function makeFolderDroppable(folderElement, folderId) {
  const state = window.getState();
  
  // Drag over - not üzerine geldiğinde
  folderElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Görsel geri bildirim
    folderElement.style.backgroundColor = 'rgba(125, 211, 252, 0.1)';
    folderElement.style.border = '2px dashed rgba(125, 211, 252, 0.5)';
  });
  
  // Drag leave - not üzerinden çıktığında
  folderElement.addEventListener('dragleave', (e) => {
    // Sadece klasörün dışına çıkıldığında temizle
    if (!folderElement.contains(e.relatedTarget)) {
      folderElement.style.backgroundColor = '';
      folderElement.style.border = '';
    }
  });
  
  // Drop - not bırakıldığında
  folderElement.addEventListener('drop', (e) => {
    e.preventDefault();
    
    // Görsel geri bildirimi temizle
    folderElement.style.backgroundColor = '';
    folderElement.style.border = '';
    
    if (state.draggedNoteId) {
      console.log(`📁 Not ${state.draggedNoteId} klasöre taşınıyor: ${folderId || 'klasörsüz'}`);
      
      // Görsel geri bildirim
      const noteTitle = window.getNoteById ? window.getNoteById(state.draggedNoteId)?.title : 'Bilinmeyen';
      if (window.showNotification) {
        window.showNotification(`Not "${noteTitle}" taşınıyor...`, 'info');
      }
      
      // Notu taşı
      if (window.changeNoteFolder) {
        window.changeNoteFolder(state.draggedNoteId, folderId);
      }
      
      // Not yönetim panelini hemen güncelle (asenkron işlem için)
      setTimeout(() => {
        if (window.renderFolderList) window.renderFolderList();
        if (window.renderNotes) window.renderNotes();
      }, 100);
      
      // Drag state'i temizle
      state.draggedNoteId = null;
      state.draggedElement = null;
      window.setState(state);
    }
  });
}

// Sidebar'daki notları draggable yap
function makeNoteDraggable(noteElement, noteId) {
  noteElement.draggable = true;
  const state = window.getState();
  
  noteElement.addEventListener('dragstart', (e) => {
    state.draggedNoteId = noteId;
    state.draggedElement = noteElement;
    window.setState(state);
    
    // Drag görselini özelleştir
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', noteId);
    
    // Görsel geri bildirim
    noteElement.style.opacity = '0.7';
    noteElement.style.transform = 'rotate(2deg)';
    
    console.log('📁 Drag başladı:', noteId);
  });
  
  noteElement.addEventListener('dragend', (e) => {
    // Görsel geri bildirimi temizle
    noteElement.style.opacity = '';
    noteElement.style.transform = '';
    
    // Tüm klasörlerin görsel geri bildirimini temizle
    document.querySelectorAll('.folder-item').forEach(folder => {
      folder.style.backgroundColor = '';
      folder.style.border = '';
    });
    
    console.log('📁 Drag bitti');
    
    // Drag state'i temizle
    const state = window.getState();
    state.draggedNoteId = null;
    state.draggedElement = null;
    window.setState(state);
  });
  
  // Context menu ekle
  noteElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (window.showNoteContextMenu) {
      window.showNoteContextMenu(e, noteId);
    }
  });
}

// Global exports
window.makeFolderDroppable = makeFolderDroppable;
window.makeNoteDraggable = makeNoteDraggable;

console.log('🖱️ Drag & Drop System yüklendi');

