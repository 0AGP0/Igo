// ===== NOTE MANAGER =====
// Not CRUD işlemleri

function createNote(folderId = null) {
  // Popup'ı gizle - yeni not oluşturulurken
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  // Sadece not panelini aç, not oluşturma işlemi kaydetme sırasında yapılacak
  // Yeni not için null geç ki eski içerik gelmesin
  if (window.openNotePanel) window.openNotePanel(null);
}

// Belirli bir klasörde not oluştur
function createNoteInFolder(folderId) {
  // Popup'ı gizle - yeni not oluşturulurken
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  // Context menu'yu gizle
  if (window.hideContextMenu) window.hideContextMenu();
  
  const folders = window.folders || [];
  const folder = folders.find(f => f.id === folderId);
  if (!folder) {
    console.log('❌ Klasör bulunamadı:', folderId);
    return;
  }
  
  console.log('📝 Klasörde not oluşturuluyor:', folder.name);
  
  // Not panelini aç ve klasör ID'sini kaydet
  window.pendingNoteFolderId = folderId;
  if (window.openNotePanel) window.openNotePanel(null);
}

function updateNote(id, title, text) {
  const notes = window.notes || [];
  const note = notes.find(n => n.id === id);
  if (note) {
    const oldTitle = note.title;
    const oldText = note.text;
    const oldFileName = note.fileName;
    
    // Not verilerini güncelle
    note.title = title;
    note.text = text;
    note.updatedAt = new Date().toISOString();
    note.tags = window.parseTags ? window.parseTags(text) : [];
    note.links = window.parseWikilinks ? window.parseWikilinks(text) : [];
    
    // Dosya adı güncelle (başlık değiştiyse)
    if (oldTitle !== title) {
      // Dosya adı oluştur - güvenli karakterler kullan (boşlukları koru)
      const safeTitle = title.replace(/[<>:"/\\|?*]/g, '').trim(); // Sadece geçersiz karakterleri temizle, boşlukları koru
      note.fileName = (safeTitle || 'Basliksiz Not') + (note.fileName?.endsWith('.md') || note.fileName?.endsWith('.txt') ? note.fileName.substring(note.fileName.lastIndexOf('.')) : '.md');
      console.log(`📝 Başlık değişti: "${oldTitle}" → "${title}"`);
      console.log(`📁 Dosya adı değişti: "${oldFileName}" → "${note.fileName}"`);
    }
    
    // Not kartının görünümünü güncelle
    const noteElement = document.getElementById(`note-${id}`);
    if (noteElement) {
      // Başlığı güncelle - sadece bu not kartındaki title'ı güncelle
      const titleElement = noteElement.querySelector('.head .title');
      if (titleElement) {
        const oldTitle = titleElement.textContent;
        titleElement.textContent = title;
        console.log(`✅ Not başlığı güncellendi: ${id}`);
        console.log(`   Eski başlık: "${oldTitle}"`);
        console.log(`   Yeni başlık: "${title}"`);
        console.log(`   Element ID: ${noteElement.id}`);
      } else {
        console.error(`❌ Title elementi bulunamadı: ${id}`);
        console.error(`   Note element:`, noteElement);
        console.error(`   Note element HTML:`, noteElement.innerHTML.substring(0, 200));
      }
      
      // İçeriği güncelle
      const snippetElement = noteElement.querySelector('.snippet');
      if (snippetElement) {
        const renderedContent = window.renderMarkdown ? window.renderMarkdown(text) : text;
        snippetElement.innerHTML = renderedContent;
      }
      
      // Etiketleri güncelle
      const tagsElement = noteElement.querySelector('.tags');
      if (tagsElement) {
        const updatedTags = window.parseTags ? window.parseTags(text) : [];
        tagsElement.innerHTML = updatedTags.slice(0, 4).map(tag => `<span class="tagtok">#${tag}</span>`).join('');
      }
    }
    
    // Dinamik güncellemeler
    if (window.renderTags) window.renderTags(); // Etiketler panelini güncelle
    if (window.renderGraph) window.renderGraph();
    setTimeout(() => {
      if (window.drawConnections) window.drawConnections(); // Bağlantı çizgilerini yeniden çiz
    }, 100);
    
    // Dosyayı kaydet (başlık veya içerik değiştiyse)
    if (oldTitle !== title || oldText !== text) {
      console.log('📝 Not değişti, dosyayı kaydediliyor...');
      if (window.saveNoteToFile) window.saveNoteToFile(note);
    }
    
    // window.notes'u güncelle
    window.notes = notes;
    
    // Güncellenmiş not objesini döndür
    return note;
  }
  return null;
}

function deleteNote(id) {
  const notes = window.notes || [];
  const note = notes.find(n => n.id === id);
  if (!note) return;
  
  // Modal'ı aç
  const state = window.getState();
  state.noteToDelete = id;
  window.setState(state);
  
  const deleteModalOverlay = document.getElementById('deleteModalOverlay');
  const deleteModalNoteTitle = document.getElementById('deleteModalNoteTitle');
  
  deleteModalNoteTitle.textContent = note.title || 'Başlıksız Not';
  deleteModalOverlay.classList.add('active');
}

function selectNote(id) {
  // Yeni utility fonksiyonunu kullan
  if (window.SelectionManager) {
    window.SelectionManager.selectItem('note', id);
  }
  
  if (window.renderNotes) window.renderNotes();
  if (window.renderGraph) window.renderGraph();
  if (window.renderNoteList) window.renderNoteList();
  if (window.renderFolderList) window.renderFolderList();
  
  if (id) {
    const notes = window.notes || [];
    const note = notes.find(n => n.id === id);
    if (note) {
      const titleInput = document.getElementById('titleIn');
      const bodyInput = document.getElementById('bodyIn');
      
      if (titleInput) {
        titleInput.value = note.title;
      }
      
      if (bodyInput) {
        bodyInput.value = note.text;
      }
      
      if (window.renderPreview) window.renderPreview();
    }
  }
}

// Not düzenleme fonksiyonu
function editNote(noteId) {
  // Popup'ı gizle - not düzenleme başlarken
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  selectNote(noteId);
  if (window.openNotePanel) window.openNotePanel(noteId); // Doğrudan noteId'yi geç
}

// Delete modal fonksiyonları
function closeDeleteModal() {
  const deleteModalOverlay = document.getElementById('deleteModalOverlay');
  deleteModalOverlay.classList.remove('active');
  const state = window.getState();
  state.noteToDelete = null;
  window.setState(state);
}

function confirmDeleteNote() {
  const state = window.getState();
  const noteToDelete = state.noteToDelete;
  
  if (noteToDelete) {
    const notes = window.notes || [];
    // Silinecek notu bul
    const noteToDeleteObj = notes.find(n => n.id === noteToDelete);
    
    // Notun içeriğindeki media dosyalarını sil
    if (noteToDeleteObj) {
      deleteNoteMediaFiles(noteToDeleteObj);
      // Dosyayı da sil
      deleteNoteFile(noteToDeleteObj);
    }
    
    // Gerçek silme işlemi - REFERANSI KORUYARAK!
    const deleteIndex = window.notes.findIndex(n => n.id === noteToDelete);
    if (deleteIndex !== -1) {
      window.notes.splice(deleteIndex, 1);  // ✅ Aynı array'den sil
      console.log(`🗑️ Not silindi: ${noteToDeleteObj.title} (index: ${deleteIndex})`);
    }
    if (window.saveNotes) window.saveNotes();
    
    // LocalStorage'dan da sil
    const STORAGE_KEYS = window.STORAGE_KEYS || {};
    if (STORAGE_KEYS.NOTES) {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(window.notes));
    }
    
    if (state.selectedNote === noteToDelete) {
      state.selectedNote = null;
    }
    
    // Multi-selection'dan da kaldır
    state.selectedNotes = (state.selectedNotes || []).filter(id => id !== noteToDelete);
    window.setState(state);
    
    if (window.renderNotes) window.renderNotes();
    if (window.renderTags) window.renderTags();
    if (window.renderGraph) window.renderGraph();
    
    // Modal'ı kapat
    closeDeleteModal();
  }
}

// Notun içeriğindeki media dosyalarını sil
function deleteNoteMediaFiles(note) {
  if (typeof require === 'undefined') return;
  
  const { ipcRenderer } = require('electron');
  const content = note.text || note.markdownContent || '';
  
  // Dosya referanslarını çıkaran fonksiyon (saveCurrentNoteContent'ten aynı)
  const extractFilePaths = (text) => {
    const paths = new Set();
    
    // Markdown image: ![alt](path)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = imageRegex.exec(text)) !== null) {
      let path = match[2];
      // file:// URL'sini temizle
      if (path.startsWith('file:///')) {
        path = path.replace(/^file:\/\/\//, '');
      }
      // .media klasöründen olan dosyaları al
      if (path && (path.includes('.media') || path.startsWith('.media'))) {
        paths.add(path);
      }
    }
    
    // HTML img tag: <img src="path">
    const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = imgTagRegex.exec(text)) !== null) {
      let path = match[1];
      if (path.startsWith('file:///')) {
        path = path.replace(/^file:\/\/\//, '');
      }
      // .media klasöründen olan dosyaları al
      if (path && (path.includes('.media') || path.startsWith('.media'))) {
        paths.add(path);
      }
    }
    
    // HTML audio tag: <audio><source src="path">
    const audioRegex = /<audio[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = audioRegex.exec(text)) !== null) {
      let path = match[1];
      if (path.startsWith('file:///')) {
        path = path.replace(/^file:\/\/\//, '');
      }
      // .media klasöründen olan dosyaları al
      if (path && (path.includes('.media') || path.startsWith('.media'))) {
        paths.add(path);
      }
    }
    
    return paths;
  };
  
  const filePaths = extractFilePaths(content);
  
  // Her dosyayı sil
  filePaths.forEach(async (filePath) => {
    try {
      await ipcRenderer.invoke('delete-media-file', { filePath: filePath });
      console.log('✅ Media dosyası silindi:', filePath);
    } catch (error) {
      console.error('❌ Media dosyası silinemedi:', filePath, error);
    }
  });
}

// Not dosyasını sil
function deleteNoteFile(note) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('delete-note-file', note);
  }
}

// Not detayını aç
function openNoteDetail(noteId) {
  // Popup'ı gizle - not detayı açılırken
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  selectNote(noteId);
  if (window.openNotePanel) window.openNotePanel(noteId); // Doğrudan noteId'yi geç
}

// Nota odaklan
function centerOnNote(noteId) {
  const notes = window.notes || [];
  // Önce note objesini bul
  const note = notes.find(n => n.id === noteId);
  if (!note || note.x === undefined || note.y === undefined) return;
  
  const boardwrap = document.querySelector('.boardwrap');
  if (!boardwrap) return;
  
  const boardwrapRect = boardwrap.getBoundingClientRect();
  
  // Note'un gerçek boyutlarını hesapla
  const noteWidth = note.customWidth || 280;
  const noteHeight = note.customHeight || (window.getNoteHeight ? window.getNoteHeight(note) : 200);
  
  // Notun merkez koordinatları (stored x,y + half size)
  const noteCenterX = note.x + noteWidth / 2;
  const noteCenterY = note.y + noteHeight / 2;
  
  // Boardwrap'in merkez koordinatları
  const viewportCenterX = boardwrapRect.width / 2;
  const viewportCenterY = boardwrapRect.height / 2;
  
  const boardZoom = window.boardZoom || 1;
  
  // Pan değerlerini hesapla (notun merkezini viewport merkezine getir)
  const zoomVars = window.getZoomPanVars();
  zoomVars.boardPanX = viewportCenterX - (noteCenterX * boardZoom);
  zoomVars.boardPanY = viewportCenterY - (noteCenterY * boardZoom);
  window.setZoomPanVars(zoomVars);
  
  if (window.updateBoardTransform) window.updateBoardTransform();
}

// Not yüksekliğini hesapla
function getNoteHeight(note) {
  const contentLength = note.text.length;
  const titleLength = note.title.length;
  
  // Başlık uzunluğuna göre minimum yükseklik hesapla
  let minHeightForTitle = 160; // Base minimum
  if (titleLength > 20) {
    minHeightForTitle = 180; // Uzun başlık için
  }
  if (titleLength > 40) {
    minHeightForTitle = 200; // Çok uzun başlık için
  }
  
  // İçerik uzunluğuna göre yükseklik - daha esnek hesaplama
  let noteHeight = minHeightForTitle;
  
  // İçerik uzunluğuna göre dinamik yükseklik hesaplama
  if (contentLength > 100) {
    noteHeight = Math.max(noteHeight, 200);
  }
  if (contentLength > 300) {
    noteHeight = Math.max(noteHeight, 280);
  }
  if (contentLength > 600) {
    noteHeight = Math.max(noteHeight, 350);
  }
  if (contentLength > 1000) {
    noteHeight = Math.max(noteHeight, 450);
  }
  if (contentLength > 2000) {
    noteHeight = Math.max(noteHeight, 600);
  }
  
  return noteHeight;
}

// Not ID'sine göre not bulma fonksiyonu
function getNoteById(noteId) {
  const notes = window.notes || [];
  return notes.find(note => note.id === noteId);
}

// Not içeriğini güncelle
function updateNoteContent(noteId, content) {
  if (noteId) {
    const notes = window.notes || [];
    const note = notes.find(n => n.id === noteId);
    if (note) {
      note.text = content;
      note.updatedAt = new Date().toISOString();
      note.tags = window.parseTags ? window.parseTags(content) : [];
      note.links = window.parseWikilinks ? window.parseWikilinks(content) : [];
      
      // Not kartının görünümünü güncelle
      const noteElement = document.getElementById(`note-${noteId}`);
      if (noteElement) {
        const snippetElement = noteElement.querySelector('.snippet');
        if (snippetElement) {
          const renderedContent = window.renderMarkdown ? window.renderMarkdown(content) : content;
          snippetElement.innerHTML = renderedContent;
        }
        
        // Etiketleri güncelle
        const tagsElement = noteElement.querySelector('.tags');
        if (tagsElement) {
          tagsElement.innerHTML = note.tags.slice(0, 4).map(tag => `<span class="tagtok">#${tag}</span>`).join('');
        }
      }
      
      // Dinamik güncellemeler
      if (window.renderTags) window.renderTags(); // Etiketler panelini güncelle
      setTimeout(() => {
        if (window.drawConnections) window.drawConnections(); // Bağlantı çizgilerini yeniden çiz
      }, 100);
      
      console.log('📝 Not içeriği güncellendi:', noteId);
      console.log('🏷️ Etiketler:', note.tags);
      console.log('🔗 Bağlantılar:', note.links);
    }
  }
}

// Not başlığını güncelle
function updateNoteTitle(noteId, title) {
  try {
    if (noteId) {
      const notes = window.notes || [];
      const note = notes.find(n => n.id === noteId);
      if (note) {
        const oldTitle = note.title;
        note.title = title || 'Başlıksız Not';
        note.updatedAt = new Date().toISOString();
        
        // Not kartının başlığını güncelle
        const noteElement = document.getElementById(`note-${noteId}`);
        if (noteElement) {
          const titleElement = noteElement.querySelector('.head .title');
          if (titleElement) {
            titleElement.textContent = note.title;
          }
        }
        
        // Dosya adını güncelle (sadece başlık değiştiyse)
        if (oldTitle !== note.title && typeof window.updateNoteFileName === 'function') {
          try {
            window.updateNoteFileName(noteId, oldTitle, note.title);
          } catch (fileNameError) {
            console.error('❌ Dosya adı güncelleme hatası:', fileNameError);
          }
        }
        
        console.log('📝 Not başlığı güncellendi:', noteId, title);
      }
    }
  } catch (error) {
    console.error('❌ Not başlığı güncelleme hatası:', error);
  }
}

// Global exports
window.createNote = createNote;
window.createNoteInFolder = createNoteInFolder;
window.updateNote = updateNote;
window.deleteNote = deleteNote;
window.selectNote = selectNote;
window.editNote = editNote;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteNote = confirmDeleteNote;
window.deleteNoteFile = deleteNoteFile;
window.openNoteDetail = openNoteDetail;
window.centerOnNote = centerOnNote;
window.getNoteHeight = getNoteHeight;
window.getNoteById = getNoteById;
window.updateNoteContent = updateNoteContent;
window.updateNoteTitle = updateNoteTitle;

console.log('📝 Note Manager yüklendi');

