// ===== DRAG & DROP SYSTEM =====
// Not ve klasör sürükleme işlemleri

// Global drag state (fallback)
let globalDraggedNoteId = null;

// Klasörleri droppable yap (notları kabul edebilir)
function makeFolderDroppable(folderElement, folderId) {
  
  // Drag over - not üzerine geldiğinde
  folderElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    console.log('🎯 Drag over event:', folderId || 'klasörsüz');
    
    // Görsel geri bildirim - CSS class kullan
    folderElement.classList.add('drag-over');
    folderElement.style.backgroundColor = 'rgba(125, 211, 252, 0.1)';
    folderElement.style.border = '2px dashed rgba(125, 211, 252, 0.5)';
  });
  
  // Drag leave - not üzerinden çıktığında
  folderElement.addEventListener('dragleave', (e) => {
    // Sadece klasörün dışına çıkıldığında temizle
    if (!folderElement.contains(e.relatedTarget)) {
      folderElement.classList.remove('drag-over');
      folderElement.style.backgroundColor = '';
      folderElement.style.border = '';
    }
  });
  
  // Drop - not bırakıldığında
  folderElement.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // State'i tekrar al (drag işlemi sırasında güncellenmiş olabilir)
    const currentState = window.getState();
    
    console.log('🎯 Drop event tetiklendi:', folderId || 'klasörsüz');
    console.log('🎯 Dragged note ID:', currentState.draggedNoteId);
    console.log('🎯 Current state:', currentState);
    
    // Görsel geri bildirimi temizle
    folderElement.classList.remove('drag-over');
    folderElement.style.backgroundColor = '';
    folderElement.style.border = '';
    
    // Hem state hem de global değişkeni kontrol et
    const draggedId = currentState.draggedNoteId || globalDraggedNoteId;
    
    if (draggedId) {
      console.log(`📁 Not ${draggedId} klasöre taşınıyor: ${folderId || 'klasörsüz'}`);
      
      // Görsel geri bildirim
      const noteTitle = window.getNoteById ? window.getNoteById(draggedId)?.title : 'Bilinmeyen';
      if (window.showNotification) {
        window.showNotification(`Not "${noteTitle}" taşınıyor...`, 'info');
      }
      
      // Notu taşı
      if (window.changeNoteFolder) {
        console.log('📁 changeNoteFolder çağrılıyor:', draggedId, folderId);
        window.changeNoteFolder(draggedId, folderId);
      } else {
        console.error('❌ changeNoteFolder fonksiyonu bulunamadı');
      }
      
      // Not yönetim panelini hemen güncelle (asenkron işlem için)
      setTimeout(() => {
        if (window.renderFolderList) window.renderFolderList();
        if (window.renderNotes) window.renderNotes();
      }, 100);
      
      // Drag state'i temizle
      currentState.draggedNoteId = null;
      currentState.draggedElement = null;
      window.setState(currentState);
      globalDraggedNoteId = null;
    } else {
      console.log('❌ Dragged note ID bulunamadı');
      console.log('❌ State draggedNoteId:', currentState.draggedNoteId);
      console.log('❌ Global draggedNoteId:', globalDraggedNoteId);
    }
  });
}

// Sidebar'daki notları draggable yap
function makeNoteDraggable(noteElement, noteId) {
  noteElement.draggable = true;
  const state = window.getState();
  
  noteElement.addEventListener('dragstart', (e) => {
    console.log('🚀 Drag start event tetiklendi:', noteId);
    
    // Hem state hem de global değişkeni güncelle
    state.draggedNoteId = noteId;
    state.draggedElement = noteElement;
    globalDraggedNoteId = noteId;
    window.setState(state);
    
    console.log('🚀 State güncellendi:', state);
    console.log('🚀 Global draggedNoteId güncellendi:', globalDraggedNoteId);
    
    // Drag görselini özelleştir
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', noteId);
    
    // Görsel geri bildirim
    noteElement.classList.add('dragging');
    noteElement.style.opacity = '0.7';
    noteElement.style.transform = 'rotate(2deg)';
    
    console.log('📁 Drag başladı:', noteId);
  });
  
  noteElement.addEventListener('dragend', (e) => {
    // Görsel geri bildirimi temizle
    noteElement.classList.remove('dragging');
    noteElement.style.opacity = '';
    noteElement.style.transform = '';
    
    // Tüm klasörlerin görsel geri bildirimini temizle
    document.querySelectorAll('.folder-item').forEach(folder => {
      folder.classList.remove('drag-over');
      folder.style.backgroundColor = '';
      folder.style.border = '';
    });
    
    console.log('📁 Drag bitti');
    
    // Drag state'i temizle
    const state = window.getState();
    state.draggedNoteId = null;
    state.draggedElement = null;
    globalDraggedNoteId = null;
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

