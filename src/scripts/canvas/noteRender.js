// ===== NOTE RENDER SYSTEM =====
// Board üzerindeki not kartlarının render edilmesi

// Render state değişkenleri - Local (noteRender modülüne özel)
let _renderNotesTimeout = null;
let _isViewportChange = false;
let _renderedCardIds = new Set();
let _viewportRenderCount = 0;
let _lastViewportBounds = null;

// Debounced render fonksiyonu
function renderNotes() {
  // Widget drag ediyorsa render etme
  if (window.widgetIsDragging) {
    console.log('⏭️ Widget drag aktif - render atlandı');
    return;
  }
  
  // Önceki timeout'u iptal et
  if (_renderNotesTimeout) {
    clearTimeout(_renderNotesTimeout);
  }
  
  // 200ms sonra render et (debounce) - performans için optimize
  _renderNotesTimeout = setTimeout(() => {
    renderNotesInternal();
    _renderNotesTimeout = null;
  }, 200);
}

// Viewport hesaplama
function getViewportBounds() {
  // SONSUZ BOARD - Viewport buffer'ı çok büyük yap
  const VIEWPORT_BUFFER = window.VIEWPORT_BUFFER || 50000; // Çok büyük buffer - tüm kartları göster
  const board = document.getElementById('board');
  const boardRect = board.getBoundingClientRect();
  const transform = board.style.transform;
  
  // Transform'dan pan değerlerini çıkar
  let panX = 0, panY = 0, scale = 1;
  if (transform && transform !== 'none') {
    const matches = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    if (matches) {
      panX = parseFloat(matches[1]);
      panY = parseFloat(matches[2]);
    }
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      scale = parseFloat(scaleMatch[1]);
    }
  }
  
  // Viewport sınırlarını hesapla (çok büyük buffer zone ile - SONSUZ BOARD)
  const viewport = {
    left: (-panX / scale) - VIEWPORT_BUFFER,
    right: (-panX / scale) + (window.innerWidth / scale) + VIEWPORT_BUFFER,
    top: (-panY / scale) - VIEWPORT_BUFFER,
    bottom: (-panY / scale) + (window.innerHeight / scale) + VIEWPORT_BUFFER
  };
  
  return viewport;
}

function isCardInViewport(note, viewport) {
  if (!note.x || !note.y) return false;
  
  const cardWidth = note.customWidth || 280;
  const cardHeight = note.customHeight || 120;
  
  return note.x + cardWidth >= viewport.left &&
         note.x <= viewport.right &&
         note.y + cardHeight >= viewport.top &&
         note.y <= viewport.bottom;
}

function getVisibleCards() {
  const viewport = getViewportBounds();
  return window.notes.filter(note => isCardInViewport(note, viewport));
}

// Anında render fonksiyonu - UI güncellemeleri için (yeni kart ekleme, filtreleme, arama)
function renderNotesImmediate(forceViewportChange) {
  // Timeout'u iptal et
  if (_renderNotesTimeout) {
    clearTimeout(_renderNotesTimeout);
    _renderNotesTimeout = null;
  }
  
  // Eğer forceViewportChange parametresi verilmişse, onu kullan
  if (forceViewportChange !== undefined) {
    _isViewportChange = forceViewportChange;
  } else {
    // Filtreleme ve arama için animasyon olmasın, anında render
    const state = window.getState();
    const isFiltering = (state.searchQuery && state.searchQuery.trim() !== '') || 
                        (state.activeTagFilters && state.activeTagFilters.length > 0);
    
    if (isFiltering) {
      // Filtreleme yapılıyorsa viewport değişikliği gibi davran (animasyon olmadan)
      _isViewportChange = true;
    } else {
      // Yeni kart ekleme - animasyon olsun
      _isViewportChange = false;
    }
  }
  
  renderNotesInternal();
}

// Viewport değişikliği render fonksiyonu - animasyon olmasın
function renderNotesForViewport() {
  // Timeout'u iptal et
  if (_renderNotesTimeout) {
    clearTimeout(_renderNotesTimeout);
    _renderNotesTimeout = null;
  }
  
  // Performans için viewport render'ını sınırla
  _viewportRenderCount++;
  
  // Her 3. viewport değişikliğinde render et (performans için) - daha sık render
  if (_viewportRenderCount % 3 !== 0) {
    console.log('⏭️ Viewport render atlandı (performans için)');
    return;
  }
  
  // Viewport değişikliği kontrolü - gereksiz render'ları engelle
  const currentViewport = getViewportBounds();
  
  // Eğer viewport çok fazla değişmemişse render etme - daha hassas kontrol
  if (_lastViewportBounds && 
      Math.abs(currentViewport.left - _lastViewportBounds.left) < 100 &&
      Math.abs(currentViewport.top - _lastViewportBounds.top) < 100 &&
      Math.abs(currentViewport.right - _lastViewportBounds.right) < 100 &&
      Math.abs(currentViewport.bottom - _lastViewportBounds.bottom) < 100) {
    console.log('⏭️ Viewport değişikliği çok küçük, render atlanıyor');
    return;
  }
  
  // Viewport değişikliği - animasyon olmasın
  _isViewportChange = true;
  _lastViewportBounds = currentViewport;
  
  console.log('🔄 Viewport değişikliği algılandı, kartlar yeniden render ediliyor');
  renderNotesInternal();
}

// Ana render fonksiyonu
function renderNotesInternal() {
  // Widget drag ediyorsa render etme
  if (window.widgetIsDragging) {
    console.log('⏭️ Widget drag aktif - render atlandı');
    return;
  }
  
  const board = document.getElementById('board');
  const notes = window.notes || [];
  const folders = window.folders || [];
  const state = window.getState();
  
  console.log(`📊 renderNotesInternal: ${notes.length} not mevcut`);
  
  // Önce bağlantı çizgilerini anında temizle (filtreleme için)
  const existingLines = document.querySelectorAll('.connection-line, .connection-label');
  existingLines.forEach(line => {
    // Animasyon olmadan anında kaldır
    line.style.display = 'none';
    line.remove();
  });
  
  // Not kartlarını anında temizle (animasyon olmadan)
  document.querySelectorAll('.note').forEach(note => {
    // Animasyon olmadan anında kaldır
    note.style.display = 'none';
    note.remove();
  });
  
  // Render edilen kartları temizle (viewport değişikliğinde)
  if (_isViewportChange) {
    _renderedCardIds.clear();
  }
  
  // Önce bağlantı çizgilerini çiz (en altta olması için)
  // Bu boş geçer, sonra güncellenecek
  
  // Sonra klasörleri render et
  if (window.renderFoldersOnBoard) window.renderFoldersOnBoard();
  
  // state.js'den gelen notes değişkenini kullan
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
  
  // SONSUZ BOARD - Viewport filtering'i kaldır, tüm kartları göster
  // Viewport-based rendering: TÜM kartları göster (sonsuz board için)
  let visibleNotes = filteredNotes; // Viewport filtering yok - tüm kartları göster
  
  console.log(`🎯 SONSUZ BOARD rendering: ${visibleNotes.length}/${filteredNotes.length} kart görünür (tümü)`);
  
  // Notları board üzerinde konumlandır
  visibleNotes.forEach((note, index) => {
    // Pozisyon hesapla
    let x, y;
    if (note.x !== undefined && note.y !== undefined) {
      // Kaydedilmiş pozisyon varsa kullan - ama önce geçerliliğini kontrol et
      const INFINITE_SIZE = 1000000;
      const MIN_X = 0;
      const MIN_Y = 0;
      const MAX_X = INFINITE_SIZE;
      const MAX_Y = INFINITE_SIZE;
      
      const noteWidth = note.customWidth || 280;
      const noteHeight = note.customHeight || (window.getNoteHeight ? window.getNoteHeight(note) : 200);
      
      // Pozisyonun düzlem sınırları içinde olup olmadığını kontrol et
      const isValidX = note.x >= MIN_X && (note.x + noteWidth) <= MAX_X;
      const isValidY = note.y >= MIN_Y && (note.y + noteHeight) <= MAX_Y;
      
      if (isValidX && isValidY) {
        // Geçerli pozisyon, kullan
        x = note.x;
        y = note.y;
      } else {
        // Geçersiz pozisyon, merkeze al ve notu güncelle
        console.warn(`⚠️ "${note.title}" geçersiz pozisyonda render sırasında, merkeze alınıyor: (${note.x}, ${note.y})`);
        const boardCenterX = INFINITE_SIZE / 2;
        const boardCenterY = INFINITE_SIZE / 2;
        x = boardCenterX - noteWidth / 2;
        y = boardCenterY - noteHeight / 2;
        // Notun pozisyonunu güncelle
        note.x = x;
        note.y = y;
        // Pozisyonu kaydet
        if (window.saveNotePositions) {
          setTimeout(() => {
            if (window.saveNotePositions) window.saveNotePositions();
          }, 100);
        }
      }
    } else {
        // Klasöre göre pozisyonlandır - genel eşleştirme fonksiyonu kullan
        const folder = window.findFolderForNote ? window.findFolderForNote(note.folderId, folders) : folders.find(f => f.id === note.folderId);
      if (folder && folder.x !== undefined && folder.y !== undefined) {
        // Klasör varsa onun altına yerleştir
          // Klasör ID eşleştirmesi - genel fonksiyon kullan
          const folderNotes = filteredNotes.filter(n => {
            if (window.doesNoteMatchFolder) {
              return window.doesNoteMatchFolder(n.folderId, folder.id, folder);
            }
            // Fallback
            return n.folderId === folder.id;
          });
        const noteIndexInFolder = folderNotes.indexOf(note);
        const notesPerRow = 2; // Her satırda 2 not
        const row = Math.floor(noteIndexInFolder / notesPerRow);
        const col = noteIndexInFolder % notesPerRow;
        
        x = folder.x + col * 300; // Yan yana notlar
        y = folder.y + 120 + row * 180; // Klasörün altında
      } else {
        // Klasörsüz notlar veya klasör pozisyonu yoksa
        const orphanNotes = filteredNotes.filter(n => !n.folderId);
        const orphanIndex = orphanNotes.indexOf(note);
        if (orphanIndex >= 0) {
          // Klasörsüz notları sağ alt köşeye yerleştir
          const cols = Math.ceil(Math.sqrt(orphanNotes.length));
          const row = Math.floor(orphanIndex / cols);
          const col = orphanIndex % cols;
          // Filtrelenmiş klasör sayısını kullan
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
          x = 400 + filteredFolders.length * 200 + col * 300;
          y = 300 + row * 180;
        } else {
          // Varsayılan grid
          const cols = Math.ceil(Math.sqrt(filteredNotes.length));
          const row = Math.floor(index / cols);
          const col = index % cols;
          x = 50 + col * 280;
          y = 50 + row * 160;
        }
      }
      // Pozisyonu kaydet - SADECE YENİ NOTLAR İÇİN
      note.x = x;
      note.y = y;
    }
    
    // BASİT ÇÖZÜM: Not içinde ne varsa kartta da öyle göster!
    // Resimleri çıkarmadan direkt render et
    let textForRender = note.text || note.markdownContent || '';
    
    // Not içeriğini render et (resimler dahil, olduğu gibi)
    let renderedContent = window.renderMarkdown ? window.renderMarkdown(textForRender) : textForRender;
    
    // Not boyutlarını ayarla (özel boyut varsa kullan, yoksa içeriğe göre)
    let noteWidth = 280;
    let noteHeight = window.getNoteHeight ? window.getNoteHeight(note) : 200;
    
    if (note.customWidth) {
      noteWidth = note.customWidth;
    } else {
      // Başlık genişliğine göre minimum genişlik hesapla ve uygula
      if (window.calculateMinWidthForNote) {
        const minWidth = window.calculateMinWidthForNote(note);
        if (minWidth && isFinite(minWidth)) {
          noteWidth = Math.max(noteWidth || 280, minWidth);
        }
      }
      
      // Daha önce hesaplanan genişlik varsa kullan, yoksa bu render'da belirle
      if (note.width && note.width > noteWidth) {
        noteWidth = note.width;
      } else {
        note.width = noteWidth;
      }
    }
    if (note.customHeight) {
      noteHeight = note.customHeight;
    }
    
    // Hesaplanan genişliği kullan
    const dynamicWidth = noteWidth;
    const dynamicHeight = noteHeight;
    
    // Kart elementini oluştur
    const noteCard = document.createElement('div');
    let className = `note ${state.selectedNote === note.id ? 'selected' : ''}`;
    noteCard.className = className;
    noteCard.id = `note-${note.id}`;
    noteCard.style.left = x + 'px';
    noteCard.style.top = y + 'px';
    noteCard.style.width = dynamicWidth + 'px';
    noteCard.style.height = dynamicHeight + 'px';
    noteCard.style.transform = 'none'; // Transform'u sıfırla
    
    // Filtreleme yapılıyorsa animasyonları devre dışı bırak (hızlı kaybolsunlar)
    if (_isViewportChange) {
      noteCard.style.transition = 'none';
      noteCard.style.animation = 'none';
    }
    
    // Kart içeriğini oluştur
    noteCard.innerHTML = `
      <div class="head">
        <div class="title">${window.highlightText ? window.highlightText(note.title, state.searchQuery) : note.title}</div>
      </div>
      <div class="body">
        ${`<div class="snippet">${renderedContent}</div>`}
      </div>
      <div class="tags">
        ${note.tags.slice(0, 4).map(tag => `<span class="tagtok">#${tag}</span>`).join('')}
      </div>
      <div class="resize" title="Boyutlandır">⋰</div>
    `;
    
    // Başlık genişliğini render sonrası kontrol et ve kart genişliğini ayarla
    if (!note.customWidth) {
      setTimeout(() => {
        const titleElement = noteCard.querySelector('.title');
        if (!titleElement) return;
        
        const titleWidth = titleElement.scrollWidth;
        const cardWidth = noteCard.offsetWidth;
        const padding = 24;
        const requiredWidth = titleWidth + padding;
        
        if (requiredWidth > cardWidth) {
          noteCard.style.width = requiredWidth + 'px';
          if (!note.customWidth) {
            note.width = requiredWidth;
            if (typeof window.saveNotePositions === 'function') {
              window.saveNotePositions();
            }
          }
        } else if (!note.customWidth && note.width !== cardWidth) {
          note.width = cardWidth;
          if (typeof window.saveNotePositions === 'function') {
            window.saveNotePositions();
          }
        }
      }, 32);
    }
    
    // Resimler zaten render edilmiş içerikte görünür, ek bir preview eklemeye gerek yok
    
    // Klasör rengini uygula - findFolderForNote ile eski/yeni format uyumluluğu
    let noteFolder = null;
    if (note.folderId) {
      // findFolderForNote fonksiyonu varsa kullan (en güvenilir yöntem)
      if (window.findFolderForNote) {
        noteFolder = window.findFolderForNote(note.folderId, folders);
      }
      
      // Fallback: Önce direkt klasör ID'si ile dene
      if (!noteFolder) {
        noteFolder = folders.find(f => f.id === note.folderId);
      }
      
      // Eğer hala bulunamadıysa, doesNoteMatchFolder ile tüm klasörleri kontrol et
      if (!noteFolder && window.doesNoteMatchFolder) {
        noteFolder = folders.find(f => window.doesNoteMatchFolder(note.folderId, f.id, f));
      }
    }
    
    if (noteFolder && noteFolder.color) {
      noteCard.style.borderLeft = `4px solid ${noteFolder.color}`;
      noteCard.style.boxShadow = `0 2px 8px ${noteFolder.color}20, 0 0 0 1px ${noteFolder.color}15`;
        noteCard.classList.add('has-folder');
        
        const titleElement = noteCard.querySelector('.head .title');
        if (titleElement) {
        titleElement.style.color = noteFolder.color;
          titleElement.style.fontWeight = '600';
      }
    } else if (!note.folderId) {
      // Klasörsüz notlar için özel stil
      console.log('🔘 Klasörsüz not için varsayılan stil uygulanıyor:', note.title);
      
      const existingLeftBorder = noteCard.style.borderLeft;
      if (!existingLeftBorder || existingLeftBorder === '') {
        noteCard.style.borderLeft = '4px solid #6b7280';
        console.log('✅ Gri çizgi eklendi');
      }
      
      if (!noteCard.classList.contains('orphan-note')) {
        noteCard.classList.add('orphan-note');
        console.log('✅ CSS class eklendi: orphan-note');
      }
      
      const titleElement = noteCard.querySelector('.head .title');
      if (titleElement) {
        titleElement.style.color = `var(--text)`;
        titleElement.style.fontWeight = '500';
      }
    }
    
    // Sağ tık menüsü ekle
    noteCard.oncontextmenu = (e) => {
      console.log('🖱️ Sağ tık algılandı:', note.id);
      if (window.showContextMenu) window.showContextMenu(e, note.id);
    };
    
    // Wikilink eventleri ekle
    noteCard.querySelectorAll('.wikilink').forEach(wikilink => {
      wikilink.addEventListener('click', (e) => {
        e.stopPropagation();
        const linkName = wikilink.getAttribute('data-link') || wikilink.textContent.replace(/\[\[|\]\]/g, '');
        const targetNote = window.notes.find(n => n.title.toLowerCase() === linkName.toLowerCase());
        if (targetNote) {
          if (window.selectNote) window.selectNote(targetNote.id);
          if (window.centerOnNote) window.centerOnNote(targetNote.id);
        } else {
          // Not bulunamadı, yeni not oluştur
          if (window.openNotePanel) window.openNotePanel();
          setTimeout(() => {
            if (window.notePanelEditor) {
              window.notePanelEditor.setData(`# ${linkName}\n\nBu not henüz oluşturulmamış. İçeriğini buraya yazabilirsiniz.`);
            }
          }, 100);
        }
      });
    });
    
    // Animasyonu sadece yeni kartlar için uygula
    const isNewCard = !_renderedCardIds.has(note.id);
    
    if (isNewCard && !_isViewportChange) {
      // Yeni kart - animasyon olsun
      noteCard.style.opacity = '0';
      noteCard.style.transform = 'scale(0.95)';
      
      board.appendChild(noteCard);
      
      // Draggable & Resizable yap
      if (window.makeDraggable) window.makeDraggable(noteCard, note.id);
      if (window.makeResizable) window.makeResizable(noteCard, note.id);
      
      // Fade-in animasyonu
      requestAnimationFrame(() => {
        noteCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        noteCard.style.opacity = '1';
        noteCard.style.transform = 'scale(1)';
      });
    } else {
      // Mevcut kart veya viewport değişikliği - animasyon olmasın
      noteCard.style.opacity = '1';
      noteCard.style.transform = 'scale(1)';
      noteCard.style.transition = 'none';
      
      board.appendChild(noteCard);
      
      // Draggable & Resizable yap
      if (window.makeDraggable) window.makeDraggable(noteCard, note.id);
      if (window.makeResizable) window.makeResizable(noteCard, note.id);
    }
    
    // Render edilen kartları takip et
    _renderedCardIds.add(note.id);
  });
  
  // Birleşik bağlantı sistemi çalışıyor (drawConnections içinde)
  
  
  // Bağlantıları çiz - DOM render tamamlandıktan sonra
  setTimeout(() => {
    if (window.drawConnections) window.drawConnections();
  }, 100);
  
  // Board boyutunu güncelle
  if (window.updateBoardSize) window.updateBoardSize();
  
  // Tüm notların pozisyonlarını kontrol et ve geçersiz olanları düzelt
  const INFINITE_SIZE = 1000000;
  const MIN_X = 0;
  const MIN_Y = 0;
  const MAX_X = INFINITE_SIZE;
  const MAX_Y = INFINITE_SIZE;
  
  let fixedPositions = 0;
  notes.forEach(note => {
    if (note.x !== undefined && note.y !== undefined) {
      const noteWidth = note.customWidth || 280;
      const noteHeight = note.customHeight || (window.getNoteHeight ? window.getNoteHeight(note) : 200);
      
      const isValidX = note.x >= MIN_X && (note.x + noteWidth) <= MAX_X;
      const isValidY = note.y >= MIN_Y && (note.y + noteHeight) <= MAX_Y;
      
      if (!isValidX || !isValidY) {
        // Geçersiz pozisyon, merkeze al
        fixedPositions++;
        console.warn(`⚠️ "${note.title}" render sonrası geçersiz pozisyonda, merkeze alınıyor: (${note.x}, ${note.y})`);
        
        const boardCenterX = INFINITE_SIZE / 2;
        const boardCenterY = INFINITE_SIZE / 2;
        note.x = boardCenterX - noteWidth / 2;
        note.y = boardCenterY - noteHeight / 2;
        
        // DOM elementini güncelle
        const element = document.getElementById(`note-${note.id}`);
        if (element) {
          element.style.left = note.x + 'px';
          element.style.top = note.y + 'px';
        }
        
        // Pozisyonu kaydet
        if (window.saveNotePositions) {
          setTimeout(() => {
            if (window.saveNotePositions) window.saveNotePositions();
          }, 100);
        }
      }
    }
  });
  
  if (fixedPositions > 0) {
    console.log(`🔧 Render sonrası ${fixedPositions} not düzlemin dışındaydı, merkeze alındı`);
  }
  
  // Pozisyonlar zaten yüklendi - tekrar kaydetmeye gerek yok
  
  // Minimap'i güncelle
  if (window.renderGraph) window.renderGraph();
  
  // Not listesini güncelle
  if (window.renderNoteList) window.renderNoteList();
  
  // Checkbox event listener'larını ekle - KARTTA DEVREDİŞ
  document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
    checkbox.onclick = (e) => {
      e.stopPropagation(); // Not açılmasını engelle
      e.preventDefault(); // Checkbox değişikliğini engelle
      
      // Kart üzerinde checkbox'ları devre dışı bırak
      console.log('⚠️ Kart üzerinde checkbox değiştirilemez, not içinde kullanın');
    };
    
    // Checkbox'ları görsel olarak devre dışı göster
    checkbox.style.cursor = 'default';
    checkbox.style.pointerEvents = 'none';
  });
  
}

// Viewport change flag'ini set etmek için helper fonksiyon
function setViewportChange(value) {
  _isViewportChange = value;
}

// Global exports
window.renderNotes = renderNotes;
window.renderNotesImmediate = renderNotesImmediate;
window.renderNotesForViewport = renderNotesForViewport;
window.setViewportChange = setViewportChange;
window.getViewportBounds = getViewportBounds;
window.isCardInViewport = isCardInViewport;
window.getVisibleCards = getVisibleCards;
window.renderNotesInternal = renderNotesInternal;

console.log('📝 Note Render System yüklendi');

