// ===== CKEDITOR NOTE PANEL SYSTEM =====
// Not düzenleme paneli - CKEditor 5 entegrasyonu

// Panel state
let notePanelCurrentNoteId = null;
let notePanelEditor = null; // CKEditor 5 instance

// Autocomplete state
let wikilinkAutocomplete = null;
let selectedAutocompleteIndex = -1;

function openNotePanel(noteId = null) {
  // Popup'ı gizle - not paneli açılırken
  if (window.hideTitlePopup) window.hideTitlePopup();
  
  const notePanelOverlay = document.getElementById('notePanelOverlay');
  const notePanelTitleInput = document.getElementById('notePanelTitleInput');
  const notePanelEditorElement = document.getElementById('notePanelEditor');
  
  if (notePanelOverlay && notePanelTitleInput && notePanelEditorElement) {
    // Eski event listener'ları temizle
    notePanelTitleInput.removeEventListener('input', window.currentTitleInputHandler);
    if (window.currentEditorChangeHandler) {
      // CKEditor event'lerini temizle
      if (notePanelEditor && notePanelEditor.model) {
        notePanelEditor.model.document.off('change:data', window.currentEditorChangeHandler);
      }
    }
    
    // Doğrudan geçilen noteId'yi kullan, yoksa selectedNote'u kullan
    // Eğer noteId null ise yeni not modu
    const targetNoteId = noteId !== null ? (noteId || window.selectedNote) : null;
    console.log('🎯 Target noteId:', targetNoteId);
    
    // Not panelini göster
    notePanelOverlay.classList.add('active');
    
    // CKEditor 5'i başlat (eğer henüz başlatılmamışsa)
    if (!notePanelEditor) {
      console.log('🚀 CKEditor başlatılıyor...');
      ClassicEditor
        .create(notePanelEditorElement, {
          toolbar: {
            items: [
              'undo', 'redo', '|',
              'heading', '|',
              'bold', 'italic', 'underline', 'strikethrough', '|',
              'fontSize', 'fontColor', 'fontBackgroundColor', '|',
              'bulletedList', 'numberedList', '|',
              'blockQuote', 'codeBlock', '|',
              'link', '|',
              'alignment', '|',
              'indent', 'outdent', '|',
              'insertTable', '|',
              'specialCharacters', '|',
              'removeFormat'
            ]
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraf', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Başlık 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Başlık 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Başlık 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Başlık 4', class: 'ck-heading_heading4' }
            ]
          },
          link: {
            addTargetToExternalLinks: true,
            decorators: [
              {
                mode: 'manual',
                label: 'Open in a new tab',
                attributes: {
                  target: '_blank',
                  rel: 'noopener noreferrer'
                }
              }
            ]
          },
          placeholder: 'Notunuzu buraya yazın...',
          language: 'tr',
          htmlSupport: {
            allow: [
              {
                name: 'span',
                attributes: true,
                classes: true,
                styles: true
              },
              {
                name: 'hr',
                attributes: true,
                classes: true,
                styles: true
              }
            ]
          },
          // HR elementi için converter ekle
          extraPlugins: [
            function(editor) {
              // HR elementi için schema kaydı
              editor.model.schema.register('hr', {
                allowWhere: '$block',
                isBlock: true,
                isObject: true,
                allowAttributes: []
              });
              
              // Model'den View'e converter (downcast)
              editor.conversion.for('downcast').elementToElement({
                model: 'hr',
                view: {
                  name: 'hr',
                  classes: ['custom-hr']
                }
              });
              
              // View'den Model'e converter (upcast)
              editor.conversion.for('upcast').elementToElement({
                view: 'hr',
                model: 'hr'
              });
            }
          ],
          // HTML entity encoding'ini devre dışı bırak
          entities: false,
          entities_latin: false,
          basicEntities: false,
          entities_greek: false,
          entities_processNumerical: false
        })
        .then(editor => {
          notePanelEditor = editor;
          
          // CKEditor'ın getData() fonksiyonunu override et - HTML entity'leri decode et
          const originalGetData = editor.getData.bind(editor);
          editor.getData = function() {
            const data = originalGetData();
            return window.decodeHtmlEntities ? window.decodeHtmlEntities(data) : data;
          };
          
          console.log('📝 Editor instance:', editor);
          
          // Enter tuşu davranışını düzelt - başlık formatından çıkma
          editor.model.document.on('change:data', () => {
            const selection = editor.model.document.selection;
            const selectedElement = selection.getSelectedElement();
            
            // Eğer HR elementinden sonra başlık formatındaysa, normal paragrafa çevir
            if (selectedElement && selectedElement.name === 'paragraph') {
              const position = selection.getFirstPosition();
              
              // Güvenli getSibling kontrolü
              let previousElement = null;
              if (position && typeof position.getSibling === 'function') {
                previousElement = position.getSibling(-1);
              }
              
              // Eğer önceki element HR ise ve mevcut element başlık formatındaysa
              if (previousElement && previousElement.name === 'horizontalRule') {
                const headingCommand = editor.commands.get('heading');
                if (headingCommand && headingCommand.value) {
                  // Başlık formatını temizle - CKEditor 5 güvenli yöntem
                  try {
                    headingCommand.execute();
                  } catch (error) {
                    // Alternatif yöntem: paragraph command kullan
                    const paragraphCommand = editor.commands.get('paragraph');
                    if (paragraphCommand) {
                      paragraphCommand.execute();
                    }
                  }
                }
              }
            }
          });
          
          // Enter tuşu özel davranışı - HR sonrası başlık formatını temizle
          editor.editing.view.document.on('keydown', (evt, data) => {
            if (data.keyCode === 13) { // Enter tuşu
              const selection = editor.model.document.selection;
              const position = selection.getFirstPosition();
              
              // Güvenli getSibling kontrolü
              let previousElement = null;
              if (position && typeof position.getSibling === 'function') {
                previousElement = position.getSibling(-1);
              }
              
              // Eğer önceki element HR ise
              if (previousElement && previousElement.name === 'horizontalRule') {
                // Başlık formatını temizle
                const headingCommand = editor.commands.get('heading');
                if (headingCommand && headingCommand.value) {
                  setTimeout(() => {
                    try {
                      headingCommand.execute();
                    } catch (error) {
                      const paragraphCommand = editor.commands.get('paragraph');
                      if (paragraphCommand) {
                        paragraphCommand.execute();
                      }
                    }
                  }, 10);
                }
              }
              
              // HR sonrası herhangi bir yerde başlık formatından çıkma
              const content = editor.getData();
              if (content.includes('<hr class="custom-hr">')) {
                // HR sonrası başlık formatından çıkma - sadece Enter tuşu ile
                setTimeout(() => {
                  const headingCommand = editor.commands.get('heading');
                  if (headingCommand && headingCommand.value) {
                    try {
                      headingCommand.execute();
                    } catch (error) {
                      const paragraphCommand = editor.commands.get('paragraph');
                      if (paragraphCommand) {
                        paragraphCommand.execute();
                      }
                    }
                  }
                }, 10);
              }
            }
          });
          
          // CKEditor editable alanını kontrol et
          const editableElement = editor.ui.getEditableElement();
          console.log('📄 Editable element:', editableElement);
          console.log('🎯 Editable element visible:', editableElement ? editableElement.offsetParent !== null : false);
          console.log('📝 Contenteditable:', editableElement ? editableElement.contentEditable : 'N/A');
          
          // CKEditor text color'ını manuel olarak ayarla
          if (editableElement) {
            editableElement.style.color = '#e9eef5';
            editableElement.style.opacity = '1';
            editableElement.style.visibility = 'visible';
            console.log('🎨 CKEditor text color ayarlandı');
            
            // Tüm child elementlerin color'ını da ayarla
            const allElements = editableElement.querySelectorAll('*');
            allElements.forEach(el => {
              el.style.color = '#e9eef5';
              el.style.opacity = '1';
            });
            console.log('🎨 CKEditor child elements color ayarlandı');
          }
          
          // Tablo CSS'ini dinamik olarak ekle
          if (window.addTableStyles) window.addTableStyles();
          
          // Tablo oluşturulduğunda CSS'i yeniden uygula
          editor.model.document.on('change:data', () => {
            setTimeout(() => {
              if (window.addTableStyles) window.addTableStyles();
            }, 100);
          });
          
          // CKEditor toolbar'ını kontrol et
          let toolbarElement = editor.ui.getEditableElement().parentElement.querySelector('.ck-toolbar');
          
          // Eğer bulunamazsa, editor'ın kendisinden toolbar'ı al
          if (!toolbarElement) {
            toolbarElement = editor.ui.view.toolbar.element;
            console.log('🔧 Toolbar editor.ui.view.toolbar.element ile bulundu:', toolbarElement);
          }
          
          // Hala bulunamazsa, document'ten ara
          if (!toolbarElement) {
            toolbarElement = document.querySelector('.ck-toolbar');
            console.log('🔧 Toolbar document.querySelector ile bulundu:', toolbarElement);
          }
          
          console.log('🔧 Toolbar element:', toolbarElement);
          console.log('🔧 Toolbar visible:', toolbarElement ? toolbarElement.offsetParent !== null : false);
          
          // CKEditor toolbar butonları için event listener'lar ekle
          if (toolbarElement) {
            // Tüm toolbar butonlarını bul ve event listener ekle
            const toolbarButtons = toolbarElement.querySelectorAll('.ck-button, .ck-dropdown__button');
            console.log('🔧 Toolbar buttons found:', toolbarButtons.length);
            
            // Toolbar'a genel click event ekle
            toolbarElement.addEventListener('click', (e) => {
              console.log('🔧 Toolbar clicked:', e.target);
            });
            
            // Toolbar'ın pointer events'ini aktif et
            toolbarElement.style.pointerEvents = 'auto';
            
            // Özel çizgi ekleme butonu ekle
            addHRButton(editor, toolbarElement);
          }
          
          // CKEditor'a focus ver
          editor.editing.view.focus();
          console.log('🎯 CKEditor focus verildi');
          
          // CKEditor scroll'unun çalışmasını sağla
          const scrollableElement = editor.ui.getEditableElement();
          if (scrollableElement) {
            console.log('📜 CKEditor scroll desteği aktif');
            
            // Scroll'u en üste çek
            scrollableElement.scrollTop = 0;
            console.log('📜 CKEditor scroll en üste çekildi');
            
            // Cursor'u en üste taşı
            const range = editor.model.createRangeIn(editor.model.document.getRoot());
            editor.model.change(writer => {
              writer.setSelection(range);
            });
            console.log('🎯 CKEditor cursor en üste taşındı');
          }
          
          // Timeout ile tekrar focus ver
          setTimeout(() => {
            editor.editing.view.focus();
            console.log('🎯 CKEditor timeout ile focus verildi');
            
            // Toolbar butonlarını tekrar kontrol et (dinamik yükleme için)
            const toolbarElementDelayed = editor.ui.getEditableElement().parentElement.querySelector('.ck-toolbar');
            if (toolbarElementDelayed) {
              const toolbarButtonsDelayed = toolbarElementDelayed.querySelectorAll('.ck-button, .ck-dropdown__button');
              console.log('🔧 Delayed toolbar buttons found:', toolbarButtonsDelayed.length);
              
              // CKEditor butonları için basit yapılandırma
              toolbarButtonsDelayed.forEach((button, index) => {
                if (!button.hasAttribute('data-igo-configured')) {
                  button.style.pointerEvents = 'auto';
                  button.style.cursor = 'pointer';
                  button.setAttribute('data-igo-configured', 'true');
                  console.log(`🔧 Delayed button ${index + 1} configured`);
                }
              });
            }
          }, 100);
          
          // CKEditor event handlers
          setupCKEditorEvents(editor, editableElement);
          
          // Autocomplete systems
          setupAutocomplete(editor);
          
          // Blockquote sistemi
          setupBlockquoteSystem(editor);
          
          // Keyboard shortcuts
          setupKeyboardShortcuts(editor);
          
          // Wikilink ve Tag highlighting
          setupHighlighting(editor);
          
          // Mevcut not verilerini yükle
          loadNoteData(editor, targetNoteId);
        })
        .catch(error => {
          console.error('CKEditor 5 başlatılamadı:', error);
        });
    } else {
      // CKEditor zaten var, sadece verileri yükle
      notePanelOverlay.classList.add('active');
      
      if (targetNoteId) {
        const note = window.notes.find(n => n.id === targetNoteId);
        if (note) {
          notePanelCurrentNoteId = targetNoteId;
          notePanelTitleInput.value = note.title === 'Başlıksız Not' ? '' : note.title;
          // TXT ve MD dosyalarından gelen satır sonlarını HTML'e çevir
          let textToLoad = note.text;
          if (note.fileName && (note.fileName.endsWith('.txt') || note.fileName.endsWith('.md'))) {
            textToLoad = textToLoad.replace(/\n/g, '<br>');
          }
          notePanelEditor.setData(textToLoad);
          updateNotePanelStats(note.text);
        }
      } else {
        notePanelCurrentNoteId = null;
        notePanelTitleInput.value = '';
        notePanelEditor.setData('');
        updateNotePanelStats('');
      }
      
      updateNotePanelStats(notePanelEditor.getData());
      
      // CKEditor'a focus ver ve toolbar butonlarını kontrol et
      setTimeout(() => {
        notePanelEditor.editing.view.focus();
        console.log('🎯 Mevcut CKEditor focus verildi');
        
        // Mevcut CKEditor toolbar butonlarını kontrol et
        const existingToolbarElement = notePanelEditor.ui.getEditableElement().parentElement.querySelector('.ck-toolbar');
        if (existingToolbarElement) {
          const existingToolbarButtons = existingToolbarElement.querySelectorAll('.ck-button, .ck-dropdown__button');
          console.log('🔧 Existing toolbar buttons found:', existingToolbarButtons.length);
          
          existingToolbarButtons.forEach((button, index) => {
            if (!button.hasAttribute('data-igo-configured')) {
              button.style.pointerEvents = 'auto';
              button.style.cursor = 'pointer';
              button.setAttribute('data-igo-configured', 'true');
              console.log(`🔧 Existing button ${index + 1} configured`);
            }
          });
          
          // Toolbar'ın pointer events'ini aktif et
          existingToolbarElement.style.pointerEvents = 'auto';
        }
      }, 100);
    }
    
    // ESC tuşu ile kapatma
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && notePanelOverlay.classList.contains('active')) {
        closeNotePanel();
        document.removeEventListener('keydown', escHandler);
      }
    });
    
    // Ctrl+S ile kaydetme
    document.addEventListener('keydown', function saveHandler(e) {
      if (e.ctrlKey && e.key === 's' && notePanelOverlay.classList.contains('active')) {
        e.preventDefault();
        saveNotePanelNote();
        document.removeEventListener('keydown', saveHandler);
      }
    });
    
  } else {
    console.error('Not Paneli elementleri bulunamadı!');
  }
}

function closeNotePanel() {
  const notePanelOverlay = document.getElementById('notePanelOverlay');
  const notePanelTitleInput = document.getElementById('notePanelTitleInput');
  
  if (notePanelOverlay) {
    notePanelOverlay.classList.remove('active');
    
    // CKEditor varsa temizle
    if (notePanelEditor) {
      notePanelEditor.destroy();
      notePanelEditor = null;
    }
    
    // Input'ları temizle
    if (notePanelTitleInput) {
      notePanelTitleInput.value = '';
    }
    
    notePanelCurrentNoteId = null;
  }
}

function saveNotePanelNote() {
  const notePanelTitleInput = document.getElementById('notePanelTitleInput');
  
  if (!notePanelTitleInput || !notePanelEditor) {
    console.error('Not Paneli input elementleri bulunamadı!');
    return;
  }
  
  const title = notePanelTitleInput.value.trim();
  let htmlContent = notePanelEditor.getData(); // Artık otomatik decode ediliyor
  
  // HTML'den Markdown'a dönüştür
  let markdownContent = window.htmlToMarkdown ? window.htmlToMarkdown(htmlContent) : htmlContent;
  
  // Etiketleri ve bağlantıları dönüştür (HTML için)
  htmlContent = htmlContent.replace(/#([a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+)(?![^<]*>)/g, '<span class="tagtok">#$1</span>');
  htmlContent = htmlContent.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink" data-link="$1">[[$1]]</span>');
  
  // Markdown için de etiketleri ve bağlantıları dönüştür
  markdownContent = markdownContent.replace(/#([a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+)/g, '#$1');
  markdownContent = markdownContent.replace(/\[\[([^\]]+)\]\]/g, '[[$1]]');
  
  // Boş içerik kontrolü - eğer başlık ve içerik boşsa not oluşturma
  if (!title && !htmlContent.trim()) {
    console.log('📝 Boş içerik, not oluşturulmuyor');
    closeNotePanel();
    return;
  }
  
  // Başlık yoksa varsayılan başlık kullan
  const finalTitle = title || 'Başlıksız Not';
  
  if (notePanelCurrentNoteId) {
    // Mevcut notu güncelle ve dönen notu al
    const updatedNote = window.updateNote ? window.updateNote(notePanelCurrentNoteId, finalTitle, htmlContent) : null;
    
    // Güncellenen notu dosyaya kaydet (markdown formatında)
    if (updatedNote) {
      updatedNote.isSaved = true;
      updatedNote.markdownContent = markdownContent; // Markdown içeriği ekle
      if (window.saveNoteToFile) window.saveNoteToFile(updatedNote);
    }
    
    // Dinamik güncellemeler
    if (window.renderTags) window.renderTags(); // Etiketler panelini güncelle
    setTimeout(() => {
      if (window.drawConnections) window.drawConnections(); // Bağlantı çizgilerini yeniden çiz
    }, 100);
  } else {
    let note;
    try {
      // Yeni not oluştur
      note = {
        id: window.generateUniqueId ? window.generateUniqueId(finalTitle, 'note') : Date.now().toString(), // Benzersiz ID
        title: finalTitle,
        text: htmlContent,
        markdownContent: markdownContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: window.parseTags ? window.parseTags(htmlContent) : [],
        links: window.parseWikilinks ? window.parseWikilinks(htmlContent) : [],
        folderId: window.pendingNoteFolderId || null, // Klasör ID'sini kullan
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        width: 280,
        height: 200,
        isSaved: false,
        fileName: null
      };
      
      // Pending folder ID'sini temizle
      if (window.pendingNoteFolderId) {
        console.log('📁 Not klasöre bağlandı:', window.pendingNoteFolderId);
        window.pendingNoteFolderId = null;
      }
      
      window.notes.unshift(note);
      if (window.saveNotes) window.saveNotes();
      
      // Anında UI güncelle - gecikme yok! (animasyonlu)
      if (window.renderNotesImmediate) window.renderNotesImmediate(); // Debounce olmadan anında render
      if (window.renderNoteList) window.renderNoteList();
      if (window.renderTags) window.renderTags();
      
    } catch (error) {
      // Hata mesajını göster
      if (window.showNotification) window.showNotification(error.message, 'error');
      console.log('❌ Not oluşturulamadı:', error.message);
      return;
    }
    
    // Yeni notu dosyaya kaydet (ilk kaydetme)
    note.isSaved = true;
    if (window.saveNoteToFile) window.saveNoteToFile(note);
    
    // Dinamik güncellemeler (animasyonsuz - zaten render edildi)
    if (window.renderTags) window.renderTags(); // Etiketler panelini güncelle
    if (window.renderFolderList) window.renderFolderList();
    if (window.selectNote) window.selectNote(note.id);
    
    // Bağlantı çizgilerini de anında güncelle
    setTimeout(() => {
      if (window.drawConnections) window.drawConnections(); // Bağlantı çizgilerini yeniden çiz
    }, 50); // Çok kısa gecikme
  }
  
  closeNotePanel();
}

function updateNotePanelStats(content) {
  const notePanelWordCount = document.getElementById('notePanelWordCount');
  const notePanelCharCount = document.getElementById('notePanelCharCount');
  
  if (notePanelWordCount && notePanelCharCount) {
    // HTML içeriğini temizle ve metin olarak al
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    const characters = textContent.length;
    
    notePanelWordCount.textContent = `${words.length} kelime`;
    notePanelCharCount.textContent = `${characters} karakter`;
  }
}

// ===== CKEditor Helper Functions =====

function addHRButton(editor, toolbarElement) {
  // Çizgi butonu oluştur - CKEditor tarzında
  const hrButton = document.createElement('button');
  hrButton.className = 'ck ck-button';
  hrButton.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16"><path d="M2 10h16" stroke="white" stroke-width="2" fill="none"/></svg>';
  hrButton.title = 'Yatay çizgi ekle';
  hrButton.style.cssText = `
    background: transparent;
    border: 1px solid transparent;
    color: var(--text);
    padding: 4px;
    cursor: pointer;
    margin: 0 1px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    border-radius: 4px;
    pointer-events: auto;
    webkit-app-region: no-drag;
  `;
  
  // Hover efekti - CKEditor tarzında
  hrButton.addEventListener('mouseenter', () => {
    hrButton.style.backgroundColor = 'rgba(255,255,255,.06)';
    hrButton.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    hrButton.style.color = 'var(--text)';
  });
  hrButton.addEventListener('mouseleave', () => {
    hrButton.style.backgroundColor = 'transparent';
    hrButton.style.borderColor = 'transparent';
    hrButton.style.color = 'var(--text)';
  });
  
  // Tıklama olayı
  hrButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // CKEditor'ın model'ine doğrudan hr elementi ekle
    editor.model.change(writer => {
      const hrElement = writer.createElement('hr');
      
      // Mevcut seçimi al
      const selection = editor.model.document.selection;
      const insertPosition = selection.getFirstPosition();
      
      // HR elementini ekle
      writer.insert(hrElement, insertPosition);
      
      // Cursor'u HR'den sonraya taşı ve yeni paragraf oluştur
      const positionAfterHr = writer.createPositionAfter(hrElement);
      const newParagraph = writer.createElement('paragraph');
      writer.insert(newParagraph, positionAfterHr);
      
      // Cursor'u yeni paragrafın başına taşı ve formatı temizle
      const newPosition = writer.createPositionAt(newParagraph, 0);
      writer.setSelection(newPosition);
      
      // Başlık formatını temizle (eğer varsa) - sadece HR ekleme sırasında
      const headingCommand = editor.commands.get('heading');
      if (headingCommand && headingCommand.value) {
        try {
          headingCommand.execute();
        } catch (error) {
          const paragraphCommand = editor.commands.get('paragraph');
          if (paragraphCommand) {
            paragraphCommand.execute();
          }
        }
      }
    });
  });
  
  // Toolbar'daki butonlar arasına ekle - Link butonundan sonra
  const toolbarButtonsList = toolbarElement.querySelectorAll('.ck-button');
  let insertAfterButton = null;
  
  // Link butonunu bul
  for (let i = 0; i < toolbarButtonsList.length; i++) {
    const button = toolbarButtonsList[i];
    if (button.getAttribute('data-cke-tooltip-text') && 
        button.getAttribute('data-cke-tooltip-text').includes('Link')) {
      insertAfterButton = button;
      break;
    }
  }
  
  // Çizgi butonunu ekle
  if (insertAfterButton) {
    // Link butonundan sonra ekle
    insertAfterButton.insertAdjacentElement('afterend', hrButton);
  } else {
    // Link butonu bulunamazsa sona ekle
    toolbarElement.appendChild(hrButton);
  }
  
  console.log('✅ Özel çizgi butonu toolbar\'a eklendi');
}

function setupCKEditorEvents(editor, editableElement) {
  // CKEditor click event'i ekle
  editableElement.addEventListener('click', () => {
    console.log('🖱️ CKEditor clicked');
    editor.editing.view.focus();
  });
  
  // CKEditor keydown event'i ekle
  editableElement.addEventListener('keydown', (e) => {
    console.log('⌨️ CKEditor keydown:', e.key);
    
    // Ctrl+Shift+H ile çizgi ekleme
    if (e.ctrlKey && e.shiftKey && e.key === 'H') {
      e.preventDefault();
      
      // CKEditor'ın model'ine doğrudan hr elementi ekle
      editor.model.change(writer => {
        const hrElement = writer.createElement('hr');
        
        // Mevcut seçimi al
        const selection = editor.model.document.selection;
        const insertPosition = selection.getFirstPosition();
        
        // HR elementini ekle
        writer.insert(hrElement, insertPosition);
        
        // Cursor'u HR'den sonraya taşı ve yeni paragraf oluştur
        const positionAfterHr = writer.createPositionAfter(hrElement);
        const newParagraph = writer.createElement('paragraph');
        writer.insert(newParagraph, positionAfterHr);
        
        // Cursor'u yeni paragrafın başına taşı ve formatı temizle
        const newPosition = writer.createPositionAt(newParagraph, 0);
        writer.setSelection(newPosition);
        
        // Başlık formatını temizle (eğer varsa)
        const headingCommand = editor.commands.get('heading');
        if (headingCommand && headingCommand.value) {
          try {
            headingCommand.execute();
          } catch (error) {
            const paragraphCommand = editor.commands.get('paragraph');
            if (paragraphCommand) {
              paragraphCommand.execute();
            }
          }
        }
      });
    }
    
    // Üç tire ile çizgi ekleme (Enter'dan sonra)
    if (e.key === 'Enter') {
      const currentContent = editor.getData();
      if (currentContent.includes('<p>---</p>') || currentContent.includes('<p>***</p>')) {
        e.preventDefault();
        
        // CKEditor'ın model'ine doğrudan hr elementi ekle
        editor.model.change(writer => {
          const hrElement = writer.createElement('hr');
          
          // Mevcut seçimi al
          const selection = editor.model.document.selection;
          const insertPosition = selection.getFirstPosition();
          
          // HR elementini ekle
          writer.insert(hrElement, insertPosition);
          
          // Cursor'u HR'den sonraya taşı ve yeni paragraf oluştur
          const positionAfterHr = writer.createPositionAfter(hrElement);
          const newParagraph = writer.createElement('paragraph');
          writer.insert(newParagraph, positionAfterHr);
          
          // Cursor'u yeni paragrafın başına taşı ve formatı temizle
          const newPosition = writer.createPositionAt(newParagraph, 0);
          writer.setSelection(newPosition);
          
          // Başlık formatını temizle (eğer varsa)
          const headingCommand = editor.commands.get('heading');
          if (headingCommand && headingCommand.value) {
            try {
              headingCommand.execute();
            } catch (error) {
              const paragraphCommand = editor.commands.get('paragraph');
              if (paragraphCommand) {
                paragraphCommand.execute();
              }
            }
          }
        });
      }
    }
  });
  
  // CKEditor input event'i ekle
  editableElement.addEventListener('input', (e) => {
    console.log('📝 CKEditor input event:', e);
    console.log('📝 CKEditor content:', editableElement.innerHTML);
  });
  
  // CKEditor text yazma event'i
  editor.model.document.on('change:data', () => {
    console.log('📝 CKEditor content changed');
    console.log('📝 CKEditor HTML:', editor.getData());
  });
}

function setupBlockquoteSystem(editor) {
  // Blockquote'dan sonra ve içindeki boş paragrafları temizle
  editor.model.document.on('change:data', () => {
    setTimeout(() => {
      const editableElement = editor.ui.getEditableElement();
      if (!editableElement) return;
      
      // Blockquote'dan sonraki ve içindeki boş paragrafları temizle
      const blockquotes = editableElement.querySelectorAll('blockquote');
      blockquotes.forEach(blockquote => {
        // Blockquote'dan sonraki boş paragrafları temizle
        const nextSibling = blockquote.nextElementSibling;
        if (nextSibling && nextSibling.tagName === 'P') {
          if (nextSibling.innerHTML === '<br>' || 
              nextSibling.textContent.trim() === '' ||
              nextSibling.innerHTML === '') {
            nextSibling.remove();
          }
        }
        
        // Blockquote içindeki boş paragrafları temizle
        const paragraphs = blockquote.querySelectorAll('p');
        paragraphs.forEach(p => {
          if (p.innerHTML === '<br>' || 
              p.textContent.trim() === '' ||
              p.innerHTML === '' ||
              (p.children.length === 1 && p.children[0].tagName === 'BR' && p.textContent.trim() === '') ||
              p.innerHTML.trim() === '<br>' ||
              p.innerHTML.trim() === '<br/>') {
            p.remove();
          }
        });
        
        // Eğer blockquote tamamen boşsa, içine en az bir paragraf ekle
        if (blockquote.children.length === 0) {
          const emptyP = document.createElement('p');
          emptyP.innerHTML = '<br>';
          blockquote.appendChild(emptyP);
        }
      });
    }, 30);
  });
  
  // Blockquote sistemi - İlk Enter yeni satır, ikinci Enter çıkış
  editor.keystrokes.set('Enter', (evt, cancel) => {
    const selection = editor.model.document.selection;
    const position = selection.getFirstPosition();
    
    // Blockquote içinde mi kontrol et
    let blockQuoteParent = position.parent;
    while (blockQuoteParent && blockQuoteParent.name !== 'blockQuote') {
      blockQuoteParent = blockQuoteParent.parent;
    }
    
    if (blockQuoteParent && blockQuoteParent.name === 'blockQuote') {
      const currentParagraph = position.parent;
      
      // Eğer blockquote'un son paragrafındaysa ve boşsa
      if (currentParagraph.name === 'paragraph' && 
          currentParagraph.nextSibling === null && 
          currentParagraph.isEmpty) {
        
        cancel();
        
        // Blockquote'dan çık ve yeni paragraf oluştur
        editor.model.change(writer => {
          const newParagraph = writer.createElement('paragraph');
          writer.insert(newParagraph, blockQuoteParent, 'after');
          writer.setSelection(newParagraph, 0);
        });
        
        // DOM'u temizle
        setTimeout(() => {
          const editableElement = editor.ui.getEditableElement();
          if (editableElement) {
            const blockquotes = editableElement.querySelectorAll('blockquote');
            blockquotes.forEach(blockquote => {
              // Blockquote'dan sonraki boş paragrafları temizle
              const nextSibling = blockquote.nextElementSibling;
              if (nextSibling && nextSibling.tagName === 'P' && 
                  (nextSibling.innerHTML === '<br>' || nextSibling.textContent.trim() === '')) {
                nextSibling.remove();
              }
              
              // Blockquote içindeki boş paragrafları temizle
              const paragraphs = blockquote.querySelectorAll('p');
              paragraphs.forEach(p => {
                if (p.innerHTML === '<br>' || 
                    p.textContent.trim() === '' ||
                    p.innerHTML === '' ||
                    (p.children.length === 1 && p.children[0].tagName === 'BR' && p.textContent.trim() === '')) {
                  p.remove();
                }
              });
            });
          }
        }, 10);
        
        return;
      }
      
      // Eğer blockquote'un son paragrafındaysa ama içerik varsa
      if (currentParagraph.name === 'paragraph' && 
          currentParagraph.nextSibling === null && 
          !currentParagraph.isEmpty) {
        
        // İçerik varsa normal Enter davranışına izin ver (yeni satır)
        return;
      }
    }
  });
  
  // Shift+Enter ile blockquote'dan çıkma
  editor.keystrokes.set('Shift+Enter', (evt, cancel) => {
    const selection = editor.model.document.selection;
    const position = selection.getFirstPosition();
    
    // Blockquote içinde mi kontrol et
    let blockQuoteParent = position.parent;
    while (blockQuoteParent && blockQuoteParent.name !== 'blockQuote') {
      blockQuoteParent = blockQuoteParent.parent;
    }
    
    if (blockQuoteParent && blockQuoteParent.name === 'blockQuote') {
      cancel();
      
      // Blockquote'dan çık ve yeni paragraf oluştur
      editor.model.change(writer => {
        const newParagraph = writer.createElement('paragraph');
        writer.insert(newParagraph, blockQuoteParent, 'after');
        writer.setSelection(newParagraph, 0);
      });
      
      // DOM'u temizle
      setTimeout(() => {
        const editableElement = editor.ui.getEditableElement();
        if (editableElement) {
          const blockquotes = editableElement.querySelectorAll('blockquote');
          blockquotes.forEach(blockquote => {
            // Blockquote'dan sonraki boş paragrafları temizle
            const nextSibling = blockquote.nextElementSibling;
            if (nextSibling && nextSibling.tagName === 'P' && 
                (nextSibling.innerHTML === '<br>' || nextSibling.textContent.trim() === '')) {
              nextSibling.remove();
            }
            
            // Blockquote içindeki boş paragrafları temizle
            const paragraphs = blockquote.querySelectorAll('p');
            paragraphs.forEach(p => {
              if (p.innerHTML === '<br>' || 
                  p.textContent.trim() === '' ||
                  p.innerHTML === '' ||
                  (p.children.length === 1 && p.children[0].tagName === 'BR' && p.textContent.trim() === '')) {
                p.remove();
              }
            });
          });
        }
      }, 10);
    }
  });
}

function setupAutocomplete(editor) {
  // Autocomplete state - local to this function
  let autocompleteElement = null;
  let selectedAutocompleteIndex = -1;
  let tagAutocompleteElement = null;
  let tagSelectedIndex = -1;
  
  const notePanelTitleInput = document.getElementById('notePanelTitleInput');
  
  // Başlık değişikliklerini dinle - sadece bu not için
  const titleInputHandler = () => {
    // Sadece aktif not için güncelle
    if (window.updateNoteTitle) window.updateNoteTitle(notePanelCurrentNoteId, notePanelTitleInput.value);
  };
  notePanelTitleInput.addEventListener('input', titleInputHandler);
  
  // Handler'ı global olarak sakla (temizleme için)
  window.currentTitleInputHandler = titleInputHandler;
  
  // Editor içerik değişikliklerini dinle
  editor.model.document.on('change:data', () => {
    const content = editor.getData();
    updateNotePanelStats(content);
    
    // Wikilink autocomplete için kontrol
    const lastOpenBracket = content.lastIndexOf('[[');
    const textAfterBracket = content.substring(lastOpenBracket + 2);
    
    if (lastOpenBracket !== -1 && !textAfterBracket.includes(']]')) {
      // HTML taglarını temizle ve sadece metni al
      let query = textAfterBracket
        .replace(/<[^>]*>/g, '') // HTML taglarını kaldır
        .replace(/&nbsp;/g, ' ') // &nbsp; karakterlerini boşluk yap
        .replace(/<br\s*\/?>/gi, ' ') // <br> taglarını boşluk yap
        .trim();
      
      // Etiket (#) ile başlıyorsa temizle
      if (query.startsWith('#')) {
        query = '';
      }
      
      // Eğer query boşsa ama [[ varsa, tüm notları göster
      if (query.length === 0 && textAfterBracket.includes('</p>')) {
        query = ''; // Boş query ile tüm notları göster
      }
      
      showWikilinkAutocomplete(query);
    } else {
      hideWikilinkAutocomplete();
    }
    
    // Etiket autocomplete kontrolü - sadece satır başında
    const lastHash = content.lastIndexOf('#');
    const textAfterHash = content.substring(lastHash + 1);
    
    console.log('🏷️ Etiket kontrolü - lastHash:', lastHash, 'textAfterHash:', textAfterHash);
    
    // Sadece satır başında # varsa etiket autocomplete'i göster
    if (lastHash !== -1 && textAfterHash === '</p>') {
      // HTML tag'lerini temizle ve sadece metni al
      let tagQuery = textAfterHash
        .replace(/<[^>]*>/g, '') // HTML tag'lerini kaldır
        .replace(/&nbsp;/g, ' ') // &nbsp; karakterlerini boşluk yap
        .replace(/<br\s*\/?>/gi, ' ') // <br> tag'lerini boşluk yap
        .trim();
      
      console.log('🏷️ Raw textAfterHash:', textAfterHash);
      console.log('🏷️ Cleaned tagQuery:', tagQuery);
      
      // Eğer query boşsa ama # varsa, tüm etiketleri göster
      if (tagQuery.length === 0) {
        tagQuery = ''; // Boş query ile tüm etiketleri göster
        console.log('🏷️ Boş query, tüm etiketler gösterilecek');
      }
      
      showTagAutocomplete(tagQuery);
    } else {
      console.log('🏷️ Etiket autocomplete gizleniyor - satır başında değil');
      hideTagAutocomplete();
    }
  });
  
  // Wikilink autocomplete fonksiyonları
  function showWikilinkAutocomplete(query) {
    // Önceki autocomplete'i temizle
    if (autocompleteElement) {
      autocompleteElement.remove();
    }
    
    // Mevcut notları filtrele (mevcut notu hariç tut)
    const currentNoteId = notePanelCurrentNoteId;
    const matchingNotes = query.length === 0 
      ? window.notes.filter(note => note.id !== currentNoteId)
      : window.notes.filter(note => 
        note.title.toLowerCase().includes(query.toLowerCase()) && 
        note.id !== currentNoteId
      );
    
    console.log('📝 Eşleşen notlar:', matchingNotes.length, matchingNotes.map(n => n.title));
    
    if (matchingNotes.length === 0) return;
    
    // Autocomplete elementi oluştur
    autocompleteElement = document.createElement('div');
    autocompleteElement.className = 'wikilink-autocomplete';
    autocompleteElement.style.cssText = `
      position: fixed;
      background: #2d2d2d;
      border: 2px solid #007acc;
      border-radius: 8px;
      padding: 8px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      color: #ffffff;
    `;
    
    // Notları listele
    matchingNotes.slice(0, 8).forEach((note, index) => {
      const item = document.createElement('div');
      item.className = 'wikilink-autocomplete-item';
      if (index === 0) item.classList.add('selected');
      
      item.style.cssText = `
        padding: 8px;
        cursor: pointer;
        border-radius: 4px;
        margin-bottom: 2px;
        transition: background 0.2s;
        color: #000000;
        background: ${index === 0 ? '#007acc' : 'transparent'};
        color: ${index === 0 ? '#ffffff' : '#000000'};
      `;
      
      item.innerHTML = `
        <div style="font-weight: 500; color: #ffffff;">${note.title}</div>
      `;
      
      item.addEventListener('click', () => {
        selectWikilinkSuggestion(note.title, query);
      });
      
      item.addEventListener('mouseenter', () => {
        // Diğer item'ları temizle
        autocompleteElement.querySelectorAll('.wikilink-autocomplete-item').forEach(el => {
          el.classList.remove('selected');
          el.style.background = 'transparent';
          el.style.color = '#ffffff';
        });
        
        // Bu item'ı seçili yap
        item.classList.add('selected');
        item.style.background = '#007acc';
        item.style.color = '#ffffff';
        selectedAutocompleteIndex = index;
      });
      
      item.addEventListener('mouseleave', () => {
        if (!item.classList.contains('selected')) {
          item.style.background = 'transparent';
        }
      });
      
      autocompleteElement.appendChild(item);
    });
    
    selectedAutocompleteIndex = 0;
    
    // Body'ye ekle ve fixed pozisyon kullan
    document.body.appendChild(autocompleteElement);
    
    // Ekranın ortasında göster
    autocompleteElement.style.position = 'fixed';
    autocompleteElement.style.top = '50%';
    autocompleteElement.style.left = '50%';
    autocompleteElement.style.transform = 'translate(-50%, -50%)';
    autocompleteElement.style.width = '400px';
    autocompleteElement.style.maxHeight = '300px';
    autocompleteElement.style.zIndex = '999999';
    autocompleteElement.style.backgroundColor = '#2d2d2d';
    autocompleteElement.style.border = '3px solid #007acc';
    autocompleteElement.style.borderRadius = '12px';
    autocompleteElement.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
    autocompleteElement.style.display = 'block';
    autocompleteElement.style.visibility = 'visible';
    autocompleteElement.style.opacity = '1';
    
    console.log('🎨 Autocomplete elementi oluşturuldu ve DOM\'a eklendi');
  }
  
  function showTagAutocomplete(query) {
    console.log('🏷️ Tag autocomplete tetiklendi, query:', query);
    
    // Önceki autocomplete'i temizle
    if (tagAutocompleteElement) {
      tagAutocompleteElement.remove();
    }
    
    // Tüm notlardan etiketleri topla
    const allTags = new Set();
    window.notes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Query ile eşleşen etiketleri filtrele
    const matchingTags = query.length === 0 
      ? Array.from(allTags)
      : Array.from(allTags).filter(tag => 
        tag.toLowerCase().includes(query.toLowerCase())
      );
    
    console.log('🏷️ Eşleşen etiketler:', matchingTags.length, matchingTags);
    
    if (matchingTags.length === 0) return;
    
    // Autocomplete elementi oluştur
    tagAutocompleteElement = document.createElement('div');
    tagAutocompleteElement.className = 'tag-autocomplete';
    tagAutocompleteElement.style.cssText = `
      position: fixed;
      background: #2d2d2d;
      border: 2px solid #007acc;
      border-radius: 8px;
      padding: 8px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      color: #ffffff;
    `;
    
    // Etiketleri listele
    matchingTags.slice(0, 8).forEach((tag, index) => {
      const item = document.createElement('div');
      item.className = 'tag-autocomplete-item';
      if (index === 0) item.classList.add('selected');
      
      item.style.cssText = `
        padding: 8px;
        cursor: pointer;
        border-radius: 4px;
        margin-bottom: 2px;
        transition: background 0.2s;
        color: #ffffff;
        background: ${index === 0 ? '#007acc' : 'transparent'};
      `;
      
      item.innerHTML = `
        <div style="font-weight: 500; color: #ffffff;">#${tag}</div>
      `;
      
      item.addEventListener('click', () => {
        selectTagSuggestion(tag);
      });
      
      item.addEventListener('mouseenter', () => {
        // Diğer item'ları temizle
        tagAutocompleteElement.querySelectorAll('.tag-autocomplete-item').forEach(el => {
          el.classList.remove('selected');
          el.style.background = 'transparent';
          el.style.color = '#ffffff';
        });
        
        // Bu item'ı seçili yap
        item.classList.add('selected');
        item.style.background = '#007acc';
        item.style.color = '#ffffff';
        tagSelectedIndex = index;
      });
      
      item.addEventListener('mouseleave', () => {
        if (!item.classList.contains('selected')) {
          item.style.background = 'transparent';
        }
      });
      
      tagAutocompleteElement.appendChild(item);
    });
    
    tagSelectedIndex = 0;
    
    // Body'ye ekle ve fixed pozisyon kullan
    document.body.appendChild(tagAutocompleteElement);
    
    // Ekranın ortasında göster
    tagAutocompleteElement.style.position = 'fixed';
    tagAutocompleteElement.style.top = '50%';
    tagAutocompleteElement.style.left = '50%';
    tagAutocompleteElement.style.transform = 'translate(-50%, -50%)';
    tagAutocompleteElement.style.width = '400px';
    tagAutocompleteElement.style.maxHeight = '300px';
    tagAutocompleteElement.style.zIndex = '999999';
    tagAutocompleteElement.style.backgroundColor = '#2d2d2d';
    tagAutocompleteElement.style.border = '3px solid #007acc';
    tagAutocompleteElement.style.borderRadius = '12px';
    tagAutocompleteElement.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
    tagAutocompleteElement.style.display = 'block';
    tagAutocompleteElement.style.visibility = 'visible';
    tagAutocompleteElement.style.opacity = '1';
    
    console.log('🎨 Tag autocomplete elementi oluşturuldu ve DOM\'a eklendi');
  }
  
  function selectTagSuggestion(tag) {
    console.log('🏷️ Tag seçildi:', tag);
    
    const cleanTag = tag.trim();
    const currentContent = editor.getData();
    
    const hashIndex = currentContent.lastIndexOf('#');
    if (hashIndex !== -1) {
      const beforeHash = currentContent.substring(0, hashIndex + 1);
      const newContent = beforeHash + cleanTag;
      console.log('🔄 Yeni içerik:', newContent);
      
      const cursorPosition = beforeHash.length + cleanTag.length;
      editor.setData(newContent);
      
      setTimeout(() => {
        const model = editor.model;
        model.change(writer => {
          const root = model.document.getRoot();
          const maxOffset = root.maxOffset || 0;
          const safePosition = Math.min(cursorPosition, maxOffset);
          const endPosition = model.createPositionAt(root, safePosition);
          writer.setSelection(endPosition);
        });
      }, 10);
    }
    
    hideTagAutocomplete();
  }
  
  function hideTagAutocomplete() {
    if (tagAutocompleteElement) {
      tagAutocompleteElement.remove();
      tagAutocompleteElement = null;
      tagSelectedIndex = -1;
    }
  }
  
  function hideWikilinkAutocomplete() {
    if (autocompleteElement) {
      autocompleteElement.remove();
      autocompleteElement = null;
      selectedAutocompleteIndex = -1;
    }
  }
  
  function selectWikilinkSuggestion(noteTitle, query) {
    const currentContent = editor.getData();
    const bracketIndex = currentContent.lastIndexOf('[[');
    
    if (bracketIndex !== -1) {
      const beforeBracket = currentContent.substring(0, bracketIndex + 2);
      const newContent = beforeBracket + noteTitle + ']]';
      console.log('🔄 Yeni içerik:', newContent);
      
      const cursorPosition = beforeBracket.length + noteTitle.length + 2;
      editor.setData(newContent);
      
      setTimeout(() => {
        const model = editor.model;
        model.change(writer => {
          const root = model.document.getRoot();
          const maxOffset = root.maxOffset || 0;
          const safePosition = Math.min(cursorPosition, maxOffset);
          const endPosition = model.createPositionAt(root, safePosition);
          writer.setSelection(endPosition);
        });
      }, 10);
    }
    
    hideWikilinkAutocomplete();
  }
  
  function navigateTagAutocomplete(direction) {
    console.log('🏷️ Tag navigation:', direction, 'current index:', tagSelectedIndex);
    if (!tagAutocompleteElement || tagSelectedIndex === -1) {
      console.log('🏷️ Tag autocomplete element yok veya index -1');
      return;
    }
    
    const items = tagAutocompleteElement.querySelectorAll('.tag-autocomplete-item');
    console.log('🏷️ Tag items found:', items.length);
    if (items.length === 0) return;
    
    // Önceki seçimi temizle
    items[tagSelectedIndex]?.classList.remove('selected');
    items[tagSelectedIndex].style.background = 'transparent';
    items[tagSelectedIndex].style.color = '#ffffff';
    
    if (direction === 'down') {
      tagSelectedIndex = (tagSelectedIndex + 1) % items.length;
    } else if (direction === 'up') {
      tagSelectedIndex = tagSelectedIndex <= 0 ? items.length - 1 : tagSelectedIndex - 1;
    }
    
    console.log('🏷️ New tag index:', tagSelectedIndex);
    
    // Yeni seçimi işaretle
    items[tagSelectedIndex].classList.add('selected');
    items[tagSelectedIndex].style.background = '#007acc';
    items[tagSelectedIndex].style.color = '#ffffff';
    items[tagSelectedIndex].scrollIntoView({ block: 'nearest' });
  }
  
  function selectCurrentTagSuggestion() {
    if (!tagAutocompleteElement || tagSelectedIndex === -1) return false;
    
    const items = tagAutocompleteElement.querySelectorAll('.tag-autocomplete-item');
    const selectedItem = items[tagSelectedIndex];
    
    if (selectedItem) {
      const tagText = selectedItem.textContent.replace('#', '').trim();
      selectTagSuggestion(tagText);
      return true;
    }
    return false;
  }
  
  function navigateWikilinkAutocomplete(direction) {
    if (!autocompleteElement) return;
    
    const items = autocompleteElement.querySelectorAll('.wikilink-autocomplete-item');
    if (items.length === 0) return;
    
    // Mevcut seçili öğeyi bul
    let currentIndex = -1;
    items.forEach((item, index) => {
      if (item.classList.contains('selected')) {
        currentIndex = index;
      }
    });
    
    // Yeni indeksi hesapla
    let newIndex;
    if (direction === 'up') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    } else {
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    }
    
    // Seçimi güncelle
    items.forEach(item => {
      item.classList.remove('selected');
      item.style.background = 'transparent';
      item.style.border = 'none';
    });
    
    items[newIndex].classList.add('selected');
    items[newIndex].style.background = 'rgba(59, 130, 246, 0.15)';
    items[newIndex].style.border = '1px solid rgba(59, 130, 246, 0.3)';
    items[newIndex].scrollIntoView({ block: 'nearest' });
    
    selectedAutocompleteIndex = newIndex;
  }
  
  function selectCurrentWikilinkSuggestion() {
    if (!autocompleteElement || selectedAutocompleteIndex === -1) return;
    
    const items = autocompleteElement.querySelectorAll('.wikilink-autocomplete-item');
    const selectedItem = items[selectedAutocompleteIndex];
    if (!selectedItem) return;
    
    const titleElement = selectedItem.querySelector('div');
    const noteTitle = titleElement.textContent.trim();
    
    const currentContent = editor.getData();
    const lastOpenBracket = currentContent.lastIndexOf('[[');
    const query = currentContent.substring(lastOpenBracket + 2);
    
    selectWikilinkSuggestion(noteTitle, query);
  }
  
  // Keyboard shortcuts for autocomplete navigation
  editor.keystrokes.set('ArrowUp', (evt, cancel) => {
    if (autocompleteElement) {
      cancel();
      navigateWikilinkAutocomplete('up');
    } else if (tagAutocompleteElement) {
      cancel();
      navigateTagAutocomplete('up');
    }
  });
  
  editor.keystrokes.set('ArrowDown', (evt, cancel) => {
    if (autocompleteElement) {
      cancel();
      navigateWikilinkAutocomplete('down');
    } else if (tagAutocompleteElement) {
      cancel();
      navigateTagAutocomplete('down');
    }
  });
  
  editor.keystrokes.set('Enter', (evt, cancel) => {
    if (autocompleteElement) {
      cancel();
      selectCurrentWikilinkSuggestion();
    } else if (tagAutocompleteElement) {
      cancel();
      selectCurrentTagSuggestion();
    }
  });
  
  editor.keystrokes.set('Esc', (evt, cancel) => {
    if (autocompleteElement) {
      cancel();
      hideWikilinkAutocomplete();
    } else if (tagAutocompleteElement) {
      cancel();
      hideTagAutocomplete();
    }
  });
  
  // İçerik değiştiğinde stats güncelle
  editor.model.document.on('change:data', () => {
    if (window.updateNotePanelStats && notePanelEditor) {
      window.updateNotePanelStats(notePanelEditor.getData());
    }
  });
}

function setupHighlighting(editor) {
  // CKEditor 5'te yazarken renkli görünüm için MutationObserver
  let highlightingEnabled = true;
  
  const highlightText = () => {
    if (!highlightingEnabled) return;
    
    const editable = document.querySelector('.ck-editor__editable');
    if (!editable) return;
    
    // Tüm text node'ları bul
    const walker = document.createTreeWalker(
      editable,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Zaten styled span içindeki text'leri atla
          if (node.parentElement && 
              (node.parentElement.classList.contains('tagtok') || 
               node.parentElement.classList.contains('wikilink'))) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    highlightingEnabled = false; // Sonsuz döngü önle
    
    textNodes.forEach(textNode => {
      let text = textNode.textContent;
      let changed = false;
      
      // Etiket kontrolü: #etiket
      if (/#[a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+/i.test(text)) {
        text = text.replace(/#([a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+)/gi, 
          '<span class="tagtok" style="background: rgba(167,139,250,0.2); color: #a78bfa; padding: 0.1em 0.4em; border-radius: 4px; font-weight: 500;">#$1</span>');
        changed = true;
      }
      
      // Wikilink kontrolü: [[bağlantı]]
      if (/\[\[[^\]]+\]\]/.test(text)) {
        text = text.replace(/\[\[([^\]]+)\]\]/g, 
          '<span class="wikilink" style="background: rgba(125,211,252,0.2); color: #7dd3fc; padding: 0.1em 0.4em; border-radius: 4px; font-weight: 500;" data-link="$1">[[$1]]</span>');
        changed = true;
      }
      
      if (changed) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // Text node'u yeni elementlerle değiştir
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });
    
    setTimeout(() => {
      highlightingEnabled = true;
    }, 100);
  };
  
  // CKEditor 5'in DOM değişikliklerini izle
  const observer = new MutationObserver(() => {
    setTimeout(highlightText, 50);
  });
  
  // CKEditor hazır olduğunda observer'ı başlat
  setTimeout(() => {
    const editable = document.querySelector('.ck-editor__editable');
    if (editable) {
      observer.observe(editable, {
        childList: true,
        subtree: true,
        characterData: true
      });
      highlightText(); // İlk highlight
    }
  }, 500);
}

function setupKeyboardShortcuts(editor) {
  // Etiket ekleme kısayolu
  editor.keystrokes.set('Ctrl+Shift+T', (evt, cancel) => {
    cancel();
    const tagName = prompt('Etiket adı:');
    if (tagName && tagName.trim()) {
      const cleanTag = tagName.trim().replace(/[^a-zA-Z0-9ğüşiöçıİĞÜŞİÖÇ\-_]/g, '');
      if (cleanTag) {
        editor.model.change(writer => {
          const insertPosition = editor.model.document.selection.getFirstPosition();
          writer.insertText(`#${cleanTag}`, insertPosition);
        });
      }
    }
  });
  
  // Bağlantı ekleme kısayolu - Diğer notlarla bağlantı
  editor.keystrokes.set('Ctrl+Shift+L', (evt, cancel) => {
    cancel();
    
    // Mevcut notları listele
    const noteList = window.notes.map(note => `${note.id}: ${note.title}`).join('\n');
    const linkName = prompt(`Bağlantı adı:\n\nMevcut notlar:\n${noteList}\n\nBağlantı adını yazın:`);
    
    if (linkName && linkName.trim()) {
      const cleanLink = linkName.trim();
      editor.model.change(writer => {
        const insertPosition = editor.model.document.selection.getFirstPosition();
        writer.insertText(`[[${cleanLink}]]`, insertPosition);
      });
    }
  });
  
  // Kaydetme kısayolu
  editor.keystrokes.set('Ctrl+S', (evt, cancel) => {
    cancel();
    saveNotePanelNote();
  });
}

function loadNoteData(editor, targetNoteId) {
  const notePanelTitleInput = document.getElementById('notePanelTitleInput');
  
  // Mevcut not verilerini yükle
  if (targetNoteId) {
    const note = window.notes.find(n => n.id === targetNoteId);
    if (note) {
      notePanelTitleInput.value = note.title === 'Başlıksız Not' ? '' : note.title;
      
      // Not içeriğini yükle
      let textToLoad = note.text;
      
      // Eğer not HTML içeriyorsa direkt kullan, yoksa Markdown'dan HTML'e çevir
      if (textToLoad.includes('<') && textToLoad.includes('>')) {
        // HTML içerik - entity'leri decode et ve HR etiketlerini kontrol et
        textToLoad = window.decodeHtmlEntities ? window.decodeHtmlEntities(textToLoad) : textToLoad;
        
        // Eğer HR etiketleri varsa custom-hr class'ı ekle
        textToLoad = textToLoad.replace(/<hr([^>]*?)>/gi, '<hr class="custom-hr"$1>');
        
        editor.setData(textToLoad);
      } else {
        // Markdown içerik - basit dönüştürme
        textToLoad = textToLoad
          .replace(/^---\s*$/gm, '<hr class="custom-hr">')  // --- çizgilerini HR etiketine çevir
          .replace(/^\*\*\*\s*$/gm, '<hr class="custom-hr">')  // *** çizgilerini HR etiketine çevir
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink" data-link="$1">[[$1]]</span>')
          .replace(/#([a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+)/g, '<span class="tagtok">#$1</span>');
        editor.setData(textToLoad);
      }
      
      updateNotePanelStats(note.text);
      notePanelCurrentNoteId = targetNoteId;
    }
  } else {
    // Yeni not modu
    notePanelTitleInput.value = '';
    editor.setData('');
    updateNotePanelStats('');
    notePanelCurrentNoteId = null;
  }
  
  // Stats'i güncelle
  updateNotePanelStats(editor.getData());
}

// Global exports
window.openNotePanel = openNotePanel;
window.closeNotePanel = closeNotePanel;
window.saveNotePanelNote = saveNotePanelNote;
window.updateNotePanelStats = updateNotePanelStats;
window.notePanelEditor = notePanelEditor;
window.notePanelCurrentNoteId = notePanelCurrentNoteId;

console.log('📝 Note Panel System yüklendi');

