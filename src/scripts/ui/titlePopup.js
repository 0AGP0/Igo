// ===== TITLE POPUP SYSTEM =====

// Title Popup System
let titlePopup = null;
let hoveredCard = null;
let popupUpdateRequestId = null;
let lastPopupUpdateTime = 0;

function createTitlePopup() {
  if (!titlePopup) {
    titlePopup = document.createElement('div');
    titlePopup.className = 'title-popup';
    document.body.appendChild(titlePopup);
  }
}

function handleCardHover(e) {
  const card = e.target.closest('.note, .folder-card');
  const boardZoom = window.boardZoom || 1;
  
  // Sadece notlar için popup göster - %28'den küçük zoom'larda ve kart taşınmıyorken
  if (card && 
      card.classList.contains('note') && 
      boardZoom < 0.28 &&
      !card.classList.contains('dragging')) {
    hoveredCard = card;
    showTitlePopup(card, e.clientX, e.clientY);
  }
}

function handleCardLeave(e) {
  const card = e.target.closest('.note, .folder-card');
  if (card) {
    hideTitlePopup();
  }
}

function handleCardMove(e) {
  const boardZoom = window.boardZoom || 1;
  
  // Sadece kartın üzerindeyken popup göster - kart taşınırken değil
  if (hoveredCard && 
      hoveredCard.classList.contains('note') && 
      boardZoom < 0.28 &&
      !hoveredCard.classList.contains('dragging')) {
    updateTitlePopupPosition(e.clientX, e.clientY);
  }
}

function showTitlePopup(card, x, y) {
  const title = card.querySelector('.title');
  if (title && titlePopup) {
    // Eğer popup zaten gösteriliyorsa ve aynı kart için ise güncelle
    if (titlePopup.classList.contains('show') && hoveredCard === card) {
      updateTitlePopupPosition(x, y);
      return;
    }
    
    // Popup içeriğini oluştur
    const titleText = title.textContent.trim();
    if (!titleText) return;
    
    titlePopup.innerHTML = `
      <div class="popup-content">
        <span class="popup-text">${titleText}</span>
      </div>
    `;
    
    // Smooth positioning with offset
    const offsetX = 15;
    const offsetY = -15;
    titlePopup.style.left = (x + offsetX) + 'px';
    titlePopup.style.top = (y + offsetY) + 'px';
    
    // Çıkıntı pozisyonunu başlangıçta ayarla
    titlePopup.style.setProperty('--arrow-offset', '0px');
    
    // Smooth fade in
    titlePopup.style.opacity = '0';
    titlePopup.style.transform = 'translateY(8px) scale(0.9)';
    titlePopup.classList.add('show');
    
    // Animate in
    requestAnimationFrame(() => {
      titlePopup.style.transition = 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      titlePopup.style.opacity = '1';
      titlePopup.style.transform = 'translateY(0) scale(1)';
      
      // Çıkıntı pozisyonunu mouse yönüne göre ayarla
      setTimeout(() => {
        const popupRect = titlePopup.getBoundingClientRect();
        const popupCenterX = popupRect.left + popupRect.width / 2;
        const deltaX = x - popupCenterX;
        const maxOffset = popupRect.width * 0.3;
        const arrowOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
        titlePopup.style.setProperty('--arrow-offset', arrowOffset + 'px');
      }, 50);
    });
  }
}

function hideTitlePopup() {
  if (titlePopup) {
    // Anında gizle - drag ve not açma durumlarında
    titlePopup.style.transition = 'none';
    titlePopup.style.opacity = '0';
    titlePopup.style.transform = 'translateY(8px) scale(0.9)';
    titlePopup.classList.remove('show');
    hoveredCard = null;
  }
}

function updateTitlePopupPosition(x, y) {
  if (titlePopup) {
    // Throttle updates - 16ms (60fps) ile sınırla
    const now = Date.now();
    if (now - lastPopupUpdateTime < 16) {
      return;
    }
    lastPopupUpdateTime = now;
    
    // Smooth following with offset - requestAnimationFrame ile optimize et
    if (popupUpdateRequestId) {
      cancelAnimationFrame(popupUpdateRequestId);
    }
    
    popupUpdateRequestId = requestAnimationFrame(() => {
      const offsetX = 15;
      const offsetY = -15;
      titlePopup.style.left = (x + offsetX) + 'px';
      titlePopup.style.top = (y + offsetY) + 'px';
      
      // Popup çıkıntısını mouse yönüne göre ayarla
      const popupRect = titlePopup.getBoundingClientRect();
      const popupCenterX = popupRect.left + popupRect.width / 2;
      const popupCenterY = popupRect.top + popupRect.height / 2;
      
      // Mouse ile popup merkezi arasındaki mesafe
      const deltaX = x - popupCenterX;
      const deltaY = y - popupCenterY;
      
      // Çıkıntı pozisyonunu hesapla (popup genişliğinin %30'u içinde)
      const maxOffset = popupRect.width * 0.3;
      const arrowOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
      
      // CSS custom property ile çıkıntı pozisyonunu ayarla
      titlePopup.style.setProperty('--arrow-offset', arrowOffset + 'px');
      
      popupUpdateRequestId = null;
    });
  }
}

// Global exports
window.titlePopup = titlePopup;
window.hoveredCard = hoveredCard;
window.createTitlePopup = createTitlePopup;
window.handleCardHover = handleCardHover;
window.handleCardLeave = handleCardLeave;
window.handleCardMove = handleCardMove;
window.showTitlePopup = showTitlePopup;
window.hideTitlePopup = hideTitlePopup;
window.updateTitlePopupPosition = updateTitlePopupPosition;

