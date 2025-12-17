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

// Board pan/zoom pozisyonunu kaydet
let saveBoardViewTimeout = null;
function saveBoardView() {
  const STORAGE_KEYS = window.STORAGE_KEYS;
  
  if (!STORAGE_KEYS) return;
  
  // Önceki timeout'u iptal et
  if (saveBoardViewTimeout) {
    clearTimeout(saveBoardViewTimeout);
  }
  
  // Debounce ile kaydet (500ms)
  saveBoardViewTimeout = setTimeout(() => {
    if (window.getZoomPanVars) {
      const zoomVars = window.getZoomPanVars();
      const boardView = {
        boardZoom: zoomVars.boardZoom || 1,
        boardPanX: zoomVars.boardPanX || 0,
        boardPanY: zoomVars.boardPanY || 0
      };
      
      localStorage.setItem(STORAGE_KEYS.BOARD_VIEW, JSON.stringify(boardView));
      console.log('📐 Board görünümü kaydedildi:', boardView);
    }
    saveBoardViewTimeout = null;
  }, 500);
}

// Board pan/zoom pozisyonunu yükle
function loadBoardView() {
  const STORAGE_KEYS = window.STORAGE_KEYS;
  
  if (!STORAGE_KEYS || !window.setZoomPanVars || !window.updateBoardTransform) {
    return false;
  }
  
  // DOM'un hazır olduğundan emin ol
  const boardwrap = document.querySelector('.boardwrap');
  if (!boardwrap || boardwrap.clientWidth === 0 || boardwrap.clientHeight === 0) {
    // DOM henüz hazır değil, biraz bekle ve tekrar dene
    setTimeout(() => {
      loadBoardView();
    }, 100);
    return false;
  }
  
  try {
    const savedView = localStorage.getItem(STORAGE_KEYS.BOARD_VIEW);
    if (savedView) {
      const boardView = JSON.parse(savedView);
      
      // Geçerli değerleri kontrol et
      if (boardView.boardZoom !== undefined && 
          boardView.boardPanX !== undefined && 
          boardView.boardPanY !== undefined) {
        
        // Zoom sınırlarını kontrol et
        const validZoom = Math.max(0.1, Math.min(3, boardView.boardZoom));
        
        // Pan/zoom değerlerini ayarla (sadece değerleri set et, transform'u henüz uygulama)
        const zoomVars = window.getZoomPanVars();
        zoomVars.boardZoom = validZoom;
        zoomVars.boardPanX = boardView.boardPanX;
        zoomVars.boardPanY = boardView.boardPanY;
        window.setZoomPanVars(zoomVars);
        
        console.log('📐 Board görünümü yüklendi (değerler set edildi):', boardView);
        return true;
      }
    }
  } catch (error) {
    console.error('❌ Board görünümü yüklenirken hata:', error);
  }
  
  return false;
}

// Not pozisyonlarını kaydet
function saveNotePositions() {
  const STORAGE_KEYS = window.STORAGE_KEYS;
  const notes = window.notes || [];
  
  // Düzlem sınırları
  const INFINITE_SIZE = 1000000;
  const MIN_X = 0;
  const MIN_Y = 0;
  const MAX_X = INFINITE_SIZE;
  const MAX_Y = INFINITE_SIZE;
  
  const positions = {};
  let invalidPositions = 0;
  
  notes.forEach(note => {
    // Not ID'si kontrolü - ID yoksa pozisyon kaydedilemez
    if (!note.id) {
      console.error(`❌ Not ID'si yok, pozisyon kaydedilemedi:`, note.title || 'Bilinmeyen not');
      return;
    }
    
    if (note.x !== undefined && note.y !== undefined) {
      const noteWidth = note.width || note.customWidth || 280;
      const noteHeight = note.height || note.customHeight || 200;
      
      // Pozisyonun düzlem sınırları içinde olup olmadığını kontrol et
      const isValidX = note.x >= MIN_X && (note.x + noteWidth) <= MAX_X;
      const isValidY = note.y >= MIN_Y && (note.y + noteHeight) <= MAX_Y;
      
      if (isValidX && isValidY) {
        // Geçerli pozisyon, kaydet
        positions[note.id] = {
          x: note.x,
          y: note.y,
          width: noteWidth,
          height: noteHeight
        };
        console.log(`💾 "${note.title}" (ID: ${note.id}) pozisyonu kaydediliyor: (${note.x}, ${note.y})`);
      } else {
        // Geçersiz pozisyon, kaydetme ve merkeze al
        invalidPositions++;
        console.warn(`⚠️ "${note.title}" (ID: ${note.id}) geçersiz pozisyonda, merkeze alınıyor: (${note.x}, ${note.y})`);
        
        // Düzlemin merkezine yerleştir
        const boardCenterX = INFINITE_SIZE / 2;
        const boardCenterY = INFINITE_SIZE / 2;
        note.x = boardCenterX - noteWidth / 2;
        note.y = boardCenterY - noteHeight / 2;
        
        // Düzeltilmiş pozisyonu kaydet
        positions[note.id] = {
          x: note.x,
          y: note.y,
          width: noteWidth,
          height: noteHeight
        };
        console.log(`💾 "${note.title}" (ID: ${note.id}) düzeltilmiş pozisyonu kaydediliyor: (${note.x}, ${note.y})`);
      }
    } else {
      console.warn(`⚠️ "${note.title}" (ID: ${note.id}) pozisyonu yok (x: ${note.x}, y: ${note.y})`);
    }
  });
  
  if (invalidPositions > 0) {
    console.log(`🔧 ${invalidPositions} not düzlemin dışındaydı, merkeze alındı`);
  }
  
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
            // Pozisyonu olmayan notları merkeze yerleştirmek için sayacı
            let notesWithoutPosition = 0;
            
            result.notes.forEach(fileNote => {
              // DUPLİKASYON KONTROLÜ - Aynı ID'li not zaten var mı?
              const existingNoteIndex = window.notes.findIndex(n => n.id === fileNote.id);
              
              // Kaydedilmiş pozisyon varsa kullan, yoksa merkeze yerleştir
              const savedPos = savedPositions[fileNote.id];
              let x, y;
              
              // Düzlem sınırları
              const INFINITE_SIZE = 1000000;
              const MIN_X = 0;
              const MIN_Y = 0;
              const MAX_X = INFINITE_SIZE;
              const MAX_Y = INFINITE_SIZE;
              
              // Not ID kontrolü
              if (!fileNote.id) {
                console.error(`❌ "${fileNote.title}" notunun ID'si yok! Pozisyon yüklenemiyor.`);
              }
              
              if (savedPos && savedPos.x !== undefined && savedPos.y !== undefined) {
                const noteWidth = savedPos.width || 280;
                const noteHeight = savedPos.height || 200;
                
                // Pozisyonun düzlem sınırları içinde olup olmadığını kontrol et
                const isValidX = savedPos.x >= MIN_X && (savedPos.x + noteWidth) <= MAX_X;
                const isValidY = savedPos.y >= MIN_Y && (savedPos.y + noteHeight) <= MAX_Y;
                
                if (isValidX && isValidY) {
                  // Geçerli pozisyon, kullan
                  x = savedPos.x;
                  y = savedPos.y;
                  console.log(`📍 "${fileNote.title}" (ID: ${fileNote.id}) localStorage pozisyonu kullanılıyor: (${x}, ${y})`);
                } else {
                  // Geçersiz pozisyon, merkeze yerleştir
                  console.warn(`⚠️ "${fileNote.title}" (ID: ${fileNote.id}) localStorage pozisyonu geçersiz, merkeze alınıyor: (${savedPos.x}, ${savedPos.y})`);
                  const boardCenterX = INFINITE_SIZE / 2;
                  const boardCenterY = INFINITE_SIZE / 2;
                  x = boardCenterX - noteWidth / 2;
                  y = boardCenterY - noteHeight / 2;
                }
              } else {
                // Pozisyonu olmayan notları merkeze yerleştir - grid düzeninde
                const boardwrap = document.querySelector('.boardwrap');
                if (boardwrap) {
                  const boardwrapWidth = boardwrap.clientWidth || window.innerWidth;
                  const boardwrapHeight = boardwrap.clientHeight || window.innerHeight;
                  const boardZoom = window.boardZoom || 1;
                  const zoomVars = window.getZoomPanVars();
                  const boardPanX = zoomVars?.boardPanX || 0;
                  const boardPanY = zoomVars?.boardPanY || 0;
                  
                  // Viewport'un merkezini board koordinatlarına çevir
                  const viewportCenterX = boardwrapWidth / 2;
                  const viewportCenterY = boardwrapHeight / 2;
                  const boardCenterX = (viewportCenterX - boardPanX) / boardZoom;
                  const boardCenterY = (viewportCenterY - boardPanY) / boardZoom;
                  
                  // Grid düzeninde yerleştir (her not için farklı pozisyon)
                  const noteWidth = 280; // Not kartı genişliği
                  const noteHeight = 200; // Not kartı yüksekliği
                  const gridSpacing = 320; // Kartlar arası boşluk
                  const colsPerRow = 3; // Her satırda 3 kart
                  
                  const col = notesWithoutPosition % colsPerRow;
                  const row = Math.floor(notesWithoutPosition / colsPerRow);
                  
                  // Merkezden başlayarak grid düzeninde yerleştir
                  x = boardCenterX - (colsPerRow * gridSpacing / 2) + (col * gridSpacing) - (noteWidth / 2);
                  y = boardCenterY - (noteHeight / 2) + (row * gridSpacing);
                  
                  notesWithoutPosition++;
                  console.log(`📍 "${fileNote.title}" merkeze yerleştirildi: (${x}, ${y}) - Grid: [${row}, ${col}]`);
                } else {
                  // Fallback: rastgele pozisyon
                  x = Math.random() * 400 + 100;
                  y = Math.random() * 300 + 100;
                  console.log(`📍 "${fileNote.title}" için fallback pozisyon oluşturuldu: (${x}, ${y})`);
                }
              }
              
              // Pozisyonu not objesine ekle (geçersiz olsa bile, render sırasında düzeltilecek)
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
                console.log(`✅ "${fileNote.title}" güncellendi (duplikasyon önlendi) - Pozisyon: (${x}, ${y})`);
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
                console.log(`📝 "${fileNote.title}" eklendi - Pozisyon: (${x}, ${y})`);
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
              // Önce board görünümünü yükle (notlar render edilmeden önce)
              const notes = window.notes || [];
              const folders = window.folders || [];
              if (!window.initialBoardCentered) {
                // Önce kaydedilmiş board görünümünü yüklemeyi dene
                const boardViewLoaded = window.loadBoardView && window.loadBoardView();
                
                if (!boardViewLoaded) {
                  // Kaydedilmiş görünüm yoksa, kartları göster
                  if (notes.length === 0 && folders.length === 0) {
                    // Kartlar yoksa merkeze al
                    if (window.centerBoardOnStart) {
                      window.centerBoardOnStart();
                      window.initialBoardCentered = true;
                    }
                  } else {
                    // Kartlar varsa fitAllNotes çağır
                    if (window.fitAllNotes) {
                      window.fitAllNotes();
                      window.initialBoardCentered = true;
                      console.log('📐 Uygulama açılışında tüm kartlar görünür hale getirildi');
                    }
                  }
                } else {
                  // Kaydedilmiş görünüm yüklendi
                  window.initialBoardCentered = true;
                  console.log('📐 Kaydedilmiş board görünümü yüklendi');
                }
              }
              
              // Board görünümü yüklendikten sonra notları render et
              // Her durumda render et (dosya olsun ya da olmasın)
              if (window.renderNotes) window.renderNotes();
              if (window.renderTags) window.renderTags();
              if (window.renderGraph) window.renderGraph();
              
              // Notlar render edildikten sonra board transform'u uygula
              // Bu, notların doğru pozisyonda görünmesini garanti eder
              requestAnimationFrame(() => {
                if (window.updateBoardTransform) {
                  window.updateBoardTransform();
                }
                // Bağlantı çizgilerini çiz
                setTimeout(() => {
                  if (window.drawConnections) {
                    window.drawConnections();
                  }
                }, 50);
              });
            });
          } else {
            // Klasör yükleyici yoksa direkt board görünümünü yükle veya fitAllNotes çağır
            setTimeout(() => {
              const notes = window.notes || [];
              const folders = window.folders || [];
              if (!window.initialBoardCentered) {
                // Önce kaydedilmiş board görünümünü yüklemeyi dene
                const boardViewLoaded = window.loadBoardView && window.loadBoardView();
                
                if (!boardViewLoaded) {
                  // Kaydedilmiş görünüm yoksa, kartları göster
                  if (notes.length === 0 && folders.length === 0) {
                    // Kartlar yoksa merkeze al
                    if (window.centerBoardOnStart) {
                      window.centerBoardOnStart();
                      window.initialBoardCentered = true;
                    }
                  } else {
                    // Kartlar varsa fitAllNotes çağır
                    if (window.fitAllNotes) {
                      window.fitAllNotes();
                      window.initialBoardCentered = true;
                      console.log('📐 Uygulama açılışında tüm kartlar görünür hale getirildi');
                    }
                  }
                } else {
                  // Kaydedilmiş görünüm yüklendi
                  window.initialBoardCentered = true;
                  console.log('📐 Kaydedilmiş board görünümü yüklendi');
                }
              }
              
              // Board görünümü yüklendikten sonra notları render et
              if (window.renderNotes) window.renderNotes();
              if (window.renderTags) window.renderTags();
              if (window.renderGraph) window.renderGraph();
              
              // Notlar render edildikten sonra board transform'u bir kez daha güncelle
              setTimeout(() => {
                if (window.updateBoardTransform) {
                  window.updateBoardTransform();
                }
                if (window.drawConnections) {
                  window.drawConnections();
                }
              }, 100);
            }, 500);
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
        
        // Önce board görünümünü yükle (notlar render edilmeden önce)
        setTimeout(() => {
          const notes = window.notes || [];
          const folders = window.folders || [];
          if (!window.initialBoardCentered) {
            // Önce kaydedilmiş board görünümünü yüklemeyi dene
            const boardViewLoaded = window.loadBoardView && window.loadBoardView();
            
            if (!boardViewLoaded) {
              // Kaydedilmiş görünüm yoksa, kartları göster
              if (notes.length === 0 && folders.length === 0) {
                // Kartlar yoksa merkeze al
                if (window.centerBoardOnStart) {
                  window.centerBoardOnStart();
                  window.initialBoardCentered = true;
                }
              } else {
                // Kartlar varsa fitAllNotes çağır
                if (window.fitAllNotes) {
                  window.fitAllNotes();
                  window.initialBoardCentered = true;
                  console.log('📐 Uygulama açılışında tüm kartlar görünür hale getirildi');
                }
              }
            } else {
              // Kaydedilmiş görünüm yüklendi
              window.initialBoardCentered = true;
              console.log('📐 Kaydedilmiş board görünümü yüklendi');
            }
          }
          
          // Board görünümü yüklendikten sonra notları render et
          if (window.renderNotes) window.renderNotes();
          if (window.renderTags) window.renderTags();
          if (window.renderGraph) window.renderGraph();
          
          // Notlar render edildikten sonra board transform'u uygula
          requestAnimationFrame(() => {
            if (window.updateBoardTransform) {
              window.updateBoardTransform();
            }
            // Bağlantı çizgilerini çiz
            setTimeout(() => {
              if (window.drawConnections) {
                window.drawConnections();
              }
            }, 50);
          });
        }, 500);
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
  
  // Düzlem sınırları
  const INFINITE_SIZE = 1000000;
  const MIN_X = 0;
  const MIN_Y = 0;
  const MAX_X = INFINITE_SIZE;
  const MAX_Y = INFINITE_SIZE;
  
  // Geçersiz pozisyonları düzelt
  let invalidPositions = 0;
  folders.forEach(folder => {
    if (folder.x !== undefined && folder.y !== undefined) {
      const folderWidth = 300; // Yaklaşık klasör genişliği
      const folderHeight = 120; // Yaklaşık klasör yüksekliği
      
      // Pozisyonun düzlem sınırları içinde olup olmadığını kontrol et
      const isValidX = folder.x >= MIN_X && (folder.x + folderWidth) <= MAX_X;
      const isValidY = folder.y >= MIN_Y && (folder.y + folderHeight) <= MAX_Y;
      
      if (!isValidX || !isValidY) {
        // Geçersiz pozisyon, merkeze al
        invalidPositions++;
        console.warn(`⚠️ "${folder.name}" klasörü geçersiz pozisyonda, merkeze alınıyor: (${folder.x}, ${folder.y})`);
        
        // Düzlemin merkezine yerleştir
        const boardCenterX = INFINITE_SIZE / 2;
        const boardCenterY = INFINITE_SIZE / 2;
        folder.x = boardCenterX - folderWidth / 2;
        folder.y = boardCenterY - folderHeight / 2;
      }
    }
  });
  
  if (invalidPositions > 0) {
    console.log(`🔧 ${invalidPositions} klasör düzlemin dışındaydı, merkeze alındı`);
  }
  
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
              
              // Düzlem sınırları
              const INFINITE_SIZE = 1000000;
              const MIN_X = 0;
              const MIN_Y = 0;
              const MAX_X = INFINITE_SIZE;
              const MAX_Y = INFINITE_SIZE;
              
              // Pozisyon kontrolü
              let folderX = savedFolder ? savedFolder.x : undefined;
              let folderY = savedFolder ? savedFolder.y : undefined;
              
              if (folderX !== undefined && folderY !== undefined) {
                const folderWidth = 300;
                const folderHeight = 120;
                
                // Pozisyonun düzlem sınırları içinde olup olmadığını kontrol et
                const isValidX = folderX >= MIN_X && (folderX + folderWidth) <= MAX_X;
                const isValidY = folderY >= MIN_Y && (folderY + folderHeight) <= MAX_Y;
                
                if (!isValidX || !isValidY) {
                  // Geçersiz pozisyon, merkeze al
                  console.warn(`⚠️ "${item.name}" klasörü geçersiz pozisyonda, merkeze alınıyor: (${folderX}, ${folderY})`);
                  const boardCenterX = INFINITE_SIZE / 2;
                  const boardCenterY = INFINITE_SIZE / 2;
                  folderX = boardCenterX - folderWidth / 2;
                  folderY = boardCenterY - folderHeight / 2;
                }
              }
              
              const folder = {
                id: item.id,
                name: item.name,
                color: savedFolder ? savedFolder.color : FOLDER_COLORS[window.folders.length % FOLDER_COLORS.length],
                parentId: parentId,
                parentPath: parentId ? window.folders.find(f => f.id === parentId)?.name : null,
                level: level,
                path: item.path,
                x: folderX,
                y: folderY,
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
window.saveBoardView = saveBoardView;
window.loadBoardView = loadBoardView;
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

