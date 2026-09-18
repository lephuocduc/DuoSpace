/**
 * DuoSpace - Main Entry Point & App State Coordinator
 */
class DuoSpaceApp {
  constructor() {
    this.storage = new Storage();
    this.data = this.storage.getData();

    // Chart Controllers
    this.budgetChart = new BudgetChart();
    this.weightChart = new WeightChart();
    this.investmentChart = new InvestmentChart();

    this.charts = {
      renderBudgetChart: () => this.budgetChart.render(this.data, this.data.isDarkMode),
      renderCatChart: () => this.weightChart.render(this.data.catWeights, this.data.isDarkMode),
      renderAssetAllocationChart: () => {
        const cs = this.investment ? this.investment.getCashSurplusVnd() : 0;
        this.investmentChart.render(this.data.investments, this.data.usdRate, this.data.isDarkMode, cs);
      },
      renderInvestmentCharts: () => {
        const cs = this.investment ? this.investment.getCashSurplusVnd() : 0;
        this.investmentChart.render(this.data.investments, this.data.usdRate, this.data.isDarkMode, cs);
        this.investmentChart.renderNetWorth(this.data.netWorthHistory, this.data.isDarkMode);
      }
    };

    // Feature Modules
    this.auth = window.authManager || new AuthModule(this);
    this.auth.app = this;
    this.home = new HomeModule(this);
    this.todo = new TodoModule(this);
    this.finance = new FinanceModule(this);
    this.investment = new InvestmentModule(this);
    this.motorbike = new MotorbikeModule(this);
    this.cats = new CatsModule(this);
    this.health = new HealthModule(this);
    this.settings = new SettingsModule(this);
    this.log = new LogModule(this);
    this.sync = typeof CloudSync !== 'undefined' ? new CloudSync(this.storage) : null;

    this.init();
  }

  init() {
    // Setup Dark Mode & System theme listener
    ThemeManager.init(this);

    // ── MIGRATION: add priceSource to old investments without it ──
    if (this.data.investments && this.data.investments.length > 0) {
      const migrated = PriceUpdater.migrateOldInvestments(this.data.investments);
      if (JSON.stringify(migrated) !== JSON.stringify(this.data.investments)) {
        this.data.investments = migrated;
        this.storage.save(this.data);
        console.log('[DuoSpace] Migrated investment priceSource fields');
      }
    }

    // Populate Initial UI inputs
    const usdRateInput = document.getElementById('usdRateInput');
    if (usdRateInput) usdRateInput.value = this.data.usdRate || 25400;

    const weightDate = document.getElementById('weightDate');
    if (weightDate) weightDate.valueAsDate = new Date();

    const maintDate = document.getElementById('maintDate');
    if (maintDate) maintDate.valueAsDate = new Date();

    this.settings.loadSettingsToForm();

    // Setup global listeners
    this.setupEventListeners();

    // Fetch realtime USD rate & Render all
    this.investment.fetchRealtimeUsdRate();
    this.render();

    // ── RESTORE ACTIVE TAB AFTER REFRESH ──
    if (typeof TabsManager !== 'undefined' && typeof TabsManager.initFromStorage === 'function') {
      TabsManager.initFromStorage();
    }

    // ── AUTO PRICE UPDATE: fetch prices & start background timer ──
    if (typeof priceUpdater !== 'undefined') {
      priceUpdater.updateAllPrices();   // First run immediately
      priceUpdater.startAutoUpdate();   // Then every 5 min check
    }

    // ── SYNC WITH CLOUDFLARE D1 ──
    if (this.sync && this.sync.isEnabled) {
      this.sync.pullFromCloud();
    }
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ModalManager.closeAddModal();
        ModalManager.closeCatHistoryModal();
        SidebarManager.close();
        if (this.investment && typeof this.investment.closeSellModal === 'function') {
          this.investment.closeSellModal();
        }
        if (this.motorbike && typeof this.motorbike.closePartsStatusModal === 'function') {
          this.motorbike.closePartsStatusModal();
        }
      }
    });
    window.addEventListener('error', event => {
      console.error('DuoSpace runtime error:', event.error || event.message);
      Utils.notify('Đã xảy ra lỗi. Dữ liệu chưa lưu vẫn giữ trên màn hình; hãy thử lại.', 'error');
    });
    window.addEventListener('unhandledrejection', event => {
      console.error('DuoSpace async error:', event.reason);
      Utils.notify('Không thể hoàn tất thao tác. Vui lòng kiểm tra kết nối và thử lại.', 'error');
    });
  }

  /** Lưu trạng thái ứng dụng hiện tại vào LocalStorage và đồng bộ ngầm lên Cloudflare D1. */
  save() {
    this.storage.save(this.data);
    if (this.sync && this.sync.isEnabled) {
      this.sync.debouncePushToCloud();
    }
  }

  getExpenseCategories() {
    return this.data.settings?.categories?.expense || CONFIG.CATEGORIES.EXPENSE;
  }

  getIncomeCategories() {
    return this.data.settings?.categories?.income || CONFIG.CATEGORIES.INCOME;
  }

  getTodoCategories() {
    return this.data.settings?.categories?.todo || CONFIG.CATEGORIES.TODO;
  }

  /** Render các mô-đun sau khi dữ liệu thay đổi. */
  render() {
    this.home.render();
    this.todo.render();
    this.finance.render();
    this.investment.render();
    this.motorbike.render();
    this.cats.render();
    this.health.render();
    this.settings.render();
    this.log.render();
  }

  /** Chỉ render các phần bị ảnh hưởng để tránh render toàn bộ dữ liệu. */
  renderParts(parts = []) {
    const renderers = {
      home: () => this.home.render(), todo: () => this.todo.render(), finance: () => this.finance.render(),
      investment: () => this.investment.render(), motorbike: () => this.motorbike.render(), cats: () => this.cats.render(),
      health: () => this.health.render(), settings: () => this.settings.render(), log: () => this.log.render()
    };
    [...new Set(parts)].forEach(part => renderers[part]?.());
  }

  renderCategoryList(category, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = (this.data.todos || []).filter(t => t.category === category && !t.done);

    if (list.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-500 text-center py-2">Không có việc cần làm</p>';
      return;
    }

    container.innerHTML = list.map(todo => {
      const realIndex = this.data.todos.indexOf(todo);
      const userText = todo.user === 'Đ' ? 'Đức' : todo.user === 'S' ? 'Sương' : 'Cả hai';
      let dateDisplay = '';
      if (todo.dueDate) {
        const isOverdue = !todo.done && new Date(todo.dueDate).setHours(23,59,59,999) < Date.now();
        dateDisplay = `<span class="text-[9px] ${isOverdue ? 'text-rose-500 font-semibold' : 'text-gray-400'} block">⏰ ${Utils.formatDate(todo.dueDate)}</span>`;
      } else if (todo.startDate) {
        dateDisplay = `<span class="text-[9px] text-gray-400 block">📅 ${Utils.formatDate(todo.startDate)}</span>`;
      } else if (todo.date) {
        dateDisplay = `<span class="text-[9px] text-gray-400 block">${Utils.formatDate(todo.date)}</span>`;
      }

      return `
        <div class="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-slate-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/40 p-1 rounded-lg">
          <div class="flex items-center space-x-2 flex-1">
            <input type="checkbox" onclick="event.stopPropagation()" onchange="window.app.todo.toggleTodo(${realIndex})" class="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer">
            <span onclick="window.app.todo.editTodo(${realIndex})" class="text-sm text-gray-800 dark:text-slate-200 flex-1 cursor-pointer">${Utils.escapeHtml(todo.title)}</span>
          </div>
          <div onclick="window.app.todo.editTodo(${realIndex})" class="text-right cursor-pointer">
            <span class="text-[10px] text-gray-400 dark:text-slate-500 block">${userText}</span>
            ${dateDisplay}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Global helper for tab-aware category
function getDefaultCategoryByTab(tabName) {
  const categoryMap = {
    'finance': 'Chi Tiêu',
    'motorbike': 'Xe Máy',
    'todo': 'Việc nhà',
    'cats': 'Mun & Bông',
    'health': 'Sức Khỏe',
    'investment': 'Đầu tư',
    'home': 'Việc nhà'
  };
  return categoryMap[tabName] || '';
}

// Global chart rendering functions for event calls
function renderBudgetChart() { if (window.app && window.app.charts) window.app.charts.renderBudgetChart(); }
function renderAssetAllocationChart() { if (window.app && window.app.charts) window.app.charts.renderAssetAllocationChart(); }

// Global auth helpers for direct inline button calls
window.duoSignInWithGoogle = function() {
  if (window.authManager) {
    window.authManager.signInWithGoogle();
  } else if (window.duoApp && window.duoApp.auth) {
    window.duoApp.auth.signInWithGoogle();
  }
};

window.duoMockLogin = function(userCode) {
  if (window.authManager) {
    window.authManager.mockLogin(userCode);
  } else if (window.duoApp && window.duoApp.auth) {
    window.duoApp.auth.mockLogin(userCode);
  }
};

// Khởi tạo AuthManager ngay lập tức để màn hình login nhận lệnh bấm tức thì
window.authManager = new AuthModule(null);

// Initialize DuoSpace Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DuoSpaceApp();
  window.duoApp = window.app;
  window.duoApp.auth = window.authManager;
  window.authManager.app = window.duoApp;
});
