// Not Panel Sistemi - Tamamen Yeniden Yazıldı
// vditor-widget-design.html tasarımına göre

let notePanelOverlay = null;
let notePanelCurrentNoteId = null;
let notePanelEditor = null;
let audioButtonObserver = null; // Observer referansını sakla

// Not panelini aç
function openNotePanel(noteId) {
  console.log('🚀 Not paneli açılıyor, noteId:', noteId);
  
  // Mevcut paneli kapat
  closeNotePanel();
  
  // Panel HTML'ini oluştur
  createNotePanelHTML();
  
  // Panel'i göster
  notePanelOverlay = document.getElementById('notePanelOverlay');
    notePanelOverlay.classList.add('active');
    
  // Not ID'sini kaydet
  notePanelCurrentNoteId = noteId;
  
  // Not başlığını yükle
  loadNoteTitle(noteId);
  
  // Vditor'u başlat
  initVditorEditor(noteId);
}

// Not panelini kapat
function closeNotePanel() {
  if (notePanelOverlay) {
    notePanelOverlay.classList.remove('active');
  }
    notePanelCurrentNoteId = null;
  notePanelEditor = null;
}

// Panel HTML'ini oluştur
function createNotePanelHTML() {
  // Mevcut paneli kaldır
  const existingPanel = document.getElementById('notePanelOverlay');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // Yeni panel HTML'i - KOMPAKT VE FONKSIYONEL
  const panelHTML = `
    <div id="notePanelOverlay" class="note-panel-overlay">
      <div class="note-panel-container">
        <!-- Header - Sadece kontroller -->
        <div class="note-panel-header">
          <div class="note-panel-title">
            <span>📝 Not Düzenle</span>
          </div>
          <div class="note-panel-controls">
            <button class="panel-control-btn" onclick="saveNotePanelNote()" title="Kaydet">💾</button>
            <button class="panel-control-btn" onclick="closeNotePanel()" title="Kapat">❌</button>
          </div>
        </div>
        
        <!-- Title Section - Ayrı bölüm -->
        <div class="note-title-section">
          <div class="note-title-input-container">
            <input type="text" id="notePanelTitleInput" class="note-panel-title-input" placeholder="Not başlığı..." />
          </div>
        </div>
        
        <!-- Editor Container -->
        <div class="note-editor-section">
          <div id="notePanelEditor"></div>
        </div>
      </div>
    </div>
  `;
  
  // HTML'i body'ye ekle
  document.body.insertAdjacentHTML('beforeend', panelHTML);
  
  // Sürükleme özelliğini ekle
  setupPanelDrag();
}

// Not başlığını yükle
function loadNoteTitle(noteId) {
  const note = window.notes.find(n => n.id === noteId);
  if (note) {
    const titleInput = document.getElementById('notePanelTitleInput');
    if (titleInput) {
      titleInput.value = note.title || '';
    }
  }
}

// Vditor editörünü başlat
function initVditorEditor(noteId) {
  console.log('🚀 Vditor başlatılıyor...');
  
  // Not bilgisini al (upload için gerekli)
  const note = noteId ? window.notes.find(n => n.id === noteId) : null;
  
  // Vditor konfigürasyonu - vditor-widget-design.html'den kopyalanan mükemmel tasarım
  notePanelEditor = new Vditor('notePanelEditor', {
    height: 520,
    mode: 'wysiwyg',
    theme: 'classic',
    lang: 'en_US',
    cache: { enable: false },
    outline: { 
      enable: true, 
      position: 'left' 
    },
    placeholder: 'Buraya yazın... Typora benzeri WYSIWYG editör!',
    upload: {
      accept: 'image/*',
      multiple: false,
      handler: (files) => {
        console.log('📤 Vditor upload handler - Dosya yükleme başlatılıyor:', files);
        // Not bilgisini al (güncel noteId'den)
        const currentNote = notePanelCurrentNoteId ? window.notes.find(n => n.id === notePanelCurrentNoteId) : null;
        return handleVditorUpload(files, currentNote || note);
      },
      linkToImgUrl: '', // Custom handler kullanıyoruz
      linkToImgFormat: (responseText) => {
        // Response'tan URL'yi al
        try {
          const data = JSON.parse(responseText);
          if (Array.isArray(data) && data.length > 0) {
            return data[0].url || '';
          }
          return data.url || data.path || '';
        } catch (e) {
          return responseText;
        }
      }
    },
    after: function() {
      console.log('✅ Vditor hazır!');
      
      // İçeriği yükle
      if (noteId) {
        loadNoteContent(noteId);
      }
      
      // Event'leri ayarla
      setupVditorEvents();
      
      // ANINDA stilleri uygula
      applyOutlineColors();
      
      // Stilleri tekrar uygula
      setTimeout(() => applyOutlineColors(), 100);
      setTimeout(() => applyOutlineColors(), 300);
      
      // Türkçe tooltip'leri ekle
      setTimeout(() => addTurkishTooltips(), 500);
      
      // Custom tablo butonunu ekle
      setTimeout(() => setupCustomTableButton(), 500);
      
      // Custom link butonunu ekle
      setTimeout(() => setupCustomLinkButton(), 600);
      
      // BUTON EKLEME FONKSİYONU - Çok erken çalışmalı
      function addCustomButtons() {
        const toolbar = document.querySelector('#notePanelEditor .vditor-toolbar');
        if (!toolbar) {
          return false;
        }
        
        // Link butonunu bul
        const linkBtn = toolbar.querySelector('[data-type="link"]');
        if (!linkBtn) {
          return false;
        }
        
        // Vditor'un upload ve record butonlarını bul ve icon'larını al (kaldırmadan önce)
        // Global icon cache - ilk yüklemede icon'ları sakla
        if (!window.vditorIconCache) {
          window.vditorIconCache = {
            upload: '',
            record: ''
          };
        }
        
        // Önce butonları bul
        const vditorUploadBtn = toolbar.querySelector('[data-type="upload"]') || 
                                 toolbar.querySelector('[data-type="image"]') ||
                                 toolbar.querySelector('button[title*="Upload" i]') ||
                                 toolbar.querySelector('button[title*="Image" i]');
        
        let uploadIconHTML = window.vditorIconCache.upload || '';
        if (vditorUploadBtn && !uploadIconHTML) {
          // Butonun içeriğini direkt al - Vditor'un orijinal icon'unu kullan
          uploadIconHTML = vditorUploadBtn.innerHTML;
          // Cache'e kaydet
          if (uploadIconHTML && uploadIconHTML.trim() !== '' && !uploadIconHTML.includes('🖼️')) {
            window.vditorIconCache.upload = uploadIconHTML;
          }
        }
        
        const vditorRecordBtn = toolbar.querySelector('[data-type="record"]') ||
                               toolbar.querySelector('button[title*="Record" i]') ||
                               toolbar.querySelector('button[title*="Audio" i]');
        
        let recordIconHTML = window.vditorIconCache.record || '';
        if (vditorRecordBtn && !recordIconHTML) {
          // Butonun içeriğini direkt al - Vditor'un orijinal icon'unu kullan
          recordIconHTML = vditorRecordBtn.innerHTML;
          // Cache'e kaydet
          if (recordIconHTML && recordIconHTML.trim() !== '' && !recordIconHTML.includes('🎤')) {
            window.vditorIconCache.record = recordIconHTML;
          }
        }
        
        // Şimdi TÜM upload ve record butonlarını kaldır
        const unwantedBtns = toolbar.querySelectorAll(
          '[data-type="upload"], ' +
          '[data-type="record"], ' +
          'button[title*="Upload" i], ' +
          'button[title*="upload" i], ' +
          'button[title*="Record" i], ' +
          'button[title*="record" i]'
        );
        unwantedBtns.forEach(btn => {
          try {
            btn.remove();
          } catch (e) {}
        });
        
        // Image butonu varsa kontrol et, yoksa ekle
        let imageBtn = toolbar.querySelector('[data-type="image"][data-custom-handler="true"]');
        if (!imageBtn) {
          imageBtn = document.createElement('button');
          imageBtn.type = 'button';
          // Vditor'un upload icon'unu direkt kullan (orijinal icon)
          if (uploadIconHTML && uploadIconHTML.trim() !== '') {
            imageBtn.innerHTML = uploadIconHTML;
          } else {
            // Fallback: Diğer toolbar butonlarından benzer bir icon bul
            const otherBtn = toolbar.querySelector('[data-type="table"]') || 
                            toolbar.querySelector('[data-type="heading"]') ||
                            toolbar.querySelector('[data-type="list"]');
            if (otherBtn && otherBtn.innerHTML) {
              imageBtn.innerHTML = otherBtn.innerHTML;
            } else {
              imageBtn.innerHTML = linkBtn.innerHTML;
            }
          }
          imageBtn.className = linkBtn.className;
          imageBtn.setAttribute('data-type', 'image');
          imageBtn.setAttribute('data-custom-handler', 'true');
          imageBtn.setAttribute('title', 'Resim');
          imageBtn.style.cssText = linkBtn.style.cssText;
          imageBtn.style.fontSize = '16px';
          imageBtn.style.marginLeft = '4px';
          imageBtn.style.display = 'inline-block';
          imageBtn.style.visibility = 'visible';
          imageBtn.style.opacity = '1';
          
          // Click handler
          imageBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const note = notePanelCurrentNoteId ? window.notes.find(n => n.id === notePanelCurrentNoteId) : null;
            if (!note || !note.id) {
              if (window.showNotification) window.showNotification('Önce notu kaydedin!', 'error');
              return false;
            }
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = async (ev) => {
              if (ev.target.files && ev.target.files[0]) {
                try {
                  const result = await handleVditorUpload(ev.target.files, note);
                  const parsed = JSON.parse(result);
                  if (parsed && parsed.length > 0 && parsed[0].url && notePanelEditor) {
                    const current = notePanelEditor.getValue();
                    // Önce newline ekle (ses ile karışmaması için)
                    const newlinePrefix = current.trim().length > 0 && !current.endsWith('\n\n') ? '\n\n' : '';
                    notePanelEditor.setValue(current + newlinePrefix + parsed[0].url + '\n\n');
                  }
                } catch (error) {
                  console.error('❌ Resim yükleme hatası:', error);
                }
              }
            };
            fileInput.click();
            return false;
          };
          
          linkBtn.parentNode.insertBefore(imageBtn, linkBtn.nextSibling);
          console.log('✅ Image butonu eklendi');
        } else {
          // Var ama görünür olmayabilir
          imageBtn.style.display = 'inline-block';
          imageBtn.style.visibility = 'visible';
          imageBtn.style.opacity = '1';
        }
        
        // Audio butonu varsa kontrol et, yoksa ekle
        let audioBtn = toolbar.querySelector('[data-type="audio-record"]');
        if (!audioBtn) {
          audioBtn = document.createElement('button');
          audioBtn.type = 'button';
          // Vditor'un record icon'unu direkt kullan (orijinal icon)
          if (recordIconHTML && recordIconHTML.trim() !== '') {
            audioBtn.innerHTML = recordIconHTML;
          } else {
            // Fallback: Diğer toolbar butonlarından benzer bir icon bul
            const otherBtn = toolbar.querySelector('[data-type="table"]') || 
                            toolbar.querySelector('[data-type="heading"]') ||
                            toolbar.querySelector('[data-type="list"]');
            if (otherBtn && otherBtn.innerHTML) {
              audioBtn.innerHTML = otherBtn.innerHTML;
            } else {
              audioBtn.innerHTML = linkBtn.innerHTML;
            }
          }
          audioBtn.className = linkBtn.className;
          audioBtn.setAttribute('data-type', 'audio-record');
          audioBtn.setAttribute('title', 'Ses Kaydı');
          audioBtn.style.cssText = linkBtn.style.cssText;
          audioBtn.style.fontSize = '16px';
          audioBtn.style.marginLeft = '4px';
          audioBtn.style.display = 'inline-block';
          audioBtn.style.visibility = 'visible';
          audioBtn.style.opacity = '1';
          
          // Click handler
          audioBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const note = notePanelCurrentNoteId ? window.notes.find(n => n.id === notePanelCurrentNoteId) : null;
            if (!note || !note.id) {
              if (window.showNotification) window.showNotification('Önce notu kaydedin!', 'error');
              return false;
            }
            showAudioRecordingModal(note);
            return false;
          };
          
          const insertAfter = imageBtn || linkBtn;
          insertAfter.parentNode.insertBefore(audioBtn, insertAfter.nextSibling);
          console.log('✅ Audio butonu eklendi');
        } else {
          // Var ama görünür olmayabilir
          audioBtn.style.display = 'inline-block';
          audioBtn.style.visibility = 'visible';
          audioBtn.style.opacity = '1';
        }
        
        return true;
      }
      
      // ÇOK ERKEN - Hemen deneme (50ms, 150ms, 300ms)
      setTimeout(() => addCustomButtons(), 50);
      setTimeout(() => addCustomButtons(), 150);
      setTimeout(() => addCustomButtons(), 300);
      
      // Sürekli kontrol ve temizlik
      if (!window.vditorButtonManager) {
        window.vditorButtonManager = setInterval(() => {
          const toolbar = document.querySelector('#notePanelEditor .vditor-toolbar');
          if (toolbar) {
            // Vditor'un istenmeyen butonlarını kaldır
            const unwantedBtns = toolbar.querySelectorAll(
              '[data-type="upload"], ' +
              '[data-type="record"], ' +
              'button[title*="Upload" i], ' +
              'button[title*="upload" i], ' +
              'button[title*="Record" i], ' +
              'button[title*="record" i]'
            );
            unwantedBtns.forEach(btn => {
              try {
                btn.remove();
              } catch (e) {}
            });
            
            // Custom butonları ekle/görünür yap
            addCustomButtons();
          }
        }, 150);
      }
      
      // MutationObserver ile toolbar değişikliklerini izle
      setTimeout(() => {
        const toolbar = document.querySelector('#notePanelEditor .vditor-toolbar');
        if (toolbar && !window.vditorToolbarObserver) {
          window.vditorToolbarObserver = new MutationObserver(() => {
            addCustomButtons();
          });
          window.vditorToolbarObserver.observe(toolbar, {
            childList: true,
            subtree: true,
            attributes: false
          });
        }
      }, 200);
    }
  });
}

// Not içeriğini yükle
function loadNoteContent(noteId) {
  if (!notePanelEditor || !noteId) return;
  
  const note = window.notes.find(n => n.id === noteId);
  if (note) {
    console.log('📝 Not içeriği yükleniyor:', note.title);
    
    const content = note.text || note.markdownContent || '';
      
      setTimeout(() => {
      if (notePanelEditor && notePanelEditor.setValue) {
        try {
          notePanelEditor.setValue(content);
          console.log('📝 Not içeriği yüklendi');
        } catch (error) {
          console.error('❌ Vditor setValue hatası:', error);
        }
      }
    }, 100);
  }
}

// Vditor event'lerini ayarla
function setupVditorEvents() {
  if (!notePanelEditor) return;
  
  // Content change event'i - daha güvenli yaklaşım
      setTimeout(() => {
    try {
      const wysiwygElement = document.querySelector('#notePanelEditor .vditor-wysiwyg');
      if (wysiwygElement) {
        console.log('🎯 Vditor wysiwyg element bulundu');
        
        wysiwygElement.addEventListener('input', () => {
          console.log('📝 İçerik değişti');
          // Sadece kaydet butonuna basınca kaydet, otomatik kaydetme yok
        });
        
        // Link'lere single-click ile direkt düzenleme modalını aç
        wysiwygElement.addEventListener('click', (e) => {
          const target = e.target;
          
          // Link veya link içindeki bir element
          if (target.tagName === 'A' || target.closest('a')) {
            e.preventDefault();
            e.stopPropagation();
            
            const linkEl = target.tagName === 'A' ? target : target.closest('a');
            
            // Direkt düzenleme modalını aç
            editLink(linkEl);
          }
        }, true); // Capture phase
      } else {
        console.log('⚠️ Vditor wysiwyg element bulunamadı, event atlandı');
      }
    } catch (error) {
      console.error('❌ Event handler hatası:', error);
    }
  }, 500); // Daha uzun bekleme süresi
}

// Debounce için timer (notePanel özel)
let notePanelSaveTimeout = null;

// Debounce ile kaydet
function debounceSave() {
  if (notePanelSaveTimeout) {
    clearTimeout(notePanelSaveTimeout);
  }
  
  notePanelSaveTimeout = setTimeout(() => {
    saveCurrentNoteContent();
    console.log('💾 Debounce ile kaydedildi');
  }, 2000);
}

// Mevcut notu kaydet
function saveCurrentNoteContent() {
  if (!notePanelEditor) return;
  
  // Başlığı al
  const titleInput = document.getElementById('notePanelTitleInput');
  const title = titleInput ? titleInput.value.trim() : 'Yeni Not';
  
  // Yeni not mu, mevcut not mu?
  let note = null;
  
  if (notePanelCurrentNoteId) {
    // Mevcut not
    note = window.notes.find(n => n.id === notePanelCurrentNoteId);
    
    // NOT VARSA TEKRAR EKLEME, SADECE GÜNCELLE
    if (note) {
      console.log('✅ Mevcut not güncelleniyor:', note.title);
    } else {
      console.error('❌ Not bulunamadı:', notePanelCurrentNoteId);
      return;
    }
  } else {
    // Yeni not oluşturuluyor
    if (title && title !== 'Yeni Not' && title !== '') {
      // DUPLİKASYON KONTROLÜ - Aynı başlıklı not var mı?
      const existingNote = window.notes.find(n => n.title === title);
      
      if (existingNote) {
        // Duplikasyon var, mevcut notu kullan
        console.log('⚠️ Aynı başlıklı not zaten var, mevcut not kullanılıyor');
        note = existingNote;
        notePanelCurrentNoteId = existingNote.id;
      } else {
        // Yeni not oluştur
        const newNote = {
          id: 'note_' + Date.now(),
          title: title,
          text: '',
          markdownContent: '',
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
          width: 280,
          height: 200,
          tags: [],
          links: [],
          folderId: null,
          fileName: title.replace(/[^a-z0-9_]/gi, '_') + '.md'
        };
        
        // Önce push etme, sadece reference oluştur
        note = newNote;
        notePanelCurrentNoteId = newNote.id;
        console.log('📝 Yeni not hazırlandı:', title);
      }
    } else {
      if (window.showAlertModal) {
        window.showAlertModal('Uyarı', 'Lütfen geçerli bir başlık girin!', 'warning');
      } else {
        alert('Lütfen geçerli bir başlık girin!');
      }
      return;
    }
  }
  
  if (note) {
    try {
      const content = notePanelEditor.getValue();
      
      // ESKİ içeriği al (silinen dosyaları bulmak için)
      const oldContent = note.text || note.markdownContent || '';
      
      // Yeni içeriği ayarla
      note.text = content;
      note.markdownContent = content;
      
      // Silinen dosyaları bul ve sil
      if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        
        // Dosya referanslarını çıkaran fonksiyon
        const extractFilePaths = (text) => {
          const paths = new Set();
          
          // Markdown image: ![alt](path)
          const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
          let match;
          while ((match = imageRegex.exec(text)) !== null) {
            let path = match[2];
            // file:// URL'sini temizle
            if (path.startsWith('file:///')) {
              path = path.replace(/^file:\/\/\//, '');
            }
            // .media klasöründen olan dosyaları al
            if (path && (path.includes('.media') || path.startsWith('.media'))) {
              paths.add(path);
            }
          }
          
          // HTML img tag: <img src="path">
          const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
          while ((match = imgTagRegex.exec(text)) !== null) {
            let path = match[1];
            if (path.startsWith('file:///')) {
              path = path.replace(/^file:\/\/\//, '');
            }
            // .media klasöründen olan dosyaları al
            if (path && (path.includes('.media') || path.startsWith('.media'))) {
              paths.add(path);
            }
          }
          
          // HTML audio tag: <audio><source src="path">
          const audioRegex = /<audio[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
          while ((match = audioRegex.exec(text)) !== null) {
            let path = match[1];
            if (path.startsWith('file:///')) {
              path = path.replace(/^file:\/\/\//, '');
            }
            // .media klasöründen olan dosyaları al
            if (path && (path.includes('.media') || path.startsWith('.media'))) {
              paths.add(path);
            }
          }
          
          return Array.from(paths);
        };
        
        const oldFiles = extractFilePaths(oldContent);
        const newFiles = extractFilePaths(content);
        
        // Silinen dosyaları bul (eskide var ama yeni içerikte yok)
        const deletedFiles = oldFiles.filter(file => !newFiles.includes(file));
        
        // Silinen dosyaları sil
        if (deletedFiles.length > 0) {
          console.log('🗑️ Silinen dosyalar bulundu:', deletedFiles);
          deletedFiles.forEach(async (filePath) => {
            try {
              const result = await ipcRenderer.invoke('delete-media-file', { filePath: filePath });
              if (result.success) {
                console.log('✅ Dosya silindi:', filePath);
              } else {
                console.log('⚠️ Dosya silinemedi:', filePath, result.error);
              }
            } catch (error) {
              console.error('❌ Dosya silme hatası:', filePath, error);
            }
          });
        }
      }
      
      // Başlığı güncelle
      if (title && title !== note.title) {
        note.title = title;
        // Dosya adını güncelle
        if (typeof window.renameNoteFile === 'function') {
          window.renameNoteFile(note, title);
        }
      }
      
      // Etiketleri parse et ve güncelle
      if (window.parseTags) {
        note.tags = window.parseTags(content);
        console.log('🏷️ Not etiketleri güncellendi:', note.tags);
      }
      
      // WINDOW.NOTES'E EKLEME/GÜNCELLEME - TEK SEVİYE
      const noteIndex = window.notes.findIndex(n => n.id === note.id);
      if (noteIndex !== -1) {
        // Not bulundu, sadece güncelle (duplikasyon önlemek için)
        window.notes[noteIndex] = note;
        console.log('✅ Mevcut not güncellendi:', note.title);
      } else {
        // Not bulunamadı, ekle
        window.notes.push(note);
        console.log('📝 Yeni not eklendi:', note.title);
      }
      
      console.log('💾 Not kaydedildi');
      
      // LOCALSTORAGE VE DOSYA SİSTEMİ KAYDET
      if (typeof window.saveNotes === 'function') {
        window.saveNotes();
        console.log('💾 localStorage kaydedildi');
      }
      
      if (typeof window.saveNoteToFile === 'function') {
        window.saveNoteToFile(note);
        console.log('💾 Not dosyaya kaydediliyor...');
      }
      
      // NOT KARTLARINI YENİDEN RENDER ET
      if (typeof window.renderNotes === 'function') {
        window.renderNotes();
        console.log('🔄 Notlar yeniden render edildi');
      }
      
      // ETIKET PANELINI YENİDEN RENDER ET
      if (typeof window.renderTags === 'function') {
        window.renderTags();
        console.log('🏷️ Etiket paneli güncellendi');
      }
      
      // Kaydetme sonrası paneli kapat
      closeNotePanel();
    } catch (error) {
      console.error('❌ Kaydetme hatası:', error);
    }
  }
}

// Türkçe tooltip'leri ekle
function addTurkishTooltips() {
  const toolbar = document.querySelector('.vditor .vditor-toolbar');
  if (!toolbar) return;

  const buttons = toolbar.querySelectorAll('button');
  const tooltipMap = {
    'bold': 'Kalın',
    'italic': 'İtalik', 
    'strikethrough': 'Üstü Çizili',
    'quote': 'Alıntı',
    'code': 'Kod',
    'link': 'Bağlantı',
    'image': 'Resim',
    'table': 'Tablo',
    'heading': 'Başlık',
    'list': 'Liste',
    'hr': 'Çizgi',
    'undo': 'Geri Al',
    'redo': 'Yinele',
    'fullscreen': 'Tam Ekran',
    'preview': 'Önizleme',
    'edit': 'Düzenle',
    'help': 'Yardım',
    'settings': 'Ayarlar'
  };

  buttons.forEach(button => {
    const title = button.getAttribute('title');
    if (title) {
      for (const [key, turkish] of Object.entries(tooltipMap)) {
        if (title.toLowerCase().includes(key)) {
          button.setAttribute('title', turkish);
          break;
        }
      }
    }
  });
}

// Outline renklerini zorla uygula
function applyOutlineColors() {
  console.log('🎨 Outline renkleri uygulanıyor...');
  
  const applyColors = () => {
    const outlineContainer = document.querySelector('.vditor-outline');
    if (!outlineContainer) return;
    
    // Outline genişliğini zorla ayarla - KÜÇÜK BOYUT
    outlineContainer.style.setProperty('width', '200px', 'important');
    outlineContainer.style.setProperty('min-width', '180px', 'important');
    outlineContainer.style.setProperty('max-width', '220px', 'important');
    outlineContainer.style.setProperty('flex-basis', '200px', 'important');
    outlineContainer.style.setProperty('padding', '16px', 'important');
    
    // Tüm link ve item'ları bul
    const allItems = outlineContainer.querySelectorAll('a, div, span, li');
    
    allItems.forEach(item => {
      const text = item.textContent || item.innerText || '';
      
      // Başlık seviyelerini kontrol et
      const hasH1 = text.includes('H1') || item.classList.contains('vditor-outline__item--level-1');
      const hasH2 = text.includes('H2') || item.classList.contains('vditor-outline__item--level-2');
      const hasH3 = text.includes('H3') || item.classList.contains('vditor-outline__item--level-3');
      
      // Inline stil ile zorla uygula
      if (hasH1 || item.getAttribute('data-type') === 'outline-h1') {
        item.style.setProperty('color', '#a78bfa', 'important');
        item.style.setProperty('font-weight', '600', 'important');
        item.style.setProperty('font-size', '14px', 'important');
      } else if (hasH2 || item.getAttribute('data-type') === 'outline-h2') {
        item.style.setProperty('color', '#7dd3fc', 'important');
        item.style.setProperty('font-weight', '500', 'important');
        item.style.setProperty('font-size', '13px', 'important');
      } else if (hasH3 || item.getAttribute('data-type') === 'outline-h3') {
        item.style.setProperty('color', '#e9eef5', 'important');
        item.style.setProperty('font-weight', '500', 'important');
        item.style.setProperty('font-size', '13px', 'important');
      } else {
        // Varsayılan açık renk
        item.style.setProperty('color', '#e9eef5', 'important');
        item.style.setProperty('font-size', '13px', 'important');
      }
      
      // White-space normal yap - text wrapping için
      item.style.setProperty('white-space', 'normal', 'important');
      item.style.setProperty('word-wrap', 'break-word', 'important');
      item.style.setProperty('overflow', 'visible', 'important');
      
      // Koyu renk kontrolü - eğer koyu renkse zorla açık yap
      const computedStyle = window.getComputedStyle(item);
      const color = computedStyle.color;
      const rgb = color.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);
        // Eğer çok koyu renkse (rgb < 100,100,100)
        if (r < 100 && g < 100 && b < 100) {
          item.style.setProperty('color', '#e9eef5', 'important');
        }
      }
    });
  };
  
  // Hemen uygula
  applyColors();
  
  // Saniyede bir kontrol et
  const intervalId = setInterval(() => {
    applyColors();
  }, 1000);
  
  // Observer ile değişiklikleri izle
  const outlineContainer = document.querySelector('.vditor-outline');
  if (outlineContainer) {
    const observer = new MutationObserver(() => {
      applyColors();
    });
    
    observer.observe(outlineContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-type']
    });
    
    // Cleanup
    setTimeout(() => {
      clearInterval(intervalId);
    }, 10000);
  }
  
  console.log('✅ Outline renkleri uygulandı');
}

// Panel sürükleme - AKILLI DRAG
function setupPanelDrag() {
  const header = document.querySelector('.note-panel-header');
  const titleSection = document.querySelector('.note-title-section');
  const inputContainer = document.querySelector('.note-title-input-container');
  
  if (!header || !titleSection || !inputContainer) return;
  
  // IPC Renderer kontrolü
  if (typeof require === 'undefined') {
    console.log('⚠️ Electron ortamı yok, drag devre dışı');
    return;
  }
  
  const { ipcRenderer } = require('electron');
  
  // Header'dan sürükleme
  function addDragListener(element) {
    element.addEventListener('mousedown', (e) => {
      // Eğer input container içindeyse normal davranış
      if (inputContainer.contains(e.target)) {
        return; // Normal input davranışına izin ver
      }
      
      if (e.button === 0) {
        e.preventDefault();
        
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let dragTimer = null;
        
        startX = e.screenX;
        startY = e.screenY;
        
        // 50ms sonra drag moduna geç
        dragTimer = setTimeout(() => {
          isDragging = true;
          element.style.cursor = 'grabbing';
          console.log('🔄 Panel drag başladı');
          
          const handleDrag = (dragEvent) => {
            if (isDragging) {
              const deltaX = dragEvent.screenX - startX;
              const deltaY = dragEvent.screenY - startY;
              
              if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                ipcRenderer.send('move-widget', deltaX, deltaY);
                startX = dragEvent.screenX;
                startY = dragEvent.screenY;
              }
            }
          };
          
          const handleUp = () => {
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', handleUp);
            if (dragTimer) clearTimeout(dragTimer);
            element.style.cursor = '';
            isDragging = false;
          };
          
          document.addEventListener('mousemove', handleDrag);
          document.addEventListener('mouseup', handleUp);
        }, 50);
      }
    });
  }
  
  // Header ve title section'dan sürükleme
  addDragListener(header);
  addDragListener(titleSection);
}

// Custom tablo butonu ekle
function setupCustomTableButton() {
  try {
    const toolbar = document.querySelector('#notePanelEditor .vditor-toolbar');
    if (!toolbar) {
      console.log('⚠️ Toolbar bulunamadı');
      return;
    }
    
    const insertTableBtn = toolbar.querySelector('[data-type="table"]');
    if (!insertTableBtn) {
      console.log('⚠️ Tablo butonu bulunamadı');
      return;
    }
    
    // Vditor'un tüm event'lerini kaldır
    const newTableBtn = insertTableBtn.cloneNode(true);
    insertTableBtn.parentNode.replaceChild(newTableBtn, insertTableBtn);
    
    // Yeni click event'i ekle
    newTableBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('📋 Custom tablo modal açılıyor...');
      
      // Modal'ı göster
      showTableSizeModal();
      
      return false;
    }, true);
    
    console.log('✅ Custom tablo butonu eklendi');
  } catch (error) {
    console.error('❌ Tablo butonu ekleme hatası:', error);
  }
}

// Tablo boyutu seçim modalı
function showTableSizeModal() {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div id="tableSizeModal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10003;display:flex;align-items:center;justify-content:center">
      <div style="background:var(--noteditor-panel);border:1px solid var(--noteditor-border);border-radius:12px;padding:24px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,.5)">
        <h3 style="margin:0 0 20px 0;color:var(--noteditor-text);font-size:18px;font-weight:600">📋 Tablo Boyutu</h3>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:8px;color:var(--noteditor-text);font-size:14px">Satır Sayısı</label>
          <input type="number" id="tableRows" min="1" max="20" value="3" style="width:100%;padding:10px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);font-size:14px;outline:none">
        </div>
        <div style="margin-bottom:20px">
          <label style="display:block;margin-bottom:8px;color:var(--noteditor-text);font-size:14px">Sütun Sayısı</label>
          <input type="number" id="tableCols" min="1" max="20" value="3" style="width:100%;padding:10px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);font-size:14px;outline:none">
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="cancelTableBtn" style="padding:10px 20px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);cursor:pointer;font-size:14px;font-weight:500">İptal</button>
          <button id="insertTableBtn" style="padding:10px 20px;background:linear-gradient(135deg,var(--noteditor-accent),var(--noteditor-accent2));border:none;border-radius:6px;color:#0a0d12;cursor:pointer;font-size:14px;font-weight:600">Ekle</button>
        </div>
      </div>
    </div>`;
  
  document.body.appendChild(modal);
  
  const rowsInput = document.getElementById('tableRows');
  const colsInput = document.getElementById('tableCols');
  const insertBtn = document.getElementById('insertTableBtn');
  const cancelBtn = document.getElementById('cancelTableBtn');
  
  const close = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  };
  
  cancelBtn.onclick = close;
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'tableSizeModal') close();
  });
  
  insertBtn.onclick = () => {
    const rows = parseInt(rowsInput.value) || 3;
    const cols = parseInt(colsInput.value) || 3;
    
    console.log(`📋 Tablo ekleniyor: ${rows}x${cols}`);
    
    // Markdown tablo oluştur
    let tableMarkdown = '';
    
    // Başlık satırı
    tableMarkdown += '| ';
    for (let i = 0; i < cols; i++) {
      tableMarkdown += `Kolon ${i + 1} | `;
    }
    tableMarkdown += '\n';
    
    // Ayırıcı
    tableMarkdown += '| ';
    for (let i = 0; i < cols; i++) {
      tableMarkdown += '--- | ';
    }
    tableMarkdown += '\n';
    
    // Satırlar
    for (let row = 0; row < rows - 1; row++) {
      tableMarkdown += '| ';
      for (let col = 0; col < cols; col++) {
        tableMarkdown += ` | `;
      }
      tableMarkdown += '\n';
    }
    
    // Tabloyu ekle
    if (notePanelEditor) {
      try {
        const currentValue = notePanelEditor.getValue();
        const newValue = currentValue + '\n\n' + tableMarkdown;
        notePanelEditor.setValue(newValue);
        console.log('✅ Tablo eklendi');
      } catch (error) {
        console.error('❌ Tablo ekleme hatası:', error);
      }
    }
    
    close();
  };
  
  rowsInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') colsInput.focus();
  });
  
  colsInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') insertBtn.click();
  });
  
  rowsInput.focus();
  rowsInput.select();
}

// Link düzenleme fonksiyonu - Kompakt tek modal (Aç, Kaydet, Sil)
function editLink(linkElement) {
  const currentText = linkElement.textContent || '';
  const currentUrl = linkElement.getAttribute('href') || '';
  
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div id="linkEditModal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10003;display:flex;align-items:center;justify-content:center">
      <div style="background:var(--noteditor-panel);border:1px solid var(--noteditor-border);border-radius:12px;padding:20px;min-width:340px;box-shadow:0 8px 32px rgba(0,0,0,.5)">
        <h3 style="margin:0 0 16px 0;color:var(--noteditor-text);font-size:16px;font-weight:600">🔗 Bağlantı</h3>
        <label style="display:block;color:var(--noteditor-text);font-size:13px;margin-bottom:6px">Görünen Metin</label>
        <input id="linkTextEdit" value="${currentText}" style="width:100%;margin-bottom:12px;padding:10px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);font-size:14px">
        <label style="display:block;color:var(--noteditor-text);font-size:13px;margin-bottom:6px">URL</label>
        <input id="linkHrefEdit" value="${currentUrl}" placeholder="https://..." style="width:100%;margin-bottom:16px;padding:10px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);font-size:14px">
        <div style="display:flex;gap:8px">
          <button id="linkOpenBtn2" style="flex:1;padding:10px 14px;background:linear-gradient(135deg,var(--noteditor-accent),var(--noteditor-accent2));border:none;border-radius:6px;color:#0a0d12;font-weight:600;cursor:pointer;font-size:14px">🌐 Aç</button>
          <button id="linkDeleteBtn" style="padding:10px 14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:6px;color:#ef4444;cursor:pointer;font-size:14px">🗑️ Sil</button>
          <button id="linkEditOk" style="flex:1;padding:10px 14px;background:rgba(255,255,255,.06);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);cursor:pointer;font-weight:500;font-size:14px">Kaydet</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  
  const ok = modal.querySelector('#linkEditOk');
  const deleteBtn = modal.querySelector('#linkDeleteBtn');
  const openBtn = modal.querySelector('#linkOpenBtn2');
  const textIn = modal.querySelector('#linkTextEdit');
  const hrefIn = modal.querySelector('#linkHrefEdit');
  
  // Aç butonuna click event'i
  openBtn.onclick = () => {
    const href = (hrefIn.value || '').trim();
    if (href) {
      const safeHref = href.match(/^https?:\/\//i) ? href : ('https://' + href);
      window.open(safeHref, '_blank');
    }
    close();
  };
  
  const close = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  };
  
  // Modal dışına tıklayınca kapat
  modal.addEventListener('click', (e) => { 
    if (e.target.id === 'linkEditModal') close(); 
  });
  
  ok.onclick = () => {
    const text = (textIn.value || '').trim();
    const href = (hrefIn.value || '').trim();
    
    if (!href) {
      hrefIn.focus();
      hrefIn.style.borderColor = '#ef4444';
      return;
    }
    
    try {
      const safeHref = href.match(/^https?:\/\//i) ? href : ('https://' + href);
      linkElement.textContent = text;
      linkElement.setAttribute('href', safeHref);
      close();
    } catch (err) {
      console.error('❌ Link güncelleme hatası:', err);
    }
  };
  
  deleteBtn.onclick = () => {
    try {
      linkElement.remove();
      close();
    } catch (err) {
      console.error('❌ Link silme hatası:', err);
    }
  };
  
  (hrefIn || textIn).focus();
  
  hrefIn.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') ok.click();
  });
}

// Custom link ekleme fonksiyonu
function setupCustomLinkButton() {
  try {
    const toolbar = document.querySelector('#notePanelEditor .vditor-toolbar');
    if (!toolbar) {
      console.log('⚠️ Toolbar bulunamadı');
      return;
    }
    
    const linkBtn = toolbar.querySelector('[data-type="link"]');
    if (!linkBtn) {
      console.log('⚠️ Link butonu bulunamadı');
      return;
    }
    
    // Vditor'un tüm event'lerini kaldır
    const newLinkBtn = linkBtn.cloneNode(true);
    linkBtn.parentNode.replaceChild(newLinkBtn, linkBtn);
    
    // Yeni click event'i ekle
    newLinkBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('🔗 Custom link modal açılıyor...');
      
      // Modal'ı aç
      openLinkInsertModal();
      
      return false;
    }, true);
    
    console.log('✅ Custom link butonu eklendi');
  } catch (error) {
    console.error('❌ Link butonu ekleme hatası:', error);
  }
}

// Manuel image butonu ekle
function addManualImageButton(toolbar) {
  try {
    // Link butonunu bul (referans olarak)
    const linkBtn = toolbar.querySelector('[data-type="link"]');
    if (!linkBtn) {
      console.log('⚠️ Link butonu bulunamadı, image butonu eklenemedi');
      return false;
    }
    
    // Mevcut image butonunu kontrol et
    const existingImageBtn = toolbar.querySelector('[data-type="image"][data-custom-handler="true"]');
    if (existingImageBtn) {
      // Varsa görünür yap ve çık
      existingImageBtn.style.display = 'inline-block';
      existingImageBtn.style.visibility = 'visible';
      existingImageBtn.style.opacity = '1';
      return true;
    }
    
    // Yeni image butonu oluştur
    const imageBtn = document.createElement('button');
    imageBtn.type = 'button';
    // Emoji kullan ve font-size'ı artır
    imageBtn.innerHTML = '🖼️';
    imageBtn.className = linkBtn.className;
    imageBtn.setAttribute('data-type', 'image');
    imageBtn.setAttribute('data-custom-handler', 'true');
    imageBtn.setAttribute('title', 'Resim');
    imageBtn.style.cssText = linkBtn.style.cssText;
    imageBtn.style.display = 'inline-block';
    imageBtn.style.visibility = 'visible';
    imageBtn.style.opacity = '1';
    imageBtn.style.fontSize = '16px';
    imageBtn.style.lineHeight = '1';
    imageBtn.style.padding = '6px 8px';
    imageBtn.style.minWidth = '32px';
    imageBtn.style.textAlign = 'center';
    imageBtn.style.marginLeft = '4px';
    imageBtn.style.position = 'relative';
    imageBtn.style.zIndex = '999';
    
    // Link butonundan sonra ekle
    linkBtn.parentNode.insertBefore(imageBtn, linkBtn.nextSibling);
    
    // Event listener ekle
    imageBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('🖼️ Custom image seçici açılıyor...');
      
      const note = notePanelCurrentNoteId ? window.notes.find(n => n.id === notePanelCurrentNoteId) : null;
      
      if (!note || !note.id) {
        if (window.showNotification) {
          window.showNotification('Önce notu kaydedin!', 'error');
        }
        return false;
      }
      
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = false;
      
      fileInput.onchange = async (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
          console.log('📤 Resim seçildi:', files[0].name);
          
          try {
            const result = await handleVditorUpload(files, note);
            const parsed = JSON.parse(result);
            
            if (parsed && parsed.length > 0 && parsed[0].url) {
              if (notePanelEditor) {
                const current = notePanelEditor.getValue();
                // URL zaten HTML img tag formatında olabilir
                // Önce newline ekle (ses ile karışmaması için)
                const newlinePrefix = current.trim().length > 0 && !current.endsWith('\n\n') ? '\n\n' : '';
                const imageContent = newlinePrefix + parsed[0].url + '\n\n';
                notePanelEditor.setValue(current + imageContent);
                console.log('✅ Resim eklendi:', parsed[0].url);
                
                // Vditor'un resmi render etmesi için tetikle
                setTimeout(() => {
                  if (notePanelEditor && typeof notePanelEditor.vditor === 'object') {
                    const wysiwyg = document.querySelector('#notePanelEditor .vditor-wysiwyg');
                    if (wysiwyg) {
                      // Force render
                      const event = new Event('input', { bubbles: true });
                      wysiwyg.dispatchEvent(event);
                    }
                  }
                }, 100);
              }
            }
          } catch (error) {
            console.error('❌ Resim yükleme hatası:', error);
            if (window.showNotification) {
              window.showNotification('Resim yükleme hatası: ' + error.message, 'error');
            }
          }
        }
      };
      
      fileInput.click();
      return false;
    }, true);
    
    // Simgeyi güçlendir
    if (!imageBtn.innerHTML || imageBtn.innerHTML.trim() === '' || !imageBtn.innerHTML.includes('🖼️')) {
      imageBtn.innerHTML = '🖼️';
    }
    
    console.log('✅ Manuel image butonu eklendi:', imageBtn.innerHTML);
    return true;
  } catch (error) {
    console.error('❌ Manuel image butonu ekleme hatası:', error);
    return false;
  }
}

// Manuel ses kaydı butonu ekle
function addManualAudioButton(toolbar) {
  try {
    // Link butonunu bul (referans olarak)
    const linkBtn = toolbar.querySelector('[data-type="link"]');
    if (!linkBtn) {
      console.log('⚠️ Link butonu bulunamadı, ses kaydı butonu eklenemedi');
      return false;
    }
    
    // Yeni ses kaydı butonu oluştur
    const audioBtn = document.createElement('button');
    audioBtn.type = 'button';
    audioBtn.innerHTML = '🎤';
    audioBtn.className = linkBtn.className;
    audioBtn.setAttribute('data-type', 'audio-record');
    audioBtn.setAttribute('title', 'Ses Kaydı');
    audioBtn.style.cssText = linkBtn.style.cssText;
    audioBtn.style.marginLeft = '4px';
    audioBtn.style.display = 'inline-block';
    audioBtn.style.visibility = 'visible';
    audioBtn.style.opacity = '1';
    audioBtn.style.fontSize = '16px';
    audioBtn.style.lineHeight = '1';
    audioBtn.style.padding = '6px 8px';
    audioBtn.style.minWidth = '32px';
    audioBtn.style.textAlign = 'center';
    
    // Link butonundan sonra ekle
    linkBtn.parentNode.insertBefore(audioBtn, linkBtn.nextSibling);
    
    // Event listener ekle
    audioBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('🎤 Ses kaydı başlatılıyor...');
      
      const note = notePanelCurrentNoteId ? window.notes.find(n => n.id === notePanelCurrentNoteId) : null;
      
      if (!note || !note.id) {
        if (window.showNotification) {
          window.showNotification('Önce notu kaydedin!', 'error');
        }
        return false;
      }
      
      showAudioRecordingModal(note);
      return false;
    }, true);
    
    // Simgeyi güçlendir
    if (!audioBtn.innerHTML || audioBtn.innerHTML.trim() === '' || !audioBtn.innerHTML.includes('🎤')) {
      audioBtn.innerHTML = '🎤';
    }
    
    console.log('✅ Manuel ses kaydı butonu eklendi:', audioBtn.innerHTML);
    return true;
  } catch (error) {
    console.error('❌ Manuel ses kaydı butonu ekleme hatası:', error);
    return false;
  }
}

// Custom image butonu ekle
function setupCustomImageButton() {
  try {
    const toolbar = document.querySelector('#notePanelEditor .vditor-toolbar');
    if (!toolbar) {
      console.log('⚠️ Toolbar bulunamadı (image)');
      return false;
    }
    
    // Farklı selector'ları dene
    let imageBtn = toolbar.querySelector('[data-type="image"]');
    if (!imageBtn) {
      // Title'a göre bul
      const allButtons = toolbar.querySelectorAll('button');
      imageBtn = Array.from(allButtons).find(btn => {
        const title = btn.getAttribute('title') || '';
        return title.toLowerCase().includes('image') || title.toLowerCase().includes('resim');
      });
    }
    
    if (!imageBtn) {
      console.log('⚠️ Image butonu bulunamadı');
      return false;
    }
    
    // Vditor'un tüm event listener'larını kaldırmak için yeni buton oluştur
    const newImageBtn = imageBtn.cloneNode(true);
    
    // Tüm mevcut event listener'ları temizle
    const newImageBtnClean = document.createElement('button');
    newImageBtnClean.type = 'button';
    newImageBtnClean.className = newImageBtn.className;
    newImageBtnClean.innerHTML = newImageBtn.innerHTML;
    newImageBtnClean.setAttribute('data-type', 'image');
    newImageBtnClean.setAttribute('title', newImageBtn.getAttribute('title') || 'Resim');
    newImageBtnClean.style.cssText = newImageBtn.style.cssText;
    
    // Eski butonu yeni butonla değiştir
    imageBtn.parentNode.replaceChild(newImageBtnClean, imageBtn);
    
    // Custom handler marker ekle
    newImageBtnClean.setAttribute('data-custom-handler', 'true');
    
    // Yeni click event'i ekle - Dosya seçici aç
    newImageBtnClean.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('🖼️ Custom image seçici açılıyor...');
      
      // Not bilgisini kontrol et
      const note = notePanelCurrentNoteId ? window.notes.find(n => n.id === notePanelCurrentNoteId) : null;
      
      if (!note || !note.id) {
        if (window.showNotification) {
          window.showNotification('Önce notu kaydedin!', 'error');
        }
        return false;
      }
      
      // Dosya seçici oluştur
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = false;
      
      fileInput.onchange = async (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
          console.log('📤 Resim seçildi:', files[0].name);
          
          // Vditor upload handler'ını kullan
          try {
            const result = await handleVditorUpload(files, note);
            const parsed = JSON.parse(result);
            
            if (parsed && parsed.length > 0 && parsed[0].url) {
              // Vditor'a markdown içeriğini ekle
              if (notePanelEditor) {
                const current = notePanelEditor.getValue();
                // URL zaten HTML img tag formatında olabilir
                // Önce newline ekle (ses ile karışmaması için)
                const newlinePrefix = current.trim().length > 0 && !current.endsWith('\n\n') ? '\n\n' : '';
                const imageContent = newlinePrefix + parsed[0].url + '\n\n';
                notePanelEditor.setValue(current + imageContent);
                console.log('✅ Resim eklendi:', parsed[0].url);
                
                // Vditor'un resmi render etmesi için tetikle
                setTimeout(() => {
                  if (notePanelEditor && typeof notePanelEditor.vditor === 'object') {
                    const wysiwyg = document.querySelector('#notePanelEditor .vditor-wysiwyg');
                    if (wysiwyg) {
                      // Force render
                      const event = new Event('input', { bubbles: true });
                      wysiwyg.dispatchEvent(event);
                    }
                  }
                }, 100);
              }
            }
          } catch (error) {
            console.error('❌ Resim yükleme hatası:', error);
            if (window.showNotification) {
              window.showNotification('Resim yükleme hatası: ' + error.message, 'error');
            }
          }
        }
      };
      
      fileInput.click();
      
      return false;
    }, true);
    
    // Görünürlük stillerini ayarla
    newImageBtnClean.style.display = 'inline-block';
    newImageBtnClean.style.visibility = 'visible';
    newImageBtnClean.style.fontSize = '16px';
    newImageBtnClean.style.lineHeight = '1';
    newImageBtnClean.style.minWidth = '32px';
    newImageBtnClean.style.textAlign = 'center';
    
    // Simge boşsa emoji ekle
    if (!newImageBtnClean.innerHTML || newImageBtnClean.innerHTML.trim() === '' || !newImageBtnClean.innerHTML.includes('🖼️')) {
      if (!newImageBtnClean.querySelector('svg')) {
        newImageBtnClean.innerHTML = '🖼️';
      }
    }
    
    // Image butonu için periyodik kontrol ekle
    if (!window.imageButtonChecker) {
      window.imageButtonChecker = setInterval(() => {
        const btn = toolbar.querySelector('[data-type="image"][data-custom-handler="true"]');
        if (btn) {
          btn.style.display = 'inline-block';
          btn.style.visibility = 'visible';
          btn.style.fontSize = '16px';
          // Simge boşsa emoji ekle
          if (!btn.innerHTML || btn.innerHTML.trim() === '' || !btn.innerHTML.includes('🖼️')) {
            if (!btn.querySelector('svg')) {
              btn.innerHTML = '🖼️';
            }
          }
        }
      }, 1000);
    }
    
    console.log('✅ Custom image butonu eklendi ve override edildi');
    return true;
  } catch (error) {
    console.error('❌ Image butonu ekleme hatası:', error);
    return false;
  }
}

function openLinkInsertModal(selectedText = '') {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div id="linkInsertModal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10003;display:flex;align-items:center;justify-content:center">
      <div style="background:var(--noteditor-panel);border:1px solid var(--noteditor-border);border-radius:12px;padding:20px;min-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.5)">
        <h3 style="margin:0 0 12px 0;color:var(--noteditor-text);font-size:16px;font-weight:600">🔗 Bağlantı Ekle</h3>
        <label style="display:block;color:var(--noteditor-text);font-size:13px;margin-bottom:4px">Görünen Metin</label>
        <input id="linkTextIn" value="${selectedText}" style="width:100%;margin-bottom:12px;padding:10px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);font-size:14px">
        <label style="display:block;color:var(--noteditor-text);font-size:13px;margin-bottom:4px">URL</label>
        <input id="linkHrefIn" placeholder="https://..." style="width:100%;margin-bottom:16px;padding:10px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);font-size:14px">
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="linkCancel" style="padding:8px 14px;background:rgba(255,255,255,.06);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);cursor:pointer">İptal</button>
          <button id="linkOk" style="padding:8px 14px;background:linear-gradient(135deg,var(--noteditor-accent),var(--noteditor-accent2));border:none;border-radius:6px;color:#0a0d12;font-weight:600;cursor:pointer">Ekle</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  
  const cancel = modal.querySelector('#linkCancel');
  const ok = modal.querySelector('#linkOk');
  const textIn = modal.querySelector('#linkTextIn');
  const hrefIn = modal.querySelector('#linkHrefIn');
  
  const close = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  };
  
  cancel.onclick = close;
  modal.addEventListener('click', (e) => { 
    if (e.target.id === 'linkInsertModal') close(); 
  });
  
  ok.onclick = () => {
    const text = (textIn.value || '').trim();
    const href = (hrefIn.value || '').trim();
    
    if (!href) {
      hrefIn.focus();
      hrefIn.style.borderColor = '#ef4444';
      return;
    }
    
    try {
      const safeHref = href.match(/^https?:\/\//i) ? href : ('https://' + href);
      const mdLink = text ? `[${text}](${safeHref})` : `<${safeHref}>`;
      
      // Vditor'a link ekle
      if (notePanelEditor) {
        const current = notePanelEditor.getValue();
        const newContent = current + '\n' + mdLink + '\n';
        notePanelEditor.setValue(newContent);
      }
      
      close();
    } catch (err) {
      console.error('❌ Link ekleme hatası:', err);
    }
  };
  
  textIn.focus();
  
  hrefIn.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') ok.click();
  });
}

// Vditor dosya yükleme handler'ı
async function handleVditorUpload(files, note) {
  if (!files || files.length === 0) {
    console.error('❌ Dosya yok');
    return Promise.resolve('[]');
  }
  
  if (!note || !note.id) {
    console.error('❌ Not bilgisi yok, önce notu kaydedin');
    if (window.showNotification) {
      window.showNotification('Önce notu kaydedin!', 'error');
    }
    return Promise.resolve('[]');
  }
  
  // Electron kontrolü
  if (typeof require === 'undefined') {
    console.error('❌ Electron ortamı yok');
    return Promise.resolve('[]');
  }
  
  const { ipcRenderer } = require('electron');
  
  // Her dosya için yükleme işlemi
  const uploadPromises = Array.from(files).map(file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const fileData = e.target.result;
        const fileName = file.name;
        const fileType = file.type;
        
        // Dosya türünü belirle
        const isImage = fileType.startsWith('image/');
        const isAudio = fileType.startsWith('audio/');
        
        if (!isImage && !isAudio) {
          console.error('❌ Desteklenmeyen dosya türü:', fileType);
          reject(new Error('Desteklenmeyen dosya türü'));
          return;
        }
        
        // Base64'ten buffer'a çevir
        const base64Data = fileData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // IPC ile dosyayı kaydet
        ipcRenderer.invoke('save-uploaded-file', {
          noteId: note.id,
          fileName: fileName,
          fileData: buffer,
          fileType: fileType,
          isImage: isImage,
          isAudio: isAudio
        }).then(result => {
          if (result.success) {
            console.log('✅ Dosya kaydedildi:', result.filePath);
            // Relative path'i döndür (Markdown için)
            const relativePath = result.relativePath || result.fileName;
            
            if (isImage) {
              // Resim için file:// URL ile Markdown formatı (Electron'da çalışır)
              const fullPath = result.filePath;
              let normalizedPath = fullPath.replace(/\\/g, '/');
              let fileUrl;
              if (normalizedPath.match(/^[A-Za-z]:\//)) {
                // Windows absolute path
                fileUrl = `file:///${normalizedPath}`;
              } else {
                // Unix path
                fileUrl = `file://${normalizedPath}`;
              }
              
              // Markdown formatı kullan (Vditor WYSIWYG render eder)
              resolve(`![${fileName}](${fileUrl})`);
            } else {
              // Ses için full path'ten direkt HTML audio tag oluştur
              const fullPath = result.filePath;
              let normalizedPath = fullPath.replace(/\\/g, '/');
              let fileUrl;
              if (normalizedPath.match(/^[A-Za-z]:\//)) {
                // Windows absolute path (C:/path/to/file)
                fileUrl = `file:///${normalizedPath}`;
              } else {
                // Unix path
                fileUrl = `file://${normalizedPath}`;
              }
              
              // HTML audio tag'i oluştur (WYSIWYG editörde oynatılabilir)
              resolve(`<audio controls><source src="${fileUrl}" type="${fileType}">Tarayıcınız ses oynatmayı desteklemiyor.</audio>`);
            }
          } else {
            console.error('❌ Dosya kaydedilemedi:', result.error);
            reject(new Error(result.error || 'Dosya kaydedilemedi'));
          }
        }).catch(error => {
          console.error('❌ IPC hatası:', error);
          reject(error);
        });
      };
      
      reader.onerror = () => {
        reject(new Error('Dosya okunamadı'));
      };
      
      reader.readAsDataURL(file);
    });
  });
  
  try {
    const results = await Promise.all(uploadPromises);
    // Vditor formatına uygun şekilde döndür (her bir sonuç zaten markdown link formatında)
    // Vditor bekliyor: [{ url: "markdown content" }]
    const formattedResults = results.map(markdownLink => ({ url: markdownLink }));
    console.log('✅ Upload tamamlandı:', formattedResults);
    return Promise.resolve(JSON.stringify(formattedResults));
  } catch (error) {
    console.error('❌ Upload hatası:', error);
    if (window.showNotification) {
      window.showNotification('Dosya yükleme hatası: ' + error.message, 'error');
    }
    return Promise.resolve('[]');
  }
}

// Ses kaydı butonu ekle
function setupAudioRecordingButton() {
  try {
    const toolbar = document.querySelector('#notePanelEditor .vditor-toolbar');
    if (!toolbar) {
      console.log('⚠️ Toolbar bulunamadı (audio)');
      return false;
    }
    
    // Vditor'un kendi upload butonunu tamamen kaldır (DOM'dan sil)
    const vditorUploadBtns = toolbar.querySelectorAll('[data-type="upload"], button[title*="Upload" i], button[title*="upload" i], button[aria-label*="upload" i], button[aria-label*="Upload"]');
    vditorUploadBtns.forEach(btn => {
      // Önce tamamen gizle
      btn.style.display = 'none';
      btn.style.visibility = 'hidden';
      btn.style.opacity = '0';
      btn.style.width = '0';
      btn.style.height = '0';
      btn.style.padding = '0';
      btn.style.margin = '0';
      btn.style.position = 'absolute';
      btn.style.left = '-9999px';
      btn.setAttribute('data-hidden', 'true');
      // DOM'dan tamamen kaldır
      try {
        if (btn.parentNode) {
          btn.parentNode.removeChild(btn);
        }
      } catch (e) {
        // Ignore remove errors
      }
      console.log('📤 Vditor upload butonu kaldırıldı:', btn.getAttribute('title') || btn.getAttribute('aria-label') || 'no title');
    });
    
    // Sürekli kontrol için hızlı interval (100ms) - DOM'dan tamamen kaldır
    if (!window.vditorUploadHiderLocal) {
      window.vditorUploadHiderLocal = setInterval(() => {
        const uploadBtns = toolbar.querySelectorAll('[data-type="upload"], button[title*="Upload" i], button[title*="upload" i], button[aria-label*="upload" i]');
        uploadBtns.forEach(btn => {
          if (!btn.hasAttribute('data-hidden')) {
            btn.style.display = 'none';
            btn.style.visibility = 'hidden';
            btn.style.opacity = '0';
            btn.style.position = 'absolute';
            btn.style.left = '-9999px';
            btn.setAttribute('data-hidden', 'true');
            // DOM'dan tamamen kaldır
            try {
              if (btn.parentNode) {
                btn.parentNode.removeChild(btn);
              }
            } catch (e) {
              // Ignore errors
            }
          }
        });
      }, 100);
    }
    
    // Mevcut ses kaydı butonunu kontrol et
    let audioBtn = toolbar.querySelector('[data-type="audio-record"]');
    
    if (!audioBtn) {
      // Image butonundan veya link butonundan sonra yeni buton oluştur
      let imageBtn = toolbar.querySelector('[data-type="image"][data-custom-handler="true"]');
      if (!imageBtn) {
        // Link butonunu bul
        const linkBtn = toolbar.querySelector('[data-type="link"]');
        if (linkBtn) {
          // Link butonundan sonra ses kaydı butonunu ekle
          imageBtn = linkBtn; // Referans olarak kullan
        } else {
          console.log('⚠️ Image veya link butonu bulunamadı, ses kaydı butonu eklenemedi');
          return false;
        }
      }
      
      // Yeni buton oluştur
      audioBtn = document.createElement('button');
      audioBtn.type = 'button';
      audioBtn.innerHTML = '🎤';
      audioBtn.setAttribute('title', 'Ses Kaydı');
      audioBtn.setAttribute('data-type', 'audio-record');
      audioBtn.className = imageBtn.className; // Vditor stilini koru
      audioBtn.style.cssText = imageBtn.style.cssText; // Tüm stilleri kopyala
      audioBtn.style.marginLeft = '4px';
      audioBtn.style.display = 'inline-block';
      audioBtn.style.visibility = 'visible';
      audioBtn.style.opacity = '1';
      audioBtn.style.fontSize = '16px';
      audioBtn.style.lineHeight = '1';
      audioBtn.style.padding = '6px 8px';
      audioBtn.style.minWidth = '32px';
      audioBtn.style.textAlign = 'center';
      
      // Image butonundan sonra ekle
      imageBtn.parentNode.insertBefore(audioBtn, imageBtn.nextSibling);
      
      // Event listener'ı ekle
      audioBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        console.log('🎤 Ses kaydı başlatılıyor...');
        
        // Not bilgisini al
        const note = notePanelCurrentNoteId ? window.notes.find(n => n.id === notePanelCurrentNoteId) : null;
        
        if (!note || !note.id) {
          if (window.showNotification) {
            window.showNotification('Önce notu kaydedin!', 'error');
          }
          return false;
        }
        
        // Ses kaydı modalını aç
        showAudioRecordingModal(note);
        
        return false;
      }, true);
      
      console.log('✅ Ses kaydı butonu eklendi');
    } else {
      // Mevcut butonun görünür olduğundan emin ol
      audioBtn.style.display = 'inline-block';
      audioBtn.style.visibility = 'visible';
      audioBtn.style.opacity = '1';
      console.log('✅ Ses kaydı butonu zaten var, görünürlük ayarlandı');
    }
    
    // Toolbar değişikliklerini izle (Vditor yeniden render ederse tekrar ekle)
    // Önceki observer'ı temizle
    if (audioButtonObserver) {
      audioButtonObserver.disconnect();
    }
    
    audioButtonObserver = new MutationObserver((mutations) => {
      const existingBtn = toolbar.querySelector('[data-type="audio-record"]');
      if (existingBtn) {
        // Buton var, görünürlüğünü kontrol et ve düzelt
        if (existingBtn.style.display === 'none' || existingBtn.innerHTML !== '🎤') {
          existingBtn.style.display = 'inline-block';
          existingBtn.style.visibility = 'visible';
          existingBtn.style.opacity = '1';
          existingBtn.style.fontSize = '16px';
          existingBtn.innerHTML = '🎤';
        }
      } else {
        // Buton yok, tekrar ekle
        // Önce observer'ı durdur (recursive çağrıyı önle)
        audioButtonObserver.disconnect();
        setTimeout(() => {
          setupAudioRecordingButton();
        }, 200);
      }
      
      // Vditor upload butonlarını sürekli kontrol et ve gizle
      const uploadBtns = toolbar.querySelectorAll('[data-type="upload"], button[title*="Upload"], button[title*="upload"]');
      uploadBtns.forEach(btn => {
        if (btn.style.display !== 'none') {
          btn.style.display = 'none';
          btn.style.visibility = 'hidden';
          btn.style.opacity = '0';
        }
      });
    });
    
    audioButtonObserver.observe(toolbar, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-type', 'innerHTML']
    });
    
    // Periyodik kontrol ekle (backup)
    if (!window.audioButtonChecker) {
      window.audioButtonChecker = setInterval(() => {
        const btn = toolbar.querySelector('[data-type="audio-record"]');
        if (btn) {
          btn.style.display = 'inline-block';
          btn.style.visibility = 'visible';
          btn.style.fontSize = '16px';
          if (btn.innerHTML !== '🎤') {
            btn.innerHTML = '🎤';
          }
        }
      }, 1000);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ses kaydı butonu ekleme hatası:', error);
    return false;
  }
}

// Ses kaydı modalı - BASİT VERSİYON
function showAudioRecordingModal(note) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div id="audioRecordModal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10003;display:flex;align-items:center;justify-content:center">
      <div style="background:var(--noteditor-panel);border:1px solid var(--noteditor-border);border-radius:12px;padding:24px;min-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.5)">
        <h3 style="margin:0 0 16px 0;color:var(--noteditor-text);font-size:18px;font-weight:600">🎤 Ses Kaydı</h3>
        <div id="audioRecordTime" style="margin-bottom:16px;color:var(--noteditor-accent);font-size:20px;font-weight:600;text-align:center">00:00</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:16px">
          <button id="audioRecordToggle" style="padding:12px 24px;background:linear-gradient(135deg,var(--noteditor-accent),var(--noteditor-accent2));border:none;border-radius:8px;color:#0a0d12;cursor:pointer;font-size:14px;font-weight:600">🔴 Kayıt Başlat</button>
        </div>
        <div id="audioRecordPlayerSection" style="margin-bottom:16px;display:none">
          <div style="margin-bottom:8px;color:var(--noteditor-text);font-size:12px;opacity:0.7">Kaydı dinle:</div>
          <audio id="audioRecordPlayer" controls style="width:100%;max-height:40px"></audio>
        </div>
        <div id="audioRecordNameSection" style="margin-bottom:16px;display:none">
          <input type="text" id="audioRecordName" placeholder="Dosya adı (isteğe bağlı)" style="width:100%;padding:10px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);font-size:14px">
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="audioRecordCancel" style="padding:10px 20px;background:rgba(255,255,255,.05);border:1px solid var(--noteditor-border);border-radius:6px;color:var(--noteditor-text);cursor:pointer;font-size:14px">İptal</button>
          <button id="audioRecordSave" style="padding:10px 20px;background:linear-gradient(135deg,var(--noteditor-accent),var(--noteditor-accent2));border:none;border-radius:6px;color:#0a0d12;cursor:pointer;font-size:14px;font-weight:600;display:none">💾 Kaydet</button>
        </div>
      </div>
    </div>`;
  
  document.body.appendChild(modal);
  
  let mediaRecorder = null;
  let audioChunks = [];
  let audioBlob = null;
  let recordingTimer = null;
  let recordingSeconds = 0;
  let isRecording = false;
  let audioStream = null;
  
  const timeDiv = document.getElementById('audioRecordTime');
  const toggleBtn = document.getElementById('audioRecordToggle');
  const saveBtn = document.getElementById('audioRecordSave');
  const cancelBtn = document.getElementById('audioRecordCancel');
  const nameSection = document.getElementById('audioRecordNameSection');
  const nameInput = document.getElementById('audioRecordName');
  const playerSection = document.getElementById('audioRecordPlayerSection');
  const audioPlayer = document.getElementById('audioRecordPlayer');
  
  let audioBlobUrl = null; // Blob URL'ini sakla
  
  // Audio player'ı göster ve blob URL'i ayarla
  const showAudioPlayer = () => {
    if (audioBlob && audioPlayer) {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl); // Önceki URL'i temizle
      }
      audioBlobUrl = URL.createObjectURL(audioBlob);
      audioPlayer.src = audioBlobUrl;
      playerSection.style.display = 'block';
    }
  };
  
  const close = () => {
    // Blob URL'ini temizle
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      audioBlobUrl = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recordingTimer) {
      clearInterval(recordingTimer);
    }
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  };
  
  cancelBtn.onclick = close;
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'audioRecordModal') close();
  });
  
  // Mikrofon erişimi
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      audioStream = stream;
      
      toggleBtn.onclick = () => {
        if (!isRecording) {
          // Kayıt başlat
          audioChunks = [];
          recordingSeconds = 0;
          timeDiv.textContent = '00:00';
          
          mediaRecorder = new MediaRecorder(stream);
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            isRecording = false;
            toggleBtn.textContent = '🔴 Kayıt Başlat';
            toggleBtn.style.background = 'linear-gradient(135deg,var(--noteditor-accent),var(--noteditor-accent2))';
            nameSection.style.display = 'block';
            saveBtn.style.display = 'inline-block';
            
            // Audio player'ı göster (dinleme için)
            showAudioPlayer();
          };
          
          mediaRecorder.start();
          isRecording = true;
          toggleBtn.textContent = '⏹️ Kayıt Durdur';
          toggleBtn.style.background = 'rgba(239,68,68,.2)';
          toggleBtn.style.color = '#ef4444';
          
          // Timer başlat
          recordingTimer = setInterval(() => {
            recordingSeconds++;
            const minutes = Math.floor(recordingSeconds / 60);
            const seconds = recordingSeconds % 60;
            timeDiv.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          }, 1000);
        } else {
          // Kayıt durdur
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
          if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
          }
        }
      };
      
      saveBtn.onclick = async () => {
        if (!audioBlob) return;
        
        saveBtn.disabled = true;
        
        try {
          if (typeof require === 'undefined') {
            throw new Error('Electron ortamı yok');
          }
          
          const { ipcRenderer } = require('electron');
          
          // Dosya adı oluştur
          const fileName = nameInput.value.trim() || `ses_kaydi_${Date.now()}.webm`;
          const finalFileName = fileName.endsWith('.webm') ? fileName : `${fileName}.webm`;
          
          // Blob'u ArrayBuffer'a çevir
          const arrayBuffer = await audioBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // IPC ile dosyayı kaydet
          const result = await ipcRenderer.invoke('save-uploaded-file', {
            noteId: note.id,
            fileName: finalFileName,
            fileData: buffer,
            fileType: 'audio/webm',
            isImage: false,
            isAudio: true
          });
          
          if (result.success) {
            const fullPath = result.filePath;
            
            // Ses dosyası için HTML audio tag oluştur
            let normalizedPath = fullPath.replace(/\\/g, '/');
            let fileUrl;
            if (normalizedPath.match(/^[A-Za-z]:\//)) {
              fileUrl = `file:///${normalizedPath}`;
            } else {
              fileUrl = `file://${normalizedPath}`;
            }
            
            // HTML audio tag'i oluştur
            const audioHtml = `<audio controls><source src="${fileUrl}" type="audio/webm">Tarayıcınız ses oynatmayı desteklemiyor.</audio>`;
            
            // Vditor'a ses dosyasını ekle
            if (notePanelEditor) {
              const current = notePanelEditor.getValue();
              const audioContent = `\n\n${audioHtml}\n\n`;
              notePanelEditor.setValue(current + audioContent);
            }
            
            // Modal'ı kapat
            close();
          } else {
            throw new Error(result.error || 'Dosya kaydedilemedi');
          }
        } catch (error) {
          console.error('❌ Ses kaydı kaydetme hatası:', error);
          if (window.showAlertModal) {
            window.showAlertModal('Hata', 'Hata: ' + error.message, 'error');
          } else {
            alert('Hata: ' + error.message);
          }
          saveBtn.disabled = false;
        }
      };
    })
    .catch(error => {
      console.error('❌ Mikrofon erişim hatası:', error);
      toggleBtn.disabled = true;
      toggleBtn.textContent = '❌ Mikrofon Erişimi Yok';
    });
}

// Global fonksiyonlar
window.openNotePanel = openNotePanel;
window.closeNotePanel = closeNotePanel;
window.saveNotePanelNote = saveCurrentNoteContent;

console.log('📝 Not Panel Sistemi yüklendi');