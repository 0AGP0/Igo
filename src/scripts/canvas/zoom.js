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

// Zoom fonksiyonları - Ekranın merkezini referans alarak zoom yap
function zoomIn() {
  zoomAtPoint(null, null, 1.2); // null = ekran merkezi
}

function zoomOut() {
  zoomAtPoint(null, null, 1 / 1.2); // null = ekran merkezi
}

// Belirli bir noktayı referans alarak zoom yap
// pointX, pointY null ise ekranın merkezini kullan
function zoomAtPoint(pointX, pointY, zoomFactor) {
  const boardwrap = document.querySelector('.boardwrap');
  if (!boardwrap) {
    // Fallback: Eski yöntem
    const zoomVars = window.getZoomPanVars ? window.getZoomPanVars() : { boardZoom, boardPanX, boardPanY };
    boardZoom = zoomFactor > 1 
      ? Math.min(zoomVars.boardZoom * zoomFactor, 3)
      : Math.max(zoomVars.boardZoom * zoomFactor, 0.1);
    window.boardZoom = boardZoom;
    updateBoardTransform();
    return;
  }
  
  const boardwrapRect = boardwrap.getBoundingClientRect();
  const boardwrapWidth = boardwrapRect.width || window.innerWidth;
  const boardwrapHeight = boardwrapRect.height || window.innerHeight;
  
  // Referans noktası: eğer verilmemişse ekranın merkezi
  const refX = pointX !== null ? pointX - boardwrapRect.left : boardwrapWidth / 2;
  const refY = pointY !== null ? pointY - boardwrapRect.top : boardwrapHeight / 2;
  
  // Mevcut zoom ve pan değerlerini al (güncel değerler için getZoomPanVars kullan)
  const zoomVars = window.getZoomPanVars ? window.getZoomPanVars() : { boardZoom, boardPanX, boardPanY };
  const currentZoom = zoomVars.boardZoom || boardZoom;
  const currentPanX = zoomVars.boardPanX !== undefined ? zoomVars.boardPanX : boardPanX;
  const currentPanY = zoomVars.boardPanY !== undefined ? zoomVars.boardPanY : boardPanY;
  
  // Referans noktasının board koordinatlarındaki pozisyonunu hesapla
  const boardX = (refX - currentPanX) / currentZoom;
  const boardY = (refY - currentPanY) / currentZoom;
  
  // Yeni zoom değerini hesapla
  const newZoom = zoomFactor > 1
    ? Math.min(currentZoom * zoomFactor, 3)
    : Math.max(currentZoom * zoomFactor, 0.1);
  
  // Referans noktasını sabit tutmak için pan'i ayarla
  const newPanX = refX - (boardX * newZoom);
  const newPanY = refY - (boardY * newZoom);
  
  // Zoom ve pan değerlerini güncelle
  boardZoom = newZoom;
  boardPanX = newPanX;
  boardPanY = newPanY;
  window.boardZoom = boardZoom;
  window.boardPanX = boardPanX;
  window.boardPanY = boardPanY;
  
  // setZoomPanVars ile de güncelle (state senkronizasyonu için)
  if (window.setZoomPanVars) {
    window.setZoomPanVars({
      boardZoom: newZoom,
      boardPanX: newPanX,
      boardPanY: newPanY
    });
  }
  
  // Board transform'u güncelle
  updateBoardTransform();
  
  // Board görünümünü kaydet
  if (window.saveBoardView) {
    window.saveBoardView();
  }
}

function updateBoardTransform() {
  const board = window.DOM.get('board');
  const boardwrap = document.querySelector('.boardwrap');
  
  if (!board || !boardwrap) return;
  
  // SONSUZ BOARD - Pan sınırlarını kontrol et
  const INFINITE_SIZE = 1000000;
  const boardwrapWidth = boardwrap.clientWidth || window.innerWidth;
  const boardwrapHeight = boardwrap.clientHeight || window.innerHeight;
  
  // Zoom ile ölçeklenmiş board boyutları
  const scaledBoardWidth = INFINITE_SIZE * boardZoom;
  const scaledBoardHeight = INFINITE_SIZE * boardZoom;
  
  // Pan sınırlarını hesapla
  const minPanX = -(scaledBoardWidth - boardwrapWidth);
  const maxPanX = 0;
  const minPanY = -(scaledBoardHeight - boardwrapHeight);
  const maxPanY = 0;
  
  // Pan değerlerini sınırla
  boardPanX = Math.max(minPanX, Math.min(maxPanX, boardPanX));
  boardPanY = Math.max(minPanY, Math.min(maxPanY, boardPanY));
  
  // SADECE TRANSFORM GÜNCELLE - KARTLARA DOKUNMA
  if (board) {
    board.style.transform = `translate(${boardPanX}px, ${boardPanY}px) scale(${boardZoom})`;
  }
  
  // Context menu'leri gizle
  if (window.hideContextMenu) window.hideContextMenu();
  
  // Zoom info'yu güncelle
  const zoomInfo = window.DOM.get('zoomInfo');
  if (zoomInfo) {
    zoomInfo.textContent = `Zoom: ${Math.round(boardZoom * 100)}%`;
  }
  
  // Popup'ı gizle
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  // Bağlantı çizgilerini yeniden çiz
  if (window.drawConnections) window.drawConnections();
  
  // Edge indicator'ları güncelle
  if (window.scheduleEdgeIndicatorUpdate) window.scheduleEdgeIndicatorUpdate();
  
  // Klasör kartları için CSS değişkenlerini güncelle (DOM'a dokunmadan)
  updateFolderCardZoomVariables();
  
  // Zoom sonrası multi-selection CSS sınıflarını koru
  if (window.refreshMultiSelectionStyles) {
    requestAnimationFrame(() => {
      window.refreshMultiSelectionStyles();
    });
  }
  
  // Board görünümünü kaydet (pan/zoom değiştiğinde)
  if (window.saveBoardView) {
    window.saveBoardView();
  }
}

// Klasör kartları için CSS değişkenlerini güncelle (DOM'a dokunmadan, sadece CSS)
function updateFolderCardZoomVariables() {
  const zoomFactor = Math.max(0.5, 1 / boardZoom);
  const folderCards = document.querySelectorAll('.folder-card');
  
  folderCards.forEach(card => {
    // SADECE CSS DEĞİŞKENLERİNİ GÜNCELLE - DOM'A DOKUNMA
    if (boardZoom <= 0.3) {
      card.style.setProperty('--zoom-factor', zoomFactor);
      card.style.setProperty('--content-visible', '0');
    } else {
      card.style.setProperty('--zoom-factor', '1');
      card.style.setProperty('--content-visible', '1');
    }
  });
}


// Global exports
window.boardZoom = boardZoom;
window.boardPanX = boardPanX;
window.boardPanY = boardPanY;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.zoomAtPoint = zoomAtPoint;
window.updateBoardTransform = updateBoardTransform;

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

