/**
 * DuoSpace Modules - Settings Tab Logic
 * Settings are intentionally minimal; vehicle and pet data are managed in
 * their own sections of the app.
 */
class SettingsModule {
  constructor(app) {
    this.app = app;
  }

  render() {
    this.loadSettingsToForm();
    this.renderCategoriesUI();
  }

  loadSettingsToForm() {
    // Kept for backwards compatibility with the app initializer.
  }

  saveSettings() {
    // Kept as a harmless global alias for old inline handlers.
  }

  // ──────────────────────────────────────────────
  // CATEGORIES MANAGEMENT (THÊM / SỬA / XÓA)
  // ──────────────────────────────────────────────

  getCategories(type) {
    if (!this.app.data.settings) this.app.data.settings = {};
    if (!this.app.data.settings.categories) {
      this.app.data.settings.categories = {
        todo: (typeof CONFIG !== 'undefined' && CONFIG.CATEGORIES?.TODO) ? [...CONFIG.CATEGORIES.TODO] : ['Việc nhà', 'Mun & Bông', 'Xe Máy', 'Sức Khỏe', 'Đầu tư', 'Khác'],
        expense: (typeof CONFIG !== 'undefined' && CONFIG.CATEGORIES?.EXPENSE) ? [...CONFIG.CATEGORIES.EXPENSE] : [
          '🍜 Ăn uống', '🏠 Nhà cửa', '🛒 Siêu thị', '🛵 Xe', '🐱 Mèo', '💊 Sức khỏe', '🎮 Giải trí', '💼 Đầu tư', '📦 Khác'
        ],
        income: (typeof CONFIG !== 'undefined' && CONFIG.CATEGORIES?.INCOME) ? [...CONFIG.CATEGORIES.INCOME] : [
          '💼 Lương', '🎁 Thưởng', '📈 Đầu tư / Lãi', '📦 Khác'
        ]
      };
    }
    return this.app.data.settings.categories[type] || [];
  }

  renderCategoriesUI() {
    const expenseContainer = document.getElementById('expenseCategoryListContainer');
    const incomeContainer = document.getElementById('incomeCategoryListContainer');
    const todoContainer = document.getElementById('todoCategoryListContainer');
    if (!expenseContainer && !incomeContainer && !todoContainer) return;

    const expenseCats = this.getCategories('expense');
    const incomeCats = this.getCategories('income');
    const todoCats = this.getCategories('todo');

    if (expenseContainer) {
      expenseContainer.innerHTML = expenseCats.map((cat, idx) => `
        <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-700/60 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 transition-colors">
          <div class="flex items-center space-x-2 min-w-0 pr-2">
            <span class="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">${Utils.escapeHtml(cat)}</span>
          </div>
          <div class="flex items-center space-x-1 shrink-0">
            <button type="button" onclick="window.app.settings.editCategory('expense', ${idx})" title="Sửa tên danh mục"
              class="w-7 h-7 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center transition-colors">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button type="button" onclick="window.app.settings.deleteCategory('expense', ${idx})" title="Xóa danh mục"
              class="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    if (incomeContainer) {
      incomeContainer.innerHTML = incomeCats.map((cat, idx) => `
        <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-700/60 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 transition-colors">
          <div class="flex items-center space-x-2 min-w-0 pr-2">
            <span class="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">${Utils.escapeHtml(cat)}</span>
          </div>
          <div class="flex items-center space-x-1 shrink-0">
            <button type="button" onclick="window.app.settings.editCategory('income', ${idx})" title="Sửa tên danh mục"
              class="w-7 h-7 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center transition-colors">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button type="button" onclick="window.app.settings.deleteCategory('income', ${idx})" title="Xóa danh mục"
              class="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    if (todoContainer) {
      todoContainer.innerHTML = todoCats.map((cat, idx) => `
        <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-700/60 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 transition-colors">
          <div class="flex items-center space-x-2 min-w-0 pr-2">
            <span class="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">${Utils.escapeHtml(cat)}</span>
          </div>
          <div class="flex items-center space-x-1 shrink-0">
            <button type="button" onclick="window.app.settings.editCategory('todo', ${idx})" title="Sửa tên danh mục"
              class="w-7 h-7 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center transition-colors">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button type="button" onclick="window.app.settings.deleteCategory('todo', ${idx})" title="Xóa danh mục"
              class="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    // Refresh Modal Select Options when categories change
    if (typeof ModalManager !== 'undefined' && typeof ModalManager.populateCategorySelects === 'function') {
      ModalManager.populateCategorySelects();
    }
  }

  addCategory(type) {
    const inputMap = {
      expense: 'newExpenseCategoryInput',
      income: 'newIncomeCategoryInput',
      todo: 'newTodoCategoryInput'
    };
    const inputId = inputMap[type] || 'newExpenseCategoryInput';
    const input = document.getElementById(inputId);
    if (!input) return;
    const name = input.value.trim();
    if (!name) {
      alert('Vui lòng nhập tên danh mục!');
      input.focus();
      return;
    }

    const categories = this.getCategories(type);
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert(`Danh mục "${name}" đã tồn tại!`);
      return;
    }

    const typeLabel = type === 'expense' ? 'chi tiêu' : type === 'income' ? 'thu nhập' : 'công việc';
    categories.push(name);
    this.app.data.settings.categories[type] = categories;
    this.app.log?.system(`Thêm danh mục ${typeLabel}`, name);
    this.app.save();
    input.value = '';
    this.renderCategoriesUI();
    if (typeof Utils !== 'undefined' && Utils.notify) {
      Utils.notify(`Đã thêm danh mục "${name}"`, 'success');
    }
  }

  editCategory(type, index) {
    const categories = this.getCategories(type);
    const oldName = categories[index];
    if (!oldName) return;

    const typeLabel = type === 'expense' ? 'chi tiêu' : type === 'income' ? 'thu nhập' : 'công việc';
    const newName = prompt(`Sửa tên danh mục ${typeLabel}:`, oldName);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      alert('Tên danh mục không được để trống!');
      return;
    }
    if (trimmed === oldName) return;

    if (categories.some((c, i) => i !== index && c.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Danh mục "${trimmed}" đã tồn tại!`);
      return;
    }

    // Hỏi xem có cập nhật các giao dịch / công việc cũ không
    let updateExisting = false;
    let countAffected = 0;
    if (type === 'expense') {
      countAffected = (this.app.data.expenses || []).filter(e => e.category === oldName).length;
    } else if (type === 'income') {
      countAffected = (this.app.data.incomes || []).filter(i => i.category === oldName).length;
    } else {
      countAffected = (this.app.data.todos || []).filter(t => t.category === oldName).length;
    }

    if (countAffected > 0) {
      updateExisting = confirm(`Đang có ${countAffected} khoản ${typeLabel} sử dụng danh mục "${oldName}".\nBạn có muốn tự động cập nhật sang "${trimmed}" không?`);
    }

    categories[index] = trimmed;
    this.app.data.settings.categories[type] = categories;

    if (updateExisting) {
      if (type === 'expense') {
        (this.app.data.expenses || []).forEach(e => {
          if (e.category === oldName) e.category = trimmed;
        });
      } else if (type === 'income') {
        (this.app.data.incomes || []).forEach(i => {
          if (i.category === oldName) i.category = trimmed;
        });
      } else {
        (this.app.data.todos || []).forEach(t => {
          if (t.category === oldName) t.category = trimmed;
        });
      }
    }

    this.app.log?.system(`Cập nhật danh mục ${typeLabel}`, `${oldName} → ${trimmed} (đã đồng bộ ${updateExisting ? countAffected : 0} mục cũ)`);
    this.app.save();
    this.renderCategoriesUI();
    this.app.renderParts([type === 'todo' ? 'todo' : 'finance', 'home']);
    if (typeof Utils !== 'undefined' && Utils.notify) {
      Utils.notify(`Đã đổi tên danh mục thành "${trimmed}"`, 'success');
    }
  }

  deleteCategory(type, index) {
    const categories = this.getCategories(type);
    const catName = categories[index];
    if (!catName) return;

    if (categories.length <= 1) {
      alert('Không thể xóa hết danh mục. Bạn cần giữ lại ít nhất 1 danh mục!');
      return;
    }

    const typeLabel = type === 'expense' ? 'khoản chi tiêu' : type === 'income' ? 'khoản thu nhập' : 'công việc';
    let countAffected = 0;
    if (type === 'expense') {
      countAffected = (this.app.data.expenses || []).filter(e => e.category === catName).length;
    } else if (type === 'income') {
      countAffected = (this.app.data.incomes || []).filter(i => i.category === catName).length;
    } else {
      countAffected = (this.app.data.todos || []).filter(t => t.category === catName).length;
    }

    let msg = `Bạn có chắc muốn xóa danh mục "${catName}"?`;
    if (countAffected > 0) {
      msg += `\nLƯU Ý: Đang có ${countAffected} ${typeLabel} dùng danh mục này. Dữ liệu cũ vẫn được giữ nguyên.`;
    }

    if (!confirm(msg)) return;

    categories.splice(index, 1);
    this.app.data.settings.categories[type] = categories;
    this.app.log?.system(`Xóa danh mục ${typeLabel}`, catName);
    this.app.save();
    this.renderCategoriesUI();
    if (typeof Utils !== 'undefined' && Utils.notify) {
      Utils.notify(`Đã xóa danh mục "${catName}"`, 'info');
    }
  }

  resetCategories(type) {
    const typeLabel = type === 'expense' ? 'Chi Tiêu' : type === 'income' ? 'Thu Nhập' : 'Công Việc';
    if (!confirm(`Khôi phục danh sách Danh mục ${typeLabel} về mặc định hệ thống?`)) return;

    if (!this.app.data.settings) this.app.data.settings = {};
    if (!this.app.data.settings.categories) this.app.data.settings.categories = {};

    if (type === 'expense') {
      this.app.data.settings.categories.expense = [...CONFIG.CATEGORIES.EXPENSE];
    } else if (type === 'income') {
      this.app.data.settings.categories.income = [...CONFIG.CATEGORIES.INCOME];
    } else {
      this.app.data.settings.categories.todo = [...CONFIG.CATEGORIES.TODO];
    }

    this.app.log?.system(`Khôi phục danh mục ${typeLabel}`, 'Đã khôi phục về mặc định');
    this.app.save();
    this.renderCategoriesUI();
    if (typeof Utils !== 'undefined' && Utils.notify) {
      Utils.notify(`Đã khôi phục danh mục ${typeLabel} mặc định!`, 'success');
    }
  }

  downloadBackup() {
    const json = JSON.stringify(this.app.data, null, 2);
    this.downloadFile(json, `duospace-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    this.app.log?.system('Tải bản sao lưu', 'Đã xuất toàn bộ dữ liệu dưới dạng JSON');
    this.app.save();
  }

  importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data || typeof data !== 'object') {
          throw new Error('Tệp không đúng định dạng sao lưu DuoSpace.');
        }
        if (!confirm(`Khôi phục từ tệp "${file.name}" sẽ thay thế toàn bộ dữ liệu hiện có trên máy và Cloud. Bạn có chắc chắn?`)) return;
        this.app.data = this.app.storage.mergeWithDefaults(data);
        this.app.log?.system('Khôi phục bản sao lưu', `Đã khôi phục dữ liệu từ tệp ${file.name}`);
        this.app.save();
        this.app.render();

        // Đẩy thẳng lên Cloudflare D1 để đồng bộ tức thì
        if (this.app.sync && this.app.sync.isEnabled) {
          await this.app.sync.pushToCloud();
        }

        if (typeof Utils !== 'undefined' && Utils.notify) {
          Utils.notify('Đã khôi phục và đồng bộ bản sao lưu thành công!', 'success');
        } else {
          alert('Đã khôi phục bản sao lưu thành công.');
        }
      } catch (error) {
        console.error('Import backup error:', error);
        alert(`Không thể khôi phục bản sao lưu: ${error.message}`);
      }
    };
    reader.onerror = () => alert('Không thể đọc tệp sao lưu.');
    reader.readAsText(file);
  }

  exportFinanceCsv() {
    const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Loại', 'Ngày', 'Danh mục/Nguồn', 'Mô tả', 'Số tiền (VNĐ)', 'Người', 'Ghi chú'],
      ...(this.app.data.expenses || []).map(item => ['Chi tiêu', item.date, item.category, item.desc, item.amount, item.user, item.notes]),
      ...(this.app.data.incomes || []).map(item => ['Thu nhập', item.date, item.category || 'Thu nhập', item.desc, item.amount, item.user, item.notes])
    ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    const csv = '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n');
    this.downloadFile(csv, `duospace-thu-chi-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
    this.app.log?.system('Xuất thu chi CSV', `Đã xuất ${rows.length - 1} giao dịch`);
    this.app.save();
  }

  downloadFile(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Global aliases
function loadSettingsToForm() { window.app.settings.loadSettingsToForm(); }
function saveSettings() { window.app.settings.saveSettings(); }
function downloadBackup() { window.app.settings.downloadBackup(); }
function importBackup(file) { window.app.settings.importBackup(file); }
function exportFinanceCsv() { window.app.settings.exportFinanceCsv(); }
function addCategory(type) { window.app.settings.addCategory(type); }
function resetCategories(type) { window.app.settings.resetCategories(type); }

