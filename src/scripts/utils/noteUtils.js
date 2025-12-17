// ===== NOTE UTILITIES =====
// Not kartı yardımcı fonksiyonları

// Not için minimum genişlik hesapla
function calculateMinWidthForNote(note) {
  if (!note || !note.title) return 280; // Varsayılan genişlik
  
  // Not kartındaki başlık font ayarlarını kullan (CSS: 30px, font-weight 600)
  const fontSize = 30;
  
  // Başlık genişliğini hesaplamak için geçici bir element oluştur
  const tempDiv = document.createElement('div');
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.position = 'absolute';
  tempDiv.style.whiteSpace = 'nowrap'; // Tek satırda gerçek genişliği ölç
  tempDiv.style.fontSize = fontSize + 'px';
  tempDiv.style.fontWeight = '600';
  tempDiv.style.lineHeight = '1.4';
  tempDiv.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family') ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  tempDiv.style.letterSpacing = 'normal';
  tempDiv.style.padding = '0';
  tempDiv.style.margin = '0';
  tempDiv.style.border = '0';
  tempDiv.style.maxWidth = 'none';
  tempDiv.style.transform = 'translateZ(0)';
  tempDiv.textContent = note.title;
  
  document.body.appendChild(tempDiv);
  const textWidth = tempDiv.scrollWidth;
  document.body.removeChild(tempDiv);
  
  // Başlık genişliği + padding (her iki tarafta 12px = 24px)
  const padding = 24; // .note .head padding: 0 12px
  const minWidth = textWidth + padding;
  
  // Minimum genişlik garantisi (280px) ama başlık daha uzunsa onu kullan
  return Math.max(280, Math.ceil(minWidth));
}

// Global exports
window.calculateMinWidthForNote = calculateMinWidthForNote;

console.log('🔧 Note Utils yüklendi');

