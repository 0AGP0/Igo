// ===== DOM UTILITY FUNCTIONS =====
// Bu fonksiyonlar mevcut kodu bozmadan DOM işlemlerini basitleştirir
const DOM = {
  // Element seçme
  get(id) { return document.getElementById(id); },
  select(selector) { return document.querySelector(selector); },
  selectAll(selector) { return document.querySelectorAll(selector); },
  
  // Class manipülasyonu
  addClass(element, className) { 
    if (element) element.classList.add(className); 
  },
  removeClass(element, className) { 
    if (element) element.classList.remove(className); 
  },
  hasClass(element, className) { 
    return element ? element.classList.contains(className) : false; 
  },
  toggleClass(element, className) { 
    if (element) element.classList.toggle(className); 
  },
  
  // Modal işlemleri
  showModal(modalId) {
    const modal = this.get(modalId);
    const overlay = this.get(`${modalId}Overlay`);
    this.addClass(modal, 'show');
    this.addClass(overlay, 'active');
  },
  
  hideModal(modalId) {
    const modal = this.get(modalId);
    const overlay = this.get(`${modalId}Overlay`);
    this.removeClass(modal, 'show');
    this.removeClass(overlay, 'active');
  }
};

// Global export
window.DOM = DOM;

