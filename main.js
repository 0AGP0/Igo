const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow = null;
let orbWindow = null;
let tray = null;

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    x: width - 1020,
    y: height - 720,
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
    show: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: false
  });

  mainWindow.loadFile('nebula_canvas_desktop_widget_edition_html.html');
  
  mainWindow.once('ready-to-show', () => {
    console.log('Widget penceresi hazır (gizli)');
    // Widget başlangıçta gizli
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
});

app.on('window-all-closed', () => {
  // Tray uygulaması olduğu için window'lar kapandığında app'i kapatma
  // Sadece user explicit olarak quit ederse kapansın
  console.log('Tüm pencereler kapatıldı - arka planda devam ediyor');
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
    if (mainWindow.isVisible()) {
      console.log('Widget kapatılıyor');
      mainWindow.hide();
    } else {
      console.log('Widget açılıyor');
      mainWindow.show();
      mainWindow.focus();
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
