/**
 * DuoSpace UI - Tabs Navigation Controller
 */
const TabsManager = {
  currentTab: 'home',

  switchTab(tabId, title, btn) {
    this.currentTab = tabId;
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.innerText = title;

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

    if (btn) {
      btn.classList.remove('text-gray-400', 'dark:text-slate-500');
      btn.classList.add('text-blue-600', 'dark:text-blue-400');
    }
  }
};

function switchTab(tabId, title, btn) {
  TabsManager.switchTab(tabId, title, btn);
}
