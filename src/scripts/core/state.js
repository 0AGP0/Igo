// ===== GLOBAL STATE =====

// Veri yapısı (sadece window üzerinden kullan - referans kaybı önlenir)
if (!window.notes) window.notes = [];
if (!window.folders) window.folders = [];
let notes = window.notes; // Backward compatibility için local referans
let folders = window.folders; // Backward compatibility için local referans
let selectedNote = null;
let selectedFolder = null;
let activeTag = 'all';
let searchQuery = '';
let expandedFolders = []; // Açık klasörler

// Multi-selection sistemi
let selectedNotes = []; // Seçili notlar
let selectedFolders = []; // Seçili klasörler
let selectedTodos = []; // Seçili todo'lar
let isSelecting = false; // Selection box durumu
let selectionStartX = 0;
let selectionStartY = 0;
let selectionBox = null;

// Delete modal sistemi
let noteToDelete = null;

// Graph görünüm ayarları
let graphSettings = {
  showHubs: false,
  showOrphans: false
};

// Folder sistemi
let selectedColor = window.FOLDER_COLORS ? window.FOLDER_COLORS[0] : '#3b82f6'; // Varsayılan renk
let folderToDelete = null; // Silinecek klasör ID'si

// Render state
let renderNotesTimeout = null;
let isRendering = false;
let renderQueue = [];
let renderedCardIds = new Set(); // Hangi kartların render edildiğini takip et
let isViewportChange = false; // Viewport değişikliği mi yoksa yeni kart mı?
let lastViewportBounds = null; // Son viewport sınırları
let viewportRenderCount = 0; // Viewport render sayacı

// Tag sistemi
let activeTagFilters = [];
let tagSearchQuery = '';

// Drag state
let draggedNoteId = null;
let draggedElement = null;

// Global exports - Getter/Setter pattern
window.getState = function() {
  return {
    notes,
    folders,
    selectedNote,
    selectedFolder,
    activeTag,
    searchQuery,
    expandedFolders,
    selectedNotes,
    selectedFolders,
    selectedTodos,
    isSelecting,
    selectionStartX,
    selectionStartY,
    selectionBox,
    noteToDelete,
    graphSettings,
    selectedColor,
    folderToDelete,
    renderNotesTimeout,
    isRendering,
    renderQueue,
    renderedCardIds,
    isViewportChange,
    lastViewportBounds,
    viewportRenderCount,
    activeTagFilters,
    tagSearchQuery,
    draggedNoteId,
    draggedElement
  };
};

window.setState = function(newState) {
  if (newState.notes !== undefined) { notes = newState.notes; window.notes = notes; }
  if (newState.folders !== undefined) { folders = newState.folders; window.folders = folders; }
  if (newState.selectedNote !== undefined) selectedNote = newState.selectedNote;
  if (newState.selectedFolder !== undefined) selectedFolder = newState.selectedFolder;
  if (newState.activeTag !== undefined) activeTag = newState.activeTag;
  if (newState.searchQuery !== undefined) searchQuery = newState.searchQuery;
  if (newState.expandedFolders !== undefined) expandedFolders = newState.expandedFolders;
  if (newState.selectedNotes !== undefined) selectedNotes = newState.selectedNotes;
  if (newState.selectedFolders !== undefined) selectedFolders = newState.selectedFolders;
  if (newState.selectedTodos !== undefined) selectedTodos = newState.selectedTodos;
  if (newState.isSelecting !== undefined) isSelecting = newState.isSelecting;
  if (newState.selectionStartX !== undefined) selectionStartX = newState.selectionStartX;
  if (newState.selectionStartY !== undefined) selectionStartY = newState.selectionStartY;
  if (newState.selectionBox !== undefined) selectionBox = newState.selectionBox;
  if (newState.noteToDelete !== undefined) noteToDelete = newState.noteToDelete;
  if (newState.graphSettings !== undefined) graphSettings = newState.graphSettings;
  if (newState.selectedColor !== undefined) selectedColor = newState.selectedColor;
  if (newState.folderToDelete !== undefined) folderToDelete = newState.folderToDelete;
  if (newState.renderNotesTimeout !== undefined) renderNotesTimeout = newState.renderNotesTimeout;
  if (newState.isRendering !== undefined) isRendering = newState.isRendering;
  if (newState.renderQueue !== undefined) renderQueue = newState.renderQueue;
  if (newState.renderedCardIds !== undefined) renderedCardIds = newState.renderedCardIds;
  if (newState.isViewportChange !== undefined) isViewportChange = newState.isViewportChange;
  if (newState.lastViewportBounds !== undefined) lastViewportBounds = newState.lastViewportBounds;
  if (newState.viewportRenderCount !== undefined) viewportRenderCount = newState.viewportRenderCount;
  if (newState.activeTagFilters !== undefined) activeTagFilters = newState.activeTagFilters;
  if (newState.tagSearchQuery !== undefined) tagSearchQuery = newState.tagSearchQuery;
  if (newState.draggedNoteId !== undefined) draggedNoteId = newState.draggedNoteId;
  if (newState.draggedElement !== undefined) draggedElement = newState.draggedElement;
};

// Direkt export (eski kod uyumluluğu için)
window.selectedNote = selectedNote;
window.selectedFolder = selectedFolder;
window.activeTag = activeTag;
window.searchQuery = searchQuery;
window.expandedFolders = expandedFolders;
window.selectedNotes = selectedNotes;
window.selectedFolders = selectedFolders;
window.selectedTodos = selectedTodos;
window.isSelecting = isSelecting;
window.selectionStartX = selectionStartX;
window.selectionStartY = selectionStartY;
window.selectionBox = selectionBox;
window.noteToDelete = noteToDelete;
window.graphSettings = graphSettings;
window.selectedColor = selectedColor;
window.folderToDelete = folderToDelete;
window.activeTagFilters = activeTagFilters;
window.tagSearchQuery = tagSearchQuery;
window.draggedNoteId = draggedNoteId;
window.draggedElement = draggedElement;

