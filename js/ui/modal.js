/**
 * DuoSpace UI - Modals Controller
 */
const ModalManager = {
  editingType: null,
  editingIndex: -1,

  populateCategorySelects(selectedTodoCat) {
    const todoEl = document.getElementById('todoCategory');
    const todoCats = (window.app && typeof window.app.getTodoCategories === 'function')
      ? window.app.getTodoCategories()
      : ((typeof CONFIG !== 'undefined' && CONFIG.CATEGORIES?.TODO) || ['Việc nhà', 'Mun & Bông', 'Xe Máy', 'Sức Khỏe', 'Đầu tư', 'Khác']);

    if (todoEl) {
      const currentVal = selectedTodoCat || todoEl.value || todoCats[0];
      todoEl.innerHTML = todoCats.map(cat => `<option value="${Utils.escapeHtml(cat)}">${Utils.escapeHtml(cat)}</option>`).join('');
      if (todoCats.includes(currentVal)) {
        todoEl.value = currentVal;
      }
    }
  },

  openAddModal() {
    this.populateCategorySelects();
    // Detect currently visible active tab
    let currentTab = (window.TabsManager && window.TabsManager.currentTab) || '';
    if (!currentTab) {
      const allTabs = ['home', 'todo', 'investment', 'motorbike', 'cats', 'health', 'setting', 'log', 'guide'];
      const activeEl = allTabs.find(id => {
        const el = document.getElementById(`tab-${id}`);
        return el && !el.classList.contains('hidden');
      });
      currentTab = activeEl || 'home';
    }

    if (this.editingIndex < 0) {
      const titleEl = document.getElementById('modalMainTitle');
      if (titleEl) titleEl.innerText = "Thêm công việc mới";
      const saveTodoBtn = document.getElementById('saveTodoBtn');
      if (saveTodoBtn) saveTodoBtn.innerText = "Lưu công việc";

      const todoInput = document.getElementById('todoInput');
      if (todoInput) todoInput.value = '';
      const todoNotes = document.getElementById('todoNotes');
      if (todoNotes) todoNotes.value = '';
      const todoStartEl = document.getElementById('todoStartDate');
      const todoDueEl = document.getElementById('todoDueDate');
      if (todoStartEl) todoStartEl.value = '';
      if (todoDueEl) todoDueEl.value = '';

      this.setAddType('todo');

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

  setAddType() {
    const form = document.getElementById('addTodoForm');
    if (form) form.classList.remove('hidden');
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
