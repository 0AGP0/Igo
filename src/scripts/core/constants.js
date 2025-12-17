// ===== APPLICATION CONSTANTS =====

// Modern renk paleti - Karanlık Tema Uyumlu
const FOLDER_COLORS = [
  // Mavi Tonları
  '#3b82f6', '#06b6d4', '#0ea5e9', '#7dd3fc', '#38bdf8',
  // Mor Tonları  
  '#8b5cf6', '#a78bfa', '#c084fc', '#6366f1', '#8b5cf6',
  // Yeşil Tonları
  '#10b981', '#34d399', '#22d3ee', '#4ade80', '#16a34a',
  // Kırmızı/Pembe Tonları
  '#ef4444', '#f43f5e', '#ec4899', '#fb7185', '#e11d48',
  // Turuncu/Sarı Tonları
  '#f59e0b', '#f97316', '#fb923c', '#fbbf24', '#eab308',
  // Gri Tonları (Karanlık tema için uygun)
  '#64748b', '#6b7280', '#94a3b8', '#cbd5e1', '#e2e8f0',
  // Pastel Tonları (Karanlık tema için uygun)
  '#fde047', '#a7f3d0', '#fed7d7', '#ddd6fe', '#f3e8ff'
];

// LocalStorage anahtarları
const STORAGE_KEYS = {
  NOTES: 'obsidian_widget.notes.v1',
  FOLDERS: 'obsidian_widget.folders.v1',
  ORB_POS: 'obsidian_widget.orbpos',
  PANEL_RECT: 'obsidian_widget.panelrect',
  NOTE_POSITIONS: 'obsidian_widget.note_positions.v1',
  BOARD_VIEW: 'obsidian_widget.board_view.v1',
  TUTORIAL_COMPLETED: 'obsidian_widget.tutorial_completed'
};

// Viewport-Based Rendering için sabitler
const VIEWPORT_BUFFER = 800; // Görünür alanın etrafındaki buffer zone (px)
const RENDER_BATCH_SIZE = 20; // Aynı anda render edilecek maksimum kart sayısı
const RENDER_DELAY = 16; // 60fps için ~16ms delay

// Global exports
window.FOLDER_COLORS = FOLDER_COLORS;
window.STORAGE_KEYS = STORAGE_KEYS;
window.VIEWPORT_BUFFER = VIEWPORT_BUFFER;
window.RENDER_BATCH_SIZE = RENDER_BATCH_SIZE;
window.RENDER_DELAY = RENDER_DELAY;

