const { app, BrowserWindow, ipcMain, screen, Tray, Menu, shell } = require('electron');
const path = require('path');

// ID oluşturma fonksiyonu
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Uygulama dizinini dinamik olarak belirle
function getAppDir() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  return isDev ? __dirname : (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath));
}

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
  
  // 1. Tabloları işle
  // 3 sütunlu tablolar
  html = html.replace(/\|([^|\n]+)\|([^|\n]+)\|([^|\n]*)\|/g, (match, col1, col2, col3) => {
    const c1 = col1.trim();
    const c2 = col2.trim();
    const c3 = col3.trim();
    
    const cell1 = (c1 === '' || c1 === '&nbsp;') ? '' : c1;
    const cell2 = (c2 === '' || c2 === '&nbsp;') ? '' : c2;
    const cell3 = (c3 === '' || c3 === '&nbsp;') ? '' : c3;
    
    return `<table class="md-table"><tr><td class="md-table-cell">${cell1}</td><td class="md-table-cell">${cell2}</td><td class="md-table-cell">${cell3}</td></tr></table>`;
  });
  
  // 2 sütunlu tablolar
  html = html.replace(/\|([^|\n]+)\|([^|\n]+)\|/g, (match, col1, col2) => {
    const c1 = col1.trim();
    const c2 = col2.trim();
    
    const cell1 = (c1 === '' || c1 === '&nbsp;') ? '' : c1;
    const cell2 = (c2 === '' || c2 === '&nbsp;') ? '' : c2;
    
    return `<table class="md-table"><tr><td class="md-table-cell">${cell1}</td><td class="md-table-cell">${cell2}</td></tr></table>`;
  });
  
  // 2. Linkleri işle
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // 3. HTML escape et (tablolar ve linkler hariç)
  // Önce tabloları ve linkleri koru
  const tablePlaceholders = [];
  const linkPlaceholders = [];
  
  // Tablo placeholder'ları
  html = html.replace(/<table class="md-table">.*?<\/table>/g, (match) => {
    const placeholder = `__TABLE_${tablePlaceholders.length}__`;
    tablePlaceholders.push(match);
    return placeholder;
  });
  
  // Link placeholder'ları
  html = html.replace(/<a href="[^"]*" target="_blank">[^<]*<\/a>/g, (match) => {
    const placeholder = `__LINK_${linkPlaceholders.length}__`;
    linkPlaceholders.push(match);
    return placeholder;
  });
  
  // Şimdi HTML escape et
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  
  // Placeholder'ları geri koy
  tablePlaceholders.forEach((table, index) => {
    html = html.replace(`__TABLE_${index}__`, table);
  });
  
  linkPlaceholders.forEach((link, index) => {
    html = html.replace(`__LINK_${index}__`, link);
  });
  
  // 4. Diğer markdown elementleri
  // Başlıklar
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  
  // Alıntılar
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Listeler
  html = html.replace(/^\s*-\s*(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Checklist
  html = html.replace(/^\s*-\s*\[\s*\]\s*(.*)$/gm, 
    '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>');
  html = html.replace(/^\s*-\s*\[x\]\s*(.*)$/gmi, 
    '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>');
  
  // Satır sonları
  html = html.replace(/\n/g, '<br>');
  
  // Inline formatlar
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Etiketler ve wikilink'ler
  html = html.replace(/#([a-z0-9ğüşiöçıİĞÜŞİÖÇ\-_]+)(?![^<]*>)/g, '<span class="tagtok">#$1</span>');
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink" data-link="$1">[[$1]]</span>');
  
  return html;
}

let mainWindow = null;
let orbWindow = null;
let tray = null;

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    x: -2000, // Ekran dışında başlat
    y: -2000, // Ekran dışında başlat
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    show: false, // Başlangıçta gizli - anında açılma için
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true
  });

  mainWindow.loadFile('nebula_canvas_desktop_widget_edition_html.html');
  
  mainWindow.once('ready-to-show', () => {
    console.log('Widget penceresi hazır (ekran dışında)');
    // Widget başlangıçta ekran dışında - hızlı açılma için hazır
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
  
  orbWindow.once('ready-to-show', () => {
    console.log('Orb penceresi hazır');
    
    // Sadece orb alanında mouse eventi kabul et, geri kalanını yok say
    orbWindow.setIgnoreMouseEvents(true, { forward: true });
    
    orbWindow.show();
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
ipcMain.on('toggle-widget', () => {
  console.log('Orb\'dan widget toggle çağrıldı');
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
    } else {
      console.log('Widget açılıyor');
      
      // Kaydedilmiş pozisyonu yükle
      const fs = require('fs');
      const settingsPath = path.join(getAppDir(), 'settings.json');
      let settings = {};
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        // Varsayılan pozisyon
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        settings.widget_rect = { x: width - 1020, y: height - 720, width: 1000, height: 700 };
      }
      
      // Kaydedilmiş pozisyon varsa kullan, yoksa varsayılan
      const widgetRect = settings.widget_rect || { x: width - 1020, y: height - 720, width: 1000, height: 700 };
      mainWindow.setPosition(widgetRect.x, widgetRect.y);
      mainWindow.show(); // Widget'ı göster
      mainWindow.focus();
      
      // Anında mesaj gönder - setImmediate kaldırıldı
      mainWindow.webContents.send('main-window-shown');
    }
  } else {
    console.log('Widget penceresi yok, yeniden oluşturuluyor');
    createMainWindow();
  }
});

// Orb penceresi hareket ettir
ipcMain.on('move-orb', (event, deltaX, deltaY) => {
  if (orbWindow) {
    const [currentX, currentY] = orbWindow.getPosition();
    orbWindow.setPosition(currentX + deltaX, currentY + deltaY);
  }
});

// Mouse ignore kontrolü
ipcMain.on('orb-mouse-enter', () => {
  if (orbWindow) {
    orbWindow.setIgnoreMouseEvents(false); // Mouse eventi kabul et
  }
});

ipcMain.on('orb-mouse-leave', () => {
  if (orbWindow) {
    orbWindow.setIgnoreMouseEvents(true, { forward: true }); // Mouse eventi yok say
  }
});

ipcMain.on('toggle-main-window', () => {
  console.log('Widget\'dan toggle çağrıldı');
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      console.log('Widget kapatılıyor');
      mainWindow.hide();
    } else {
      console.log('Widget açılıyor');
      mainWindow.show();
      mainWindow.focus();
    }
  }
});

ipcMain.on('close-main-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

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
    const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
    console.log('🔝 Always on top durumu:', isAlwaysOnTop);
    return isAlwaysOnTop;
  } catch (error) {
    console.error('❌ Always on top durumu alınamadı:', error);
    return false;
  }
});

// Always on top ayarlama
ipcMain.handle('set-always-on-top', (event, enabled) => {
  try {
    mainWindow.setAlwaysOnTop(enabled);
    console.log('🔝 Always on top ayarlandı:', enabled);
    return { success: true, enabled: enabled };
  } catch (error) {
    console.error('❌ Always on top ayarlanamadı:', error);
    return { success: false, error: error.message };
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
          // Klasör ID'sini oluştur - klasör ismi bazlı (notlarla eşleşmesi için)
          const folderId = item.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
          
          const folder = {
            id: folderId,
            name: item,
            path: itemRelativePath,
            type: 'folder',
            children: buildFolderStructure(itemPath, itemRelativePath)
          };
          
          result.push(folder);
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
  const { oldName, newName } = folderData;
  
  const oldPath = path.join(notesDir, oldName.replace(/[<>:"/\\|?*]/g, '_'));
  const newPath = path.join(notesDir, newName.replace(/[<>:"/\\|?*]/g, '_'));
  
  try {
    if (fs.existsSync(oldPath)) {
      // Yeni isimde klasör zaten varsa hata ver
      if (fs.existsSync(newPath)) {
        event.reply('folder-renamed', { success: false, error: 'Bu isimde klasör zaten mevcut' });
        return;
      }
      
      // Klasörü yeniden adlandır
      fs.renameSync(oldPath, newPath);
      
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
      
      // Klasördeki tüm dosyaları ana klasöre taşı
      const files = fs.readdirSync(folderPath);
      files.forEach(file => {
        if (file.endsWith('.md') || file.endsWith('.txt')) {
          const oldPath = path.join(folderPath, file);
          const newPath = path.join(notesDir, file);
          
          // Dosyayı taşı
          fs.renameSync(oldPath, newPath);
          
          // Dosya içeriğindeki klasör ID'sini null yap
          const content = fs.readFileSync(newPath, 'utf8');
          let updatedContent;
          if (file.endsWith('.txt')) {
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
          console.log('📁 Dosya taşındı:', file);
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
ipcMain.on('move-note-to-folder', (event, data) => {
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
          // Alt klasörü recursive olarak tara
          const result = findNoteFile(itemPath, targetNoteId);
          if (result) return result;
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
          event.reply('note-moved', { success: true });
          return;
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
        event.reply('note-moved', { 
          success: true, 
          newRelativePath: newRelativePath,
          newFileName: fileName
        });
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
        event.reply('note-moved', { 
          success: true, 
          newRelativePath: newRelativePath,
          newFileName: fileName
        });
      }
    } else {
      event.reply('note-moved', { success: false, error: 'Not dosyası bulunamadı' });
    }
  } catch (error) {
    console.error('❌ Not taşınamadı:', error);
    event.reply('note-moved', { success: false, error: error.message });
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
    .replace(/<[^>]*>/g, '')               // Kalan tüm HTML etiketlerini kaldır
    .replace(/\n\s*\n\s*\n/g, '\n\n')      // Çoklu satır sonlarını çift satır sonuna çevir
    .replace(/> \n> /g, '> ')              // Çoklu satır blockquote'ları düzelt
    .trim();                               // Başta ve sonda boşlukları kaldır
  
  return text;
}

ipcMain.on('save-note-to-file', (event, data) => {
  const fs = require('fs');
  const appDir = getAppDir();
  const notesDir = path.join(appDir, 'notes');
  
  // Notes klasörünü oluştur
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
    console.log('📁 Notes klasörü oluşturuldu:', notesDir);
  }
  
  const { note, fileName, oldFileName } = data;
  
  // Relative path varsa kullan, yoksa direkt notes klasörüne kaydet
  let newFilePath;
  if (note.relativePath) {
    // Relative path kullan (örn: "Ma/s.txt")
    newFilePath = path.join(notesDir, note.relativePath);
    
    // Klasör yapısını oluştur
    const dirPath = path.dirname(newFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log('📁 Klasör oluşturuldu:', dirPath);
    }
  } else {
    // Yeni dosya için direkt notes klasörüne kaydet
    newFilePath = path.join(notesDir, fileName);
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
<!-- Klasör ID: ${note.folderId ? note.folderId.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') : 'null'} -->
<!-- METADATA_END -->`;
  } else {
    // .md dosyaları için markdown format
    fileContent = `# ${note.title}

${contentToSave}

---
*Oluşturulma: ${new Date(note.createdAt).toLocaleString('tr-TR')}*
*Son güncelleme: ${new Date(note.updatedAt).toLocaleString('tr-TR')}*
*Not ID: ${note.id}*
*Klasör ID: ${note.folderId ? note.folderId.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') : 'null'}*
`;
  }

  // Eğer relative path varsa, direkt o dosyayı güncelle (yeniden adlandırma yapma)
  if (note.relativePath) {
    // Dosya adı değiştiyse yeniden adlandır
    if (oldFileName && oldFileName !== fileName) {
      const oldFilePath = path.join(notesDir, note.relativePath);
      const newFilePath = path.join(path.dirname(oldFilePath), fileName);
      
      // Dosyayı yeniden adlandır
      fs.renameSync(oldFilePath, newFilePath);
      console.log('📝 Dosya yeniden adlandırıldı:', oldFileName, '→', fileName);
      
      // Yeni relative path'i hesapla
      const newRelativePath = path.relative(notesDir, newFilePath);
      
      // Dosya içeriğini güncelle
      fs.writeFile(newFilePath, fileContent, 'utf8', (err) => {
        if (err) {
          console.error('❌ Not dosyaya kaydedilemedi:', err);
          event.reply('note-saved-to-file', { success: false, error: err.message });
        } else {
          console.log('💾 Dosya yeniden adlandırıldı ve güncellendi:', fileName);
          event.reply('note-saved-to-file', { 
            success: true, 
            filePath: newFilePath,
            newRelativePath: newRelativePath,
            newFileName: fileName
          });
        }
      });
      return; // Fonksiyondan çık
    } else {
      // Dosya adı aynıysa sadece içeriği güncelle
      const filePath = path.join(notesDir, note.relativePath);
      fs.writeFile(filePath, fileContent, 'utf8', (err) => {
        if (err) {
          console.error('❌ Not dosyaya kaydedilemedi:', err);
          event.reply('note-saved-to-file', { success: false, error: err.message });
        } else {
          console.log('💾 Mevcut dosya güncellendi:', filePath);
          event.reply('note-saved-to-file', { success: true, filePath: filePath });
        }
      });
      return; // Fonksiyondan çık
    }
  }
  
  // Relative path yoksa eski mantık (yeniden adlandırma vs.)
  let oldFilePath;
  if (oldFileName) {
    oldFilePath = path.join(notesDir, oldFileName);
  }
  
  const shouldRename = oldFileName && oldFileName !== fileName && oldFilePath && fs.existsSync(oldFilePath);
  
  if (shouldRename) {
    
    // Async rename kullan
    fs.rename(oldFilePath, newFilePath, (err) => {
      if (err) {
        console.error('❌ Dosya yeniden adlandırılamadı:', err);
        // Hata durumunda yeni dosya oluştur
        fs.writeFile(newFilePath, fileContent, 'utf8', (writeErr) => {
          if (writeErr) {
            console.error('❌ Not dosyaya kaydedilemedi:', writeErr);
            event.reply('note-saved-to-file', { success: false, error: writeErr.message });
          } else {
            console.log('💾 Not dosyaya kaydedildi:', fileName);
            event.reply('note-saved-to-file', { success: true, filePath: newFilePath });
          }
        });
      } else {
        // Rename başarılı, içeriği güncelle
        fs.writeFile(newFilePath, fileContent, 'utf8', (writeErr) => {
          if (writeErr) {
            console.error('❌ Not içeriği güncellenemedi:', writeErr);
            event.reply('note-saved-to-file', { success: false, error: writeErr.message });
          } else {
            console.log('📝 Dosya yeniden adlandırıldı ve güncellendi:', oldFileName, '→', fileName);
            event.reply('note-saved-to-file', { success: true, filePath: newFilePath });
          }
        });
      }
    });
  } else {
    // Yeni dosya oluştur veya mevcut dosyayı güncelle
    fs.writeFile(newFilePath, fileContent, 'utf8', (err) => {
      if (err) {
        console.error('❌ Not dosyaya kaydedilemedi:', err);
        event.reply('note-saved-to-file', { success: false, error: err.message });
      } else {
        console.log('💾 Not dosyaya kaydedildi:', fileName);
        event.reply('note-saved-to-file', { success: true, filePath: newFilePath });
      }
    });
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
          // Alt klasörü recursive olarak tara
          scanDirectory(itemPath, itemRelativePath);
        } else if (stat.isFile() && (item.endsWith('.md') || item.endsWith('.txt'))) {
          // Dosyayı işle
          processNoteFile(itemPath, itemRelativePath, item);
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
             text = content;
           }
        } else {
          // MD dosyaları için metadata'yı parse et
          let metadataStartIndex = -1;
          
          // Metadata bölümünü bul
          for (let i = 1; i < lines.length; i++) {
            if (lines[i] === '---') {
              metadataStartIndex = i;
              break;
            }
          }
          
          // Metadata bölümünden önceki tüm içeriği koru
          if (metadataStartIndex > 1) {
            text = lines.slice(1, metadataStartIndex).join('\n');
          } else {
            // Metadata yoksa başlık hariç tüm içeriği koru ve metadata ekle
            text = lines.slice(1).join('\n');
            
            // Metadata yoksa dosyaya ekle
            const now = new Date();
            const formattedDate = now.toLocaleString('tr-TR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            
            const metadataToAdd = `\n\n---\n*Oluşturulma: ${formattedDate}*\n*Son güncelleme: ${formattedDate}*\n*Not ID: ${noteId}*\n*Klasör ID: null*\n---`;
            
            // Dosyayı güncelle
            fs.writeFileSync(filePath, content + metadataToAdd, 'utf8');
            console.log(`✅ MD dosyasına metadata eklendi: ${fileName}`);
          }
          
          // Metadata'yı parse et
          if (metadataStartIndex !== -1) {
            for (let i = metadataStartIndex + 1; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.includes('Oluşturulma') || line.includes('OluÅŸturulma')) {
                const dateStr = line.match(/\*.*?:\s*(.+?)\*/)?.[1];
                if (dateStr) {
                  try {
                    createdAt = new Date(dateStr).toISOString();
                  } catch (e) {
                    console.log(`⚠️ Tarih parse edilemedi: ${dateStr}`);
                  }
                }
              } else if (line.includes('güncelleme') || line.includes('gÃ¼ncelleme')) {
                const dateStr = line.match(/\*.*?:\s*(.+?)\*/)?.[1];
                if (dateStr) {
                  try {
                    updatedAt = new Date(dateStr).toISOString();
                  } catch (e) {
                    console.log(`⚠️ Tarih parse edilemedi: ${dateStr}`);
                  }
                }
              } else if (line.includes('Not ID')) {
                const idStr = line.match(/\*.*?:\s*(.+?)\*/)?.[1];
                if (idStr) {
                  noteId = idStr.trim();
                }
              } else if (line.includes('Klasör ID')) {
                const folderStr = line.match(/\*.*?:\s*(.+?)\*/)?.[1];
                if (folderStr && folderStr !== 'null') {
                  folderId = folderStr.trim();
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
        
        // Eğer dosya alt klasördeyse ve klasör ID'si yoksa, klasör adından ID oluştur
        if (!folderId && relativePath !== fileName) {
          const folderName = path.dirname(relativePath);
          // Klasör adını direkt ID olarak kullan (basit ve anlaşılır)
          folderId = folderName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
          console.log(`📁 Alt klasördeki not için klasör ID oluşturuldu: ${folderName} → ${folderId}`);
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
        
        loadedNotes.push({
          id: noteId,
          title: title,
          text: renderMarkdownMain(text), // Markdown'ı HTML'e dönüştür
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
      return;
    }
    
    console.log('📁 Notes klasörü taranıyor...');
    
    // Klasörleri ve dosyaları listele
    const items = fs.readdirSync(notesDir);
    const folders = [];
    const files = [];
    
    items.forEach(item => {
      const itemPath = path.join(notesDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
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

