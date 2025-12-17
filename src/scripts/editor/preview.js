// ===== NOTE PREVIEW =====
// Not önizleme sistemi (markdown render)

function renderPreview() {
  const preview = document.getElementById('preview');
  const bodyInput = document.getElementById('bodyIn');
  
  if (!preview) {
    console.error('Preview elementi bulunamadı!');
    return;
  }
  
  if (!bodyInput) {
    console.error('Body input elementi bulunamadı!');
    return;
  }
  
  const text = bodyInput.value;
  const notes = window.notes || [];
  const state = window.getState();
  
  preview.innerHTML = window.renderMarkdown ? window.renderMarkdown(text) : text;
  
  // Checkbox eventleri - Düzeltilmiş
  preview.querySelectorAll('.checklist-checkbox').forEach((checkbox) => {
    checkbox.onchange = () => {
      const lines = text.split('\n');
      const checklistItems = preview.querySelectorAll('.checklist-item');
      
      // Bu checkbox'ın kaçıncı sırada olduğunu bul
      let itemIndex = -1;
      for (let i = 0; i < checklistItems.length; i++) {
        if (checklistItems[i].querySelector('.checklist-checkbox') === checkbox) {
          itemIndex = i;
          break;
        }
      }
      
      if (itemIndex >= 0) {
        // Markdown metninde checklist satırını bul ve güncelle
        let checklistCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.match(/^\s*-\s*\[( |x|X)\]\s*(.*)$/)) {
            if (checklistCount === itemIndex) {
              const isChecked = checkbox.checked;
              lines[i] = line.replace(/\[( |x|X)\]/, `[${isChecked ? 'x' : ' '}]`);
              break;
            }
            checklistCount++;
          }
        }
        
        // Metni güncelle
        bodyInput.value = lines.join('\n');
        
        // Notu kaydet
        if (window.updateNote) {
          window.updateNote(state.selectedNote, document.getElementById('titleIn').value, bodyInput.value);
        }
      }
    };
  });
  
  // Wikilink eventleri
  preview.querySelectorAll('.wikilink').forEach(link => {
    link.onclick = () => {
      const linkText = link.dataset.link;
      let targetNote = notes.find(n => n.title === linkText);
      
      if (!targetNote) {
        try {
          // Yeni not oluştur
          targetNote = {
            id: window.generateUniqueId(linkText, 'note'), // Benzersiz ID
            title: linkText,
            text: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            links: []
          };
          window.notes.unshift(targetNote);
          if (window.saveNotes) window.saveNotes();
        } catch (error) {
          // Hata mesajını göster
          if (window.showNotification) window.showNotification(error.message, 'error');
          console.log('❌ Not oluşturulamadı:', error.message);
          return;
        }
      }
      
      if (window.selectNote) window.selectNote(targetNote.id);
      if (window.openNotePanel) window.openNotePanel(targetNote.id);
    };
  });
}

// Global export
window.renderPreview = renderPreview;

console.log('👁️ Preview System yüklendi');

