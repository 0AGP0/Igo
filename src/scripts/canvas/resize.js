// ===== RESIZE SYSTEM =====
// Not kartı boyutlandırma sistemi

// Global resize state
let currentResizingElement = null;
let currentResizingNoteId = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeRenderTimeout = null;

// Global resize event listeners (sadece bir kez eklenir)
let resizeListenersAdded = false;

function addGlobalResizeListeners() {
  if (resizeListenersAdded) return;
  
  const notes = window.notes || [];
  
  document.addEventListener('mousemove', (e) => {
    if (!currentResizingElement) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - resizeStartX;
    const deltaY = e.clientY - resizeStartY;
    
    // Not verisini al
    const resizingNote = window.notes.find(n => n.id === currentResizingNoteId);
    let minWidth = 200; // Varsayılan minimum genişlik
    
    if (resizingNote) {
      // Başlık + butonlar için minimum genişlik hesapla
      minWidth = window.calculateMinWidthForNote ? window.calculateMinWidthForNote(resizingNote) : 200;
    }
    
    const newWidth = Math.max(minWidth, resizeStartWidth + deltaX);
    const newHeight = Math.max(180, resizeStartHeight + deltaY);
    
    currentResizingElement.style.width = newWidth + 'px';
    currentResizingElement.style.height = newHeight + 'px';
    
    // Not verisini güncelle
    const note = resizingNote;
    if (note) {
      note.customWidth = newWidth;
      note.customHeight = newHeight;
      
      // İçeriği yeniden render et (kart boyutu değiştiğinde) - Debounce ile
      if (resizeRenderTimeout) {
        clearTimeout(resizeRenderTimeout);
      }
      
      resizeRenderTimeout = setTimeout(() => {
        if (!currentResizingElement) return; // Element null ise çık
        const snippetElement = currentResizingElement.querySelector('.snippet');
        if (snippetElement && note && note.text) {
          // Basit çözüm: Not içeriğini direkt render et (resimler dahil)
          const renderedContent = window.renderMarkdown ? window.renderMarkdown(note.text) : note.text;
          snippetElement.innerHTML = renderedContent;
        }
        resizeRenderTimeout = null;
      }, 150); // 150ms debounce - performans için
      
      // Akıllı kaydetme - resize değişikliğinde
      if (window.scheduleSave) window.scheduleSave();
    }
  });
  
  document.addEventListener('mouseup', (e) => {
    if (!currentResizingElement) return;
    
    currentResizingElement.classList.remove('resizing');
    document.body.style.cursor = 'default';
    
    // Pozisyonu kaydet
    if (window.saveNotes) window.saveNotes();
    if (window.saveNotePositions) window.saveNotePositions(); // Not pozisyonlarını da kaydet
    
    // Bağlantıları güncelle
    if (window.drawConnections) window.drawConnections();
    if (window.renderGraph) window.renderGraph();
    
    // Reset resize state
    currentResizingElement = null;
    currentResizingNoteId = null;
  });
  
  resizeListenersAdded = true;
}

// Resize fonksiyonu
function makeResizable(element, noteId) {
  const resizeHandle = element.querySelector('.resize');
  if (!resizeHandle) return;
  
  // Global listeners'ı ekle (sadece ilk kez)
  addGlobalResizeListeners();
  
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    currentResizingElement = element;
    currentResizingNoteId = noteId;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = element.offsetWidth;
    resizeStartHeight = element.offsetHeight;
    
    element.classList.add('resizing');
    document.body.style.cursor = 'nwse-resize';
  });
}

// Board'daki not kartlarını sürüklenebilir yap
function makeDraggable(element, noteId) {
  let mouseDownTime = 0;
  let startX = 0;
  let startY = 0;
  let hasMoved = false;
  const state = window.getState();

  element.addEventListener('mousedown', dragStart);

  function dragStart(e) {
    // Sadece sol tık için drag başlat (sağ tık context menu için)
    if (e.button !== 0) {
      return;
    }
    
    if (e.target.classList.contains('mini') || e.target.classList.contains('resize') || e.target.classList.contains('checklist-checkbox')) {
      return;
    }
    
    if (e.target === element || element.contains(e.target)) {
      mouseDownTime = Date.now();
      startX = e.clientX;
      startY = e.clientY;
      hasMoved = false;

      // Mouse koordinatlarını canvas koordinatlarına çevir
      const board = document.getElementById('board');
      const boardRect = board.getBoundingClientRect();
      
      const boardStartX = e.clientX - boardRect.left;
      const boardStartY = e.clientY - boardRect.top;
      
      const note = window.notes.find(n => n.id === noteId);
      if (note) {
        // Tek not drag başlat
          element.dataset.dragStartX = boardStartX;
          element.dataset.dragStartY = boardStartY;
          element.dataset.initialNoteX = note.x || 0;
          element.dataset.initialNoteY = note.y || 0;
          element.dataset.clickStartX = startX;
          element.dataset.clickStartY = startY;
          element.dataset.mouseDownTime = mouseDownTime;
        }
      }
      
      e.preventDefault();
    }
  }
  
  // Board render bittikten sonra minimap'i güncelle
  if (window.renderGraph) window.renderGraph();


// Global exports
window.addGlobalResizeListeners = addGlobalResizeListeners;
window.makeResizable = makeResizable;
window.makeDraggable = makeDraggable;

console.log('📏 Resize & Drag System yüklendi');

