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
    'setting': 'Cài Đặt',
    'log': 'Nhật ký hệ thống',
    'guide': 'Hướng dẫn sử dụng'
  },

  initFromStorage() {
    const rawSavedTab = localStorage.getItem('duospace_active_tab') || 'home';
    const savedTab = this.tabTitles[rawSavedTab] ? rawSavedTab : 'home';
    const title = this.tabTitles[savedTab] || 'Tổng quan';
    this.switchTab(savedTab, title, null);
  },

  switchTab(tabId, title, btn) {
    if (!this.tabTitles[tabId]) tabId = 'home';
    this.currentTab = tabId;
    localStorage.setItem('duospace_active_tab', tabId);

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
