// ===== MARKDOWN RENDER SYSTEM =====

// HTML entity'lerini decode eden fonksiyon
function decodeHtmlEntities(text) {
  if (!text) return '';
  
  const htmlEntities = {
    '&#39;': "'",
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&#x2B;': '+',
    '&#x2D;': '-',
    '&#x5F;': '_',
    '&#x2E;': '.',
    '&#x2C;': ',',
    '&#x3A;': ':',
    '&#x3B;': ';',
    '&#x21;': '!',
    '&#x3F;': '?',
    '&#x40;': '@',
    '&#x23;': '#',
    '&#x24;': '$',
    '&#x25;': '%',
    '&#x5E;': '^',
    '&#x2A;': '*',
    '&#x28;': '(',
    '&#x29;': ')',
    '&#x5B;': '[',
    '&#x5D;': ']',
    '&#x7B;': '{',
    '&#x7D;': '}',
    '&#x7C;': '|',
    '&#x5C;': '\\',
    '&#x22;': '"'
  };
  
  // Tüm HTML entity'lerini decode et
  for (const [entity, char] of Object.entries(htmlEntities)) {
    const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (text.includes(entity)) {
      text = text.replace(regex, char);
    }
  }
  
  // Çift encode edilmiş entity'leri de decode et
  // &amp;#39; → &#39; → '
  text = text.replace(/&amp;#39;/g, "'");
  text = text.replace(/&amp;quot;/g, '"');
  text = text.replace(/&amp;amp;/g, '&');
  text = text.replace(/&amp;lt;/g, '<');
  text = text.replace(/&amp;gt;/g, '>');
  
  return text;
}

// HTML içeriğini işle ve tablo stillerini uygula
function processHtmlContent(html, removeImages = false) {
  // HTML entity'lerini decode et
  html = decodeHtmlEntities(html);
  
  // Eğer resimler çıkarılacaksa (kart preview için)
  if (removeImages) {
    // TÜM resimlerin HTML'ini çıkar (.media klasöründen olanlar)
    // Markdown image syntax: ![alt](path)
    html = html.replace(/!\[([^\]]*)\]\([^)]*\.media[^)]*\)/gi, '');
    // HTML img tag'leri: <img src=".../.media/...">
    html = html.replace(/<img[^>]+src=["'][^"']*\.media[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<img[^>]*src=["'][^"']*\.media[^"']*["'][^>]*[^>]*>/gi, '');
    // Vditor figure tag'leri ile birlikte gelen resimler
    html = html.replace(/<figure[^>]*>[\s\S]*?<img[^>]*src=["'][^"']*\.media[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi, '');
    html = html.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, (match) => {
      if (match.includes('.media')) return '';
      return match;
    });
    // Vditor özel formatları
    html = html.replace(/<img[^>]*class=["'][^"']*vditor[^"']*["'][^>]*src=["'][^"']*\.media[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<img[^>]*data-src=["'][^"']*\.media[^"']*["'][^>]*>/gi, '');
    // Boş p, div tag'lerini temizle
    html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');
    html = html.replace(/<div[^>]*>\s*<\/div>/gi, '');
  }
  
  // Tablo stillerini uygula
  html = html.replace(/<table>/g, '<table class="md-table">');
  html = html.replace(/<td>/g, '<td class="md-table-cell">');
  html = html.replace(/<th>/g, '<th class="md-table-cell">');
  
  return html;
}

// Markdown render - Vditor HTML desteği ile
function renderMarkdown(text) {
  if (!text) return '';

  // Eğer text HTML tag'leri içeriyorsa (Vditor'dan geliyorsa), işle
  if (text.includes('<') && text.includes('>')) {
    // ÖNCE: İçerikte Markdown formatında resim varsa, onları HTML'e çevir (HTML içerik içinde de olabilirler)
    // Örnek: <audio>...</audio>![resim](file://path)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;display:block;margin:8px 0;">');
    
    // ÖNCE: HTML içerikte Markdown formatında checkbox varsa, onları HTML'e çevir
    // Örnek: <audio>...</audio>- [ ] görev veya * [ ] görev veya *[ ] görev (boşluksuz)
    // Hem - hem de * formatını destekle, HTML tag'lerden sonra veya satır başında olabilir
    // Çoklu regex ile farklı formatları yakala
    
    // Format 1: Boşluklu: "- [ ] görev" veya "* [ ] görev"
    text = text.replace(/(<\/[^>]+>|^|\n)\s*([-*+])\s+\[\s*\]\s+(.+?)(?=\s*(?:<[^>]+>|$|\n))/gi, 
      '$1<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$3</span></div>');
    text = text.replace(/(<\/[^>]+>|^|\n)\s*([-*+])\s+\[x\]\s+(.+?)(?=\s*(?:<[^>]+>|$|\n))/gim, 
      '$1<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$3</span></div>');
    
    // Format 2: Boşluksuz: "*[ ] görev"
    text = text.replace(/(<\/[^>]+>|^|\n)\s*([-*+])\[\s*\]\s+(.+?)(?=\s*(?:<[^>]+>|$|\n))/gi, 
      '$1<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$3</span></div>');
    text = text.replace(/(<\/[^>]+>|^|\n)\s*([-*+])\[x\]\s+(.+?)(?=\s*(?:<[^>]+>|$|\n))/gim, 
      '$1<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$3</span></div>');
    
    // Format 3: HTML tag içindeki metin içinde: <p>- [ ] görev</p>
    text = text.replace(/<([^>]+)>([^<]*?)\s*([-*+])\s*\[\s*\]\s+(.+?)(?=\s*<)/gi, 
      '<$1>$2<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$4</span></div>');
    text = text.replace(/<([^>]+)>([^<]*?)\s*([-*+])\s*\[x\]\s+(.+?)(?=\s*<)/gim, 
      '<$1>$2<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$4</span></div>');
    
    // HTML içerikte checkbox'ları kontrol et
    // ÖNEMLİ: Kart preview için resimleri çıkarmak gerekiyor
    // Ama burada removeImages flag'i yok çünkü bu fonksiyon hem kart hem editör için kullanılıyor
    // Kart preview'da render sonrası temizleme yapılacak
    let html = processHtmlContent(text);
    
    // Eğer HTML içerikte zaten checkbox yapısı varsa (Vditor'dan geliyorsa), olduğu gibi bırak
    // Ama eğer checkbox input'ları yoksa markdown formatını işle
    if (!html.includes('class="checklist-checkbox"') && !html.includes('type="checkbox"')) {
      // HTML içerikte markdown checkbox formatını HTML'e çevir (henüz işlenmemişse)
      html = html.replace(/<p[^>]*>- \[ \](.+?)<\/p>/gi, 
        '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>');
      html = html.replace(/<p[^>]*>- \[x\](.+?)<\/p>/gi, 
        '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>');
      html = html.replace(/<p[^>]*>\*\s*\[ \](.+?)<\/p>/gi, 
        '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>');
      html = html.replace(/<p[^>]*>\*\s*\[x\](.+?)<\/p>/gi, 
        '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>');
      html = html.replace(/<br>- \[ \](.+?)(<br|<\/p>)/gi, 
        '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>$2');
      html = html.replace(/<br>- \[x\](.+?)(<br|<\/p>)/gi, 
        '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>$2');
      html = html.replace(/<br>\*\s*\[ \](.+?)(<br|<\/p>)/gi, 
        '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>$2');
      html = html.replace(/<br>\*\s*\[x\](.+?)(<br|<\/p>)/gi, 
        '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>$2');
    }
    
    return html;
  }

  // Markdown içeriği HTML'e dönüştür
  let html = text;
  
  // 0. HTML entity'lerini decode et
  html = decodeHtmlEntities(html);
  
  // Çoklu encode edilmiş entity'leri temizle
  html = html.replace(/&amp;amp;amp;nbsp;/g, '');
  html = html.replace(/&amp;amp;nbsp;/g, '');
  html = html.replace(/&amp;nbsp;/g, '');
  
  // CHECKBOX'LARI ÖNCE İŞLE (çok satırlı içerikte çalışması için)
  // Satır başındaki checkbox'lar: -, *, + destekle (boşluklu veya boşluksuz)
  // Örnek: "- [ ] görev" veya "* [ ] görev" veya "*[ ] görev"
  html = html.replace(/(^|\n)\s*[-*+]\s*\[\s*\]\s*(.+?)(\n|$)/gm,
    '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$2</span></div>');
  html = html.replace(/(^|\n)\s*[-*+]\s*\[x\]\s*(.+?)(\n|$)/gim,
    '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$2</span></div>');
  // Boşluksuz format: *[ ] görev
  html = html.replace(/(^|\n)\s*[-*+]\[\s*\]\s*(.+?)(\n|$)/gm,
    '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$2</span></div>');
  html = html.replace(/(^|\n)\s*[-*+]\[x\]\s*(.+?)(\n|$)/gim,
    '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$2</span></div>');
  
  // Debug: Console'a checkbox'ları yazdır
  if (html.includes('checklist-item')) {
    console.log('✅ Checkbox\'lar bulundu ve işlendi');
  }
  
  // 1. Tabloları geçici olarak koru (işaretleyicilerle değiştir)
  const tables = [];
  html = html.replace(/(\|[^\n]+\|[^\n]*\n)+/g, (match) => {
    const tableId = `__TABLE_PLACEHOLDER_${tables.length}__`;
    tables.push(match);
    return tableId;
  });
  
  // 2. Resimleri işle (linklerden ÖNCE, yoksa resim link olarak işlenir)
  // Markdown image syntax: ![alt](path)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;display:block;margin:8px 0;">');
  
  // 3. Linkleri işle (escapeHtml'den önce)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // 4. HTML escape et - sadece gerekli karakterler için
  // html = escapeHtml(html); // Bu satır kaldırıldı - HTML entity sorununa neden oluyordu

  // 5. Diğer markdown elementleri
  // Başlıklar (tüm seviyeleri destekle)
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  
  // Başlıklardan sonraki fazla boş satırları temizle
  html = html.replace(/(<\/h[1-6]>)\n+/g, '$1\n');
  
  // Alıntılar
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Listeler - basit regex yaklaşımı (checkbox olmayan listeler)
  // Liste satırlarını bul ve işle (checkbox olmayan satırlar)
  // ÖNEMLİ: Checkbox'lar yukarıda zaten işlendi, sadece checkbox olmayan liste satırlarını işle
  html = html.replace(/^(\s*)-\s+(.+?)$/gm, (match, indent, text) => {
    // Eğer checkbox ise işleme (zaten yukarıda işlendi, checklist-item içinde)
    // Checkbox olan satırlar artık checklist-item div'i içinde olduğu için bunları atla
    if (match.includes('checklist-item') || match.includes('checklist-checkbox')) {
      return match; // Zaten checkbox olarak işlenmiş, olduğu gibi bırak
    }
    // [ ] veya [x] içeriyorsa checkbox, işleme
    if (/\[\s*\]|\[x\]/i.test(text)) {
      return match; // Checkbox satırlarını olduğu gibi bırak (zaten yukarıda işlendi)
    }
    return '<ul><li>' + text + '</li></ul>';
  });
  
  // Ardışık </ul><ul> tag'lerini birleştir
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  // Yatay çizgiler (---) - satır sonlarından önce işle
  html = html.replace(/^---$/gm, '<hr class="custom-hr">');
  html = html.replace(/^  ---$/gm, '<hr class="custom-hr">');
  html = html.replace(/^    ---$/gm, '<hr class="custom-hr">');
  
  // Satır sonları
  html = html.replace(/\n/g, '<br>');
  
  // Ardışık <br> tag'lerini temizle (maksimum 1 boş satır)
  html = html.replace(/(<br>[\s]*){2,}/gi, '<br>');
  
  // Başlık ve liste arasındaki <br> temizle
  html = html.replace(/(<\/h[2-4]>)<br>(<ul>|<ol>)/gi, '$1$2');
  
  // Inline formatlar
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Emoji desteği - Unicode emoji'leri koru
  // Emoji'ler zaten Unicode formatında olduğu için ek işlem gerekmiyor
  
  // Etiketler ve wikilink'ler
  html = html.replace(/#([a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+)(?![^<]*>)/g, '<span class="tagtok">#$1</span>');
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink" data-link="$1">[[$1]]</span>');
  
  // SON: Tabloları geri koy ve render et
  tables.forEach((tableText, index) => {
    const tableId = `__TABLE_PLACEHOLDER_${index}__`;
    const lines = tableText.trim().split('\n').filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
    
    if (lines.length < 2) {
      html = html.replace(tableId, tableText); // Tablo değilse olduğu gibi bırak
      return;
    }
    
    let tableHtml = '<table class="md-table">';
    
    lines.forEach((line, lineIndex) => {
      const cells = line.split('|').slice(1, -1); // İlk ve son boş elementleri kaldır
      
      // İkinci satır separator ise atla
      if (lineIndex === 1 && cells.every(cell => /^[-:\s]+$/.test(cell.trim()))) {
        return;
      }
      
      tableHtml += '<tr>';
      cells.forEach(cell => {
        const cellContent = cell.trim();
        tableHtml += `<td class="md-table-cell">${cellContent}</td>`;
      });
      tableHtml += '</tr>';
    });
    
    tableHtml += '</table>';
    html = html.replace(tableId, tableHtml);
  });
  
  return html;
}

// HTML'den Markdown'a dönüştürme fonksiyonu
function htmlToMarkdown(html) {
  if (!html) return '';
  
  let markdown = html;
  
  // HTML entity'lerini decode et
  markdown = decodeHtmlEntities(markdown);
  
  // Figure table tag'larını temizle
  markdown = markdown.replace(/<figure[^>]*class="table"[^>]*>/g, '');
  markdown = markdown.replace(/<\/figure>/g, '');
  
  // Tabloları işle - önce tüm tabloları bul ve işle
  markdown = markdown.replace(/<table[^>]*>[\s\S]*?<\/table>/g, (tableMatch) => {
    // Tablo içeriğini geçici olarak sakla
    const tableContent = tableMatch;
    
    // Tablo satırlarını bul
    const rowMatches = tableContent.match(/<tr[^>]*>[\s\S]*?<\/tr>/g);
    if (!rowMatches) return '';
    
    let markdownTable = '\n';
    
    rowMatches.forEach((rowMatch, index) => {
      // Satır içindeki hücreleri bul
      const cellMatches = rowMatch.match(/<(th|td)[^>]*>[\s\S]*?<\/(th|td)>/g);
      if (!cellMatches) return;
      
      // Her hücreyi işle
      const cells = cellMatches.map(cellMatch => {
        // Hücre içeriğini al ve HTML tag'larını temizle
        const content = cellMatch.replace(/<(th|td)[^>]*>/, '').replace(/<\/(th|td)>/, '');
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return cleanContent || '&nbsp;';
      });
      
      // Markdown satırını oluştur
      markdownTable += '| ' + cells.join(' | ') + ' |\n';
      
      // İlk satırdan sonra header separator ekle
      if (index === 0) {
        const separator = '| ' + cells.map(() => '---').join(' | ') + ' |\n';
        markdownTable += separator;
      }
    });
    
    markdownTable += '\n';
    return markdownTable;
  });
  
  // Başlıkları işle
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1\n');
  
  // Paragrafları işle
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n');
  
  // Liste öğelerini işle
  markdown = markdown.replace(/<ul[^>]*>/g, '');
  markdown = markdown.replace(/<\/ul>/g, '\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n');
  
  // Numaralı listeleri işle
  markdown = markdown.replace(/<ol[^>]*>/g, '');
  markdown = markdown.replace(/<\/ol>/g, '\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/g, '1. $1\n');
  
  // Alıntıları işle - <blockquote><p>metin</p></blockquote> formatını destekle
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, (match, content) => {
    // İçerikteki <p> tag'lerini temizle ve metni al
    let cleanContent = content.replace(/<p[^>]*>(.*?)<\/p>/g, '$1').trim();
    
    // İçerikteki format tag'lerini markdown'a dönüştür
    cleanContent = cleanContent.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**');
    cleanContent = cleanContent.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**');
    cleanContent = cleanContent.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*');
    cleanContent = cleanContent.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*');
    cleanContent = cleanContent.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`');
    
    return `> ${cleanContent}\n`;
  });
  
  // Yatay çizgileri işle (HR etiketleri)
  markdown = markdown.replace(/<hr[^>]*class="custom-hr"[^>]*>/gi, '\n---\n');
  markdown = markdown.replace(/<hr[^>]*>/gi, '\n---\n');
  
  // Formatları işle
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*');
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`');
  
  // Linkleri işle
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');
  
  // Satır sonlarını temizle
  markdown = markdown.replace(/<br\s*\/?>/g, '\n');
  markdown = markdown.replace(/<div[^>]*>/g, '');
  markdown = markdown.replace(/<\/div>/g, '\n');
  
  // Tüm HTML tag'larını temizle (kalan varsa)
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Tablo formatını düzelt - artık gerekli değil çünkü yukarıda düzgün işlendi
  
  // Fazla boşlukları temizle
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
  markdown = markdown.replace(/^\s+|\s+$/g, '');
  
  return markdown;
}

// Global exports
window.decodeHtmlEntities = decodeHtmlEntities;
window.processHtmlContent = processHtmlContent;
window.renderMarkdown = renderMarkdown;
window.htmlToMarkdown = htmlToMarkdown;

