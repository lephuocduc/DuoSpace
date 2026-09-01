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
      bikeMaintenances: Array.isArray(saved.bikeMaintenances) ? saved.bikeMaintenances : defaults.bikeMaintenances,
      catWeights: Array.isArray(saved.catWeights) ? saved.catWeights : defaults.catWeights,
      monthlyBudgets: Array.isArray(saved.monthlyBudgets) ? saved.monthlyBudgets : defaults.monthlyBudgets
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
        { name: "Bitcoin Spot", type: "🪙 Crypto", quantity: 0.05, buyPrice: 60000, currentPrice: 65000, isUsd: true, targetWeight: 30, notes: "Tính theo USD trên Binance" },
        { name: "Cổ phiếu VNM", type: "📈 Cổ phiếu", quantity: 500, buyPrice: 65000, currentPrice: 68000, isUsd: false, targetWeight: 40, notes: "Tích sản VNĐ" },
        { name: "Tiết kiệm USD", type: "💵 USD", quantity: 1000, buyPrice: 1, currentPrice: 1, isUsd: true, targetWeight: 30, notes: "Tài khoản USD" }
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
      settings: {
        munBreed: "Mèo Cưng",
        bongBreed: "Mèo Cưng",
        nmaxPlate: "59X1-123.45",
        nmaxOdo: 14850,
        grandePlate: "59X2-678.90",
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
}
