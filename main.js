console.log('🚀 [MAIN] main.js başlatıldı!');
console.log('🚀 [MAIN] Electron modülleri yüklendi!');

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('❌ [UNCAUGHT EXCEPTION]:', error);
  console.error('❌ Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [UNHANDLED REJECTION]:', reason);
  console.error('❌ Promise:', promise);
});

const { app, BrowserWindow, ipcMain, screen, Tray, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Tek instance kontrolü - uygulama ikinci kez çalıştırılırsa çık
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  console.log('⚠️ [MAIN] Igo zaten çalışıyor, yeni instance kapatılıyor.');
  app.quit();
  process.exit(0);
}

// ID oluşturma fonksiyonu
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Uygulama dizinini dinamik olarak belirle
function getAppDir() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  return isDev ? __dirname : (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath));
}

// Sistem klasörleri - bu klasörler UI'da gösterilmez
const SYSTEM_FOLDERS = ['todos', '.git', '.vscode', 'node_modules', '.media'];

// Markdown render fonksiyonu (main.js için)
function renderMarkdownMain(text) {
  if (!text) return '';

  // Markdown içeriği HTML'e dönüştür
  let html = text;
  
  // 0. HTML entity'lerini temizle
  html = html.replace(/&amp;amp;amp;nbsp;/g, '');
  html = html.replace(/&amp;amp;nbsp;/g, '');
  html = html.replace(/&amp;nbsp;/g, '');
  html = html.replace(/&nbsp;/g, '');
  
  // Tek tırnak entity'lerini decode et
  html = html.replace(/&#39;/g, "'");
  html = html.replace(/&apos;/g, "'");
  html = html.replace(/&#x27;/g, "'");
  
  // Çift encode edilmiş entity'leri decode et
  html = html.replace(/&amp;#39;/g, "'");
  html = html.replace(/&amp;quot;/g, '"');
  
  // 1. Tabloları geçici olarak koru (işaretleyicilerle değiştir)
  const tables = [];
  html = html.replace(/(\|[^\n]+\|[^\n]*\n)+/g, (match) => {
    const tableId = `__TABLE_PLACEHOLDER_${tables.length}__`;
    tables.push(match);
    return tableId;
  });
  
  // 2. Linkleri işle
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // 3. Diğer markdown elementleri
  // Başlıklar - multiline desteği ile (Vditor stilleri ile)
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 1.8em; font-weight: 700; color: #7dd3fc; margin: 16px 0 8px 0; line-height: 1.3;">$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 1.5em; font-weight: 700; color: #7dd3fc; margin: 14px 0 6px 0; line-height: 1.3;">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 1.3em; font-weight: 600; color: #e9eef5; margin: 12px 0 6px 0; line-height: 1.3;">$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size: 1.1em; font-weight: 600; color: #e9eef5; margin: 10px 0 4px 0; line-height: 1.3;">$1</h4>');
  html = html.replace(/^##### (.+)$/gm, '<h5 style="font-size: 1em; font-weight: 600; color: #9ca3af; margin: 8px 0 4px 0; line-height: 1.3;">$1</h5>');
  html = html.replace(/^###### (.+)$/gm, '<h6 style="font-size: 0.9em; font-weight: 600; color: #9ca3af; margin: 6px 0 4px 0; line-height: 1.3;">$1</h6>');
  
  // Başlıklardan sonraki fazla boş satırları temizle
  html = html.replace(/(<\/h[1-6]>)\n+/g, '$1\n');
  
  // Alıntılar
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Debug için log ekle
  
  // Yatay çizgi (Horizontal Rule) - Daha güçlü regex
    html = html.replace(/^---\s*$/gm, '<hr style="border: none; height: 2px; background: #7dd3fc; margin: 20px 0; border-radius: 1px; opacity: 0.7;">');
    html = html.replace(/^\*\*\*\s*$/gm, '<hr style="border: none; height: 2px; background: #7dd3fc; margin: 20px 0; border-radius: 1px; opacity: 0.7;">');
  
  // Debug için log ekle
  
  // Checklist (önce işle, liste ile karışmasın)
  html = html.replace(/^\s*-\s*\[\s*\]\s*(.*)$/gm, 
    '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>');
  html = html.replace(/^\s*-\s*\[x\]\s*(.*)$/gmi, 
    '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>');
  
  // Listeler - checklist'ten sonra işle
  // Liste bloklarını bul ve <ul> veya <ol> içine al
  html = html.split('\n').map((line, i, arr) => {
    // Checklist zaten işlenmiş mi kontrol et
    if (line.includes('<div class="checklist-item">')) {
      return line; // Checklist'i atla
    }
    
    // Numaralı liste kontrolü
    const isNumberedItem = /^\s*(\d+)\.\s+(.+)$/.test(line);
    const prevIsNumberedItem = i > 0 && /^\s*(\d+)\.\s+/.test(arr[i-1]);
    const nextIsNumberedItem = i < arr.length-1 && /^\s*(\d+)\.\s+/.test(arr[i+1]);
    
    if (isNumberedItem) {
      const content = line.replace(/^\s*(\d+)\.\s+(.+)$/, '$2');
      let result = `<li class="numbered">${content}</li>`;
      if (!prevIsNumberedItem) result = '<ol>' + result; // Liste başlangıcı
      if (!nextIsNumberedItem) result = result + '</ol>'; // Liste bitişi
      return result;
    }
    
    // Nokta liste kontrolü (sadece "-" ile başlayanlar)
    const isBulletItem = /^\s*-\s+(.+)$/.test(line);
    
    if (isBulletItem) {
      // Önceki liste öğesini bul (boş satırları atla)
      let prevIsBulletItem = false;
      for (let j = i - 1; j >= 0; j--) {
        if (arr[j].trim() === '') continue; // Boş satırı atla
        prevIsBulletItem = /^\s*-\s+/.test(arr[j]) && !arr[j].includes('<div class="checklist-item">');
        break;
      }
      
      // Sonraki liste öğesini bul (boş satırları atla)
      let nextIsBulletItem = false;
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[j].trim() === '') continue; // Boş satırı atla
        nextIsBulletItem = /^\s*-\s+/.test(arr[j]) && !arr[j].includes('<div class="checklist-item">');
        break;
      }
      
      const content = line.replace(/^\s*-\s+(.+)$/, '$1');
      let result = `<li class="bullet">${content}</li>`;
      if (!prevIsBulletItem) result = '<ul>' + result; // Liste başlangıcı
      if (!nextIsBulletItem) result = result + '</ul>'; // Liste bitişi
      return result;
    }
    
    return line;
  }).join('\n');
  
  // Satır sonları
  html = html.replace(/\n/g, '<br>');
  
  // Ardışık <br> tag'lerini temizle (maksimum 1 boş satır)
  html = html.replace(/(<br>[\s]*){2,}/gi, '<br>');
  
  // Başlık ve liste arasındaki <br> temizle
  html = html.replace(/(<\/h[1-6]>)<br>(<ul>|<ol>)/gi, '$1$2');
  
  // Inline formatlar
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
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

let mainWindow = null;
let orbWindow = null;

app.on('second-instance', (event, commandLine, workingDirectory) => {
  console.log('ℹ️ [MAIN] İkinci instance denemesi algılandı.');
  event.preventDefault();

  try {
    if (orbWindow && !orbWindow.isDestroyed()) {
      orbWindow.show();
      orbWindow.focus();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  } catch (error) {
    console.error('❌ [MAIN] second-instance işleminde hata:', error);
  }
});
let tray = null;

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Kaydedilmiş pozisyonu yükle
  const fs = require('fs');
  const settingsPath = path.join(getAppDir(), 'settings.json');
  let settings = {};
  let widgetRect = null;
  
  try {
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      console.log('📁 Settings dosyası başarıyla okundu:', settings);
      widgetRect = settings.widget_rect;
    }
  } catch (e) {
    console.log('⚠️ Settings dosyası okunamadı:', e.message);
  }
  
  // Kaydedilmiş pozisyon varsa kullan, yoksa varsayılan (sağ alt köşe)
  const defaultX = width - 1020;
  const defaultY = height - 720;
  const windowX = widgetRect ? widgetRect.x : defaultX;
  const windowY = widgetRect ? widgetRect.y : defaultY;
  
  console.log('📍 Widget başlangıç pozisyonu:', { x: windowX, y: windowY, saved: !!widgetRect });
  
  // Widget başlangıçta gizli olacak, bu yüzden pozisyonu ekran dışına taşı
  // Kaydedilmiş pozisyonu sakla, ama başlangıçta ekran dışında başlat
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    x: -2000, // Başlangıçta ekran dışında - gizli olduğu için
    y: -2000, // Başlangıçta ekran dışında - gizli olduğu için
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      // GPU hızlandırma için
      offscreen: false,
      backgroundThrottling: false
    },
    show: false, // Başlangıçta gizli - anında açılma için
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: true,
    // Render optimizasyonu
    opacity: 1.0
  });
  
  // Kaydedilmiş pozisyonu sakla - açıldığında kullanılacak
  mainWindow._savedPosition = { x: windowX, y: windowY };
  
  // F11 tuşunu engelle - before-input-event ile
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11') {
      event.preventDefault();
      console.log('🚫 F11 tuşu engellendi - sadece buton kullanın');
    }
  });

  mainWindow.loadFile('nebula_canvas_desktop_widget_edition_html.html');
  
  mainWindow.once('ready-to-show', () => {
    console.log('Widget penceresi hazır (ekran dışında)');
    
    // localStorage'dan Always on Top ayarını oku ve uygula
    try {
      const fs = require('fs');
      const path = require('path');
      const appDir = getAppDir();
      const settingsPath = path.join(appDir, 'settings.json');
      
      let shouldBeAlwaysOnTop = true; // Varsayılan değer
      
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);
        shouldBeAlwaysOnTop = settings.alwaysOnTop !== undefined ? settings.alwaysOnTop : true;
      }
      
      // Widget'ı ayarlara göre en üstte tut - orb'tan daha düşük seviyede
      mainWindow.setAlwaysOnTop(shouldBeAlwaysOnTop, 'pop-up');
      console.log('🔝 Widget Always on Top ayarı uygulandı:', shouldBeAlwaysOnTop);
      
    } catch (error) {
      console.error('❌ Always on Top ayarı yüklenemedi, varsayılan kullanılıyor:', error);
    }
    
    // Widget drag tracking'i ayarla
    setupWidgetDragTracking();
    
    // Widget başlangıçta ekran dışında - hızlı açılma için hazır
  });
  
  // Window resize event'lerini dinle - board boyutunu güncelle
  mainWindow.on('resize', () => {
    if (mainWindow && mainWindow.isVisible()) {
      setTimeout(() => {
        mainWindow.webContents.send('window-resized');
      }, 100);
    }
  });
  
  // Widget monitörler arası taşındığında alwaysOnTop seviyesini koru
  // Flicker'ı önlemek için debounce kullan
  let moveTimeout;
  mainWindow.on('move', () => {
    if (mainWindow && mainWindow.isVisible()) {
      // Önceki timeout'u temizle
      if (moveTimeout) {
        clearTimeout(moveTimeout);
      }
      
      // Hareket bittiğinde seviyeleri ayarla
      moveTimeout = setTimeout(() => {
        // Orb'ın seviyesini koru - widget'tan üstte kalması için
        if (orbWindow) {
          orbWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      }, 100); // 100ms bekle - hareket bitince ayarla
    }
  });
  
  // Widget'a focus geldiğinde orb'ın seviyesini koru (flicker'ı önlemek için debounce)
  let focusTimeout;
  mainWindow.on('focus', () => {
    if (orbWindow) {
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      focusTimeout = setTimeout(() => {
        // Orb seviyesi korunuyor
      }, 50);
    }
  });
  
  // Widget'a mouse ile tıklandığında orb'ın seviyesini koru (flicker'ı önlemek için debounce)
  let clickTimeout;
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'mouseDown') {
      if (orbWindow) {
        if (clickTimeout) {
          clearTimeout(clickTimeout);
        }
        clickTimeout = setTimeout(() => {
          // Orb seviyesi korunuyor
        }, 50);
      }
    }
  });
  
  mainWindow.on('close', (event) => {
    // Widget çarpıdan kapatıldığında orb'a bildir
    console.log('Widget çarpıdan kapatılıyor');
    
    // Orb'a widget'ın kapandığını bildir
    if (orbWindow) {
      orbWindow.webContents.send('widget-closed');
    }
    
    // Widget'ı gizle ama kapatma
    event.preventDefault();
    mainWindow.hide();
    mainWindow.setPosition(-2000, -2000); // Ekran dışına taşı
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createOrbWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  orbWindow = new BrowserWindow({
    width: 180,
    height: 180,
    x: width - 120,
    y: height - 120,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  orbWindow.loadFile('orb.html');
  
  // Orb'dan gelen console.log'ları yakala
  orbWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[ORB] ${message}`);
  });
  
  orbWindow.once('ready-to-show', () => {
    console.log('Orb penceresi hazır');
    
    // Orb'ı en üstte tut - widget'tan da üstte
    // orbWindow.setAlwaysOnTop(true, 'screen-saver'); // Gereksiz - sadece gerektiğinde ayarlanacak
    
    // Sadece orb alanında mouse eventi kabul et, geri kalanını yok say
    orbWindow.setIgnoreMouseEvents(true, { forward: true });
    
    orbWindow.show();
    
    // Orb'a başlangıç widget durumunu gönder - daha erken gönder
    // İlk önce DOMContentLoaded'ı bekle, sonra durumu gönder
    orbWindow.webContents.once('dom-ready', () => {
      // Hemen gönder - gecikme yok
      if (mainWindow) {
        const isWidgetVisible = mainWindow.isVisible();
        console.log(`Orb'a başlangıç durumu gönderiliyor: ${isWidgetVisible ? 'açık' : 'kapalı'}`);
        orbWindow.webContents.send(isWidgetVisible ? 'widget-opened' : 'widget-closed');
      } else {
        // MainWindow henuz olusturulmadiysa kapali olarak gonder
        console.log('Orb\'a baslangic durumu gonderiliyor: kapali (mainWindow henuz yok)');
        orbWindow.webContents.send('widget-closed');
      }
    });
    
    // Ayrıca did-finish-load event'inde de gönder (daha güvenilir) - hemen gönder
    orbWindow.webContents.once('did-finish-load', () => {
      if (mainWindow && !orbWindow.webContents.isDestroyed()) {
        const isWidgetVisible = mainWindow.isVisible();
        console.log(`Orb'a başlangıç durumu gönderiliyor (did-finish-load): ${isWidgetVisible ? 'açık' : 'kapalı'}`);
        orbWindow.webContents.send(isWidgetVisible ? 'widget-opened' : 'widget-closed');
      } else if (!mainWindow && !orbWindow.webContents.isDestroyed()) {
        console.log('Orb\'a baslangic durumu gonderiliyor (did-finish-load): kapali (mainWindow henuz yok)');
        orbWindow.webContents.send('widget-closed');
      }
    });
  });

  orbWindow.on('closed', () => {
    orbWindow = null;
  });
}

function createTray() {
  // Development ve production path'leri
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  let iconPaths = [];
  
  if (isDev) {
    // Development modda
    iconPaths = [
      path.join(__dirname, 'icon.png'),
      path.join(__dirname, 'assets', 'icon-64.png'),
      path.join(__dirname, 'assets', 'icon-128.png'),
      path.join(__dirname, 'assets', 'icon-256.png'),
      path.join(__dirname, 'assets', 'icon.ico')
    ];
  } else {
    // Production modda (packaged app)
    const resourcesPath = process.resourcesPath;
    iconPaths = [
      path.join(__dirname, 'icon.png'),
      path.join(resourcesPath, 'assets', 'icon-64.png'),
      path.join(resourcesPath, 'assets', 'icon-128.png'),
      path.join(resourcesPath, 'assets', 'icon-256.png'),
      path.join(resourcesPath, 'assets', 'icon.ico')
    ];
  }
  
  const fs = require('fs');
  let iconPath = null;
  
  // İlk mevcut icon'u bul
  for (const testPath of iconPaths) {
    console.log('Icon test ediliyor:', testPath);
    if (fs.existsSync(testPath)) {
      iconPath = testPath;
      break;
    }
  }
  
  try {
    if (iconPath) {
      tray = new Tray(iconPath);
      console.log('Tray icon yüklendi:', iconPath);
    } else {
      // Fallback: 16x16 basit icon oluştur
      const { nativeImage } = require('electron');
      const image = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFCSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sLwcJCG1sL');
      tray = new Tray(image);
      console.log('Fallback tray icon kullanılıyor');
    }
  } catch (error) {
    console.log('Tray icon yüklenemedi:', error.message);
    const { nativeImage } = require('electron');
    const image = nativeImage.createEmpty();
    tray = new Tray(image);
  }
  
  // Tray context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Orb\'u Göster',
      click: () => {
        if (orbWindow) {
          orbWindow.show();
        }
      }
    },
    {
      label: 'Widget\'ı Aç/Kapat',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        console.log('Tray\'den çıkış - uygulamayı tamamen kapatıyor');
        if (tray) {
          tray.destroy();
          tray = null;
        }
        // Tüm pencereleri kapat
        if (mainWindow) {
          mainWindow.destroy();
          mainWindow = null;
        }
        if (orbWindow) {
          orbWindow.destroy();
          orbWindow = null;
        }
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Igo Desktop Widget');
  
  // Tray'e çift tıklayınca orb'u göster
  tray.on('double-click', () => {
    if (orbWindow) {
      orbWindow.show();
    }
  });
}

app.whenReady().then(() => {
  console.log('Electron uygulaması başlatılıyor...');
  createMainWindow();
  console.log('Widget penceresi oluşturuldu (gizli)');
  createOrbWindow();
  console.log('Orb penceresi oluşturuldu');
  createTray();
  console.log('System tray oluşturuldu');
  
  // Notes klasörünü başlangıçta tara ve mevcut dosyaları yükle
  console.log('📁 Notes klasörü başlangıçta taranıyor...');
  scanNotesFolderOnStartup(); // Anında başlat - gecikme yok
});

app.on('window-all-closed', () => {
  // Tray uygulaması olduğu için window'lar kapandığında app'i kapatma
  // Sadece user explicit olarak quit ederse kapansın
  console.log('Tüm pencereler kapatıldı - arka planda devam ediyor');
});

// Uygulama kapatılmadan önce renderer process'e kaydetme sinyali gönder
app.on('before-quit', (event) => {
  console.log('🔄 Uygulama kapatılıyor, veriler kaydediliyor...');
  
  // İlk kez çağrıldığında kapanmayı engelle
  if (!app.isQuiting) {
    event.preventDefault();
    app.isQuiting = true;
    
    // Renderer process'e kaydetme sinyali gönder
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('save-before-quit');
      
      // Kısa bir süre bekle ki kaydetme işlemi tamamlansın
      setTimeout(() => {
        console.log('✅ Veriler kaydedildi, uygulama kapatılıyor');
        app.quit(); // Gerçek kapanma
      }, 300);
    } else {
      app.quit();
    }
  }
});

// Ctrl+C (SIGINT) ve SIGTERM sinyallerini yakala
process.on('SIGINT', () => {
  console.log('🔄 SIGINT sinyali alındı (Ctrl+C), veriler kaydediliyor...');
  
  // before-quit event'ini tetikle
  if (!app.isQuiting) {
    app.isQuiting = true;
    
    // Renderer process'e kaydetme sinyali gönder
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('save-before-quit');
      
      // Kısa bir süre bekle ki kaydetme işlemi tamamlansın
      setTimeout(() => {
        console.log('✅ Veriler kaydedildi, uygulama kapatılıyor');
        app.quit();
      }, 300);
    } else {
      app.quit();
    }
  }
});

process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM sinyali alındı, veriler kaydediliyor...');
  
  // before-quit event'ini tetikle
  if (!app.isQuiting) {
    app.isQuiting = true;
    
    // Renderer process'e kaydetme sinyali gönder
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('save-before-quit');
      
      // Kısa bir süre bekle ki kaydetme işlemi tamamlansın
      setTimeout(() => {
        console.log('✅ Veriler kaydedildi, uygulama kapatılıyor');
        app.quit();
      }, 300);
    } else {
      app.quit();
    }
  }
});

app.on('activate', () => {
  // macOS'ta dock icon'a tıklandığında
  if (process.platform === 'darwin') {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createOrbWindow();
    }
  }
});

// IPC event handlers
console.log('🔧 [MAIN] toggle-widget handler tanımlandı');
// Widget'ı açmak için özel handler - ilk tıklamada kullanılır
ipcMain.on('open-widget', () => {
  console.log('🎯 [MAIN] open-widget handler çağrıldı!');
  if (mainWindow) {
    // Widget'ın pozisyonunu kontrol et - ekran dışındaysa aç
    const currentPos = mainWindow.getPosition();
    if (currentPos[0] > -1000 && mainWindow.isVisible()) {
      // Widget zaten ekran içinde ve görünür - bir şey yapma
      console.log('Widget zaten açık (pozisyon ve görünürlük kontrolü) - bir şey yapılmıyor');
      return;
    }
    
    // Widget ekran dışında veya gizli - aç
    console.log('Widget açılıyor (open-widget)');
    
    // Önce widget'ı göster - pozisyon ayarlamadan önce (daha hızlı)
    mainWindow.show();
    
    // Kaydedilmiş pozisyonu yükle (öncelikle window'un sakladığı pozisyon)
    let widgetRect = null;
    if (mainWindow._savedPosition) {
      widgetRect = mainWindow._savedPosition;
      console.log('📁 Kaydedilmiş pozisyon window\'dan yüklendi:', widgetRect);
    } else {
      // Settings dosyasından yükle (senkron ama hızlı)
      const fs = require('fs');
      const settingsPath = path.join(getAppDir(), 'settings.json');
      try {
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          widgetRect = settings.widget_rect;
        }
      } catch (e) {
        // Hata durumunda varsayılan kullanılacak
      }
    }
    
    // Kaydedilmiş pozisyon varsa kullan, yoksa varsayılan
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const finalRect = widgetRect || { x: width - 1020, y: height - 720, width: 1000, height: 700 };
    mainWindow.setPosition(finalRect.x, finalRect.y);
    
    // Widget'ı ayarlara göre en üstte tut (varsayılan true - hızlı)
    try {
      mainWindow.setAlwaysOnTop(true, 'pop-up');
    } catch (error) {
      // Hata durumunda devam et
    }
    
    mainWindow.focus();
    
    // Orb'a da widget'ın açıldığını bildir - hemen gönder
    if (orbWindow && !orbWindow.webContents.isDestroyed()) {
      orbWindow.webContents.send('widget-opened');
      console.log('📤 Orb\'a widget-opened mesajı gönderildi');
    }
    
    // Renderer'a bildir
    mainWindow.webContents.send('main-window-shown');
    
    // Always on Top ayarını sonra güncelle (asenkron - widget zaten açık)
    setTimeout(() => {
      try {
        const fs = require('fs');
        const settingsPath = path.join(getAppDir(), 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          const shouldBeAlwaysOnTop = settings.alwaysOnTop !== undefined ? settings.alwaysOnTop : true;
          mainWindow.setAlwaysOnTop(shouldBeAlwaysOnTop, 'pop-up');
          console.log('🔝 Widget açılırken Always on Top ayarı uygulandı:', shouldBeAlwaysOnTop);
        }
      } catch (error) {
        // Hata durumunda varsayılan zaten uygulandı
      }
    }, 0);
  } else {
    console.log('Widget penceresi yok, yeniden oluşturuluyor');
    createMainWindow();
    // Yeni pencere oluşturulduktan sonra widget'ı aç
    setTimeout(() => {
      if (mainWindow) {
        // Widget'ı açmak için aynı kodu çalıştır
        const fs = require('fs');
        const settingsPath = path.join(getAppDir(), 'settings.json');
        let settings = {};
        try {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
          const { width, height } = screen.getPrimaryDisplay().workAreaSize;
          settings.widget_rect = { x: width - 1020, y: height - 720, width: 1000, height: 700 };
        }
        
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        const widgetRect = settings.widget_rect || { x: width - 1020, y: height - 720, width: 1000, height: 700 };
        mainWindow.setPosition(widgetRect.x, widgetRect.y);
        
        try {
          let shouldBeAlwaysOnTop = settings.alwaysOnTop !== undefined ? settings.alwaysOnTop : true;
          mainWindow.setAlwaysOnTop(shouldBeAlwaysOnTop, 'pop-up');
        } catch (error) {
          console.error('❌ Always on Top ayarı yüklenemedi:', error);
        }
        
        mainWindow.show();
        mainWindow.focus();
        
        if (orbWindow) {
          orbWindow.webContents.send('widget-opened');
        }
        mainWindow.webContents.send('main-window-shown');
      }
    }, 500);
  }
});

ipcMain.on('toggle-widget', () => {
  console.log('🎯 [MAIN] toggle-widget handler çağrıldı!');
  if (mainWindow) {
    if (mainWindow.getPosition()[0] > -1000) { // Ekran içindeyse
      console.log('Widget kapatılıyor');
      
      // Mevcut pozisyonu kaydet
      const currentPos = mainWindow.getPosition();
      const currentSize = mainWindow.getSize();
      const fs = require('fs');
      const settingsPath = path.join(getAppDir(), 'settings.json');
      
      let settings = {};
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        // Dosya yoksa yeni oluştur
      }
      
      settings.widget_rect = {
        x: currentPos[0],
        y: currentPos[1],
        width: currentSize[0],
        height: currentSize[1]
      };
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log('📍 Widget pozisyonu kaydedildi:', settings.widget_rect);
      
      mainWindow.setPosition(-2000, -2000); // Ekran dışına taşı
      mainWindow.webContents.send('main-window-hidden');
      
      // Orb'a da widget'ın kapandığını bildir
      if (orbWindow) {
        orbWindow.webContents.send('widget-closed');
      }
    } else {
      console.log('Widget açılıyor');
      
      // Kaydedilmiş pozisyonu yükle
      const fs = require('fs');
      const settingsPath = path.join(getAppDir(), 'settings.json');
      let settings = {};
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        console.log('📁 Settings dosyası başarıyla okundu:', settings);
      } catch (e) {
        console.log('⚠️ Settings dosyası okunamadı:', e.message);
        // Varsayılan pozisyon
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        settings.widget_rect = { x: width - 1020, y: height - 720, width: 1000, height: 700 };
      }
      
      // Kaydedilmiş pozisyon varsa kullan, yoksa varsayılan
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      const widgetRect = settings.widget_rect || { x: width - 1020, y: height - 720, width: 1000, height: 700 };
      mainWindow.setPosition(widgetRect.x, widgetRect.y);
      
      // Widget'ı ayarlara göre en üstte tut
      try {
        let shouldBeAlwaysOnTop = true; // Varsayılan değer
        
        console.log('🔍 [toggle-widget] Settings dosyasından okunan alwaysOnTop:', settings.alwaysOnTop);
        
        if (settings.alwaysOnTop !== undefined) {
          shouldBeAlwaysOnTop = settings.alwaysOnTop;
          console.log('✅ [toggle-widget] Settings\'den alwaysOnTop değeri alındı:', shouldBeAlwaysOnTop);
        } else {
          console.log('⚠️ [toggle-widget] Settings\'de alwaysOnTop bulunamadı, varsayılan kullanılıyor:', shouldBeAlwaysOnTop);
        }
        
        mainWindow.setAlwaysOnTop(shouldBeAlwaysOnTop, 'pop-up');
        console.log('🔝 Widget açılırken Always on Top ayarı uygulandı:', shouldBeAlwaysOnTop);
        
        // Widget'ın gerçek durumunu kontrol et
        setTimeout(() => {
          const actualStatus = mainWindow.isAlwaysOnTop();
          console.log('🔍 Widget\'ın gerçek Always on Top durumu:', actualStatus);
        }, 100);
        
        // Widget'ın gerçek durumunu kontrol et
        setTimeout(() => {
          const actualStatus = mainWindow.isAlwaysOnTop();
          console.log('🔍 Widget\'ın gerçek Always on Top durumu:', actualStatus);
        }, 100);
        
      } catch (error) {
        console.error('❌ Always on Top ayarı yüklenemedi, varsayılan kullanılıyor:', error);
      }
      
      mainWindow.show(); // Widget'ı göster
      mainWindow.focus();
      
      // Orb'ın seviyesini koru - widget'tan üstte kalması için (flicker'ı önlemek için debounce)
      if (orbWindow) {
        setTimeout(() => {
          // Orb seviyesi korunuyor
        }, 100);
      }
      
      // Anında mesaj gönder - setImmediate kaldırıldı
      mainWindow.webContents.send('main-window-shown');
      
      // Orb'a da widget'ın açıldığını bildir
      if (orbWindow) {
        orbWindow.webContents.send('widget-opened');
      }
    }
  } else {
    console.log('Widget penceresi yok, yeniden oluşturuluyor');
    createMainWindow();
    // Yeni pencerede drag tracking'i ayarla
    setTimeout(() => {
      setupWidgetDragTracking();
    }, 1000);
  }
});

// Orb penceresi hareket ettir
ipcMain.on('move-orb', (event, deltaX, deltaY) => {
  if (orbWindow) {
    const [currentX, currentY] = orbWindow.getPosition();
    orbWindow.setPosition(currentX + deltaX, currentY + deltaY);
  }
});

// Widget manuel drag - Header butonlarından drag için
// Bu handler sadece widget'i taşır, render optimizasyonu YAPMAZ
// Render optimizasyonu sadece `.drag` elementinden drag başladığında (will-move event'inde) yapılır
ipcMain.on('move-widget', (event, deltaX, deltaY) => {
  if (mainWindow) {
    // Widget'i taşı - render optimizasyonu YAPMA
    // Header butonlarından drag başladığında board render'ı durmamalı
    const [currentX, currentY] = mainWindow.getPosition();
    mainWindow.setPosition(currentX + deltaX, currentY + deltaY);
  }
});

// Widget drag bittiğinde durumu temizle
ipcMain.on('widget-drag-ended', () => {
  if (widgetIsDragging) {
    widgetIsDragging = false;
    if (mainWindow) {
      mainWindow.webContents.send('widget-drag-stopped');
    }
    // Orb'a da widget drag bitti mesajını gönder
    if (orbWindow) {
      orbWindow.webContents.send('widget-drag-stopped');
    }
  }
});

// Mouseup event'i için global listener - KALDIRILDI
// Header butonlarından drag için bu handler'a gerek yok
// Render optimizasyonu sadece will-move event'inde (header drag area'dan) yapılır
// ipcMain.on('widget-drag-mouseup', () => { ... });

// Tam ekran toggle - manuel durum takibi
let beforeFullscreenBounds = null;
let isCurrentlyFullscreen = false; // Manuel flag
let fullscreenDebounce = null;

ipcMain.on('toggle-fullscreen', (event) => {
  if (mainWindow) {
    // Debounce - çok hızlı tıklamaları engelle
    if (fullscreenDebounce) {
      clearTimeout(fullscreenDebounce);
    }
    
    fullscreenDebounce = setTimeout(() => {
      console.log(`🔍 Manuel tam ekran durumu: ${isCurrentlyFullscreen}`);
      
      if (!isCurrentlyFullscreen) {
        // Tam ekrana geç
        beforeFullscreenBounds = mainWindow.getBounds();
        console.log(`📦 Kaydedilen boyut: ${beforeFullscreenBounds.width}x${beforeFullscreenBounds.height}`);
        mainWindow.setFullScreen(true);
        isCurrentlyFullscreen = true;
        console.log(`🔳 Tam ekran: AÇIK`);
        
        // Board boyutunu güncelle - tam ekran modunda
        setTimeout(() => {
          mainWindow.webContents.send('window-resized');
        }, 100);
      } else {
        // Tam ekrandan çık
        mainWindow.setFullScreen(false);
        isCurrentlyFullscreen = false;
        console.log(`🔳 Tam ekran: KAPALI`);
        
        if (beforeFullscreenBounds) {
          // Önceki boyut ve pozisyona geri dön
          setTimeout(() => {
            mainWindow.setBounds(beforeFullscreenBounds);
            console.log(`📦 Eski boyuta döndü: ${beforeFullscreenBounds.width}x${beforeFullscreenBounds.height}`);
            beforeFullscreenBounds = null;
            
            // Board boyutunu güncelle - normal modda
            setTimeout(() => {
              mainWindow.webContents.send('window-resized');
            }, 100);
          }, 50);
        }
      }
    }, 50); // Hızlı geçiş için debounce azaltıldı
  }
});

// Mouse ignore kontrolü - Widget drag durumunu takip et
let widgetIsDragging = false;

// Widget drag durumunu takip et - mainWindow oluşturulduktan sonra
function setupWidgetDragTracking() {
  if (mainWindow) {
    // Widget drag başladığında ve bittiğinde render optimizasyonu
    let dragEndTimer = null;
    
    mainWindow.on('will-move', () => {
      if (!widgetIsDragging) {
        widgetIsDragging = true;
        console.log('Widget hareket etmeye başladı - orb devre dışı');
        
        // Widget içine drag başladı mesajı gönder
        mainWindow.webContents.send('widget-drag-started');
        
        // Orb'ı tamamen devre dışı bırak ve gizle
        if (orbWindow) {
          orbWindow.webContents.send('widget-drag-started');
          orbWindow.hide();
        }
      }
      
      // Drag end timer'ı iptal et
      if (dragEndTimer) {
        clearTimeout(dragEndTimer);
        dragEndTimer = null;
      }
    });
    
    mainWindow.on('moved', () => {
      // Hareket bittiğinde biraz bekle ve orb'ı tekrar aktif et
      if (dragEndTimer) {
        clearTimeout(dragEndTimer);
      }
      
      dragEndTimer = setTimeout(() => {
        if (widgetIsDragging) {
          widgetIsDragging = false;
          console.log('Widget hareket bitti - orb aktif');
          
          // Widget içine drag bitti mesajı gönder
          mainWindow.webContents.send('widget-drag-stopped');
          
          // Orb'ı tekrar göster ve aktif et
          if (orbWindow) {
            orbWindow.webContents.send('widget-drag-stopped');
            orbWindow.show();
            orbWindow.setIgnoreMouseEvents(true, { forward: true });
          }
        }
        dragEndTimer = null;
      }, 150); // 150ms bekle - flash'ı önlemek için biraz daha uzun
    });
  }
}

ipcMain.on('orb-mouse-enter', () => {
  if (orbWindow) {
    // Widget drag aktif olsa bile orb'un mouse event'lerini aktif tut
    // Çünkü header butonlarından drag başladığında orb'a da tıklanabilir olmalı
    orbWindow.setIgnoreMouseEvents(false); // Mouse eventi kabul et
    console.log('Orb mouse event\'leri aktif' + (widgetIsDragging ? ' (widget drag aktif ama orb aktif)' : ''));
  }
});

ipcMain.on('orb-mouse-leave', () => {
  if (orbWindow) {
    // Widget drag aktif değilse normal davranış
    // Widget drag aktifse bile orb'un mouse event'lerini aktif tut (header butonlarından drag için)
    if (!widgetIsDragging) {
      orbWindow.setIgnoreMouseEvents(true, { forward: true }); // Mouse eventi yok say
      console.log('Orb mouse event\'leri devre dışı');
    } else {
      // Widget drag aktif ama orb'un mouse event'lerini aktif tut
      orbWindow.setIgnoreMouseEvents(false);
      console.log('Orb mouse event\'leri aktif (widget drag sırasında)');
    }
  }
});

// Widget drag durumu mesajları - kaldırıldı, artık gerek yok

ipcMain.on('toggle-main-window', () => {
  console.log('🔧 Widget\'dan toggle çağrıldı');
  if (mainWindow) {
    if (mainWindow.getPosition()[0] > -1000) { // Ekran içindeyse (toggle-widget ile aynı mantık)
      console.log('🔧 Widget kapatılıyor');
      
      // Mevcut pozisyonu kaydet
      const currentPos = mainWindow.getPosition();
      const currentSize = mainWindow.getSize();
      const fs = require('fs');
      const settingsPath = path.join(getAppDir(), 'settings.json');
      
      let settings = {};
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        // Dosya yoksa yeni oluştur
      }
      
      settings.widget_rect = {
        x: currentPos[0],
        y: currentPos[1],
        width: currentSize[0],
        height: currentSize[1]
      };
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log('📍 Widget pozisyonu kaydedildi:', settings.widget_rect);
      
      mainWindow.setPosition(-2000, -2000); // Ekran dışına taşı
      mainWindow.webContents.send('main-window-hidden');
      
      // Orb'a da widget'ın kapandığını bildir
      if (orbWindow) {
        console.log('🔧 Orb\'a widget-closed mesajı gönderiliyor');
        orbWindow.webContents.send('widget-closed');
      } else {
        console.log('❌ Orb window bulunamadı');
      }
    } else {
      console.log('Widget açılıyor');
      
      // Kaydedilmiş pozisyonu yükle
      const fs = require('fs');
      const settingsPath = path.join(getAppDir(), 'settings.json');
      let settings = {};
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        console.log('📁 Settings dosyası başarıyla okundu:', settings);
      } catch (e) {
        console.log('⚠️ Settings dosyası okunamadı:', e.message);
        // Varsayılan pozisyon
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        settings.widget_rect = { x: width - 1020, y: height - 720, width: 1000, height: 700 };
      }
      
      // Kaydedilmiş pozisyon varsa kullan, yoksa varsayılan
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      const widgetRect = settings.widget_rect || { x: width - 1020, y: height - 720, width: 1000, height: 700 };
      mainWindow.setPosition(widgetRect.x, widgetRect.y);
      
      // Widget'ı ayarlara göre en üstte tut
      try {
        let shouldBeAlwaysOnTop = true; // Varsayılan değer
        
        console.log('🔍 [toggle-widget] Settings dosyasından okunan alwaysOnTop:', settings.alwaysOnTop);
        
        if (settings.alwaysOnTop !== undefined) {
          shouldBeAlwaysOnTop = settings.alwaysOnTop;
          console.log('✅ [toggle-widget] Settings\'den alwaysOnTop değeri alındı:', shouldBeAlwaysOnTop);
        } else {
          console.log('⚠️ [toggle-widget] Settings\'de alwaysOnTop bulunamadı, varsayılan kullanılıyor:', shouldBeAlwaysOnTop);
        }
        
        mainWindow.setAlwaysOnTop(shouldBeAlwaysOnTop, 'pop-up');
        console.log('🔝 Widget açılırken Always on Top ayarı uygulandı:', shouldBeAlwaysOnTop);
        
        // Widget'ın gerçek durumunu kontrol et
        setTimeout(() => {
          const actualStatus = mainWindow.isAlwaysOnTop();
          console.log('🔍 Widget\'ın gerçek Always on Top durumu:', actualStatus);
        }, 100);
        
        // Widget'ın gerçek durumunu kontrol et
        setTimeout(() => {
          const actualStatus = mainWindow.isAlwaysOnTop();
          console.log('🔍 Widget\'ın gerçek Always on Top durumu:', actualStatus);
        }, 100);
        
      } catch (error) {
        console.error('❌ Always on Top ayarı yüklenemedi, varsayılan kullanılıyor:', error);
      }
      
      mainWindow.show(); // Widget'ı göster
      mainWindow.focus();
      
      // Orb'ın seviyesini koru - widget'tan üstte kalması için (flicker'ı önlemek için debounce)
      if (orbWindow) {
        setTimeout(() => {
          // Orb seviyesi korunuyor
        }, 100);
      }
      
      // Anında mesaj gönder - setImmediate kaldırıldı
      mainWindow.webContents.send('main-window-shown');
      
      // Orb'a da widget'ın açıldığını bildir
      if (orbWindow) {
        orbWindow.webContents.send('widget-opened');
      }
    }
  } else {
    console.log('Widget penceresi yok, yeniden oluşturuluyor');
    createMainWindow();
    // Yeni pencerede drag tracking'i ayarla
    setTimeout(() => {
      setupWidgetDragTracking();
    }, 1000);
  }
});

ipcMain.on('close-main-window', () => {
  if (mainWindow) {
    mainWindow.hide();
    
    // Orb'a da widget'ın kapandığını bildir
    if (orbWindow) {
      orbWindow.webContents.send('widget-closed');
    }
  }
});

// Widget durumu kontrolü - kaldırıldı çünkü gereksiz mesaj gönderiyor

ipcMain.on('save-orb-position', (event, position) => {
  // Orb pozisyonunu kaydet
  const fs = require('fs');
  const settingsPath = path.join(__dirname, 'settings.json');
  
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    // Dosya yoksa yeni oluştur
  }
  
  settings.orb_pos = position;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
});

ipcMain.on('save-widget-position', (event, position) => {
  // Widget pozisyonunu kaydet
  const fs = require('fs');
  const settingsPath = path.join(__dirname, 'settings.json');
  
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    // Dosya yoksa yeni oluştur
  }
  
  settings.widget_rect = position;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
});

ipcMain.on('load-settings', (event) => {
  // Ayarları yükle
  const fs = require('fs');
  const settingsPath = path.join(__dirname, 'settings.json');
  
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    // Varsayılan ayarlar
    settings = {
      orb_pos: { x: 100, y: 100 },
      widget_rect: { x: 200, y: 200, width: 980, height: 640 }
    };
  }
  
  event.reply('settings-loaded', settings);
});

// Klasör oluşturma - İç içe klasör desteği ile
ipcMain.on('create-folder', (event, folderData) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  
  // Notes klasörünü oluştur
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  
  // Parent klasör yolunu oluştur
  let folderPath;
  if (folderData.parentPath) {
    // Alt klasör oluştur
    folderPath = path.join(notesDir, folderData.parentPath, folderData.name.replace(/[<>:"/\\|?*]/g, '_'));
  } else {
    // Ana klasör oluştur
    folderPath = path.join(notesDir, folderData.name.replace(/[<>:"/\\|?*]/g, '_'));
  }
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log('📁 Klasör oluşturuldu:', folderPath);
    event.reply('folder-created', { success: true, folderPath: folderPath });
  } else {
    event.reply('folder-created', { success: false, error: 'Klasör zaten mevcut' });
  }
});

// Always on top durumunu alma
ipcMain.handle('get-always-on-top', () => {
  try {
    // Settings.json'dan oku
    const settingsPath = path.join(getAppDir(), 'settings.json');
    
    let settings = {};
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      // Dosya yoksa varsayılan
    }
    
    let shouldBeAlwaysOnTop = true; // Varsayılan değer
    if (settings.alwaysOnTop !== undefined) {
      shouldBeAlwaysOnTop = settings.alwaysOnTop;
    }
    
    console.log('🔝 Always on top durumu (settings.json\'dan):', shouldBeAlwaysOnTop);
    return shouldBeAlwaysOnTop;
  } catch (error) {
    console.error('❌ Always on top durumu alınamadı:', error);
    return true; // Varsayılan
  }
});

// Always on top ayarlama
ipcMain.handle('set-always-on-top', (event, enabled) => {
  console.log('🎯 [MAIN] set-always-on-top handler çağrıldı!', enabled);
  try {
    mainWindow.setAlwaysOnTop(enabled);
    console.log('🔝 Always on top ayarlandı:', enabled);
    
    // Ayarları dosyaya kaydet
    try {
      const fs = require('fs');
      const path = require('path');
      const appDir = getAppDir();
      const settingsPath = path.join(appDir, 'settings.json');
      
      const settings = { alwaysOnTop: enabled };
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log('💾 Always on Top ayarı dosyaya kaydedildi:', enabled);
    } catch (saveError) {
      console.error('❌ Ayar dosyaya kaydedilemedi:', saveError);
    }
    
    return { success: true, enabled: enabled };
  } catch (error) {
    console.error('❌ Always on top ayarlanamadı:', error);
    return { success: false, error: error.message };
  }
});

// Widget'a focus ver
ipcMain.on('focus-widget', () => {
  console.log('🔍 Widget\'a focus veriliyor');
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.focus();
    // Always on top ayarını yeniden uygula
    try {
      const fs = require('fs');
      const path = require('path');
      const appDir = getAppDir();
      const settingsPath = path.join(appDir, 'settings.json');
      
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);
        const shouldBeAlwaysOnTop = settings.alwaysOnTop !== undefined ? settings.alwaysOnTop : true;
        mainWindow.setAlwaysOnTop(shouldBeAlwaysOnTop, 'pop-up');
        console.log('🔝 Widget focus sonrası Always on Top ayarı yeniden uygulandı:', shouldBeAlwaysOnTop);
      }
    } catch (error) {
      console.error('❌ Always on Top ayarı yüklenemedi:', error);
    }
  }
});


// Klasör listesi alma - İç içe klasör desteği ile
ipcMain.handle('get-folder-list', () => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  
  try {
    if (!fs.existsSync(notesDir)) {
      return [];
    }
    
    const folders = [];
    
    // Recursive olarak tüm klasörleri tara
    function scanDirectory(dirPath, relativePath = '') {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Sistem klasörlerini hariç tut
          if (!SYSTEM_FOLDERS.includes(item)) {
            // Klasör bilgisini ekle
            folders.push({
              name: item,
              path: itemRelativePath,
              fullPath: itemPath,
              level: relativePath.split(path.sep).length
            });
            
            // Alt klasörleri recursive olarak tara
            scanDirectory(itemPath, itemRelativePath);
          }
        }
      });
    }
    
    scanDirectory(notesDir);
    
    console.log('📁 Klasör listesi döndürüldü:', folders);
    return folders;
  } catch (error) {
    console.error('❌ Klasör listesi alınamadı:', error);
    return [];
  }
});

// Klasör yapısını alma - Hiyerarşik yapı ile
ipcMain.handle('get-folder-structure', () => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  
  try {
    if (!fs.existsSync(notesDir)) {
      return [];
    }
    
    // Recursive olarak klasör yapısını oluştur
    function buildFolderStructure(dirPath, relativePath = '') {
      const items = fs.readdirSync(dirPath);
      const result = [];
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Sistem klasörlerini hariç tut
          if (!SYSTEM_FOLDERS.includes(item)) {
            // Klasör ID'sini oluştur - path bazlı (aynı isimde alt klasör ve ana klasör çakışmasını önle)
            // Relative path kullanarak benzersiz ID oluştur
            const pathForId = itemRelativePath ? itemRelativePath.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') : item.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            const folderId = pathForId || item.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            
            const folder = {
              id: folderId,
              name: item,
              path: itemRelativePath,
              type: 'folder',
              children: buildFolderStructure(itemPath, itemRelativePath)
            };
            
            result.push(folder);
          }
        }
      });
      
      return result;
    }
    
    const folderStructure = buildFolderStructure(notesDir);
    console.log('📁 Klasör yapısı döndürüldü:', folderStructure);
    return folderStructure;
  } catch (error) {
    console.error('❌ Klasör yapısı alınamadı:', error);
    return [];
  }
});

// Klasör yeniden adlandırma
ipcMain.on('rename-folder', (event, folderData) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  const { oldName, newName, parentPath } = folderData;
  
  // Alt klasör için tam path kullan
  let oldPath, newPath;
  if (parentPath && parentPath !== oldName) {
    // Alt klasör için: parentPath/oldName -> parentPath/newName
    oldPath = path.join(notesDir, parentPath.replace(/[<>:"/\\|?*]/g, '_'), oldName.replace(/[<>:"/\\|?*]/g, '_'));
    newPath = path.join(notesDir, parentPath.replace(/[<>:"/\\|?*]/g, '_'), newName.replace(/[<>:"/\\|?*]/g, '_'));
  } else {
    // Ana klasör için
    oldPath = path.join(notesDir, oldName.replace(/[<>:"/\\|?*]/g, '_'));
    newPath = path.join(notesDir, newName.replace(/[<>:"/\\|?*]/g, '_'));
  }
  
  console.log('🔍 Klasör yeniden adlandırma:', { oldPath, newPath, parentPath });
  
  try {
    if (fs.existsSync(oldPath)) {
      // Yeni isimde klasör zaten varsa hata ver
      if (fs.existsSync(newPath)) {
        event.reply('folder-renamed', { success: false, error: 'Bu isimde klasör zaten mevcut' });
        return;
      }
      
      // Klasörü yeniden adlandır
      fs.renameSync(oldPath, newPath);
      
      // Ana klasör yeniden adlandırıldığında alt klasörlerin path'lerini güncelle
      if (!parentPath) { // Ana klasör ise
        console.log('📁 Ana klasör yeniden adlandırıldı, alt klasörler güncelleniyor...');
        
        // Alt klasörleri bul ve yeniden adlandır
        const subFolders = fs.readdirSync(newPath).filter(item => {
          const itemPath = path.join(newPath, item);
          return fs.statSync(itemPath).isDirectory();
        });
        
        subFolders.forEach(subFolderName => {
          const oldSubPath = path.join(newPath, subFolderName);
          const newSubPath = path.join(newPath, subFolderName); // Alt klasör adı değişmiyor, sadece parent path güncelleniyor
          
          // Alt klasördeki dosyaların relativePath'lerini güncelle
          const subFiles = fs.readdirSync(oldSubPath).filter(file => 
            file.endsWith('.md') || file.endsWith('.txt')
          );
          
          subFiles.forEach(file => {
            const filePath = path.join(oldSubPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Dosya içeriğindeki relativePath referanslarını güncelle
            // Eski ana klasör adını yeni ana klasör adıyla değiştir
            const oldFolderNameEscaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const relativePathRegex = new RegExp(`(${oldFolderNameEscaped}/)`, 'g');
            const updatedContent = content.replace(relativePathRegex, `${newName}/`);
            
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`📝 Alt klasör dosyası güncellendi: ${subFolderName}/${file}`);
          });
        });
      }
      
      // Klasördeki tüm dosyaların metadata'sını güncelle
      const files = fs.readdirSync(newPath);
      files.forEach(file => {
        if (file.endsWith('.md') || file.endsWith('.txt')) {
          const filePath = path.join(newPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Yeni klasör ID'sini oluştur
          const newFolderId = newName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
          
          let updatedContent = content;
          
          if (file.endsWith('.txt')) {
            // TXT dosyaları için HTML comment formatını kullan
            updatedContent = updatedContent.replace(
              /<!-- Klasör ID: .+? -->/,
              `<!-- Klasör ID: ${newFolderId} -->`
            );
          } else {
            // MD dosyaları için * formatını kullan
            updatedContent = updatedContent.replace(
              /\*Klasör ID: .+?\*/,
              `*Klasör ID: ${newFolderId}*`
            );
          }
          
          // Dosya içeriğindeki relativePath referanslarını güncelle
          // Eski klasör adını yeni klasör adıyla değiştir
          const oldFolderNameEscaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const relativePathRegex = new RegExp(`(${oldFolderNameEscaped}/)`, 'g');
          updatedContent = updatedContent.replace(relativePathRegex, `${newName}/`);
          
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          console.log(`📝 Dosya metadata güncellendi: ${file}`);
        }
      });
      
      console.log('📝 Klasör yeniden adlandırıldı:', oldName, '→', newName);
      event.reply('folder-renamed', { success: true, newName: newName });
    } else {
      event.reply('folder-renamed', { success: false, error: 'Klasör bulunamadı' });
    }
  } catch (error) {
    console.error('❌ Klasör yeniden adlandırılamadı:', error);
    event.reply('folder-renamed', { success: false, error: error.message });
  }
});

// Klasör silme
ipcMain.on('delete-folder', (event, folderData) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  
  console.log('🗑️ Klasör silme isteği:', folderData);
  console.log('🔍 Silme işlemi detayları:', {
    name: folderData.name,
    path: folderData.path,
    normalizedPath: folderData.path ? folderData.path.replace(/\\/g, '/') : null
  });
  
  try {
    // Recursive olarak klasörü bul ve sil
    function findAndDeleteFolder(dirPath, targetFolderName, targetPath = null) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Eğer targetPath varsa ve bu path'e uyuyorsa sil
          if (targetPath) {
            const relativePath = path.relative(notesDir, itemPath);
            const normalizedRelativePath = relativePath.replace(/\\/g, '/');
            console.log('🔍 Karşılaştırma:', normalizedRelativePath, '===', targetPath);
            if (normalizedRelativePath === targetPath) {
              return deleteFolderRecursive(itemPath);
            }
          } else if (item === targetFolderName) {
            // Ana klasör için sadece isim kontrolü
            return deleteFolderRecursive(itemPath);
          }
          
          // Alt klasörleri recursive olarak ara
          const result = findAndDeleteFolder(itemPath, targetFolderName, targetPath);
          if (result) return result;
        }
      }
      return false;
    }
    
    function deleteFolderRecursive(folderPath) {
      console.log('🗑️ Klasör siliniyor:', folderPath);
      
      // Klasördeki tüm dosyaları ve alt klasörleri işle
      const items = fs.readdirSync(folderPath);
      items.forEach(item => {
        const itemPath = path.join(folderPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Alt klasör ise bir üst seviyeye taşı
          console.log('📁 Alt klasör bir üst seviyeye taşınıyor:', itemPath);
          const newFolderPath = path.join(notesDir, item);
          
          // Alt klasörü taşı
          fs.renameSync(itemPath, newFolderPath);
          console.log('📁 Alt klasör taşındı:', item);
        } else if (item.endsWith('.md') || item.endsWith('.txt')) {
          // Dosya ise ana klasöre taşı
          const newPath = path.join(notesDir, item);
          
          // Dosyayı taşı
          fs.renameSync(itemPath, newPath);
          
          // Dosya içeriğindeki klasör ID'sini null yap
          const content = fs.readFileSync(newPath, 'utf8');
          let updatedContent;
          if (item.endsWith('.txt')) {
            updatedContent = content.replace(
              /<!-- Klasör ID: .+? -->/,
              '<!-- Klasör ID: null -->'
            );
          } else {
            updatedContent = content.replace(
              /\*Klasör ID: .+?\*/,
              '*Klasör ID: null*'
            );
          }
          fs.writeFileSync(newPath, updatedContent, 'utf8');
          console.log('📁 Dosya taşındı:', item);
        }
      });
      
      // Boş klasörü sil
      fs.rmdirSync(folderPath);
      console.log('✅ Klasör silindi:', folderPath);
      return true;
    }
    
    // Alt klasörler için tam path kullan
    let deleted = false;
    if (folderData.path && folderData.path !== folderData.name) {
      // Path'i normalize et (backslash ve forward slash'leri düzelt)
      const normalizedPath = folderData.path.replace(/\\/g, '/');
      console.log('🔍 Normalize edilmiş path:', normalizedPath);
      deleted = findAndDeleteFolder(notesDir, folderData.name, normalizedPath);
    } else {
      // Ana klasör için sadece isim
      deleted = findAndDeleteFolder(notesDir, folderData.name);
    }
    
    if (deleted) {
      event.reply('folder-deleted', { success: true });
    } else {
      event.reply('folder-deleted', { success: false, error: 'Klasör bulunamadı' });
    }
  } catch (error) {
    console.error('❌ Klasör silinemedi:', error);
    event.reply('folder-deleted', { success: false, error: error.message });
  }
});

// Notu klasöre taşıma - Geliştirilmiş versiyon
ipcMain.handle('move-note-to-folder', async (event, data) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  const { noteId, folderId, folderName } = data;
  
  try {
    // Recursive olarak tüm alt klasörleri tara ve dosyayı bul
    function findNoteFile(dirPath, targetNoteId) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Sistem klasörlerini hariç tut
          if (!SYSTEM_FOLDERS.includes(item)) {
            // Alt klasörü recursive olarak tara
            const result = findNoteFile(itemPath, targetNoteId);
            if (result) return result;
          }
        } else if (stat.isFile() && (item.endsWith('.md') || item.endsWith('.txt'))) {
          // Dosyayı kontrol et
          try {
            const content = fs.readFileSync(itemPath, 'utf8');
            
                     // Hem MD hem TXT formatlarını kontrol et
                     const mdFormat = content.includes(`*Not ID: ${targetNoteId}*`);
                     const txtFormatOld = content.includes(`// Not ID: ${targetNoteId}`);
                     const txtFormatNew = content.includes(`<!-- Not ID: ${targetNoteId} -->`);

                     if (mdFormat || txtFormatOld || txtFormatNew) {
              return { filePath: itemPath, fileName: item, relativePath: path.relative(notesDir, itemPath) };
            }
          } catch (readError) {
            console.log('⚠️ Dosya okunamadı:', itemPath);
          }
        }
      }
      return null;
    }
    
    const noteFileInfo = findNoteFile(notesDir, noteId);
    
    if (noteFileInfo) {
      const { filePath: oldPath, fileName, relativePath } = noteFileInfo;
      
      if (folderId && folderName) {
        // Klasöre taşı - önce mevcut klasör yapısını kontrol et
        let folderPath;
        
        // Önce ana notes klasöründe klasör adını ara
        const mainFolderPath = path.join(notesDir, folderName.replace(/[<>:"/\\|?*]/g, '_'));
        
        if (fs.existsSync(mainFolderPath)) {
          // Ana klasörde bulundu
          folderPath = mainFolderPath;
        } else {
          // Ana klasörde bulunamadı, alt klasörlerde ara
          let foundPath = null;
          
          function searchInSubfolders(dirPath) {
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
              const itemPath = path.join(dirPath, item);
              const stat = fs.statSync(itemPath);
              
              if (stat.isDirectory()) {
                // Bu klasörün adı hedef klasör adıyla eşleşiyor mu?
                if (item === folderName.replace(/[<>:"/\\|?*]/g, '_')) {
                  foundPath = itemPath;
                  return;
                }
                // Alt klasörlerde ara
                searchInSubfolders(itemPath);
                if (foundPath) return;
              }
            }
          }
          
          searchInSubfolders(notesDir);
          
          if (foundPath) {
            folderPath = foundPath;
          } else {
            // Hiçbir yerde bulunamadı, ana klasörde oluştur
            folderPath = mainFolderPath;
            fs.mkdirSync(folderPath, { recursive: true });
          }
        }
        
        const newPath = path.join(folderPath, fileName);
        
        // Dosya zaten hedef klasördeyse işlem yapma
        if (path.dirname(oldPath) === folderPath) {
          console.log('📁 Not zaten hedef klasörde:', fileName);
          return { success: true };
        }
        
        fs.renameSync(oldPath, newPath);
        
        // Dosya içeriğindeki klasör ID'sini güncelle
        const simpleFolderId = folderName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const content = fs.readFileSync(newPath, 'utf8');
        
                 let updatedContent;
                 if (fileName.endsWith('.txt')) {
                   // TXT dosyaları için HTML comment formatını kullan
                   updatedContent = content.replace(
                     /<!-- Klasör ID: .+? -->/,
                     `<!-- Klasör ID: ${simpleFolderId} -->`
                   );

                   // Eğer klasör ID metadata'sı yoksa ekle
                   if (!updatedContent.includes('<!-- Klasör ID:')) {
                     updatedContent = updatedContent.replace(
                       /<!-- METADATA_END -->$/m,
                       `<!-- Klasör ID: ${simpleFolderId} -->\n<!-- METADATA_END -->`
                     );
                   }
                 } else {
          // MD dosyaları için * formatını kullan
          updatedContent = content.replace(
            /\*Klasör ID: .+?\*/,
            `*Klasör ID: ${simpleFolderId}*`
          );
          
          // Eğer klasör ID metadata'sı yoksa ekle
          if (!updatedContent.includes('*Klasör ID:')) {
            updatedContent += `\n*Klasör ID: ${simpleFolderId}*`;
          }
        }
        
        fs.writeFileSync(newPath, updatedContent, 'utf8');
        
        // Yeni relative path'i hesapla ve döndür
        const newRelativePath = path.relative(notesDir, newPath);
        
        console.log('📁 Not klasöre taşındı:', fileName, '→', folderName);
        return { 
          success: true, 
          newRelativePath: newRelativePath,
          newFileName: fileName
        };
      } else {
        // Klasörsüz yap - ana notes klasörüne taşı
        const newPath = path.join(notesDir, fileName);
        
                 // Dosya zaten ana klasördeyse sadece metadata'yı güncelle
                 if (path.dirname(oldPath) === notesDir) {
                   const content = fs.readFileSync(oldPath, 'utf8');

                   let updatedContent;
                   if (fileName.endsWith('.txt')) {
                     // TXT dosyaları için HTML comment formatını kullan
                     updatedContent = content.replace(
                       /<!-- Klasör ID: .+? -->/,
                       '<!-- Klasör ID: null -->'
                     );
                   } else {
            // MD dosyaları için * formatını kullan
            updatedContent = content.replace(
              /\*Klasör ID: .+?\*/,
              '*Klasör ID: null*'
            );
          }
          
          fs.writeFileSync(oldPath, updatedContent, 'utf8');
        } else {
          // Dosyayı ana klasöre taşı
          fs.renameSync(oldPath, newPath);
          
                   // Metadata'yı güncelle
                   const content = fs.readFileSync(newPath, 'utf8');

                   let updatedContent;
                   if (fileName.endsWith('.txt')) {
                     // TXT dosyaları için HTML comment formatını kullan
                     updatedContent = content.replace(
                       /<!-- Klasör ID: .+? -->/,
                       '<!-- Klasör ID: null -->'
                     );
                   } else {
            // MD dosyaları için * formatını kullan
            updatedContent = content.replace(
              /\*Klasör ID: .+?\*/,
              '*Klasör ID: null*'
            );
          }
          
          fs.writeFileSync(newPath, updatedContent, 'utf8');
        }
        
        // Yeni relative path'i hesapla ve döndür
        const newRelativePath = path.relative(notesDir, newPath);
        
        console.log('📁 Not klasörsüz yapıldı:', fileName);
        return { 
          success: true, 
          newRelativePath: newRelativePath,
          newFileName: fileName
        };
      }
    } else {
      return { success: false, error: 'Not dosyası bulunamadı' };
    }
  } catch (error) {
    console.error('❌ Not taşınamadı:', error);
    return { success: false, error: error.message };
  }
});

// Dosya sistemi IPC handlers

// Notes klasöründeki değişiklikleri izle - Geliştirilmiş versiyon
let notesWatcher = null;
function startNotesWatcher() {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  
  if (fs.existsSync(notesDir)) {
    // Recursive olarak tüm alt klasörleri izle
    function watchDirectory(dirPath) {
      try {
        const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
          if (filename && (filename.endsWith('.md') || filename.endsWith('.txt'))) {
            console.log('📁 Notes klasöründe değişiklik:', eventType, filename);
            
            // Renderer process'e dosya değişikliği bildir
            const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
              mainWindow.webContents.send('notes-folder-changed', {
                eventType: eventType,
                filename: filename,
                timestamp: Date.now()
              });
            }
          }
        });
        
        console.log('👀 Klasör izleme başlatıldı:', dirPath);
        return watcher;
      } catch (error) {
        console.error('❌ Klasör izlenemedi:', dirPath, error);
        return null;
      }
    }
    
    notesWatcher = watchDirectory(notesDir);
    console.log('👀 Notes klasörü izleme başlatıldı (recursive)');
  }
}

// Uygulama başladığında izlemeyi başlat
startNotesWatcher();

// HTML etiketlerini temizle ve düz metne çevir
function cleanHtmlToText(html) {
  if (!html) return '';
  
  // Önce blockquote'ları markdown formatına çevir
  let text = html
    .replace(/<blockquote[^>]*>/gi, '> ')  // <blockquote> açılış etiketini "> " çevir
    .replace(/<\/blockquote>/gi, '\n\n')   // </blockquote> kapanış etiketini çift satır sonuna çevir
    .replace(/<hr[^>]*class="custom-hr"[^>]*>/gi, '\n---\n')  // Vditor hr etiketlerini "---" çizgisine çevir
    .replace(/<hr[^>]*>/gi, '\n---\n')     // Diğer <hr> etiketlerini "---" çizgisine çevir
    .replace(/<br\s*\/?>/gi, '\n')         // <br> etiketlerini satır sonuna çevir
    .replace(/<p[^>]*>/gi, '')             // <p> açılış etiketlerini kaldır
    .replace(/<\/p>/gi, '\n\n')            // </p> kapanış etiketlerini çift satır sonuna çevir
    .replace(/<div[^>]*>/gi, '')           // <div> açılış etiketlerini kaldır
    .replace(/<\/div>/gi, '\n')            // </div> kapanış etiketlerini satır sonuna çevir
    .replace(/<ul[^>]*>/gi, '')            // <ul> açılış etiketlerini kaldır
    .replace(/<\/ul>/gi, '\n')             // </ul> kapanış etiketlerini satır sonuna çevir
    .replace(/<ol[^>]*>/gi, '')            // <ol> açılış etiketlerini kaldır
    .replace(/<\/ol>/gi, '\n')             // </ol> kapanış etiketlerini satır sonuna çevir
    .replace(/<li[^>]*>/gi, '• ')          // <li> etiketlerini bullet point'e çevir
    .replace(/<\/li>/gi, '\n')             // </li> kapanış etiketlerini satır sonuna çevir
    .replace(/&nbsp;/gi, ' ')              // &nbsp; karakterlerini boşluğa çevir
    .replace(/&amp;/gi, '&')               // &amp; karakterlerini & çevir
    .replace(/&lt;/gi, '<')                // &lt; karakterlerini < çevir
    .replace(/&gt;/gi, '>')                // &gt; karakterlerini > çevir
    .replace(/&quot;/gi, '"')              // &quot; karakterlerini " çevir
    .replace(/&#39;/gi, "'")               // &#39; karakterlerini ' çevir
    .replace(/&apos;/gi, "'")              // &apos; karakterlerini ' çevir
    .replace(/&#x27;/gi, "'")              // &#x27; karakterlerini ' çevir
    .replace(/&amp;#39;/gi, "'")          // &amp;#39; karakterlerini ' çevir (çift encode)
    .replace(/&amp;quot;/gi, '"')         // &amp;quot; karakterlerini " çevir (çift encode)
    .replace(/<[^>]*>/g, '')               // Kalan tüm HTML etiketlerini kaldır
    .replace(/\n\s*\n\s*\n/g, '\n\n')      // Çoklu satır sonlarını çift satır sonuna çevir
    .replace(/> \n> /g, '> ')              // Çoklu satır blockquote'ları düzelt
    .trim();                               // Başta ve sonda boşlukları kaldır
  
  return text;
}

ipcMain.on('save-note-to-file', (event, data) => {
  // Data kontrolü
  if (!data || typeof data !== 'object') {
    console.error('❌ save-note-to-file: Geçersiz data parametresi:', data);
    event.reply('note-saved-to-file', { success: false, error: 'Geçersiz data parametresi' });
    return;
  }
  
  try {
    const fs = require('fs');
    const appDir = getAppDir();
    const notesDir = path.join(appDir, 'notes');
  
    // Notes klasörünü oluştur
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true });
      console.log('📁 Notes klasörü oluşturuldu:', notesDir);
    }
    
    const { note, fileName, oldFileName } = data;
    
    // Dosya yolunu belirle
    let newFilePath;
    let oldFilePath = null;
    
    // Önce eski dosyanın yolunu bul (eğer varsa)
    if (oldFileName) {
      if (note.relativePath) {
        // Eski relativePath'i kullan
        oldFilePath = path.join(notesDir, note.relativePath);
      } else if (note.filePath) {
        // Eski filePath'i kullan
        oldFilePath = note.filePath;
      } else {
        // Sadece dosya adı varsa notes dizininde ara
        oldFilePath = path.join(notesDir, oldFileName);
      }
    }
    
    // Yeni dosya yolunu belirle
    if (note.folderId) {
      // Klasör içindeyse, klasör yolunu kullan
      // Path bazlı ID kullan - klasör yapısından klasör adını bul
      let folderPath = null;
      
      // Klasör yapısını recursive olarak ara
      function findFolderPath(dirPath, targetId, currentPath = '') {
        if (!fs.existsSync(dirPath)) return null;
        
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory() && !SYSTEM_FOLDERS.includes(item)) {
            // Klasör ID'sini oluştur (get-folder-structure ile aynı mantık)
            const itemRelativePath = currentPath ? path.join(currentPath, item).replace(/\\/g, '/') : item;
            const pathForId = itemRelativePath.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
            const folderId = pathForId || item.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            
            // Eşleşme kontrolü - path bazlı ID
            if (folderId === targetId || folderId === targetId.replace(/[^a-zA-Z0-9_]/g, '_')) {
              return itemPath; // Klasör adını path olarak döndür
            }
            
            // Eski format uyumluluk: Klasör adı ile direkt eşleşme
            // Eğer targetId klasör adı ise (eski notlar için)
            const normalizedTargetId = (targetId || '').toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_');
            const normalizedTargetIdASCII = (targetId || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const normalizedItemName = item.toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_');
            const normalizedItemNameASCII = item.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            
            // Direkt klasör adı eşleşmesi (eski format: "sonra", "ncelikli" vb.)
            if (targetId === item || targetId === item.toLowerCase()) {
              return itemPath;
            }
            
            // Normalize edilmiş eşleşme
            if (normalizedTargetId === normalizedItemName || normalizedTargetIdASCII === normalizedItemNameASCII) {
              return itemPath;
            }
            
            // Türkçe karakter kaybı durumu: "ncelikli" → "öncelikli"
            const itemLettersOnlyASCII = item.toLowerCase().replace(/[^a-z]/g, '');
            const targetIdLettersOnlyASCII = (targetId || '').toLowerCase().replace(/[^a-z]/g, '');
            if (targetIdLettersOnlyASCII && itemLettersOnlyASCII) {
              // Başta 1 karakter kaybı durumu
              if (itemLettersOnlyASCII.length === targetIdLettersOnlyASCII.length + 1 && 
                  itemLettersOnlyASCII.endsWith(targetIdLettersOnlyASCII)) {
                return itemPath;
              }
            }
            
            // Alt klasörleri ara
            const found = findFolderPath(itemPath, targetId, itemRelativePath);
            if (found) return found;
          }
        }
        return null;
      }
      
      folderPath = findFolderPath(notesDir, note.folderId);
      
      // Klasör bulunamadıysa, eski format için ek kontroller yap
      if (!folderPath) {
        // ID'den klasör adını çıkarmaya çalış (son kısımdan)
        const parts = note.folderId.split('_');
        if (parts.length > 0) {
          // Son parçayı klasör adı olarak dene
          const possibleFolderName = parts[parts.length - 1];
          const possiblePath = path.join(notesDir, possibleFolderName);
          if (fs.existsSync(possiblePath)) {
            folderPath = possiblePath;
          }
        }
        
        // Hala bulunamadıysa, tüm klasörleri tarayarak eşleşme ara (eski format)
        if (!folderPath && fs.existsSync(notesDir)) {
          const allItems = fs.readdirSync(notesDir);
          for (const item of allItems) {
            const itemPath = path.join(notesDir, item);
            const itemStat = fs.statSync(itemPath);
            if (itemStat.isDirectory() && !SYSTEM_FOLDERS.includes(item)) {
              // Klasör adı ile direkt eşleşme (eski format)
              const normalizedTargetId = (note.folderId || '').toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_');
              const normalizedItemName = item.toLowerCase().replace(/[^a-z0-9_ğüşiöçı]/g, '_');
              const normalizedTargetIdASCII = (note.folderId || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
              const normalizedItemNameASCII = item.toLowerCase().replace(/[^a-z0-9_]/g, '_');
              
              if (note.folderId === item || 
                  note.folderId === item.toLowerCase() ||
                  normalizedTargetId === normalizedItemName ||
                  normalizedTargetIdASCII === normalizedItemNameASCII) {
                folderPath = itemPath;
                break;
              }
              
              // Türkçe karakter kaybı durumu
              const itemLettersOnlyASCII = item.toLowerCase().replace(/[^a-z]/g, '');
              const targetIdLettersOnlyASCII = (note.folderId || '').toLowerCase().replace(/[^a-z]/g, '');
              if (targetIdLettersOnlyASCII && itemLettersOnlyASCII) {
                if (itemLettersOnlyASCII.length === targetIdLettersOnlyASCII.length + 1 && 
                    itemLettersOnlyASCII.endsWith(targetIdLettersOnlyASCII)) {
                  folderPath = itemPath;
                  break;
                }
              }
            }
          }
        }
        
        // Hala bulunamadıysa - YENİ KLASÖR OLUŞTURMA YOK
        // Notu ana klasöre kaydet veya hata ver
        if (!folderPath) {
          console.log(`⚠️ UYARI: Klasör ID'ye göre klasör bulunamadı: "${note.folderId}". Not ana klasöre kaydediliyor.`);
          console.log(`⚠️ Mevcut klasörler:`, fs.readdirSync(notesDir).filter(item => {
            const itemPath = path.join(notesDir, item);
            return fs.statSync(itemPath).isDirectory() && !SYSTEM_FOLDERS.includes(item);
          }));
          // Klasör bulunamadı, notu ana klasöre kaydet ve folderId'yi null yap
          folderPath = null; // Ana klasör
          // Not: folderPath null ise, aşağıdaki else bloğu çalışacak ve ana klasöre kaydedecek
        }
      }
      
      // Klasör bulundu, dosyayı kaydet
      // Klasörü oluşturma - SADECE GERÇEKTEN VARSA VE YOKSA
      if (folderPath && !fs.existsSync(folderPath)) {
        // Klasör bulundu ama yoksa - bu durum olmamalı ama yine de kontrol et
        console.log(`⚠️ UYARI: Klasör path'i bulundu ama klasör yok: ${folderPath}`);
        // Yeni klasör oluşturma - BU ÇOK TEHLİKELİ! Sadece gerçekten gerekliyse
        // Şimdilik dosyayı ana klasöre kaydet
        console.log(`⚠️ Klasör oluşturma atlandı, not ana klasöre kaydediliyor.`);
        folderPath = null; // Ana klasöre kaydet
      }
      
      // Klasör bulunduysa oraya, yoksa ana klasöre kaydet
      if (folderPath) {
      newFilePath = path.join(folderPath, fileName);
      } else {
        // Klasör bulunamadı, notu ana klasöre kaydet ve folderId'yi null yap
        newFilePath = path.join(notesDir, fileName);
        // Not: Bu durumda notun folderId'si de null olmalı
        // Ama bu renderer tarafında yapılmalı, burada sadece dosyayı kaydediyoruz
      }
    } else if (note.relativePath) {
      // Relative path varsa ve klasör değilse, relativePath'i güncelle
      // Eğer dosya adı değiştiyse, relativePath'teki dosya adını güncelle
      const dirPath = path.dirname(path.join(notesDir, note.relativePath));
      newFilePath = path.join(dirPath, fileName);
    } else {
      // Yeni dosya için direkt notes klasörüne kaydet
      newFilePath = path.join(notesDir, fileName);
    }
    
    // Eski dosyayı sil (eğer varsa ve yeni dosyadan farklıysa)
    if (oldFilePath && oldFilePath !== newFilePath && fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
        console.log('🗑️ Eski dosya silindi:', oldFilePath);
      } catch (error) {
        console.error('⚠️ Eski dosya silinemedi:', error);
      }
    }
    
    // Markdown içeriği varsa kullan, yoksa HTML'i temizle
    let contentToSave;
    if (note.markdownContent) {
      contentToSave = note.markdownContent;
      console.log('📝 Markdown içeriği kullanılıyor');
    } else {
      contentToSave = cleanHtmlToText(note.text);
      console.log('📝 HTML içeriği temizleniyor');
    }
    
    // Dosya içeriğini oluştur (uzantıya göre)
    let fileContent = '';
    if (fileName.endsWith('.txt')) {
      // .txt dosyaları için içerik + metadata (HTML comment formatı)
      fileContent = `${contentToSave}

<!-- METADATA_START -->
<!-- Oluşturulma: ${new Date(note.createdAt).toLocaleString('tr-TR')} -->
<!-- Son güncelleme: ${new Date(note.updatedAt).toLocaleString('tr-TR')} -->
<!-- Not ID: ${note.id} -->
<!-- Klasör ID: ${note.folderId ? note.folderId : 'null'} -->
<!-- METADATA_END -->`;
    } else {
      // .md dosyaları için markdown format
      // Mevcut dosya varsa metadata'yı koru ve güncelle
      let existingMetadata = '';
      let createdAtStr = new Date(note.createdAt).toLocaleString('tr-TR');
      
      // note.filePath yoksa relativePath'ten oluştur
      let actualFilePath = note.filePath;
      if (!actualFilePath && note.relativePath) {
        actualFilePath = path.join(notesDir, note.relativePath);
      }
      
      if (actualFilePath && fs.existsSync(actualFilePath)) {
        try {
          const existingContent = fs.readFileSync(actualFilePath, 'utf8');
          // Mevcut metadata'yı bul
          const metadataMatch = existingContent.match(/---\n\*Oluşturulma: (.+?)\*\n\*Son güncelleme:.*?\*\n\*Not ID:.*?\*\n\*Klasör ID:.*?\*\n(?:---)?$/s);
          if (metadataMatch) {
            // Oluşturulma tarihini koru
            createdAtStr = metadataMatch[1];
            console.log('✅ Mevcut metadata bulundu, oluşturulma tarihi korunuyor:', createdAtStr);
          }
        } catch (e) {
          console.log('⚠️ Mevcut dosya okunamadı, yeni metadata oluşturulacak');
        }
      }
      
      // İçerikte zaten başlık varsa tekrar ekleme
      const hasTitle = contentToSave.trim().startsWith('# ');
      const titleLine = hasTitle ? '' : `# ${note.title}\n\n`;
      const finalContent = hasTitle ? contentToSave : contentToSave;
      
      fileContent = `${titleLine}${finalContent}

---
*Oluşturulma: ${createdAtStr}*
*Son güncelleme: ${new Date(note.updatedAt).toLocaleString('tr-TR')}*
*Not ID: ${note.id}*
*Klasör ID: ${note.folderId ? note.folderId : 'null'}*
`;
    }

    // Dosyayı kaydet
    fs.writeFileSync(newFilePath, fileContent, 'utf8');
    console.log('💾 Dosya kaydedildi:', newFilePath);
    
    // Yeni relative path'i hesapla
    const newRelativePath = path.relative(notesDir, newFilePath);
    const normalizedRelativePath = newRelativePath.replace(/\\/g, '/');
    
    // Başarılı yanıt gönder
    event.reply('note-saved-to-file', { 
      success: true, 
      filePath: newFilePath,
      newRelativePath: normalizedRelativePath,
      newFileName: fileName
    });
  } catch (error) {
    console.error('❌ Not dosyaya kaydedilemedi:', error);
    event.reply('note-saved-to-file', { success: false, error: error.message });
  }
});

// App dizinini al (renderer'dan) - Async handler
ipcMain.handle('get-app-dir', async (event) => {
  try {
    const appDir = getAppDir();
    return { success: true, appDir: appDir };
  } catch (error) {
    console.error('❌ get-app-dir hatası:', error);
    return { success: false, error: error.message };
  }
});

// App dizinini al (renderer'dan) - Sync handler (kart render için)
ipcMain.on('get-app-dir-sync', (event) => {
  try {
    const appDir = getAppDir();
    event.returnValue = { success: true, appDir: appDir };
  } catch (error) {
    console.error('❌ get-app-dir-sync hatası:', error);
    event.returnValue = { success: false, error: error.message };
  }
});

// Yüklenen dosyaları (resim/ses) kaydet
ipcMain.handle('save-uploaded-file', async (event, data) => {
  try {
    // Data kontrolü
    if (!data || typeof data !== 'object') {
      console.error('❌ save-uploaded-file: Geçersiz data parametresi:', data);
      return { success: false, error: 'Geçersiz data parametresi' };
    }
    
    const fs = require('fs');
    const appDir = getAppDir();
    const notesDir = path.join(appDir, 'notes');
    
    // Notes klasörünü oluştur
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true });
      console.log('📁 Notes klasörü oluşturuldu:', notesDir);
    }
    
    const { noteId, fileName, fileData, fileType, isImage, isAudio } = data;
    
    // Not ID'si kontrolü
    if (!noteId) {
      console.error('❌ Not ID yok');
      return { success: false, error: 'Not ID gerekli' };
    }
    
    // Notun dosyasını bul (recursive arama)
    function findNoteFile(dirPath, targetNoteId) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Sistem klasörlerini hariç tut
          const SYSTEM_FOLDERS = ['.git', 'node_modules', '.vscode'];
          if (!SYSTEM_FOLDERS.includes(item)) {
            // Alt klasörü recursive olarak tara
            const result = findNoteFile(itemPath, targetNoteId);
            if (result) return result;
          }
        } else if (stat.isFile() && (item.endsWith('.md') || item.endsWith('.txt'))) {
          // Dosyayı kontrol et
          try {
            const content = fs.readFileSync(itemPath, 'utf8');
            
            // Hem MD hem TXT formatlarını kontrol et
            const mdFormat = content.includes(`*Not ID: ${targetNoteId}*`);
            const txtFormatOld = content.includes(`// Not ID: ${targetNoteId}`);
            const txtFormatNew = content.includes(`<!-- Not ID: ${targetNoteId} -->`);
            
            if (mdFormat || txtFormatOld || txtFormatNew) {
              return { 
                filePath: itemPath, 
                fileName: item, 
                dirPath: path.dirname(itemPath),
                relativePath: path.relative(notesDir, itemPath) 
              };
            }
          } catch (readError) {
            console.log('⚠️ Dosya okunamadı:', itemPath);
          }
        }
      }
      return null;
    }
    
    // Media dosyaları için gizli klasör (.media)
    const mediaDir = path.join(notesDir, '.media');
    
    // .media klasörünü oluştur (yoksa)
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
      console.log('📁 Media klasörü oluşturuldu:', mediaDir);
    }
    
    // Dosya adını güvenli hale getir ve timestamp ekle (duplikasyon önlemek için)
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileExtension = path.extname(safeFileName);
    const fileNameWithoutExt = path.basename(safeFileName, fileExtension);
    const uniqueFileName = `${fileNameWithoutExt}_${timestamp}${fileExtension}`;
    
    // Media klasörüne kaydet
    const filePath = path.join(mediaDir, uniqueFileName);
    const targetDir = mediaDir;
    
    // Buffer'ı dosyaya yaz
    fs.writeFileSync(filePath, fileData, { encoding: 'binary' });
    
    console.log('✅ Yüklenen dosya kaydedildi:', filePath);
    
    // Relative path'i hesapla (notes klasörüne göre) - .media klasörü ile
    relativePath = path.relative(notesDir, filePath).replace(/\\/g, '/');
    
    // .media klasörünü gizli yap (Windows'ta hidden attribute)
    try {
      const { exec } = require('child_process');
      if (process.platform === 'win32') {
        // Windows'ta hidden attribute ekle
        exec(`attrib +H "${mediaDir}"`, (error) => {
          if (!error) {
            console.log('✅ .media klasörü gizli olarak işaretlendi');
          }
        });
      }
    } catch (err) {
      // Ignore - gizli yapma hatası kritik değil
    }
    
    return {
      success: true,
      filePath: filePath,
      relativePath: relativePath,
      fileName: uniqueFileName
    };
  } catch (error) {
    console.error('❌ save-uploaded-file hatası:', error);
    return {
      success: false,
      error: error.message || 'Bilinmeyen hata'
    };
  }
});

// Media dosyasını sil
ipcMain.handle('delete-media-file', async (event, data) => {
  try {
    if (!data || !data.filePath) {
      return { success: false, error: 'File path gerekli' };
    }
    
    const fs = require('fs');
    const path = require('path');
    const appDir = getAppDir();
    const notesDir = path.join(appDir, 'notes');
    const mediaDir = path.join(notesDir, '.media');
    
    // Path'i normalize et
    let filePath = data.filePath;
    
    // Relative path ise absolute path'e çevir
    if (!path.isAbsolute(filePath)) {
      if (filePath.startsWith('.media/')) {
        filePath = path.join(notesDir, filePath);
      } else if (filePath.includes('.media')) {
        filePath = path.join(notesDir, filePath);
      } else {
        // Sadece dosya adı verilmişse .media klasöründe ara
        filePath = path.join(mediaDir, path.basename(filePath));
      }
    }
    
    // Sadece .media klasöründeki dosyaları sil (güvenlik)
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedMediaDir = mediaDir.replace(/\\/g, '/');
    if (!normalizedPath.includes(normalizedMediaDir)) {
      return { success: false, error: 'Sadece .media klasöründeki dosyalar silinebilir' };
    }
    
    // Dosya var mı kontrol et
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('✅ Media dosyası silindi:', filePath);
      return { success: true, filePath: filePath };
    } else {
      console.log('⚠️ Dosya bulunamadı (zaten silinmiş olabilir):', filePath);
      return { success: true, filePath: filePath, message: 'Dosya bulunamadı (zaten silinmiş)' };
    }
  } catch (error) {
    console.error('❌ delete-media-file hatası:', error);
    return { success: false, error: error.message || 'Bilinmeyen hata' };
  }
});

// Relative path'ten full path'i al
ipcMain.handle('get-file-path', async (event, data) => {
  try {
    const { relativePath } = data;
    if (!relativePath) {
      return { success: false, error: 'Relative path gerekli' };
    }
    
    const appDir = getAppDir();
    const notesDir = path.join(appDir, 'notes');
    const fullPath = path.join(notesDir, relativePath);
    
    return {
      success: true,
      fullPath: fullPath
    };
  } catch (error) {
    console.error('❌ get-file-path hatası:', error);
    return {
      success: false,
      error: error.message || 'Bilinmeyen hata'
    };
  }
});

// Not dosya adını yeniden adlandır
ipcMain.on('rename-note-file', (event, data) => {
  try {
    // Data kontrolü
    if (!data || typeof data !== 'object') {
      console.error('❌ Geçersiz data parametresi:', data);
      event.reply('note-file-renamed', { success: false, error: 'Geçersiz data parametresi' });
      return;
    }
    
    const fs = require('fs');
    const appDir = getAppDir();
    const notesDir = path.join(appDir, 'notes');
    
    const { noteId, oldFileName, newFileName, note } = data;
    
    // Gerekli alanları kontrol et
    if (!oldFileName || !newFileName) {
      console.error('❌ Eksik dosya adı parametreleri:', { oldFileName, newFileName });
      event.reply('note-file-renamed', { success: false, error: 'Eksik dosya adı parametreleri' });
      return;
    }
    
    // Eski dosya yolu
    const oldFilePath = path.join(notesDir, oldFileName);
    
    // Yeni dosya yolu
    const newFilePath = path.join(notesDir, newFileName);
    
    console.log('📝 Dosya yeniden adlandırma denemesi:', oldFileName, '→', newFileName);
    console.log('📁 Eski dosya yolu:', oldFilePath);
    console.log('📁 Yeni dosya yolu:', newFilePath);
    console.log('📁 Eski dosya var mı?', fs.existsSync(oldFilePath));
    console.log('📁 Yeni dosya var mı?', fs.existsSync(newFilePath));
    
    // Eski dosya var mı kontrol et
    if (fs.existsSync(oldFilePath)) {
      // Yeni dosya zaten var mı kontrol et
      if (fs.existsSync(newFilePath)) {
        console.log('⚠️ Yeni dosya zaten mevcut, işlem atlanıyor');
        try {
          event.reply('note-file-renamed', { 
            success: true, 
            oldFileName: oldFileName,
            newFileName: newFileName,
            noteId: noteId,
            message: 'Dosya zaten mevcut'
          });
        } catch (replyError) {
          console.error('❌ Reply gönderme hatası:', replyError);
        }
        return;
      }
      
      // Dosyayı yeniden adlandır
      fs.renameSync(oldFilePath, newFilePath);
      console.log('📝 Dosya yeniden adlandırıldı:', oldFileName, '→', newFileName);
      
      // Başarı mesajı gönder
      try {
        event.reply('note-file-renamed', { 
          success: true, 
          oldFileName: oldFileName,
          newFileName: newFileName,
          noteId: noteId 
        });
      } catch (replyError) {
        console.error('❌ Reply gönderme hatası:', replyError);
      }
    } else if (fs.existsSync(newFilePath)) {
      // Eski dosya yok ama yeni dosya var - zaten yeniden adlandırılmış
      console.log('✅ Dosya zaten yeniden adlandırılmış:', newFileName);
      try {
        event.reply('note-file-renamed', { 
          success: true, 
          oldFileName: oldFileName,
          newFileName: newFileName,
          noteId: noteId,
          message: 'Dosya zaten yeniden adlandırılmış'
        });
      } catch (replyError) {
        console.error('❌ Reply gönderme hatası:', replyError);
      }
    } else {
      console.error('❌ Ne eski ne de yeni dosya bulunamadı:', oldFilePath, newFilePath);
      try {
        event.reply('note-file-renamed', { 
          success: false, 
          error: 'Dosya bulunamadı',
          oldFileName: oldFileName 
        });
      } catch (replyError) {
        console.error('❌ Reply gönderme hatası:', replyError);
      }
    }
  } catch (error) {
    console.error('❌ Dosya yeniden adlandırma hatası:', error);
    try {
      if (event && !event.sender.isDestroyed()) {
        event.reply('note-file-renamed', { 
          success: false, 
          error: error.message || 'Bilinmeyen hata'
        });
      }
    } catch (replyError) {
      console.error('❌ Reply gönderme hatası:', replyError);
    }
  }
});

ipcMain.on('delete-note-file', (event, noteData) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  
  try {
    // Recursive olarak tüm alt klasörleri tara ve dosyayı bul
    function findAndDeleteFile(dirPath, fileName) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Alt klasörü recursive olarak tara
          const result = findAndDeleteFile(itemPath, fileName);
          if (result) return result;
        } else if (stat.isFile() && item === fileName) {
          // Dosyayı bul ve sil
          fs.unlinkSync(itemPath);
          console.log('🗑️ Not dosyası silindi:', itemPath);
          return true;
        }
      }
      return false;
    }
    
    // Orijinal dosya adını kullan (eğer varsa)
    if (noteData.fileName) {
      const deleted = findAndDeleteFile(notesDir, noteData.fileName);
      if (deleted) {
        event.reply('note-file-deleted', { success: true });
        return;
      }
    }
    
    // Fallback: Dosya adını başlığa göre oluştur (eski sistem)
    const safeTitle = noteData.title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    // Hem .md hem .txt dosyalarını dene
    const mdFileName = `${safeTitle}.md`;
    const txtFileName = `${safeTitle}.txt`;
    
    let deleted = false;
    
    if (findAndDeleteFile(notesDir, mdFileName)) {
      deleted = true;
    }
    
    if (findAndDeleteFile(notesDir, txtFileName)) {
      deleted = true;
    }
    
    // Eski ID tabanlı dosya varsa onu da sil
    const oldFileName = `note_${noteData.id}.md`;
    if (findAndDeleteFile(notesDir, oldFileName)) {
      deleted = true;
    }
    
    event.reply('note-file-deleted', { success: true });
  } catch (error) {
    console.error('❌ Not dosyası silinemedi:', error);
    event.reply('note-file-deleted', { success: false, error: error.message });
  }
});

ipcMain.on('load-notes-from-files', (event) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  
  try {
    if (!fs.existsSync(notesDir)) {
      event.reply('notes-loaded-from-files', { success: true, notes: [] });
      return;
    }
    
    const loadedNotes = [];
    
    // Recursive olarak tüm alt klasörleri tara
    function scanDirectory(dirPath, relativePath = '') {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Sistem klasörlerini hariç tut
          if (!SYSTEM_FOLDERS.includes(item)) {
            // Alt klasörü recursive olarak tara
            scanDirectory(itemPath, itemRelativePath);
          }
        } else if (stat.isFile() && (item.endsWith('.md') || item.endsWith('.txt'))) {
          // Dosyayı işle - relativePath'i normalize et
          const normalizedRelativePath = itemRelativePath.replace(/\\/g, '/');
          processNoteFile(itemPath, normalizedRelativePath, item);
        }
      });
    }
    
    function processNoteFile(filePath, relativePath, fileName) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Markdown içeriğini parse et
        const lines = content.split('\n');
        
        // Başlık belirleme: dosya adını kullan (içerikten değil)
        let title = fileName.replace(/\.(md|txt)$/, ''); // .md veya .txt uzantısını kaldır
        
        // Metadata'yı bul
        let text = '';
        let createdAt = new Date().toISOString();
        let updatedAt = new Date().toISOString();
        let noteId = '';
        let folderId = null;
        
         // TXT dosyaları için içeriği ve metadata'yı parse et
         if (fileName.endsWith('.txt')) {
           console.log(`🔍 TXT dosya parse ediliyor: ${fileName}`);
           
           // Direkt regex ile Not ID'yi bul (HTML comment formatı)
           const noteIdMatch = content.match(/<!-- Not ID:\s*(.+?) -->/);
           if (noteIdMatch) {
             noteId = noteIdMatch[1].trim();
             console.log(`✅ TXT Not ID bulundu: ${noteId}`);
           }
           
           // Direkt regex ile Klasör ID'yi bul (HTML comment formatı)
           const folderIdMatch = content.match(/<!-- Klasör ID:\s*(.+?) -->/);
           if (folderIdMatch && folderIdMatch[1].trim() !== 'null') {
             folderId = folderIdMatch[1].trim();
             console.log(`✅ TXT Klasör ID bulundu: ${folderId}`);
           }
           
           // Direkt regex ile tarihleri bul (HTML comment formatı)
           const createdAtMatch = content.match(/<!-- Oluşturulma:\s*(.+?) -->/);
           if (createdAtMatch) {
             try {
               createdAt = new Date(createdAtMatch[1].trim()).toISOString();
             } catch (e) {
               console.log(`⚠️ TXT tarih parse edilemedi: ${createdAtMatch[1]}`);
             }
           }
           
           const updatedAtMatch = content.match(/<!-- Son güncelleme:\s*(.+?) -->/);
           if (updatedAtMatch) {
             try {
               updatedAt = new Date(updatedAtMatch[1].trim()).toISOString();
             } catch (e) {
               console.log(`⚠️ TXT tarih parse edilemedi: ${updatedAtMatch[1]}`);
             }
           }
           
           // Metadata bölümünü bul ve içeriği al (HTML comment formatı)
           const metadataStartIndex = content.lastIndexOf('<!-- METADATA_START -->');
           if (metadataStartIndex !== -1) {
             text = content.substring(0, metadataStartIndex).trim();
           } else {
             // Metadata yoksa, HTML comment'lerden önceki içeriği al
             const htmlCommentRegex = /<!-- .+? -->/g;
             const lastCommentMatch = [...content.matchAll(htmlCommentRegex)].pop();
             
             if (lastCommentMatch) {
               // Son HTML comment'den önceki içeriği al
               text = content.substring(0, lastCommentMatch.index).trim();
             } else {
               // Hiç HTML comment yoksa tüm içeriği al
               text = content;
             }
           }
        } else {
          // MD dosyaları için metadata'yı parse et
          let metadataStartIndex = -1;
          
          // Metadata bölümünü bul - * ile başlayan satırları bul ve ondan önceki --- çizgisini metadata başlangıcı olarak kabul et
          
          let metadataLineIndex = -1;
          for (let i = 1; i < lines.length; i++) {
            // Metadata formatı: *Oluşturulma: ...* (tek * ile başlayan, ** değil)
            const trimmedLine = lines[i].trim();
            if (trimmedLine.startsWith('*') && !trimmedLine.startsWith('**') && trimmedLine.includes(':') && trimmedLine.endsWith('*')) {
              metadataLineIndex = i;
              console.log(`🔍 Metadata satırı bulundu: satır ${i}: "${lines[i]}" (${fileName})`);
              break;
            }
          }
          console.log(`🔍 metadataLineIndex: ${metadataLineIndex} (${fileName})`);
          
          // Metadata satırından önceki --- çizgisini metadata başlangıcı olarak kabul et
          // Boş satırları atla
          if (metadataLineIndex > 0) {
            for (let i = metadataLineIndex - 1; i >= 1; i--) {
              console.log(`🔍 Satır ${i} kontrol ediliyor: "${lines[i]}" (${fileName})`);
              if (lines[i].trim() === '') {
                console.log(`🔍 Satır ${i} boş, atlanıyor... (${fileName})`);
                continue; // Boş satırı atla
              }
              if (lines[i].trim() === '---') {
                metadataStartIndex = i;
                console.log(`✅ Metadata başlangıcı bulundu: satır ${i} (${fileName})`);
                break;
              }
              console.log(`❌ Satır ${i} '---' değil, arama durduruluyor: "${lines[i].trim()}" (${fileName})`);
              break; // --- değilse dur
            }
          }
          
          // Metadata bölümünden önceki tüm içeriği koru (ilk satır dahil)
          if (metadataStartIndex > 0) {
            // Metadata varsa, metadata'dan önceki tüm satırları al (ilk satır dahil)
            text = lines.slice(0, metadataStartIndex).join('\n');
          } else {
            // Metadata yoksa tüm içeriği koru (ilk satır dahil)
            text = lines.join('\n');
          }
          
          // Metadata'yı parse et (eğer varsa)
          console.log(`🔍 Metadata parsing için metadataStartIndex: ${metadataStartIndex} (${fileName})`);
          if (metadataStartIndex !== -1) {
            console.log(`📋 Metadata bulundu, parsing başlıyor... (${fileName})`);
            for (let i = metadataStartIndex + 1; i < lines.length; i++) {
              const line = lines[i];
              console.log(`📋 Metadata satırı ${i}: "${line.substring(0, 50)}..."`);
              
              if (line.includes('Oluşturulma') || line.includes('OluÅŸturulma')) {
                const dateStr = line.match(/\*.*?:\s*(.+?)\*/)?.[1];
                if (dateStr) {
                  try {
                    // Türkçe tarih formatını parse et (dd.mm.yyyy hh:mm:ss)
                    // Örnek: "31.10.2025 22:02:55"
                    let parsedDate;
                    if (dateStr.includes('.')) {
                      // Türkçe format: dd.mm.yyyy hh:mm:ss
                      const dateParts = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
                      if (dateParts) {
                        const [, day, month, year, hour, minute, second] = dateParts;
                        parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                      } else {
                        // Sadece tarih varsa: dd.mm.yyyy
                        const dateOnlyParts = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
                        if (dateOnlyParts) {
                          const [, day, month, year] = dateOnlyParts;
                          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        } else {
                          parsedDate = new Date(dateStr);
                        }
                      }
                    } else {
                      parsedDate = new Date(dateStr);
                    }
                    
                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                      createdAt = parsedDate.toISOString();
                    } else {
                    console.log(`⚠️ Tarih parse edilemedi: ${dateStr}`);
                    }
                  } catch (e) {
                    console.log(`⚠️ Tarih parse hatası: ${dateStr}`, e);
                  }
                }
              } else if (line.includes('güncelleme') || line.includes('gÃ¼ncelleme')) {
                const dateStr = line.match(/\*.*?:\s*(.+?)\*/)?.[1];
                if (dateStr) {
                  try {
                    // Türkçe tarih formatını parse et (dd.mm.yyyy hh:mm:ss)
                    let parsedDate;
                    if (dateStr.includes('.')) {
                      // Türkçe format: dd.mm.yyyy hh:mm:ss
                      const dateParts = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
                      if (dateParts) {
                        const [, day, month, year, hour, minute, second] = dateParts;
                        parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                      } else {
                        // Sadece tarih varsa: dd.mm.yyyy
                        const dateOnlyParts = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
                        if (dateOnlyParts) {
                          const [, day, month, year] = dateOnlyParts;
                          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        } else {
                          parsedDate = new Date(dateStr);
                        }
                      }
                    } else {
                      parsedDate = new Date(dateStr);
                    }
                    
                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                      updatedAt = parsedDate.toISOString();
                    } else {
                    console.log(`⚠️ Tarih parse edilemedi: ${dateStr}`);
                    }
                  } catch (e) {
                    console.log(`⚠️ Tarih parse hatası: ${dateStr}`, e);
                  }
                }
              } else if (line.includes('Not ID')) {
                const idStr = line.match(/\*.*?:\s*(.+?)\*/)?.[1];
                console.log(`🔍 Not ID regex match: "${idStr}" (${fileName})`);
                if (idStr && idStr.trim() !== '') {
                  noteId = idStr.trim();
                  console.log(`✅ Not ID bulundu: "${noteId}" (${fileName})`);
                }
              } else if (line.includes('Klasör ID')) {
                const folderStr = line.match(/\*.*?:\s*(.+?)\*/)?.[1];
                if (folderStr && folderStr !== 'null') {
                  const originalFolderId = folderStr.trim();
                  console.log(`📁 Metadata'dan klasör ID okundu: "${originalFolderId}" (${fileName})`);
                  
                  // Eski format: Klasör adı direkt olarak yazılmış olabilir
                  // Orijinal ID'yi sakla, normalize edilmiş versiyonunu da dene
                  // Önce orijinal ID'yi kullan, eşleştirme sırasında normalize edilmiş versiyonu da denenecek
                  folderId = originalFolderId;
                  
                  // Not: folderId eşleştirmesi render ve filter fonksiyonlarında yapılacak
                  // Burada sadece orijinal değeri saklıyoruz
                }
              }
            }
          }
        }
        
        // Son boş satırları temizle
        text = text.trim();
        
        // Bağlantıları parse et
        const links = [];
        const linkMatches = text.match(/\[\[([^\]]+)\]\]/g);
        if (linkMatches) {
          linkMatches.forEach(match => {
            const linkTitle = match.replace(/\[\[|\]\]/g, '').trim();
            if (linkTitle && !links.includes(linkTitle)) {
              links.push(linkTitle);
            }
          });
        }
        console.log(`🔗 "${title}" notu için ${links.length} bağlantı bulundu:`, links);
        
        // Etiketleri parse et
        const tags = [];
        
        // HTML içindeki etiketleri yakala (Vditor'dan gelen)
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
        const plainTagMatches = text.match(/#([a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+)/gi);
        if (plainTagMatches) {
          plainTagMatches.forEach(match => {
            const tag = match.replace('#', '').toLowerCase();
            if (tag && !tags.includes(tag)) {
              tags.push(tag);
            }
          });
        }
        
        console.log(`🏷️ "${title}" notu için ${tags.length} etiket bulundu:`, tags);
        
        // Not ID yoksa benzersiz ID oluştur
        if (!noteId) {
          // Dosya yolu ve adından benzersiz ID oluştur
          const relativePathForId = relativePath || fileName;
          const pathHash = relativePathForId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const timestamp = Date.now().toString(36);
          noteId = `${pathHash}_${timestamp}`;
          console.log(`⚠️ Not ID bulunamadı, benzersiz ID oluşturuldu: ${noteId} (${fileName})`);
        }
        
        // Eğer dosya alt klasördeyse ve klasör ID'si yoksa (null ise), path bazlı ID oluştur
        // Eski notlar için folderId null olabilir, relativePath'ten çıkar
        if (!folderId && relativePath !== fileName && relativePath.includes('/')) {
          // relativePath zaten normalize edilmiş geliyor (scanDirectory'de normalize ediliyor)
          const folderPath = path.dirname(relativePath).replace(/\\/g, '/'); // Windows path'lerini normalize et
          
          // Klasör ID'sini path bazlı oluştur (get-folder-structure ile aynı mantık)
          // itemRelativePath kullanarak ID oluştur (tam path)
          folderId = folderPath.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
          console.log(`📁 Alt klasördeki not için klasör ID oluşturuldu: ${folderPath} → ${folderId}`);
          
          // Eğer klasör ID'si boşsa (sadece dosya adıysa), null olarak bırak
          if (!folderId || folderId.trim() === '') {
            folderId = null;
            console.log(`⚠️ Klasör ID oluşturulamadı, null olarak bırakıldı: ${relativePath}`);
          }
        }
        
        // Eğer metadata yoksa dosyaya ekle
        if (!content.includes('<!-- METADATA_START -->') && !content.includes('// --- METADATA ---') && !content.includes('---')) {
          const now = new Date();
          const formattedDate = now.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          if (fileName.endsWith('.txt')) {
            const metadataToAdd = `\n\n<!-- METADATA_START -->
<!-- Oluşturulma: ${formattedDate} -->
<!-- Son güncelleme: ${formattedDate} -->
<!-- Not ID: ${noteId} -->
<!-- Klasör ID: ${folderId || 'null'} -->
<!-- METADATA_END -->`;
            fs.writeFileSync(filePath, content + metadataToAdd, 'utf8');
            console.log(`✅ TXT dosyasına metadata eklendi: ${fileName}`);
          } else if (fileName.endsWith('.md')) {
            const metadataToAdd = `\n\n---\n*Oluşturulma: ${formattedDate}*\n*Son güncelleme: ${formattedDate}*\n*Not ID: ${noteId}*\n*Klasör ID: ${folderId || 'null'}*\n---`;
            fs.writeFileSync(filePath, content + metadataToAdd, 'utf8');
            console.log(`✅ MD dosyasına metadata eklendi: ${fileName}`);
          }
        }
        
        const renderedText = renderMarkdownMain(text);
        
        
        loadedNotes.push({
          id: noteId,
          title: title,
          text: text, // Orijinal markdown içeriği
          markdownContent: text, // Markdown içeriği ayrıca sakla
          renderedText: renderedText, // HTML render edilmiş versiyon
          createdAt: createdAt,
          updatedAt: updatedAt,
          folderId: folderId, // Klasör bilgisini ekle
          filePath: filePath,
          fileName: fileName, // Orijinal dosya adını sakla
          relativePath: relativePath, // Relatif yol
          originalExtension: fileName.endsWith('.txt') ? '.txt' : '.md', // Orijinal dosya uzantısını sakla
          links: links, // Bağlantıları ekle
          tags: tags // Etiketleri ekle
        });
      } catch (fileError) {
        console.error('❌ Dosya okunamadı:', fileName, fileError);
      }
    }
    
    // Ana klasörü tara
    scanDirectory(notesDir);
    
    console.log(`📚 ${loadedNotes.length} not dosyadan yüklendi (alt klasörler dahil)`);
    event.reply('notes-loaded-from-files', { success: true, notes: loadedNotes });
  } catch (error) {
    console.error('❌ Notlar dosyalardan yüklenemedi:', error);
    event.reply('notes-loaded-from-files', { success: false, error: error.message });
  }
});

// Todo dosya sistemi IPC handlers
ipcMain.on('save-todos-to-file', (event, todoData) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  const todosDir = path.join(notesDir, 'todos');
  
  try {
    // Todos klasörünü oluştur
    if (!fs.existsSync(todosDir)) {
      fs.mkdirSync(todosDir, { recursive: true });
      console.log('📋 Todos klasörü oluşturuldu:', todosDir);
    }
    
    const { todos, positions, nextTodoId } = todoData;
    
    // Ana todos dosyasını kaydet
    const todosFilePath = path.join(todosDir, 'todos.json');
    const todosContent = JSON.stringify(todos, null, 2);
    fs.writeFileSync(todosFilePath, todosContent, 'utf8');
    
    // Pozisyon dosyasını kaydet
    const positionsFilePath = path.join(todosDir, 'todo_positions.json');
    const positionsContent = JSON.stringify(positions, null, 2);
    fs.writeFileSync(positionsFilePath, positionsContent, 'utf8');
    
    // Next ID dosyasını kaydet
    const nextIdFilePath = path.join(todosDir, 'todo_next_id.json');
    const nextIdContent = JSON.stringify({ nextTodoId }, null, 2);
    fs.writeFileSync(nextIdFilePath, nextIdContent, 'utf8');
    
    // Yedek dosya oluştur
    const backupFilePath = path.join(todosDir, 'todos_backup.json');
    const backupContent = JSON.stringify({
      todos,
      positions,
      nextTodoId,
      timestamp: new Date().toISOString()
    }, null, 2);
    fs.writeFileSync(backupFilePath, backupContent, 'utf8');
    
    console.log('📋 Todo\'lar dosyaya kaydedildi:', todos.length, 'todo');
    event.reply('todos-saved-to-file', { success: true });
    
  } catch (error) {
    console.error('❌ Todo\'lar dosyaya kaydedilemedi:', error);
    event.reply('todos-saved-to-file', { success: false, error: error.message });
  }
});

ipcMain.on('load-todos-from-file', (event) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  const todosDir = path.join(notesDir, 'todos');
  
  try {
    const result = {
      todos: [],
      positions: {},
      nextTodoId: 1,
      fromLocalStorage: false
    };
    
    // Ana todos dosyasını yükle
    const todosFilePath = path.join(todosDir, 'todos.json');
    if (fs.existsSync(todosFilePath)) {
      const todosContent = fs.readFileSync(todosFilePath, 'utf8');
      result.todos = JSON.parse(todosContent);
      console.log('📋 Todo\'lar dosyadan yüklendi:', result.todos.length, 'todo');
    }
    
    // Pozisyon dosyasını yükle
    const positionsFilePath = path.join(todosDir, 'todo_positions.json');
    if (fs.existsSync(positionsFilePath)) {
      const positionsContent = fs.readFileSync(positionsFilePath, 'utf8');
      result.positions = JSON.parse(positionsContent);
      console.log('📋 Todo pozisyonları yüklendi:', Object.keys(result.positions).length, 'pozisyon');
    }
    
    // Next ID dosyasını yükle
    const nextIdFilePath = path.join(todosDir, 'todo_next_id.json');
    if (fs.existsSync(nextIdFilePath)) {
      const nextIdContent = fs.readFileSync(nextIdFilePath, 'utf8');
      const nextIdData = JSON.parse(nextIdContent);
      result.nextTodoId = nextIdData.nextTodoId || 1;
    }
    
    // Eğer dosyalardan hiç todo yüklenemediyse, localStorage'dan yüklemeyi dene
    if (result.todos.length === 0) {
      console.log('📋 Dosyadan todo bulunamadı, localStorage\'dan yükleme denenecek...');
      result.fromLocalStorage = true;
    }
    
    event.reply('todos-loaded-from-file', { success: true, ...result });
    
  } catch (error) {
    console.error('❌ Todo\'lar dosyadan yüklenemedi:', error);
    event.reply('todos-loaded-from-file', { success: false, error: error.message });
  }
});

// Orb context menu event handlers
ipcMain.on('minimize-to-tray', () => {
  console.log('Simge durumuna küçültme çağrıldı');
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.hide();
  }
  if (orbWindow && orbWindow.isVisible()) {
    orbWindow.hide();
  }
  
  // Tray bildirim göster (opsiyonel)
  if (tray) {
    try {
      tray.displayBalloon({
        title: 'Igo Desktop Widget',
        content: 'Uygulama simge durumuna küçültüldü. Geri getirmek için system tray\'e çift tıklayın.'
      });
    } catch (error) {
      console.log('Balloon notification gösterilemedi');
    }
  }
});

ipcMain.on('exit-application', () => {
  console.log('Uygulama kapatılıyor');
  // Tray'i temizle
  if (tray) {
    tray.destroy();
  }
  app.quit();
});

// Context menu göster
ipcMain.on('show-context-menu', (event) => {
  const template = [
    {
      label: 'Widget Aç/Kapat',
      click: () => {
        console.log('Widget toggle - context menüden');
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      }
    },
    {
      label: 'Simge Durumuna Küçült',
      click: () => {
        console.log('Simge durumuna küçült - context menüden');
        if (mainWindow && mainWindow.isVisible()) {
          mainWindow.hide();
        }
        if (orbWindow && orbWindow.isVisible()) {
          orbWindow.hide();
        }
        
        // Tray bildirim göster
        if (tray) {
          try {
            tray.displayBalloon({
              title: 'Igo Desktop Widget',
              content: 'Uygulama simge durumuna küçültüldü.'
            });
          } catch (error) {
            console.log('Balloon notification gösterilemedi');
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Uygulamayı Kapat',
      click: () => {
        console.log('Uygulama kapatılıyor - context menüden');
        if (tray) {
          tray.destroy();
          tray = null;
        }
        // Tüm pencereleri güvenli şekilde kapat
        if (mainWindow) {
          mainWindow.destroy();
          mainWindow = null;
        }
        if (orbWindow) {
          orbWindow.destroy();
          orbWindow = null;
        }
        app.quit();
      }
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: orbWindow });
});

// Notes klasörünü açma handler
ipcMain.on('open-notes-folder', () => {
  try {
    const { shell } = require('electron');
    const notesPath = path.join(getAppDir(), 'notes');
    shell.openPath(notesPath).then(() => {
      console.log('📁 Notes klasörü açıldı:', notesPath);
    }).catch(err => {
      console.error('❌ Notes klasörü açılamadı:', err);
    });
  } catch (error) {
    console.error('❌ Notes klasörü açma hatası:', error);
  }
});

// Link açma handler - tarayıcıda aç
ipcMain.on('open-external-link', (event, url) => {
  try {
    shell.openExternal(url);
    console.log('🔗 Link tarayıcıda açıldı:', url);
  } catch (error) {
    console.error('❌ Link açılamadı:', error);
  }
});

// Başlangıçta notes klasörünü tarama fonksiyonu
function scanNotesFolderOnStartup() {
  const fs = require('fs');
  // Electron'da __dirname resources/app klasörünü gösterir
  // Notes klasörünü uygulama klasöründe oluştur
  const appDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
  const notesDir = path.join(appDir, 'notes');
  
  try {
    if (!fs.existsSync(notesDir)) {
      console.log('📁 Notes klasörü bulunamadı, oluşturuluyor...');
      fs.mkdirSync(notesDir, { recursive: true });
    }
    
    // Todos klasörü artık otomatik oluşturulmayacak
    
    console.log('📁 Notes klasörü taranıyor...');
    
    // Klasörleri ve dosyaları listele
    const items = fs.readdirSync(notesDir);
    const folders = [];
    const files = [];
    
    items.forEach(item => {
      const itemPath = path.join(notesDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Todos klasörünü hariç tut
        if (item !== 'todos') {
          folders.push(item);
          console.log(`📁 Klasör bulundu: ${item}`);
          
          // Alt klasördeki dosyaları da say
          try {
            const subItems = fs.readdirSync(itemPath);
            const subFiles = subItems.filter(subItem => {
              const subItemPath = path.join(itemPath, subItem);
              const subStat = fs.statSync(subItemPath);
              return subStat.isFile() && (subItem.endsWith('.md') || subItem.endsWith('.txt'));
            });
            console.log(`  └─ ${subFiles.length} dosya bulundu`);
          } catch (subError) {
            console.log(`  └─ Alt klasör okunamadı: ${subError.message}`);
          }
        } else {
          console.log(`📋 ${item} klasörü atlandı (sistem klasörü)`);
        }
      } else if (stat.isFile() && (item.endsWith('.md') || item.endsWith('.txt'))) {
        files.push(item);
        console.log(`📄 Dosya bulundu: ${item}`);
      }
    });
    
    console.log(`📊 Tarama tamamlandı: ${folders.length} klasör, ${files.length} dosya`);
    
    // Widget'a tarama sonuçlarını bildir
    if (mainWindow) {
      mainWindow.webContents.send('startup-scan-complete', {
        folders: folders,
        files: files,
        totalItems: folders.length + files.length
      });
    }
    
  } catch (error) {
    console.error('❌ Notes klasörü taranamadı:', error);
  }
}


