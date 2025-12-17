// ===== WIDGET OPERATIONS =====

// Widget işlemleri
function openWidget() { 
  document.getElementById('widget').classList.add('open');
  
  // Widget açılırken Always on Top ayarını yükle ve uygula
  if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke('get-always-on-top').then(isAlwaysOnTop => {
      console.log('🔝 Widget açılırken Always on Top durumu yüklendi:', isAlwaysOnTop ? 'Açık' : 'Kapalı');
      // Checkbox'ı güncelle
      const checkbox = document.getElementById('alwaysOnTopCheckbox');
      if (checkbox) {
        checkbox.checked = isAlwaysOnTop;
      }
      
      // Main.js'e ayarı uygula
      ipcRenderer.invoke('set-always-on-top', isAlwaysOnTop).then(result => {
        console.log('🔝 Widget açılırken Always on Top ayarı main.js\'e uygulandı:', isAlwaysOnTop);
      });
    });
  }
}

function closeWidget() { 
  document.getElementById('widget').classList.remove('open');
}

function closeDrawer() {
  // Drawer kapatma fonksiyonu - şu an boş
  // Gerekirse drawer kapatma işlemleri buraya eklenebilir
}

function toggleSidebar() {
  const sidebar = document.querySelector('.left-sidebar');
  const body = document.querySelector('.body');
  
  sidebar.classList.toggle('hidden');
  body.classList.toggle('sidebar-hidden');
  
  // Button icon'unu değiştir
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  if (sidebar.classList.contains('hidden')) {
    toggleBtn.textContent = '→'; // Sağ ok - sidebar kapalı
    toggleBtn.title = 'Paneli Aç';
  } else {
    toggleBtn.textContent = '☰'; // Hamburger - sidebar açık
    toggleBtn.title = 'Paneli Gizle';
  }
}

// Sidebar'ı başlangıçta açık yap
function ensureSidebarVisible() {
  const sidebar = document.querySelector('.left-sidebar');
  const body = document.querySelector('.body');
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  
  if (sidebar && body && toggleBtn) {
    sidebar.classList.remove('hidden');
    body.classList.remove('sidebar-hidden');
    toggleBtn.textContent = '☰';
    toggleBtn.title = 'Paneli Gizle';
  }
}

// Global exports
window.openWidget = openWidget;
window.closeWidget = closeWidget;
window.closeDrawer = closeDrawer;
window.toggleSidebar = toggleSidebar;
window.ensureSidebarVisible = ensureSidebarVisible;

