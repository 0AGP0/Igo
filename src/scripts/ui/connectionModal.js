// ===== CONNECTION MODAL SYSTEM =====
// Bağlantı yönetimi modal'ı

// Bağlantı yönetimi modal'ını göster
function showConnectionModal(sourceType, sourceId, sourceTitle) {
  // Mevcut modal'ı kaldır
  const existingModal = document.querySelector('.connection-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  const modalHtml = `
    <div class="connection-modal-overlay" id="connectionModal">
      <div class="connection-modal">
        <div class="connection-modal-header">
          <div class="connection-modal-title">
            <span>🔗</span>
            <span id="connectionModalTitle">Bağlantı Yönetimi</span>
          </div>
          <button class="connection-modal-close" id="connectionModalClose">×</button>
        </div>
        <div class="connection-modal-body">
          <input type="text" class="connection-search" id="connectionSearch" placeholder="Bağlantı ara...">
          
          <div class="connection-section">
            <div class="connection-section-title">
              <span>📝</span>
              <span>Notlar</span>
            </div>
            <div class="connection-list" id="notesList">
              <!-- Notlar buraya gelecek -->
            </div>
          </div>
          
          <div class="connection-section">
            <div class="connection-section-title">
              <span>📋</span>
              <span>Todo'lar</span>
            </div>
            <div class="connection-list" id="todosList">
              <!-- Todo'lar buraya gelecek -->
            </div>
          </div>
          
          <div class="connection-section">
            <div class="connection-section-title">
              <span>📁</span>
              <span>Klasörler</span>
            </div>
            <div class="connection-list" id="foldersList">
              <!-- Klasörler buraya gelecek -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Modal'ı göster
  const modal = document.getElementById('connectionModal');
  modal.classList.add('show');

  // Event listener'ları ekle
  document.getElementById('connectionModalClose').addEventListener('click', hideConnectionModal);
  
  // Modal dışına tıklanınca kapat
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.preventDefault();
      e.stopPropagation();
      hideConnectionModal();
    }
  });

  // ESC tuşu ile kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      hideConnectionModal();
    }
  });

  // Arama fonksiyonalitesi
  const searchInput = document.getElementById('connectionSearch');
  searchInput.addEventListener('input', () => {
    filterConnectionItems(searchInput.value.toLowerCase());
  });

  // Bağlantıları yükle
  loadConnections(sourceType, sourceId, sourceTitle);
}

// Bağlantı modal'ını gizle
function hideConnectionModal() {
  const modal = document.getElementById('connectionModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 200);
  }
}

// Bağlantıları yükle
function loadConnections(sourceType, sourceId, sourceTitle) {
  const notesList = document.getElementById('notesList');
  const todosList = document.getElementById('todosList');
  const foldersList = document.getElementById('foldersList');

  // Mevcut bağlantıları al
  let currentConnections = [];
  if (sourceType === 'note') {
    const note = window.notes.find(n => n.id === sourceId);
    if (note) {
      currentConnections = note.links || [];
      // Todo bağlantılarını da ekle
      if (window.todoManager) {
        const connectedTodos = window.todoManager.todos.filter(todo => 
          todo.connections && todo.connections.includes(note.title)
        );
        currentConnections = currentConnections.concat(connectedTodos.map(t => t.title));
      }
      // Klasör bağlantısını da ekle
      if (note.folderId) {
        const folder = window.folders.find(f => f.id === note.folderId);
        if (folder) {
          currentConnections.push(folder.name);
        }
      }
    }
  } else if (sourceType === 'todo') {
    const todo = window.todoManager ? window.todoManager.todos.find(t => t.id === sourceId) : null;
    if (todo) {
      currentConnections = todo.connections || [];
      // Klasör bağlantısını da ekle
      if (todo.folderId) {
        const folder = window.folders.find(f => f.id === todo.folderId);
        if (folder) {
          currentConnections.push(folder.name);
        }
      }
    }
  } else if (sourceType === 'folder') {
    const folder = window.folders.find(f => f.id === sourceId);
    if (folder) {
      // Klasöre bağlı notları ve todo'ları al
      const folderNotes = window.notes.filter(n => n.folderId === folder.id);
      const folderTodos = window.todoManager ? window.todoManager.todos.filter(t => t.folderId === folder.id) : [];
      currentConnections = folderNotes.map(n => n.title).concat(folderTodos.map(t => t.title));
    }
  }

  // Notları yükle
  notesList.innerHTML = '';
  window.notes.forEach(note => {
    if (note.id === sourceId && sourceType === 'note') return; // Kendisi hariç
    
    const isConnected = currentConnections.includes(note.title);
    const item = document.createElement('div');
    item.className = `connection-item ${isConnected ? 'connected' : ''}`;
    item.innerHTML = `
      <div class="connection-item-name">
        <span class="connection-item-type connection-type-note">N</span>
        <span>${note.title}</span>
      </div>
      <div class="connection-status ${isConnected ? 'connected' : ''}">
        ${isConnected ? 'Bağlı' : 'Bağlan'}
      </div>
    `;
    
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleConnection(sourceType, sourceId, 'note', note.title);
    });
    
    notesList.appendChild(item);
  });

  // Todo'ları yükle
  todosList.innerHTML = '';
  if (window.todoManager) {
    window.todoManager.todos.forEach(todo => {
      if (todo.id === sourceId && sourceType === 'todo') return; // Kendisi hariç
      
      const isConnected = currentConnections.includes(todo.title);
      const item = document.createElement('div');
      item.className = `connection-item ${isConnected ? 'connected' : ''}`;
      item.innerHTML = `
        <div class="connection-item-name">
          <span class="connection-item-type connection-type-todo">T</span>
          <span>${todo.title}</span>
        </div>
        <div class="connection-status ${isConnected ? 'connected' : ''}">
          ${isConnected ? 'Bağlı' : 'Bağlan'}
        </div>
      `;
      
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleConnection(sourceType, sourceId, 'todo', todo.title);
      });
      
      todosList.appendChild(item);
    });
  }

  // Klasörleri yükle
  foldersList.innerHTML = '';
  window.folders.forEach(folder => {
    if (folder.id === sourceId && sourceType === 'folder') return; // Kendisi hariç
    
    const isConnected = currentConnections.includes(folder.name);
    const item = document.createElement('div');
    item.className = `connection-item ${isConnected ? 'connected' : ''}`;
    item.innerHTML = `
       <div class="connection-item-name">
         <span class="connection-item-type connection-type-folder">F</span>
         <span>${folder.name}</span>
       </div>
      <div class="connection-status ${isConnected ? 'connected' : ''}">
        ${isConnected ? 'Bağlı' : 'Bağlan'}
      </div>
    `;
    
     item.addEventListener('click', (e) => {
       e.preventDefault();
       e.stopPropagation();
       toggleConnection(sourceType, sourceId, 'folder', folder.name);
     });
    
    foldersList.appendChild(item);
  });
}

// Bağlantıyı aç/kapat
function toggleConnection(sourceType, sourceId, targetType, targetTitle) {
  if (sourceType === 'note' && targetType === 'note') {
    // Not-not bağlantısı
    const note = window.notes.find(n => n.id === sourceId);
    if (note) {
      const isConnected = note.links && note.links.includes(targetTitle);
      if (isConnected) {
        // Bağlantıyı kaldır
        note.links = note.links.filter(link => link !== targetTitle);
        console.log(`🔗 Not "${note.title}" ile "${targetTitle}" bağlantısı kaldırıldı`);
      } else {
        // Bağlantıyı ekle
        if (!note.links) note.links = [];
        note.links.push(targetTitle);
        console.log(`🔗 Not "${note.title}" ile "${targetTitle}" bağlandı`);
      }
      if (window.saveNotes) window.saveNotes();
      if (window.drawConnections) window.drawConnections();
    }
  } else if (sourceType === 'note' && targetType === 'folder') {
    // Not-klasör bağlantısı
    const note = window.notes.find(n => n.id === sourceId);
    if (note) {
      const folder = window.folders.find(f => f.name === targetTitle);
      if (folder) {
        if (note.folderId === folder.id) {
          // Bağlantıyı kaldır
          note.folderId = null;
          console.log(`🔗 Not "${note.title}" klasörden çıkarıldı`);
          
          // Dosya sisteminde notu ana klasöre taşı
          if (window.electronAPI) {
            window.electronAPI.moveNoteToFolder(note.id, null, null)
              .then(result => {
                if (result.success) {
                  console.log(`✅ Not "${note.title}" dosya sisteminde ana klasöre taşındı`);
                } else {
                  console.error(`❌ Not dosya sisteminde taşınamadı:`, result.error);
                }
              })
              .catch(error => {
                console.error(`❌ Not taşıma hatası:`, error);
              });
          }
        } else {
          // Bağlantıyı ekle
          note.folderId = folder.id;
          console.log(`🔗 Not "${note.title}" klasöre bağlandı`);
          
          // Dosya sistemine klasör değişikliğini yansıt
          if (window.electronAPI) {
            window.electronAPI.moveNoteToFolder(note.id, folder.id, folder.name)
              .then(result => {
                if (result.success) {
                  console.log(`✅ Not "${note.title}" dosya sisteminde klasöre taşındı`);
                } else {
                  console.error(`❌ Not dosya sisteminde taşınamadı:`, result.error);
                }
              })
              .catch(error => {
                console.error(`❌ Not taşıma hatası:`, error);
              });
          }
        }
        if (window.saveNotes) window.saveNotes();
        if (window.drawConnections) window.drawConnections();
        // Not kartını yeniden render et
        if (window.renderNotesInternal) window.renderNotesInternal();
      }
    }
  } else if (sourceType === 'note' && targetType === 'todo') {
    // Not-todo bağlantısı
    if (window.todoManager) {
      const note = window.notes.find(n => n.id === sourceId);
      const todo = window.todoManager.todos.find(t => t.title === targetTitle);
      if (todo && note) {
        const isConnected = todo.connections && todo.connections.includes(note.title);
        if (isConnected) {
          window.todoManager.disconnectTodoFromNote(todo.id, note.title);
        } else {
          window.todoManager.connectTodoToNote(todo.id, note.title);
        }
      }
    }
  } else if (sourceType === 'todo' && targetType === 'note') {
    // Todo-not bağlantısı
    if (window.todoManager) {
      const isConnected = window.todoManager.todos.find(t => t.id === sourceId)?.connections?.includes(targetTitle);
      if (isConnected) {
        window.todoManager.disconnectTodoFromNote(sourceId, targetTitle);
      } else {
        window.todoManager.connectTodoToNote(sourceId, targetTitle);
      }
    }
  } else if (sourceType === 'todo' && targetType === 'folder') {
    // Todo-klasör bağlantısı
    if (window.todoManager) {
      const todo = window.todoManager.todos.find(t => t.id === sourceId);
      const folder = window.folders.find(f => f.name === targetTitle);
      if (todo && folder) {
        if (todo.folderId === folder.id) {
          // Bağlantıyı kaldır
          todo.folderId = null;
          console.log(`🔗 Todo "${todo.title}" klasörden çıkarıldı`);
        } else {
          // Bağlantıyı ekle
          todo.folderId = folder.id;
          console.log(`🔗 Todo "${todo.title}" klasöre bağlandı`);
        }
        window.todoManager.saveTodos();
        window.todoManager.renderCanvasTodos(); // Todo kartlarını yeniden render et
        if (window.drawConnections) window.drawConnections();
      }
    }
  } else if (sourceType === 'folder' && targetType === 'note') {
    // Klasör-not bağlantısı
    const note = window.notes.find(n => n.title === targetTitle);
    if (note) {
      const folder = window.folders.find(f => f.id === sourceId);
      if (note.folderId === folder.id) {
        // Bağlantıyı kaldır
        note.folderId = null;
        console.log(`🔗 Not "${note.title}" klasörden çıkarıldı`);
      } else {
        // Bağlantıyı ekle
        note.folderId = folder.id;
        console.log(`🔗 Not "${note.title}" klasöre bağlandı`);
      }
      if (window.saveNotes) window.saveNotes();
      if (window.drawConnections) window.drawConnections();
    }
  } else if (sourceType === 'folder' && targetType === 'todo') {
    // Klasör-todo bağlantısı
    if (window.todoManager) {
      const todo = window.todoManager.todos.find(t => t.title === targetTitle);
      if (todo) {
        const folder = window.folders.find(f => f.id === sourceId);
        if (todo.folderId === folder.id) {
          // Bağlantıyı kaldır
          todo.folderId = null;
          console.log(`🔗 Todo "${todo.title}" klasörden çıkarıldı`);
        } else {
          // Bağlantıyı ekle
          todo.folderId = folder.id;
          console.log(`🔗 Todo "${todo.title}" klasöre bağlandı`);
        }
        window.todoManager.saveTodos();
        if (window.drawConnections) window.drawConnections();
      }
    }
  }

  // Modal'ı yenile
  loadConnections(sourceType, sourceId, null);
}

// Bağlantı öğelerini filtrele
function filterConnectionItems(searchTerm) {
  const items = document.querySelectorAll('.connection-item');
  items.forEach(item => {
    const name = item.querySelector('.connection-item-name span:last-child').textContent.toLowerCase();
    if (name.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// Global exports
window.showConnectionModal = showConnectionModal;
window.hideConnectionModal = hideConnectionModal;
window.loadConnections = loadConnections;
window.toggleConnection = toggleConnection;
window.filterConnectionItems = filterConnectionItems;

console.log('🔗 Connection Modal yüklendi');

