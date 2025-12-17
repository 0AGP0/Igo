// ===== EDGE INDICATORS =====
// Viewport dışındaki ana klasörler için kenar göstergeleri (oklar)

let edgeIndicatorUpdateTimer = null;

// Kenar göstergelerini güncelle
function updateEdgeIndicators() {
  // Önceki timer'ı temizle
  if (edgeIndicatorUpdateTimer) {
    cancelAnimationFrame(edgeIndicatorUpdateTimer);
    edgeIndicatorUpdateTimer = null;
  }
  
  // Performans için requestAnimationFrame kullan
  edgeIndicatorUpdateTimer = requestAnimationFrame(() => {
    const boardwrap = document.querySelector('.boardwrap');
    const board = document.getElementById('board');
    
    if (!boardwrap || !board) return;
    
    // Mevcut göstergeleri temizle
    document.querySelectorAll('.edge-indicator').forEach(indicator => indicator.remove());
    
    // Ana klasörleri al (parentId olmayan)
    const folders = window.folders || [];
    const mainFolders = folders.filter(folder => !folder.parentId && folder.x !== undefined && folder.y !== undefined);
    
    if (mainFolders.length === 0) return;
    
    // Viewport bilgilerini al
    const boardwrapRect = boardwrap.getBoundingClientRect();
    const zoomVars = window.getZoomPanVars();
    const boardZoom = zoomVars.boardZoom || 1;
    const boardPanX = zoomVars.boardPanX || 0;
    const boardPanY = zoomVars.boardPanY || 0;
    
    // Viewport sınırlarını hesapla (board koordinatlarına göre)
    const viewportLeft = -boardPanX / boardZoom;
    const viewportRight = (-boardPanX + boardwrapRect.width) / boardZoom;
    const viewportTop = -boardPanY / boardZoom;
    const viewportBottom = (-boardPanY + boardwrapRect.height) / boardZoom;
    
    // Margin - kenardan ne kadar uzakta olacak
    const margin = 30;
    
    // Her ana klasör için kontrol et
    mainFolders.forEach(folder => {
      const folderX = folder.x;
      const folderY = folder.y;
      const folderWidth = folder.width || 200;
      const folderHeight = folder.height || 120;
      
      // Klasörün merkez noktası
      const folderCenterX = folderX + folderWidth / 2;
      const folderCenterY = folderY + folderHeight / 2;
      
      // Klasör viewport dışında mı kontrol et
      const isLeft = folderCenterX < viewportLeft;
      const isRight = folderCenterX > viewportRight;
      const isTop = folderCenterY < viewportTop;
      const isBottom = folderCenterY > viewportBottom;
      
      // Klasör viewport dışındaysa gösterge oluştur
      if (isLeft || isRight || isTop || isBottom) {
        // Hangi kenarda olduğunu belirle (öncelik: sol > sağ > üst > alt)
        let edge = null;
        let position = { x: 0, y: 0 };
        let rotation = 0;
        
        if (isLeft) {
          // Sol kenar
          edge = 'left';
          rotation = 180; // Sola bakan ok
          // Y pozisyonunu klasörün Y pozisyonuna göre hesapla (viewport koordinatlarına göre)
          const folderScreenY = ((folderCenterY - viewportTop) * boardZoom);
          position.x = margin;
          position.y = Math.max(margin, Math.min(boardwrapRect.height - margin, folderScreenY));
        } else if (isRight) {
          // Sağ kenar
          edge = 'right';
          rotation = 0; // Sağa bakan ok
          const folderScreenY = ((folderCenterY - viewportTop) * boardZoom);
          position.x = boardwrapRect.width - margin;
          position.y = Math.max(margin, Math.min(boardwrapRect.height - margin, folderScreenY));
        } else if (isTop) {
          // Üst kenar
          edge = 'top';
          rotation = -90; // Yukarı bakan ok
          const folderScreenX = ((folderCenterX - viewportLeft) * boardZoom);
          position.x = Math.max(margin, Math.min(boardwrapRect.width - margin, folderScreenX));
          position.y = margin;
        } else if (isBottom) {
          // Alt kenar
          edge = 'bottom';
          rotation = 90; // Aşağı bakan ok
          const folderScreenX = ((folderCenterX - viewportLeft) * boardZoom);
          position.x = Math.max(margin, Math.min(boardwrapRect.width - margin, folderScreenX));
          position.y = boardwrapRect.height - margin;
        }
        
        if (edge) {
          createEdgeIndicator(folder, position, rotation, edge);
        }
      }
    });
    
    edgeIndicatorUpdateTimer = null;
  });
}

// Kenar göstergesi oluştur
function createEdgeIndicator(folder, position, rotation, edge) {
  const boardwrap = document.querySelector('.boardwrap');
  if (!boardwrap) return;
  
  const indicator = document.createElement('div');
  indicator.className = 'edge-indicator';
  indicator.dataset.folderId = folder.id;
  indicator.style.position = 'absolute'; // Boardwrap'e göre absolute
  indicator.style.left = position.x + 'px';
  indicator.style.top = position.y + 'px';
  indicator.style.width = '16px';
  indicator.style.height = '16px';
  indicator.style.borderRadius = '50%';
  indicator.style.background = folder.color || '#3b82f6';
  indicator.style.border = '2px solid rgba(255,255,255,0.9)';
  indicator.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
  indicator.style.display = 'flex';
  indicator.style.alignItems = 'center';
  indicator.style.justifyContent = 'center';
  indicator.style.transform = `translate(-50%, -50%)`;
  indicator.style.transformOrigin = 'center';
  indicator.style.zIndex = '1000';
  indicator.style.cursor = 'pointer';
  indicator.style.transition = 'all 0.15s ease';
  indicator.style.opacity = '0.8';
  
  // Küçük iç nokta
  indicator.innerHTML = `
    <div style="width: 6px; height: 6px; border-radius: 50%; background: white; opacity: 0.9;"></div>
  `;
  
  // Tooltip - hover'da gösterilecek popup (düz, okunabilir)
  const tooltip = document.createElement('div');
  tooltip.className = 'edge-indicator-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.padding = '8px 14px';
  tooltip.style.borderRadius = '6px';
  tooltip.style.background = 'rgba(15, 23, 42, 0.95)';
  tooltip.style.border = `2px solid ${folder.color || '#3b82f6'}`;
  tooltip.style.color = '#e2e8f0';
  tooltip.style.fontSize = '13px';
  tooltip.style.fontWeight = '500';
  tooltip.style.whiteSpace = 'nowrap';
  tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.opacity = '0';
  tooltip.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
  tooltip.style.zIndex = '1001';
  tooltip.style.transform = 'scale(0.95)';
  tooltip.style.transformOrigin = 'center';
  tooltip.textContent = folder.name || 'Klasör';
  
  // Tooltip pozisyonunu edge'e göre ayarla - POPUP HER ZAMAN VIEWPORT'A DOĞRU AÇILSIN
  let tooltipTransformHide = 'scale(0.95)';
  let tooltipTransformShow = 'scale(1)';
  
  if (edge === 'left') {
    // Sol kenarda - popup sağa açılmalı (viewport'a doğru)
    tooltip.style.left = 'calc(100% + 10px)';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translateY(-50%) translateX(-5px) scale(0.95)';
    tooltipTransformHide = 'translateY(-50%) translateX(-5px) scale(0.95)';
    tooltipTransformShow = 'translateY(-50%) translateX(0) scale(1)';
    tooltip.style.transformOrigin = 'left center';
  } else if (edge === 'right') {
    // Sağ kenarda - popup sola açılmalı (viewport'a doğru)
    tooltip.style.right = 'calc(100% + 10px)';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translateY(-50%) translateX(5px) scale(0.95)';
    tooltipTransformHide = 'translateY(-50%) translateX(5px) scale(0.95)';
    tooltipTransformShow = 'translateY(-50%) translateX(0) scale(1)';
    tooltip.style.transformOrigin = 'right center';
  } else if (edge === 'top') {
    // Üst kenarda - popup aşağı açılmalı (viewport'a doğru)
    tooltip.style.left = '50%';
    tooltip.style.top = 'calc(100% + 10px)';
    tooltip.style.transform = 'translateX(-50%) translateY(-5px) scale(0.95)';
    tooltipTransformHide = 'translateX(-50%) translateY(-5px) scale(0.95)';
    tooltipTransformShow = 'translateX(-50%) translateY(0) scale(1)';
    tooltip.style.transformOrigin = 'center top';
  } else if (edge === 'bottom') {
    // Alt kenarda - popup yukarı açılmalı (viewport'a doğru)
    tooltip.style.left = '50%';
    tooltip.style.bottom = 'calc(100% + 10px)';
    tooltip.style.transform = 'translateX(-50%) translateY(5px) scale(0.95)';
    tooltipTransformHide = 'translateX(-50%) translateY(5px) scale(0.95)';
    tooltipTransformShow = 'translateX(-50%) translateY(0) scale(1)';
    tooltip.style.transformOrigin = 'center bottom';
  }
  
  // Hover efekti - tooltip göster
  indicator.addEventListener('mouseenter', () => {
    indicator.style.opacity = '1';
    indicator.style.transform = `translate(-50%, -50%) scale(1.2)`;
    indicator.style.boxShadow = '0 3px 10px rgba(0,0,0,0.35)';
    tooltip.style.opacity = '1';
    tooltip.style.transform = tooltipTransformShow;
  });
  
  indicator.addEventListener('mouseleave', () => {
    indicator.style.opacity = '0.8';
    indicator.style.transform = `translate(-50%, -50%) scale(1)`;
    indicator.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
    tooltip.style.opacity = '0';
    tooltip.style.transform = tooltipTransformHide;
  });
  
  // Tıklama - klasöre odaklan
  indicator.addEventListener('click', () => {
    if (window.centerOnFolder) {
      window.centerOnFolder(folder.id);
    }
  });
  
  // Indicator'a tooltip'i ekle
  indicator.appendChild(tooltip);
  
  boardwrap.appendChild(indicator);
}

// Debounced güncelleme fonksiyonu
function scheduleEdgeIndicatorUpdate() {
  if (edgeIndicatorUpdateTimer) {
    cancelAnimationFrame(edgeIndicatorUpdateTimer);
  }
  
  edgeIndicatorUpdateTimer = requestAnimationFrame(() => {
    updateEdgeIndicators();
    edgeIndicatorUpdateTimer = null;
  });
}

// Global exports
window.updateEdgeIndicators = updateEdgeIndicators;
window.scheduleEdgeIndicatorUpdate = scheduleEdgeIndicatorUpdate;

console.log('📍 Edge Indicators yüklendi');

