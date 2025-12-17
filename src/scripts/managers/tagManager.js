// ===== TAG MANAGER =====
// Etiket sistemi yönetimi

// Etiket kartlarını render et
function renderTagCards() {
  const cardsContainer = document.getElementById('tagCards');
  if (!cardsContainer) return;
  
  const notes = window.notes || [];
  const state = window.getState();
  const activeTagFilters = state.activeTagFilters || [];
  const tagSearchQuery = state.tagSearchQuery || '';
  
  // Etiket istatistiklerini topla
  const tagStats = {};
  notes.forEach(note => {
    note.tags.forEach(tag => {
      if (!tagStats[tag]) {
        tagStats[tag] = {
          count: 0,
          notes: [],
          lastUsed: new Date(note.updatedAt)
        };
      }
      tagStats[tag].count++;
      tagStats[tag].notes.push(note);
      if (new Date(note.updatedAt) > tagStats[tag].lastUsed) {
        tagStats[tag].lastUsed = new Date(note.updatedAt);
      }
    });
  });
  
  // Etiketleri filtrele ve sırala
  let tags = Object.entries(tagStats)
    .filter(([tag]) => !tagSearchQuery || tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
    .sort(([,a], [,b]) => b.count - a.count); // En çok kullanılan ilk önce
  
  // Kartları oluştur
  cardsContainer.innerHTML = tags.map(([tag, stats]) => {
    const isActive = activeTagFilters.includes(tag);
    const daysSinceLastUse = Math.floor((new Date() - stats.lastUsed) / (1000 * 60 * 60 * 24));
    const noteTitles = stats.notes.slice(0, 3).map(note => note.title).join(', ');
    
    return `
      <div class="tag-card ${isActive ? 'active' : ''}" data-tag="${tag}">
        <div class="tag-card-header">
          <div class="tag-card-name">#${tag}</div>
          <div class="tag-card-count">${stats.count}</div>
        </div>
        <div class="tag-card-stats">
          <div class="tag-stat">Son: <span class="tag-stat-value">${daysSinceLastUse === 0 ? 'Bugün' : daysSinceLastUse + ' gün'}</span></div>
          <div class="tag-stat">Not: <span class="tag-stat-value">${stats.count}</span></div>
        </div>
        <div class="tag-card-preview">${noteTitles || 'Notlar...'}</div>
      </div>
    `;
  }).join('');
  
  // Click event'leri ekle
  cardsContainer.querySelectorAll('.tag-card').forEach(card => {
    card.onclick = () => {
      const tag = card.dataset.tag;
      toggleTagFilter(tag);
    };
  });
  
  // Aktif filtreleri render et
  renderActiveTagFilters();
}

// Etiket filtresi toggle
function toggleTagFilter(tag) {
  const state = window.getState();
  
  if (state.activeTagFilters.includes(tag)) {
    state.activeTagFilters = state.activeTagFilters.filter(t => t !== tag);
  } else {
    state.activeTagFilters.push(tag);
  }
  
  window.setState(state);
  
  renderTagCards();
  // Filtreleme için anında render - gecikme olmadan
  if (window.renderNotesImmediate) {
    window.renderNotesImmediate();
  } else if (window.renderNotes) {
    window.renderNotes();
  }
  // Bağlantı çizgilerini de anında güncelle
  if (window.drawConnections) window.drawConnections();
  if (window.renderNoteList) window.renderNoteList();
}

// Aktif filtreleri render et
function renderActiveTagFilters() {
  const filtersContainer = document.getElementById('activeFilters');
  const state = window.getState();
  const activeTagFilters = state.activeTagFilters || [];
  
  if (activeTagFilters.length === 0) {
    filtersContainer.innerHTML = '';
    return;
  }
  
  filtersContainer.innerHTML = activeTagFilters.map(tag => `
    <div class="filter-chip">
      <span>#${tag}</span>
      <span class="filter-chip-remove" onclick="removeTagFilter('${tag}')">✕</span>
    </div>
  `).join('');
}

// Filtre kaldır
function removeTagFilter(tag) {
  const state = window.getState();
  state.activeTagFilters = state.activeTagFilters.filter(t => t !== tag);
  window.setState(state);
  
  renderTagCards();
  // Filtreleme için anında render - gecikme olmadan
  if (window.renderNotesImmediate) {
    window.renderNotesImmediate();
  } else if (window.renderNotes) {
    window.renderNotes();
  }
  // Bağlantı çizgilerini de anında güncelle
  if (window.drawConnections) window.drawConnections();
  if (window.renderNoteList) window.renderNoteList();
}

// Arama temizle
function clearTagSearch() {
  const state = window.getState();
  state.tagSearchQuery = '';
  window.setState(state);
  
  document.getElementById('tagSearch').value = '';
  renderTagCards();
}

// Etiket arama
function searchTags(query) {
  const state = window.getState();
  state.tagSearchQuery = query;
  window.setState(state);
  
  renderTagCards();
}

// Ana render fonksiyonu
function renderTags() {
  renderTagCards();
}

// Global exports
window.renderTagCards = renderTagCards;
window.toggleTagFilter = toggleTagFilter;
window.renderActiveTagFilters = renderActiveTagFilters;
window.removeTagFilter = removeTagFilter;
window.clearTagSearch = clearTagSearch;
window.searchTags = searchTags;
window.renderTags = renderTags;

console.log('🏷️ Tag Manager yüklendi');

