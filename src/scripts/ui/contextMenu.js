// ===== CONTEXT MENU SYSTEM =====

// Context menu pozisyon hesaplama fonksiyonu - Geliştirilmiş versiyon
function calculateMenuPosition(mouseX, mouseY, menuElement = null) {
  console.log('🔧 calculateMenuPosition çağrıldı:', { mouseX, mouseY, menuElement });
  const menuWidth = 180; // Context menu genişliği
  const padding = 15; // Widget kenarlarından uzaklık
  
  // Widget sınırlarını al
  const widget = document.querySelector('.widget');
  if (!widget) {
    console.log('❌ Widget bulunamadı, normal pozisyon döndürülüyor');
    // Widget bulunamazsa normal pozisyonu döndür
    return { x: mouseX, y: mouseY };
  }
  
  const widgetRect = widget.getBoundingClientRect();
  const widgetLeft = widgetRect.left;
  const widgetRight = widgetRect.right;
  const widgetTop = widgetRect.top;
  const widgetBottom = widgetRect.bottom;
  
  let x = mouseX;
  let y = mouseY;
  
  // Yatay pozisyon kontrolü
  if (mouseX + menuWidth > widgetRight - padding) {
    // Sağ tarafa sığmıyorsa sol tarafa kaydır
    x = mouseX - menuWidth;
    if (x < widgetLeft + padding) {
      // Sol tarafa da sığmıyorsa widget içinde sağa yasla
      x = widgetRight - menuWidth - padding;
    }
  }
  
  // Dikey pozisyon kontrolü - Gerçek yükseklik kullan
  let menuHeight = 250; // Varsayılan yükseklik
  
  if (menuElement) {
    try {
      // Eğer menu elementi varsa gerçek yüksekliği al
      menuElement.style.visibility = 'hidden';
      menuElement.style.position = 'fixed';
      menuElement.style.left = x + 'px';
      menuElement.style.top = y + 'px';
      document.body.appendChild(menuElement);
      menuHeight = menuElement.offsetHeight;
      document.body.removeChild(menuElement);
    } catch (error) {
      console.warn('Menu yükseklik hesaplama hatası:', error);
      // Hata durumunda varsayılan yükseklik kullan
    }
  }
  
  // Alt kısım kontrolü - Daha agresif
  if (mouseY + menuHeight > widgetBottom - padding) {
    // Alt tarafa sığmıyorsa üst tarafa kaydır
    y = mouseY - menuHeight - 20; // 20px ekstra boşluk
    if (y < widgetTop + padding) {
      // Üst tarafa da sığmıyorsa widget içinde alta yasla
      y = widgetBottom - menuHeight - padding;
    }
  }
  
  // Final güvenlik kontrolü
  x = Math.max(widgetLeft + padding, Math.min(x, widgetRight - menuWidth - padding));
  y = Math.max(widgetTop + padding, Math.min(y, widgetBottom - menuHeight - padding));
  
  console.log('📍 Final pozisyon:', { x, y, menuWidth, menuHeight, widgetRect });
  
  return { x, y };
}

function showContextMenu(e, noteId) {
  e.preventDefault();
  e.stopPropagation();
  
  // Popup'ı gizle - context menu açılırken
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  // Mevcut context menu'yu kaldır
  hideContextMenu();
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  
  const note = window.notes.find(n => n.id === noteId);
  if (!note) return;
  
  // Context menu
  menu.innerHTML = `
    <div class="context-menu-item" onclick="editNote('${noteId}')">
      ✏️ Düzenle
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="showConnectionModal('note', '${noteId}', '${note.title}')">
      🔗 Bağlantıları Yönet
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="deleteNote('${noteId}')">
      🗑️ Sil
    </div>
  `;
  
  // Widget sınırları içinde pozisyon hesapla (menu elementi ile)
  try {
    const position = calculateMenuPosition(e.clientX, e.clientY, menu);
    menu.style.left = position.x + 'px';
    menu.style.top = position.y + 'px';
    console.log('✅ Context menu pozisyonu hesaplandı:', position);
  } catch (error) {
    console.error('❌ Context menu pozisyon hatası:', error);
    // Hata durumunda basit pozisyon kullan
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
  }
  
  document.body.appendChild(menu);
  
  // Dışarı tıklanınca kapat
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
  }, 100);
}

function hideContextMenu() {
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
}

// Boş alan context menu
function showEmptyAreaContextMenu(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // Popup'ı gizle - context menu açılırken
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  // Mevcut menüyü kaldır
  hideContextMenu();
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  
  menu.innerHTML = `
    <div class="context-menu-item" onclick="createNoteMain()">
      📝 Yeni Not Oluştur
    </div>
    <div class="context-menu-item" onclick="createFolderMain()">
      📁 Yeni Klasör Oluştur
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="resetBoardView()">
      🎯 Görünümü Sıfırla
    </div>
    <div class="context-menu-item" onclick="fitAllNotes()">
      📐 Ekrana Sığdır
    </div>
  `;
  
  // Widget sınırları içinde pozisyon hesapla
  try {
    const position = calculateMenuPosition(e.clientX, e.clientY, menu);
    menu.style.left = position.x + 'px';
    menu.style.top = position.y + 'px';
    console.log('✅ Boş alan context menu pozisyonu hesaplandı:', position);
  } catch (error) {
    console.error('❌ Context menu pozisyonu hesaplanamadı:', error);
    // Varsayılan pozisyon
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
  }
  
  document.body.appendChild(menu);
  
  // Menü dışına tıklanınca kapat
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
  }, 100);
}

function showFolderContextMenu(e, folderId) {
  e.preventDefault();
  e.stopPropagation();
  
  // Popup'ı gizle - context menu açılırken
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  // Mevcut context menu'yu kaldır
  hideContextMenu();
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  
  const folder = window.folders.find(f => f.id === folderId);
  if (!folder) {
    console.log('❌ Klasör bulunamadı:', folderId);
    return;
  }
  
  console.log('✅ Klasör bulundu:', folder.name);
  
  menu.innerHTML = `
    <div class="context-menu-item" onclick="createNoteInFolder('${folderId}')">
      📝 Not Ekle
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="renameFolder('${folderId}')">
      ✏️ Yeniden Adlandır
    </div>
    <div class="context-menu-item" onclick="changeFolderColor('${folderId}')">
      🎨 Renk Değiştir
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="showConnectionModal('folder', '${folderId}', '${folder.name}')">
      🔗 Bağlantıları Yönet
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="deleteFolder('${folderId}')">
      🗑️ Klasörü Sil
    </div>
  `;
  
  // Widget sınırları içinde pozisyon hesapla (menu elementi ile)
  try {
    const position = calculateMenuPosition(e.clientX, e.clientY, menu);
    menu.style.left = position.x + 'px';
    menu.style.top = position.y + 'px';
    console.log('✅ Klasör context menu pozisyonu hesaplandı:', position);
    console.log('📍 Menu element:', menu);
    console.log('📍 Menu style:', menu.style.cssText);
  } catch (error) {
    console.error('❌ Klasör context menu pozisyon hatası:', error);
    // Hata durumunda basit pozisyon kullan
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
  }
  
  document.body.appendChild(menu);
  
  // Dışarı tıklanınca kapat
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
  }, 100);
}

// Not context menu
function showNoteContextMenu(event, noteId) {
  const note = window.notes.find(note => note.id === noteId);
  if (!note) return;
  
  // Mevcut context menu'yu kaldır
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  
  const menuItems = [
    {
      text: '📝 Düzenle',
      action: () => window.openNotePanel(noteId)
    },
    {
      text: '📁 Klasöre Taşı',
      action: () => window.showMoveToFolderDialog(noteId)
    },
    {
      text: '📄 Dosyaya Kaydet',
      action: () => window.saveNoteToFile(note)
    },
    {
      text: '🗑️ Sil',
      action: () => window.deleteNote(noteId),
      danger: true
    }
  ];
  
  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = `context-menu-item ${item.danger ? 'danger' : ''}`;
    menuItem.textContent = item.text;
    menuItem.onclick = () => {
      item.action();
      contextMenu.remove();
    };
    contextMenu.appendChild(menuItem);
  });
  
  // Widget sınırları içinde pozisyon hesapla (menu elementi ile)
  const position = calculateMenuPosition(event.clientX, event.clientY, contextMenu);
  contextMenu.style.left = position.x + 'px';
  contextMenu.style.top = position.y + 'px';
  
  document.body.appendChild(contextMenu);
  
  // Menü dışına tıklandığında kapat
  const closeMenu = (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
}

// Görünümü sıfırla
function resetBoardView() {
  const zoomVars = window.getZoomPanVars();
  zoomVars.boardZoom = 1;
  zoomVars.boardPanX = 0;
  zoomVars.boardPanY = 0;
  window.setZoomPanVars(zoomVars);
  if (window.updateBoardTransform) window.updateBoardTransform();
  console.log('🎯 Görünüm sıfırlandı');
}

// Global exports
window.calculateMenuPosition = calculateMenuPosition;
window.showContextMenu = showContextMenu;
window.hideContextMenu = hideContextMenu;
window.showEmptyAreaContextMenu = showEmptyAreaContextMenu;
window.showFolderContextMenu = showFolderContextMenu;
window.showNoteContextMenu = showNoteContextMenu;
window.resetBoardView = resetBoardView;

