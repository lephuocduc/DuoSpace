/**
 * DuoSpace Modules - Finance Tab Logic (Thu - Chi)
 * v2.6.2: Thêm Phân trang (Load more theo 7 ngày) + Bộ lọc theo khoảng ngày (Date Range Filter)
 */
class FinanceModule {
  constructor(app) {
    this.app = app;
    this.currentFilter = 'all';
    this.searchQuery = '';

    // Pagination & Filter States
    this.financeState = {
      daysLoaded: 7,
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
    this.financeState.daysLoaded = 7;

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
  // PAGINATION (LOAD MORE)
  // ──────────────────────────────────────────────

  loadMoreTransactions() {
    this.financeState.daysLoaded += 7;
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

    // Apply Date Range OR Pagination Days
    let displayed = [];
    const summaryEl = document.getElementById('filterSummary');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (this.filterState.isActive && this.filterState.dateFrom && this.filterState.dateTo) {
      // Date Range Filter Mode
      displayed = processed.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d >= this.filterState.dateFrom && d <= this.filterState.dateTo;
      });

      if (summaryEl) {
        summaryEl.innerText = `Hiển thị: ${Utils.formatDate(this.filterState.dateFrom)} - ${Utils.formatDate(this.filterState.dateTo)} (${displayed.length} giao dịch)`;
        summaryEl.classList.remove('hidden');
      }

      // In Custom Date Filter mode, show all matching within range
      if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
    } else {
      // Pagination Mode (Recent X days)
      if (summaryEl) {
        summaryEl.innerText = '';
        summaryEl.classList.add('hidden');
      }

      const now = new Date();
      const cutoffDate = new Date(now.getTime() - this.financeState.daysLoaded * 24 * 60 * 60 * 1000);
      cutoffDate.setHours(0, 0, 0, 0);

      displayed = processed.filter(item => {
        if (!item.date) return true;
        const d = new Date(item.date);
        return d >= cutoffDate;
      });

      // Check if there are older transactions beyond cutoffDate
      const olderItems = processed.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d < cutoffDate;
      });

      if (loadMoreContainer) {
        if (olderItems.length > 0) {
          loadMoreContainer.classList.remove('hidden');
          if (loadMoreBtn) {
            loadMoreBtn.innerHTML = `📥 Tải thêm (Xem thêm 7 ngày trước · Còn ${olderItems.length} giao dịch)`;
          }
        } else {
          loadMoreContainer.classList.add('hidden');
        }
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
    if (type === 'expense') {
      if (this.app.data.expenses && this.app.data.expenses[idx]) {
        this.app.data.expenses.splice(idx, 1);
      }
    } else {
      if (this.app.data.incomes && this.app.data.incomes[idx]) {
        this.app.data.incomes.splice(idx, 1);
      }
    }
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
      document.getElementById('expenseDesc').value = item.desc || '';
      document.getElementById('expenseCategory').value = item.category || '📦 Khác';
      document.getElementById('expenseUser').value = item.user || 'Đ';
      document.getElementById('expenseNotes').value = item.notes || '';
      document.getElementById('saveExpenseBtn').innerText = "Cập nhật khoản chi";
    } else {
      document.getElementById('incomeAmount').value = item.amount || '';
      document.getElementById('incomeDesc').value = item.desc || '';
      document.getElementById('incomeUser').value = item.user || 'Đ';
      document.getElementById('incomeNotes').value = item.notes || '';
      document.getElementById('saveIncomeBtn').innerText = "Cập nhật khoản thu";
    }

    ModalManager.openAddModal();
  }

  saveExpenseAction() {
    const amount = parseInt(document.getElementById('expenseAmount').value);
    const desc = document.getElementById('expenseDesc').value.trim();
    const category = document.getElementById('expenseCategory').value;
    const user = document.getElementById('expenseUser').value;
    const notes = document.getElementById('expenseNotes').value.trim();

    if (!amount || !desc) return alert('Vui lòng nhập đủ số tiền và mô tả!');

    if (ModalManager.editingType === 'expense' && ModalManager.editingIndex >= 0) {
      this.app.data.expenses[ModalManager.editingIndex] = {
        ...this.app.data.expenses[ModalManager.editingIndex],
        amount,
        desc,
        category,
        user,
        notes
      };
    } else {
      this.app.data.expenses.push({
        amount,
        desc,
        category,
        user,
        notes,
        date: new Date().toISOString()
      });
    }

    this.app.save();
    this.app.render();
    ModalManager.closeAddModal();
  }

  saveIncomeAction() {
    const amount = parseInt(document.getElementById('incomeAmount').value);
    const desc = document.getElementById('incomeDesc').value.trim();
    const user = document.getElementById('incomeUser').value;
    const notes = document.getElementById('incomeNotes').value.trim();

    if (!amount || !desc) return alert('Vui lòng nhập đủ số tiền và mô tả!');

    if (ModalManager.editingType === 'income' && ModalManager.editingIndex >= 0) {
      this.app.data.incomes[ModalManager.editingIndex] = {
        ...this.app.data.incomes[ModalManager.editingIndex],
        amount,
        desc,
        user,
        notes
      };
    } else {
      this.app.data.incomes.push({
        amount,
        desc,
        user,
        notes,
        date: new Date().toISOString()
      });
    }

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
