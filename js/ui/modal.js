/**
 * DuoSpace UI - Modals Controller
 */
const ModalManager = {
  editingType: null,
  editingIndex: -1,

  populateCategorySelects(selectedTodoCat, selectedExpCat, selectedIncCat) {
    const todoEl = document.getElementById('todoCategory');
    const expEl = document.getElementById('expenseCategory');
    const incEl = document.getElementById('incomeCategory');

    const todoCats = (window.app && typeof window.app.getTodoCategories === 'function')
      ? window.app.getTodoCategories()
      : ((typeof CONFIG !== 'undefined' && CONFIG.CATEGORIES?.TODO) || ['Việc nhà', 'Mun & Bông', 'Xe Máy', 'Sức Khỏe', 'Đầu tư', 'Khác']);

    const expCats = (window.app && typeof window.app.getExpenseCategories === 'function')
      ? window.app.getExpenseCategories()
      : ((typeof CONFIG !== 'undefined' && CONFIG.CATEGORIES?.EXPENSE) || [
        '🍜 Ăn uống', '🏠 Nhà cửa', '🛒 Siêu thị', '🛵 Xe', '🐱 Mèo', '💊 Sức khỏe', '🎮 Giải trí', '💼 Đầu tư', '📦 Khác'
      ]);

    const incCats = (window.app && typeof window.app.getIncomeCategories === 'function')
      ? window.app.getIncomeCategories()
      : ((typeof CONFIG !== 'undefined' && CONFIG.CATEGORIES?.INCOME) || [
        '💼 Lương', '🎁 Thưởng', '📈 Đầu tư / Lãi', '📦 Khác'
      ]);

    if (todoEl) {
      const currentVal = selectedTodoCat || todoEl.value || todoCats[0];
      todoEl.innerHTML = todoCats.map(cat => `<option value="${Utils.escapeHtml(cat)}">${Utils.escapeHtml(cat)}</option>`).join('');
      if (todoCats.includes(currentVal)) {
        todoEl.value = currentVal;
      }
    }

    if (expEl) {
      const currentVal = selectedExpCat || expEl.value || (expCats.includes('📦 Khác') ? '📦 Khác' : expCats[0]);
      expEl.innerHTML = expCats.map(cat => `<option value="${Utils.escapeHtml(cat)}">${Utils.escapeHtml(cat)}</option>`).join('');
      if (expCats.includes(currentVal)) {
        expEl.value = currentVal;
      }
    }

    if (incEl) {
      const currentVal = selectedIncCat || incEl.value || incCats[0];
      incEl.innerHTML = incCats.map(cat => `<option value="${Utils.escapeHtml(cat)}">${Utils.escapeHtml(cat)}</option>`).join('');
      if (incCats.includes(currentVal)) {
        incEl.value = currentVal;
      }
    }
  },

  openAddModal() {
    this.populateCategorySelects();
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
      const todoStartEl = document.getElementById('todoStartDate');
      const todoDueEl = document.getElementById('todoDueDate');
      if (todoStartEl) todoStartEl.value = '';
      if (todoDueEl) todoDueEl.value = '';
      document.getElementById('expenseAmount').value = '';
      document.getElementById('expenseDate').value = new Date().toISOString().slice(0, 10);
      document.getElementById('expenseDesc').value = '';
      document.getElementById('expenseNotes').value = '';
      document.getElementById('expenseCategory').value = '📦 Khác';
      document.getElementById('expenseUser').value = 'Đ';
      document.getElementById('incomeAmount').value = '';
      document.getElementById('incomeDate').value = new Date().toISOString().slice(0, 10);
      const incCatEl = document.getElementById('incomeCategory');
      if (incCatEl) incCatEl.value = incCatEl.options[0]?.value || '💼 Lương';
      const incDescEl = document.getElementById('incomeDesc');
      if (incDescEl) incDescEl.value = '';
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
    }

    const modal = document.getElementById('addModal');
    if (!modal) return;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.remove('translate-y-full');

    if (typeof Utils !== 'undefined' && Utils.lockScroll) {
      Utils.lockScroll();
    }
  },

  closeAddModal() {
    const modal = document.getElementById('addModal');
    if (!modal) return;
    if (!modal.classList.contains('opacity-0')) {
      if (typeof Utils !== 'undefined' && Utils.unlockScroll) {
        Utils.unlockScroll();
      }
    }
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.add('translate-y-full');
    this.editingIndex = -1;
    this.editingType = null;
  },

  setAddType(type) {
    const activeClasses = {
      todo: "py-2.5 px-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold text-xs border-2 border-blue-600 shadow-sm transition-all",
      expense: "py-2.5 px-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold text-xs border-2 border-rose-600 shadow-sm transition-all",
      income: "py-2.5 px-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border-2 border-emerald-600 shadow-sm transition-all"
    };
    const inactiveClass = "py-2.5 px-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-semibold text-xs border-2 border-transparent hover:bg-gray-200 dark:hover:bg-slate-700 transition-all";

    ['todo', 'expense', 'income'].forEach(t => {
      const btn = document.getElementById(`typeBtn-${t}`);
      const form = document.getElementById(`add${t.charAt(0).toUpperCase() + t.slice(1)}Form`);

      if (t === type) {
        if (btn) btn.className = activeClasses[t] || activeClasses.todo;
        if (form) form.classList.remove('hidden');
      } else {
        if (btn) btn.className = inactiveClass;
        if (form) form.classList.add('hidden');
      }
    });
  },

  onExpenseCategoryChange() {},

  openCatHistoryModal() {
    if (window.app && window.app.cats) {
      window.app.cats.renderCatWeightHistory();
    }
    const modal = document.getElementById('catHistoryModal');
    if (modal) {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.querySelector('.transform').classList.remove('translate-y-full');
      if (typeof Utils !== 'undefined' && Utils.lockScroll) {
        Utils.lockScroll();
      }
    }
  },

  closeCatHistoryModal() {
    const modal = document.getElementById('catHistoryModal');
    if (modal) {
      if (!modal.classList.contains('opacity-0')) {
        if (typeof Utils !== 'undefined' && Utils.unlockScroll) {
          Utils.unlockScroll();
        }
      }
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
function openCatWeightHistoryModal() { ModalManager.openCatHistoryModal(); }
function closeCatWeightHistoryModal() { ModalManager.closeCatHistoryModal(); }
