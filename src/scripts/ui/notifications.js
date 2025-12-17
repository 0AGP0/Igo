// ===== NOTIFICATION SYSTEM =====

// Bildirim gösterme fonksiyonu
function showNotification(message, type = 'info') {
  // Mevcut bildirimleri temizle
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Bildirim elementi oluştur
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close">✕</button>
    </div>
  `;
  
  // Stil ekle
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,.3);
    backdrop-filter: blur(16px);
    z-index: 10000;
    max-width: 400px;
    animation: slideInRight 0.3s ease-out;
    -webkit-app-region: no-drag;
  `;
  
  // Tip'e göre renk ayarla
  if (type === 'success') {
    notification.style.borderColor = 'var(--ok)';
    notification.style.backgroundColor = 'rgba(52,211,153,0.1)';
  } else if (type === 'error') {
    notification.style.borderColor = 'var(--danger)';
    notification.style.backgroundColor = 'rgba(239,68,68,0.1)';
  } else if (type === 'warning') {
    notification.style.borderColor = '#f59e0b';
    notification.style.backgroundColor = 'rgba(245,158,11,0.1)';
  }
  
  // CSS animasyonu ekle
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    .notification-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .notification-message {
      color: var(--text);
      font-size: 14px;
      font-weight: 500;
      flex: 1;
    }
    .notification-close {
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    .notification-close:hover {
      background: rgba(255,255,255,0.1);
      color: var(--text);
    }
  `;
  
  if (!document.querySelector('#notification-styles')) {
    style.id = 'notification-styles';
    document.head.appendChild(style);
  }
  
  // DOM'a ekle
  document.body.appendChild(notification);
  
  // Kapatma butonu
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  });
  
  // Otomatik kapanma (5 saniye)
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Global export
window.showNotification = showNotification;

