// ===== UTILITY FUNCTIONS =====

// Regex'ler
const REGEX = {
  TAGS: /#([a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+)/ig,
  WIKILINKS: /\[\[([^\]]+)\]\]/g,
  CHECKLIST: /^\s*-\s*\[( |x|X)\]\s*(.*)$/
};

// HTML escape fonksiyonu
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Benzersiz ID oluşturma
function generateUniqueId(baseName, type = 'note') {
  const cleanId = baseName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  
  // Sadece aynı türde aynı isimde öğe var mı kontrol et - HATA FIRLAT!
  if (type === 'note') {
    const existingNote = window.notes.find(n => n.title.toLowerCase() === baseName.toLowerCase());
    if (existingNote) {
      throw new Error(`"${baseName}" isimli bir not zaten mevcut! Aynı isimde not oluşturulamaz.`);
    }
  } else if (type === 'folder') {
    const existingFolder = window.folders.find(f => f.name.toLowerCase() === baseName.toLowerCase());
    if (existingFolder) {
      throw new Error(`"${baseName}" isimli bir klasör zaten mevcut! Aynı isimde klasör oluşturulamaz.`);
    }
  }
  
  return cleanId;
}

// Etiket parse etme
function parseTags(text) {
  const tags = [];
  
  // HTML içindeki etiketleri yakala (CKEditor 5'den gelen)
  const htmlTagMatches = text.match(/<span class="tagtok">#([^<]+)<\/span>/g);
  
  if (htmlTagMatches) {
    htmlTagMatches.forEach(match => {
      const tagMatch = match.match(/<span class="tagtok">#([^<]+)<\/span>/);
      if (tagMatch) {
        tags.push(tagMatch[1].toLowerCase());
      }
    });
  }
  
  // Düz metindeki etiketleri yakala (eski notlar için)
  let match;
  const regex = new RegExp(REGEX.TAGS.source, REGEX.TAGS.flags);
  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  
  return [...new Set(tags)];
}

// Wikilink parse etme
function parseWikilinks(text) {
  const links = [];
  
  // HTML içindeki wikilinkleri yakala (CKEditor 5'den gelen)
  const htmlLinkMatches = text.match(/<span class="wikilink"[^>]*data-link="([^"]+)"[^>]*>\[\[[^\]]+\]\]<\/span>/g);
  if (htmlLinkMatches) {
    htmlLinkMatches.forEach(match => {
      const linkMatch = match.match(/<span class="wikilink"[^>]*data-link="([^"]+)"[^>]*>\[\[[^\]]+\]\]<\/span>/);
      if (linkMatch) {
        links.push(linkMatch[1].trim());
      }
    });
  }
  
  // Düz metindeki wikilinkleri yakala (eski notlar için)
  let match;
  while ((match = REGEX.WIKILINKS.exec(text)) !== null) {
    links.push(match[1].trim());
  }
  
  return [...new Set(links)];
}

// Metin highlight etme
function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${escapeHtml(query)})`, 'gi');
  return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
}

// Regex escape fonksiyonu
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Güvenli dosya adı oluştur
function generateFileName(title, originalExtension = '.md') {
  return title
    .replace(/[<>:"/\\|?*]/g, '') // Geçersiz karakterleri temizle
    .replace(/\s+/g, '_') // Boşlukları alt çizgi ile değiştir
    .substring(0, 50) + originalExtension; // Orijinal uzantıyı kullan
}

// Global exports
window.REGEX = REGEX;
window.escapeHtml = escapeHtml;
window.generateUniqueId = generateUniqueId;
window.parseTags = parseTags;
window.parseWikilinks = parseWikilinks;
window.highlightText = highlightText;
window.escapeRegex = escapeRegex;
window.generateFileName = generateFileName;

