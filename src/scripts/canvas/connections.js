// ===== CONNECTION SYSTEM =====
// Not-not, klasör-not, todo-not bağlantı sistemi

// Bağlantıları analiz et (hub ve orphan notları belirle)
function analyzeConnections() {
  const notes = window.notes || [];
  const state = window.getState();
  
  // Filtrelenmiş notları al
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !state.searchQuery || 
      note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      note.text.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.includes(state.searchQuery.toLowerCase()));
    
    // Aktif etiket filtreleri kontrolü (tüm seçili etiketler notda bulunmalı)
    const matchesTagFilters = state.activeTagFilters.length === 0 || 
      state.activeTagFilters.every(filter => note.tags.includes(filter));
    
    return matchesSearch && matchesTagFilters;
  });
  
  // Her not için bağlantı sayısını hesapla (sadece filtrelenmiş notlar arasında)
  filteredNotes.forEach(note => {
    note.connectionCount = note.links.length;
    note.incomingCount = filteredNotes.filter(n => n.links.includes(note.title)).length;
    note.totalConnections = note.connectionCount + note.incomingCount;
  });
  
  // Hub notları belirle (en çok bağlantıya sahip %20)
  const sortedByConnections = [...filteredNotes].sort((a, b) => b.totalConnections - a.totalConnections);
  const hubThreshold = Math.ceil(filteredNotes.length * 0.2);
  const hubNotes = sortedByConnections.slice(0, hubThreshold);
  
  // Orphan notları belirle (hiç bağlantısı olmayan)
  const orphanNotes = filteredNotes.filter(note => note.totalConnections === 0);
  
  return { hubNotes, orphanNotes };
}

// Bağlantı türünü belirle
function getConnectionType(sourceNote, targetNote) {
  const isBidirectional = sourceNote.links.includes(targetNote.title) && 
                          targetNote.links.includes(sourceNote.title);
  
  const connectionStrength = isBidirectional ? 'strong' : 
                           (sourceNote.links.includes(targetNote.title) ? 'normal' : 'weak');
  
  return { isBidirectional, connectionStrength };
}

// Kart merkezini hesapla (not, klasör, todo için)
function getCardCenter(cardType, cardData) {
  const board = document.getElementById('board');
  if (!board) {
    console.warn('Board elementi bulunamadı');
    return { x: cardData.x, y: cardData.y };
  }
  
  let x, y, width, height;
  
  if (cardType === 'note') {
    // Not kartı için basit koordinat hesaplaması
    const noteElement = document.getElementById(`note-${cardData.id}`);
    if (noteElement) {
      width = parseFloat(noteElement.style.width) || cardData.customWidth || 280;
      height = parseFloat(noteElement.style.height) || cardData.customHeight || (window.getNoteHeight ? window.getNoteHeight(cardData) : 200);
    } else {
      width = cardData.customWidth || 280;
      height = cardData.customHeight || (window.getNoteHeight ? window.getNoteHeight(cardData) : 200);
    }
    x = cardData.x + width / 2;  // Yatay merkez
    y = cardData.y + height / 2; // Dikey merkez
  } else if (cardType === 'folder') {
    // Klasör kartı için merkez hesaplama
    width = 200;
    height = 120;
    x = cardData.x + width / 2;
    y = cardData.y + height / 2;
  } else if (cardType === 'todo') {
    // Todo kartı için merkez hesaplama
    width = cardData.size?.width || 320;
    height = cardData.size?.height || 200;
    x = cardData.x + width / 2;
    y = cardData.y + height / 2;
  }
  
  return { x, y };
}

// Bağlantıları çiz (ana fonksiyon)
function drawConnections() {
  // Widget drag ediyorsa render etme
  if (window.widgetIsDragging) {
    return;
  }
  
  // Global erişim için
  window.drawConnections = drawConnections;
  
  const notes = window.notes || [];
  const folders = window.folders || [];
  const state = window.getState();
  
  // Tüm çizgileri temizle
  const existingLines = document.querySelectorAll('.connection-line, .connection-label');
  existingLines.forEach(line => line.remove());
  
  const { hubNotes, orphanNotes } = analyzeConnections();
  
  // 1. Not-Not bağlantıları - Sadece görünür ve filtrelenmiş notlar arasında
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !state.searchQuery || 
      note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      note.text.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.includes(state.searchQuery.toLowerCase()));
    
    // Aktif etiket filtreleri kontrolü (tüm seçili etiketler notda bulunmalı)
    const matchesTagFilters = state.activeTagFilters.length === 0 || 
      state.activeTagFilters.every(filter => note.tags.includes(filter));
    
    return matchesSearch && matchesTagFilters;
  });
  
  // Viewport-based connection rendering: Sadece görünür kartlar arasındaki bağlantıları çiz
  const visibleNotes = window.getVisibleCards ? window.getVisibleCards().filter(note => 
    filteredNotes.includes(note)
  ) : filteredNotes;
  
  visibleNotes.forEach(note => {
    if (!note.x || !note.y) return;
    
    note.links.forEach(linkTitle => {
      const targetNote = visibleNotes.find(n => n.title === linkTitle);
      if (!targetNote || !targetNote.x || !targetNote.y) return;
      
      createUnifiedConnection('note', note, 'note', targetNote, hubNotes, orphanNotes);
    });
  });
  
  // 2. Klasör-Not bağlantıları
  const filteredFolders = folders.filter(folder => {
    if (!state.searchQuery) return true;
    const folderNameMatch = folder.name.toLowerCase().includes(state.searchQuery.toLowerCase());
    // Genel eşleştirme fonksiyonu kullan
    const folderNotes = notes.filter(note => {
      if (window.doesNoteMatchFolder) {
        return window.doesNoteMatchFolder(note.folderId, folder.id, folder);
      }
      // Fallback
      return note.folderId === folder.id;
    });
    const hasMatchingNotes = folderNotes.some(note => 
      note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      note.text.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.includes(state.searchQuery.toLowerCase()))
    );
    return folderNameMatch || hasMatchingNotes;
  });
  
  filteredFolders.forEach(folder => {
    if (!folder.x || !folder.y) return;
    
    // Sadece filtrelenmiş notları al - genel eşleştirme fonksiyonu kullan
    const folderNotes = filteredNotes.filter(note => {
      if (window.doesNoteMatchFolder) {
        return window.doesNoteMatchFolder(note.folderId, folder.id, folder);
      }
      // Fallback
      return note.folderId === folder.id;
    });
    
    folderNotes.forEach(note => {
      if (!note.x || !note.y) return;
      
      createUnifiedConnection('folder', folder, 'note', note, hubNotes, orphanNotes, folder.color);
    });
  });
  
  // 3. Klasör-Todo bağlantıları
  if (window.todoManager && window.todoManager.todos) {
    const todos = window.todoManager.todos;
    
    filteredFolders.forEach(folder => {
      if (!folder.x || !folder.y) return;
      
      // Bu klasöre bağlı todo'ları al
      const folderTodos = todos.filter(todo => todo.folderId === folder.id);
      
      folderTodos.forEach(todo => {
        // Todo koordinatlarını kontrol et
        const todoX = todo.x !== undefined ? todo.x : (todo.position?.x || 0);
        const todoY = todo.y !== undefined ? todo.y : (todo.position?.y || 0);
        
        if (todoX !== undefined && todoY !== undefined) {
          // Todo objesine geçici olarak x,y ekle (getCardCenter için)
          const todoWithCoords = { ...todo, x: todoX, y: todoY };
          
          createUnifiedConnection('folder', folder, 'todo', todoWithCoords, hubNotes, orphanNotes, folder.color);
        }
      });
    });
  }
  
  // 4. Todo-Not bağlantıları
  if (window.todoManager && window.todoManager.todos) {
    const todos = window.todoManager.todos;
    
    todos.forEach(todo => {
      // Todo koordinatlarını kontrol et
      const todoX = todo.x !== undefined ? todo.x : (todo.position?.x || 0);
      const todoY = todo.y !== undefined ? todo.y : (todo.position?.y || 0);
      
      if (todoX === undefined || todoY === undefined) {
        return;
      }
      
      // Todo objesine geçici olarak x,y ekle (getCardCenter için)
      const todoWithCoords = { ...todo, x: todoX, y: todoY };
      
      // Bu todo'nun bağlı olduğu notları bul
      if (todo.connections && todo.connections.length > 0) {
        todo.connections.forEach(noteTitle => {
          // Todo bağlantıları için tüm notları kontrol et (filtrelenmiş değil)
          const targetNote = notes.find(note => note.title === noteTitle);
          if (targetNote && targetNote.x && targetNote.y) {
            createUnifiedConnection('todo', todoWithCoords, 'note', targetNote, hubNotes, orphanNotes);
          } else {
            // Geçersiz bağlantıyı otomatik olarak temizle
            if (window.todoManager) {
              window.todoManager.disconnectTodoFromNote(todo.id, noteTitle);
            }
          }
        });
      }
    });
  }
  
  // 5. Ana klasör-Alt klasör bağlantıları
  filteredFolders.forEach(folder => {
    if (folder.parentId && folder.x && folder.y) {
      const parentFolder = filteredFolders.find(f => f.id === folder.parentId);
      if (parentFolder && parentFolder.x && parentFolder.y) {
        createUnifiedConnection('folder', parentFolder, 'folder', folder, hubNotes, orphanNotes, folder.color);
      }
    }
  });
  
  // Not stillerini güncelle
  updateNoteStyles(hubNotes, orphanNotes);
}

// Not stillerini güncelle (hub ve orphan vurgusu)
function updateNoteStyles(hubNotes, orphanNotes) {
  const notes = window.notes || [];
  const state = window.getState();
  
  notes.forEach(note => {
    const element = document.getElementById(`note-${note.id}`);
    if (!element) return;
    
    // Önceki stilleri temizle
    element.classList.remove('hub', 'orphan');
    
    // Hub not mu?
    if (state.graphSettings.showHubs && hubNotes.some(hub => hub.id === note.id)) {
      element.classList.add('hub');
    }
    
    // Orphan not mu?
    if (state.graphSettings.showOrphans && orphanNotes.some(orphan => orphan.id === note.id)) {
      element.classList.add('orphan');
    }
  });
}

// Birleşik bağlantı çizgisi oluştur
function createUnifiedConnection(sourceType, sourceData, targetType, targetData, hubNotes = null, orphanNotes = null, color = null) {
  const board = document.getElementById('board');
  
  // Desteklenen bağlantı türleri: note-note, folder-note, folder-todo ve folder-folder
  if ((sourceType !== 'note' && sourceType !== 'folder' && sourceType !== 'todo') || 
      (targetType !== 'note' && targetType !== 'folder' && targetType !== 'todo')) {
    console.warn('Desteklenmeyen bağlantı türü:', sourceType, targetType);
    return;
  }
  
  // Merkez noktalarını hesapla
  const sourceCenter = getCardCenter(sourceType, sourceData);
  const targetCenter = getCardCenter(targetType, targetData);
  
  // Mesafe ve açı hesapla
  const deltaX = targetCenter.x - sourceCenter.x;
  const deltaY = targetCenter.y - sourceCenter.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
  
  // Bağlantı türünü ve rengini belirle
  let lineClass = 'connection-line';
  let lineColor = '#3b82f6'; // Varsayılan mavi
  let strokeWidth = 2;
  
  if (color) {
    // Klasör bağlantıları için klasör rengi
    lineColor = color;
    lineClass += ' folder-connection';
  } else if (sourceType === 'note' && targetType === 'note') {
    // Not-Not bağlantıları için özel renk sistemi
    const { isBidirectional, connectionStrength } = getConnectionType(sourceData, targetData);
    lineClass += ` ${isBidirectional ? 'bidirectional' : ''} ${connectionStrength}`;
    
    if (connectionStrength === 'strong') {
      lineColor = '#10b981'; // Yeşil
      strokeWidth = 3;
    } else if (connectionStrength === 'weak') {
      lineColor = '#6b7280'; // Gri
      strokeWidth = 1;
    }
  } else if (sourceType === 'folder' && targetType === 'folder') {
    // Klasör-Klasör bağlantıları için özel stil
    lineClass += ' folder-folder-connection';
    strokeWidth = 2;
  } else if (sourceType === 'todo' || targetType === 'todo') {
    // Todo bağlantıları için özel stil
    lineClass += ' todo-connection';
    lineColor = '#f59e0b'; // Turuncu
    strokeWidth = 2;
  }
  
  // Bağlantı çizgisi oluştur
  const line = document.createElement('div');
  line.className = lineClass;
  line.style.position = 'absolute';
  line.style.left = sourceCenter.x + 'px';
  line.style.top = sourceCenter.y + 'px';
  line.style.width = distance + 'px';
  line.style.height = strokeWidth + 'px';
  line.style.background = lineColor;
  line.style.transformOrigin = '0 50%';
  line.style.transform = `rotate(${angle}deg)`;
  // Z-index'i bağlantı türüne göre ayarla
  if (sourceType === 'folder' || targetType === 'folder') {
    line.style.zIndex = '-1'; // Klasör bağlantıları kartların altında
  } else {
    line.style.zIndex = '1'; // Not bağlantıları normal seviyede
  }
  
  // Opacity'yi bağlantı türüne göre ayarla
  if (sourceType === 'folder' || targetType === 'folder') {
    line.style.opacity = '0.6'; // Klasör bağlantıları daha parlak
  } else {
    line.style.opacity = '0.7'; // Not bağlantıları normal
  }
  line.style.borderRadius = '1px';
  line.style.transition = 'opacity 0.3s ease';
  
  // Hover efekti
  line.addEventListener('mouseenter', () => {
    if (sourceType === 'folder' || targetType === 'folder') {
      line.style.opacity = '1'; // Klasör bağlantıları hover'da tam görünür
    } else {
      line.style.opacity = '1'; // Not bağlantıları hover'da tam görünür
    }
    line.style.height = (strokeWidth + 1) + 'px';
  });
  
  line.addEventListener('mouseleave', () => {
    if (sourceType === 'folder' || targetType === 'folder') {
      line.style.opacity = '0.6'; // Klasör bağlantıları hover sonrası daha parlak
    } else {
      line.style.opacity = '0.7'; // Not bağlantıları hover sonrası normal
    }
    line.style.height = strokeWidth + 'px';
  });
  
  // Çift yönlü bağlantı etiketi (sadece not-not bağlantıları için)
  if (sourceType === 'note' && targetType === 'note' && distance > 100) {
    const { isBidirectional } = getConnectionType(sourceData, targetData);
    if (isBidirectional) {
      const label = document.createElement('div');
      label.className = 'connection-label';
      label.textContent = '↔';
      label.style.position = 'absolute';
      label.style.left = (sourceCenter.x + deltaX / 2 - 10) + 'px';
      label.style.top = (sourceCenter.y + deltaY / 2 - 10) + 'px';
      label.style.background = 'var(--panel)';
      label.style.border = `2px solid ${lineColor}`;
      label.style.borderRadius = '50%';
      label.style.width = '20px';
      label.style.height = '20px';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.justifyContent = 'center';
      label.style.fontSize = '12px';
      label.style.color = lineColor;
      label.style.zIndex = '2';
      label.style.cursor = 'pointer';
      
      // Etiket tıklama - bağlantıyı kaldır
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        removeConnection(sourceData.id, targetData.id);
      });
      
      board.appendChild(label);
    }
  }
  
  board.appendChild(line);
}

// Eski createConnectionLine fonksiyonunu yeni sistemle değiştir
function createConnectionLine(sourceNote, targetNote, hubNotes, orphanNotes) {
  createUnifiedConnection('note', sourceNote, 'note', targetNote, hubNotes, orphanNotes);
}

// Bağlantı kaldırma fonksiyonu
function removeConnection(sourceId, targetId) {
  const notes = window.notes || [];
  const sourceNote = notes.find(n => n.id === sourceId);
  const targetNote = notes.find(n => n.id === targetId);
  
  if (sourceNote && targetNote) {
    // Çift yönlü bağlantı kontrolü
    const sourceHasTarget = sourceNote.links.includes(targetNote.title);
    const targetHasSource = targetNote.links.includes(sourceNote.title);
    
    if (sourceHasTarget) {
      sourceNote.links = sourceNote.links.filter(link => link !== targetNote.title);
      console.log(`🔗 Bağlantı kaldırıldı: ${sourceNote.title} → ${targetNote.title}`);
    }
    
    if (targetHasSource) {
      targetNote.links = targetNote.links.filter(link => link !== sourceNote.title);
      console.log(`🔗 Bağlantı kaldırıldı: ${targetNote.title} → ${sourceNote.title}`);
    }
    
    // Notu kaydet ve yeniden render et
    if (window.saveNoteToFile) window.saveNoteToFile(sourceNote);
    if (window.saveNoteToFile) window.saveNoteToFile(targetNote);
    drawConnections();
    
    console.log('✅ Bağlantı başarıyla kaldırıldı');
  }
}

// Global exports
window.analyzeConnections = analyzeConnections;
window.getConnectionType = getConnectionType;
window.getCardCenter = getCardCenter;
window.drawConnections = drawConnections;
window.updateNoteStyles = updateNoteStyles;
window.createUnifiedConnection = createUnifiedConnection;
window.createConnectionLine = createConnectionLine;
window.removeConnection = removeConnection;

console.log('🔗 Connection System yüklendi');

