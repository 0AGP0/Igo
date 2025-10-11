
// ===== TODO SİSTEMİ JAVASCRIPT =====

class TodoManager {
  constructor() {
    this.todos = [];
    this.selectedTodo = null;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.draggedTodo = null;
    this.nextTodoId = 1;
    this.hoveredTodoCard = null;
    this.titlePopup = null;
    
    this.init();
    
    // Event delegation sistemi - subtask checkbox'ları için (constructor'da)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.todo-canvas-subtask')) {
        const subtaskElement = e.target.closest('.todo-canvas-subtask');
        const todoCard = subtaskElement.closest('.todo-canvas-card');
        
        // Drag sırasında veya prevent click flag'i varsa checkbox işaretlenmesin
        if (todoCard && (todoCard.classList.contains('dragging') || 
                        todoCard.dataset.isDragging === 'true' || 
                        todoCard.dataset.preventClick === 'true')) {
          return;
        }
        
        // Hareket mesafesi kontrolü
        if (todoCard.dataset.clickStartX && todoCard.dataset.clickStartY) {
          const startX = parseFloat(todoCard.dataset.clickStartX);
          const startY = parseFloat(todoCard.dataset.clickStartY);
          const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
          
          // 10px'den fazla hareket varsa drag sayılır, checkbox işaretlenmesin
          if (distance > 10) {
            return;
          }
        }
        
        if (todoCard && subtaskElement.dataset.todoId) {
          e.stopPropagation();
          const todoId = parseInt(subtaskElement.dataset.todoId);
          
          // Yeni başlık sistemi için
          if (subtaskElement.dataset.sectionId && subtaskElement.dataset.subtaskId) {
            const sectionId = parseInt(subtaskElement.dataset.sectionId);
            const subtaskId = parseInt(subtaskElement.dataset.subtaskId);
            this.toggleSubtaskComplete(todoId, null, sectionId, subtaskId);
          }
          // Eski sistem için
          else if (subtaskElement.dataset.subtaskIndex) {
            const subtaskIndex = parseInt(subtaskElement.dataset.subtaskIndex);
            this.toggleSubtaskComplete(todoId, subtaskIndex);
          }
        }
      }
    });
  }

  init() {
    this.loadTodos();
    this.setupEventListeners();
    this.renderTodoList();
    this.renderCanvasTodos();
    this.updateStats();
    this.createTitlePopup();
    this.startDragStateMonitor();
  }

  setupEventListeners() {
    // Todo sekmesi event listener'ı
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab') && e.target.dataset.tab === 'todos') {
        this.switchToTodoTab();
      }
    });

    // Yeni todo butonu
    document.addEventListener('click', (e) => {
      if (e.target.id === 'newTodoBtn') {
        this.showTodoModal();
      }
    });

    // Todo modal event listener'ları - sadece çarpı butonu ile kapatma
    document.addEventListener('click', (e) => {
      if (e.target.id === 'todoModalCloseBtn') {
        this.closeTodoModal();
      }
    });

    // Todo kaydetme
    document.addEventListener('click', (e) => {
      if (e.target.id === 'todoModalSaveBtn') {
        this.saveTodo();
      }
    });

    // Todo silme
    document.addEventListener('click', (e) => {
      if (e.target.id === 'todoModalDeleteBtn') {
        this.deleteTodo();
      }
    });

    // Todo arama
    const todoSearchInput = document.getElementById('todoSearchInput');
    if (todoSearchInput) {
      todoSearchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderTodoList();
      });
    }

    // Todo filtreleri
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('todo-filter')) {
        this.setFilter(e.target.dataset.filter);
      }
    });

    // Todo seçimi
    document.addEventListener('click', (e) => {
      if (e.target.closest('.todo-card')) {
        const todoCard = e.target.closest('.todo-card');
        const todoId = parseInt(todoCard.dataset.todoId);
        this.selectTodo(todoId);
      }
    });

    // Canvas'ta todo oluşturma
    // Canvas'ta oluştur butonu kaldırıldı

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 't' && !e.shiftKey) {
        e.preventDefault();
        this.showTodoModal();
      }
      
      // ESC tuşu ile modal kapatma
      if (e.key === 'Escape') {
        const modal = document.getElementById('todoModal');
        if (modal && modal.classList.contains('show')) {
          this.closeTodoModal();
        }
      }
    });
  }

  switchToTodoTab() {
    // Diğer tab'ları kapat
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Todo tab'ını aç
    document.querySelector('.tab[data-tab="todos"]').classList.add('active');
    document.getElementById('tab-todos').classList.add('active');
    
    this.renderTodoList();
    this.renderCanvasTodos();
    this.updateStats();
  }

  createTodo(title = '', description = '', priority = 'medium', dueDate = '', connections = [], subtasks = [], folderId = null, sections = []) {
    const todo = {
      id: this.nextTodoId++,
      title: title || 'Yeni Todo',
      description: description || '',
      priority: priority,
      dueDate: dueDate,
      completed: false,
      subtasks: subtasks || [],
      sections: sections || [], // Yeni başlık sistemi
      folderId: folderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      connections: connections || [],
      position: { x: 100, y: 100 }, // Canvas pozisyonu
        size: { width: 320, height: 180 }, // Canvas boyutu - yeni tasarım
      x: 100, // Ana sistem uyumluluğu için
      y: 100  // Ana sistem uyumluluğu için
    };

    this.todos.push(todo);
    this.saveTodos();
    this.renderTodoList();
    this.renderCanvasTodos(); // Anında canvas'ta göster
    this.updateStats();
    
    return todo;
  }

  updateTodo(id, updates) {
    const todoIndex = this.todos.findIndex(todo => todo.id === id);
    if (todoIndex !== -1) {
      this.todos[todoIndex] = { ...this.todos[todoIndex], ...updates, updatedAt: new Date().toISOString() };
      
      // Ana sistem uyumluluğu için x, y alanlarını güncelle
      if (updates.position) {
        this.todos[todoIndex].x = updates.position.x;
        this.todos[todoIndex].y = updates.position.y;
      }
      if (updates.x !== undefined) {
        this.todos[todoIndex].position.x = updates.x;
      }
      if (updates.y !== undefined) {
        this.todos[todoIndex].position.y = updates.y;
      }
      
      this.saveTodos();
      this.renderTodoList();
      this.renderCanvasTodos();
      this.updateStats();
    }
  }

  deleteTodo(id = null) {
    const todoId = id || this.selectedTodo;
    if (todoId) {
      const todo = this.todos.find(t => t.id === todoId);
      if (todo) {
        // Modal'ı aç
        this.todoToDelete = todoId;
        const deleteModalOverlay = document.getElementById('deleteTodoModalOverlay');
        const deleteModalTodoTitle = document.getElementById('deleteModalTodoTitle');
        
        deleteModalTodoTitle.textContent = todo.title || 'Başlıksız Todo';
        deleteModalOverlay.classList.add('active');
      }
    }
  }

  toggleTodoComplete(id) {
    const todo = this.todos.find(todo => todo.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      todo.updatedAt = new Date().toISOString();
      this.saveTodos();
      this.renderTodoList();
      this.renderCanvasTodos();
      this.updateStats();
    }
  }

  toggleSubtaskComplete(todoId, subtaskIndex, sectionId = null, subtaskId = null) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;

    if (sectionId && subtaskId) {
      // Yeni başlık sistemi - section içindeki subtask
      const section = todo.sections.find(s => s.id === sectionId);
      if (section) {
        const subtask = section.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
          subtask.completed = !subtask.completed;
          todo.updatedAt = new Date().toISOString();
          this.saveTodos();
          this.renderTodoList();
          this.renderCanvasTodos();
          this.updateStats();
        }
      }
    } else if (subtaskIndex !== null && todo.subtasks && todo.subtasks[subtaskIndex]) {
      // Eski sistem - doğrudan subtasks array'i
      todo.subtasks[subtaskIndex].completed = !todo.subtasks[subtaskIndex].completed;
      todo.updatedAt = new Date().toISOString();
      this.saveTodos();
      this.renderTodoList();
      this.renderCanvasTodos();
      this.updateStats();
    }
  }

  selectTodo(id) {
    this.selectedTodo = id;
    this.renderTodoList();
    this.renderCanvasTodos();
  }

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.todo-filter').forEach(f => f.classList.remove('active'));
    document.querySelector(`.todo-filter[data-filter="${filter}"]`).classList.add('active');
    this.renderTodoList();
  }

  getFilteredTodos() {
    let filtered = [...this.todos];

    // Filtre uygula
    switch (this.currentFilter) {
      // Aktif ve tamamlanan filtreleri kaldırıldı - todo kartlarında gösterilecek
      case 'high':
        filtered = filtered.filter(todo => todo.priority === 'high');
        break;
      case 'medium':
        filtered = filtered.filter(todo => todo.priority === 'medium');
        break;
      case 'low':
        filtered = filtered.filter(todo => todo.priority === 'low');
        break;
    }

    // Arama uygula
    if (this.searchQuery) {
      filtered = filtered.filter(todo => 
        todo.title.toLowerCase().includes(this.searchQuery) ||
        todo.description.toLowerCase().includes(this.searchQuery)
      );
    }

    return filtered;
  }

  renderTodoList() {
    const todoList = document.getElementById('todoList');
    if (!todoList) return;

    const filteredTodos = this.getFilteredTodos();
    
    todoList.innerHTML = '';

    if (filteredTodos.length === 0) {
      todoList.innerHTML = `
        <div class="empty-todo-list">
          <div class="empty-icon">📝</div>
          <div class="empty-text">Henüz todo yok</div>
          <div class="empty-subtext">Yeni todo oluşturmak için + butonuna tıklayın</div>
        </div>
      `;
      return;
    }

    filteredTodos.forEach(todo => {
      const todoCard = this.createTodoCard(todo);
      todoList.appendChild(todoCard);
    });
  }

  createTodoCard(todo) {
    const todoCard = document.createElement('div');
    todoCard.className = `todo-card ${todo.completed ? 'completed' : ''} ${this.selectedTodo === todo.id ? 'selected' : ''}`;
    todoCard.dataset.todoId = todo.id;

    const formattedDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString('tr-TR') : '';
    const statusCounts = this.getTodoStatusCounts(todo);
    const statusHtml = `
      <div class="todo-status-container">
        <div class="todo-status açık">○ ${statusCounts.openTasks} Açık</div>
        <div class="todo-status biten">● ${statusCounts.completedTasks} Biten</div>
      </div>
    `;
    
    const connectionsHtml = todo.connections.length > 0 ? 
      `<div class="todo-connections">
        ${todo.connections.map(conn => `
          <span class="todo-connection" title="Bağlantı: ${conn}">
            <span class="todo-connection-icon">↗</span>
            ${conn}
          </span>
        `).join('')}
      </div>` : '';

    // Başlıklar ve alt görevler HTML'i
    const sectionsHtml = todo.sections && todo.sections.length > 0 ? 
      todo.sections.map(section => {
        const sectionSubtasksHtml = section.subtasks.slice(0, 2).map(subtask => `
          <div class="todo-subtask-item-small">
            <span class="todo-subtask-text">${subtask.text}</span>
          </div>
        `).join('');
        
        const moreSubtasks = section.subtasks.length > 2 ? `<div class="todo-subtask-more">+${section.subtasks.length - 2} daha...</div>` : '';
        
        return `
          <div class="todo-section">
            <div class="todo-section-title">${section.title}</div>
            <div class="todo-section-subtasks">
              ${sectionSubtasksHtml}
              ${moreSubtasks}
            </div>
          </div>
        `;
      }).join('') : '';

    // Eski subtask sistemi için uyumluluk
    const legacySubtasksHtml = todo.subtasks && todo.subtasks.length > 0 && (!todo.sections || todo.sections.length === 0) ? 
      `<div class="todo-subtasks">
        ${todo.subtasks.slice(0, 3).map(subtask => `
          <div class="todo-subtask-item-small">
            <span class="todo-subtask-text">${subtask.text}</span>
          </div>
        `).join('')}
        ${todo.subtasks.length > 3 ? `<div class="todo-subtask-more">${todo.subtasks.length - 3} daha...</div>` : ''}
      </div>` : '';

    todoCard.innerHTML = `
      <div class="todo-header">
        <div class="todo-content">
          <div class="todo-title">${todo.title}</div>
          <div class="todo-description">${todo.description}</div>
          ${sectionsHtml}
          ${legacySubtasksHtml}
          ${connectionsHtml}
        </div>
      </div>
      <div class="todo-meta">
        ${statusHtml}
        <div class="todo-priority ${todo.priority}">${this.getPriorityText(todo.priority)}</div>
        ${formattedDate ? `<div class="todo-date">${formattedDate}</div>` : ''}
      </div>
    `;

    // Todo card'a click event'i ekle (not paneli gibi)
    todoCard.addEventListener('click', () => {
      this.selectTodo(todo.id);
      // Todo kartını canvas'ta ortala
      if (window.centerOnTodo) {
        window.centerOnTodo(todo.id);
      }
    });

    return todoCard;
  }

  getPriorityText(priority) {
    const priorityTexts = {
      high: 'Yüksek',
      medium: 'Orta',
      low: 'Düşük'
    };
    return priorityTexts[priority] || priority;
  }

  // Todo'nun açık/biten görev sayılarını hesapla (sadece subtask'lar)
  getTodoStatusCounts(todo) {
    let openTasks = 0;
    let completedTasks = 0;
    
    // Yeni başlık sistemi için
    if (todo.sections && todo.sections.length > 0) {
      todo.sections.forEach(section => {
        section.subtasks.forEach(subtask => {
          if (subtask.completed) {
            completedTasks++;
          } else {
            openTasks++;
          }
        });
      });
    } else if (todo.subtasks && todo.subtasks.length > 0) {
      // Eski sistem için uyumluluk
      todo.subtasks.forEach(subtask => {
        if (subtask.completed) {
          completedTasks++;
        } else {
          openTasks++;
        }
      });
    }
    
    return { openTasks, completedTasks };
  }

  showTodoModal(todoId = null) {
    const modal = document.getElementById('todoModal');
    if (!modal) {
      this.createTodoModal();
    }

    const todo = todoId ? this.todos.find(t => t.id === todoId) : null;
    this.selectedTodo = todoId;

    if (todo) {
      // Düzenleme modu
      document.getElementById('todoModalTitle').textContent = 'Todo Düzenle';
      document.getElementById('todoTitleInput').value = todo.title;
      document.getElementById('todoDescriptionInput').value = todo.description;
      document.getElementById('todoDueDateInput').value = todo.dueDate || '';
      
      // Priority seçimi
      document.querySelectorAll('.priority-option-compact').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.priority === todo.priority) {
          option.classList.add('selected');
        }
      });

      // Başlıkları ve alt görevleri yükle
      this.loadSectionsToModal(todo.sections || []);

      // Silme butonunu göster
      const deleteBtn = document.getElementById('todoModalDeleteBtn');
      if (deleteBtn) deleteBtn.style.display = 'block';
    } else {
      // Yeni todo modu
      document.getElementById('todoModalTitle').textContent = 'Yeni Todo Oluştur';
      document.getElementById('todoTitleInput').value = '';
      document.getElementById('todoDescriptionInput').value = '';
      document.getElementById('todoDueDateInput').value = '';
      
      // Başlıkları temizle
      this.loadSectionsToModal([]);
      
      // Default priority seç
      document.querySelectorAll('.priority-option-compact').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.priority === 'medium') {
          option.classList.add('selected');
        }
      });

      // Silme butonunu gizle
      const deleteBtn = document.getElementById('todoModalDeleteBtn');
      if (deleteBtn) deleteBtn.style.display = 'none';
    }

    document.getElementById('todoModal').classList.add('show');
    document.getElementById('todoTitleInput').focus();
  }

  closeTodoModal() {
    const modal = document.getElementById('todoModal');
    if (modal) {
      modal.classList.remove('show');
    }
    this.selectedTodo = null;
  }

  saveTodo() {
    const title = document.getElementById('todoTitleInput').value.trim();
    const description = document.getElementById('todoDescriptionInput').value.trim();
    const dueDate = document.getElementById('todoDueDateInput').value;
    const selectedPriority = document.querySelector('.priority-option-compact.selected');
    const priority = selectedPriority ? selectedPriority.dataset.priority : 'medium';
    const sections = this.getSectionsFromModal();

    if (!title) {
      alert('Todo başlığı boş olamaz!');
      return;
    }

    if (this.selectedTodo) {
      // Güncelleme
      this.updateTodo(this.selectedTodo, {
        title,
        description,
        dueDate,
        priority,
        sections
      });
    } else {
      // Yeni todo
      this.createTodo(title, description, priority, dueDate, [], [], null, sections);
    }

    this.closeTodoModal();
  }

  createTodoModal() {
    const modalHtml = `
      <div class="todo-modal-overlay" id="todoModal">
        <div class="todo-modal-compact">
          <div class="todo-modal-header">
            <div class="todo-modal-title">
              <span class="todo-modal-title-icon">•</span>
              <span id="todoModalTitle">Yeni Todo</span>
            </div>
            <div class="todo-modal-controls">
              <div class="todo-priority-selector-compact">
                <div class="priority-option-compact high" data-priority="high" title="Yüksek Öncelik">!</div>
                <div class="priority-option-compact medium selected" data-priority="medium" title="Orta Öncelik">•</div>
                <div class="priority-option-compact low" data-priority="low" title="Düşük Öncelik">-</div>
              </div>
              <button class="todo-modal-close" id="todoModalCloseBtn">×</button>
            </div>
          </div>
          
          <div class="todo-modal-body">
            <div class="todo-form-row">
              <input type="text" class="todo-title-input-compact" id="todoTitleInput" placeholder="Todo başlığı..." maxlength="100">
              <input type="date" class="todo-date-input-compact" id="todoDueDateInput" title="Bitiş Tarihi">
            </div>
            
            <textarea class="todo-description-input-compact" id="todoDescriptionInput" placeholder="Açıklama (opsiyonel)..." rows="2"></textarea>
            
            <div class="todo-sections-compact" id="todoSectionsContainer">
              <!-- Başlıklar ve alt görevler buraya gelecek -->
            </div>
            
            <div class="todo-add-controls">
              <button type="button" class="todo-add-btn-compact" id="addSectionBtn" title="Başlık Ekle">+ Başlık</button>
            </div>
          </div>
          
          <div class="todo-modal-footer">
            <button class="todo-delete-btn-compact" id="todoModalDeleteBtn" style="display: none;" title="Todo'yu Sil">🗑️</button>
            <button class="todo-save-btn-compact" id="todoModalSaveBtn">Kaydet</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Modal overlay'e tıklamayı engelle
    const modalOverlay = document.getElementById('todoModal');
    modalOverlay.addEventListener('click', (e) => {
      // Sadece overlay'e tıklandığında (modal'a değil) hiçbir şey yapma
      if (e.target === modalOverlay) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });

    // Priority seçimi event listener'ı
    document.querySelectorAll('.priority-option-compact').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.priority-option-compact').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    // Başlık ekleme butonu
    document.getElementById('addSectionBtn').addEventListener('click', () => {
      this.addSection();
    });
  }

  // Başlık ekleme
  addSection() {
    const container = document.getElementById('todoSectionsContainer');
    const sectionId = Date.now();
    
    const sectionHtml = `
      <div class="todo-section-compact" data-section-id="${sectionId}">
        <div class="todo-section-header-compact">
          <input type="text" class="todo-section-title-compact" placeholder="Başlık adı..." maxlength="50" value="Yeni Başlık">
          <button type="button" class="todo-section-remove-compact" onclick="window.todoManager.removeSection(${sectionId})" title="Başlığı Sil">×</button>
        </div>
        <div class="todo-section-subtasks-compact">
          <!-- Alt görevler buraya gelecek -->
        </div>
        <button type="button" class="todo-add-subtask-compact" onclick="window.todoManager.addSubtaskToSection(${sectionId})" title="Alt Görev Ekle">+</button>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', sectionHtml);
  }

  // Başlık kaldırma
  removeSection(sectionId) {
    const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (sectionElement) {
      sectionElement.remove();
    }
  }

  // Başlığa alt görev ekleme
  addSubtaskToSection(sectionId) {
    const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!sectionElement) return;
    
    const subtasksContainer = sectionElement.querySelector('.todo-section-subtasks-compact');
    const subtaskId = Date.now();
    
    const subtaskHtml = `
      <div class="todo-subtask-compact" data-subtask-id="${subtaskId}">
        <input type="text" class="todo-subtask-input-compact" placeholder="Alt görev..." maxlength="80">
        <button type="button" class="todo-subtask-remove-compact" onclick="window.todoManager.removeSubtask(${subtaskId})" title="Sil">×</button>
      </div>
    `;
    
    subtasksContainer.insertAdjacentHTML('beforeend', subtaskHtml);
  }

  // Alt görev kaldırma
  removeSubtask(subtaskId) {
    const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (subtaskElement) {
      subtaskElement.remove();
    }
  }

  // Başlıkları kaydetme
  getSectionsFromModal() {
    const sections = [];
    document.querySelectorAll('.todo-section-compact').forEach(section => {
      const titleInput = section.querySelector('.todo-section-title-compact');
      const sectionTitle = titleInput.value.trim();
      
      if (sectionTitle) {
        const subtasks = [];
        section.querySelectorAll('.todo-subtask-compact').forEach(item => {
          const input = item.querySelector('.todo-subtask-input-compact');
          
          if (input.value.trim()) {
            subtasks.push({
              id: parseInt(item.dataset.subtaskId),
              text: input.value.trim(),
              completed: false
            });
          }
        });
        
        sections.push({
          id: parseInt(section.dataset.sectionId),
          title: sectionTitle,
          subtasks: subtasks
        });
      }
    });
    
    return sections;
  }

  // Başlıkları modal'a yükleme
  loadSectionsToModal(sections) {
    const container = document.getElementById('todoSectionsContainer');
    container.innerHTML = '';
    
    if (sections && sections.length > 0) {
      sections.forEach(section => {
        const subtasksHtml = section.subtasks.map(subtask => `
          <div class="todo-subtask-compact" data-subtask-id="${subtask.id}">
            <input type="text" class="todo-subtask-input-compact" value="${subtask.text}" placeholder="Alt görev..." maxlength="80">
            <button type="button" class="todo-subtask-remove-compact" onclick="window.todoManager.removeSubtask(${subtask.id})" title="Sil">×</button>
          </div>
        `).join('');
        
        const sectionHtml = `
          <div class="todo-section-compact" data-section-id="${section.id}">
            <div class="todo-section-header-compact">
              <input type="text" class="todo-section-title-compact" placeholder="Başlık adı..." maxlength="50" value="${section.title}">
              <button type="button" class="todo-section-remove-compact" onclick="window.todoManager.removeSection(${section.id})" title="Başlığı Sil">×</button>
            </div>
            <div class="todo-section-subtasks-compact">
              ${subtasksHtml}
            </div>
            <button type="button" class="todo-add-subtask-compact" onclick="window.todoManager.addSubtaskToSection(${section.id})" title="Alt Görev Ekle">+</button>
          </div>
        `;
        
        container.insertAdjacentHTML('beforeend', sectionHtml);
      });
    }
  }

  // createTodoOnCanvas fonksiyonu kaldırıldı

  renderCanvasTodos() {
    const board = document.getElementById('board');
    if (!board) {
      console.log('📋 Board bulunamadı, todo kartları render edilemiyor');
      return;
    }

    // Sürekli render'ı engelle
    if (this.isRendering) {
      console.log('📋 Zaten render ediliyor, atla');
      return;
    }
    this.isRendering = true;

    // console.log('📋 Todo kartları render ediliyor...', this.todos.length, 'todo');

    // Mevcut todo canvas kartlarını temizle
    document.querySelectorAll('.todo-canvas-card').forEach(card => card.remove());

    this.todos.forEach(todo => {
      const todoCard = this.createTodoCanvasCard(todo);
      board.appendChild(todoCard);
      this.setupTodoCanvasEvents(todoCard, todo);
      
      // Popup event'lerini ekle
      this.setupTodoPopupEvents(todoCard);
      
      // Klasör rengini uygula
      if (todo.folderId) {
        const folder = window.folders?.find(f => f.id === todo.folderId);
        if (folder) {
          this.updateTodoCardColor(todoCard, folder.color);
        }
      }
      
      // console.log('📋 Todo kartı oluşturuldu:', todo.title, 'ID:', todo.id);
    });

    // Ana sistemin drawConnections fonksiyonu todo-klasör ve todo-not bağlantılarını otomatik çizecek
    if (window.drawConnections) {
      window.drawConnections();
    }
    
    // console.log('📋 Toplam', this.todos.length, 'todo kartı render edildi');
    
    // Render işlemi bitti
    this.isRendering = false;
  }

  createTodoCanvasCard(todo) {
    const todoCard = document.createElement('div');
    todoCard.className = `todo-canvas-card ${todo.completed ? 'completed' : ''} ${this.selectedTodo === todo.id ? 'selected' : ''}`;
    todoCard.dataset.todoId = todo.id;
    todoCard.id = `todo-${todo.id}`;
    
    // Ana sistemle uyumlu pozisyonlama
    const x = todo.x !== undefined ? todo.x : todo.position.x;
    const y = todo.y !== undefined ? todo.y : todo.position.y;
    
    todoCard.style.left = `${x}px`;
    todoCard.style.top = `${y}px`;
    todoCard.style.width = `${todo.size.width}px`;
    // Dinamik boyutlandırma için height'ı auto yap
    todoCard.style.height = 'auto';
    todoCard.style.minHeight = `${todo.size.height}px`;

    const connectionsHtml = todo.connections.length > 0 ? 
      `<div class="todo-canvas-connections">
        ${todo.connections.map(conn => `
          <span class="todo-canvas-connection" title="Bağlantı: ${conn}">${conn}</span>
        `).join('')}
      </div>` : '';

    // Başlıklar ve alt görevler HTML'i
    const sectionsHtml = todo.sections && todo.sections.length > 0 ? 
      todo.sections.map(section => {
        const sectionSubtasksHtml = section.subtasks.slice(0, 2).map(subtask => `
          <div class="todo-canvas-subtask ${subtask.completed ? 'completed' : ''}" data-todo-id="${todo.id}" data-section-id="${section.id}" data-subtask-id="${subtask.id}">
            <div class="todo-canvas-subtask-checkbox">${subtask.completed ? '✓' : ''}</div>
            <span class="todo-canvas-subtask-text">${subtask.text}</span>
          </div>
        `).join('');
        
        const moreSubtasks = section.subtasks.length > 2 ? `<div class="todo-canvas-subtask-more">+${section.subtasks.length - 2} daha...</div>` : '';
        
        return `
          <div class="todo-canvas-section">
            <div class="todo-canvas-section-title">
              <span class="todo-canvas-section-title-text">${section.title}</span>
            </div>
            <div class="todo-canvas-section-subtasks">
              ${sectionSubtasksHtml}
              ${moreSubtasks}
            </div>
          </div>
        `;
      }).join('') : '';

    // Eski subtask sistemi için uyumluluk
    const legacySubtasksHtml = todo.subtasks && todo.subtasks.length > 0 && (!todo.sections || todo.sections.length === 0) ? 
      `<div class="todo-canvas-subtasks">
        ${todo.subtasks.slice(0, 3).map(subtask => `
          <div class="todo-canvas-subtask ${subtask.completed ? 'completed' : ''}" data-todo-id="${todo.id}" data-subtask-index="${todo.subtasks.indexOf(subtask)}">
            <div class="todo-canvas-subtask-checkbox">${subtask.completed ? '✓' : ''}</div>
            <span class="todo-canvas-subtask-text">${subtask.text}</span>
          </div>
        `).join('')}
        ${todo.subtasks.length > 3 ? `<div class="todo-canvas-subtask-more">+${todo.subtasks.length - 3} daha...</div>` : ''}
      </div>` : '';

    todoCard.innerHTML = `
      <div class="todo-canvas-header">
        <div class="todo-canvas-title">${todo.title}</div>
        <div class="todo-canvas-priority ${todo.priority}">${this.getPriorityText(todo.priority)}</div>
      </div>
      <div class="todo-canvas-body">
        <div class="todo-canvas-description">${todo.description}</div>
        ${sectionsHtml}
        ${legacySubtasksHtml}
        ${connectionsHtml}
      </div>
      <div class="todo-canvas-resize"></div>
    `;

    // Event listener'ları ekle
    this.setupTodoCanvasEvents(todoCard, todo);

    // Dinamik boyutlandırma - subtask sayısına göre
    this.adjustTodoCardHeight(todoCard, todo);

    return todoCard;
  }

  adjustTodoCardHeight(todoCard, todo) {
    const baseHeight = 200; // Minimum yükseklik
    let calculatedHeight = baseHeight;
    
    // Başlık sistemi için yükseklik hesaplama
    if (todo.sections && todo.sections.length > 0) {
      const sectionHeight = 50; // Her başlık için ek yükseklik
      const subtaskHeight = 35; // Her subtask için ek yükseklik
      const maxSubtasksPerSection = 2; // Her başlıkta maksimum gösterilecek subtask sayısı
      
      todo.sections.forEach(section => {
        calculatedHeight += sectionHeight; // Başlık için
        const visibleSubtasks = Math.min(section.subtasks.length, maxSubtasksPerSection);
        calculatedHeight += (visibleSubtasks * subtaskHeight);
        
        // "Daha..." göstergesi için ek alan
        if (section.subtasks.length > maxSubtasksPerSection) {
          calculatedHeight += 20;
        }
      });
    } else if (todo.subtasks && todo.subtasks.length > 0) {
      // Eski sistem için uyumluluk
      const subtaskHeight = 40;
      const maxSubtasks = 5;
      const visibleSubtasks = Math.min(todo.subtasks.length, maxSubtasks);
      calculatedHeight += (visibleSubtasks * subtaskHeight);
      
      if (todo.subtasks.length > maxSubtasks) {
        calculatedHeight += 25;
      }
    }
    
    // Minimum yüksekliği koru
    calculatedHeight = Math.max(calculatedHeight, baseHeight);
    
    // Boyutu güncelle
    todoCard.style.minHeight = `${calculatedHeight}px`;
    
    // Todo verisini güncelle
    todo.size.height = calculatedHeight;
    this.updateTodo(todo.id, { size: todo.size });
  }

  setupTodoCanvasEvents(todoCard, todo) {
    // Ana sistem ile uyumlu drag & drop sistemi
    this.makeTodoDraggable(todoCard, todo.id);

    // Seçim - mousedown ile çakışmaması için kaldırıldı, mouseup'da handle edilecek

    // Edit ve delete butonları kaldırıldı - sağ tık menüsü kullanılıyor

    // Boyutlandırma
    const resizeHandle = todoCard.querySelector('.todo-canvas-resize');
    let isResizing = false;
    let startSize = { width: 0, height: 0 };
    let startPos = { x: 0, y: 0 };

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      todoCard.classList.add('resizing');
      
      startSize.width = todoCard.offsetWidth;
      startSize.height = todoCard.offsetHeight;
      startPos.x = e.clientX;
      startPos.y = e.clientY;

      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      let newWidth = Math.max(200, startSize.width + deltaX);
      let newHeight = Math.max(100, startSize.height + deltaY);

      todoCard.style.width = `${newWidth}px`;
      todoCard.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        todoCard.classList.remove('resizing');
        
        // Boyutu kaydet
        const width = parseInt(todoCard.style.width);
        const height = parseInt(todoCard.style.height);
        
        this.updateTodo(todo.id, {
          size: { width, height }
        });
      }
    });
  }



  updateStats() {
    const totalTodos = this.todos.length;
    const highPriorityTodos = this.todos.filter(todo => todo.priority === 'high').length;
    const mediumPriorityTodos = this.todos.filter(todo => todo.priority === 'medium').length;
    const lowPriorityTodos = this.todos.filter(todo => todo.priority === 'low').length;

    const statsHtml = `
      <div class="todo-stats">
        <div class="todo-stat">
          <span class="todo-stat-icon">•</span>
          <span class="todo-stat-value">${totalTodos}</span>
          <span>Toplam</span>
        </div>
        <div class="todo-stat">
          <span class="todo-stat-icon">!</span>
          <span class="todo-stat-value">${highPriorityTodos}</span>
          <span>Yüksek</span>
        </div>
        <div class="todo-stat">
          <span class="todo-stat-icon">•</span>
          <span class="todo-stat-value">${mediumPriorityTodos}</span>
          <span>Orta</span>
        </div>
        <div class="todo-stat">
          <span class="todo-stat-icon">-</span>
          <span class="todo-stat-value">${lowPriorityTodos}</span>
          <span>Düşük</span>
        </div>
      </div>
    `;

    const statsContainer = document.getElementById('todoStats');
    if (statsContainer) {
      statsContainer.innerHTML = statsHtml;
    }
  }

  saveTodos() {
    // Dosya sistemine kaydet
    if (typeof require !== 'undefined') {
      const { ipcRenderer } = require('electron');
      
      // Pozisyonları topla
      const positions = {};
      this.todos.forEach(todo => {
        if (todo.x !== undefined && todo.y !== undefined) {
          positions[todo.id] = {
            x: todo.x,
            y: todo.y,
            width: todo.width || 280,
            height: todo.height || 200
          };
        }
      });
      
      const todoData = {
        todos: this.todos,
        positions: positions,
        nextTodoId: this.nextTodoId
      };
      
      ipcRenderer.send('save-todos-to-file', todoData);
      
      // Başarı callback'i
      ipcRenderer.once('todos-saved-to-file', (event, result) => {
        if (result.success) {
          console.log('📋 Todo\'lar dosyaya kaydedildi');
        } else {
          console.error('❌ Todo\'lar dosyaya kaydedilemedi:', result.error);
          // Hata durumunda localStorage'a yedekle
          localStorage.setItem('igo-todos', JSON.stringify(this.todos));
          localStorage.setItem('igo-next-todo-id', this.nextTodoId.toString());
        }
      });
    } else {
      // Fallback: localStorage (web ortamında)
      localStorage.setItem('igo-todos', JSON.stringify(this.todos));
      localStorage.setItem('igo-next-todo-id', this.nextTodoId.toString());
    }
  }

  loadTodos() {
    console.log('📋 Todo\'lar yükleniyor...');
    
    if (typeof require !== 'undefined') {
      const { ipcRenderer } = require('electron');
      
      // Dosya sisteminden yükle
      ipcRenderer.send('load-todos-from-file');
      
      ipcRenderer.once('todos-loaded-from-file', (event, result) => {
        if (result.success) {
          if (result.todos.length > 0) {
            // Dosyadan todo'lar yüklendi
            this.todos = result.todos;
            this.nextTodoId = result.nextTodoId;
            
            // Pozisyonları uygula
            Object.keys(result.positions).forEach(todoId => {
              const todo = this.todos.find(t => t.id === parseInt(todoId));
              if (todo) {
                const pos = result.positions[todoId];
                todo.x = pos.x;
                todo.y = pos.y;
                todo.width = pos.width;
                todo.height = pos.height;
              }
            });
            
            console.log('📋 Todo\'lar dosyadan yüklendi:', this.todos.length, 'todo');
            this.renderTodoList();
            
            // localStorage'dan dosya sistemine geçiş yapıldıysa bildir
            if (result.fromLocalStorage) {
              console.log('📋 localStorage\'dan dosya sistemine geçiş yapılıyor...');
              this.migrateFromLocalStorage();
            }
            
          } else {
            // Dosyadan todo yüklenemedi, localStorage'dan dene
            this.loadFromLocalStorage();
          }
        } else {
          console.error('❌ Todo\'lar dosyadan yüklenemedi:', result.error);
          this.loadFromLocalStorage();
        }
      });
    } else {
      // Fallback: localStorage (web ortamında)
      this.loadFromLocalStorage();
    }
  }
  
  loadFromLocalStorage() {
    // İlk kurulum kontrolü - eğer bu yeni bir kurulum ise localStorage'ı temizle
    const appVersion = '1.0.1';
    const savedVersion = localStorage.getItem('igo-app-version');
    
    if (savedVersion !== appVersion) {
      console.log('🆕 Yeni kurulum tespit edildi, localStorage temizleniyor...');
      // Test todo'larını temizle
      localStorage.removeItem('igo-todos');
      localStorage.removeItem('igo-next-todo-id');
      localStorage.setItem('igo-app-version', appVersion);
      console.log('✅ localStorage temizlendi, yeni versiyon kaydedildi');
    }
    
    const savedTodos = localStorage.getItem('igo-todos');
    const savedNextId = localStorage.getItem('igo-next-todo-id');
    
    if (savedTodos) {
      this.todos = JSON.parse(savedTodos);
      console.log('📋 Todo\'lar localStorage\'dan yüklendi:', this.todos.length, 'todo');
      
      // Eğer hala test todo'ları varsa temizle (geliştirme sırasında kalan test verileri)
      const testTodos = this.todos.filter(todo => 
        todo.title === 'Test Todo' || 
        todo.title === 'er' || 
        todo.title === 'wdfwdfw' ||
        todo.title.includes('test') ||
        todo.title.includes('Test')
      );
      
      if (testTodos.length > 0) {
        console.log('🧹 Test todo\'lar temizleniyor:', testTodos.map(t => t.title));
        this.todos = this.todos.filter(todo => !testTodos.includes(todo));
        // Temizlenmiş todo'ları kaydet
        this.saveTodos();
      }
    } else {
      console.log('📋 İlk kez çalışıyor, boş başlıyor...');
      // İlk kez çalışıyorsa boş başla, test todo oluşturma
    }
    
    if (savedNextId) {
      this.nextTodoId = parseInt(savedNextId);
    }
    
    console.log('📋 Toplam todo sayısı:', this.todos.length);
    this.renderTodoList();
  }
  
  migrateFromLocalStorage() {
    // localStorage'dan dosya sistemine geçiş
    const savedTodos = localStorage.getItem('igo-todos');
    const savedNextId = localStorage.getItem('igo-next-todo-id');
    
    if (savedTodos) {
      console.log('📋 localStorage\'dan dosya sistemine geçiş yapılıyor...');
      this.saveTodos(); // Dosya sistemine kaydet
      
      // localStorage'ı temizle (opsiyonel)
      // localStorage.removeItem('igo-todos');
      // localStorage.removeItem('igo-next-todo-id');
    }
  }

  // Todo'yu not kartına bağla
  connectTodoToNote(todoId, noteTitle) {
    const todo = this.todos.find(t => t.id === todoId);
    if (todo && !todo.connections.includes(noteTitle)) {
      todo.connections.push(noteTitle);
      this.updateTodo(todoId, { connections: todo.connections });
    }
  }

  // Subtask completion toggle - güncellendi
  toggleSubtaskComplete(todoId, subtaskIndex, sectionId = null, subtaskId = null) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;

    if (sectionId && subtaskId) {
      // Yeni başlık sistemi - section içindeki subtask
      const section = todo.sections.find(s => s.id === sectionId);
      if (section) {
        const subtask = section.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
          subtask.completed = !subtask.completed;
          this.updateTodo(todoId, { sections: todo.sections });
          
          // Sadece checkbox'ı güncelle, tüm kartı render etme
          const todoCard = document.querySelector(`.todo-canvas-card[data-todo-id="${todoId}"]`);
          if (todoCard) {
            const subtaskElement = todoCard.querySelector(`.todo-canvas-subtask[data-subtask-id="${subtaskId}"]`);
            if (subtaskElement) {
              const checkbox = subtaskElement.querySelector('.todo-canvas-subtask-checkbox');
              if (checkbox) {
                checkbox.textContent = subtask.completed ? '✓' : '';
                subtaskElement.classList.toggle('completed', subtask.completed);
              }
            }
          }
        }
      }
    } else if (subtaskIndex !== null && todo.subtasks && todo.subtasks[subtaskIndex]) {
      // Eski sistem - doğrudan subtasks array'i
      todo.subtasks[subtaskIndex].completed = !todo.subtasks[subtaskIndex].completed;
      this.updateTodo(todoId, { subtasks: todo.subtasks });
      
      // Sadece checkbox'ı güncelle, tüm kartı render etme
      const todoCard = document.querySelector(`.todo-canvas-card[data-todo-id="${todoId}"]`);
      if (todoCard) {
        const subtaskElement = todoCard.querySelector(`.todo-canvas-subtask[data-subtask-index="${subtaskIndex}"]`);
        if (subtaskElement) {
          const checkbox = subtaskElement.querySelector('.todo-canvas-subtask-checkbox');
          if (checkbox) {
            checkbox.textContent = todo.subtasks[subtaskIndex].completed ? '✓' : '';
            subtaskElement.classList.toggle('completed', todo.subtasks[subtaskIndex].completed);
          }
        }
      }
    }
  }

  // Not kartını todo'ya bağla
  connectTodoToNote(todoId, noteTitle) {
    const todo = this.todos.find(t => t.id === todoId);
    
    // Not'un mevcut olup olmadığını kontrol et
    const noteExists = window.notes && window.notes.find(note => note.title === noteTitle);
    if (!noteExists) {
      console.warn(`⚠️ Not "${noteTitle}" bulunamadı, bağlantı kurulamıyor`);
      console.log('🔍 Mevcut notlar:', window.notes ? window.notes.map(n => n.title) : 'window.notes tanımlı değil');
      return;
    }
    
    if (todo && !todo.connections.includes(noteTitle)) {
      todo.connections.push(noteTitle);
      this.updateTodo(todoId, { connections: todo.connections });
      
      // Bağlantı çizgilerini yeniden çiz
      if (window.drawConnections) {
        window.drawConnections();
      }
      
      // console.log(`🔗 Todo "${todo.title}" not "${noteTitle}" ile bağlandı`);
    }
  }


  // Bağlantıyı kaldır
  disconnectTodoFromNote(todoId, noteTitle) {
    const todo = this.todos.find(t => t.id === todoId);
    if (todo) {
      todo.connections = todo.connections.filter(conn => conn !== noteTitle);
      this.updateTodo(todoId, { connections: todo.connections });
      
      // Bağlantı çizgilerini yeniden çiz
      if (window.drawConnections) {
        window.drawConnections();
      }
      
      // console.log(`🔗 Todo "${todo.title}" ile not "${noteTitle}" bağlantısı kaldırıldı`);
    }
  }

  // Ana sistemin drag sistemini kullan
  makeTodoDraggable(todoElement, todoId) {
    // Ana sistemin drag sistemi artık todo'ları da destekliyor
    // Sadece context menu ekle
    todoElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showTodoContextMenu(e, todoId);
    });
  }

  // Todo context menu
  showTodoContextMenu(event, todoId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;

    event.preventDefault();
    event.stopPropagation();

    // Mevcut context menu'yu kaldır
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';

    // Klasör listesini al
    const folders = window.folders || [];
    console.log('📁 Mevcut klasörler:', folders.length, folders.map(f => f.name));
    
    // Context menu öğelerini oluştur
    const editItem = document.createElement('div');
    editItem.className = 'context-menu-item';
    editItem.innerHTML = '<span>✏️</span> Düzenle';
    editItem.addEventListener('click', () => {
      this.showTodoModal(todoId);
      contextMenu.remove();
    });

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item';
    deleteItem.innerHTML = '<span>🗑️</span> Sil';
    deleteItem.addEventListener('click', () => {
      this.deleteTodo(todoId);
      contextMenu.remove();
    });

    // Divider
    const divider = document.createElement('div');
    divider.className = 'context-menu-divider';

    contextMenu.appendChild(editItem);
    contextMenu.appendChild(deleteItem);
    contextMenu.appendChild(divider);

    // Bağlantı yönetimi butonu
    const connectionsDivider = document.createElement('div');
    connectionsDivider.className = 'context-menu-divider';
    contextMenu.appendChild(connectionsDivider);

    const connectionsButton = document.createElement('div');
    connectionsButton.className = 'context-menu-item';
    connectionsButton.innerHTML = '<span>🔗</span> Bağlantıları Yönet';
    connectionsButton.addEventListener('click', () => {
      if (window.showConnectionModal) {
        window.showConnectionModal('todo', todoId, todo.title);
      }
      contextMenu.remove();
    });
    contextMenu.appendChild(connectionsButton);


    // Widget sınırları içinde pozisyon hesapla (not kartları gibi)
    try {
      const position = window.calculateMenuPosition(event.clientX, event.clientY, contextMenu);
      contextMenu.style.left = position.x + 'px';
      contextMenu.style.top = position.y + 'px';
      console.log('✅ Todo context menu pozisyonu hesaplandı:', position);
    } catch (error) {
      console.error('❌ Todo context menu pozisyon hatası:', error);
      // Hata durumunda basit pozisyon kullan
      contextMenu.style.left = event.clientX + 'px';
      contextMenu.style.top = event.clientY + 'px';
    }

    document.body.appendChild(contextMenu);

    // Context menu'yu kapatma
    const closeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  }

  // Todo kopyalama
  duplicateTodo(todoId) {
    const originalTodo = this.todos.find(t => t.id === todoId);
    if (originalTodo) {
      const newTodo = {
        ...originalTodo,
        id: this.nextTodoId++,
        title: originalTodo.title + ' (Kopya)',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        position: { 
          x: originalTodo.position.x + 20, 
          y: originalTodo.position.y + 20 
        },
        connections: []
      };
      
      this.todos.push(newTodo);
      this.saveTodos();
      this.renderTodoList();
      this.renderCanvasTodos();
      this.updateStats();
    }
  }

  // Todo klasörünü değiştir (not kartlarındaki gibi)
  changeTodoFolder(todoId, newFolderId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;
    
    // Eski bağlantı çizgilerini temizle
    document.querySelectorAll('[class*="todo-folder-connection"]').forEach(line => line.remove());
    
    const oldFolderId = todo.folderId;
    todo.folderId = newFolderId;
    todo.updatedAt = new Date().toISOString();
    
    // Veritabanını güncelle
    this.saveTodos();
    
    // UI'yi güncelle
    this.renderTodoList();
    this.renderCanvasTodos();
    
    // Klasör bağlantı çizgisi ve renklendirme
    if (newFolderId) {
      // Ana sistemin drawConnections fonksiyonu todo bağlantılarını otomatik çizecek
      // Sadece renklendirme yap
      const folder = window.folders?.find(f => f.id === newFolderId);
      if (folder) {
        const todoCard = document.querySelector(`.todo-canvas-card[data-todo-id="${todoId}"]`);
        if (todoCard) {
          this.updateTodoCardColor(todoCard, folder.color);
        }
      }
    } else {
      // Klasörsüz yapıldıysa bağlantıları temizle
      const todoCard = document.querySelector(`.todo-canvas-card[data-todo-id="${todoId}"]`);
      if (todoCard) {
        todoCard.classList.remove('folder-colored');
        // Orijinal renge döndür
        todoCard.style.background = 'linear-gradient(135deg, #1a1a1a, #2d2d2d)';
        todoCard.style.border = '2px solid #333';
        todoCard.style.setProperty('--folder-color', '');
      }
    }
    
    const folderName = newFolderId ? 
      (window.folders?.find(f => f.id === newFolderId)?.name || 'Bilinmeyen') : 
      'Klasörsüz';
    
    console.log(`📁 Todo "${todo.title}" "${folderName}" klasörüne taşındı`);
    
    // Başarı bildirimi
    if (window.showNotification) {
      window.showNotification(`"${todo.title}" "${folderName}" klasörüne taşındı`, 'success');
    }
  }


  // Todo kartının rengini klasör rengine göre güncelle
  updateTodoCardColor(todoCard, folderColor) {
    // Klasör rengini CSS custom property olarak ayarla
    todoCard.style.setProperty('--folder-color', folderColor);
    
    // Kartın arka planını varsayılan tut
    todoCard.style.background = 'var(--panel)';
    todoCard.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)';
    
    // Sadece border rengini klasör rengine göre güncelle
    todoCard.style.border = `2px solid ${folderColor}`;
    
    // CSS class ekle
    todoCard.classList.add('folder-colored');
  }

  // Hex rengi RGB'ye çevir
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }



  // Todo'yu klasörden ayırma
  disconnectTodoFromFolder(todoId) {
    const todo = this.todos.find(t => t.id === todoId);
    
    if (todo) {
      const oldFolderId = todo.folderId;
      todo.folderId = null;
      todo.updatedAt = new Date().toISOString();
      
      // Veritabanını güncelle
      this.saveTodos();
      
      // Eski bağlantı çizgilerini temizle
      document.querySelectorAll('[class*="todo-folder-connection"]').forEach(line => line.remove());
      
      // UI'yi güncelle
      this.renderTodoList();
      this.renderCanvasTodos();
      
      console.log(`📁 Todo "${todo.title}" klasörden ayrıldı`);
      
      // Başarı bildirimi
      if (window.showNotification) {
        window.showNotification(`"${todo.title}" klasörden ayrıldı`, 'info');
      }
    }
  }
}

// Global todo manager instance
let todoManager;

// Sayfa yüklendiğinde todo manager'ı başlat
document.addEventListener('DOMContentLoaded', () => {
  todoManager = new TodoManager();
  
  // Global olarak tanımla
  window.todoManager = todoManager;
  
  console.log('📋 Todo sistemi dosya tabanlı modda başlatıldı');
  
  // Ana sistemin render fonksiyonlarını hook'la
  setTimeout(() => {
    
    // Ana sistemin updateBoardSize fonksiyonunu todo'ları dahil edecek şekilde override et
    if (window.updateBoardSize) {
      const originalUpdateBoardSize = window.updateBoardSize;
      window.updateBoardSize = function() {
        originalUpdateBoardSize.apply(this, arguments);
        
        // Todo'ları da board boyutuna dahil et
        if (window.todoManager && window.todoManager.todos.length > 0) {
          const board = document.getElementById('board');
          if (board) {
            // Mevcut board boyutlarını al
            const currentWidth = parseInt(board.style.width) || 800;
            const currentHeight = parseInt(board.style.height) || 600;
            
            // Todo'ların sınırlarını hesapla
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            window.todoManager.todos.forEach(todo => {
              const x = todo.x !== undefined ? todo.x : todo.position.x;
              const y = todo.y !== undefined ? todo.y : todo.position.y;
              
              if (x !== undefined && y !== undefined) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + todo.size.width);
                maxY = Math.max(maxY, y + todo.size.height);
              }
            });
            
            // Todo'lar varsa board boyutunu genişlet
            if (minX !== Infinity) {
              const padding = 100;
              const todoBoardWidth = Math.max(maxX - minX + padding * 2, currentWidth);
              const todoBoardHeight = Math.max(maxY - minY + padding * 2, currentHeight);
              
              board.style.width = Math.max(currentWidth, todoBoardWidth) + 'px';
              board.style.height = Math.max(currentHeight, todoBoardHeight) + 'px';
            }
          }
        }
      };
    }
    
    // Ana sistemin render fonksiyonlarını hook'la - sadece todo render'ı için
    // Hook'ları kaldırdık çünkü sürekli render döngüsüne sebep oluyordu
    
    // İlk render'ı tetikle
    if (window.updateBoardSize) {
      window.updateBoardSize();
    }
    if (window.renderNotes) {
      window.renderNotes();
    }
    
    // Todo'ları render et
    if (window.todoManager) {
      window.todoManager.renderCanvasTodos();
    }
  }, 1000);
});

// ===== TODO POPUP SİSTEMİ =====

// Todo popup fonksiyonlarını TodoManager'a ekle
TodoManager.prototype.createTitlePopup = function() {
  if (!this.titlePopup) {
    this.titlePopup = document.createElement('div');
    this.titlePopup.className = 'todo-title-popup';
    document.body.appendChild(this.titlePopup);
  }
};

TodoManager.prototype.handleTodoCardHover = function(e) {
  const card = e.target.closest('.todo-canvas-card');
  // Sadece düşük zoom seviyelerinde popup göster - not kartlarıyla aynı mantık
  if (card && 
      !this.isTodoBeingDragged(card) && 
      (window.boardZoom || 1) < 0.28) {
    this.hoveredTodoCard = card;
    this.showTitlePopup(card, e.clientX, e.clientY);
  }
};

TodoManager.prototype.handleTodoCardLeave = function(e) {
  const card = e.target.closest('.todo-canvas-card');
  if (card) {
    this.hideTitlePopup();
  }
};

TodoManager.prototype.handleTodoCardMove = function(e) {
  // Sadece düşük zoom seviyelerinde popup güncelle - not kartlarıyla aynı mantık
  if (this.hoveredTodoCard && 
      !this.isTodoBeingDragged(this.hoveredTodoCard) && 
      (window.boardZoom || 1) < 0.28) {
    this.updateTitlePopupPosition(e.clientX, e.clientY);
  }
};

TodoManager.prototype.showTitlePopup = function(card, x, y) {
  const title = card.querySelector('.todo-canvas-title');
  if (title && this.titlePopup) {
    // Eğer popup zaten gösteriliyorsa ve aynı kart için ise güncelle
    if (this.titlePopup.classList.contains('show') && this.hoveredTodoCard === card) {
      this.updateTitlePopupPosition(x, y);
      return;
    }
    
    this.titlePopup.textContent = title.textContent;
    
    // Smooth positioning with offset
    const offsetX = 10;
    const offsetY = -10;
    this.titlePopup.style.left = (x + offsetX) + 'px';
    this.titlePopup.style.top = (y + offsetY) + 'px';
    
    // Çıkıntı pozisyonunu başlangıçta ayarla
    this.titlePopup.style.setProperty('--arrow-offset', '0px');
    
    // Smooth fade in
    this.titlePopup.style.opacity = '0';
    this.titlePopup.style.transform = 'translateY(3px) scale(0.95)';
    this.titlePopup.classList.add('show');
    
    // Animate in
    requestAnimationFrame(() => {
      this.titlePopup.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
      this.titlePopup.style.opacity = '1';
      this.titlePopup.style.transform = 'translateY(0) scale(1)';
      
      // Çıkıntı pozisyonunu mouse yönüne göre ayarla
      setTimeout(() => {
        const popupRect = this.titlePopup.getBoundingClientRect();
        const popupCenterX = popupRect.left + popupRect.width / 2;
        const deltaX = x - popupCenterX;
        const maxOffset = popupRect.width * 0.2;
        const arrowOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
        this.titlePopup.style.setProperty('--arrow-offset', arrowOffset + 'px');
      }, 40);
    });
  }
};

TodoManager.prototype.hideTitlePopup = function() {
  if (this.titlePopup) {
    this.titlePopup.style.transition = 'opacity 0.1s ease, transform 0.1s ease';
    this.titlePopup.style.opacity = '0';
    this.titlePopup.style.transform = 'translateY(3px) scale(0.95)';
    
    setTimeout(() => {
      this.titlePopup.classList.remove('show');
      this.hoveredTodoCard = null;
    }, 100);
  }
};

TodoManager.prototype.updateTitlePopupPosition = function(x, y) {
  if (this.titlePopup && this.titlePopup.classList.contains('show')) {
    const offsetX = 10;
    const offsetY = -10;
    this.titlePopup.style.left = (x + offsetX) + 'px';
    this.titlePopup.style.top = (y + offsetY) + 'px';
    
    // Çıkıntı pozisyonunu güncelle
    const popupRect = this.titlePopup.getBoundingClientRect();
    const popupCenterX = popupRect.left + popupRect.width / 2;
    const deltaX = x - popupCenterX;
    const maxOffset = popupRect.width * 0.2;
    const arrowOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    this.titlePopup.style.setProperty('--arrow-offset', arrowOffset + 'px');
  }
};

TodoManager.prototype.isTodoBeingDragged = function(card) {
  // Ana sistemin draggingTodos array'ini kontrol et
  if (window.draggingTodos && window.draggingTodos.includes(card)) {
    return true;
  }
  
  // Alternatif olarak card'ın dataset'inde todoId varsa kontrol et
  const todoId = card.dataset.todoId;
  if (todoId && window.draggingTodos) {
    return window.draggingTodos.some(draggedCard => 
      draggedCard.dataset.todoId === todoId
    );
  }
  
  return false;
};

TodoManager.prototype.startDragStateMonitor = function() {
  // Ana sistemin drag state'ini sadece gerektiğinde kontrol et (performans için)
  this.dragMonitorInterval = setInterval(() => {
    if (this.hoveredTodoCard && this.isTodoBeingDragged(this.hoveredTodoCard)) {
      // Eğer hovered card drag ediliyorsa popup'ı gizle
      this.hideTitlePopup();
    }
  }, 500); // 500ms'de bir kontrol et - çok daha performanslı
  
  console.log('📋 Todo drag state monitor başlatıldı (500ms interval)');
};

TodoManager.prototype.stopDragStateMonitor = function() {
  // Monitor'ü durdur (performans için)
  if (this.dragMonitorInterval) {
    clearInterval(this.dragMonitorInterval);
    this.dragMonitorInterval = null;
    console.log('📋 Todo drag state monitor durduruldu');
  }
};

TodoManager.prototype.setupTodoPopupEvents = function(todoCard) {
  // Hover event'leri
  todoCard.addEventListener('mouseenter', (e) => {
    this.handleTodoCardHover(e);
  });
  
  todoCard.addEventListener('mouseleave', (e) => {
    this.handleTodoCardLeave(e);
  });
  
  todoCard.addEventListener('mousemove', (e) => {
    this.handleTodoCardMove(e);
  });
  
  // Ana sistemin drag event'lerini dinle
  todoCard.addEventListener('mousedown', (e) => {
    // Drag başladığında popup'ı gizle
    if (e.button === 0) { // Sol tık
      this.hideTitlePopup();
    }
  });
  
  // Global drag state'i dinle
  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.todo-canvas-card')) {
      // Todo kartı drag başladı, popup'ı gizle
      setTimeout(() => {
        this.hideTitlePopup();
      }, 10);
    }
  });
  
  document.addEventListener('mouseup', () => {
    // Drag bittiğinde popup state'ini temizle
    this.hoveredTodoCard = null;
  });
};

// Todo silme modal fonksiyonları
TodoManager.prototype.closeDeleteTodoModal = function() {
  const deleteModalOverlay = document.getElementById('deleteTodoModalOverlay');
  deleteModalOverlay.classList.remove('active');
  this.todoToDelete = null;
};

TodoManager.prototype.confirmDeleteTodo = function() {
  if (this.todoToDelete) {
    // Silinecek todo'yu bul
    const todoToDeleteObj = this.todos.find(t => t.id === this.todoToDelete);
    
    // Gerçek silme işlemi
    this.todos = this.todos.filter(todo => todo.id !== this.todoToDelete);
    this.selectedTodo = null;
    this.saveTodos();
    this.renderTodoList();
    this.renderCanvasTodos();
    this.updateStats();
    this.closeTodoModal();
    
    // Modal'ı kapat
    this.closeDeleteTodoModal();
    
    // Başarı bildirimi
    if (window.showNotification) {
      window.showNotification(`"${todoToDeleteObj?.title || 'Todo'}" silindi`, 'success');
    }
  }
};

// Export for use in other scripts
window.TodoManager = TodoManager;
window.todoManager = todoManager;



