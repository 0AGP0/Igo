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

// Board boyutunu dinamik olarak güncelle - GERÇEKTEN SONSUZ BOARD
function updateBoardSize() {
  const DOM = window.DOM;
  const board = DOM.get('board');
  const boardwrap = document.querySelector('.boardwrap');
  
  if (!board || !boardwrap) return;
  
  // GERÇEKTEN SONSUZ BOARD - Çok büyük sabit boyut
  const INFINITE_SIZE = 1000000; // 1 milyon piksel - gerçekten sonsuz
  
  board.style.width = INFINITE_SIZE + 'px';
  board.style.height = INFINITE_SIZE + 'px';
  
  // Boardbg'yi de board'un boyutuna göre güncelle
  const boardbg = document.querySelector('.boardbg');
  if (boardbg) {
    boardbg.style.width = INFINITE_SIZE + 'px';
    boardbg.style.height = INFINITE_SIZE + 'px';
  }
  
  console.log('📐 Board GERÇEKTEN SONSUZ boyuta ayarlandı:', INFINITE_SIZE + 'x' + INFINITE_SIZE);
}

// Board'u merkeze al - kartlar yoksa veya ilk yüklemede
function centerBoardOnStart() {
  const boardwrap = document.querySelector('.boardwrap');
  if (!boardwrap) return;
  
  const INFINITE_SIZE = 1000000; // Board boyutu
  const boardwrapWidth = boardwrap.clientWidth || window.innerWidth;
  const boardwrapHeight = boardwrap.clientHeight || window.innerHeight;
  
  // Board'un merkezini ekranın merkezine al
  // Board'un merkezi (INFINITE_SIZE/2, INFINITE_SIZE/2) ekranın merkezine gelsin
  const zoomVars = window.getZoomPanVars();
  const boardZoom = zoomVars.boardZoom || 1;
  
  // Board'un merkezini ekranın merkezine hizala
  const boardPanX = (boardwrapWidth / 2) - (INFINITE_SIZE / 2 * boardZoom);
  const boardPanY = (boardwrapHeight / 2) - (INFINITE_SIZE / 2 * boardZoom);
  
  zoomVars.boardPanX = boardPanX;
  zoomVars.boardPanY = boardPanY;
  window.setZoomPanVars(zoomVars);
  
  if (window.updateBoardTransform) window.updateBoardTransform();
  
  console.log('📐 Board merkeze alındı:', { boardPanX, boardPanY, boardZoom });
}

// Tüm notları ekrana sığdır
function fitAllNotes() {
  const notes = window.notes || [];
  const folders = window.folders || [];
  
  if (notes.length === 0 && folders.length === 0 && (!window.todoManager || window.todoManager.todos.length === 0)) {
    // Not, klasör ve todo yoksa merkeze git
    centerBoardOnStart();
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
  
  // Multi-selection CSS sınıflarını yeniden uygula (zoom/pan sonrası)
  // updateBoardTransform içinde zaten çağrılıyor ama emin olmak için burada da çağırıyoruz
}

// Tüm kartları ortaya al (göreceli pozisyonları koruyarak - KARTLARIN POZİSYONLARINI DEĞİŞTİR)
function centerAllCards() {
  const notes = window.notes || [];
  const folders = window.folders || [];
  
  if (notes.length === 0 && folders.length === 0 && (!window.todoManager || window.todoManager.todos.length === 0)) {
    // Kart yoksa merkeze git
    centerBoardOnStart();
    return;
  }

  // Bağlantısı olmayan kartları bul (orphan notlar)
  let orphanNotes = [];
  if (window.analyzeConnections) {
    const { orphanNotes: analyzedOrphans } = window.analyzeConnections();
    orphanNotes = analyzedOrphans || [];
  } else {
    // Fallback: links dizisi boş olan notları bul
    orphanNotes = notes.filter(note => {
      if (!note.links || note.links.length === 0) {
        // Gelen bağlantıları da kontrol et
        const hasIncomingLinks = notes.some(otherNote => 
          otherNote.links && otherNote.links.includes(note.title)
        );
        return !hasIncomingLinks;
      }
      return false;
    });
  }

  // Bağlantısı olmayan kartları direkt düzlemin merkezine yerleştir
  const INFINITE_SIZE = 1000000;
  const boardCenterX = INFINITE_SIZE / 2;
  const boardCenterY = INFINITE_SIZE / 2;
  
  if (orphanNotes.length > 0) {
    console.log('📍 Bağlantısı olmayan kartlar merkeze yerleştiriliyor:', orphanNotes.length, 'kart');
    
    // Bağlantısı olmayan kartları grid düzeninde merkeze yerleştir
    orphanNotes.forEach((note, index) => {
      const noteWidth = note.customWidth || 280;
      const noteHeight = note.customHeight || (window.getNoteHeight ? window.getNoteHeight(note) : 200);
      const gridSpacing = 320;
      const colsPerRow = 3;
      
      const col = index % colsPerRow;
      const row = Math.floor(index / colsPerRow);
      
      note.x = boardCenterX - (colsPerRow * gridSpacing / 2) + (col * gridSpacing) - (noteWidth / 2);
      note.y = boardCenterY - (noteHeight / 2) + (row * gridSpacing);
    });
  }

  // Bağlantısı olan kartlar için mevcut mantığı kullan
  const connectedNotes = notes.filter(note => !orphanNotes.includes(note));
  const hasConnectedCards = connectedNotes.length > 0 || folders.length > 0 || 
    (window.todoManager && window.todoManager.todos.length > 0);

  if (!hasConnectedCards) {
    // Sadece bağlantısız kartlar varsa, pozisyonları kaydet ve render et
    if (window.saveNotePositions) window.saveNotePositions();
    if (window.renderNotes) window.renderNotes();
    if (window.drawConnections) window.drawConnections();
    if (window.fitAllNotes) window.fitAllNotes();
    return;
  }

  // Tüm kartların sınırlarını bul (bağlantısız kartlar hariç)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasCards = false;
  
  // Bağlantısı olan notları kontrol et
  connectedNotes.forEach(note => {
    if (note.x !== undefined && note.y !== undefined) {
      const x = note.x;
      const y = note.y;
      const noteWidth = note.customWidth || 280;
      const noteHeight = note.customHeight || (window.getNoteHeight ? window.getNoteHeight(note) : 200);
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + noteWidth);
      maxY = Math.max(maxY, y + noteHeight);
      hasCards = true;
    }
  });
  
  // Klasörleri kontrol et
  folders.forEach(folder => {
    if (folder.x !== undefined && folder.y !== undefined) {
      const x = folder.x;
      const y = folder.y;
      const folderWidth = 300;
      const folderHeight = 120;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + folderWidth);
      maxY = Math.max(maxY, y + folderHeight);
      hasCards = true;
    }
  });
  
  // Todo'ları kontrol et
  if (window.todoManager && window.todoManager.todos.length > 0) {
    window.todoManager.todos.forEach(todo => {
      const x = todo.x !== undefined ? todo.x : (todo.position?.x || 0);
      const y = todo.y !== undefined ? todo.y : (todo.position?.y || 0);
      
      if (x !== 0 || y !== 0) {
        const width = todo.width || todo.size?.width || 320;
        const height = todo.height || todo.size?.height || 200;
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
        hasCards = true;
      }
    });
  }
  
  if (hasCards) {
    // Tüm kartların mevcut merkez noktasını hesapla
    const currentCenterX = (minX + maxX) / 2;
    const currentCenterY = (minY + maxY) / 2;
    
    // Düzlemin merkezini belirle
    const targetCenterX = INFINITE_SIZE / 2;
    const targetCenterY = INFINITE_SIZE / 2;
    
    // Offset hesapla (kartların merkezini düzlemin merkezine taşımak için)
    const offsetX = targetCenterX - currentCenterX;
    const offsetY = targetCenterY - currentCenterY;
    
    console.log('📐 Bağlantılı kartlar ortaya taşınıyor:', {
      currentCenter: { x: currentCenterX, y: currentCenterY },
      targetCenter: { x: targetCenterX, y: targetCenterY },
      offset: { x: offsetX, y: offsetY },
      connectedNoteCount: connectedNotes.length,
      orphanNoteCount: orphanNotes.length,
      folderCount: folders.length
    });
    
    // Bağlantılı notların pozisyonlarını güncelle
    connectedNotes.forEach(note => {
      if (note.x !== undefined && note.y !== undefined) {
        note.x = note.x + offsetX;
        note.y = note.y + offsetY;
      }
    });
    
    // Tüm klasörlerin pozisyonlarını güncelle
    folders.forEach(folder => {
      if (folder.x !== undefined && folder.y !== undefined) {
        folder.x = folder.x + offsetX;
        folder.y = folder.y + offsetY;
      }
    });
    
    // Tüm todo'ların pozisyonlarını güncelle
    if (window.todoManager && window.todoManager.todos.length > 0) {
      window.todoManager.todos.forEach(todo => {
        if (todo.x !== undefined) {
          todo.x = todo.x + offsetX;
        } else if (todo.position?.x !== undefined) {
          todo.position.x = todo.position.x + offsetX;
        }
        
        if (todo.y !== undefined) {
          todo.y = todo.y + offsetY;
        } else if (todo.position?.y !== undefined) {
          todo.position.y = todo.position.y + offsetY;
        }
      });
    }
  }
  
  // Pozisyonları kaydet
  if (window.saveNotePositions) window.saveNotePositions();
  if (window.saveFolders) window.saveFolders();
  if (window.todoManager && window.todoManager.saveTodos) window.todoManager.saveTodos();
  
  // Kartları yeniden render et
  if (window.renderNotes) window.renderNotes();
  if (window.renderFolders) window.renderFolders();
  if (window.updateElementPositions) window.updateElementPositions();
  
  // Bağlantıları yeniden çiz
  setTimeout(() => {
    if (window.drawConnections) window.drawConnections();
  }, 100);
  
  // Board'u yeni pozisyonlara göre ayarla (fitAllNotes gibi)
  if (window.fitAllNotes) {
    setTimeout(() => {
      window.fitAllNotes();
    }, 200);
  }
}

// Global exports
window.updateElementPositions = updateElementPositions;
window.updateBoardSize = updateBoardSize;
window.fitAllNotes = fitAllNotes;
window.centerBoardOnStart = centerBoardOnStart;
window.centerAllCards = centerAllCards;

console.log('📐 Board Operations yüklendi');


