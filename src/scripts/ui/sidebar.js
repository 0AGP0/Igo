// ===== SIDEBAR RENDER =====
// Sol sidebar'daki not ve klasör listelerinin render edilmesi

// Not listesini render et (renderFolderList kullanır)
function renderNoteList() {
  if (window.renderFolderList) {
    window.renderFolderList();
  }
}

// Klasör listesini render et
function renderFolderList() {
  const folderListContainer = document.getElementById('folderList');
  if (!folderListContainer) {
    console.error('❌ folderList elementi bulunamadı!');
    return;
  }
  
  const notes = window.notes || [];
  const folders = window.folders || [];
  const state = window.getState();
  
  // Önceki içeriği temizle
  folderListContainer.innerHTML = '';
  
  // Tüm notları göster seçeneği
  const allItem = document.createElement('div');
  allItem.className = `folder-item ${state.selectedFolder === null ? 'active' : ''}`;
  allItem.innerHTML = `
    <div class="folder-icon">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
      </svg>
    </div>
    <div class="folder-name">Tüm Notlar</div>
    <div class="folder-count">${notes.length}</div>
  `;
  allItem.onclick = () => {
    if (window.selectFolder) window.selectFolder(null);
    if (window.toggleAllFolders) window.toggleAllFolders();
  };
  folderListContainer.appendChild(allItem);
  
  // Klasörsüz notlar
  const orphanNotes = notes.filter(note => !note.folderId);
  if (orphanNotes.length > 0) {
    const isOrphanExpanded = state.expandedFolders.includes('orphan');
    
    const orphanItem = document.createElement('div');
    orphanItem.className = `folder-item ${state.selectedFolder === 'orphan' ? 'active' : ''}`;
    orphanItem.innerHTML = `
      <div style="display: flex; align-items: center; width: 100%;">
        <div style="width: 12px; height: 12px; margin-right: 4px; color: var(--muted); font-size: 10px; text-align: center;">
          ${isOrphanExpanded ? '▼' : '▶'}
        </div>
        <div class="folder-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7h10a2 2 0 0 1 2 2v3c0 1.1-.9 2-2 2H9m0-7V9a2 2 0 0 1 2-2h2"></path>
          </svg>
        </div>
        <div class="folder-name" style="flex: 1;">Klasörsüz Notlar</div>
        <div class="folder-count">${orphanNotes.length}</div>
      </div>
    `;
    orphanItem.onclick = () => {
      if (window.selectFolder) window.selectFolder('orphan');
      if (window.toggleFolder) window.toggleFolder('orphan');
    };
    if (window.makeFolderDroppable) window.makeFolderDroppable(orphanItem, null); // null = klasörsüz yap
    folderListContainer.appendChild(orphanItem);
    
    // Klasörsüz notları göster (eğer açıksa)
    if (isOrphanExpanded) {
      orphanNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = `note-item ${note.id === state.selectedNote ? 'selected' : ''}`;
        noteItem.innerHTML = `
          <div class="note-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </div>
          <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${note.title}</div>
        `;
        noteItem.onclick = (e) => {
          e.stopPropagation();
          if (window.selectNote) window.selectNote(note.id);
          if (window.centerOnNote) window.centerOnNote(note.id);
        };
        noteItem.oncontextmenu = (e) => {
          if (window.showContextMenu) window.showContextMenu(e, note.id);
        };
        if (window.makeNoteDraggable) window.makeNoteDraggable(noteItem, note.id);
        folderListContainer.appendChild(noteItem);
      });
    }
  }
  
  // Ana klasörleri render et (parentId olmayan veya null olan)
  const mainFolders = folders.filter(folder => !folder.parentId);
  mainFolders.forEach(folder => {
    renderFolderItem(folder, folderListContainer, 0);
  });
}

// Klasör öğesini render et (recursive)
function renderFolderItem(folder, container, level) {
  const notes = window.notes || [];
  const folders = window.folders || [];
  const state = window.getState();
  // Alt klasörlerdeki notları da dahil et
  const folderNotes = window.getFolderNotes ? window.getFolderNotes(folder.id, true) : notes.filter(n => n.folderId === folder.id);
  const isExpanded = state.expandedFolders.includes(folder.id);
  
  // Bu klasörün direkt notlarını bul (alt klasörler hariç)
  const directNotes = window.getFolderNotes ? window.getFolderNotes(folder.id, false) : notes.filter(n => n.folderId === folder.id);
  
  // Bu klasörün alt klasörlerini bul
  const subFolders = folders.filter(f => f.parentId === folder.id);
  
  const folderItem = document.createElement('div');
  folderItem.className = `folder-item ${state.selectedFolder === folder.id ? 'active' : ''}`;
  
  // Girinti için padding ekle
  const indentStyle = `padding-left: ${level * 20 + 8}px;`;
  
  // Ana klasör mü alt klasör mü kontrol et
  const isMainFolder = !folder.parentId;
  
  // Toplam içerik sayısı: direkt notlar + alt klasörlerdeki notlar
  const totalContentCount = folderNotes.length; // Alt klasörlerdeki notlar dahil
  
  folderItem.innerHTML = `
    <div style="display: flex; align-items: center; width: 100%; ${indentStyle}">
      <div style="width: 12px; height: 12px; margin-right: 4px; color: var(--muted); font-size: 10px; text-align: center;">
        ${(directNotes.length > 0 || subFolders.length > 0) ? (isExpanded ? '▼' : '▶') : '·'}
      </div>
      <div class="folder-icon" style="color: ${folder.color};" onclick="event.stopPropagation(); changeFolderColor('${folder.id}');">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${isMainFolder ? 
            '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>' :
            '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>'
          }
        </svg>
      </div>
      <div class="folder-name" style="flex: 1;">${folder.name}</div>
      <div class="folder-count">${totalContentCount}</div>
      <div style="width: 16px; height: 16px; margin-left: 4px; cursor: pointer; color: var(--danger); font-size: 12px; text-align: center; opacity: 0.7;" onclick="event.stopPropagation(); deleteFolder('${folder.id}');" title="Klasörü Sil">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </div>
    </div>
  `;
  
  folderItem.onclick = (e) => {
    // Eğer renk veya silme butonuna tıklanmadıysa
    if (!e.target.closest('.folder-color') && !e.target.closest('[title="Klasörü Sil"]')) {
      if (window.selectFolder) window.selectFolder(folder.id);
      if (window.toggleFolder) window.toggleFolder(folder.id);
    }
  };
  
  // Context menü ekle
  folderItem.oncontextmenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.showFolderContextMenu) window.showFolderContextMenu(e, folder.id);
  };
  
  if (window.makeFolderDroppable) window.makeFolderDroppable(folderItem, folder.id);
  container.appendChild(folderItem);
  
  // Bu klasördeki direkt notları göster (eğer açıksa) - alt klasörlerdeki notlar değil
  if (isExpanded && directNotes.length > 0) {
    directNotes.forEach(note => {
      const noteItem = document.createElement('div');
      noteItem.className = `note-item ${note.id === state.selectedNote ? 'selected' : ''}`;
      
      // Notların girinti stili - alt klasörlerle aynı hizada
      const noteIndentStyle = `padding-left: ${(level + 1) * 20 + 8}px;`;
      
      noteItem.innerHTML = `
        <div style="display: flex; align-items: center; width: 100%; ${noteIndentStyle}">
          <div class="note-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </div>
        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${note.title}</div>
        </div>
      `;
      noteItem.onclick = (e) => {
        e.stopPropagation();
        if (window.selectNote) window.selectNote(note.id);
        if (window.centerOnNote) window.centerOnNote(note.id);
      };
      noteItem.oncontextmenu = (e) => {
        if (window.showContextMenu) window.showContextMenu(e, note.id);
      };
      if (window.makeNoteDraggable) window.makeNoteDraggable(noteItem, note.id);
      container.appendChild(noteItem);
    });
  }
  
  // Alt klasörleri render et (eğer açıksa)
  if (isExpanded) {
    const subFolders = folders.filter(f => f.parentId === folder.id);
    subFolders.forEach(subFolder => {
      renderFolderItem(subFolder, container, level + 1);
    });
  }
}

// Global exports
window.renderNoteList = renderNoteList;
window.renderFolderList = renderFolderList;
window.renderFolderItem = renderFolderItem;

console.log('📋 Sidebar Render yüklendi');

