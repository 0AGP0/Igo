// ===== FILE OPERATIONS =====

// Notes klasörünü açma fonksiyonu
function openNotesFolder() {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    const path = require('path');
    
    // IPC ile main process'e gönder
    ipcRenderer.send('open-notes-folder');
    console.log('📁 Notes klasörü açma isteği gönderildi');
  } else {
    console.log('📁 Notes klasörü açılacak (browser modunda)');
    if (window.showNotification) {
      window.showNotification('Notes klasörü açılacak. Bu özellik sadece Electron uygulamasında çalışır.', 'info');
    }
  }
}

// Tablo stillerini dinamik olarak ekle
function addTableStyles() {
  const styleId = 'vditor-table-styles';
  let styleElement = document.getElementById(styleId);
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  styleElement.textContent = `
    /* Vditor Tablo Stilleri - Dinamik Override */
    .ck-editor__editable table,
    .ck-editor__editable table[data-cke-table],
    .ck-editor__editable .table table,
    .ck-editor__editable .table > table,
    .ck-editor__editable .ck-table,
    .ck-editor__editable .ck-table table {
      border-collapse: separate !important;
      border-spacing: 0 !important;
      width: auto !important;
      margin: 20px 0 !important;
      background: var(--panel) !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
      table-layout: auto !important;
      min-width: 300px !important;
      max-width: none !important;
    }

    .ck-editor__editable table td,
    .ck-editor__editable table th,
    .ck-editor__editable table[data-cke-table] td,
    .ck-editor__editable table[data-cke-table] th,
    .ck-editor__editable .table table td,
    .ck-editor__editable .table table th,
    .ck-editor__editable .table > table td,
    .ck-editor__editable .table > table th,
    .ck-editor__editable .ck-table td,
    .ck-editor__editable .ck-table th {
      border: 1px solid var(--border) !important;
      padding: 12px 16px !important;
      text-align: left !important;
      vertical-align: top !important;
      background: var(--panel) !important;
      color: var(--text) !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      min-width: 80px !important;
      width: auto !important;
      white-space: normal !important;
      word-wrap: break-word !important;
      max-width: 200px !important;
      height: auto !important;
      min-height: 40px !important;
    }

    .ck-editor__editable table th,
    .ck-editor__editable table[data-cke-table] th,
    .ck-editor__editable .table table th,
    .ck-editor__editable .table > table th,
    .ck-editor__editable .ck-table th {
      background: linear-gradient(135deg, var(--accent), var(--accent2)) !important;
      color: #0b0f15 !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      font-size: 12px !important;
      letter-spacing: 0.5px !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 1 !important;
    }

    .ck-editor__editable table tr:nth-child(even) td,
    .ck-editor__editable table[data-cke-table] tr:nth-child(even) td,
    .ck-editor__editable .table table tr:nth-child(even) td,
    .ck-editor__editable .table > table tr:nth-child(even) td,
    .ck-editor__editable .ck-table tr:nth-child(even) td {
      background: rgba(255,255,255,0.02) !important;
    }

    .ck-editor__editable table tr:hover td,
    .ck-editor__editable table[data-cke-table] tr:hover td,
    .ck-editor__editable .table table tr:hover td,
    .ck-editor__editable .table > table tr:hover td,
    .ck-editor__editable .ck-table tr:hover td {
      background: rgba(125,211,252,0.1) !important;
      transition: background-color 0.2s ease !important;
    }
  `;
  
  console.log('🎨 Tablo CSS stilleri dinamik olarak eklendi');
}

// Global exports
window.openNotesFolder = openNotesFolder;
window.addTableStyles = addTableStyles;

