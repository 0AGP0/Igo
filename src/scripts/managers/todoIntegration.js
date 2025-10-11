// ===== TODO SİSTEMİ ENTEGRASYONU =====

// Not silindiğinde todo bağlantılarını temizle
function cleanupTodoConnectionsOnNoteDelete(noteTitle) {
  if (window.todoManager) {
    window.todoManager.todos.forEach(todo => {
      if (todo.connections.includes(noteTitle)) {
        window.todoManager.disconnectTodoFromNote(todo.id, noteTitle);
        console.log(`🔗 Todo ${todo.id} ile not "${noteTitle}" bağlantısı kaldırıldı`);
      }
    });
  }
}

// Todo'ya odaklan
function centerOnTodo(todoId) {
  // Todo objesini bul
  const todo = window.todoManager?.todos.find(t => t.id === todoId);
  if (!todo || !todo.position || todo.position.x === undefined || todo.position.y === undefined) {
    console.warn('Todo bulunamadı veya pozisyonu yok:', todoId);
    return;
  }
  
  const boardwrap = document.querySelector('.boardwrap');
  if (!boardwrap) return;
  
  const boardwrapRect = boardwrap.getBoundingClientRect();
  
  // Todo'nun gerçek boyutlarını hesapla
  const todoWidth = todo.size?.width || 350;
  const todoHeight = todo.size?.height || 200;
  
  // Todo'nun merkez koordinatları
  const todoCenterX = todo.position.x + todoWidth / 2;
  const todoCenterY = todo.position.y + todoHeight / 2;
  
  // Boardwrap'in merkez koordinatları
  const viewportCenterX = boardwrapRect.width / 2;
  const viewportCenterY = boardwrapRect.height / 2;
  
  // Pan değerlerini hesapla (todo'nun merkezini viewport merkezine getir)
  const zoomVars = window.getZoomPanVars();
  zoomVars.boardPanX = viewportCenterX - (todoCenterX * zoomVars.boardZoom);
  zoomVars.boardPanY = viewportCenterY - (todoCenterY * zoomVars.boardZoom);
  window.setZoomPanVars(zoomVars);
  
  if (window.updateBoardTransform) window.updateBoardTransform();
  console.log('✅ Todo ortalandı:', todoId, { todoCenterX, todoCenterY, boardPanX: zoomVars.boardPanX, boardPanY: zoomVars.boardPanY });
}

// Global exports
window.cleanupTodoConnectionsOnNoteDelete = cleanupTodoConnectionsOnNoteDelete;
window.centerOnTodo = centerOnTodo;

console.log('🔗 Todo entegrasyonu yüklendi');

