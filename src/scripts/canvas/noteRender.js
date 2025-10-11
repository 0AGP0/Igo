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
  const VIEWPORT_BUFFER = window.VIEWPORT_BUFFER || 800;
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
  
  // Viewport sınırlarını hesapla (buffer zone ile)
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

// Anında render fonksiyonu - UI güncellemeleri için (yeni kart ekleme)
function renderNotesImmediate() {
  // Timeout'u iptal et
  if (_renderNotesTimeout) {
    clearTimeout(_renderNotesTimeout);
    _renderNotesTimeout = null;
  }
  
  // Yeni kart ekleme - animasyon olsun
  _isViewportChange = false;
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
  
  // Her 5. viewport değişikliğinde render et (performans için)
  if (_viewportRenderCount % 5 !== 0) {
    console.log('⏭️ Viewport render atlandı (performans için)');
    return;
  }
  
  // Viewport değişikliği kontrolü - gereksiz render'ları engelle
  const currentViewport = getViewportBounds();
  
  // Eğer viewport çok fazla değişmemişse render etme
  if (_lastViewportBounds && 
      Math.abs(currentViewport.left - _lastViewportBounds.left) < 150 &&
      Math.abs(currentViewport.top - _lastViewportBounds.top) < 150 &&
      Math.abs(currentViewport.right - _lastViewportBounds.right) < 150 &&
      Math.abs(currentViewport.bottom - _lastViewportBounds.bottom) < 150) {
    console.log('⏭️ Viewport değişikliği çok küçük, render atlanıyor');
    return;
  }
  
  // Viewport değişikliği - animasyon olmasın
  _isViewportChange = true;
  _lastViewportBounds = currentViewport;
  renderNotesInternal();
}

// Ana render fonksiyonu
function renderNotesInternal() {
  const board = document.getElementById('board');
  const notes = window.notes || [];
  const folders = window.folders || [];
  const state = window.getState();
  
  console.log(`📊 renderNotesInternal: ${notes.length} not mevcut`);
  
  // Sadece not kartlarını temizle, todo kartlarını bırak
  document.querySelectorAll('.note').forEach(note => note.remove());
  
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
  
  // Viewport-based rendering: Sadece görünür kartları al
  let visibleNotes = getVisibleCards().filter(note => 
    filteredNotes.includes(note)
  );
  
  // İlk yüklemede viewport filtering çalışmazsa tüm notları göster
  if (visibleNotes.length === 0 && filteredNotes.length > 0) {
    console.log('⚠️ Viewport boş, tüm notları gösteriliyor (ilk yükleme)');
    visibleNotes = filteredNotes;
  }
  
  console.log(`🎯 Viewport rendering: ${visibleNotes.length}/${filteredNotes.length} kart görünür`);
  
  // Notları board üzerinde konumlandır
  visibleNotes.forEach((note, index) => {
    // Pozisyon hesapla
    let x, y;
    if (note.x !== undefined && note.y !== undefined) {
      // Kaydedilmiş pozisyon varsa kullan
      x = note.x;
      y = note.y;
    } else {
      // Klasöre göre pozisyonlandır
      const folder = folders.find(f => f.id === note.folderId);
      if (folder && folder.x !== undefined && folder.y !== undefined) {
        // Klasör varsa onun altına yerleştir
        const folderNotes = filteredNotes.filter(n => n.folderId === note.folderId);
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
            const folderNotes = notes.filter(note => note.folderId === folder.id);
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
    
    // Not içeriğini render et
    const renderedContent = window.renderMarkdown ? window.renderMarkdown(note.text) : note.text;
    
    // Not boyutlarını ayarla (özel boyut varsa kullan, yoksa içeriğe göre)
    let noteWidth = 280;
    let noteHeight = window.getNoteHeight ? window.getNoteHeight(note) : 200;
    
    if (note.customWidth) {
      noteWidth = note.customWidth;
    }
    if (note.customHeight) {
      noteHeight = note.customHeight;
    }
    
    // Sabit genişlik kullan
    const dynamicWidth = noteWidth;
    const dynamicHeight = noteHeight;
    
    // Kart elementini oluştur
    const noteCard = document.createElement('div');
    noteCard.className = `note ${state.selectedNote === note.id ? 'selected' : ''}`;
    noteCard.id = `note-${note.id}`;
    noteCard.style.left = x + 'px';
    noteCard.style.top = y + 'px';
    noteCard.style.width = dynamicWidth + 'px';
    noteCard.style.height = dynamicHeight + 'px';
    noteCard.style.transform = 'none'; // Transform'u sıfırla
    
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
    
    // Klasör rengini uygula
    if (note.folderId) {
      const folder = folders.find(f => f.id === note.folderId);
      if (folder && folder.color) {
        noteCard.style.borderLeft = `4px solid ${folder.color}`;
        noteCard.style.boxShadow = `0 2px 8px ${folder.color}20, 0 0 0 1px ${folder.color}15`;
        noteCard.classList.add('has-folder');
        
        const titleElement = noteCard.querySelector('.head .title');
        if (titleElement) {
          titleElement.style.color = folder.color;
          titleElement.style.fontWeight = '600';
        }
      }
    } else {
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
  
  // Todo kartlarını render et (eğer todo sistemi varsa)
  if (window.todoManager && window.todoManager.renderCanvasTodos) {
    window.todoManager.renderCanvasTodos();
  }
  
  // Bağlantıları çiz - DOM render tamamlandıktan sonra
  setTimeout(() => {
    if (window.drawConnections) window.drawConnections();
  }, 100);
  
  // Board boyutunu güncelle
  if (window.updateBoardSize) window.updateBoardSize();
  
  // Pozisyonlar zaten yüklendi - tekrar kaydetmeye gerek yok
  
  // Minimap'i güncelle
  if (window.renderGraph) window.renderGraph();
  
  // Not listesini güncelle
  if (window.renderNoteList) window.renderNoteList();
  
  // Checkbox event listener'larını ekle
  document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
    checkbox.onclick = (e) => {
      e.stopPropagation(); // Not açılmasını engelle
      
      // Hangi nota ait olduğunu bul
      const noteElement = checkbox.closest('.note');
      if (!noteElement) return;
      
      const noteId = noteElement.id.replace('note-', '');
      const note = window.notes.find(n => n.id === noteId);
      if (!note) return;
      
      // Checkbox'ın metnini bul
      const checkboxText = checkbox.nextElementSibling.textContent;
      
      // Not metninde bu checkbox'ı bul ve güncelle
      let newText = note.text;
      if (checkbox.checked) {
        // Boş checkbox'ı işaretli yap
        const escapeRegex = window.escapeRegex || ((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        newText = newText.replace(
          new RegExp(`^(\\s*)-\\s*\\[\\s*\\]\\s*${escapeRegex(checkboxText)}`, 'm'),
          '$1- [x] ' + checkboxText
        );
      } else {
        // İşaretli checkbox'ı boş yap
        const escapeRegex = window.escapeRegex || ((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        newText = newText.replace(
          new RegExp(`^(\\s*)-\\s*\\[x\\]\\s*${escapeRegex(checkboxText)}`, 'mi'),
          '$1- [ ] ' + checkboxText
        );
      }
      
      // Notu güncelle
      if (window.updateNote) window.updateNote(noteId, note.title, newText);
    };
  });
}

// Global exports
window.renderNotes = renderNotes;
window.renderNotesImmediate = renderNotesImmediate;
window.renderNotesForViewport = renderNotesForViewport;
window.getViewportBounds = getViewportBounds;
window.isCardInViewport = isCardInViewport;
window.getVisibleCards = getVisibleCards;
window.renderNotesInternal = renderNotesInternal;

console.log('📝 Note Render System yüklendi');

