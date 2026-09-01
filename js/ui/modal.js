/**
 * DuoSpace UI - Modals Controller
 */
const ModalManager = {
  editingType: null,
  editingIndex: -1,

  openAddModal() {
    if (this.editingIndex < 0) {
      document.getElementById('modalMainTitle').innerText = "Thêm mới";
      document.getElementById('typeSelector').classList.remove('hidden');
      document.getElementById('saveTodoBtn').innerText = "Lưu công việc";
      document.getElementById('saveExpenseBtn').innerText = "Lưu khoản chi";
      document.getElementById('saveIncomeBtn').innerText = "Lưu khoản thu";

      document.getElementById('todoInput').value = '';
      document.getElementById('todoNotes').value = '';
      document.getElementById('expenseAmount').value = '';
      document.getElementById('expenseDesc').value = '';
      document.getElementById('expenseNotes').value = '';
      document.getElementById('incomeAmount').value = '';
      document.getElementById('incomeDesc').value = '';
      document.getElementById('incomeNotes').value = '';

      // Auto default category based on current active tab
      const currentTab = (window.TabsManager && window.TabsManager.currentTab) || 'home';
      const defaultCategory = typeof getDefaultCategoryByTab === 'function' ? getDefaultCategoryByTab(currentTab) : '';

      if (defaultCategory) {
        const todoCatEl = document.getElementById('todoCategory');
        if (todoCatEl) {
          const hasOption = Array.from(todoCatEl.options).some(opt => opt.value === defaultCategory);
          if (hasOption) todoCatEl.value = defaultCategory;
        }

        const expCatEl = document.getElementById('expenseCategory');
        if (expCatEl) {
          const matched = Array.from(expCatEl.options).find(opt => opt.value.includes(defaultCategory) || defaultCategory.includes(opt.value));
          if (matched) expCatEl.value = matched.value;
        }
      }
    }

    const modal = document.getElementById('addModal');
    if (!modal) return;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.remove('translate-y-full');

    if (this.editingIndex < 0) {
      const currentTab = (window.TabsManager && window.TabsManager.currentTab) || 'home';
      if (currentTab === 'finance') {
        this.setAddType('expense');
      } else {
        this.setAddType('todo');
      }
    }
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
function openCatWeightHistoryModal() { ModalManager.openCatHistoryModal(); }
function closeCatWeightHistoryModal() { ModalManager.closeCatHistoryModal(); }
