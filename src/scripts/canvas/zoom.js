// ===== ZOOM & PAN SYSTEM =====

// Zoom ve pan değişkenleri
let boardZoom = 1;
window.boardZoom = boardZoom;
let boardPanX = 0;
let boardPanY = 0;
let isDragging = false;
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastPanX = 0;
let lastPanY = 0;
let isMiddleMouseDown = false;
let isRightMouseDown = false;
let rightClickStartTime = 0;

// Zoom fonksiyonları
function zoomIn() {
  boardZoom = Math.min(boardZoom * 1.2, 3);
  window.boardZoom = boardZoom;
  updateBoardTransform();
  if (window.renderNotes) window.renderNotes(); // Notları ve klasörleri yeniden render et
}

function zoomOut() {
  boardZoom = Math.max(boardZoom / 1.2, 0.1);
  window.boardZoom = boardZoom;
  updateBoardTransform();
  if (window.renderNotes) window.renderNotes(); // Notları ve klasörleri yeniden render et
}

function updateBoardTransform() {
  const board = window.DOM.get('board');
  if (board) {
    board.style.transform = `translate(${boardPanX}px, ${boardPanY}px) scale(${boardZoom})`;
  }
  
  // Context menu'leri gizle - zoom/pan sırasında
  if (window.hideContextMenu) window.hideContextMenu();
  
  // Zoom info'yu güncelle
  const zoomInfo = window.DOM.get('zoomInfo');
  if (zoomInfo) {
    zoomInfo.textContent = `Zoom: ${Math.round(boardZoom * 100)}%`;
  }
  
  // Popup'ı gizle - zoom/pan sırasında
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  // Kartları güncelle
  updateAllCards();
  
  // Bağlantı çizgilerini yeniden çiz (sabit noktalar için)
  if (window.drawConnections) window.drawConnections();
}

// Kartları güncelle - zoom sistemi için
function updateAllCards() {
  const cards = window.DOM.selectAll('.note, .folder-card');
  cards.forEach(card => updateCardZoom(card));
}

function updateCardZoom(card) {
  const zoomFactor = Math.max(0.5, 1 / boardZoom);

  // Klasörler ve alt klasörler için dinamik boyutlandırma
  if (card.classList.contains('folder-card')) {
    if (boardZoom <= 0.3) {
      // %30'dan sonra büyüme başlasın
      card.style.setProperty('--zoom-factor', zoomFactor);
      card.style.setProperty('--content-visible', '0');
      updateFolderCard(card, zoomFactor);
    } else {
      // %30'a kadar normal boyut - zoom-factor kaldır
      card.style.removeProperty('--zoom-factor');
      card.style.setProperty('--content-visible', '1');
      resetFolderCard(card);
    }
  }
}

function updateFolderCard(card, zoomFactor) {
  const indicator = card.querySelector('.folder-color-indicator');
  const noteCount = card.querySelector('.folder-note-badge');
  const folderTitle = card.querySelector('.folder-title');
  const contentVisible = card.style.getPropertyValue('--content-visible') || '1';
  
  // İçerik görünürlüğüne göre indicator ve note count'u ayarla
  if (contentVisible === '0') {
    // İçerik gizli - sadece başlık göster
    if (indicator) {
      indicator.style.display = 'none !important';
      indicator.style.height = '0px !important';
      indicator.style.opacity = '0 !important';
    }
    if (noteCount) {
      noteCount.style.display = 'none !important';
      noteCount.style.opacity = '0 !important';
      noteCount.style.maxHeight = '0px !important';
    }
    
    // Kart yapısını başlık odaklı yap
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'center';
    card.style.flexDirection = 'column';
    card.style.textAlign = 'center';
  } else {
    // İçerik görünür - normal yapıyı koru
    if (indicator) {
      indicator.style.display = '';
      indicator.style.height = '';
      indicator.style.opacity = '';
    }
    if (noteCount) {
      noteCount.style.display = '';
      noteCount.style.opacity = '';
      noteCount.style.maxHeight = '';
    }
    
    // Kart yapısını normal tut
    card.style.display = 'flex';
    card.style.alignItems = 'flex-start';
    card.style.justifyContent = 'space-between';
    card.style.flexDirection = 'column';
    card.style.textAlign = 'left';
  }
  
  // Başlık boyutuna göre dinamik kart boyutlandırma
  if (folderTitle) {
    const titleText = folderTitle.textContent;
    const titleLength = titleText.length;
    
    // Font boyutunu hesapla - daha büyük fontlar için
    const baseFontSize = 32; // 2rem = 32px
    const actualFontSize = Math.max(24, Math.min(120, baseFontSize * (1 / zoomFactor) * 0.8));
    
    // Zoom faktörüne göre padding ayarla
    const basePadding = 8;
    const dynamicPadding = Math.max(4, basePadding * zoomFactor);
    card.style.padding = `${dynamicPadding}px !important`;
    card.style.boxSizing = 'border-box !important';
    
    // Manuel boyutlandırmayı kaldır - CSS max-content kullanacak
    card.style.width = '';
    card.style.height = '';
    card.style.minWidth = '';
    card.style.minHeight = '';
    card.style.maxWidth = '';
    
    // Başlık stilini ayarla - sadece font boyutu
    folderTitle.style.fontSize = `${actualFontSize}px !important`;
    folderTitle.style.lineHeight = '1.2 !important';
    folderTitle.style.wordBreak = 'break-word !important';
    folderTitle.style.overflowWrap = 'break-word !important';
    
    // Manuel genişlik sınırlamasını kaldır - CSS'e bırak
    folderTitle.style.maxWidth = '';
  }
}

function resetFolderCard(card) {
  // Normal görünüme döndür
  const indicator = card.querySelector('.folder-color-indicator');
  const noteCount = card.querySelector('.folder-note-badge');
  const folderTitle = card.querySelector('.folder-title');
  
  if (indicator) {
    indicator.style.display = '';
    indicator.style.height = '';
    indicator.style.opacity = '';
  }
  if (noteCount) {
    noteCount.style.display = '';
    noteCount.style.opacity = '';
    noteCount.style.maxHeight = '';
  }
  
  // Kart boyutlarını sıfırla - CSS'e geri döndür
  card.style.height = '';
  card.style.width = '';
  card.style.minHeight = '';
  card.style.minWidth = '';
  card.style.maxHeight = '';
  card.style.maxWidth = '';
  card.style.display = '';
  card.style.alignItems = '';
  card.style.justifyContent = '';
  card.style.flexDirection = '';
  card.style.textAlign = '';
  card.style.padding = '';
  card.style.boxSizing = '';
  
  // Başlık stilini sıfırla
  if (folderTitle) {
    folderTitle.style.fontSize = '';
    folderTitle.style.lineHeight = '';
    folderTitle.style.maxWidth = '';
    folderTitle.style.wordBreak = '';
    folderTitle.style.overflowWrap = '';
  }
}

// Global exports
window.boardZoom = boardZoom;
window.boardPanX = boardPanX;
window.boardPanY = boardPanY;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.updateBoardTransform = updateBoardTransform;
window.updateAllCards = updateAllCards;
window.updateCardZoom = updateCardZoom;
window.updateFolderCard = updateFolderCard;
window.resetFolderCard = resetFolderCard;

// Değişken setter'ları - maintwo.js'den erişim için
window.setZoomPanVars = function(vars) {
  if (vars.boardZoom !== undefined) {
    boardZoom = vars.boardZoom;
    window.boardZoom = boardZoom;
  }
  if (vars.boardPanX !== undefined) {
    boardPanX = vars.boardPanX;
    window.boardPanX = boardPanX;
  }
  if (vars.boardPanY !== undefined) {
    boardPanY = vars.boardPanY;
    window.boardPanY = boardPanY;
  }
  if (vars.isMiddleMouseDown !== undefined) isMiddleMouseDown = vars.isMiddleMouseDown;
  if (vars.isRightMouseDown !== undefined) isRightMouseDown = vars.isRightMouseDown;
  if (vars.rightClickStartTime !== undefined) rightClickStartTime = vars.rightClickStartTime;
  if (vars.lastMouseX !== undefined) lastMouseX = vars.lastMouseX;
  if (vars.lastMouseY !== undefined) lastMouseY = vars.lastMouseY;
  if (vars.lastPanX !== undefined) lastPanX = vars.lastPanX;
  if (vars.lastPanY !== undefined) lastPanY = vars.lastPanY;
};

window.getZoomPanVars = function() {
  return {
    boardZoom,
    boardPanX,
    boardPanY,
    isMiddleMouseDown,
    isRightMouseDown,
    rightClickStartTime,
    lastMouseX,
    lastMouseY,
    lastPanX,
    lastPanY
  };
};

