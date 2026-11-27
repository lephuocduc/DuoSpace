/**
 * DuoSpace UI - Tabs Navigation Controller
 */
const TabsManager = {
  currentTab: 'home',

  tabTitles: {
    'home': 'Tổng quan',
    'todo': 'Công việc chung',
    'investment': 'Tài Sản',
    'motorbike': 'Xe Máy',
    'cats': 'Mun & Bông',
    'health': 'Sức Khỏe',
    'shopping': 'Đi Siêu Thị',
    'calendar': 'Lịch & Hóa Đơn',
    'notes': 'Sổ Tay Chung',
    'setting': 'Cài Đặt'
  },

  switchSettingSubTab(subTab = 'general') {
    const panels = ['general', 'log', 'guide'];
    panels.forEach(id => {
      const panel = document.getElementById(`settingPanel-${id}`);
      const btn = document.getElementById(`settingSubTab-${id}`);
      const active = id === subTab;
      if (panel) panel.classList.toggle('hidden', !active);
      if (btn) {
        btn.className = active
          ? 'flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 transition-colors'
          : 'flex-1 py-1.5 rounded-lg text-gray-500 dark:text-slate-400 transition-colors';
      }
    });
  },

  initFromStorage() {
    const hashTab = (typeof location !== 'undefined' && location.hash) ? location.hash.replace(/^#/, '') : '';
    const rawSavedTab = this.tabTitles[hashTab] ? hashTab : (localStorage.getItem('duospace_active_tab') || 'home');
    const savedTab = this.tabTitles[rawSavedTab] ? rawSavedTab : 'home';
    const title = this.tabTitles[savedTab] || 'Tổng quan';
    this.switchTab(savedTab, title, null, { replaceHistory: true });
    this.initHistory();
  },

  initHistory() {
    if (this._historyInitialized || typeof window === 'undefined' || !window.history) return;
    this._historyInitialized = true;

    // Tự động ghi nhận history khi bất kỳ modal hoặc form nhập nào được mở
    const overlayIds = [
      'addModal', 'noteModal', 'eventModal', 'sellAssetModal',
      'partsStatusModal', 'catHistoryModal',
      'investmentForm', 'bikeMaintenanceForm', 'healthForm'
    ];
    const isOverlayOpen = (el) => {
      if (!el) return false;
      if (el.classList.contains('hidden')) return false;
      if (el.classList.contains('opacity-0') && el.classList.contains('pointer-events-none')) return false;
      return true;
    };

    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
          const el = m.target;
          if (isOverlayOpen(el)) {
            if (!window.history.state || window.history.state.overlay !== el.id) {
              try {
                window.history.pushState(
                  { duospace: true, tab: this.currentTab, overlay: el.id },
                  '',
                  `#${this.currentTab}`
                );
              } catch (_) {}
            }
          }
        }
      });
      overlayIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el, { attributes: true, attributeFilter: ['class'] });
      });
    }

    // Chặn hành vi mặc định của thẻ <a href="#"> trong sidebar để không ghi đè hash #tabId
    document.addEventListener('click', (e) => {
      const anchor = e.target && e.target.closest ? e.target.closest('a[href="#"]') : null;
      if (anchor) e.preventDefault();
    });

    // Xử lý nút Back / vuốt quay lại trên điện thoại & trình duyệt
    window.addEventListener('popstate', (event) => {
      // Ưu tiên 1: Đang mở modal / form nhập / sidebar -> đóng nó ra trước, giữ nguyên tab
      if (this.closeAllOverlays()) {
        return;
      }
      // Ưu tiên 2: Chỉ chuyển tab khi có state hợp lệ do DuoSpace tạo ra
      const targetTab = event.state && event.state.duospace ? event.state.tab : null;
      if (targetTab && this.tabTitles[targetTab] && targetTab !== this.currentTab) {
        this.switchTab(targetTab, this.tabTitles[targetTab], null, { fromPopstate: true });
      }
    });
  },

  closeAllOverlays() {
    let closedAny = false;
    const isOpen = (id) => {
      const el = document.getElementById(id);
      if (!el || el.classList.contains('hidden')) return false;
      if (el.classList.contains('opacity-0') && el.classList.contains('pointer-events-none')) return false;
      return true;
    };

    if (isOpen('addModal') && typeof ModalManager !== 'undefined') {
      ModalManager.closeAddModal();
      closedAny = true;
    }
    if (isOpen('catHistoryModal') && typeof ModalManager !== 'undefined') {
      ModalManager.closeCatHistoryModal();
      closedAny = true;
    }
    if (isOpen('noteModal') && window.app?.notes?.closeModal) {
      window.app.notes.closeModal();
      closedAny = true;
    }
    if (isOpen('eventModal') && window.app?.calendar?.closeModal) {
      window.app.calendar.closeModal();
      closedAny = true;
    }
    if (isOpen('sellAssetModal') && window.app?.investment?.closeSellModal) {
      window.app.investment.closeSellModal();
      closedAny = true;
    }
    if (isOpen('partsStatusModal') && window.app?.motorbike?.closePartsStatusModal) {
      window.app.motorbike.closePartsStatusModal();
      closedAny = true;
    }
    if (isOpen('investmentForm')) {
      document.getElementById('investmentForm').classList.add('hidden');
      closedAny = true;
    }
    if (isOpen('bikeMaintenanceForm')) {
      document.getElementById('bikeMaintenanceForm').classList.add('hidden');
      closedAny = true;
    }
    if (isOpen('healthForm') && window.app?.health?.toggleHealthForm) {
      window.app.health.toggleHealthForm(false);
      closedAny = true;
    }
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024 && typeof SidebarManager !== 'undefined') {
      SidebarManager.close();
      closedAny = true;
    }
    return closedAny;
  },

  switchTab(tabId, title, btn, options = {}) {
    if (!this.tabTitles[tabId]) tabId = 'home';
    const prevTab = this.currentTab;
    this.currentTab = tabId;
    localStorage.setItem('duospace_active_tab', tabId);

    if (typeof window !== 'undefined' && window.history) {
      try {
        if (options.replaceHistory) {
          window.history.replaceState({ duospace: true, tab: tabId }, '', `#${tabId}`);
        } else if (!options.fromPopstate && tabId !== prevTab) {
          window.history.pushState({ duospace: true, tab: tabId }, '', `#${tabId}`);
        }
      } catch (_) {}
    }

    const actualTitle = title || this.tabTitles[tabId] || 'Tổng quan';
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.innerText = actualTitle;

    const tabs = ['home', 'todo', 'investment', 'motorbike', 'cats', 'health', 'shopping', 'calendar', 'notes', 'setting', 'log', 'guide'];
    tabs.forEach(id => {
      const el = document.getElementById(`tab-${id}`);
      if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('hidden');

    // Chỉ hiển thị nút ẩn/hiện số tiền (hình mắt) khi đang ở tab Tài Sản
    const toggleAmountsBtn = document.getElementById('toggleAmountsBtn');
    if (toggleAmountsBtn) {
      toggleAmountsBtn.classList.toggle('hidden', tabId !== 'investment');
    }

    if (window.app && window.app.charts) {
      if (tabId === 'cats') setTimeout(() => window.app.charts.renderCatChart(), 100);
      if (tabId === 'investment') setTimeout(() => window.app.charts.renderInvestmentCharts(), 100);
    }

    // Tự động cập nhật giá tài sản khi bấm qua tab Tài Sản
    if (tabId === 'investment' && window.app && !window.app._isInitializing && typeof priceUpdater !== 'undefined') {
      priceUpdater.updateAllPrices(true);
    }

    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('text-blue-600', 'dark:text-blue-400');
      b.classList.add('text-gray-400', 'dark:text-slate-500');
    });

    const bottomBtn = btn || document.querySelector(`.tab-btn[onclick*="'${tabId}'"]`);
    if (bottomBtn) {
      bottomBtn.classList.remove('text-gray-400', 'dark:text-slate-500');
      bottomBtn.classList.add('text-blue-600', 'dark:text-blue-400');
    }
  }
};

function switchTab(tabId, title, btn) {
  TabsManager.switchTab(tabId, title, btn);
}

function switchSettingSubTab(subTab) {
  TabsManager.switchSettingSubTab(subTab);
}

function handleHeaderAdd() {
  const tab = TabsManager.currentTab || 'home';
  if (tab === 'notes' && window.app?.notes) {
    window.app.notes.openModal();
    return;
  }
  if (tab === 'investment' && window.app?.investment) {
    window.app.investment.toggleForm();
    return;
  }
  if (tab === 'motorbike' && window.app?.motorbike) {
    window.app.motorbike.toggleMaintenanceForm();
    return;
  }
  if (tab === 'calendar' && window.app?.calendar) {
    window.app.calendar.openModal();
    return;
  }
  if (tab === 'shopping') {
    const input = document.getElementById('shoppingInput');
    if (input) {
      input.focus();
      return;
    }
  }
  if (typeof openAddModal === 'function') openAddModal();
}
