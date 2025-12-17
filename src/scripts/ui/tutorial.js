// ===== TUTORIAL SYSTEM =====
// İlk açılışta kullanıcıya uygulamayı öğreten interaktif tutorial

let currentTutorialStep = 0;
const TUTORIAL_STEPS = [
  {
    title: '🌟 Hoş Geldiniz!',
    content: `
      <div class="tutorial-welcome">
        <p style="font-size: 18px; margin-bottom: 20px;">Igo'ya hoş geldiniz! 🎉</p>
        <p>Bu tutorial size uygulamayı kullanmayı öğretecek.</p>
        <p style="margin-top: 15px; color: var(--muted);">Tutorial boyunca <strong>İleri</strong> ve <strong>Geri</strong> butonlarını kullanarak adımlar arasında gezinebilirsiniz.</p>
      </div>
    `,
    highlight: null
  },
  {
    title: '📝 Yeni Not Ekleme',
    content: `
      <div class="tutorial-content">
        <p><strong>Yeni not eklemek için 3 farklı yöntem kullanabilirsiniz:</strong></p>
        <ul style="margin: 15px 0; padding-left: 25px;">
          <li>Üst menüdeki <strong>＋</strong> butonuna tıklayın</li>
          <li>Klavye kısayolu <kbd>Ctrl + N</kbd> tuşlarına basın</li>
          <li>Sol paneldeki <strong>"📝 Yeni Not"</strong> butonuna tıklayın</li>
        </ul>
        <p style="margin-top: 15px; color: var(--accent);">💡 İpucu: Yeni notlar otomatik olarak canvas üzerinde oluşturulur ve taşınabilir.</p>
      </div>
    `,
    highlight: 'newBtn'
  },
  {
    title: '✏️ Not Editörü Özellikleri',
    content: `
      <div class="tutorial-content">
        <p><strong>Not düzenlemek için nota çift tıklayın. Not editörü şu özellikleri içerir:</strong></p>
        <ul style="margin: 15px 0; padding-left: 25px;">
          <li><strong>Başlık Düzenleme:</strong> Üstteki başlık kutusunda notunuzun başlığını değiştirebilirsiniz</li>
          <li><strong>Zengin Metin Editörü:</strong> Vditor editörü ile metninizi formatlayabilirsiniz</li>
          <li><strong>Formatlama Araçları:</strong> Kalın, italik, altı çizili, renkler, tablo, kod blokları ve daha fazlası</li>
          <li><strong>Kaydet:</strong> Değişikliklerinizi <kbd>Ctrl + S</kbd> veya üstteki kaydet butonu ile kaydedin</li>
          <li><strong>Etiketler:</strong> <code>#etiket</code> yazarak notlarınızı etiketleyebilirsiniz</li>
        </ul>
        <p style="margin-top: 15px; color: var(--accent);">💡 İpucu: Not editörünü ESC tuşu ile kapatabilirsiniz.</p>
      </div>
    `,
    highlight: null
  },
  {
    title: '📁 Klasör Oluşturma',
    content: `
      <div class="tutorial-content">
        <p><strong>Klasörler ile notlarınızı organize edebilirsiniz:</strong></p>
        <ul style="margin: 15px 0; padding-left: 25px;">
          <li>Sol paneldeki <strong>"📁 Yeni Klasör"</strong> butonuna tıklayın</li>
          <li>Klasör adını girin ve oluşturun</li>
          <li>Klasörlere <strong>renk atayabilir</strong> (sağ tık → Renk Değiştir)</li>
          <li>Klasörlere <strong>not ekleyebilirsiniz</strong> (klasöre sağ tık → Not Ekle)</li>
          <li>Klasörleri <strong>yeniden adlandırabilir</strong> (sağ tık → Yeniden Adlandır)</li>
          <li>Klasörler içinde <strong>alt klasörler</strong> oluşturabilirsiniz</li>
        </ul>
        <p style="margin-top: 15px; color: var(--accent);">💡 İpucu: Klasörlere renk atayarak görsel olarak organize edebilirsiniz.</p>
      </div>
    `,
    highlight: 'newFolderBtn'
  },
  {
    title: '🔗 Not ve Klasör Bağlantıları',
    content: `
      <div class="tutorial-content">
        <p><strong>Bağlantılar ile notlarınızı birbirine bağlayabilirsiniz:</strong></p>
        <ul style="margin: 15px 0; padding-left: 25px;">
          <li><strong>Not-Not Bağlantıları:</strong> Nota sağ tık → "🔗 Bağlantılar" ile bağlantıları yönetin</li>
          <li><strong>Not-Klasör Bağlantıları:</strong> Notu bir klasöre taşıyın veya bağlantı panelinden klasöre bağlayın</li>
          <li><strong>Bağlantı Görselleştirmesi:</strong> Tüm bağlantılar Bilgi Haritası sekmesinde çizgiler ile gösterilir</li>
          <li><strong>Bağlantı Renkleri:</strong> Her bağlantı türü farklı renkte çizgi ile gösterilir</li>
        </ul>
        <p style="margin-top: 15px; color: var(--accent);">💡 İpucu: Bilgi Haritası sekmesinde tüm bağlantılarınızı görsel olarak görebilirsiniz.</p>
      </div>
    `,
    highlight: null
  }
];

// Tutorial modal'ı oluştur
function createTutorialModal() {
  // Mevcut modal varsa kaldır
  const existingModal = document.getElementById('tutorialModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'tutorialModal';
  modal.className = 'modal-overlay tutorial-overlay';
  modal.innerHTML = `
    <div class="modal tutorial-modal" onclick="event.stopPropagation()">
      <div class="tutorial-header">
        <div class="tutorial-progress">
          <div class="tutorial-progress-bar">
            <div class="tutorial-progress-fill" id="tutorialProgressFill"></div>
          </div>
          <div class="tutorial-step-counter">
            <span id="tutorialStepCounter">1 / ${TUTORIAL_STEPS.length}</span>
          </div>
        </div>
        <button class="tutorial-close-btn" onclick="closeTutorial()" title="Kapat">✕</button>
      </div>
      
      <div class="tutorial-body">
        <h2 class="tutorial-title" id="tutorialTitle"></h2>
        <div class="tutorial-content-wrapper" id="tutorialContent"></div>
      </div>
      
      <div class="tutorial-footer">
        <button class="tutorial-btn tutorial-btn-secondary" id="tutorialPrevBtn" onclick="previousTutorialStep()">
          ← Geri
        </button>
        <div class="tutorial-dots">
          ${TUTORIAL_STEPS.map((_, index) => 
            `<span class="tutorial-dot ${index === 0 ? 'active' : ''}" data-step="${index}"></span>`
          ).join('')}
        </div>
        <button class="tutorial-btn tutorial-btn-primary" id="tutorialNextBtn" onclick="nextTutorialStep()">
          ${currentTutorialStep === TUTORIAL_STEPS.length - 1 ? 'Bitir' : 'İleri →'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  // İlk adımı göster (dot'ları ve highlight'ı ayarlar)
  showTutorialStep(0);
  
  // Dot event'lerini ayarla
  setTimeout(() => {
    setupTutorialDots();
  }, 50);
  
  // Modal'ı göster
  setTimeout(() => {
    modal.style.opacity = '1';
    const modalContent = modal.querySelector('.tutorial-modal');
    if (modalContent) {
      modalContent.style.transform = 'scale(1)';
    }
  }, 10);

  // Dışarı tıklanınca kapatma (tutorial için kapalı)
  modal.onclick = (e) => {
    if (e.target === modal) {
      // Dışarı tıklanınca tutorial'ı kapatma (kullanıcı buton kullanmalı)
      // Sadece ilk selamlama adımında dışarı tıklanınca kapatılabilir
      if (currentTutorialStep === 0) {
        // İlk adımda dışarı tıklanınca kapatılabilir ama önerilmez
      }
    }
  };
}

// Tutorial adımını göster
function showTutorialStep(step) {
  if (step < 0 || step >= TUTORIAL_STEPS.length) return;

  currentTutorialStep = step;
  const stepData = TUTORIAL_STEPS[step];

  const titleEl = document.getElementById('tutorialTitle');
  const contentEl = document.getElementById('tutorialContent');
  const prevBtn = document.getElementById('tutorialPrevBtn');
  const nextBtn = document.getElementById('tutorialNextBtn');
  const stepCounter = document.getElementById('tutorialStepCounter');
  const progressFill = document.getElementById('tutorialProgressFill');

  if (titleEl) titleEl.textContent = stepData.title;
  if (contentEl) contentEl.innerHTML = stepData.content;
  if (stepCounter) stepCounter.textContent = `${step + 1} / ${TUTORIAL_STEPS.length}`;
  if (progressFill) {
    const progress = ((step + 1) / TUTORIAL_STEPS.length) * 100;
    progressFill.style.width = `${progress}%`;
  }

  // Buton durumları
  if (prevBtn) {
    prevBtn.disabled = step === 0;
    prevBtn.style.opacity = step === 0 ? '0.5' : '1';
    prevBtn.style.cursor = step === 0 ? 'not-allowed' : 'pointer';
  }

  if (nextBtn) {
    nextBtn.textContent = step === TUTORIAL_STEPS.length - 1 ? 'Bitir' : 'İleri →';
  }

  // Dot'ları güncelle
  document.querySelectorAll('.tutorial-dot').forEach((dot, index) => {
    if (index === step) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Highlight'ı güncelle
  updateTutorialHighlight();
}

// Sonraki adım
function nextTutorialStep() {
  if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
    showTutorialStep(currentTutorialStep + 1);
  } else {
    // Son adımda tutorial'ı bitir
    completeTutorial();
  }
}

// Önceki adım
function previousTutorialStep() {
  if (currentTutorialStep > 0) {
    showTutorialStep(currentTutorialStep - 1);
  }
}

// Tutorial'ı tamamla
function completeTutorial() {
  const STORAGE_KEYS = window.STORAGE_KEYS || {};
  
  // LocalStorage'a kaydet
  try {
    localStorage.setItem(STORAGE_KEYS.TUTORIAL_COMPLETED || 'obsidian_widget.tutorial_completed', 'true');
    console.log('✅ Tutorial tamamlandı ve kaydedildi');
  } catch (error) {
    console.error('❌ Tutorial kaydedilemedi:', error);
  }

  // Modal'ı kapat
  closeTutorial();

  // Başarı bildirimi
  if (window.showNotification) {
    window.showNotification('Tutorial tamamlandı! Artık uygulamayı kullanmaya başlayabilirsiniz. 🎉', 'success');
  }
}

// Tutorial'ı kapat
function closeTutorial() {
  const modal = document.getElementById('tutorialModal');
  if (modal) {
    // Highlight'ı temizle
    clearTutorialHighlight();
    
    modal.style.opacity = '0';
    const modalContent = modal.querySelector('.tutorial-modal');
    if (modalContent) {
      modalContent.style.transform = 'scale(0.9)';
    }
    
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 200);
  }
}

// Highlight güncelle
function updateTutorialHighlight() {
  clearTutorialHighlight();
  
  const stepData = TUTORIAL_STEPS[currentTutorialStep];
  if (!stepData || !stepData.highlight) return;

  const element = document.getElementById(stepData.highlight);
  if (element) {
    element.classList.add('tutorial-highlight');
    
    // Element görünür alanda değilse scroll yap
    const rect = element.getBoundingClientRect();
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );

    if (!isVisible) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// Highlight'ı temizle
function clearTutorialHighlight() {
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });
}

// Tutorial'ı aç
function openTutorial() {
  currentTutorialStep = 0;
  createTutorialModal();
}

// İlk açılış kontrolü
function checkFirstLaunch() {
  const STORAGE_KEYS = window.STORAGE_KEYS || {};
  const tutorialKey = STORAGE_KEYS.TUTORIAL_COMPLETED || 'obsidian_widget.tutorial_completed';
  
  try {
    const tutorialCompleted = localStorage.getItem(tutorialKey);
    
    if (!tutorialCompleted || tutorialCompleted !== 'true') {
      // İlk açılış - tutorial'ı göster
      console.log('🌟 İlk açılış tespit edildi, tutorial başlatılıyor...');
      
      // Uygulamanın tamamen yüklenmesini bekle
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            openTutorial();
          }, 500);
        });
      } else {
        setTimeout(() => {
          openTutorial();
        }, 500);
      }
    }
  } catch (error) {
    console.error('❌ Tutorial kontrolü yapılamadı:', error);
  }
}

// Dot'a tıklandığında adıma git
function goToTutorialStep(step) {
  showTutorialStep(step);
}

// Dot tıklama event'lerini ayarla (createTutorialModal'dan sonra çağrılacak)
function setupTutorialDots() {
  document.querySelectorAll('.tutorial-dot').forEach((dot, index) => {
    dot.addEventListener('click', () => {
      goToTutorialStep(index);
    });
  });
}

// Global exports
window.openTutorial = openTutorial;
window.closeTutorial = closeTutorial;
window.nextTutorialStep = nextTutorialStep;
window.previousTutorialStep = previousTutorialStep;
window.checkFirstLaunch = checkFirstLaunch;
window.goToTutorialStep = goToTutorialStep;


// Sayfa yüklendiğinde ilk açılış kontrolü
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      checkFirstLaunch();
    }, 1000);
  });
} else {
  setTimeout(() => {
    checkFirstLaunch();
  }, 1000);
}

console.log('📚 Tutorial sistemi yüklendi');

