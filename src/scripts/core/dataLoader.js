// ===== DATA LOADING & SAVING SYSTEM =====

// LocalStorage işlemleri
function saveNotes() {
  const DataManager = window.DataManager;
  const STORAGE_KEYS = window.STORAGE_KEYS;
  const notes = window.notes || [];
  
  if (DataManager && STORAGE_KEYS) {
    DataManager.save(STORAGE_KEYS.NOTES, notes);
  }
}

// Not pozisyonlarını kaydet
function saveNotePositions() {
  const STORAGE_KEYS = window.STORAGE_KEYS;
  const notes = window.notes || [];
  
  const positions = {};
  notes.forEach(note => {
    if (note.x !== undefined && note.y !== undefined) {
      positions[note.id] = {
        x: note.x,
        y: note.y,
        width: note.width || note.customWidth || 280,
        height: note.height || note.customHeight || 200
      };
    }
  });
  
  if (STORAGE_KEYS) {
    localStorage.setItem(STORAGE_KEYS.NOTE_POSITIONS, JSON.stringify(positions));
    console.log('📍 Not pozisyonları kaydedildi:', Object.keys(positions).length, 'not');
  }
}

// Tüm notları dosyaya kaydet (sadece gerekli yerlerde çağrılacak)
function saveAllNotesToFiles() {
  const notes = window.notes || [];
  notes.forEach(note => {
    if (window.saveNoteToFile) window.saveNoteToFile(note);
  });
}

// Notu dosyaya kaydet (yeni sistem)
function saveNoteToFile(note) {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    const generateFileName = window.generateFileName;
    
    // Dosya adı ve eski dosya adını hesapla
    let fileName;
    let oldFileName;
    
    if (note.relativePath) {
      // Mevcut dosya varsa, relativePath'den eski dosya adını çıkar
      oldFileName = note.relativePath.split('/').pop(); // path.basename yerine
      
      // Eğer note.fileName varsa onu kullan (yeniden oluşturma)
      if (note.fileName) {
        fileName = note.fileName;
        console.log('📝 Mevcut dosya adı korunuyor:', fileName);
      } else {
        const extension = oldFileName.includes('.') ? oldFileName.split('.').pop() : 'md';
        fileName = generateFileName ? generateFileName(note.title, '.' + extension) : note.title + '.' + extension;
        console.log('📝 Dosya adı başlıktan oluşturuluyor:', oldFileName, '→', fileName);
      }
    } else {
      // Yeni dosya için dosya adı oluştur
      const originalExtension = note.originalExtension || '.md';
      fileName = generateFileName ? generateFileName(note.title, originalExtension) : note.title + originalExtension;
      oldFileName = note.fileName;
      console.log('🆕 Yeni dosya oluşturuluyor:', fileName);
    }
    
    // Not objesine dosya adını ekle
    note.fileName = fileName;
    
    // IPC mesajı gönder
    ipcRenderer.send('save-note-to-file', {
      note: note,
      fileName: fileName,
      oldFileName: oldFileName
    });
    
    console.log('💾 Not dosyaya kaydediliyor:', fileName);
  }
}

// Not dosya adını yeniden adlandır
function renameNoteFile(note, newTitle) {
  try {
    if (!note || !newTitle) return;
    
    const oldFileName = note.fileName;
    const extension = oldFileName.includes('.') ? oldFileName.split('.').pop() : 'md';
    
    // Güvenli dosya adı oluştur
    let newFileName;
    if (typeof window.generateFileName === 'function') {
      newFileName = window.generateFileName(newTitle, '.' + extension);
    } else {
      // Basit dosya adı oluştur
      newFileName = newTitle.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '') + '.' + extension;
    }
    
    // Dosya adı değiştiyse güncelle
    if (oldFileName !== newFileName) {
      console.log('📝 Dosya yeniden adlandırılıyor:', oldFileName, '→', newFileName);
      
      // Not nesnesindeki dosya adını güncelle
      note.fileName = newFileName;
      
      // IPC mesajı gönder
      ipcRenderer.send('rename-note-file', {
        note: note,
        oldFileName: oldFileName,
        newFileName: newFileName
      });
      
      console.log('💾 Dosya yeniden adlandırıldı ve güncellendi:', newFileName);
    }
  } catch (error) {
    console.error('❌ Dosya yeniden adlandırma hatası:', error);
  }
}

// Not dosya adını güncelle
function updateNoteFileName(noteId, oldTitle, newTitle) {
  try {
    const notes = window.notes || [];
    const note = notes.find(n => n.id === noteId);
    
    if (note && note.fileName) {
      const oldFileName = note.fileName;
      const extension = oldFileName.includes('.') ? oldFileName.split('.').pop() : 'md';
      
      // Güvenli dosya adı oluştur
      let newFileName;
      if (typeof window.generateFileName === 'function') {
        newFileName = window.generateFileName(newTitle, '.' + extension);
      } else {
        // Basit dosya adı oluştur
        newFileName = newTitle.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '') + '.' + extension;
      }
      
      // Dosya adı değiştiyse güncelle
      if (oldFileName !== newFileName) {
        console.log('📝 Dosya adı değişikliği tespit edildi:', oldFileName, '→', newFileName);
        
        // Not nesnesindeki dosya adını güncelle
        note.fileName = newFileName;
        
        // IPC mesajı gönder - dosya adını güncelle
        if (typeof require !== 'undefined') {
          try {
            const { ipcRenderer } = require('electron');
            
            // IPC response listener ekle
            const responseHandler = (event, response) => {
              try {
                if (response && response.success) {
                  console.log('✅ Dosya yeniden adlandırıldı:', response.oldFileName, '→', response.newFileName);
                  if (response.message) {
                    console.log('📝 Mesaj:', response.message);
                  }
                } else {
                  console.error('❌ Dosya yeniden adlandırma başarısız:', response ? response.error : 'Bilinmeyen hata');
                  // Hata durumunda eski dosya adını geri yükle
                  note.fileName = oldFileName;
                }
              } catch (error) {
                console.error('❌ Response handler hatası:', error);
              } finally {
                // Listener'ı temizle
                try {
                  ipcRenderer.removeListener('note-file-renamed', responseHandler);
                } catch (removeError) {
                  console.error('❌ Listener temizleme hatası:', removeError);
                }
              }
            };
            
            ipcRenderer.on('note-file-renamed', responseHandler);
            
            // IPC mesajını güvenli şekilde gönder
            const ipcData = {
              noteId: noteId,
              oldFileName: oldFileName,
              newFileName: newFileName,
              note: note
            };
            
            // Data validasyonu
            if (!ipcData.oldFileName || !ipcData.newFileName) {
              console.error('❌ IPC data validasyon hatası:', ipcData);
              return;
            }
            
            ipcRenderer.send('rename-note-file', ipcData);
          } catch (ipcError) {
            console.error('❌ IPC gönderme hatası:', ipcError);
            // IPC hatası durumunda eski dosya adını geri yükle
            note.fileName = oldFileName;
          }
        }
        
        console.log('📝 Dosya adı güncelleme isteği gönderildi');
      } else {
        console.log('📝 Dosya adı değişmedi, güncelleme atlandı');
      }
    } else {
      console.log('📝 Not veya dosya adı bulunamadı');
    }
  } catch (error) {
    console.error('❌ Dosya adı güncelleme hatası:', error);
  }
}

function loadNotes() {
  // Sadece dosyalardan notları yükle
  loadNotesFromFiles();
}

// Dosyalardan notları yükle
function loadNotesFromFiles() {
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    const STORAGE_KEYS = window.STORAGE_KEYS;
    const generateFileName = window.generateFileName;
    
    // IPC listener'ı sadece bir kez ekle
    if (!window.notesFileListenerAdded) {
      ipcRenderer.on('notes-loaded-from-files', (event, result) => {
        if (result.success) {
          // Notları sıfırla - REFERANSI KORUYARAK!
          window.notes.length = 0;  // ✅ Mevcut array'i temizle (yeni array oluşturma!)
          
          // localStorage'dan kaydedilmiş pozisyonları yükle
          const savedPositions = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTE_POSITIONS) || '{}');
          console.log('📍 Kaydedilmiş pozisyonlar yüklendi:', Object.keys(savedPositions).length, 'not');
          
          // Dosyadan yüklenen notları ekle - DUPLİKASYON KONTROLÜ İLE
          if (result.notes.length > 0) {
            result.notes.forEach(fileNote => {
              // DUPLİKASYON KONTROLÜ - Aynı ID'li not zaten var mı?
              const existingNoteIndex = window.notes.findIndex(n => n.id === fileNote.id);
              
              // Kaydedilmiş pozisyon varsa kullan, yoksa rastgele oluştur
              const savedPos = savedPositions[fileNote.id];
              let x, y;
              
              if (savedPos && savedPos.x !== undefined && savedPos.y !== undefined) {
                x = savedPos.x;
                y = savedPos.y;
                console.log(`📍 "${fileNote.title}" pozisyonu yüklendi: (${x}, ${y})`);
              } else {
                x = Math.random() * 400 + 100;
                y = Math.random() * 300 + 100;
                console.log(`📍 "${fileNote.title}" için yeni pozisyon oluşturuldu: (${x}, ${y})`);
              }
              
              if (existingNoteIndex !== -1) {
                // Not zaten var, güncelle
                window.notes[existingNoteIndex] = {
                  ...fileNote,
                  x: x,
                  y: y,
                  width: savedPos?.width || 280,
                  height: savedPos?.height || 200,
                  folderId: fileNote.folderId || null,
                  tags: fileNote.tags || [],
                  links: fileNote.links || [],
                  isSaved: true,
                  fileName: fileNote.fileName || (generateFileName ? generateFileName(fileNote.title) : fileNote.title),
                  text: fileNote.text || fileNote.markdownContent || '',
                  markdownContent: fileNote.markdownContent || fileNote.text || ''
                };
                console.log(`✅ "${fileNote.title}" güncellendi (duplikasyon önlendi)`);
              } else {
                // Not bulunamadı, ekle
                window.notes.push({
                  ...fileNote,
                  x: x,
                  y: y,
                  width: savedPos?.width || 280,
                  height: savedPos?.height || 200,
                  folderId: fileNote.folderId || null,
                  tags: fileNote.tags || [],
                  links: fileNote.links || [],
                  isSaved: true,
                  fileName: fileNote.fileName || (generateFileName ? generateFileName(fileNote.title) : fileNote.title),
                  text: fileNote.text || fileNote.markdownContent || '',
                  markdownContent: fileNote.markdownContent || fileNote.text || ''
                });
                console.log(`📝 "${fileNote.title}" eklendi`);
              }
            });
          }
          
          // Güncellenmiş notları localStorage'a kaydet
          saveNotes();
          
          console.log(`📚 Toplam ${window.notes.length} not yüklendi (${result.notes.length} dosyadan)`);
          console.log('🔍 window.notes güncellendi:', window.notes.length, 'not');
        
          // Notlar yüklendikten sonra klasörleri yükle ve render et
          if (window.loadFolders) {
            window.loadFolders().then(() => {
              // Her durumda render et (dosya olsun ya da olmasın)
              if (window.renderNotes) window.renderNotes();
              if (window.renderTags) window.renderTags();
              if (window.renderGraph) window.renderGraph();
              
              // Senkronizasyon sonrası bağlantı çizgilerini çiz
              setTimeout(() => {
                if (window.drawConnections) window.drawConnections();
              }, 200);
            });
          }
        }
      });
      
      // Notes klasöründeki değişiklikleri dinle
      ipcRenderer.on('notes-folder-changed', (event, data) => {
        console.log('📁 Notes klasöründe değişiklik algılandı:', data);
        // Hem rename hem change event'lerini dinle
        if (data.eventType === 'rename' || data.eventType === 'change') {
          // Dosya değişti, silindi veya yeniden adlandırıldı
          setTimeout(() => {
            syncNotesWithFiles();
          }, 500); // 500ms gecikme ile çoklu event'leri önle
        }
      });
      
      // Başlangıç tarama sonuçlarını dinle
      ipcRenderer.on('startup-scan-complete', (event, data) => {
        console.log('📊 Başlangıç tarama tamamlandı:', data);
        
        // Tarama sonuçlarını göster
        if (data.totalItems > 0) {
          console.log(`📁 ${data.folders.length} klasör ve ${data.files.length} dosya bulundu`);
          
          // Eğer widget açıksa bildirim göster
          if (document.getElementById('widget').classList.contains('open')) {
            if (window.showNotification) {
              window.showNotification(`📁 ${data.folders.length} klasör ve ${data.files.length} dosya yüklendi`, 'success');
            }
          }
        } else {
          console.log('📁 Notes klasörü boş');
        }
        
        // Notları dosyalardan yükle
        loadNotesFromFiles();
        
        // Başlangıç taraması sonrası bağlantı çizgilerini çiz - anında
        if (window.drawConnections) window.drawConnections();
      });
      
      window.notesFileListenerAdded = true;
    }
    
    ipcRenderer.send('load-notes-from-files');
  }
}

// Notları dosyalarla senkronize et (alias)
function syncNotesWithFiles() {
  console.log('🔄 Notlar dosyalarla senkronize ediliyor...');
  loadNotesFromFiles();
}

// Klasörleri localStorage'a kaydet - Debounce ile
let saveFoldersTimeout = null;
function saveFolders() {
  const DataManager = window.DataManager;
  const STORAGE_KEYS = window.STORAGE_KEYS;
  const folders = window.folders || [];
  
  // Önceki timeout'u iptal et
  if (saveFoldersTimeout) {
    clearTimeout(saveFoldersTimeout);
  }
  
  // 500ms sonra kaydet (debounce)
  saveFoldersTimeout = setTimeout(() => {
    if (DataManager && STORAGE_KEYS) {
      const success = DataManager.save(STORAGE_KEYS.FOLDERS, folders);
      if (success) {
        console.log('📁 Klasörler kaydedildi:', folders.length, 'klasör');
      } else {
        console.error('❌ Klasörler kaydedilemedi');
      }
    }
    saveFoldersTimeout = null;
  }, 500);
}

// Klasörleri dosya sisteminden yükle - BASIT VERSİYON
function loadFolders() {
  console.log('📁 Klasörler yükleniyor...');
  
  return new Promise((resolve) => {
    if (typeof require !== 'undefined') {
      const { ipcRenderer } = require('electron');
      const DataManager = window.DataManager;
      const STORAGE_KEYS = window.STORAGE_KEYS;
      const FOLDER_COLORS = window.FOLDER_COLORS || [];
      
      // Notes klasörünü tara ve klasör yapısını al
      ipcRenderer.invoke('get-folder-structure').then(folderStructure => {
        console.log('📁 Klasör yapısı alındı:', folderStructure);
        
        // Kaydedilen klasör verilerini yükle
        const savedFolders = DataManager.load(STORAGE_KEYS.FOLDERS);
        console.log('📁 Kaydedilen klasörler:', savedFolders);
        
        // Klasörleri temizle - REFERANSI KORUYARAK!
        window.folders.length = 0;  // ✅ Mevcut array'i temizle
        
        // Klasör yapısını işle
        function processFolders(folderData, parentId = null, level = 0) {
          folderData.forEach(item => {
            if (item.type === 'folder') {
              // Duplicate kontrolü - aynı ID'ye sahip klasör zaten eklenmiş mi?
              const existingFolder = window.folders.find(f => f.id === item.id && f.path === item.path);
              if (existingFolder) {
                console.log(`⚠️ Duplicate klasör atlandı: ${item.name} (ID: ${item.id}, Path: ${item.path})`);
                // Alt klasörleri işle (duplicate olsa bile)
                if (item.children && item.children.length > 0) {
                  processFolders(item.children, existingFolder.id, level + 1);
                }
                return; // Bu klasörü atla
              }
              
              // Kaydedilen klasör verilerini bul (ID ve path'e göre eşleştir)
              // Eski format klasör ID'leri için de uyumluluk ekle
              const savedFolder = savedFolders.find(f => {
                // ID eşleşmesi (normalize edilmiş)
                const fIdNormalized = (f.id || '').toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
                const itemIdNormalized = (item.id || '').toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
                if (fIdNormalized === itemIdNormalized || f.id === item.id) return true;
                
                // Path ve name eşleşmesi
                if (f.path === item.path && f.name === item.name) return true;
                
                // Eski format: Klasör adı direkt ID olarak kullanılmış olabilir
                if (f.id === item.name || f.id === item.name.toLowerCase()) return true;
                
                return false;
              });
              
              const folder = {
                id: item.id,
                name: item.name,
                color: savedFolder ? savedFolder.color : FOLDER_COLORS[window.folders.length % FOLDER_COLORS.length],
                parentId: parentId,
                parentPath: parentId ? window.folders.find(f => f.id === parentId)?.name : null,
                level: level,
                path: item.path,
                x: savedFolder ? savedFolder.x : undefined,
                y: savedFolder ? savedFolder.y : undefined,
                // Eski format uyumluluk: Klasör adını da ID olarak sakla
                // Farklı normalize formatlarını sakla (Türkçe karakter kaybı durumu için)
                altIds: [
                  item.name.toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_'), // Türkçe karakterler dahil
                  item.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), // ASCII (Türkçe karakter kaybı)
                  item.name.toLowerCase(), // Lowercase
                  item.name, // Orijinal
                  item.name.replace(/[^a-zğüşiöçı]/g, ''), // Sadece harfler (Türkçe)
                  item.name.toLowerCase().replace(/[^a-z]/g, '') // Sadece harfler (ASCII)
                ]
              };
              window.folders.push(folder);
              
              // Alt klasörleri işle
              if (item.children && item.children.length > 0) {
                processFolders(item.children, item.id, level + 1);
              }
            }
          });
        }
        
        processFolders(folderStructure);
        
        console.log(`📁 Toplam ${window.folders.length} klasör yüklendi`);
        if (window.renderFolderList) window.renderFolderList();
        resolve();
      }).catch(error => {
        console.error('❌ Klasör yapısı alınamadı:', error);
        window.folders.length = 0;  // ✅ Referansı koru
        if (window.renderFolderList) window.renderFolderList();
        resolve();
      });
    } else {
      window.folders.length = 0;  // ✅ Referansı koru
      if (window.renderFolderList) window.renderFolderList();
      resolve();
    }
  });
}

// Global exports
window.saveNotes = saveNotes;
window.saveNotePositions = saveNotePositions;
window.saveAllNotesToFiles = saveAllNotesToFiles;
window.saveNoteToFile = saveNoteToFile;
window.renameNoteFile = renameNoteFile;
window.updateNoteFileName = updateNoteFileName;
window.loadNotes = loadNotes;
window.loadNotesFromFiles = loadNotesFromFiles;
window.syncNotesWithFiles = syncNotesWithFiles;
window.saveFolders = saveFolders;
window.loadFolders = loadFolders;

console.log('💾 Data Loader yüklendi');

