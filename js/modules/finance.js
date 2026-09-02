/**
 * DuoSpace Modules - Finance Tab Logic (Thu - Chi)
 * v2.6.2: Thêm Phân trang (Load more theo 7 ngày) + Bộ lọc theo khoảng ngày (Date Range Filter)
 */
class FinanceModule {
  constructor(app) {
    this.app = app;
    this.currentFilter = 'all';
    this.searchQuery = '';

    // Pagination & Filter States (Default 10 transactions)
    this.financeState = {
      countLoaded: 10,
      hasMore: true
    };

    this.filterState = {
      isActive: false,
      dateFrom: null,
      dateTo: null
    };
  }

  render() {
    this.renderFinanceList();
  }

  filter(type) {
    this.currentFilter = type;
    this.financeState.countLoaded = 10;
    ['all', 'expense', 'income'].forEach(t => {
      const btn = document.getElementById(`finFilter-${t}`);
      if (!btn) return;
      if (t === type) {
        btn.className = "px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 shadow-sm text-gray-800 dark:text-slate-200 font-semibold";
      } else {
        btn.className = "px-2.5 py-1 rounded-md text-gray-500 dark:text-slate-400";
      }
    });
    this.renderFinanceList();
  }

  search(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.financeState.countLoaded = 10;
    this.renderFinanceList();
  }

  // ──────────────────────────────────────────────
  // DATE RANGE FILTER LOGIC
  // ──────────────────────────────────────────────

  applyDateFilter() {
    const fromVal = document.getElementById('filterDateFrom')?.value;
    const toVal = document.getElementById('filterDateTo')?.value;

    if (!fromVal || !toVal) {
      alert('Vui lòng chọn cả từ ngày và đến ngày!');
      return;
    }

    const from = new Date(fromVal);
    const to = new Date(toVal);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      alert('Ngày đã chọn không hợp lệ!');
      return;
    }

    if (from > to) {
      alert('Từ ngày phải trước hoặc bằng Đến ngày!');
      return;
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    this.filterState.isActive = true;
    this.filterState.dateFrom = from;
    this.filterState.dateTo = to;
    this.financeState.countLoaded = 10;

    this.renderFinanceList();
  }

  resetDateFilter() {
    const fromInput = document.getElementById('filterDateFrom');
    const toInput = document.getElementById('filterDateTo');
    const summaryEl = document.getElementById('filterSummary');

    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    if (summaryEl) summaryEl.innerText = '';

    this.filterState.isActive = false;
    this.filterState.dateFrom = null;
    this.filterState.dateTo = null;
    this.financeState.countLoaded = 10; // Đặt lại hiển thị mặc định 10 giao dịch

    this.renderFinanceList();
  }

  setDateFilterRange(range) {
    const today = new Date();
    let from, to = new Date(today);

    switch(range) {
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last30Days':
        from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'thisYear':
        from = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const fromInput = document.getElementById('filterDateFrom');
    const toInput = document.getElementById('filterDateTo');

    if (fromInput) fromInput.value = from.toISOString().split('T')[0];
    if (toInput) toInput.value = to.toISOString().split('T')[0];

    this.applyDateFilter();
  }

  // ──────────────────────────────────────────────
  // PAGINATION (LOAD MORE +10 ITEMS)
  // ──────────────────────────────────────────────

  loadMoreTransactions() {
    this.financeState.countLoaded += 10;
    this.renderFinanceList();
  }

  // ──────────────────────────────────────────────
  // RENDER TRANSACTIONS
  // ──────────────────────────────────────────────

  renderFinanceList() {
    const financeList = document.getElementById('financeList');
    if (!financeList) return;

    let allCombined = [
      ...(this.app.data.expenses || []).map((e, idx) => ({ ...e, type: 'expense', rawIdx: idx })),
      ...(this.app.data.incomes || []).map((i, idx) => ({ ...i, type: 'income', rawIdx: idx }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate overall Totals for Top Summary (regardless of search, or based on date filter if active)
    let summaryBase = allCombined;
    if (this.filterState.isActive && this.filterState.dateFrom && this.filterState.dateTo) {
      summaryBase = summaryBase.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d >= this.filterState.dateFrom && d <= this.filterState.dateTo;
      });
    }

    const totalIncome = summaryBase.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = summaryBase.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);

    const incomeTotalEl = document.getElementById('incomeTotal');
    if (incomeTotalEl) incomeTotalEl.innerText = Utils.formatCurrency(totalIncome);

    const expenseTotalEl = document.getElementById('expenseTotal');
    if (expenseTotalEl) expenseTotalEl.innerText = Utils.formatCurrency(totalExpense);

    // Apply Filter type (expense/income/all)
    let processed = allCombined;
    if (this.currentFilter !== 'all') {
      processed = processed.filter(item => item.type === this.currentFilter);
    }

    // Apply Search Query
    if (this.searchQuery) {
      processed = processed.filter(item =>
        (item.desc && item.desc.toLowerCase().includes(this.searchQuery)) ||
        (item.notes && item.notes.toLowerCase().includes(this.searchQuery)) ||
        (item.category && item.category.toLowerCase().includes(this.searchQuery))
      );
    }

    // Apply Date Filter if active
    let filteredList = processed;
    const summaryEl = document.getElementById('filterSummary');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (this.filterState.isActive && this.filterState.dateFrom && this.filterState.dateTo) {
      filteredList = processed.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d >= this.filterState.dateFrom && d <= this.filterState.dateTo;
      });

      if (summaryEl) {
        summaryEl.innerText = `Lọc: ${Utils.formatDate(this.filterState.dateFrom)} - ${Utils.formatDate(this.filterState.dateTo)} (${filteredList.length} giao dịch)`;
        summaryEl.classList.remove('hidden');
      }
    } else {
      if (summaryEl) {
        summaryEl.innerText = '';
        summaryEl.classList.add('hidden');
      }
    }

    // Paginate by countLoaded (default 10)
    const displayed = filteredList.slice(0, this.financeState.countLoaded);
    const remainingCount = filteredList.length - displayed.length;

    if (loadMoreContainer) {
      if (remainingCount > 0) {
        loadMoreContainer.classList.remove('hidden');
        if (loadMoreBtn) {
          loadMoreBtn.innerHTML = `📥 Xem thêm (Còn ${remainingCount} giao dịch · Hiển thị ${displayed.length}/${filteredList.length})`;
        }
      } else {
        loadMoreContainer.classList.add('hidden');
      }
    }

    if (displayed.length === 0) {
      financeList.innerHTML = '<p class="text-sm text-gray-400 dark:text-slate-500 text-center py-4">Chưa có giao dịch nào phù hợp</p>';
      return;
    }

    financeList.innerHTML = displayed.map(item => {
      const isExpense = item.type === 'expense';
      const icon = isExpense ? (item.category ? item.category.split(' ')[0] : '💸') : '💰';
      const color = isExpense ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
      const sign = isExpense ? '-' : '+';
      const byLabel = isExpense ? 'Chi bởi' : 'Thu bởi';
      const userText = item.user === 'Đ' ? 'Đức' : 'Sương';
      const catTag = isExpense && item.category
        ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 ml-1">${item.category}</span>`
        : '';
      const dateStr = item.date ? Utils.formatDate(item.date) : '';

      return `
        <div onclick="window.app.finance.editFinance('${item.type}', ${item.rawIdx})" class="clickable-row py-2 border-b border-gray-50 dark:border-slate-700/50 last:border-0 space-y-1 hover:bg-gray-50 dark:hover:bg-slate-700/40 p-2 rounded-lg transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 flex-1">
              <span class="text-base">${icon}</span>
              <div>
                <p class="text-sm font-medium text-gray-800 dark:text-slate-200">${item.desc} ${catTag}</p>
                <p class="text-[11px] text-gray-400 dark:text-slate-500">${dateStr} • ${byLabel} <strong class="text-gray-600 dark:text-slate-300">${userText}</strong></p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span class="font-bold text-sm ${color}">${sign}${Utils.formatCurrency(item.amount)}</span>
              <button onclick="event.stopPropagation(); window.app.finance.deleteFinance('${item.type}', ${item.rawIdx})" class="text-gray-300 hover:text-red-500 text-xs p-1" title="Xóa">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          ${item.notes ? `<p class="text-[10px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/60 p-1.5 rounded border border-gray-100 dark:border-slate-800">📝 ${item.notes}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  deleteFinance(type, idx) {
    const item = type === 'expense' ? this.app.data.expenses?.[idx] : this.app.data.incomes?.[idx];
    if (type === 'expense') {
      if (item?.linkedMaintenanceId) {
        this.app.data.bikeMaintenances = (this.app.data.bikeMaintenances || []).filter(m => m.id !== item.linkedMaintenanceId);
      } else if (item?.category?.includes('Xe')) {
        this.app.data.bikeMaintenances = (this.app.data.bikeMaintenances || []).filter(maintenance => !(
          maintenance.source === 'expense' &&
          maintenance.bike === item.bike &&
          maintenance.title === item.vehicleItem &&
          Number(maintenance.cost) === Number(item.amount)
        ));
      }
      if (item?.id) this.app.investment?.removePurchaseByExpenseId(item.id);
      if (this.app.data.expenses && this.app.data.expenses[idx]) {
        this.app.data.expenses.splice(idx, 1);
      }
    } else {
      if (this.app.data.incomes && this.app.data.incomes[idx]) {
        this.app.data.incomes.splice(idx, 1);
      }
    }
    if (item) this.app.log?.system(type === 'expense' ? 'Xóa khoản chi' : 'Xóa khoản thu', `${item.desc || 'Không có mô tả'} · ${(item.amount || 0).toLocaleString('vi-VN')} VNĐ`);
    this.app.save();
    this.app.render();
  }

  editFinance(type, index) {
    ModalManager.editingType = type;
    ModalManager.editingIndex = index;
    const item = type === 'expense' ? this.app.data.expenses[index] : this.app.data.incomes[index];

    document.getElementById('modalMainTitle').innerText = type === 'expense' ? "Chỉnh sửa khoản chi" : "Chỉnh sửa khoản thu";
    document.getElementById('typeSelector').classList.add('hidden');
    ModalManager.setAddType(type);

    if (type === 'expense') {
      document.getElementById('expenseAmount').value = item.amount || '';
      document.getElementById('expenseDate').value = (item.date || '').slice(0, 10);
      document.getElementById('expenseDesc').value = item.desc || '';
      document.getElementById('expenseCategory').value = item.category || '📦 Khác';
      document.getElementById('expenseUser').value = item.user || 'Đ';
      document.getElementById('expenseNotes').value = item.notes || '';
      document.getElementById('expenseBike').value = item.bike || 'NMAX';
      document.getElementById('expenseOdo').value = item.odo || '';
      const itemSelect = document.getElementById('expenseVehicleItem');
      if (itemSelect) {
        const knownItem = Array.from(itemSelect.options).some(option => option.value === item.vehicleItem);
        itemSelect.value = knownItem ? item.vehicleItem : 'Khác';
        document.getElementById('expenseVehicleCustomItem').value = knownItem ? '' : (item.vehicleItem || '');
      }
      ModalManager.onExpenseCategoryChange();
      ModalManager.onExpenseVehicleItemChange();
      if ((item.category || '').includes('Đầu tư')) {
        const asset = (this.app.data.investments || []).find(candidate => (candidate.purchases || []).some(purchase => purchase.expenseId === item.id));
        const purchase = asset?.purchases?.find(candidate => candidate.expenseId === item.id);
        if (asset && purchase) {
          const nameSelect = document.getElementById('expenseInvestName');
          const hasName = Array.from(nameSelect.options).some(option => option.value === asset.name);
          nameSelect.value = hasName ? asset.name : 'Khác';
          document.getElementById('expenseInvestCustomName').value = hasName ? '' : asset.name;
          document.getElementById('expenseInvestQuantity').value = purchase.quantity;
          document.getElementById('expenseInvestBuyPrice').value = purchase.buyPrice;
          document.getElementById('expenseInvestCurrentPrice').value = asset.currentPrice;
          document.getElementById('expenseInvestTarget').value = asset.targetWeight || '';
          document.getElementById('expenseInvestIsUsd').checked = !!asset.isUsd;
          document.getElementById('expenseInvestCustomName').classList.toggle('hidden', hasName);
        }
      }
      document.getElementById('saveExpenseBtn').innerText = "Cập nhật khoản chi";
    } else {
      document.getElementById('incomeAmount').value = item.amount || '';
      document.getElementById('incomeDate').value = (item.date || '').slice(0, 10);
      document.getElementById('incomeDesc').value = item.desc || '';
      document.getElementById('incomeUser').value = item.user || 'Đ';
      document.getElementById('incomeNotes').value = item.notes || '';
      document.getElementById('saveIncomeBtn').innerText = "Cập nhật khoản thu";
    }

    ModalManager.openAddModal();
  }

  saveExpenseAction() {
    const category = document.getElementById('expenseCategory').value;
    const isInvestmentExpense = category.includes('Đầu tư');
    if (isInvestmentExpense) ModalManager.updateExpenseInvestmentAmount();
    const amount = Math.round(parseFloat(document.getElementById('expenseAmount').value));
    let desc = document.getElementById('expenseDesc').value.trim();
    const user = document.getElementById('expenseUser').value;
    const notes = document.getElementById('expenseNotes').value.trim();

    const isVehicleExpense = category.includes('Xe');
    const bike = document.getElementById('expenseBike')?.value;
    const odo = parseInt(document.getElementById('expenseOdo')?.value, 10);
    const vehicleSelection = document.getElementById('expenseVehicleItem')?.value;
    const vehicleItem = vehicleSelection === 'Khác'
      ? document.getElementById('expenseVehicleCustomItem')?.value.trim()
      : vehicleSelection;
    if (isVehicleExpense && (!bike || !vehicleItem || isNaN(odo))) {
      return alert('Vui lòng nhập xe, hạng mục và số ODO cho khoản chi xe.');
    }

    const investment = isInvestmentExpense ? this.readInvestmentExpenseFields() : null;
    if (isInvestmentExpense && !investment) return;
    if (isVehicleExpense) desc = `Bảo dưỡng ${bike}: ${vehicleItem}`;
    if (isInvestmentExpense) desc = `Đầu tư ${investment.name}`;
    if (isNaN(amount) || !desc) return alert('Vui lòng nhập đủ số tiền và mô tả!');
    const expenseDate = document.getElementById('expenseDate')?.value;
    if (!expenseDate) return alert('Vui lòng chọn ngày chi.');

    const editingExpense = ModalManager.editingType === 'expense' && ModalManager.editingIndex >= 0;
    const previousExpense = editingExpense ? { ...this.app.data.expenses[ModalManager.editingIndex] } : null;
    const expenseId = editingExpense ? (this.app.data.expenses[ModalManager.editingIndex].id || Utils.createId('expense')) : Utils.createId('expense');
    const expenseRecord = {
      id: expenseId,
      amount,
      desc,
      category,
      user,
      notes,
      ...(isVehicleExpense ? { bike, odo, vehicleItem } : {}),
      date: new Date(`${expenseDate}T12:00:00`).toISOString()
    };

    if (editingExpense) {
      this.app.data.expenses[ModalManager.editingIndex] = {
        ...this.app.data.expenses[ModalManager.editingIndex],
        ...expenseRecord
      };
    } else {
      this.app.data.expenses.push(expenseRecord);
    }

    if (isVehicleExpense && !editingExpense) {
      if (!this.app.data.bikeMaintenances) this.app.data.bikeMaintenances = [];
      const maintenanceId = Utils.createId('maintenance');
      this.app.data.bikeMaintenances.push({ id: maintenanceId, expenseId, bike, title: vehicleItem, odo, cost: amount, date: new Date(`${expenseDate}T12:00:00`).toISOString(), source: 'expense' });
      expenseRecord.linkedMaintenanceId = maintenanceId;
      if (!this.app.data.settings) this.app.data.settings = {};
      const odoKey = bike === 'NMAX' ? 'nmaxOdo' : 'grandeOdo';
      this.app.data.settings[odoKey] = Math.max(this.app.data.settings[odoKey] || 0, odo);
    }

    if (isVehicleExpense && editingExpense) this.syncLinkedMaintenance(this.app.data.expenses[ModalManager.editingIndex]);

    if (isInvestmentExpense && !editingExpense) this.addInvestmentFromExpense(investment, notes, expenseDate, expenseId);
    if (isInvestmentExpense && editingExpense) this.app.investment?.updatePurchaseByExpenseId(expenseId, investment, expenseDate, notes);

    const updatedExpense = this.app.data.expenses[editingExpense ? ModalManager.editingIndex : this.app.data.expenses.length - 1];
    this.app.log?.system(
      editingExpense ? 'Cập nhật khoản chi' : 'Thêm khoản chi',
      editingExpense ? this.describeChanges(previousExpense, updatedExpense) : `${desc} · ${amount.toLocaleString('vi-VN')} VNĐ${isInvestmentExpense ? ' · Đã cập nhật danh mục đầu tư' : ''}${isVehicleExpense ? ' · Đã thêm lịch sử bảo dưỡng' : ''}`
    );

    this.app.save();
    this.app.render();
    ModalManager.closeAddModal();
  }

  readInvestmentExpenseFields() {
    const selected = document.getElementById('expenseInvestName')?.value;
    const customName = document.getElementById('expenseInvestCustomName')?.value.trim();
    const name = selected === 'Khác' ? customName : selected;
    const quantity = parseFloat(document.getElementById('expenseInvestQuantity')?.value);
    const buyPrice = parseFloat(document.getElementById('expenseInvestBuyPrice')?.value);
    const currentPrice = parseFloat(document.getElementById('expenseInvestCurrentPrice')?.value);
    if (!name || isNaN(quantity) || quantity <= 0 || isNaN(buyPrice) || isNaN(currentPrice)) {
      alert('Vui lòng nhập đầy đủ thông tin tài sản: tên, số lượng, giá mua và giá hiện tại.');
      return null;
    }
    return { name, quantity, buyPrice, currentPrice, targetWeight: parseFloat(document.getElementById('expenseInvestTarget')?.value) || null, isUsd: !!document.getElementById('expenseInvestIsUsd')?.checked };
  }

  syncLinkedMaintenance(expense) {
    const maintenance = (this.app.data.bikeMaintenances || []).find(item =>
      item.id === expense.linkedMaintenanceId ||
      item.expenseId === expense.id ||
      // Bản ghi tạo từ phiên bản cũ chỉ có source: 'expense', chưa có mã liên kết.
      (item.source === 'expense' && item.bike === expense.bike && item.title === expense.vehicleItem)
    );
    if (!maintenance) return;
    if (!maintenance.id) maintenance.id = Utils.createId('maintenance');
    Object.assign(maintenance, { bike: expense.bike, title: expense.vehicleItem, odo: expense.odo, cost: expense.amount, date: expense.date, expenseId: expense.id });
    expense.linkedMaintenanceId = maintenance.id;
  }

  describeChanges(before, after) {
    const labels = { amount: 'Số tiền', desc: 'Mô tả', category: 'Danh mục', user: 'Người chi', odo: 'ODO', vehicleItem: 'Hạng mục', date: 'Ngày' };
    const changes = Object.keys(labels).filter(key => String(before?.[key] ?? '') !== String(after?.[key] ?? '')).map(key => {
      const format = value => key === 'amount' ? `${Number(value || 0).toLocaleString('vi-VN')} VNĐ` : (value || 'trống');
      return `${labels[key]}: ${format(before[key])} → ${format(after[key])}`;
    });
    return changes.length ? changes.join(' · ') : 'Không thay đổi dữ liệu';
  }

  addInvestmentFromExpense(item, notes, purchaseDate, expenseId) {
    const catalog = this.app.investment.getAssetCatalog();
    const info = catalog[item.name] || {};
    const type = info.type || (item.name.includes('BTC') ? '🪙 BTC' : item.name.includes('BNB') ? '🪙 BNB' : item.name.includes('Vàng') ? '🥇 Vàng' : item.name.includes('USD') ? '💵 USD' : '💼 Khác');
    const priceSource = { type: info.psType || 'manual', symbol: info.psSymbol || '', refreshInterval: info.defaultInterval || 86400, lastUpdated: new Date(0).toISOString(), fetchStatus: 'pending' };
    const purchase = { id: Utils.createId('purchase'), expenseId, date: purchaseDate || new Date().toISOString().split('T')[0], quantity: item.quantity, buyPrice: item.buyPrice, notes };
    if (!this.app.data.investments) this.app.data.investments = [];
    const existing = this.app.data.investments.find(asset => asset.name.toLowerCase() === item.name.toLowerCase());
    if (existing) {
      const purchases = Array.isArray(existing.purchases) && existing.purchases.length ? [...existing.purchases] : [{ date: purchase.date, quantity: existing.quantity || 0, buyPrice: existing.buyPrice || 0, notes: existing.notes || '' }];
      purchases.push(purchase);
      const totalQty = purchases.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);
      existing.quantity = totalQty;
      existing.buyPrice = purchases.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0) * (parseFloat(p.buyPrice) || 0), 0) / totalQty;
      existing.currentPrice = item.currentPrice;
      existing.isUsd = item.isUsd;
      existing.purchases = purchases;
      if (item.targetWeight !== null) existing.targetWeight = item.targetWeight;
    } else {
      this.app.data.investments.push({ ...item, type, notes, purchases: [purchase], priceSource });
    }
  }

  saveIncomeAction() {
    const amount = parseInt(document.getElementById('incomeAmount').value);
    const desc = document.getElementById('incomeDesc').value.trim();
    const user = document.getElementById('incomeUser').value;
    const notes = document.getElementById('incomeNotes').value.trim();
    const incomeDate = document.getElementById('incomeDate')?.value;

    if (isNaN(amount) || !desc) return alert('Vui lòng nhập đủ số tiền và mô tả!');
    if (!incomeDate) return alert('Vui lòng chọn ngày nhận.');

    const editingIncome = ModalManager.editingType === 'income' && ModalManager.editingIndex >= 0;
    const previousIncome = editingIncome ? { ...this.app.data.incomes[ModalManager.editingIndex] } : null;
    if (editingIncome) {
      this.app.data.incomes[ModalManager.editingIndex] = {
        ...this.app.data.incomes[ModalManager.editingIndex],
        amount,
        desc,
        user,
        notes,
        date: new Date(`${incomeDate}T12:00:00`).toISOString()
      };
    } else {
      this.app.data.incomes.push({
        amount,
        desc,
        user,
        notes,
        date: new Date(`${incomeDate}T12:00:00`).toISOString()
      });
    }

    const updatedIncome = this.app.data.incomes[editingIncome ? ModalManager.editingIndex : this.app.data.incomes.length - 1];
    this.app.log?.system(editingIncome ? 'Cập nhật khoản thu' : 'Thêm khoản thu', editingIncome ? this.describeChanges(previousIncome, updatedIncome) : `${desc} · ${amount.toLocaleString('vi-VN')} VNĐ`);

    this.app.save();
    this.app.render();
    ModalManager.closeAddModal();
  }
}

// Global aliases for compatibility
function filterFinance(type) { window.app.finance.filter(type); }
function searchFinance(query) { window.app.finance.search(query); }
function deleteFinance(type, idx) { window.app.finance.deleteFinance(type, idx); }
function editFinance(type, idx) { window.app.finance.editFinance(type, idx); }
function saveExpenseAction() { window.app.finance.saveExpenseAction(); }
function saveIncomeAction() { window.app.finance.saveIncomeAction(); }
function applyDateFilter() { window.app.finance.applyDateFilter(); }
function resetDateFilter() { window.app.finance.resetDateFilter(); }
function setDateFilterRange(range) { window.app.finance.setDateFilterRange(range); }
function loadMoreTransactions() { window.app.finance.loadMoreTransactions(); }
