// ===== FOLDER OPERATIONS =====
// Klasör renk değiştirme, yeniden adlandırma, alt klasör oluşturma

// Klasör rengi değiştir
function changeFolderColor(folderId) {
  const folders = window.folders || [];
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  
  // Renk seçim modal'ını göster
  showColorPickerModal(folderId, folder.color);
}

// Renk seçici modal
function showColorPickerModal(folderId, currentColor) {
  const FOLDER_COLORS = window.FOLDER_COLORS || [];
  
  // Mevcut modal varsa kaldır
  const existingModal = document.getElementById('colorPickerModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'colorPickerModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal color-picker-modal" onclick="event.stopPropagation()">
      <div class="modal-title">🎨 Klasör Rengi Seç</div>
      <div class="color-picker-content">
        <div class="color-grid">
          ${FOLDER_COLORS.map(color => `
            <div class="color-option ${color === currentColor ? 'selected' : ''}" 
                 style="background: ${color};" 
                 data-color="${color}"
                 onclick="selectFolderColor('${folderId}', '${color}')">
              ${color === currentColor ? '✓' : ''}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-buttons">
        <button class="modal-btn secondary" onclick="closeColorPickerModal()">İptal</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Animasyon
  modal.style.display = 'flex';
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
  
  // Dışarı tıklanınca kapat
  modal.onclick = closeColorPickerModal;
}

function selectFolderColor(folderId, color) {
  const folders = window.folders || [];
  const STORAGE_KEYS = window.STORAGE_KEYS || {};
  
  const folder = folders.find(f => f.id === folderId);
  if (folder) {
    folder.color = color;
    
    // Anında localStorage'a yaz
    try {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      console.log(`🎨 Klasör rengi değiştirildi ve kaydedildi: ${folder.name} → ${color}`);
    } catch (error) {
      console.error('❌ Klasör rengi kaydedilemedi:', error);
    }
    
    // Akıllı kaydetme - değişiklik olduğunda kaydet
    if (window.scheduleSave) window.scheduleSave();
    
    // Anında UI güncelle - gecikme yok!
    if (window.renderFolderList) window.renderFolderList();
    if (window.renderNotesImmediate) window.renderNotesImmediate(); // Debounce olmadan anında render
    
    // Bağlantı çizgilerini de anında güncelle
    setTimeout(() => {
      if (window.drawConnections) window.drawConnections();
    }, 50); // Çok kısa gecikme ile bağlantıları güncelle
    
    closeColorPickerModal();
  }
}

function closeColorPickerModal() {
  const modal = document.getElementById('colorPickerModal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.remove();
    }, 200);
  }
}

// Klasör yeniden adlandırma
function renameFolder(folderId) {
  console.log('🔄 Klasör yeniden adlandırma başlatılıyor:', folderId);
  
  const folders = window.folders || [];
  const notes = window.notes || [];
  const folder = folders.find(f => f.id === folderId);
  
  if (!folder) {
    console.log('❌ Klasör bulunamadı:', folderId);
    return;
  }
  
  console.log('📝 Mevcut klasör adı:', folder.name);
  
  // Modal input kullan
  if (window.showInputModal) {
    window.showInputModal(
      'Klasörü Yeniden Adlandır',
      'Yeni klasör adını girin...',
      folder.name,
      (newName) => {
        if (!newName || newName.trim() === '' || newName === folder.name) {
          console.log('❌ Geçersiz klasör adı veya iptal edildi');
          return;
        }
        
        const trimmedName = newName.trim();
        console.log('📝 Yeni klasör adı:', trimmedName);
        
        // Aynı isimde klasör var mı kontrol et
        const existingFolder = folders.find(f => f.name === trimmedName && f.id !== folderId);
        if (existingFolder) {
          if (window.showNotification) window.showNotification('Bu isimde bir klasör zaten mevcut!', 'error');
          console.log('❌ Aynı isimde klasör mevcut');
          return;
        }
        
        // IPC ile klasörü yeniden adlandır
        if (typeof require !== 'undefined') {
          const { ipcRenderer } = require('electron');
          console.log('📤 IPC mesajı gönderiliyor: rename-folder');
          
          // Alt klasör için parentPath bilgisini ekle
          const folderData = {
            oldName: folder.name,
            newName: trimmedName
          };
          
          // Eğer alt klasörse parentPath'i ekle
          if (folder.parentPath && folder.parentPath !== null) {
            folderData.parentPath = folder.parentPath;
            console.log('📁 Alt klasör yeniden adlandırılıyor, parentPath:', folder.parentPath);
          } else {
            console.log('📁 Ana klasör yeniden adlandırılıyor');
          }
          
          ipcRenderer.send('rename-folder', folderData);
          
          // Başarılı olursa UI'yi güncelle
          ipcRenderer.once('folder-renamed', (event, result) => {
            console.log('📥 IPC yanıtı alındı:', result);
            if (result.success) {
              // Eski klasör adını sakla (alt klasörleri bulmak için)
              const oldFolderName = folder.name;
              
              // Klasördeki notların klasör ID'sini ve relativePath'ini güncelle
              const newFolderId = trimmedName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
              notes.forEach(note => {
                if (note.folderId === folder.id) {
                  note.folderId = newFolderId;
                  
                  // relativePath'i güncelle (eğer varsa)
                  if (note.relativePath) {
                    const pathParts = note.relativePath.split('/');
                    if (pathParts.length > 1) {
                      // Alt klasördeki notlar için
                      pathParts[0] = trimmedName;
                      note.relativePath = pathParts.join('/');
                    } else {
                      // Ana klasördeki notlar için
                      note.relativePath = `${trimmedName}/${note.fileName}`;
                    }
                  }
                  
                  console.log('📝 Not güncellendi:', note.title, '→ relativePath:', note.relativePath);
                }
              });
              
              // Alt klasörlerin parentPath'ini güncelle (ana klasör yeniden adlandırıldığında)
              if (!folder.parentPath) { // Ana klasör ise
                // Eski klasör adını kullanarak alt klasörleri bul
                const updatedFolders = folders.filter(f => f.parentPath === oldFolderName);
                console.log('📁 Alt klasörler bulundu:', updatedFolders.map(f => f.name));
                
                updatedFolders.forEach(subFolder => {
                  subFolder.parentPath = trimmedName;
                  // Alt klasörün path'ini de güncelle
                  subFolder.path = `${trimmedName}/${subFolder.name}`;
                  // Alt klasörün parentId'sini yeni klasör ID'si ile güncelle
                  subFolder.parentId = newFolderId;
                  console.log('📁 Alt klasör parentPath güncellendi:', subFolder.name, '→', trimmedName);
                  console.log('📁 Alt klasör path güncellendi:', subFolder.path);
                  console.log('📁 Alt klasör parentId güncellendi:', subFolder.parentId);
                });
              }
              
              // Klasör adını ve ID'sini güncelle
              folder.name = trimmedName;
              folder.id = newFolderId;
              
              // UI'yi yenile
              if (window.renderFolderList) window.renderFolderList();
              if (window.renderNotes) window.renderNotes();
              if (window.saveFolders) window.saveFolders();
              
              // Bağlantı çizgilerini güncelle
              setTimeout(() => {
                if (window.drawConnections) window.drawConnections();
              }, 100);
              
              console.log('✅ Klasör yeniden adlandırıldı:', trimmedName);
            } else {
              if (window.showNotification) window.showNotification('Klasör yeniden adlandırılamadı: ' + result.error, 'error');
              console.log('❌ Klasör yeniden adlandırılamadı:', result.error);
            }
          });
        }
      }
    );
  }
}

// Alt klasör oluşturma
function createSubFolder(parentFolderId) {
  console.log('📁 Alt klasör oluşturma başlatılıyor:', parentFolderId);
  
  const folders = window.folders || [];
  const FOLDER_COLORS = window.FOLDER_COLORS || [];
  
  const parentFolder = folders.find(f => f.id === parentFolderId);
  if (!parentFolder) {
    console.log('❌ Ana klasör bulunamadı:', parentFolderId);
    return;
  }
  
  console.log('📁 Ana klasör bulundu:', parentFolder.name);
  
  // Modal input kullan
  if (window.showInputModal) {
    window.showInputModal(
      'Alt Klasör Oluştur',
      `"${parentFolder.name}" klasörü içinde alt klasör adını girin...`,
      '',
      (subFolderName) => {
        if (!subFolderName || subFolderName.trim() === '') {
          console.log('❌ Geçersiz alt klasör adı veya iptal edildi');
          return;
        }
        
        const trimmedName = subFolderName.trim();
        console.log('📝 Alt klasör adı:', trimmedName);
        
        // Aynı isimde alt klasör var mı kontrol et
        const existingSubFolder = folders.find(f => 
          f.name === trimmedName && 
          f.parentPath === parentFolder.path
        );
        if (existingSubFolder) {
          if (window.showNotification) window.showNotification('Bu isimde bir alt klasör zaten mevcut!', 'error');
          console.log('❌ Aynı isimde alt klasör mevcut');
          return;
        }
        
        // IPC ile alt klasör oluştur
        if (typeof require !== 'undefined') {
          const { ipcRenderer } = require('electron');
          console.log('📤 IPC mesajı gönderiliyor: create-folder');
          ipcRenderer.send('create-folder', {
            name: trimmedName,
            parentPath: parentFolder.path || parentFolder.name
          });
          
          // Başarılı olursa UI'yi güncelle
          ipcRenderer.once('folder-created', (event, result) => {
            console.log('📥 IPC yanıtı alındı:', result);
            if (result.success) {
              try {
                // Yeni alt klasörü ekle
                const newSubFolder = {
                  id: window.generateUniqueId(trimmedName, 'folder'), // Benzersiz ID
                  name: trimmedName,
                  color: FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
                  path: parentFolder.path ? `${parentFolder.path}/${trimmedName}` : trimmedName,
                  parentId: parentFolderId,
                  level: (parentFolder.level || 0) + 1
                };
                
                window.folders.push(newSubFolder);
              } catch (error) {
                // Hata mesajını göster
                if (window.showNotification) window.showNotification(error.message, 'error');
                console.log('❌ Alt klasör oluşturulamadı:', error.message);
                return;
              }
              
              // UI'yi yenile
              if (window.renderFolderList) window.renderFolderList();
              if (window.renderNotesImmediate) window.renderNotesImmediate(); // Board üzerindeki klasörleri anında güncelle
              if (window.saveFolders) window.saveFolders(); // Klasörleri kaydet
              
              console.log('✅ Alt klasör oluşturuldu:', trimmedName);
            } else {
              if (window.showNotification) window.showNotification('Alt klasör oluşturulamadı: ' + result.error, 'error');
              console.log('❌ Alt klasör oluşturulamadı:', result.error);
            }
          });
        }
      }
    );
  }
}

function selectFolderColor(folderId, color) {
  const folders = window.folders || [];
  const STORAGE_KEYS = window.STORAGE_KEYS || {};
  
  const folder = folders.find(f => f.id === folderId);
  if (folder) {
    folder.color = color;
    
    // Anında localStorage'a yaz
    try {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      console.log(`🎨 Klasör rengi değiştirildi ve kaydedildi: ${folder.name} → ${color}`);
    } catch (error) {
      console.error('❌ Klasör rengi kaydedilemedi:', error);
    }
    
    // Akıllı kaydetme - değişiklik olduğunda kaydet
    if (window.scheduleSave) window.scheduleSave();
    
    // Anında UI güncelle - gecikme yok!
    if (window.renderFolderList) window.renderFolderList();
    if (window.renderNotesImmediate) window.renderNotesImmediate(); // Debounce olmadan anında render
    
    // Bağlantı çizgilerini de anında güncelle
    setTimeout(() => {
      if (window.drawConnections) window.drawConnections();
    }, 50); // Çok kısa gecikme ile bağlantıları güncelle
    
    closeColorPickerModal();
  }
}

function closeColorPickerModal() {
  const modal = document.getElementById('colorPickerModal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.remove();
    }, 200);
  }
}

// Notu başka klasöre taşı
function changeNoteFolder(noteId, newFolderId, folderName = null) {
  const notes = window.notes || [];
  const folders = window.folders || [];
  const note = notes.find(n => n.id === noteId);
  
  if (note) {
    const oldFolderId = note.folderId;
    note.folderId = newFolderId;
    note.updatedAt = new Date().toISOString();
    
    // Dosya sisteminde notu taşı
    if (typeof require !== 'undefined') {
      const { ipcRenderer } = require('electron');
      const folder = folders.find(f => f.id === newFolderId);
      
      ipcRenderer.send('move-note-to-folder', {
        noteId: noteId,
        folderId: newFolderId,
        folderName: folderName || (folder ? folder.name : null)
      });
      
      ipcRenderer.once('note-moved', (event, result) => {
        if (result.success) {
          console.log('📁 Not klasöre taşındı:', note.title);
          
          // Not objesini güncelle - yeni relative path ve fileName'i kaydet
          if (result.newRelativePath) {
            note.relativePath = result.newRelativePath;
            console.log('📁 Not relative path güncellendi:', result.newRelativePath);
          }
          if (result.newFileName) {
            note.fileName = result.newFileName;
            console.log('📁 Not fileName güncellendi:', result.newFileName);
          }
          
          // Başarı bildirimi
          const targetFolder = folderName || (folder ? folder.name : 'Klasörsüz Notlar');
          if (window.showNotification) {
            window.showNotification(`"${note.title}" ${targetFolder} klasörüne taşındı`, 'success');
          }
          
          // UI'yi güncelle
          if (window.saveNotes) window.saveNotes();
          if (window.renderNotes) window.renderNotes();
          if (window.renderFolderList) window.renderFolderList();
        } else {
          console.error('❌ Not taşınamadı:', result.error);
          
          // Hata bildirimi
          if (window.showNotification) {
            window.showNotification(`"${note.title}" taşınamadı: ${result.error}`, 'error');
          }
          
          // Hata durumunda geri al
          note.folderId = oldFolderId;
          if (window.saveNotes) window.saveNotes();
          if (window.renderNotes) window.renderNotes();
          if (window.renderFolderList) window.renderFolderList();
        }
      });
    } else {
      // Electron yoksa sadece UI'yi güncelle
      if (window.saveNotes) window.saveNotes();
      if (window.renderNotes) window.renderNotes();
      if (window.renderFolderList) window.renderFolderList();
    }
  }
}

// Klasör silme modalını aç
function deleteFolder(folderId) {
  try {
    const folders = window.folders || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      console.error('❌ Silinecek klasör bulunamadı:', folderId);
      return;
    }
    
    // Diğer modal'ları kapat
    const folderModal = document.getElementById('folderModal');
    if (folderModal) {
      folderModal.classList.remove('show');
    }
    
    // Modal'ı aç
    const state = window.getState();
    state.folderToDelete = folderId;
    window.setState(state);
    
    const deleteModalOverlay = document.getElementById('deleteFolderModalOverlay');
    const deleteModalFolderTitle = document.getElementById('deleteModalFolderTitle');
    
    deleteModalFolderTitle.textContent = folder.name;
    deleteModalOverlay.classList.add('active');
  } catch (error) {
    console.error('❌ Klasör silme hatası:', error);
    if (window.showNotification) {
      window.showNotification(`Klasör silinirken hata oluştu: ${error.message}`, 'error');
    }
  }
}

// Global exports
window.changeFolderColor = changeFolderColor;
window.renameFolder = renameFolder;
window.createSubFolder = createSubFolder;
window.showColorPickerModal = showColorPickerModal;
window.selectFolderColor = selectFolderColor;
window.closeColorPickerModal = closeColorPickerModal;
window.changeNoteFolder = changeNoteFolder;
window.deleteFolder = deleteFolder;

console.log('🎨 Folder Operations yüklendi');

