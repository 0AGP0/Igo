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
  if (!text || typeof text !== 'string') return [];
  
  const tags = [];
  
  // HTML içindeki etiketleri yakala (Vditor'dan gelen)
  const htmlTagMatches = text.match(/<span class="tagtok">#([^<]+)<\/span>/g);
  
  if (htmlTagMatches) {
    htmlTagMatches.forEach(match => {
      const tagMatch = match.match(/<span class="tagtok">#([^<]+)<\/span>/);
      if (tagMatch && tagMatch[1]) {
        const tag = tagMatch[1].trim().toLowerCase();
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      }
    });
  }
  
  // Düz metindeki etiketleri yakala (eski notlar ve yeni notlar için)
  // HTML etiketlerini kaldır (sadece metni al)
  const textWithoutHtml = text.replace(/<[^>]+>/g, '');
  
  // Regex ile etiketleri bul
  const regex = new RegExp(REGEX.TAGS.source, REGEX.TAGS.flags);
  let match;
  // Regex'in lastIndex'ini sıfırla
  regex.lastIndex = 0;
  
  while ((match = regex.exec(textWithoutHtml)) !== null) {
    if (match[1]) {
      const tag = match[1].trim().toLowerCase();
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    // Sonsuz döngüyü önle (aynı pozisyonda kalıyorsa dur)
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }
  
  return [...new Set(tags)];
}

// Wikilink parse etme
function parseWikilinks(text) {
  const links = [];
  
  // HTML içindeki wikilinkleri yakala (Vditor'dan gelen)
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
    // Boşlukları koru (alt çizgi ile değiştirme)
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

