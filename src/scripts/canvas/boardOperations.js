// ===== BOARD OPERATIONS =====
// Board yönetimi: Pozisyon, boyut, fit all

// Elemanların pozisyonlarını güncelle
function updateElementPositions() {
  const DOM = window.DOM;
  const notes = window.notes || [];
  const folders = window.folders || [];
  
  // Notların pozisyonlarını sabit tut
  notes.forEach(note => {
    if (note.x !== undefined && note.y !== undefined) {
      const element = DOM.get(`note-${note.id}`);
      if (element && !DOM.hasClass(element, 'dragging')) {
        element.style.left = note.x + 'px';
        element.style.top = note.y + 'px';
        element.style.transform = 'none'; // Transform'u sıfırla
      }
    }
  });
  
  // Klasörlerin pozisyonlarını sabit tut
  folders.forEach(folder => {
    if (folder.x !== undefined && folder.y !== undefined) {
      const element = DOM.get(`folder-${folder.id}`);
      if (element && !DOM.hasClass(element, 'dragging')) {
        element.style.left = folder.x + 'px';
        element.style.top = folder.y + 'px';
        element.style.transform = 'none'; // Transform'u sıfırla
      }
    }
  });
  
  // Board'un boyutunu dinamik olarak ayarla
  updateBoardSize();
  
  // Kartları yeniden render et (compact mod için)
  if (window.renderNotes) window.renderNotes();
  
  // Bağlantıları yeniden çiz
  if (window.drawConnections) window.drawConnections();
  
  // Minimap'i güncelle
  if (window.renderGraph) window.renderGraph();
}

// Board boyutunu dinamik olarak güncelle
function updateBoardSize() {
  const DOM = window.DOM;
  const notes = window.notes || [];
  const board = DOM.get('board');
  
  if (notes.length === 0) {
    board.style.width = '100%';
    board.style.height = '100%';
    return;
  }
  
  // Notların sınırlarını hesapla
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  notes.forEach(note => {
    if (note.x !== undefined && note.y !== undefined) {
      minX = Math.min(minX, note.x);
      minY = Math.min(minY, note.y);
      
      // Not boyutlarını hesapla
      let noteWidth = 280;
      let noteHeight = window.getNoteHeight ? window.getNoteHeight(note) : 200;
      
      if (note.customWidth) {
        noteWidth = note.customWidth;
      }
      if (note.customHeight) {
        noteHeight = note.customHeight;
      }
      
      maxX = Math.max(maxX, note.x + noteWidth);
      maxY = Math.max(maxY, note.y + noteHeight);
    }
  });
  
  // Eğer hiç not yoksa varsayılan değerler
  if (minX === Infinity) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }
  
  // Board boyutlarını ayarla (padding ile)
  const padding = 100;
  const boardWidth = Math.max(maxX - minX + padding * 2, 800);
  const boardHeight = Math.max(maxY - minY + padding * 2, 600);
  
  board.style.width = boardWidth + 'px';
  board.style.height = boardHeight + 'px';
}

// Tüm notları ekrana sığdır
function fitAllNotes() {
  const notes = window.notes || [];
  const folders = window.folders || [];
  
  if (notes.length === 0 && folders.length === 0 && (!window.todoManager || window.todoManager.todos.length === 0)) {
    // Not, klasör ve todo yoksa center'a git
    const zoomVars = window.getZoomPanVars();
    zoomVars.boardZoom = 1;
    zoomVars.boardPanX = 0;
    zoomVars.boardPanY = 0;
    window.setZoomPanVars(zoomVars);
    if (window.updateBoardTransform) window.updateBoardTransform();
    return;
  }

  // Tüm notların, klasörlerin ve todo'ların sınırlarını bul
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  // Notları kontrol et
  notes.forEach(note => {
    const x = note.x || 0;
    const y = note.y || 0;
    
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + 300); // Not kartı genişliği ~300px
    maxY = Math.max(maxY, y + 200); // Not kartı yüksekliği sabit 200px
  });
  
  // Klasörleri kontrol et
  folders.forEach(folder => {
    const x = folder.x || 0;
    const y = folder.y || 0;
    
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + 300); // Klasör kartı genişliği ~300px
    maxY = Math.max(maxY, y + 200); // Klasör kartı yüksekliği sabit 200px
  });
  
  // Todo'ları kontrol et
  if (window.todoManager && window.todoManager.todos.length > 0) {
    window.todoManager.todos.forEach(todo => {
      // Todo pozisyonlarını al (hem x,y hem de position.x,position.y destekle)
      const x = todo.x !== undefined ? todo.x : (todo.position?.x || 0);
      const y = todo.y !== undefined ? todo.y : (todo.position?.y || 0);
      
      // Todo boyutlarını al (hem width,height hem de size.width,size.height destekle)
      const width = todo.width || todo.size?.width || 320; // Todo kartı genişliği
      const height = todo.height || todo.size?.height || 200; // Todo kartı yüksekliği
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
  }
  
  // Boardwrap boyutlarını al
  const boardwrap = document.querySelector('.boardwrap');
  const containerWidth = boardwrap.clientWidth;
  const containerHeight = boardwrap.clientHeight;
  
  // İçerik boyutlarını hesapla
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  
  // Padding ekle (kenarlardan boşluk)
  const padding = 100;
  
  // Zoom seviyesini hesapla (tüm notlar ve klasörler görünecek şekilde)
  const zoomX = (containerWidth - padding * 2) / contentWidth;
  const zoomY = (containerHeight - padding * 2) / contentHeight;
  
  // En küçük zoom'u kullan ama minimum ve maksimum sınırlar koy
  const boardZoom = Math.max(0.1, Math.min(2, Math.min(zoomX, zoomY)));
  
  // Tüm notların, klasörlerin ve todo'ların merkez noktasını hesapla
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Board'u tüm notları, klasörleri ve todo'ları gösterecek şekilde konumlandır
  const boardPanX = (containerWidth / 2) - (centerX * boardZoom);
  const boardPanY = (containerHeight / 2) - (centerY * boardZoom);
  
  console.log('📐 Fit to screen hesaplaması:', {
    minX, minY, maxX, maxY,
    contentWidth: maxX - minX,
    contentHeight: maxY - minY,
    containerWidth, containerHeight,
    boardZoom, boardPanX, boardPanY,
    todoCount: window.todoManager?.todos.length || 0,
    noteCount: notes.length,
    folderCount: folders.length
  });
  
  // Zoom pan değişkenlerini güncelle
  const zoomVars = window.getZoomPanVars();
  zoomVars.boardZoom = boardZoom;
  zoomVars.boardPanX = boardPanX;
  zoomVars.boardPanY = boardPanY;
  window.setZoomPanVars(zoomVars);
  
  if (window.updateBoardTransform) window.updateBoardTransform();
}

// Global exports
window.updateElementPositions = updateElementPositions;
window.updateBoardSize = updateBoardSize;
window.fitAllNotes = fitAllNotes;

console.log('📐 Board Operations yüklendi');

