/**
 * DuoSpace Storage Management
 */
class Storage {
  constructor(key = CONFIG.STORAGE_KEY) {
    this.key = key;
    this.data = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(this.key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure defaults exist for missing keys
        return this.mergeWithDefaults(parsed);
      }
    } catch (e) {
      console.error('Failed to load storage data:', e);
    }
    const defaults = this.defaultData();
    this.save(defaults);
    return defaults;
  }

  mergeWithDefaults(saved) {
    const defaults = this.defaultData();
    return {
      ...defaults,
      ...saved,
      settings: { ...defaults.settings, ...(saved.settings || {}) },
      usdRate: saved.usdRate || defaults.usdRate,
      todos: Array.isArray(saved.todos) ? saved.todos : defaults.todos,
      expenses: Array.isArray(saved.expenses) ? saved.expenses : defaults.expenses,
      incomes: Array.isArray(saved.incomes) ? saved.incomes : defaults.incomes,
      investments: Array.isArray(saved.investments) ? saved.investments : defaults.investments,
      netWorthHistory: Array.isArray(saved.netWorthHistory) ? saved.netWorthHistory : (defaults.netWorthHistory || []),
      bikeMaintenances: Array.isArray(saved.bikeMaintenances) ? saved.bikeMaintenances : defaults.bikeMaintenances,
      catWeights: Array.isArray(saved.catWeights) ? saved.catWeights : defaults.catWeights,
      monthlyBudgets: Array.isArray(saved.monthlyBudgets) ? saved.monthlyBudgets : defaults.monthlyBudgets,
      logs: Array.isArray(saved.logs) ? saved.logs : defaults.logs
    };
  }

  defaultData() {
    return {
      isDarkMode: false,
      usdRate: 25400,
      todos: [
        {
          title: "Lịch nhỏ mắt & tẩy giun Mun, Bông",
          category: "Mun & Bông",
          user: "S",
          priority: "high",
          notes: "Dùng thuốc nhỏ Revolution",
          done: false,
          date: new Date().toISOString()
        },
        {
          title: "Thay nhớt NMAX mốc 15.000km",
          category: "Xe Máy",
          user: "Đ",
          priority: "medium",
          notes: "Thay nhớt máy Motul 10W40",
          done: false,
          date: new Date().toISOString()
        }
      ],
      incomes: [
        { amount: 15000000, desc: "Lương tháng 8", user: "Đ", notes: "Thu nhập cố định", date: new Date().toISOString() },
        { amount: 12000000, desc: "Lương tháng 8", user: "S", notes: "Thu nhập cố định", date: new Date().toISOString() }
      ],
      expenses: [
        { amount: 3200000, desc: "Ăn uống nhà hàng & chợ", category: "🍜 Ăn uống", user: "S", notes: "", date: new Date().toISOString() },
        { amount: 4000000, desc: "Tiền điện nước internet", category: "🏠 Nhà cửa", user: "Đ", notes: "", date: new Date().toISOString() },
        { amount: 800000, desc: "Xăng xe & bảo dưỡng", category: "🛵 Xe", user: "Đ", notes: "", date: new Date().toISOString() },
        { amount: 600000, desc: "Cát vệ sinh & hạt mèo", category: "🐱 Mèo", user: "S", notes: "", date: new Date().toISOString() },
        { amount: 3900000, desc: "Sắm đồ dùng gia đình", category: "📦 Khác", user: "Đ", notes: "", date: new Date().toISOString() }
      ],
      bikeMaintenances: [
        { bike: "NMAX", title: "Thay nhớt", odo: 14850, cost: 350000, date: "2026-08-31" },
        { bike: "NMAX", title: "Thay nhớt", odo: 12100, cost: 300000, date: "2026-05-15" }
      ],
      investments: [
        { 
          name: "BTC", 
          type: "🪙 BTC", 
          quantity: 0.05, 
          buyPrice: 60000, 
          currentPrice: 65000, 
          isUsd: true, 
          targetWeight: 40, 
          notes: "Binance Spot",
          purchases: [
            { date: "2026-07-10", quantity: 0.03, buyPrice: 58000, notes: "DCA tháng 7" },
            { date: "2026-08-05", quantity: 0.02, buyPrice: 63000, notes: "DCA tháng 8" }
          ],
          priceSource: { type: 'crypto', symbol: 'BTC', refreshInterval: 3600, goldUnit: 'oz', lastUpdated: new Date().toISOString(), fetchStatus: 'success' }
        },
        { 
          name: "BNB", 
          type: "🪙 BNB", 
          quantity: 4.5, 
          buyPrice: 520, 
          currentPrice: 580, 
          isUsd: true, 
          targetWeight: 20, 
          notes: "Binance Vault",
          purchases: [
            { date: "2026-07-20", quantity: 4.5, buyPrice: 520, notes: "Mua tích sản" }
          ],
          priceSource: { type: 'crypto', symbol: 'BNB', refreshInterval: 3600, goldUnit: 'oz', lastUpdated: new Date().toISOString(), fetchStatus: 'success' }
        },
        { 
          name: "Tiết kiệm USD", 
          type: "💵 USD", 
          quantity: 1000, 
          buyPrice: 1, 
          currentPrice: 1, 
          isUsd: true, 
          targetWeight: 40, 
          notes: "Tài khoản USD",
          purchases: [
            { date: "2026-06-01", quantity: 1000, buyPrice: 1, notes: "Quỹ dự phòng" }
          ],
          priceSource: { type: 'usd', symbol: 'USD', refreshInterval: 3600, goldUnit: 'oz', lastUpdated: new Date().toISOString(), fetchStatus: 'success' }
        }
      ],
      netWorthHistory: [
        { date: "2026-08-28", value: 162500000 },
        { date: "2026-08-29", value: 164200000 },
        { date: "2026-08-30", value: 163800000 },
        { date: "2026-08-31", value: 167500000 },
        { date: "2026-09-01", value: 171200000 },
        { date: "2026-09-02", value: 174500000 }
      ],
      monthlyBudgets: [
        { month: "T6/2026", budget: 15000000, spent: 10200000 },
        { month: "T7/2026", budget: 14000000, spent: 11800000 },
        { month: "T8/2026", budget: 12500000, spent: 4200000 }
      ],
      catWeights: [
        { date: "2026-06-01", mun: 4.0, bong: 3.5 },
        { date: "2026-07-01", mun: 4.1, bong: 3.6 },
        { date: "2026-08-01", mun: 4.2, bong: 3.8 }
      ],
      logs: [],
      settings: {
        munBreed: "Mèo Cưng",
        bongBreed: "Mèo Cưng",
        nmaxPlate: "50AD-539.09",
        nmaxOdo: 14850,
        grandePlate: "50N2-461.30",
        grandeOdo: 8200
      }
    };
  }

  save(data = this.data) {
    this.data = data;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  getData() {
    return this.data;
  }

  // ── Helper functions for Date Filtering & Pagination ──
  getAllTransactions() {
    return [
      ...(this.data.expenses || []).map((e, idx) => ({ ...e, type: 'expense', rawIdx: idx })),
      ...(this.data.incomes || []).map((i, idx) => ({ ...i, type: 'income', rawIdx: idx }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getTransactionsByDateRange(startDate, endDate, limit = null) {
    const transactions = this.getAllTransactions();
    const filtered = transactions.filter(t => {
      if (!t.date) return false;
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getRecentTransactions(daysBack = 7) {
    const now = new Date();
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    return this.getTransactionsByDateRange(startDate, now);
  }

  getTransactionsBefore(targetDate, daysRange = 7, limit = null) {
    const endDate = new Date(targetDate.getTime() - 1);
    const startDate = new Date(endDate.getTime() - daysRange * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    return this.getTransactionsByDateRange(startDate, endDate, limit);
  }
}
