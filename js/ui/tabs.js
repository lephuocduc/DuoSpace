/**
 * DuoSpace UI - Tabs Navigation Controller
 */
const TabsManager = {
  currentTab: 'home',

  tabTitles: {
    'home': 'Tổng quan',
    'todo': 'Công việc chung',
    'finance': 'Quản lý Thu Chi',
    'investment': 'Quản lý Đầu Tư',
    'motorbike': 'Xe Máy',
    'cats': 'Mun & Bông',
    'health': 'Sức Khỏe',
    'setting': 'Cài Đặt'
  },

  initFromStorage() {
    const savedTab = localStorage.getItem('duospace_active_tab') || 'home';
    const title = this.tabTitles[savedTab] || 'Tổng quan';
    this.switchTab(savedTab, title, null);
  },

  switchTab(tabId, title, btn) {
    this.currentTab = tabId;
    localStorage.setItem('duospace_active_tab', tabId);

    const actualTitle = title || this.tabTitles[tabId] || 'Tổng quan';
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.innerText = actualTitle;

    const tabs = ['home', 'todo', 'finance', 'investment', 'motorbike', 'cats', 'health', 'setting'];
    tabs.forEach(id => {
      const el = document.getElementById(`tab-${id}`);
      if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('hidden');

    if (window.app && window.app.charts) {
      if (tabId === 'cats') setTimeout(() => window.app.charts.renderCatChart(), 100);
      if (tabId === 'home') setTimeout(() => window.app.charts.renderBudgetChart(), 100);
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
