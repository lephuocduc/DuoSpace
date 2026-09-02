/**
 * DuoSpace Modules - Investment Portfolio Management Logic
 * v3.0: 
 * - Dropdown tên tài sản cụ thể (BTC, BNB, ETH, SOL, Vàng, USD, Tiết kiệm...)
 * - Bỏ dropdown phân loại
 * - Gom nhóm (Grouping) các lượt mua của cùng 1 loại tài sản, tự động tính tổng SL, Giá trung bình, Tổng % ROI
 * - Xem & quản lý lịch sử các lần mua trong từng Card tài sản
 * - Tự động ghi nhận tổng tài sản theo ngày và vẽ biểu đồ đường (Line Chart)
 */
class InvestmentModule {
  constructor(app) {
    this.app = app;
    this.editingIndex = -1;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.expandedCards = {}; // lưu trạng thái mở rộng lịch sử mua { [assetName]: boolean }
  }

  render() {
    this.renderInvestmentList();
    this.recordDailyNetWorth();
  }

  // ──────────────────────────────────────────────
  // ASSET CATALOG DEFINITIONS
  // ──────────────────────────────────────────────
  getAssetCatalog() {
    return {
      'BTC': { type: '🪙 BTC', defaultIsUsd: true, psType: 'crypto', psSymbol: 'BTC', defaultInterval: 3600, icon: 'fa-brands fa-bitcoin', iconColor: 'text-amber-500 bg-amber-100 dark:bg-amber-950/60' },
      'BNB': { type: '🪙 BNB', defaultIsUsd: true, psType: 'crypto', psSymbol: 'BNB', defaultInterval: 3600, icon: 'fa-solid fa-coins', iconColor: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-950/60' },
      'Vàng DOJI / SJC (VND/lượng)': { type: '🥇 Vàng', defaultIsUsd: false, psType: 'gold_vn', psSymbol: 'XAU', defaultInterval: 86400, icon: 'fa-solid fa-gem', iconColor: 'text-amber-600 bg-amber-100 dark:bg-amber-950/60' },
      'Vàng thế giới (XAU/USD)': { type: '🥇 Vàng', defaultIsUsd: true, psType: 'gold_world', psSymbol: 'XAU', defaultInterval: 86400, icon: 'fa-solid fa-earth-americas', iconColor: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950/60' },
      'Tiết kiệm USD': { type: '💵 USD', defaultIsUsd: true, psType: 'usd', psSymbol: 'USD', defaultInterval: 3600, icon: 'fa-solid fa-dollar-sign', iconColor: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-950/60' },
      'Tiết kiệm VNĐ': { type: '🏦 Tiết kiệm', defaultIsUsd: false, psType: 'manual', psSymbol: '', defaultInterval: 86400, icon: 'fa-solid fa-building-columns', iconColor: 'text-blue-500 bg-blue-100 dark:bg-blue-950/60' },
      'Khác': { type: '💼 Khác', defaultIsUsd: false, psType: 'manual', psSymbol: '', defaultInterval: 86400, icon: 'fa-solid fa-wallet', iconColor: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-950/60' }
    };
  }

  onAssetNameChange() {
    const nameSelect = document.getElementById('investName');
    const customNameRow = document.getElementById('investCustomNameRow');
    const catalog = this.getAssetCatalog();
    const selVal = nameSelect ? nameSelect.value : 'BTC';

    if (selVal === 'Khác') {
      if (customNameRow) customNameRow.classList.remove('hidden');
    } else {
      if (customNameRow) customNameRow.classList.add('hidden');
    }

    const info = catalog[selVal];
    if (info && this.editingIndex < 0) {
      const isUsdEl = document.getElementById('investIsUsd');
      if (isUsdEl) isUsdEl.checked = info.defaultIsUsd;
    }
  }

  // ──────────────────────────────────────────────
  // FORM: Toggle & Open
  // ──────────────────────────────────────────────

  toggleForm() {
    const form = document.getElementById('investmentForm');
    if (form) form.classList.toggle('hidden');
  }

  openForm(idx = -1, defaultName = null) {
    this.editingIndex = idx;
    const form = document.getElementById('investmentForm');
    if (!form) return;
    form.classList.remove('hidden');

    const nameSelect = document.getElementById('investName');
    const customNameInput = document.getElementById('investCustomName');
    const customNameRow = document.getElementById('investCustomNameRow');
    const dateInput = document.getElementById('investPurchaseDate');
    if (dateInput) dateInput.valueAsDate = new Date();

    if (idx >= 0 && this.app.data.investments && this.app.data.investments[idx]) {
      const item = this.app.data.investments[idx];
      document.getElementById('investFormTitle').innerText = `Thêm giao dịch mua: ${item.name}`;
      
      if (nameSelect) {
        const hasOpt = Array.from(nameSelect.options).some(o => o.value === item.name);
        if (hasOpt) {
          nameSelect.value = item.name;
          if (customNameRow) customNameRow.classList.add('hidden');
        } else {
          nameSelect.value = 'Khác';
          if (customNameRow) {
            customNameRow.classList.remove('hidden');
            if (customNameInput) customNameInput.value = item.name;
          }
        }
      }

      document.getElementById('investQuantity').value = '';
      document.getElementById('investBuyPrice').value = item.buyPrice !== undefined ? item.buyPrice : '';
      document.getElementById('investCurrentPrice').value = item.currentPrice !== undefined ? item.currentPrice : '';
      document.getElementById('investTarget').value = item.targetWeight || '';
      document.getElementById('investIsUsd').checked = item.isUsd || false;
      document.getElementById('investNotes').value = '';
      document.getElementById('saveInvestBtn').innerText = 'Lưu giao dịch mua';
    } else {
      document.getElementById('investFormTitle').innerText = 'Thêm Giao Dịch / Tài Sản Mới';
      if (nameSelect) {
        if (defaultName) {
          const hasOpt = Array.from(nameSelect.options).some(o => o.value === defaultName);
          nameSelect.value = hasOpt ? defaultName : 'Khác';
        } else {
          nameSelect.value = 'BTC';
        }
      }
      if (customNameInput) customNameInput.value = defaultName && nameSelect.value === 'Khác' ? defaultName : '';
      if (customNameRow) customNameRow.classList.toggle('hidden', nameSelect.value !== 'Khác');

      document.getElementById('investQuantity').value = '';
      document.getElementById('investBuyPrice').value = '';
      document.getElementById('investCurrentPrice').value = '';
      document.getElementById('investTarget').value = '';
      document.getElementById('investIsUsd').checked = true;
      document.getElementById('investNotes').value = '';
      document.getElementById('saveInvestBtn').innerText = 'Lưu tài sản';

      this.onAssetNameChange();
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Stub: kept for backward compat with HTML onclick
  updatePriceSourceFields() {}

  // ──────────────────────────────────────────────
  // FORM: Save (Tự động Gom nhóm cùng loại tài sản)
  // ──────────────────────────────────────────────

  saveInvestment() {
    const nameSelect = document.getElementById('investName');
    let name = nameSelect ? nameSelect.value : '';
    if (name === 'Khác') {
      name = (document.getElementById('investCustomName')?.value || '').trim() || 'Tài sản khác';
    }

    const quantity = parseFloat(document.getElementById('investQuantity').value);
    const buyPrice = parseFloat(document.getElementById('investBuyPrice').value);
    const currentPrice = parseFloat(document.getElementById('investCurrentPrice').value);
    const targetWeight = parseFloat(document.getElementById('investTarget').value) || null;
    const isUsd = document.getElementById('investIsUsd').checked;
    const notes = document.getElementById('investNotes').value.trim();
    const purchaseDate = document.getElementById('investPurchaseDate')?.value || new Date().toISOString().split('T')[0];

    if (!name || isNaN(quantity) || isNaN(buyPrice) || isNaN(currentPrice) || quantity <= 0) {
      return alert('Vui lòng nhập đủ: Tên tài sản, Số lượng (> 0), Giá mua và Giá hiện tại!');
    }

    const catalog = this.getAssetCatalog();
    const catInfo = catalog[name] || {};
    const type = catInfo.type || (name.includes('BTC') ? '🪙 BTC' : (name.includes('BNB') ? '🪙 BNB' : (name.includes('Vàng') ? '🥇 Vàng' : (name.includes('USD') ? '💵 USD' : '💼 Khác'))));

    // Tự động xác định nguồn giá dựa trên tên tài sản, không cần DOM
    const priceSource = {
      type: catInfo.psType || 'manual',
      symbol: catInfo.psSymbol || '',
      refreshInterval: catInfo.defaultInterval || 86400,
      lastUpdated: new Date(0).toISOString(),
      fetchStatus: 'pending'
    };

    if (!this.app.data.investments) this.app.data.investments = [];

    // Tìm xem tài sản cùng tên đã tồn tại chưa để gom nhóm
    let existingIndex = -1;
    if (this.editingIndex >= 0 && this.editingIndex < this.app.data.investments.length) {
      existingIndex = this.editingIndex;
    } else {
      existingIndex = this.app.data.investments.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
    }

    const newPurchase = {
      date: purchaseDate,
      quantity: quantity,
      buyPrice: buyPrice,
      notes: notes
    };

    if (existingIndex >= 0) {
      // Đã có tài sản: GOM NHÓM (Tính lại số lượng, giá vốn TB)
      const existing = this.app.data.investments[existingIndex];
      let purchases = Array.isArray(existing.purchases) && existing.purchases.length > 0 
        ? [...existing.purchases] 
        : [{ date: new Date().toISOString().split('T')[0], quantity: existing.quantity || 0, buyPrice: existing.buyPrice || 0, notes: existing.notes || '' }];

      purchases.push(newPurchase);

      // Tính tổng số lượng & giá vốn trung bình
      const totalQty = purchases.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);
      const totalCost = purchases.reduce((sum, p) => sum + ((parseFloat(p.quantity) || 0) * (parseFloat(p.buyPrice) || 0)), 0);
      const avgBuyPrice = totalQty > 0 ? (totalCost / totalQty) : buyPrice;

      existing.name = name;
      existing.type = type;
      existing.quantity = totalQty;
      existing.buyPrice = avgBuyPrice;
      existing.currentPrice = currentPrice;
      if (targetWeight !== null) existing.targetWeight = targetWeight;
      existing.isUsd = isUsd;
      existing.purchases = purchases;

      // Giữ lại lastUpdated nếu cùng loại tài sản để tránh refresh ngay lập tức
      if (existing.priceSource && existing.priceSource.type === priceSource.type) {
        priceSource.lastUpdated = existing.priceSource.lastUpdated;
        priceSource.fetchStatus = existing.priceSource.fetchStatus;
      }
      existing.priceSource = priceSource;
    } else {
      // Tạo tài sản mới
      const newItem = {
        name,
        type,
        quantity,
        buyPrice,
        currentPrice,
        targetWeight,
        isUsd,
        notes,
        purchases: [newPurchase],
        priceSource
      };
      this.app.data.investments.push(newItem);
    }

    this.app.save();
    this.toggleForm();
    this.renderInvestmentList();
    this.recordDailyNetWorth();
  }

  // ──────────────────────────────────────────────
  // LỊCH SỬ MUA (PURCHASE HISTORY)
  // ──────────────────────────────────────────────

  toggleCardHistory(assetName) {
    this.expandedCards[assetName] = !this.expandedCards[assetName];
    this.renderInvestmentList();
  }

  deletePurchase(assetIdx, purchaseIdx) {
    if (!confirm('Bạn có chắc muốn xóa lần mua này?')) return;
    const asset = this.app.data.investments[assetIdx];
    if (!asset || !asset.purchases || !asset.purchases[purchaseIdx]) return;

    asset.purchases.splice(purchaseIdx, 1);

    if (asset.purchases.length === 0) {
      // Nếu xóa hết lượt mua, xóa luôn asset
      this.app.data.investments.splice(assetIdx, 1);
    } else {
      // Tính lại số lượng & giá vốn trung bình
      const totalQty = asset.purchases.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);
      const totalCost = asset.purchases.reduce((sum, p) => sum + ((parseFloat(p.quantity) || 0) * (parseFloat(p.buyPrice) || 0)), 0);
      asset.quantity = totalQty;
      asset.buyPrice = totalQty > 0 ? (totalCost / totalQty) : 0;
    }

    this.app.save();
    this.renderInvestmentList();
    this.recordDailyNetWorth();
  }

  deleteItem(idx) {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ tài sản này và lịch sử mua?')) {
      if (this.app.data.investments && this.app.data.investments[idx]) {
        this.app.data.investments.splice(idx, 1);
        this.app.save();
        this.renderInvestmentList();
        this.recordDailyNetWorth();
      }
    }
  }

  // ──────────────────────────────────────────────
  // FILTER & SEARCH
  // ──────────────────────────────────────────────

  search(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.renderInvestmentList();
  }

  filter(type) {
    this.currentFilter = type;
    const filterIds = ['all', 'btc', 'bnb', 'gold', 'usd', 'save'];
    const filterMap = {
      'all': 'all',
      'btc': '🪙 BTC',
      'bnb': '🪙 BNB',
      'gold': '🥇 Vàng',
      'usd': '💵 USD',
      'save': '🏦 Tiết kiệm'
    };

    filterIds.forEach(id => {
      const btn = document.getElementById(`invFilter-${id}`);
      if (btn) {
        const val = filterMap[id];
        const isMatched = (id === 'all' && type === 'all') || val === type;
        btn.className = isMatched
          ? 'shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors'
          : 'shrink-0 px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 transition-colors';
      }
    });
    this.renderInvestmentList();
  }

  // ──────────────────────────────────────────────
  // RECORD DAILY NET WORTH (Lúc 00:00 hoặc khi mở app)
  // ──────────────────────────────────────────────

  recordDailyNetWorth() {
    if (!this.app.data.netWorthHistory) this.app.data.netWorthHistory = [];
    const list = this.app.data.investments || [];
    const usdRate = this.app.data.usdRate || 25400;

    let totalValueVnd = 0;
    list.forEach(item => {
      const cPrice = item.currentPrice !== undefined ? item.currentPrice : (item.price || 0);
      const value = item.isUsd ? (item.quantity * cPrice * usdRate) : (item.quantity * cPrice);
      totalValueVnd += value;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.app.data.netWorthHistory.find(h => h.date === todayStr);

    if (existing) {
      existing.value = totalValueVnd;
    } else {
      this.app.data.netWorthHistory.push({ date: todayStr, value: totalValueVnd });
      // Giữ tối đa 60 ngày gần nhất
      if (this.app.data.netWorthHistory.length > 60) {
        this.app.data.netWorthHistory = this.app.data.netWorthHistory.slice(-60);
      }
    }

    this.app.save();

    if (this.app.charts && typeof this.app.charts.renderInvestmentCharts === 'function') {
      this.app.charts.renderInvestmentCharts();
    } else if (this.app.investmentChart) {
      this.app.investmentChart.renderNetWorth(this.app.data.netWorthHistory, this.app.data.isDarkMode);
    }
  }

  // ──────────────────────────────────────────────
  // RENDER HELPERS
  // ──────────────────────────────────────────────

  _priceBadge(priceSource) {
    if (!priceSource || priceSource.type === 'manual') {
      return '<span class="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 rounded font-medium">✋ Thủ công</span>';
    }
    const isOk = priceSource.fetchStatus === 'success';
    const isErr = priceSource.fetchStatus === 'error';
    const icon = isOk ? '🔄' : isErr ? '⚠️' : '⏳';
    const colorClass = isOk
      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
      : isErr
        ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
        : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400';

    const sym = priceSource.symbol || '';
    const label = { crypto: 'CoinGecko', gold_vn: 'Vàng SJC', gold_world: 'XAU/USD', usd: 'Open ER', stock: 'AlphaVantage' }[priceSource.type] || 'Auto';
    let lastStr = '';
    if (priceSource.lastUpdated && priceSource.lastUpdated !== new Date(0).toISOString()) {
      const d = new Date(priceSource.lastUpdated);
      lastStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    }

    return `<span class="text-[9px] px-1.5 py-0.5 ${colorClass} rounded font-medium whitespace-nowrap" title="Nguồn: ${label}${sym ? ' · ' + sym : ''}${lastStr ? ' · Lúc ' + lastStr : ''}">${icon} ${label}${lastStr ? ' ' + lastStr : ''}</span>`;
  }

  _summaryBadges(list) {
    let autoCount = 0, manualCount = 0;
    list.forEach(i => {
      if (i.priceSource && i.priceSource.type !== 'manual') autoCount++;
      else manualCount++;
    });
    const badges = [];
    if (autoCount > 0) badges.push(`<span class="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded font-medium">🔄 ${autoCount} Auto</span>`);
    if (manualCount > 0) badges.push(`<span class="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded font-medium">✋ ${manualCount} Thủ công</span>`);
    return badges.join(' ');
  }

  // ──────────────────────────────────────────────
  // MAIN RENDER LIST
  // ──────────────────────────────────────────────

  renderInvestmentList() {
    const container = document.getElementById('investmentList');
    if (!container) return;

    const list = this.app.data.investments || [];
    const usdRate = this.app.data.usdRate || 25400;
    let totalCostVnd = 0;
    let totalValueVnd = 0;

    list.forEach(item => {
      const bPrice = item.buyPrice !== undefined ? item.buyPrice : (item.price || 0);
      const cPrice = item.currentPrice !== undefined ? item.currentPrice : (item.price || 0);
      const cost  = item.isUsd ? (item.quantity * bPrice  * usdRate) : (item.quantity * bPrice);
      const value = item.isUsd ? (item.quantity * cPrice  * usdRate) : (item.quantity * cPrice);
      totalCostVnd  += cost;
      totalValueVnd += value;
    });

    const totalPnL = totalValueVnd - totalCostVnd;
    const totalRoi = totalCostVnd > 0 ? (totalPnL / totalCostVnd) * 100 : 0;

    const totalValEl = document.getElementById('investTotalValue');
    if (totalValEl) totalValEl.innerText = Utils.formatCurrency(totalValueVnd);

    const totalCostEl = document.getElementById('investTotalCost');
    if (totalCostEl) totalCostEl.innerText = Utils.formatCurrency(totalCostVnd);

    const pnlEl = document.getElementById('investTotalPnL');
    if (pnlEl) {
      pnlEl.innerText = totalPnL >= 0
        ? `+${Utils.formatCurrency(totalPnL)} (+${totalRoi.toFixed(2)}%)`
        : `${Utils.formatCurrency(totalPnL)} (${totalRoi.toFixed(2)}%)`;
      pnlEl.className = totalPnL >= 0
        ? 'text-sm font-bold text-emerald-400 drop-shadow-sm'
        : 'text-sm font-bold text-rose-400 drop-shadow-sm';
    }

    const badgeEl = document.getElementById('investPriceBadges');
    if (badgeEl) badgeEl.innerHTML = this._summaryBadges(list);

    // Filter & Search
    let displayList = list.map((item, idx) => ({ ...item, rawIdx: idx }));

    if (this.currentFilter !== 'all') {
      displayList = displayList.filter(i => {
        if (this.currentFilter === '🪙 BTC') return i.name.toUpperCase().includes('BTC') || i.type === '🪙 BTC';
        if (this.currentFilter === '🪙 BNB') return i.name.toUpperCase().includes('BNB') || i.type === '🪙 BNB';
        if (this.currentFilter === '🥇 Vàng') return i.name.includes('Vàng') || i.type === '🥇 Vàng';
        if (this.currentFilter === '💵 USD') return i.name.includes('USD') || i.type === '💵 USD';
        if (this.currentFilter === '🏦 Tiết kiệm') return i.name.includes('Tiết kiệm') || i.type === '🏦 Tiết kiệm';
        return i.type === this.currentFilter;
      });
    }

    if (this.searchQuery) {
      displayList = displayList.filter(i =>
        (i.name && i.name.toLowerCase().includes(this.searchQuery)) ||
        (i.notes && i.notes.toLowerCase().includes(this.searchQuery))
      );
    }

    displayList.sort((a, b) => {
      const cA = a.currentPrice !== undefined ? a.currentPrice : (a.price || 0);
      const cB = b.currentPrice !== undefined ? b.currentPrice : (b.price || 0);
      const vA = a.isUsd ? (a.quantity * cA * usdRate) : (a.quantity * cA);
      const vB = b.isUsd ? (b.quantity * cB * usdRate) : (b.quantity * cB);
      return vB - vA;
    });

    if (displayList.length === 0) {
      container.innerHTML = '<div class="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700"><p class="text-sm text-gray-500">Không tìm thấy tài sản phù hợp</p></div>';
    } else {
      container.innerHTML = displayList.map(item => {
        const bPrice  = item.buyPrice !== undefined ? item.buyPrice : (item.price || 0);
        const cPrice  = item.currentPrice !== undefined ? item.currentPrice : (item.price || 0);
        const costVnd = item.isUsd ? (item.quantity * bPrice  * usdRate) : (item.quantity * bPrice);
        const valueVnd = item.isUsd ? (item.quantity * cPrice * usdRate) : (item.quantity * cPrice);
        const pnl   = valueVnd - costVnd;
        const roi   = costVnd > 0 ? (pnl / costVnd) * 100 : 0;
        const weight = totalValueVnd > 0 ? (valueVnd / totalValueVnd) * 100 : 0;

        const pnlColorClass = pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        const pnlSign       = pnl >= 0 ? '+' : '';
        const dollarSign    = item.isUsd ? '$' : '';
        const priceFormat   = item.isUsd ? 'en-US' : 'vi-VN';
        const priceBadge    = this._priceBadge(item.priceSource);

        const purchases = Array.isArray(item.purchases) && item.purchases.length > 0 
          ? item.purchases 
          : [{ date: 'Ban đầu', quantity: item.quantity, buyPrice: bPrice, notes: item.notes || '' }];

        const isExpanded = !!this.expandedCards[item.name];

        const catalog = this.getAssetCatalog();
        const assetInfo = catalog[item.name] || {};
        const assetIcon = assetInfo.icon || (item.name.includes('BTC') ? 'fa-brands fa-bitcoin' : (item.name.includes('BNB') ? 'fa-solid fa-coins' : 'fa-solid fa-wallet'));
        const assetIconColor = assetInfo.iconColor || 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60';

        const refreshBtn = (item.priceSource && item.priceSource.type !== 'manual')
          ? `<button onclick="window.app.investment.refreshSingle(${item.rawIdx})" title="Refresh giá ngay" class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 flex items-center justify-center transition-colors active:scale-95"><i class="fa-solid fa-rotate text-sm"></i></button>`
          : '';

        let targetHtml = '';
        if (item.targetWeight) {
          const isOver = weight > item.targetWeight;
          targetHtml = `
            <div class="mt-2.5">
              <div class="flex justify-between text-[9px] text-gray-400 mb-1">
                <span>Tiến độ phân bổ</span>
                <span>Mục tiêu: ${item.targetWeight}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full flex overflow-hidden">
                <div class="bg-indigo-500 h-full" style="width: ${Math.min(weight, item.targetWeight)}%"></div>
                ${isOver ? `<div class="bg-rose-400 h-full" style="width: ${weight - item.targetWeight}%" title="Vượt mục tiêu"></div>` : ''}
              </div>
            </div>`;
        } else {
          targetHtml = `
            <div class="mt-2.5">
              <div class="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div class="bg-indigo-500 h-full" style="width: ${weight}%"></div>
              </div>
            </div>`;
        }

        // Purchases History section HTML
        const purchasesHtml = `
          <div class="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-700/80 ${isExpanded ? '' : 'hidden'}">
            <div class="flex justify-between items-center mb-1.5">
              <span class="text-[11px] font-bold text-gray-700 dark:text-slate-300">Lịch sử ${purchases.length} lần mua</span>
              <button onclick="window.app.investment.openForm(-1, '${item.name}')" class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold rounded-md hover:underline">
                + Thêm lần mua
              </button>
            </div>
            <div class="space-y-1.5">
              ${purchases.map((p, pIdx) => {
                const pCostVnd = item.isUsd ? (p.quantity * p.buyPrice * usdRate) : (p.quantity * p.buyPrice);
                return `
                  <div class="flex justify-between items-center bg-gray-50 dark:bg-slate-900/40 p-2.5 rounded-xl text-[11px] border border-gray-100 dark:border-slate-800">
                    <div>
                      <div class="font-semibold text-gray-800 dark:text-slate-200">
                        <span>📅 ${p.date ? Utils.formatDate(p.date) : 'N/A'}</span>
                        <span class="ml-2 text-gray-500 font-bold">SL: ${p.quantity}</span>
                      </div>
                      <div class="text-gray-400 mt-0.5">
                        Giá mua: ${dollarSign}${p.buyPrice.toLocaleString(priceFormat)} ${p.notes ? '• ' + p.notes : ''}
                      </div>
                    </div>
                    <div class="flex items-center space-x-2.5">
                      <span class="font-bold text-gray-700 dark:text-slate-300">${Utils.formatCurrency(pCostVnd)}</span>
                      <button onclick="window.app.investment.deletePurchase(${item.rawIdx}, ${pIdx})" class="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-500 hover:text-rose-700 flex items-center justify-center transition-colors" title="Xóa lần mua">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;

        return `
          <div class="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-2.5">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl ${assetIconColor} flex items-center justify-center text-base shadow-sm">
                  <i class="${assetIcon}"></i>
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <h4 class="text-sm font-bold text-gray-900 dark:text-white">${item.name}</h4>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold">${purchases.length} lần mua</span>
                  </div>
                  <p class="text-[10px] text-gray-500 font-medium">${item.type} • Tỷ trọng: <span class="font-bold text-indigo-600 dark:text-indigo-400">${weight.toFixed(1)}%</span></p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold text-gray-900 dark:text-white">${Utils.formatCurrency(valueVnd)}</p>
                <p class="text-[11px] font-bold ${pnlColorClass}">${pnlSign}${Utils.formatCurrency(pnl)} (${pnlSign}${roi.toFixed(2)}%)</p>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-slate-900/60 rounded-xl p-3 text-[11px] text-gray-600 dark:text-slate-400 flex justify-between items-center border border-gray-100 dark:border-slate-700/50">
              <div class="space-y-1">
                <p>Giá vốn TB: <span class="font-semibold text-gray-800 dark:text-slate-200">${dollarSign}${bPrice.toLocaleString(priceFormat, { maximumFractionDigits: 4 })}</span></p>
                <p>Giá TT: <span class="font-semibold text-gray-800 dark:text-slate-200">${dollarSign}${cPrice.toLocaleString(priceFormat, { maximumFractionDigits: 4 })}</span></p>
              </div>
              <div class="text-right space-y-1.5 flex flex-col justify-between h-full">
                <p>Tổng SL: <span class="font-semibold text-gray-800 dark:text-slate-200">${item.quantity.toLocaleString(priceFormat, { maximumFractionDigits: 6 })}</span></p>
                <div class="flex space-x-1.5 justify-end mt-1 items-center">
                  ${refreshBtn}
                  <button onclick="window.app.investment.toggleCardHistory('${item.name}')" title="Xem lịch sử mua" class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 flex items-center justify-center transition-colors active:scale-95">
                    <i class="fa-solid fa-clock-rotate-left text-sm"></i>
                  </button>
                  <button onclick="window.app.investment.openForm(${item.rawIdx})" title="Thêm lần mua mới" class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center justify-center transition-colors active:scale-95">
                    <i class="fa-solid fa-plus text-sm"></i>
                  </button>
                  <button onclick="window.app.investment.deleteItem(${item.rawIdx})" title="Xóa tài sản" class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:text-rose-700 flex items-center justify-center transition-colors active:scale-95">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Price source badge row -->
            <div class="flex items-center justify-between mt-2">
              ${priceBadge}
              ${item.notes ? `<p class="text-[10px] text-gray-400 italic truncate max-w-[60%]"><i class="fa-solid fa-circle-info mr-1 text-[8px]"></i>${item.notes}</p>` : '<span></span>'}
            </div>

            ${targetHtml}
            ${purchasesHtml}
          </div>`;
      }).join('');
    }

    if (this.app.charts && typeof this.app.charts.renderInvestmentCharts === 'function') {
      setTimeout(() => this.app.charts.renderInvestmentCharts(), 100);
    } else if (this.app.investmentChart) {
      setTimeout(() => {
        this.app.investmentChart.render(this.app.data.investments, this.app.data.usdRate, this.app.data.isDarkMode);
        this.app.investmentChart.renderNetWorth(this.app.data.netWorthHistory, this.app.data.isDarkMode);
      }, 100);
    }
  }

  // ──────────────────────────────────────────────
  // MANUAL SINGLE-ITEM REFRESH
  // ──────────────────────────────────────────────

  async refreshSingle(rawIdx) {
    const inv = this.app.data.investments[rawIdx];
    if (!inv || !inv.priceSource || inv.priceSource.type === 'manual') return;

    inv.priceSource.lastUpdated = new Date(0).toISOString();
    inv.priceSource.fetchStatus = 'pending';
    this.renderInvestmentList();

    this.app.data.investments[rawIdx] = await priceUpdater.updateSingleItem(inv, this.app.data.usdRate || 25400);
    this.app.save();
    this.renderInvestmentList();
    this.recordDailyNetWorth();
  }

  // ──────────────────────────────────────────────
  // USD RATE
  // ──────────────────────────────────────────────

  async fetchRealtimeUsdRate() {
    try {
      const rate = await priceUpdater.fetchUsdRate();
      if (rate) {
        this.app.data.usdRate = rate;
        const rateInput = document.getElementById('usdRateInput');
        if (rateInput) rateInput.value = rate;
        this.app.save();
        this.renderInvestmentList();
        this.recordDailyNetWorth();
      }
    } catch (err) {
      console.log('Không thể lấy tỷ giá tự động:', err);
    }
  }

  updateUsdRate(val) {
    const rate = parseFloat(val);
    if (rate && rate > 0) {
      this.app.data.usdRate = rate;
      this.app.save();
      this.renderInvestmentList();
      this.recordDailyNetWorth();
    }
  }
}

// ──────────────────────────────────────────────
// GLOBAL ALIASES (backward compat for HTML onclick)
// ──────────────────────────────────────────────
function toggleInvestmentForm()         { window.app.investment.toggleForm(); }
function openInvestmentForm(idx, name)  { window.app.investment.openForm(idx, name); }
function saveInvestment()               { window.app.investment.saveInvestment(); }
function deleteInvestmentItem(idx)      { window.app.investment.deleteItem(idx); }
function searchInvestment(query)        { window.app.investment.search(query); }
function filterInvestment(type)         { window.app.investment.filter(type); }
function updateUsdRate(val)             { window.app.investment.updateUsdRate(val); }
function fetchRealtimeUsdRate()         { window.app.investment.fetchRealtimeUsdRate(); }
function updatePriceSourceFields()      { window.app.investment.updatePriceSourceFields(); }
function onAssetNameChange()            { window.app.investment.onAssetNameChange(); }
function toggleCardHistory(name)        { window.app.investment.toggleCardHistory(name); }
