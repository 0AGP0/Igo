// ===== DOM EVENT LISTENERS =====
// Tüm UI event listener'ları

// Global değişkenler
let wikilinkAutocomplete = null;

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
  
  // Butonlar için BASIT drag sistemi - Sadece widget'i taşır, render optimizasyonu YAPMAZ
  // Header butonlarından drag başladığında board render'ı durmamalı, connections güncellenmeli
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
          
          // 50ms sonra drag moduna geç
          dragTimer = setTimeout(() => {
            isDragging = true;
            btn.style.cursor = 'grabbing';
            console.log(`🔄 Buton drag başladı: ${btn.id} (render optimizasyonu YOK)`);
            
            // Manuel drag için IPC kullan - SADECE widget'i taşı
            if (typeof require !== 'undefined') {
              const { ipcRenderer } = require('electron');
              
              const handleDrag = (dragEvent) => {
                if (isDragging) {
                  const deltaX = dragEvent.screenX - startX;
                  const deltaY = dragEvent.screenY - startY;
                  
                  totalMovement += Math.abs(deltaX) + Math.abs(deltaY);
                  
                  if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                    // Sadece widget'i taşı - render optimizasyonu YAPMA
                    ipcRenderer.send('move-widget', deltaX, deltaY);
                    startX = dragEvent.screenX;
                    startY = dragEvent.screenY;
                  }
                }
              };
              
              const handleUp = () => {
                document.removeEventListener('mousemove', handleDrag);
                document.removeEventListener('mouseup', handleUp);
                isDragging = false;
                btn.style.cursor = 'pointer';
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
  // NOT: Kart üzerindeki linkler devre dışı - sadece not editörü içindeki linkler çalışır
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && link.href && !link.href.startsWith('#')) {
      // Kart içindeki linkler devre dışı - kart açılsın
      const noteCard = link.closest('.note');
      if (noteCard) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚫 Kart üzerindeki link tıklaması engellendi - kart açılacak');
        return; // Kart içindeki linkleri tamamen devre dışı bırak
      }
      
      // Not editörü içindeki linkler çalışır
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
  }, true); // Capture phase - önce yakala
  
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
        // Ctrl + tekerlek = zoom (mouse pozisyonunu referans al)
        const boardwrapRect = boardwrap.getBoundingClientRect();
        const zoomVars = window.getZoomPanVars();
        const currentZoom = zoomVars.boardZoom || 1;
        const currentPanX = zoomVars.boardPanX || 0;
        const currentPanY = zoomVars.boardPanY || 0;
        
        // Mouse'un boardwrap içindeki pozisyonunu al
        const mouseX = e.clientX - boardwrapRect.left;
        const mouseY = e.clientY - boardwrapRect.top;
        
        // Mouse'un board koordinatlarındaki pozisyonunu hesapla
        const boardX = (mouseX - currentPanX) / currentZoom;
        const boardY = (mouseY - currentPanY) / currentZoom;
        
        // Zoom yap
        const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15; // Zoom in: 1.15x, Zoom out: 1/1.15
        const newZoom = Math.max(0.1, Math.min(3, currentZoom * zoomFactor));
        
        // Mouse pozisyonunu sabit tutmak için pan'i ayarla
        const newPanX = mouseX - (boardX * newZoom);
        const newPanY = mouseY - (boardY * newZoom);
        
        // Zoom ve pan değerlerini güncelle
        zoomVars.boardZoom = newZoom;
        zoomVars.boardPanX = newPanX;
        zoomVars.boardPanY = newPanY;
        window.setZoomPanVars(zoomVars);
        
        // Board transform'u güncelle
        updateBoardTransform();
        // Wheel ile zoom yapıldığında kartları render etme - sadece transform yeterli (multi-selection korunur)
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
          if (window.clearAllSelections) window.clearAllSelections();
          
          // Tüm dragging kartları temizle (boşluğa tıklayınca)
          document.querySelectorAll('.note.dragging, .folder-card.dragging').forEach(element => {
            element.classList.remove('dragging');
            element.style.cursor = 'grab';
            element.style.transition = ''; // Transition'ı geri aç
            delete element.dataset.wasHovered;
          });
          
          // Multi-selection başlat
          if (window.startSelection) window.startSelection(e);
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
        
        // Pan değerlerini güncelle - updateBoardTransform içinde sınırlanacak
        boardPanX = lastPanX + deltaX;
        boardPanY = lastPanY + deltaY;
        
        // Pan sınırları updateBoardTransform içinde kontrol ediliyor
        updateBoardTransform();
        
        // Edge indicator'ları güncelle
        if (window.scheduleEdgeIndicatorUpdate) window.scheduleEdgeIndicatorUpdate();
        
      }
    });
    
    boardwrap.addEventListener('mouseup', (e) => {
      if (e.button === 1) {
        isMiddleMouseDown = false;
        boardwrap.style.cursor = 'default';
        
        // Pan bittikten sonra multi-selection CSS sınıflarını yeniden uygula
        if (window.refreshMultiSelectionStyles) {
          setTimeout(() => {
            window.refreshMultiSelectionStyles();
          }, 50);
        }
        
      } else if (e.button === 2) {
        isRightMouseDown = false;
        boardwrap.style.cursor = 'default';
        
        // Pan bittikten sonra multi-selection CSS sınıflarını yeniden uygula
        if (window.refreshMultiSelectionStyles) {
          setTimeout(() => {
            window.refreshMultiSelectionStyles();
          }, 50);
        }
        
        
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
      
      // Pan durduktan sonra multi-selection CSS sınıflarını yeniden uygula
      if (window.refreshMultiSelectionStyles) {
        setTimeout(() => {
          window.refreshMultiSelectionStyles();
        }, 50);
      }
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
      // Arama için anında render - gecikme olmadan
      if (window.renderNotesImmediate) {
        window.renderNotesImmediate();
      } else {
        window.renderNotes();
      }
      // Bağlantı çizgilerini de anında güncelle
      if (window.drawConnections) window.drawConnections();
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
      
      // Bilgi haritası tab'ına geçildiğinde renderGraph'i çağır
      if (targetTab === 'map') {
        setTimeout(() => {
          if (window.renderGraph) {
            window.renderGraph();
            console.log('🗺️ Bilgi haritası tab\'ı açıldı - renderGraph çağrıldı');
          }
        }, 50);
      }
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
  function clearAllSelections() {
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
    
    // Not ve klasör kartlarına mousedown handling (sadece sol tık)
    if (e.target.closest('.note') || e.target.closest('.folder-card')) {
      const element = e.target.closest('.note') || e.target.closest('.folder-card');
      
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
      }
      
      // Eğer çoklu seçim varsa, tüm seçili kartların başlangıç pozisyonlarını kaydet
      const totalSelected = (window.selectedNotes?.length || 0) + (window.selectedFolders?.length || 0);
      if (totalSelected > 1) {
        const board = document.getElementById('board');
        const boardRect = board.getBoundingClientRect();
        const dragStartX = e.clientX - boardRect.left;
        const dragStartY = e.clientY - boardRect.top;
        
        // Seçili notların pozisyonlarını kaydet
        (window.selectedNotes || []).forEach(noteId => {
          const note = notes.find(n => n.id === noteId);
          const noteElement = document.getElementById(`note-${noteId}`);
          if (note && noteElement) {
            noteElement.dataset.initialNoteX = note.x;
            noteElement.dataset.initialNoteY = note.y;
            noteElement.dataset.dragStartX = dragStartX;
            noteElement.dataset.dragStartY = dragStartY;
            noteElement.dataset.multiDragReady = 'true';
          }
        });
        
        // Seçili klasörlerin pozisyonlarını kaydet
        (window.selectedFolders || []).forEach(folderId => {
          const folder = folders.find(f => f.id === folderId);
          const folderElement = document.getElementById(`folder-${folderId}`);
          if (folder && folderElement) {
            folderElement.dataset.initialFolderX = folder.x;
            folderElement.dataset.initialFolderY = folder.y;
            folderElement.dataset.dragStartX = dragStartX;
            folderElement.dataset.dragStartY = dragStartY;
            folderElement.dataset.multiDragReady = 'true';
          }
        });
      }
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    // Selection box güncelle - SONSUZ BOARD (boardwrap dışında da çalışır)
    if (window.updateSelection) {
      window.updateSelection(e);
    }
    
    // Önce mousedown'dan itibaren hareket kontrolü (notlar ve klasörler)
    const allNotes = document.querySelectorAll('.note');
    const allFolders = document.querySelectorAll('.folder-card');
    
    allNotes.forEach(element => {
      if (element.dataset.clickStartX && element.dataset.clickStartY) {
        const startX = parseFloat(element.dataset.clickStartX);
        const startY = parseFloat(element.dataset.clickStartY);
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        
        // 5px hareket threshold'u
        if (distance > 5 && !element.classList.contains('dragging')) {
          element.classList.add('dragging');
          element.style.cursor = 'grabbing';
          
          // Çoklu seçim varsa tüm seçili kartlara dragging class'ını ekle
          const noteId = element.id.replace('note-', '');
          const totalSelected = (window.selectedNotes?.length || 0) + (window.selectedFolders?.length || 0);
          if (window.selectedNotes?.includes(noteId) && totalSelected > 1) {
            // Tüm seçili kartlara dragging class'ını ekle
            (window.selectedNotes || []).forEach(id => {
              const el = document.getElementById(`note-${id}`);
              if (el && !el.classList.contains('dragging')) {
                el.classList.add('dragging');
                el.style.cursor = 'grabbing';
              }
            });
            (window.selectedFolders || []).forEach(id => {
              const el = document.getElementById(`folder-${id}`);
              if (el && !el.classList.contains('dragging')) {
                el.classList.add('dragging');
                el.style.cursor = 'grabbing';
              }
            });
          }
          
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
          
          // Çoklu seçim varsa tüm seçili kartlara dragging class'ını ekle
          const folderId = element.id.replace('folder-', '');
          const totalSelected = (window.selectedNotes?.length || 0) + (window.selectedFolders?.length || 0);
          if (window.selectedFolders?.includes(folderId) && totalSelected > 1) {
            // Tüm seçili kartlara dragging class'ını ekle
            (window.selectedNotes || []).forEach(id => {
              const el = document.getElementById(`note-${id}`);
              if (el && !el.classList.contains('dragging')) {
                el.classList.add('dragging');
                el.style.cursor = 'grabbing';
              }
            });
            (window.selectedFolders || []).forEach(id => {
              const el = document.getElementById(`folder-${id}`);
              if (el && !el.classList.contains('dragging')) {
                el.classList.add('dragging');
                el.style.cursor = 'grabbing';
              }
            });
          }
          
          // Popup'ı gizle - drag başladığında (sadece notlar için popup var)
          if (hoveredCard === element && element.classList.contains('note')) {
            hideTitlePopup();
          }
        }
      }
    });


    // Tüm dragging kartları için drag fonksiyonunu çağır (notlar ve klasörler)
    const draggingNotes = document.querySelectorAll('.note.dragging');
    const draggingFolders = document.querySelectorAll('.folder-card.dragging');
    
    // Çoklu seçim kontrolü - eğer çoklu seçim varsa sadece bir kez moveSelectedCards çağır
    const totalSelected = (window.selectedNotes?.length || 0) + (window.selectedFolders?.length || 0);
    let hasMultiDrag = false;
    let multiDragDeltaX = 0;
    let multiDragDeltaY = 0;
    
    // İlk dragging kartı bul ve delta hesapla (sadece bir kez)
    // ÖNEMLİ: Çoklu drag sadece seçim içindeki bir kart sürüklendiğinde yapılmalı
    if (totalSelected > 1 && (draggingNotes.length > 0 || draggingFolders.length > 0)) {
      const firstDraggingElement = draggingNotes[0] || draggingFolders[0];
      if (firstDraggingElement && firstDraggingElement.dataset.dragStartX !== undefined) {
        // Sürüklenen kartın seçim içinde olup olmadığını kontrol et
        const draggingElementId = firstDraggingElement.id;
        const isDraggingNote = draggingElementId.startsWith('note-');
        const isDraggingFolder = draggingElementId.startsWith('folder-');
        
        let isInSelection = false;
        if (isDraggingNote) {
          const noteId = draggingElementId.replace('note-', '');
          isInSelection = window.selectedNotes?.includes(noteId) || false;
        } else if (isDraggingFolder) {
          const folderId = draggingElementId.replace('folder-', '');
          isInSelection = window.selectedFolders?.includes(folderId) || false;
        }
        
        // Sadece sürüklenen kart seçim içindeyse çoklu drag yap
        if (isInSelection) {
          const board = document.getElementById('board');
          const boardRect = board.getBoundingClientRect();
          const currentX = e.clientX - boardRect.left;
          const currentY = e.clientY - boardRect.top;
          const startX = parseFloat(firstDraggingElement.dataset.dragStartX || 0);
          const startY = parseFloat(firstDraggingElement.dataset.dragStartY || 0);
          multiDragDeltaX = currentX - startX;
          multiDragDeltaY = currentY - startY;
          hasMultiDrag = true;
        }
      }
    }
    
    // Çoklu seçim varsa sadece bir kez moveSelectedCards çağır
    if (hasMultiDrag && window.moveSelectedCards) {
      window.moveSelectedCards(multiDragDeltaX, multiDragDeltaY);
    } else {
      // Tek kart drag - notlar
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
          const startX = parseFloat(element.dataset.dragStartX || 0);
          const startY = parseFloat(element.dataset.dragStartY || 0);
          const initialNoteX = parseFloat(element.dataset.initialNoteX || 0);
          const initialNoteY = parseFloat(element.dataset.initialNoteY || 0);
          
          const deltaX = currentX - startX;
          const deltaY = currentY - startY;
          
          // Tek not için normal drag
          note.x = initialNoteX + deltaX / boardZoom;
          note.y = initialNoteY + deltaY / boardZoom;
          
          // Element pozisyonunu güncelle - transition'ı devre dışı bırak
          element.style.transition = 'none';
          element.style.left = note.x + 'px';
          element.style.top = note.y + 'px';
          element.style.transform = 'none';
          
          // Akıllı kaydetme - pozisyon değişikliğinde (throttle ile)
          if (!window._saveTimer) {
            window._saveTimer = setTimeout(() => {
              scheduleSave();
              window._saveTimer = null;
            }, 500);
          }
        }
      });
      
      // Tek kart drag - klasörler
      draggingFolders.forEach(element => {
        const folderId = element.id.replace('folder-', '');
        const folder = folders.find(f => f.id === folderId);
        if (folder) {
          // Popup'ı gizle - kart taşınırken popup gözükmesin
          if (hoveredCard === element && element.classList.contains('note')) {
            hideTitlePopup();
          }
          
          // Mouse koordinatlarını canvas koordinatlarına çevir
          const board = document.getElementById('board');
          const boardRect = board.getBoundingClientRect();
          const currentX = e.clientX - boardRect.left;
          const currentY = e.clientY - boardRect.top;
          const startX = parseFloat(element.dataset.dragStartX || 0);
          const startY = parseFloat(element.dataset.dragStartY || 0);
          const initialFolderX = parseFloat(element.dataset.initialFolderX || 0);
          const initialFolderY = parseFloat(element.dataset.initialFolderY || 0);
          
          const deltaX = currentX - startX;
          const deltaY = currentY - startY;
          
          // Tek klasör için normal drag
          folder.x = initialFolderX + deltaX / boardZoom;
          folder.y = initialFolderY + deltaY / boardZoom;
          
          // Element pozisyonunu güncelle - transition'ı devre dışı bırak
          element.style.transition = 'none';
          element.style.left = folder.x + 'px';
          element.style.top = folder.y + 'px';
          element.style.transform = 'none';
        }
      });
    }
    
    // Bağlantıları güncelle - throttle ile
    if (!hasMultiDrag && (draggingNotes.length > 0 || draggingFolders.length > 0)) {
      // Widget drag ediyorsa render etme
      if (window.widgetIsDragging) {
        return;
      }
      
      // Throttle ile bağlantıları güncelle
      if (!window._singleDragConnectionsTimer) {
        window._singleDragConnectionsTimer = requestAnimationFrame(() => {
          drawConnections();
          renderGraph();
          window._singleDragConnectionsTimer = null;
        });
      }
    }
  });
  
  document.addEventListener('mouseup', (e) => {
    // Sağ tık ise click handling yapma
    if (e.button === 2) return;
    
    // Selection box bitir
    if (window.endSelection) {
      window.endSelection();
    }
    
    // Tüm notları ve klasörleri kontrol et
    const allNotes = document.querySelectorAll('.note');
    const allFolders = document.querySelectorAll('.folder-card');
    
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
            
            // Çoklu seçim varsa seçimi temizle ve notu aç
            const totalSelected = (window.selectedNotes?.length || 0) + (window.selectedFolders?.length || 0);
            if (totalSelected > 0) {
              if (window.clearSelection) window.clearSelection();
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
      element.style.transition = ''; // Transition'ı geri aç (animasyonları koru)
      
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
      element.style.transition = ''; // Transition'ı geri aç (animasyonları koru)
      
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
    
    // Multi-drag timer'ları temizle
    if (window._multiDragSaveTimer) {
      clearTimeout(window._multiDragSaveTimer);
      window._multiDragSaveTimer = null;
    }
    if (window._multiDragConnectionsTimer) {
      cancelAnimationFrame(window._multiDragConnectionsTimer);
      window._multiDragConnectionsTimer = null;
    }
    if (window._singleDragConnectionsTimer) {
      cancelAnimationFrame(window._singleDragConnectionsTimer);
      window._singleDragConnectionsTimer = null;
    }
    
    // Bağlantıları son kez güncelle (drag bittiğinde)
    if (draggingNotes.length > 0 || draggingFolders.length > 0) {
      // Widget drag ediyorsa render etme
      if (!window.widgetIsDragging) {
        drawConnections();
        renderGraph();
      }
    }
  });
  
  // Resize event'i - board boyutunu güncelle
  window.addEventListener('resize', () => {
    // Board boyutunu güncelle (sonsuz board için)
    if (window.updateBoardSize) window.updateBoardSize();
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
