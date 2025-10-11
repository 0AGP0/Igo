// ===== NOTE UTILITIES =====
// Not kartı yardımcı fonksiyonları

// Not için minimum genişlik hesapla
function calculateMinWidthForNote(note) {
  // Sabit font boyutu kullan
  const fontSize = 20;
  
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
  tempDiv.style.width = '300px'; // Maksimum genişlik sınırı
  tempDiv.textContent = note.title;
  
  document.body.appendChild(tempDiv);
  const textWidth = tempDiv.scrollWidth;
  const textHeight = tempDiv.offsetHeight;
  document.body.removeChild(tempDiv);
  
  // Eğer metin çok satıra yayıldıysa, genişliği artır
  const expectedHeight = fontSize * 1.4;
  const isMultiLine = textHeight > expectedHeight * 1.5;
  
  // Başlık genişliği + padding + butonlar
  const buttonsWidth = 60; // Edit + Silme + gap
  const padding = 32; // 16px her iki tarafta
  const minWidth = textWidth + padding + buttonsWidth;
  
  return Math.max(200, minWidth); // En az 200px
}

// Global exports
window.calculateMinWidthForNote = calculateMinWidthForNote;

console.log('🔧 Note Utils yüklendi');

