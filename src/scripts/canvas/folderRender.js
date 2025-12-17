// ===== FOLDER BOARD RENDER =====
// Board üzerindeki klasör kartlarının render edilmesi

function renderFoldersOnBoard() {
  const board = document.getElementById('board');
  const notes = window.notes || [];
  const folders = window.folders || [];
  const state = window.getState();
  
  // Mevcut klasör kartlarını temizle
  document.querySelectorAll('.folder-card').forEach(card => card.remove());
  
  // Arama filtresi ile klasörleri filtrele
  const filteredFolders = folders.filter(folder => {
    // Arama sorgusu yoksa tüm klasörleri göster
    if (!state.searchQuery) return true;
    
    // Klasör adı arama sorgusuyla eşleşiyor mu?
    const folderNameMatch = folder.name.toLowerCase().includes(state.searchQuery.toLowerCase());
    
    // Klasördeki notlar arama sorgusuyla eşleşiyor mu?
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
    
    // Aktif etiket filtreleri kontrolü
    const matchesTagFilters = state.activeTagFilters.length === 0 || 
      folderNotes.some(note => state.activeTagFilters.every(filter => note.tags.includes(filter)));
    
    return folderNameMatch || hasMatchingNotes;
  });
  
  filteredFolders.forEach((folder, index) => {
    // Genel eşleştirme fonksiyonu kullan
    const folderNotes = notes.filter(note => {
      if (window.doesNoteMatchFolder) {
        return window.doesNoteMatchFolder(note.folderId, folder.id, folder);
      }
      // Fallback
      return note.folderId === folder.id;
    });
    
    // Klasör pozisyonunu hesapla
    let x, y;
    if (folder.x !== undefined && folder.y !== undefined) {
      x = folder.x;
      y = folder.y;
    } else {
      // Grid düzeninde üst kısmına yerleştir
      const cols = Math.ceil(Math.sqrt(folders.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      x = 50 + col * 220; 
      y = 50 + row * 150;
      // Pozisyonu kaydet - SADECE YENİ KLASÖRLER İÇİN
      folder.x = x;
      folder.y = y;
      
      // Pozisyon ayarlandıktan sonra kaydet (sadece bir kez)
      if (index === filteredFolders.length - 1) {
        // Pozisyon değişikliği için kaydetme - debounce ile
        if (window.saveFolders) window.saveFolders();
      }
    }
    
    // Klasör kartını oluştur
    const folderElement = document.createElement('div');
    let className = `folder-card ${state.selectedFolder === folder.id ? 'selected' : ''}`;
    folderElement.className = className;
    folderElement.id = `folder-${folder.id}`;
    folderElement.style.left = x + 'px';
    folderElement.style.top = y + 'px';
    
    // Klasör boyutlarını CSS'e bırak - başlığa göre otomatik genişlesin
    // Sabit genişlik/yükseklik atama KALDIRILDI - CSS max-content kullanılacak
    // folderElement.style.width = ''; // CSS'e bırak
    // folderElement.style.height = ''; // CSS'e bırak
    
    // Alt klasör kontrolü
    const isSubFolder = folder.parentId !== null;
    
    // Modern HTML içeriği - köşede badge tasarımı
    folderElement.innerHTML = `
      <div class="folder-header">
        <div class="folder-title">${folder.name}</div>
      </div>
      <div class="folder-color-indicator"></div>
      <div class="folder-note-badge">${folderNotes.length}</div>
    `;
    
    
    // Badge'e klasör rengini uygula
    const badge = folderElement.querySelector('.folder-note-badge');
    if (badge) {
      badge.style.setProperty('--folder-color', folder.color);
      badge.style.background = folder.color;
    }
    
    // Alt klasör için farklı stil
    if (isSubFolder) {
      folderElement.classList.add('subfolder');
      // Alt klasör renkleri
      folderElement.style.background = `linear-gradient(45deg, ${folder.color}20, ${folder.color}30)`;
      folderElement.style.border = `2px dashed ${folder.color}80`;
      folderElement.style.borderRadius = '8px';
      folderElement.style.boxShadow = `0 3px 10px ${folder.color}25`;
    } else {
      // Ana klasör renkleri
      folderElement.style.background = `linear-gradient(135deg, ${folder.color}15, ${folder.color}25)`;
      folderElement.style.border = `2px solid ${folder.color}60`;
      folderElement.style.borderRadius = '12px';
      folderElement.style.boxShadow = `0 4px 15px ${folder.color}20`;
    }
    
    // Renk göstergesini güncelle
    const colorIndicator = folderElement.querySelector('.folder-color-indicator');
    if (colorIndicator) {
      colorIndicator.style.background = folder.color;
    }
    
    // Klasör tıklama olayı global event handler'da yapılacak
    
    // Sağ tık menüsü ekle
    folderElement.oncontextmenu = (e) => {
      console.log('🖱️ Klasör sağ tık algılandı:', folder.id);
      if (window.showFolderContextMenu) window.showFolderContextMenu(e, folder.id);
    };
    
    // Klasör event'leri global sistemde handle edilecek
    
    // Drag & drop için klasörü drop zone yap
    if (window.makeFolderDroppable) window.makeFolderDroppable(folderElement, folder.id);
    
    // Zoom sistemi için kartı güncelle
    if (window.updateCardZoom) window.updateCardZoom(folderElement);
    
    board.appendChild(folderElement);
  });
  
  // Klasör pozisyonları zaten yüklendi - tekrar kaydetmeye gerek yok
  
  // Edge indicator'ları güncelle
  if (window.scheduleEdgeIndicatorUpdate) window.scheduleEdgeIndicatorUpdate();
  
}

// Global export
window.renderFoldersOnBoard = renderFoldersOnBoard;

console.log('📁 Folder Board Render yüklendi');

