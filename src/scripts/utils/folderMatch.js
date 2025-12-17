// ===== FOLDER ID MATCHING UTILITY =====
// Eski ve yeni format klasör ID eşleştirmesi için yardımcı fonksiyonlar

/**
 * Not'un folderId'si ile klasör ID'sini eşleştir
 * Eski format uyumluluğu için çoklu eşleştirme yöntemleri kullanır
 * @param {string|null} noteFolderId - Notun folderId'si
 * @param {string} folderId - Klasör ID'si
 * @param {Object} folder - Klasör objesi (name, altIds vb. için)
 * @returns {boolean} - Eşleşme varsa true
 */
function doesNoteMatchFolder(noteFolderId, folderId, folder = null) {
  // Null kontrolü
  if (!noteFolderId || !folderId) return false;
  
  // 1. Direkt eşleşme (en güvenilir)
  if (noteFolderId === folderId) return true;
  
  // 2. Normalize edilmiş eşleşme (Türkçe karakterler dahil)
  const noteIdNormalized = (noteFolderId || '').toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_');
  const folderIdNormalized = (folderId || '').toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_');
  if (noteIdNormalized === folderIdNormalized) return true;
  
  // 2b. Sadece alfanumerik normalize (Türkçe karakter kaybı durumu için)
  const noteIdNormalizedASCII = (noteFolderId || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const folderIdNormalizedASCII = (folderId || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (noteIdNormalizedASCII === folderIdNormalizedASCII) return true;
  
  // 3. Klasör adı ile eşleşme (eski format: klasör adı direkt folderId olarak kullanılmış)
  if (folder && folder.name) {
    // Orijinal klasör adı ile eşleşme (tam eşleşme - gevşek değil)
    if (noteFolderId === folder.name) return true;
    
    // Klasör adının lowercase versiyonu ile eşleşme (tam eşleşme - gevşek değil)
    if (noteFolderId === folder.name.toLowerCase()) return true;
    
    // Klasör adının normalize edilmiş versiyonu ile eşleşme (tam eşleşme)
    const folderNameNormalized = folder.name.toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_');
    if (noteIdNormalized === folderNameNormalized) return true;
    
    // Klasör adının ASCII normalize versiyonu ile eşleşme (tam eşleşme)
    const folderNameNormalizedASCII = folder.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (noteIdNormalizedASCII === folderNameNormalizedASCII) return true;
    
    // Özel durum: Türkçe karakter kaybı - SADECE BAŞTA 1 KARAKTER KAYBI DURUMU
    // Örnek: "öncelikli" → "ncelikli" (ö kaybolmuş)
    // Sadece klasör adının SONUNA eşleşme (başta 1 karakter kaybı)
    const folderNameLettersOnlyASCII = folder.name.toLowerCase().replace(/[^a-z]/g, '');
    const noteIdLettersOnlyASCII = (noteFolderId || '').toLowerCase().replace(/[^a-z]/g, '');
    
    if (noteIdLettersOnlyASCII && folderNameLettersOnlyASCII) {
      // Klasör adı daha uzunsa VE not ID klasör adının SONUNA eşleşiyorsa
      // Uzunluk farkı tam 1 olmalı (sadece 1 karakter kaybı)
      if (folderNameLettersOnlyASCII.length === noteIdLettersOnlyASCII.length + 1 && 
          folderNameLettersOnlyASCII.endsWith(noteIdLettersOnlyASCII)) {
        return true;
      }
    }
  }
  
  // 4. Alt ID'ler ile eşleşme (tam eşleşme - gevşek değil)
  if (folder && folder.altIds && Array.isArray(folder.altIds)) {
    // Orijinal alt ID'ler ile direkt eşleşme
    if (folder.altIds.includes(noteFolderId)) return true;
    
    // Normalize edilmiş alt ID'ler ile eşleşme (tam eşleşme)
    const altIdsNormalized = folder.altIds.map(id => (id || '').toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_'));
    if (altIdsNormalized.includes(noteIdNormalized)) return true;
    
    // ASCII normalize edilmiş alt ID'ler ile eşleşme (tam eşleşme)
    const altIdsNormalizedASCII = folder.altIds.map(id => (id || '').toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    if (altIdsNormalizedASCII.includes(noteIdNormalizedASCII)) return true;
  }
  
  return false;
}

/**
 * Notun hangi klasöre ait olduğunu bul
 * @param {string|null} noteFolderId - Notun folderId'si
 * @param {Array} folders - Klasör listesi
 * @returns {Object|null} - Eşleşen klasör veya null
 */
function findFolderForNote(noteFolderId, folders = []) {
  if (!noteFolderId || !folders || folders.length === 0) return null;
  
  // Tüm klasörlerde ara
  for (const folder of folders) {
    if (doesNoteMatchFolder(noteFolderId, folder.id, folder)) {
      return folder;
    }
  }
  
  return null;
}

// Global exports
window.doesNoteMatchFolder = doesNoteMatchFolder;
window.findFolderForNote = findFolderForNote;

console.log('🔗 Folder Match utility yüklendi');

