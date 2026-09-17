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
      todos: [],
      incomes: [],
      expenses: [],
      bikeMaintenances: [],
      investments: [],
      netWorthHistory: [],
      monthlyBudgets: [],
      catWeights: [],
      logs: [],
      settings: {
        munBreed: "Mèo Cưng",
        bongBreed: "Mèo Cưng",
        nmaxPlate: "50AD-539.09",
        nmaxOdo: 0,
        grandePlate: "50N2-461.30",
        grandeOdo: 0
      }
    };
  }

  save(data = this.data) {
    this.data = data;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      Utils.notify('Không thể lưu dữ liệu. Hãy kiểm tra dung lượng trình duyệt.', 'error');
      return false;
    }
  }

  getData() {
    return this.data;
  }

  // ── Helper functions for Date Filtering & Pagination ──
  getAllTransactions() {
    const toDateKey = (dateVal) => {
      if (!dateVal) return '';
      if (typeof dateVal === 'string' && dateVal.length >= 10) return dateVal.slice(0, 10);
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      } catch (e) {}
      return '';
    };

    const getRecordTimestamp = (item) => {
      if (item.createdAt) {
        const t = new Date(item.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (item.id && typeof item.id === 'string') {
        const m = item.id.match(/^(?:expense|income|trans)-(\d+)/);
        if (m) {
          const t = parseInt(m[1]);
          if (!isNaN(t) && t > 0) return t;
        }
      }
      return 0;
    };

    return [
      ...(this.data.expenses || []).map((e, idx) => ({ ...e, type: 'expense', rawIdx: idx })),
      ...(this.data.incomes || []).map((i, idx) => ({ ...i, type: 'income', rawIdx: idx }))
    ].sort((a, b) => {
      const dayA = toDateKey(a.date);
      const dayB = toDateKey(b.date);
      if (dayA !== dayB) {
        return dayB.localeCompare(dayA);
      }
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return (b.rawIdx || 0) - (a.rawIdx || 0);
    });
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
