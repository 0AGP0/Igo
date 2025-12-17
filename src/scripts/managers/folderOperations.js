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

// Canvas tabanlı özel renk çarkı modal
function showColorPickerModal(folderIdOrCallback, currentColor) {
  // Mevcut modal varsa kaldır
  const existingModal = document.getElementById('colorPickerModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Varsayılan renk
  const defaultColor = currentColor || '#3b82f6';
  
  // Callback mi yoksa folderId mi kontrol et
  const isCallback = typeof folderIdOrCallback === 'function';
  const callback = isCallback ? folderIdOrCallback : null;
  const folderId = isCallback ? null : folderIdOrCallback;
  
  const modal = document.createElement('div');
  modal.id = 'colorPickerModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal custom-color-picker-modal" onclick="event.stopPropagation()">
      <div class="color-picker-header">
        <h3 class="color-picker-title">Renk Seç</h3>
        <button class="color-picker-close-btn" onclick="closeSimpleColorPickerModal()">✕</button>
      </div>
      
      <div class="custom-color-picker-body">
        <div class="color-wheel-container">
          <canvas id="colorWheelCanvas" class="color-wheel-canvas"></canvas>
          <div class="color-wheel-selector" id="colorSelector"></div>
        </div>
        
        <div class="color-preview-section">
          <div class="selected-color-box" id="selectedColorBox" style="background: ${defaultColor};"></div>
          <div class="color-info">
            <div class="hex-display-wrapper">
              <span class="hex-label">#</span>
              <input type="text" 
                     id="hexColorInput" 
                     class="hex-color-input" 
                     value="${defaultColor.toUpperCase().replace('#', '')}"
                     maxlength="6"
                     placeholder="FF5733">
            </div>
          </div>
        </div>
      </div>
      
      <div class="color-picker-footer">
        <button class="color-picker-btn color-picker-btn-cancel" onclick="closeSimpleColorPickerModal()">İptal</button>
        <button class="color-picker-btn color-picker-btn-apply" onclick="applySimpleColor(${isCallback ? 'null' : `'${folderId}'`}${isCallback ? ', true' : ''})">Uygula</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Animasyon
  modal.style.display = 'flex';
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.opacity = '1';
    const modalContent = modal.querySelector('.custom-color-picker-modal');
    if (modalContent) {
      modalContent.style.transform = 'scale(1)';
    }
  }, 10);
  
  // Dışarı tıklanınca kapat
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeSimpleColorPickerModal();
    }
  };
  
  // Callback'i sakla
  if (isCallback && callback) {
    window.colorPickerCallback = callback;
  }
  
  // Canvas renk çarkını çiz
  setTimeout(() => {
    drawColorWheel(defaultColor);
  }, 50);
  
  // Hex input işlemleri
  const hexInput = document.getElementById('hexColorInput');
  const previewBox = document.getElementById('selectedColorBox');
  
  if (hexInput) {
    hexInput.addEventListener('input', (e) => {
      let hex = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      if (hex.length === 6) {
        hex = '#' + hex;
        updateColorFromHex(hex);
      }
    });
    
    hexInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applySimpleColor(folderId, isCallback);
      }
    });
  }
}

// Renk çarkını çiz
function drawColorWheel(defaultColor) {
  const canvas = document.getElementById('colorWheelCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 20;
  
  canvas.width = size;
  canvas.height = size;
  
  // Hex'i HSL'ye çevir
  const hsl = hexToHsl(defaultColor);
  
  // Renk çarkını çiz - daha optimize edilmiş versiyon
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > radius) {
        // Çember dışında - şeffaf
        const idx = (y * size + x) * 4;
        data[idx] = 0;     // R
        data[idx + 1] = 0; // G
        data[idx + 2] = 0; // B
        data[idx + 3] = 0; // A
      } else {
        // Çember içinde - renk hesapla
        const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
        const saturation = distance / radius;
        const lightness = 0.5;
        
        const rgb = hslToRgb(angle, saturation, lightness);
        const idx = (y * size + x) * 4;
        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = 255; // A
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Merkeze beyaz gradient ekle (saturation azalması için)
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Dış halka (hue ring)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Seçili rengin konumunu işaretle
  updateColorSelector(hsl.h, hsl.s, defaultColor);
  
  // Mouse event'leri
  let isDragging = false;
  
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    selectColorFromPosition(e, canvas);
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      selectColorFromPosition(e, canvas);
    }
  });
  
  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });
}

// HSL'yi RGB'ye çevir
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

// Pozisyondan renk seç
function selectColorFromPosition(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  const center = canvas.width / 2;
  const radius = center - 20;
  
  const dx = x - center;
  const dy = y - center;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > radius) return;
  
  const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  const saturation = Math.min(distance / radius, 1);
  const lightness = 0.5;
  
  const rgb = hslToRgb(angle, saturation, lightness);
  const color = '#' + [rgb.r, rgb.g, rgb.b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
  
  updateColorFromHex(color);
}

// HEX'i HSL'ye çevir
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return {
    h: h * 360,
    s: s,
    l: l
  };
}

// HSL'yi HEX'e çevir
function hslToHex(h, s, l) {
  const rgb = hslToRgb(h, s, l);
  return '#' + [rgb.r, rgb.g, rgb.b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

// Renk seçici konumunu güncelle
function updateColorSelector(h, s, color) {
  const selector = document.getElementById('colorSelector');
  const canvas = document.getElementById('colorWheelCanvas');
  if (!selector || !canvas) return;
  
  const center = canvas.width / 2;
  const radius = center - 20;
  const distance = s * radius;
  const angle = (h * Math.PI) / 180;
  
  const x = center + distance * Math.cos(angle);
  const y = center + distance * Math.sin(angle);
  
  selector.style.left = x + 'px';
  selector.style.top = y + 'px';
  selector.style.display = 'block';
}

// Hex'ten renk güncelle
function updateColorFromHex(hex) {
  const previewBox = document.getElementById('selectedColorBox');
  const hexInput = document.getElementById('hexColorInput');
  const selector = document.getElementById('colorSelector');
  
  if (previewBox) previewBox.style.background = hex;
  if (hexInput) hexInput.value = hex.replace('#', '').toUpperCase();
  
  const hsl = hexToHsl(hex);
  if (selector) {
    updateColorSelector(hsl.h, hsl.s, hex);
  }
}

// RGB string'i hex'e çevir
function rgbToHexFromString(rgb) {
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return '#3b82f6';
  const r = parseInt(match[0]);
  const g = parseInt(match[1]);
  const b = parseInt(match[2]);
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

// Basit renk uygula
function applySimpleColor(folderId, isCallback = false) {
  const previewBox = document.getElementById('selectedColorBox');
  const hexInput = document.getElementById('hexColorInput');
  
  let color = null;
  
  if (previewBox && previewBox.style.background) {
    // CSS'den renk al
    const bgColor = previewBox.style.background;
    if (bgColor.startsWith('#')) {
      color = bgColor;
    } else if (bgColor.startsWith('rgb')) {
      // RGB'yi hex'e çevir (basit yaklaşım)
      color = rgbToHexFromString(bgColor);
    }
  } else if (hexInput && hexInput.value) {
    let hex = hexInput.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (hex.length === 6) {
      color = '#' + hex;
    } else if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
      color = '#' + hex;
    }
  }
  
  if (!color || !/^#[0-9A-Fa-f]{6}$/i.test(color)) {
    if (window.showNotification) {
      window.showNotification('Geçerli bir renk seçin!', 'error');
    }
    return;
  }
  
  if (isCallback && window.colorPickerCallback) {
    // Callback modu - yeni klasör oluşturma için
    window.colorPickerCallback(color);
    window.colorPickerCallback = null;
  } else if (folderId) {
    // Normal mod - klasör rengini değiştirme
    selectFolderColor(folderId, color);
  }
  closeSimpleColorPickerModal();
}

function selectFolderColor(folderId, color) {
  const folders = window.folders || [];
  const STORAGE_KEYS = window.STORAGE_KEYS || {};
  
  const folder = folders.find(f => f.id === folderId);
  if (folder) {
    folder.color = color;
    
    try {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      console.log(`🎨 Klasör rengi değiştirildi: ${folder.name} → ${color}`);
    } catch (error) {
      console.error('❌ Klasör rengi kaydedilemedi:', error);
    }
    
    if (window.scheduleSave) window.scheduleSave();
    if (window.renderFolderList) window.renderFolderList();
    if (window.renderNotesImmediate) window.renderNotesImmediate();
    
    setTimeout(() => {
      if (window.drawConnections) window.drawConnections();
    }, 50);
  }
}

function closeSimpleColorPickerModal() {
  const modal = document.getElementById('colorPickerModal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 200);
  }
  window.colorPickerCallback = null;
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
                // Genel eşleştirme fonksiyonu kullan
                if (window.doesNoteMatchFolder ? window.doesNoteMatchFolder(note.folderId, folder.id, folder) : (note.folderId === folder.id)) {
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
  
  const parentFolder = folders.find(f => f.id === parentFolderId);
  if (!parentFolder) {
    console.log('❌ Ana klasör bulunamadı:', parentFolderId);
    if (window.showNotification) {
      window.showNotification('Ana klasör bulunamadı!', 'error');
    }
    return;
  }
  
  console.log('📁 Ana klasör bulundu:', parentFolder.name);
  
  // Ana klasör modal'ını alt klasör için aç (renk seçimi ile)
  if (window.openFolderModal) {
    window.openFolderModal(parentFolderId);
                } else {
    // Fallback: Eski input modal (renk seçimi yok)
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
          
          // Aynı isimde klasör var mı kontrol et (tüm klasörler arasında)
          const existingFolder = folders.find(f => f.name === trimmedName);
          if (existingFolder) {
            if (window.showNotification) window.showNotification(`"${trimmedName}" isimli bir klasör zaten mevcut!`, 'error');
            console.log('❌ Aynı isimde klasör mevcut');
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
                    color: '#3b82f6', // Varsayılan renk
                    path: parentFolder.path ? `${parentFolder.path}/${trimmedName}` : `${parentFolder.name}/${trimmedName}`,
                    parentId: parentFolderId,
                    parentPath: parentFolder.path || parentFolder.name,
                    level: (parentFolder.level || 0) + 1
                  };
                  
                  // Alt klasör pozisyonunu ana klasörün yanına yerleştir
                  if (parentFolder.x !== undefined && parentFolder.y !== undefined) {
                    newSubFolder.x = parentFolder.x + 250; // Ana klasörün sağına
                    newSubFolder.y = parentFolder.y;
                  } else {
                    // Ana klasör pozisyonu yoksa merkeze yerleştir
                    const boardwrap = document.querySelector('.boardwrap');
                    if (boardwrap) {
                      const boardwrapWidth = boardwrap.clientWidth || window.innerWidth;
                      const boardwrapHeight = boardwrap.clientHeight || window.innerHeight;
                      const boardZoom = window.boardZoom || 1;
                      const zoomVars = window.getZoomPanVars();
                      const boardPanX = zoomVars?.boardPanX || 0;
                      const boardPanY = zoomVars?.boardPanY || 0;
                      
                      const viewportCenterX = boardwrapWidth / 2;
                      const viewportCenterY = boardwrapHeight / 2;
                      const boardCenterX = (viewportCenterX - boardPanX) / boardZoom;
                      const boardCenterY = (viewportCenterY - boardPanY) / boardZoom;
                      
                      newSubFolder.x = boardCenterX - 100;
                      newSubFolder.y = boardCenterY - 60;
                    } else {
                      newSubFolder.x = Math.random() * 400 + 100;
                      newSubFolder.y = Math.random() * 300 + 100;
                    }
                  }
                  
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
window.closeColorPickerModal = closeSimpleColorPickerModal;
window.applySimpleColor = applySimpleColor;
window.closeSimpleColorPickerModal = closeSimpleColorPickerModal;
window.updateColorFromHex = updateColorFromHex;
window.drawColorWheel = drawColorWheel;
window.rgbToHexFromString = rgbToHexFromString;
window.changeNoteFolder = changeNoteFolder;
window.deleteFolder = deleteFolder;

console.log('🎨 Folder Operations yüklendi');

