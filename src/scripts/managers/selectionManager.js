// ===== SELECTION UTILITY FUNCTIONS =====
const SelectionManager = {
  clearAllSelections() {
    // Not seçimlerini temizle
    window.DOM.selectAll('.note').forEach(el => window.DOM.removeClass(el, 'selected'));
    window.DOM.selectAll('.folder-card').forEach(el => window.DOM.removeClass(el, 'selected'));
    
    // Global değişkenleri temizle
    window.selectedNote = null;
    window.selectedFolder = null;
  },
  
  selectItem(type, id) {
    // Önce tüm seçimleri temizle
    this.clearAllSelections();
    
    if (!id) return;
    
    const selector = type === 'note' ? '.note' : '.folder-card';
    const prefix = type === 'note' ? 'note-' : 'folder-';
    
    const element = window.DOM.get(`${prefix}${id}`);
    if (element) {
      window.DOM.addClass(element, 'selected');
      
      if (type === 'note') {
        window.selectedNote = id;
      } else {
        window.selectedFolder = id;
      }
    }
  }
};

// Global export
window.SelectionManager = SelectionManager;

