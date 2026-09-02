/**
 * DuoSpace UI - Modals Controller
 */
const ModalManager = {
  editingType: null,
  editingIndex: -1,

  openAddModal() {
    // Detect currently visible active tab
    let currentTab = (window.TabsManager && window.TabsManager.currentTab) || '';
    if (!currentTab) {
      const allTabs = ['home', 'todo', 'finance', 'investment', 'motorbike', 'cats', 'health', 'setting', 'log', 'guide'];
      const activeEl = allTabs.find(id => {
        const el = document.getElementById(`tab-${id}`);
        return el && !el.classList.contains('hidden');
      });
      currentTab = activeEl || 'home';
    }

    if (this.editingIndex < 0) {
      document.getElementById('modalMainTitle').innerText = "Thêm mới";
      document.getElementById('typeSelector').classList.remove('hidden');
      document.getElementById('saveTodoBtn').innerText = "Lưu công việc";
      document.getElementById('saveExpenseBtn').innerText = "Lưu khoản chi";
      document.getElementById('saveIncomeBtn').innerText = "Lưu khoản thu";

      document.getElementById('todoInput').value = '';
      document.getElementById('todoNotes').value = '';
      document.getElementById('expenseAmount').value = '';
      document.getElementById('expenseDate').value = new Date().toISOString().slice(0, 10);
      document.getElementById('expenseDesc').value = '';
      document.getElementById('expenseNotes').value = '';
      document.getElementById('expenseCategory').value = '📦 Khác';
      document.getElementById('expenseUser').value = 'Đ';
      document.getElementById('expenseBike').value = 'NMAX';
      document.getElementById('expenseInvestName').value = 'BTC';
      ['expenseOdo', 'expenseVehicleCustomItem', 'expenseInvestCustomName', 'expenseInvestQuantity', 'expenseInvestBuyPrice', 'expenseInvestCurrentPrice', 'expenseInvestTarget'].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
      });
      const expenseUsd = document.getElementById('expenseInvestIsUsd');
      if (expenseUsd) expenseUsd.checked = false;
      document.getElementById('expenseVehicleItem').value = 'Thay nhớt máy';
      document.getElementById('incomeAmount').value = '';
      document.getElementById('incomeDate').value = new Date().toISOString().slice(0, 10);
      document.getElementById('incomeDesc').value = '';
      document.getElementById('incomeNotes').value = '';

      // Set form type (finance tab defaults to expense form; others default to todo form)
      if (currentTab === 'finance') {
        this.setAddType('expense');
      } else {
        this.setAddType('todo');
      }

      // Auto select category based on active tab
      const defaultCategory = typeof getDefaultCategoryByTab === 'function' ? getDefaultCategoryByTab(currentTab) : '';

      if (defaultCategory) {
        const todoCatEl = document.getElementById('todoCategory');
        if (todoCatEl) {
          const matchedTodo = Array.from(todoCatEl.options).find(opt => 
            opt.value === defaultCategory || 
            opt.value.toLowerCase().includes(defaultCategory.toLowerCase()) || 
            defaultCategory.toLowerCase().includes(opt.value.toLowerCase()) ||
            (defaultCategory === 'Mun & Bông' && opt.value.includes('Mun')) ||
            (defaultCategory === 'Xe Máy' && opt.value.includes('Xe')) ||
            (defaultCategory === 'Sức Khỏe' && opt.value.includes('Sức')) ||
            (defaultCategory === 'Đầu tư' && opt.value.includes('Đầu tư'))
          );
          if (matchedTodo) todoCatEl.value = matchedTodo.value;
        }

        const expCatEl = document.getElementById('expenseCategory');
        if (expCatEl) {
          const matchedExp = Array.from(expCatEl.options).find(opt => 
            opt.value === defaultCategory || 
            opt.value.toLowerCase().includes(defaultCategory.toLowerCase()) || 
            defaultCategory.toLowerCase().includes(opt.value.toLowerCase()) ||
            (defaultCategory === 'Mun & Bông' && (opt.value.includes('Mèo') || opt.value.includes('Mun'))) ||
            (defaultCategory === 'Xe Máy' && opt.value.includes('Xe')) ||
            (defaultCategory === 'Sức Khỏe' && opt.value.includes('Sức')) ||
            (defaultCategory === 'Đầu tư' && opt.value.includes('Đầu tư'))
          );
          if (matchedExp) expCatEl.value = matchedExp.value;
        }
      }
      this.onExpenseCategoryChange();
    }

    const modal = document.getElementById('addModal');
    if (!modal) return;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.remove('translate-y-full');
  },

  closeAddModal() {
    const modal = document.getElementById('addModal');
    if (!modal) return;
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.add('translate-y-full');
    this.editingIndex = -1;
    this.editingType = null;
  },

  setAddType(type) {
    ['todo', 'expense', 'income'].forEach(t => {
      const btn = document.getElementById(`typeBtn-${t}`);
      const form = document.getElementById(`add${t.charAt(0).toUpperCase() + t.slice(1)}Form`);

      if (t === type) {
        if (btn) btn.className = "py-2.5 px-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold text-xs border-2 border-blue-600";
        if (form) form.classList.remove('hidden');
      } else {
        if (btn) btn.className = "py-2.5 px-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-semibold text-xs border-2 border-transparent";
        if (form) form.classList.add('hidden');
      }
    });
  },

  onExpenseCategoryChange() {
    const category = document.getElementById('expenseCategory')?.value || '';
    document.getElementById('expenseVehicleFields')?.classList.toggle('hidden', !category.includes('Xe'));
    document.getElementById('expenseInvestmentFields')?.classList.toggle('hidden', !category.includes('Đầu tư'));
    document.getElementById('expenseDescriptionRow')?.classList.toggle('hidden', category.includes('Xe') || category.includes('Đầu tư'));
    if (category.includes('Đầu tư')) {
      this.updateExpenseInvestmentAmount();
      this.onExpenseInvestmentNameChange();
    }
  },

  onExpenseVehicleItemChange() {
    const isCustom = document.getElementById('expenseVehicleItem')?.value === 'Khác';
    document.getElementById('expenseVehicleCustomItem')?.classList.toggle('hidden', !isCustom);
  },

  onExpenseInvestmentNameChange() {
    const isCustom = document.getElementById('expenseInvestName')?.value === 'Khác';
    document.getElementById('expenseInvestCustomName')?.classList.toggle('hidden', !isCustom);
    const asset = window.app?.investment?.getAssetCatalog()?.[document.getElementById('expenseInvestName')?.value];
    const usd = document.getElementById('expenseInvestIsUsd');
    if (asset && usd) usd.checked = asset.defaultIsUsd;
    this.fetchPriceForExpenseInvestment(true);
  },

  updateExpenseInvestmentAmount() {
    const quantity = parseFloat(document.getElementById('expenseInvestQuantity')?.value);
    const buyPrice = parseFloat(document.getElementById('expenseInvestBuyPrice')?.value);
    const amount = !isNaN(quantity) && !isNaN(buyPrice) ? quantity * buyPrice : 0;
    const amountInput = document.getElementById('expenseAmount');
    const hint = document.getElementById('expenseInvestmentAmountHint');
    if (amountInput) amountInput.value = amount > 0 ? Math.round(amount) : '';
    if (hint) hint.textContent = amount > 0
      ? `Số tiền chi tự tính: ${Math.round(amount).toLocaleString('vi-VN')} VNĐ.`
      : 'Số tiền chi = số lượng × giá mua/đơn vị.';
  },

  async fetchPriceForExpenseInvestment(silent = false) {
    const selected = document.getElementById('expenseInvestName')?.value;
    const name = selected === 'Khác' ? document.getElementById('expenseInvestCustomName')?.value.trim() : selected;
    if (!name) return silent ? null : alert('Vui lòng chọn hoặc nhập tên tài sản trước!');
    const price = await window.app?.investment?.fetchMarketPrice(name);
    if (price === null || price === undefined || isNaN(price)) {
      if (!silent) alert('Không thể lấy giá tự động cho tài sản này. Bạn có thể nhập giá thủ công.');
      return null;
    }
    const input = document.getElementById('expenseInvestCurrentPrice');
    if (input) input.value = parseFloat(price.toFixed(8));
    if (!silent) alert(`Đã lấy giá thị trường: ${price.toLocaleString('vi-VN')}`);
    return price;
  },

  openCatHistoryModal() {
    if (window.app && window.app.cats) {
      window.app.cats.renderCatWeightHistory();
    }
    const modal = document.getElementById('catHistoryModal');
    if (modal) {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.querySelector('.transform').classList.remove('translate-y-full');
    }
  },

  closeCatHistoryModal() {
    const modal = document.getElementById('catHistoryModal');
    if (modal) {
      modal.classList.add('opacity-0', 'pointer-events-none');
      modal.querySelector('.transform').classList.add('translate-y-full');
    }
  }
};

// Global aliases for inline onclick compatibility
function openAddModal() { ModalManager.openAddModal(); }
function closeAddModal() { ModalManager.closeAddModal(); }
function setAddType(type) { ModalManager.setAddType(type); }
function onExpenseCategoryChange() { ModalManager.onExpenseCategoryChange(); }
function onExpenseInvestmentNameChange() { ModalManager.onExpenseInvestmentNameChange(); }
function onExpenseVehicleItemChange() { ModalManager.onExpenseVehicleItemChange(); }
function updateExpenseInvestmentAmount() { ModalManager.updateExpenseInvestmentAmount(); }
function fetchPriceForExpenseInvestment() { ModalManager.fetchPriceForExpenseInvestment(); }
function openCatWeightHistoryModal() { ModalManager.openCatHistoryModal(); }
function closeCatWeightHistoryModal() { ModalManager.closeCatHistoryModal(); }
