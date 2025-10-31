// ===== NOTE UTILITIES =====
// Not kartı yardımcı fonksiyonları

// Not için minimum genişlik hesapla
function calculateMinWidthForNote(note) {
  if (!note || !note.title) return 280; // Varsayılan genişlik
  
  // Not kartındaki başlık font boyutunu kullan (CSS'de 30px)
  const fontSize = 30;
  
  // Başlık genişliğini hesapla
  const tempDiv = document.createElement('div');
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.position = 'absolute';
  tempDiv.style.fontSize = fontSize + 'px';
  tempDiv.style.fontWeight = '600';
  tempDiv.style.lineHeight = '1.4';
  tempDiv.style.wordWrap = 'break-word';
  tempDiv.style.overflowWrap = 'break-word';
  tempDiv.style.wordBreak = 'break-word';
  tempDiv.style.whiteSpace = 'normal';
  tempDiv.style.fontFamily = 'var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)';
  // Maksimum genişlik sınırı yok, başlığın tam genişliğini al
  tempDiv.style.width = 'auto';
  tempDiv.style.maxWidth = 'none';
  tempDiv.textContent = note.title;
  
  document.body.appendChild(tempDiv);
  const textWidth = tempDiv.scrollWidth;
  const textHeight = tempDiv.offsetHeight;
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

