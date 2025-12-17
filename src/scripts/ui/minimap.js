// ===== MINIMAP / GRAPH RENDER =====
// Sağ üst köşedeki minimap (küçük harita) render sistemi

function renderGraph() {
  // Widget drag ediyorsa render etme
  if (window.widgetIsDragging) {
    return;
  }
  
  const minimap = document.getElementById('minimap');
  if (!minimap) return;
  
  const viewport = minimap.querySelector('.minimap-viewport');
  if (!viewport) return;
  
  const notes = window.notes || [];
  const folders = window.folders || [];
  const state = window.getState();
  
  // Önce temizle
  viewport.innerHTML = '';
  
  // İçerik yoksa kontrol et
  if (notes.length === 0 && folders.length === 0) {
    viewport.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">Henüz içerik yok</div>';
    return;
  }

  // Board boyutlarını hesapla
  const board = document.getElementById('board');
  const boardRect = board.getBoundingClientRect();
  
  // Notların ve klasörlerin gerçek pozisyonlarını kullanarak board sınırlarını bul
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  notes.forEach(note => {
    if (note.x !== undefined && note.y !== undefined) {
      minX = Math.min(minX, note.x);
      minY = Math.min(minY, note.y);
      
      // Not boyutlarını hesapla
      let noteWidth = 280;
      let noteHeight = 120;
      
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
  
  // Klasörleri de dahil et
  folders.forEach(folder => {
    if (folder.x !== undefined && folder.y !== undefined) {
      minX = Math.min(minX, folder.x);
      minY = Math.min(minY, folder.y);
      maxX = Math.max(maxX, folder.x + 200); // klasör genişliği
      maxY = Math.max(maxY, folder.y + 100); // klasör yüksekliği
    }
  });
  
  // Todo kartlarını da dahil et
  if (window.todoManager && window.todoManager.todos.length > 0) {
    window.todoManager.todos.forEach(todo => {
      const x = todo.x !== undefined ? todo.x : (todo.position?.x || 0);
      const y = todo.y !== undefined ? todo.y : (todo.position?.y || 0);
      const width = todo.width || todo.size?.width || 320;
      const height = todo.height || todo.size?.height || 200;
      
      if (x !== undefined && y !== undefined) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      }
    });
  }
  
  // Eğer hiç not yoksa varsayılan değerler
  if (minX === Infinity) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }
  
  // Board boyutları
  const boardWidth = maxX - minX;
  const boardHeight = maxY - minY;
  
  // Minimap boyutları (dinamik olarak ayarla - CSS'den al)
  const minimapRect = minimap.getBoundingClientRect();
  const minimapWidth = minimapRect.width || minimap.offsetWidth || 300;
  const minimapHeight = minimapRect.height || minimap.offsetHeight || 400;
  
  // Ölçekleme faktörü (padding ile)
  const padding = 20;
  const scaleX = (minimapWidth - padding * 2) / boardWidth;
  const scaleY = (minimapHeight - padding * 2) / boardHeight;
  const scale = Math.min(scaleX, scaleY, 1); // 1'den büyük olmasın
  
  // Viewport boyutlarını CSS'den al - manuel ayarlama yapma
  // viewport.style ayarları kaldırıldı - CSS'de tanımlı
  
  // Zoom göstergesi ekle
  const zoomVars = window.getZoomPanVars();
  const zoomIndicator = document.createElement('div');
  zoomIndicator.className = 'minimap-zoom-indicator';
  zoomIndicator.style.position = 'absolute';
  zoomIndicator.style.top = '5px';
  zoomIndicator.style.right = '5px';
  zoomIndicator.style.background = 'var(--accent)';
  zoomIndicator.style.color = 'white';
  zoomIndicator.style.padding = '2px 6px';
  zoomIndicator.style.borderRadius = '4px';
  zoomIndicator.style.fontSize = '10px';
  zoomIndicator.style.fontWeight = 'bold';
  zoomIndicator.style.zIndex = '10';
  zoomIndicator.textContent = `${Math.round(zoomVars.boardZoom * 100)}%`;
  viewport.appendChild(zoomIndicator);
  
  // Hub ve orphan notları analiz et
  const { hubNotes, orphanNotes } = window.analyzeConnections ? window.analyzeConnections() : { hubNotes: [], orphanNotes: [] };
  
  // Klasörleri render et
  folders.forEach(folder => {
    if (folder.x === undefined || folder.y === undefined) return;
    
    const folderElement = document.createElement('div');
    folderElement.className = 'minimap-folder';
    folderElement.style.position = 'absolute';
    folderElement.style.left = padding + (folder.x - minX) * scale + 'px';
    folderElement.style.top = padding + (folder.y - minY) * scale + 'px';
    
    // Alt klasörleri farklı boyutta göster
    if (folder.parentId) {
      // Alt klasör - daha küçük ve farklı şekil
      folderElement.style.width = (120 * scale) + 'px';
      folderElement.style.height = (60 * scale) + 'px';
      folderElement.style.borderRadius = '20px'; // Daha yuvarlak
      folderElement.style.border = '2px dashed ' + folder.color;
      folderElement.style.background = folder.color + '20'; // Şeffaf arka plan
      folderElement.style.opacity = '0.8';
    } else {
      // Ana klasör - normal boyut
      folderElement.style.width = (200 * scale) + 'px';
      folderElement.style.height = (100 * scale) + 'px';
      folderElement.style.borderRadius = '6px';
      folderElement.style.border = '1px solid ' + folder.color;
      folderElement.style.background = folder.color;
      folderElement.style.opacity = '0.7';
    }
    
    folderElement.style.cursor = 'pointer';
    
    // Klasör tıklama
    folderElement.onclick = () => {
      if (window.selectFolder) window.selectFolder(folder.id);
      if (window.centerOnFolder) window.centerOnFolder(folder.id);
    };
    
    viewport.appendChild(folderElement);
  });
  
  // Todo kartlarını render et
  if (window.todoManager && window.todoManager.todos.length > 0) {
    window.todoManager.todos.forEach(todo => {
      const x = todo.x !== undefined ? todo.x : (todo.position?.x || 0);
      const y = todo.y !== undefined ? todo.y : (todo.position?.y || 0);
      
      if (x === undefined || y === undefined) return;
      
      const todoElement = document.createElement('div');
      todoElement.className = 'minimap-todo';
      todoElement.style.position = 'absolute';
      todoElement.style.left = padding + (x - minX) * scale + 'px';
      todoElement.style.top = padding + (y - minY) * scale + 'px';
      
      // Notlara yakın boyut - küçük ve farklı şekil
      const todoSize = Math.max(10, 14 * scale); // Minimum 10px, maksimum 14px
      todoElement.style.width = todoSize + 'px';
      todoElement.style.height = todoSize + 'px';
      
      // Farklı şekil - köşeli (notlardan farklı)
      todoElement.style.borderRadius = '3px'; // Küçük köşeler
      todoElement.style.transform = 'rotate(45deg)'; // 45 derece döndürülmüş kare
      todoElement.style.background = todo.completed ? '#4CAF50' : '#FF9800';
      todoElement.style.border = '2px solid ' + (todo.completed ? '#2E7D32' : '#F57C00');
      todoElement.style.opacity = '0.8';
      todoElement.style.cursor = 'pointer';
      
      // Todo durumuna göre ek efekt
      if (todo.completed) {
        todoElement.style.boxShadow = '0 0 4px rgba(76, 175, 80, 0.6)';
      } else {
        todoElement.style.boxShadow = '0 0 4px rgba(255, 152, 0, 0.6)';
      }
      
      // Todo tıklama - ekranda ortala
      todoElement.onclick = () => {
        if (window.centerOnTodo) window.centerOnTodo(todo.id);
      };
      
      viewport.appendChild(todoElement);
    });
  }
  
  // Notları render et
  notes.forEach(note => {
    if (note.x === undefined || note.y === undefined) return;
    
    const noteElement = document.createElement('div');
    noteElement.className = 'minimap-note';
    noteElement.style.position = 'absolute';
    noteElement.style.left = padding + (note.x - minX) * scale + 'px';
    noteElement.style.top = padding + (note.y - minY) * scale + 'px';
    // Yuvarlak boyutunu hesapla (küçük ama görünür olsun)
    const circleSize = Math.max(8, 12 * scale);
    noteElement.style.width = circleSize + 'px';
    noteElement.style.height = circleSize + 'px';
    
    // Not rengini belirle - klasörü varsa klasör rengi, yoksa varsayılan
    let noteColor = '#6b7280'; // Varsayılan gri renk
    let noteFolder = null;
    
    // findFolderForNote fonksiyonu varsa kullan (en güvenilir yöntem)
    if (note.folderId && window.findFolderForNote) {
      noteFolder = window.findFolderForNote(note.folderId, folders);
    }
    
    // Fallback: Önce direkt klasör ID'si ile dene
    if (!noteFolder && note.folderId) {
      noteFolder = folders.find(f => f.id === note.folderId);
    }
    
    // Eğer hala bulunamadıysa, doesNoteMatchFolder ile tüm klasörleri kontrol et
    if (!noteFolder && note.folderId && window.doesNoteMatchFolder) {
      noteFolder = folders.find(f => window.doesNoteMatchFolder(note.folderId, f.id, f));
    }
    
    // Klasör bulunduysa rengini kullan
    if (noteFolder && noteFolder.color) {
      noteColor = noteFolder.color;
    }
    
    // Seçili not için accent rengi kullan, değilse klasör rengi
    const backgroundColor = note.id === state.selectedNote ? 'var(--accent)' : noteColor;
    
    // Notları dolu yuvarlaklar olarak göster - klasör renginde
    noteElement.style.background = backgroundColor;
    noteElement.style.opacity = '0.8'; // Biraz şeffaf ama görünür
    noteElement.style.border = note.id === state.selectedNote ? '2px solid var(--accent)' : `2px solid ${noteColor}`;
    noteElement.style.borderRadius = '50%'; // Tam yuvarlak yapar
    noteElement.style.boxShadow = `0 0 3px ${noteColor}40`; // Hafif glow efekti - klasör renginde
    noteElement.style.cursor = 'pointer';
    noteElement.dataset.noteId = note.id;
    noteElement.title = note.title; // Hover'da başlığı göster
    
    // Seçili not mu kontrol et
    if (note.id === state.selectedNote) {
      noteElement.classList.add('selected');
      noteElement.style.opacity = '1'; // Seçili notlar daha opak
      noteElement.style.boxShadow = '0 0 6px var(--accent)'; // Daha belirgin glow
      noteElement.style.transform = 'scale(1.2)'; // Biraz büyüt
    }
    
    // Hub not mu kontrol et
    if (hubNotes.some(hub => hub.id === note.id)) {
      noteElement.classList.add('hub');
      noteElement.style.border = '2px solid var(--warning)';
      noteElement.style.boxShadow = '0 0 4px var(--warning)';
    }
    
    // Orphan not mu kontrol et
    if (orphanNotes.some(orphan => orphan.id === note.id)) {
      noteElement.classList.add('orphan');
      noteElement.style.opacity = '0.5';
    }
    
    // Bağlı not mu kontrol et (seçili nota bağlı olanlar)
    const isConnected = state.selectedNote && state.selectedNote !== note.id && (
      note.links.includes(notes.find(n => n.id === state.selectedNote)?.title || '') ||
      notes.find(n => n.id === state.selectedNote)?.links.includes(note.title)
    );
    
    if (isConnected) {
      noteElement.classList.add('connected');
      noteElement.style.border = '2px solid var(--success)';
    }
    
    // Not tıklama
    noteElement.onclick = () => {
      if (window.centerOnNote) window.centerOnNote(note.id); // Sadece ekranda ortala
    };
    
    viewport.appendChild(noteElement);
  });
  
  // Tüm bağlantı türlerini render et
  
  // 1. Not-not bağlantıları
  notes.forEach(note => {
    if (!note.links || note.x === undefined || note.y === undefined) return;
    
    note.links.forEach(linkTitle => {
      const targetNote = notes.find(n => n.title === linkTitle);
      if (!targetNote || targetNote.x === undefined || targetNote.y === undefined) return;
      
      const circleSize = Math.max(8, 12 * scale);
      const sourceX = padding + (note.x - minX) * scale + circleSize / 2;
      const sourceY = padding + (note.y - minY) * scale + circleSize / 2;
      const targetX = padding + (targetNote.x - minX) * scale + circleSize / 2;
      const targetY = padding + (targetNote.y - minY) * scale + circleSize / 2;
      
      const deltaX = targetX - sourceX;
      const deltaY = targetY - sourceY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      const connection = document.createElement('div');
      connection.className = 'minimap-connection note-connection';
      connection.style.position = 'absolute';
      connection.style.left = sourceX + 'px';
      connection.style.top = sourceY + 'px';
      connection.style.width = distance + 'px';
      connection.style.height = '1px';
      connection.style.background = 'var(--accent)';
      connection.style.transformOrigin = 'left center';
      connection.style.transform = `rotate(${angle}deg)`;
      connection.style.opacity = '0.4';
      connection.style.zIndex = '1';
      
      viewport.appendChild(connection);
    });
  });
  
  // 2. Klasör-not bağlantıları
  folders.forEach(folder => {
    if (folder.x === undefined || folder.y === undefined) return;
    
    // Bu klasördeki notları bul
    // Genel eşleştirme fonksiyonu kullan
    const folderNotes = notes.filter(note => {
      if (window.doesNoteMatchFolder) {
        return window.doesNoteMatchFolder(note.folderId, folder.id, folder);
      }
      // Fallback
      return note.folderId === folder.id;
    });
    
    folderNotes.forEach(note => {
      if (note.x === undefined || note.y === undefined) return;
      
      const folderCenterX = padding + (folder.x - minX) * scale + (200 * scale) / 2;
      const folderCenterY = padding + (folder.y - minY) * scale + (100 * scale) / 2;
      const noteCenterX = padding + (note.x - minX) * scale + (Math.max(8, 12 * scale)) / 2;
      const noteCenterY = padding + (note.y - minY) * scale + (Math.max(8, 12 * scale)) / 2;
      
      const deltaX = noteCenterX - folderCenterX;
      const deltaY = noteCenterY - folderCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      const connection = document.createElement('div');
      connection.className = 'minimap-connection folder-note-connection';
      connection.style.position = 'absolute';
      connection.style.left = folderCenterX + 'px';
      connection.style.top = folderCenterY + 'px';
      connection.style.width = distance + 'px';
      connection.style.height = '1px';
      connection.style.background = folder.color;
      connection.style.transformOrigin = 'left center';
      connection.style.transform = `rotate(${angle}deg)`;
      connection.style.opacity = '0.3';
      connection.style.zIndex = '1';
      
      viewport.appendChild(connection);
    });
  });
  
  // 3. Klasör-todo bağlantıları
  if (window.todoManager && window.todoManager.todos.length > 0) {
    folders.forEach(folder => {
      if (folder.x === undefined || folder.y === undefined) return;
      
      // Bu klasöre bağlı todo'ları al
      const folderTodos = window.todoManager.todos.filter(todo => todo.folderId === folder.id);
      
      folderTodos.forEach(todo => {
        const todoX = todo.x !== undefined ? todo.x : (todo.position?.x || 0);
        const todoY = todo.y !== undefined ? todo.y : (todo.position?.y || 0);
        
        if (todoX === undefined || todoY === undefined) return;
        
        const folderCenterX = padding + (folder.x - minX) * scale + (200 * scale) / 2;
        const folderCenterY = padding + (folder.y - minY) * scale + (100 * scale) / 2;
        const todoCenterX = padding + (todoX - minX) * scale + (Math.max(10, 14 * scale)) / 2;
        const todoCenterY = padding + (todoY - minY) * scale + (Math.max(10, 14 * scale)) / 2;
        
        const deltaX = todoCenterX - folderCenterX;
        const deltaY = todoCenterY - folderCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        const connection = document.createElement('div');
        connection.className = 'minimap-connection folder-todo-connection';
        connection.style.position = 'absolute';
        connection.style.left = folderCenterX + 'px';
        connection.style.top = folderCenterY + 'px';
        connection.style.width = distance + 'px';
        connection.style.height = '1px';
        connection.style.background = folder.color;
        connection.style.transformOrigin = 'left center';
        connection.style.transform = `rotate(${angle}deg)`;
        connection.style.opacity = '0.4';
        connection.style.zIndex = '1';
        
        viewport.appendChild(connection);
      });
    });
  }
  
  // 4. Todo-not bağlantıları
  if (window.todoManager && window.todoManager.todos.length > 0) {
    window.todoManager.todos.forEach(todo => {
      const todoX = todo.x !== undefined ? todo.x : (todo.position?.x || 0);
      const todoY = todo.y !== undefined ? todo.y : (todo.position?.y || 0);
      
      if (todoX === undefined || todoY === undefined || !todo.connections || todo.connections.length === 0) return;
      
      todo.connections.forEach(noteTitle => {
        const targetNote = notes.find(note => note.title === noteTitle);
        if (!targetNote || targetNote.x === undefined || targetNote.y === undefined) return;
        
        const todoCenterX = padding + (todoX - minX) * scale + (Math.max(10, 14 * scale)) / 2;
        const todoCenterY = padding + (todoY - minY) * scale + (Math.max(10, 14 * scale)) / 2;
        const noteCenterX = padding + (targetNote.x - minX) * scale + (Math.max(8, 12 * scale)) / 2;
        const noteCenterY = padding + (targetNote.y - minY) * scale + (Math.max(8, 12 * scale)) / 2;
        
        const deltaX = noteCenterX - todoCenterX;
        const deltaY = noteCenterY - todoCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        const connection = document.createElement('div');
        connection.className = 'minimap-connection todo-note-connection';
        connection.style.position = 'absolute';
        connection.style.left = todoCenterX + 'px';
        connection.style.top = todoCenterY + 'px';
        connection.style.width = distance + 'px';
        connection.style.height = '1px';
        connection.style.background = '#f59e0b'; // Todo bağlantıları için turuncu
        connection.style.transformOrigin = 'left center';
        connection.style.transform = `rotate(${angle}deg)`;
        connection.style.opacity = '0.5';
        connection.style.zIndex = '1';
        
        viewport.appendChild(connection);
      });
    });
  }
  
  // 5. Ana klasör-alt klasör bağlantıları
  folders.forEach(folder => {
    if (folder.parentId && folder.x !== undefined && folder.y !== undefined) {
      const parentFolder = folders.find(f => f.id === folder.parentId);
      if (parentFolder && parentFolder.x !== undefined && parentFolder.y !== undefined) {
        
        // Ana klasör merkezi
        const parentCenterX = padding + (parentFolder.x - minX) * scale + (200 * scale) / 2;
        const parentCenterY = padding + (parentFolder.y - minY) * scale + (100 * scale) / 2;
        
        // Alt klasör merkezi (farklı boyut)
        const childCenterX = padding + (folder.x - minX) * scale + (120 * scale) / 2;
        const childCenterY = padding + (folder.y - minY) * scale + (60 * scale) / 2;
        
        const deltaX = childCenterX - parentCenterX;
        const deltaY = childCenterY - parentCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        const connection = document.createElement('div');
        connection.className = 'minimap-connection folder-folder-connection';
        connection.style.position = 'absolute';
        connection.style.left = parentCenterX + 'px';
        connection.style.top = parentCenterY + 'px';
        connection.style.width = distance + 'px';
        connection.style.height = '2px'; // Alt klasör bağlantıları daha kalın
        connection.style.background = parentFolder.color;
        connection.style.transformOrigin = 'left center';
        connection.style.transform = `rotate(${angle}deg)`;
        connection.style.opacity = '0.6'; // Alt klasör bağlantıları daha belirgin
        connection.style.zIndex = '1';
        connection.style.borderTop = '1px dashed ' + parentFolder.color; // Kesikli çizgi
        
        viewport.appendChild(connection);
      }
    }
  });
}

// Global export
window.renderGraph = renderGraph;

console.log('🗺️ Minimap/Graph yüklendi');

