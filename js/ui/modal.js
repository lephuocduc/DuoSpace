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
