// ===== DOM EVENT LISTENERS =====
// TÃ¼m UI event listener'larÄ±

document.addEventListener('DOMContentLoaded', function() {
  // Buton eventleri
  const closeBtn = document.getElementById('closeBtn');
  const newBtn = document.getElementById('newBtn');
  const saveBtn = document.getElementById('saveBtn');
  const delBtn = document.getElementById('delBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const searchInput = document.getElementById('q');
  const titleInput = document.getElementById('titleIn');
  const bodyInput = document.getElementById('bodyIn');
  
  // Zoom kontrolleri
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const resetZoomBtn = document.getElementById('resetZoomBtn');
  const boardwrap = document.querySelector('.boardwrap');
  
  // Title popup sistemi başlat
  createTitlePopup();
  
  // Board hover eventleri
  const board = document.getElementById('board');
  if (board) {
    board.addEventListener('mouseover', handleCardHover);
    board.addEventListener('mouseout', handleCardLeave);
    board.addEventListener('mousemove', handleCardMove);
  }
  
  
  // Toolbar butonları için click ve drag sistemi
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  
  const toolbarButtons = [
    { btn: closeBtn, action: () => {
      console.log('🔧 Widget çarpı butonuna tıklandı');
      if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('toggle-main-window');
      }
    }},
    { btn: newBtn, action: () => {
      console.log('🔧 Yeni not butonuna tıklandı');
      createNote();
    }},
    { btn: settingsBtn, action: () => {
      console.log('🔧 Ayarlar butonuna tıklandı');
      openSettingsModal();
    }},
    { btn: helpBtn, action: () => {
      console.log('🔧 Yardım butonuna tıklandı');
      openHelpModal();
    }},
    { btn: importBtn, action: () => {
      console.log('🔧 İçe aktar butonuna tıklandı');
      openNotesFolder();
    }},
    { btn: fullscreenBtn, action: () => {
      console.log('🔧 Tam ekran butonuna tıklandı');
      if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('toggle-fullscreen');
      }
    }},
    { btn: toggleSidebarBtn, action: () => {
      console.log('🔧 Sidebar toggle butonuna tıklandı');
      toggleSidebar();
    }}
  ];
  
  // Butonlar için ORB gibi sistem - Manuel drag (ORB'la aynı mantık)
  toolbarButtons.forEach(({ btn, action }) => {
    if (btn) {
      let dragTimer = null;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let totalMovement = 0;
      
      btn.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          e.preventDefault();
          startX = e.screenX;
          startY = e.screenY;
          isDragging = false;
          totalMovement = 0;
          
          // 50ms sonra drag moduna geç (Orb ile aynı)
          dragTimer = setTimeout(() => {
            isDragging = true;
            btn.style.cursor = 'grabbing';
            console.log(`🔄 Buton drag başladı: ${btn.id}`);
            
            // Manuel drag için IPC kullan
            if (typeof require !== 'undefined') {
              const { ipcRenderer } = require('electron');
              
              const handleDrag = (dragEvent) => {
                if (isDragging) {
                  const deltaX = dragEvent.screenX - startX;
                  const deltaY = dragEvent.screenY - startY;
                  
                  totalMovement += Math.abs(deltaX) + Math.abs(deltaY);
                  
                  if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                    ipcRenderer.send('move-widget', deltaX, deltaY);
                    startX = dragEvent.screenX;
                    startY = dragEvent.screenY;
                  }
                }
              };
              
              const handleUp = () => {
                document.removeEventListener('mousemove', handleDrag);
                document.removeEventListener('mouseup', handleUp);
              };
              
              document.addEventListener('mousemove', handleDrag);
              document.addEventListener('mouseup', handleUp);
            }
          }, 50);
        }
      });
      
      btn.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          const wasDragging = isDragging;
          const hadMovement = totalMovement > 5;
          
          // Cleanup
          if (dragTimer) {
            clearTimeout(dragTimer);
            dragTimer = null;
          }
          
          isDragging = false;
          btn.style.cursor = 'pointer';
          
          // ÖNCE movement kontrolü - movement yoksa CLICK
          if (!hadMovement) {
            console.log(`✅ Click (hareket yok): ${btn.id}`);
            e.preventDefault();
            e.stopPropagation();
            action();
          } else {
            console.log(`🔄 Drag: ${btn.id} (${totalMovement}px)`);
          }
          
          // Son olarak reset
          totalMovement = 0;
        }
      });
    }
  });
  
  if (saveBtn) saveBtn.onclick = () => {
    if (selectedNote) {
      updateNote(selectedNote, 
        titleInput ? titleInput.value : '',
        bodyInput ? bodyInput.value : ''
      );
    }
  };
  
  if (delBtn) delBtn.onclick = () => {
    if (selectedNote) {
      deleteNote(selectedNote);
    }
  };
  
  if (closeDrawerBtn) closeDrawerBtn.onclick = () => {
    closeDrawer();
  };
  
  // Zoom butonları
  if (zoomInBtn) zoomInBtn.onclick = zoomIn;
  if (zoomOutBtn) zoomOutBtn.onclick = zoomOut;
  if (resetZoomBtn) resetZoomBtn.onclick = fitAllNotes;
  
  
  // Note Panel event listeners (already handled in openNotePanel)
  
  // Note Panel keyboard shortcuts - Document level
  document.addEventListener('keydown', (e) => {
    const notePanelOverlay = document.getElementById('notePanelOverlay');
    const deleteModalOverlay = document.getElementById('deleteModalOverlay');
    
    // Delete modal açıksa ESC ile kapat
    if (deleteModalOverlay && deleteModalOverlay.classList.contains('active')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeDeleteModal();
        return;
      }
    }
    
    if (notePanelOverlay && notePanelOverlay.classList.contains('active')) {
      // ESC - Note Panel'i kapat
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        hideWikilinkAutocomplete(); // Autocomplete'i de kapat
        closeNotePanel();
        return;
      }
      // Ctrl+S - Kaydet
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        saveNotePanelNote();
        return;
      }
    }
  });
  
  // Wikilink autocomplete'i kapatmak için click eventi
  document.addEventListener('click', (e) => {
    if (wikilinkAutocomplete && !wikilinkAutocomplete.contains(e.target)) {
      hideWikilinkAutocomplete();
    }
  });

  // Link tıklama olayını yakala - tarayıcıda aç
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && link.href && !link.href.startsWith('#')) {
      e.preventDefault();
      e.stopPropagation();
      
      // IPC ile main process'e gönder
      if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('open-external-link', link.href);
        console.log('🔗 Link tarayıcıda açılacak:', link.href);
      } else {
        // Browser modunda
        window.open(link.href, '_blank');
        console.log('🔗 Link tarayıcıda açıldı:', link.href);
      }
    }
  });
  
  // Note Panel event listeners are handled in openNotePanel function
  
  // Board wheel eventi (zoom)
  if (boardwrap) {
    boardwrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      // Popup'ı gizle - wheel event sırasında
      hideTitlePopup();
      
      // Context menu'leri gizle - wheel event sırasında
      hideContextMenu();
      
      if (e.ctrlKey) {
        // Ctrl + tekerlek = zoom
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      } else {
        // Tekerlek = pan (yukarı/aşağı)
        boardPanY -= e.deltaY;
        updateBoardTransform();
      }
    });
    
    // Mouse events (orta tuş + sağ tık pan + sol tık selection)
    boardwrap.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // Orta tuş - pan
        e.preventDefault();
        isMiddleMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastPanX = boardPanX;
        lastPanY = boardPanY;
        boardwrap.style.cursor = 'grabbing';
      } else if (e.button === 2) { // Sağ tık - pan (basılı tutma) / context menu (tek tık)
        e.preventDefault();
        isRightMouseDown = true;
        rightClickStartTime = Date.now();
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastPanX = boardPanX;
        lastPanY = boardPanY;
      } else if (e.button === 0) { // Sol tık - selection
        // Eğer nota tıklanmadıysa selection başlat
        if (e.target === boardwrap || e.target.id === 'board') {
          // Önce tüm seçimleri temizle (single ve multi)
          clearAllSelections();
          startSelection(e);
        }
      }
    });
    
    boardwrap.addEventListener('mousemove', (e) => {
      if (isMiddleMouseDown || isRightMouseDown) {
        e.preventDefault();
        
        // Popup'ı gizle - pan sırasında
        hideTitlePopup();
        
        // Context menu'leri gizle - pan sırasında
        hideContextMenu();
        
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        
        boardPanX = lastPanX + deltaX;
        boardPanY = lastPanY + deltaY;
        
        updateBoardTransform();
      }
    });
    
    boardwrap.addEventListener('mouseup', (e) => {
      if (e.button === 1) {
        isMiddleMouseDown = false;
        boardwrap.style.cursor = 'default';
      } else if (e.button === 2) {
        isRightMouseDown = false;
        boardwrap.style.cursor = 'default';
        
        // Eğer çok kısa sürede bırakıldıysa ve hareket edilmediyse context menu aç
        const clickDuration = Date.now() - rightClickStartTime;
        const mouseMoved = Math.abs(e.clientX - lastMouseX) > 5 || Math.abs(e.clientY - lastMouseY) > 5;
        
        if (clickDuration < 200 && !mouseMoved) {
          // Tek tık - context menu aç (boş alan için)
          if (!e.target.closest('.note') && !e.target.closest('.folder-card')) {
            showEmptyAreaContextMenu(e);
          }
        }
      }
    });
    
    // Mouse board'dan çıkınca pan'i durdur
    boardwrap.addEventListener('mouseleave', () => {
      isMiddleMouseDown = false;
      isRightMouseDown = false;
      boardwrap.style.cursor = 'default';
    });
    
    // Context menu'yu engelle - kendi yönetimimizde
    boardwrap.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  // Arama
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      renderNotes();
      renderNoteList();
    };
    console.log('Arama input listener eklendi');
  }
  
  // Editör
  if (titleInput) {
    titleInput.oninput = () => {
      console.log('Başlık değişti:', titleInput.value);
      renderPreview();
    };
    console.log('Başlık input listener eklendi');
  }
  
  if (bodyInput) {
    bodyInput.oninput = () => {
      console.log('İçerik değişti:', bodyInput.value.substring(0, 50) + '...');
      renderPreview();
    };
    console.log('İçerik input listener eklendi');
  }
  
  // Kısayollar - Bu kısım kaldırıldı, aşağıdaki global kısayollar kullanılıyor
  
  // Tab işlevselliği
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Tüm tab'ları deaktive et
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      // Seçilen tab'ı aktive et
      tab.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
      
      console.log(`Tab değişti: ${targetTab}`);
    });
  });
  
  // Başlangıç - sadece ilk defa yükle
  if (!window.notesLoaded) {
  loadNotes();
    window.notesLoaded = true;
  }
  
  // Sol sidebar butonları - Debug ile
  const newNoteBtn = document.getElementById('newNoteBtn');
  const newFolderBtn = document.getElementById('newFolderBtn');
  
  // Etiket arama elemanları
  const tagSearchInput = document.getElementById('tagSearch');
  const clearSearchBtn = document.getElementById('clearSearch');
  
  console.log('Butonlar bulundu:', {
    newNoteBtn: !!newNoteBtn,
    newFolderBtn: !!newFolderBtn,
    tagSearchInput: !!tagSearchInput,
    clearSearchBtn: !!clearSearchBtn
  });
  
  if (newNoteBtn) {
    newNoteBtn.onclick = () => {
      createNote();
    };
  } else {
    console.error('newNoteBtn elementi bulunamadı!');
  }
  
  if (newFolderBtn) {
    newFolderBtn.onclick = () => {
      createFolder();
    };
  } else {
    console.error('newFolderBtn elementi bulunamadı!');
  }
  
  // Etiket arama
  if (tagSearchInput) {
    tagSearchInput.oninput = (e) => {
      searchTags(e.target.value);
    };
  } else {
    console.error('tagSearchInput elementi bulunamadı!');
  }
  
  // Arama temizle
  if (clearSearchBtn) {
    clearSearchBtn.onclick = () => {
      clearTagSearch();
    };
  } else {
    console.error('clearSearchBtn elementi bulunamadı!');
  }
  
  // Multi-selection fonksiyonları
  function startSelection(e) {
    // Mevcut seçimleri temizle
    clearSelection();
    
    const boardwrap = document.querySelector('.boardwrap');
    const boardwrapRect = boardwrap.getBoundingClientRect();
    
    // Pan ve zoom'u hesaba katarak koordinat hesapla
    const rawX = e.clientX - boardwrapRect.left;
    const rawY = e.clientY - boardwrapRect.top;
    
    // Zoom ve pan'i tersine çevir
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
  
  function updateSelection(e) {
    if (!isSelecting || !selectionBox) return;
    
    const boardwrap = document.querySelector('.boardwrap');
    const boardwrapRect = boardwrap.getBoundingClientRect();
    
    // Pan ve zoom'u hesaba katarak current koordinat hesapla
    const rawX = e.clientX - boardwrapRect.left;
    const rawY = e.clientY - boardwrapRect.top;
    
    // Zoom ve pan'i tersine çevir
    const currentX = (rawX - boardPanX) / boardZoom;
    const currentY = (rawY - boardPanY) / boardZoom;
    
    const left = Math.min(selectionStartX, currentX);
    const top = Math.min(selectionStartY, currentY);
    const width = Math.abs(currentX - selectionStartX);
    const height = Math.abs(currentY - selectionStartY);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    
    // Tüm kartları kontrol et
    checkAllCardsInSelection(left, top, width, height);
  }
  

  // Tüm seçili kartları birlikte hareket ettiren fonksiyon
  function moveSelectedCards(deltaX, deltaY) {
    const boardZoom = window.boardZoom || 1;
    
    // Seçili notları hareket ettir
    selectedNotes.forEach(noteId => {
      const note = notes.find(n => n.id === noteId);
      const element = document.getElementById(`note-${noteId}`);
      if (note && element && element.dataset.initialNoteX !== undefined) {
        const initialX = parseFloat(element.dataset.initialNoteX || 0);
        const initialY = parseFloat(element.dataset.initialNoteY || 0);
        
        note.x = initialX + deltaX / boardZoom;
        note.y = initialY + deltaY / boardZoom;
        
        element.style.left = note.x + 'px';
        element.style.top = note.y + 'px';
        element.style.transform = 'none';
        
        scheduleSave();
        drawConnections();
      }
    });
    
    // Seçili klasörleri hareket ettir
    selectedFolders.forEach(folderId => {
      const folder = folders.find(f => f.id === folderId);
      const element = document.getElementById(`folder-${folderId}`);
      if (folder && element && element.dataset.initialFolderX !== undefined) {
        const initialX = parseFloat(element.dataset.initialFolderX || 0);
        const initialY = parseFloat(element.dataset.initialFolderY || 0);
        
        folder.x = initialX + deltaX / boardZoom;
        folder.y = initialY + deltaY / boardZoom;
        
        element.style.left = folder.x + 'px';
        element.style.top = folder.y + 'px';
        element.style.transform = 'none';
      }
    });
    
    // Seçili todo'ları hareket ettir
    selectedTodos.forEach(todoId => {
      const todo = window.todoManager?.todos.find(t => t.id === parseInt(todoId));
      const element = document.querySelector(`.todo-canvas-card[data-todo-id="${todoId}"]`);
      if (todo && element && element.dataset.initialTodoX !== undefined) {
        const initialX = parseFloat(element.dataset.initialTodoX || 0);
        const initialY = parseFloat(element.dataset.initialTodoY || 0);
        
        const newX = initialX + deltaX / boardZoom;
        const newY = initialY + deltaY / boardZoom;
        
        // Todo objesinin hem x,y hem de position.x,position.y alanlarını güncelle
        todo.x = newX;
        todo.y = newY;
        if (todo.position) {
          todo.position.x = newX;
          todo.position.y = newY;
        }
        
        // Todo kartının transition'ını geçici olarak kapat
        element.style.transition = 'none';
        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
        element.style.transform = 'none';
      }
    });
  }

  function checkAllCardsInSelection(selLeft, selTop, selWidth, selHeight) {
    const noteElements = document.querySelectorAll('.note');
    const folderElements = document.querySelectorAll('.folder-card');
    const todoElements = document.querySelectorAll('.todo-canvas-card');
    
    
    const newSelectedNotes = [];
    const newSelectedFolders = [];
    const newSelectedTodos = [];
    
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
    
    // Todo kartlarını kontrol et
    todoElements.forEach(todoElement => {
      const todoLeft = parseFloat(todoElement.style.left) || 0;
      const todoTop = parseFloat(todoElement.style.top) || 0;
      
      // Todo kartının gerçek boyutlarını al (getBoundingClientRect kullan)
      const rect = todoElement.getBoundingClientRect();
      const todoWidth = rect.width || 320;
      const todoHeight = rect.height || 200;
      
      
      if (todoLeft < selLeft + selWidth &&
          todoLeft + todoWidth > selLeft &&
          todoTop < selTop + selHeight &&
          todoTop + todoHeight > selTop) {
        
        const todoId = todoElement.dataset.todoId;
        if (todoId) {
          newSelectedTodos.push(todoId);
          todoElement.classList.add('multi-selected');
        }
      } else {
        todoElement.classList.remove('multi-selected');
      }
    });
    
    
    selectedNotes = newSelectedNotes;
    selectedFolders = newSelectedFolders;
    selectedTodos = newSelectedTodos;
    
  }
  
  function endSelection() {
    if (!isSelecting) return;
    
    isSelecting = false;
    
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  }
  
  function clearSelection() {
    selectedNotes = [];
    selectedFolders = [];
    selectedTodos = [];
    
    // Tüm multi-selected sınıflarını kaldır
    const noteElements = document.querySelectorAll('.note.multi-selected');
    const folderElements = document.querySelectorAll('.folder-card.multi-selected');
    const todoElements = document.querySelectorAll('.todo-canvas-card.multi-selected');
    
    noteElements.forEach(element => {
      element.classList.remove('multi-selected');
    });
    
    folderElements.forEach(element => {
      element.classList.remove('multi-selected');
    });
    
    todoElements.forEach(element => {
      element.classList.remove('multi-selected');
    });
    
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
    isSelecting = false;
  }
  
  function clearAllSelections() {
    // Multi-selection temizle
    clearSelection();
    
    // Single selection temizle
    selectedNote = null;
    selectedFolder = null;
    
    // Tüm seçim CSS sınıflarını kaldır
    document.querySelectorAll('.note.selected').forEach(element => {
      element.classList.remove('selected');
    });
    
    document.querySelectorAll('.folder-card.selected').forEach(element => {
      element.classList.remove('selected');
    });
    
    // UI'ları güncelle
    renderGraph(); // Minimap'i güncelle
    renderFolderList(); // Sidebar'ı güncelle
  }
  
  // Global mouse eventleri
  document.addEventListener('mousedown', (e) => {
    // Sağ tık ise drag tracking yapma (context menu için)
    if (e.button === 2) return;
    
    // Not, klasör ve todo kartlarına mousedown handling (sadece sol tık)
    if (e.target.closest('.note') || e.target.closest('.folder-card') || e.target.closest('.todo-canvas-card')) {
      const element = e.target.closest('.note') || e.target.closest('.folder-card') || e.target.closest('.todo-canvas-card');
      
      // Popup'ı gizle - kart tıklanırken popup gözükmesin
      if (hoveredCard === element) {
        hideTitlePopup();
      }
      
      // Drag başlangıç verilerini kaydet
      element.dataset.clickStartX = e.clientX;
      element.dataset.clickStartY = e.clientY;
      element.dataset.mouseDownTime = Date.now();
      element.dataset.isDragging = 'false'; // Başlangıçta drag değil
      
      // Initial pozisyonları da kaydet
      if (element.classList.contains('note')) {
        const noteId = element.id.replace('note-', '');
        const note = notes.find(n => n.id === noteId);
        if (note) {
          element.dataset.dragStartX = e.clientX - document.getElementById('board').getBoundingClientRect().left;
          element.dataset.dragStartY = e.clientY - document.getElementById('board').getBoundingClientRect().top;
          element.dataset.initialNoteX = note.x;
          element.dataset.initialNoteY = note.y;
        }
      } else if (element.classList.contains('folder-card')) {
        const folderId = element.id.replace('folder-', '');
        const folder = folders.find(f => f.id === folderId);
        if (folder) {
          element.dataset.dragStartX = e.clientX - document.getElementById('board').getBoundingClientRect().left;
          element.dataset.dragStartY = e.clientY - document.getElementById('board').getBoundingClientRect().top;
          element.dataset.initialFolderX = folder.x;
          element.dataset.initialFolderY = folder.y;
        }
      } else if (element.classList.contains('todo-canvas-card')) {
        const todoId = parseInt(element.dataset.todoId);
        const todo = window.todoManager?.todos.find(t => t.id === todoId);
        if (todo) {
          element.dataset.dragStartX = e.clientX - document.getElementById('board').getBoundingClientRect().left;
          element.dataset.dragStartY = e.clientY - document.getElementById('board').getBoundingClientRect().top;
          element.dataset.initialTodoX = todo.x !== undefined ? todo.x : todo.position.x;
          element.dataset.initialTodoY = todo.y !== undefined ? todo.y : todo.position.y;
        }
      }
      
      // Eğer çoklu seçim varsa, tüm seçili kartların başlangıç pozisyonlarını kaydet
      const totalSelected = selectedNotes.length + selectedFolders.length + selectedTodos.length;
      if (totalSelected > 1) {
        
        // Seçili notların pozisyonlarını kaydet
        selectedNotes.forEach(noteId => {
          const note = notes.find(n => n.id === noteId);
          const noteElement = document.getElementById(`note-${noteId}`);
          if (note && noteElement) {
            noteElement.dataset.initialNoteX = note.x;
            noteElement.dataset.initialNoteY = note.y;
          }
        });
        
        // Seçili klasörlerin pozisyonlarını kaydet
        selectedFolders.forEach(folderId => {
          const folder = folders.find(f => f.id === folderId);
          const folderElement = document.getElementById(`folder-${folderId}`);
          if (folder && folderElement) {
            folderElement.dataset.initialFolderX = folder.x;
            folderElement.dataset.initialFolderY = folder.y;
          }
        });
        
        // Seçili todo'ların pozisyonlarını kaydet
        selectedTodos.forEach(todoId => {
          const todo = window.todoManager?.todos.find(t => t.id === parseInt(todoId));
          const todoElement = document.querySelector(`.todo-canvas-card[data-todo-id="${todoId}"]`);
          if (todo && todoElement) {
            todoElement.dataset.initialTodoX = todo.x !== undefined ? todo.x : todo.position.x;
            todoElement.dataset.initialTodoY = todo.y !== undefined ? todo.y : todo.position.y;
          }
        });
      }
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    // Selection box güncelle
    if (isSelecting) {
      updateSelection(e);
    }
    
    // Önce mousedown'dan itibaren hareket kontrolü (notlar, klasörler ve todo'lar)
    const allNotes = document.querySelectorAll('.note');
    const allFolders = document.querySelectorAll('.folder-card');
    const allTodos = document.querySelectorAll('.todo-canvas-card');
    
    allNotes.forEach(element => {
      if (element.dataset.clickStartX && element.dataset.clickStartY) {
        const startX = parseFloat(element.dataset.clickStartX);
        const startY = parseFloat(element.dataset.clickStartY);
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        
        // 5px hareket threshold'u
        if (distance > 5 && !element.classList.contains('dragging')) {
          element.classList.add('dragging');
          element.style.cursor = 'grabbing';
          
          // Popup'ı gizle - drag başladığında
          if (hoveredCard === element) {
            hideTitlePopup();
          }
        }
      }
    });
    
    allFolders.forEach(element => {
      if (element.dataset.clickStartX && element.dataset.clickStartY) {
        const startX = parseFloat(element.dataset.clickStartX);
        const startY = parseFloat(element.dataset.clickStartY);
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        
        // 5px hareket threshold'u
        if (distance > 5 && !element.classList.contains('dragging')) {
          element.classList.add('dragging');
          element.style.cursor = 'grabbing';
          
          // Popup'ı gizle - drag başladığında (sadece notlar için popup var)
          if (hoveredCard === element && element.classList.contains('note')) {
            hideTitlePopup();
          }
        }
      }
    });

    // Todo'ları handle et
    allTodos.forEach(element => {
      if (element.dataset.clickStartX && element.dataset.clickStartY) {
        const startX = parseFloat(element.dataset.clickStartX);
        const startY = parseFloat(element.dataset.clickStartY);
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        
        // 5px hareket threshold'u
        if (distance > 5 && !element.classList.contains('dragging')) {
          element.classList.add('dragging');
          element.dataset.isDragging = 'true';
          element.style.cursor = 'grabbing';
        }
      }
    });

    // Tüm dragging kartları için drag fonksiyonunu çağır (notlar, klasörler ve todo'lar)
    const draggingNotes = document.querySelectorAll('.note.dragging');
    const draggingFolders = document.querySelectorAll('.folder-card.dragging');
    const draggingTodos = document.querySelectorAll('.todo-canvas-card.dragging');
    
    // Not kartlarını sürükle
    draggingNotes.forEach(element => {
      const noteId = element.id.replace('note-', '');
      const note = notes.find(n => n.id === noteId);
      if (note) {
        // Popup'ı gizle - kart taşınırken popup gözükmesin
        if (hoveredCard === element) {
          hideTitlePopup();
        }
        
        // Mouse koordinatlarını canvas koordinatlarına çevir
        const board = document.getElementById('board');
        const boardRect = board.getBoundingClientRect();
        
        const currentX = e.clientX - boardRect.left;
        const currentY = e.clientY - boardRect.top;
        
        // Başlangıç pozisyonlarını hesapla (drag başlangıcında kaydedilmiş olmalı)
        const startX = parseFloat(element.dataset.dragStartX || 0);
        const startY = parseFloat(element.dataset.dragStartY || 0);
        const initialNoteX = parseFloat(element.dataset.initialNoteX || 0);
        const initialNoteY = parseFloat(element.dataset.initialNoteY || 0);
        
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        
        // Çoklu seçim kontrolü - eğer bu not seçiliyse ve başka seçili kartlar varsa
        const totalSelected = selectedNotes.length + selectedFolders.length + selectedTodos.length;
        
        if (selectedNotes.includes(noteId) && totalSelected > 1) {
          // Tüm seçili kartları birlikte hareket ettir
          moveSelectedCards(deltaX, deltaY);
        } else {
          // Tek not için normal drag
          note.x = initialNoteX + deltaX / boardZoom;
          note.y = initialNoteY + deltaY / boardZoom;
          
          // Element pozisyonunu güncelle
          element.style.left = note.x + 'px';
          element.style.top = note.y + 'px';
          element.style.transform = 'none';
          
          // Akıllı kaydetme - pozisyon değişikliğinde
          scheduleSave();
          
          // Bağlantı çizgilerini güncelle
          drawConnections();
        }
      }
    });
    
    // Klasör kartlarını sürükle
    draggingFolders.forEach(element => {
      const folderId = element.id.replace('folder-', '');
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        // Popup'ı gizle - kart taşınırken popup gözükmesin (sadece notlar için popup var)
        if (hoveredCard === element && element.classList.contains('note')) {
          hideTitlePopup();
        }
        
        // Mouse koordinatlarını canvas koordinatlarına çevir
        const board = document.getElementById('board');
        const boardRect = board.getBoundingClientRect();
        
        const currentX = e.clientX - boardRect.left;
        const currentY = e.clientY - boardRect.top;
        
        // Başlangıç pozisyonlarını hesapla
        const startX = parseFloat(element.dataset.dragStartX || 0);
        const startY = parseFloat(element.dataset.dragStartY || 0);
        const initialFolderX = parseFloat(element.dataset.initialFolderX || 0);
        const initialFolderY = parseFloat(element.dataset.initialFolderY || 0);
        
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        
        // Çoklu seçim kontrolü - eğer bu klasör seçiliyse ve başka seçili kartlar varsa
        const totalSelected = selectedNotes.length + selectedFolders.length + selectedTodos.length;
        
        if (selectedFolders.includes(folderId) && totalSelected > 1) {
          // Tüm seçili kartları birlikte hareket ettir
          moveSelectedCards(deltaX, deltaY);
        } else {
          // Tek klasör için normal drag
          folder.x = initialFolderX + deltaX / boardZoom;
          folder.y = initialFolderY + deltaY / boardZoom;
          
          // Element pozisyonunu güncelle
          element.style.left = folder.x + 'px';
          element.style.top = folder.y + 'px';
          element.style.transform = 'none';
        }
        
        // Drag sırasında kaydetme yapma - sadece drag bittiğinde kaydet
      }
    });
    
    // Todo kartlarını sürükle
    draggingTodos.forEach(element => {
      const todoId = parseInt(element.dataset.todoId);
      const todo = window.todoManager?.todos.find(t => t.id === todoId);
      if (todo) {
        // Mouse koordinatlarını canvas koordinatlarına çevir
        const board = document.getElementById('board');
        const boardRect = board.getBoundingClientRect();
        
        const currentX = e.clientX - boardRect.left;
        const currentY = e.clientY - boardRect.top;
        
        // Başlangıç pozisyonlarını hesapla (drag başlangıcında kaydedilmiş olmalı)
        const startX = parseFloat(element.dataset.dragStartX || 0);
        const startY = parseFloat(element.dataset.dragStartY || 0);
        const initialTodoX = parseFloat(element.dataset.initialTodoX || 0);
        const initialTodoY = parseFloat(element.dataset.initialTodoY || 0);
        
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        
        // Ana sistemle uyumlu zoom hesaplama
        const boardZoom = window.boardZoom || 1;
        
        // Çoklu seçim kontrolü - eğer bu todo seçiliyse ve başka seçili kartlar varsa
        const totalSelected = selectedNotes.length + selectedFolders.length + selectedTodos.length;
        
        if (selectedTodos.includes(todoId.toString()) && totalSelected > 1) {
          // Tüm seçili kartları birlikte hareket ettir
          moveSelectedCards(deltaX, deltaY);
        } else {
          // Tek todo için normal drag
          todo.x = initialTodoX + deltaX / boardZoom;
          todo.y = initialTodoY + deltaY / boardZoom;
          
          // Element pozisyonunu güncelle
          element.style.left = todo.x + 'px';
          element.style.top = todo.y + 'px';
          element.style.transform = 'none';
        }
      }
    });
    
    // Bağlantıları güncelle
    if (draggingNotes.length > 0 || draggingFolders.length > 0 || draggingTodos.length > 0) {
      // Birleşik bağlantı sistemi çalışıyor (drawConnections içinde)
      drawConnections();
      renderGraph();
    }
  });
  
  document.addEventListener('mouseup', (e) => {
    // Sağ tık ise click handling yapma
    if (e.button === 2) return;
    
    // Selection box bitir
    if (isSelecting) {
      endSelection();
    }
    
    // Tüm notları, klasörleri ve todo'ları kontrol et
    const allNotes = document.querySelectorAll('.note');
    const allFolders = document.querySelectorAll('.folder-card');
    const allTodos = document.querySelectorAll('.todo-canvas-card');
    
    // Dragging kartları için değişkenleri tanımla
    const draggingTodos = document.querySelectorAll('.todo-canvas-card.dragging');
    
    allNotes.forEach(element => {
      if (element.dataset.clickStartX && element.dataset.clickStartY) {
        const startX = parseFloat(element.dataset.clickStartX);
        const startY = parseFloat(element.dataset.clickStartY);
        const mouseDownTime = parseFloat(element.dataset.mouseDownTime);
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        const timeDiff = Date.now() - mouseDownTime;
        
        // Click detection (hareket az ve süre kısa)
        if (distance < 5 && timeDiff < 500 && !element.classList.contains('dragging')) {
          // Eğer checkbox veya mini buton'a tıklanmadıysa
          if (!e.target.classList.contains('checklist-checkbox') && !e.target.classList.contains('mini')) {
            const noteId = element.id.replace('note-', '');
            
            // Çoklu seçim varsa not editörünü açma
            if (selectedNotes.length > 0) {
              console.log('🚫 Çoklu seçim modu aktif, not editörü açılmıyor. Seçili not sayısı:', selectedNotes.length);
              return;
            }
            
            // Seçimleri temizle ve notu aç
            clearAllSelections();
            openNoteDetail(noteId);
          }
        }
        
        // Dataset'i temizle
        delete element.dataset.clickStartX;
        delete element.dataset.clickStartY;
        delete element.dataset.mouseDownTime;
        delete element.dataset.isDragging;
        delete element.dataset.preventClick;
      }
    });
    
    // Klasör kartları için click handling
    allFolders.forEach(element => {
      if (element.dataset.clickStartX && element.dataset.clickStartY) {
        const startX = parseFloat(element.dataset.clickStartX);
        const startY = parseFloat(element.dataset.clickStartY);
        const mouseDownTime = parseFloat(element.dataset.mouseDownTime);
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        const timeDiff = Date.now() - mouseDownTime;
        
        // Click detection (hareket az ve süre kısa)
        if (distance < 5 && timeDiff < 500 && !element.classList.contains('dragging')) {
          const folderId = element.id.replace('folder-', '');
          selectFolder(folderId);
        }
        
        // Dataset'i temizle
        delete element.dataset.clickStartX;
        delete element.dataset.clickStartY;
        delete element.dataset.mouseDownTime;
        delete element.dataset.isDragging;
        delete element.dataset.preventClick;
      }
    });

    const draggingNotes = document.querySelectorAll('.note.dragging');
    const draggingFolders = document.querySelectorAll('.folder-card.dragging');
    
    // Not kartlarını temizle
    draggingNotes.forEach(element => {
      element.classList.remove('dragging');
      element.style.cursor = 'grab';
      
      // Hover flag'ini temizle
      delete element.dataset.wasHovered;
      
      // Popup'ı gizle - drag bittiğinde popup gözükmesin
      if (hoveredCard === element) {
        hideTitlePopup();
      }
      
      // Pozisyonu kaydet
      const noteId = element.id.replace('note-', '');
      saveNotes();
      saveNotePositions(); // Not pozisyonlarını da kaydet
    });
    
    // Klasör kartlarını temizle
    draggingFolders.forEach(element => {
      element.classList.remove('dragging');
      element.style.cursor = 'grab';
      
      // Hover flag'ini temizle
      delete element.dataset.wasHovered;
      
      // Popup'ı gizle - drag bittiğinde popup gözükmesin (sadece notlar için popup var)
      if (hoveredCard === element && element.classList.contains('note')) {
        hideTitlePopup();
      }
      
      // Pozisyonu kaydet
      const folderId = element.id.replace('folder-', '');
      saveFolders();
    });
    
    // Todo'ları handle et
    allTodos.forEach(element => {
      if (element.dataset.clickStartX && element.dataset.clickStartY) {
        const startX = parseFloat(element.dataset.clickStartX);
        const startY = parseFloat(element.dataset.clickStartY);
        const mouseDownTime = parseFloat(element.dataset.mouseDownTime);
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        const timeDiff = Date.now() - mouseDownTime;
        
        // Click detection (hareket az ve süre kısa)
        if (distance < 5 && timeDiff < 500 && !element.classList.contains('dragging')) {
          // Eğer checkbox, subtask checkbox'ı veya mini buton'a tıklanmadıysa
          if (!e.target.classList.contains('todo-canvas-checkbox') && 
              !e.target.classList.contains('todo-canvas-subtask') && 
              !e.target.classList.contains('todo-canvas-subtask-checkbox') &&
              !e.target.classList.contains('mini')) {
            const todoId = parseInt(element.dataset.todoId);
            if (window.todoManager) {
              window.todoManager.selectTodo(todoId);
            }
          }
        }
        
        // Drag işlemi bitti, dragging class'ını kaldır
        element.classList.remove('dragging');
        element.dataset.isDragging = 'false';
        element.style.cursor = 'grab';
        
        // Todo kartının transition'ını geri aç
        element.style.transition = '';
        
        // Click event'ini engelle (drag sonrası checkbox işaretlenmesin)
        element.dataset.preventClick = 'true';
        element.style.pointerEvents = 'none';
        setTimeout(() => {
          element.dataset.preventClick = 'false';
          element.style.pointerEvents = 'auto';
        }, 100); // 100ms'ye düşür
        
        // Pozisyonu kaydet
        const todoId = parseInt(element.dataset.todoId);
        const x = parseFloat(element.style.left);
        const y = parseFloat(element.style.top);
        
        if (window.todoManager && window.todoManager.todos) {
          const todo = window.todoManager.todos.find(t => t.id === todoId);
          if (todo) {
            todo.x = x;
            todo.y = y;
            todo.position.x = x;
            todo.position.y = y;
            window.todoManager.saveTodos();
          }
        }
        
        // Dataset'i temizle
        delete element.dataset.clickStartX;
        delete element.dataset.clickStartY;
        delete element.dataset.mouseDownTime;
        delete element.dataset.isDragging;
        delete element.dataset.preventClick;
        delete element.dataset.dragStartX;
        delete element.dataset.dragStartY;
        delete element.dataset.initialTodoX;
        delete element.dataset.initialTodoY;
      }
    });
    
    // Bağlantıları güncelle
    if (draggingNotes.length > 0 || draggingFolders.length > 0 || draggingTodos.length > 0) {
      // Birleşik bağlantı sistemi çalışıyor (drawConnections içinde)
      drawConnections();
      renderGraph();
    }
  });
  
  // Resize event'i
  window.addEventListener('resize', () => {
    drawConnections();
    renderGraph();
  });
  
  // Viewport değişikliklerini dinle (pan, zoom)
  let viewportChangeTimeout = null;
  function handleViewportChange() {
    if (viewportChangeTimeout) {
      clearTimeout(viewportChangeTimeout);
    }
    
    // Debounce viewport değişikliklerini
    viewportChangeTimeout = setTimeout(() => {
      console.log('🔄 Viewport değişti, kartları yeniden render et');
      renderNotesForViewport(); // Animasyonsuz render
      viewportChangeTimeout = null;
    }, 500); // 500ms debounce - performans için artırıldı
  }
  
  // Board transform değişikliklerini dinle - agresif optimize
  const boardElement = document.getElementById('board');
  if (boardElement) {
    let lastTransform = '';
    let transformChangeCount = 0;
    
    // MutationObserver ile transform değişikliklerini dinle
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const currentTransform = mutation.target.style.transform;
          // Sadece transform gerçekten değişmişse viewport değişikliğini tetikle
          if (currentTransform !== lastTransform) {
            lastTransform = currentTransform;
            transformChangeCount++;
            
            // Her 3. transform değişikliğinde viewport render et
            if (transformChangeCount % 3 === 0) {
              handleViewportChange();
            }
          }
        }
      });
    });
    
    observer.observe(boardElement, {
      attributes: true,
      attributeFilter: ['style']
    });
    
    console.log('👁️ Board transform observer başlatıldı (agresif optimize)');
  }
  
  // Not Paneli Event Listeners
  const notePanelCloseBtn = document.getElementById('notePanelCloseBtn');
  const notePanelCancelBtn = document.getElementById('notePanelCancelBtn');
  const notePanelSaveBtn = document.getElementById('notePanelSaveBtn');
  
  if (notePanelCloseBtn) {
    notePanelCloseBtn.addEventListener('click', () => {
      closeNotePanel();
    });
  }
  
  if (notePanelCancelBtn) {
    notePanelCancelBtn.addEventListener('click', () => {
      closeNotePanel();
    });
  }
  
  if (notePanelSaveBtn) {
    notePanelSaveBtn.addEventListener('click', () => {
      saveNotePanelNote();
    });
  }
  
  // Sidebar'ı açık yap
  ensureSidebarVisible();
  
  // İlk render - sadece ilk defa
  if (!window.initialRenderDone) {
  renderNotes();
  renderTags();
  renderFolderList();
  renderGraph();
    window.initialRenderDone = true;
  }
  
});

console.log('âš¡ DOM Event Listeners yÃ¼klendi');
