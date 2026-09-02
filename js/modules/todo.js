/**
 * DuoSpace Modules - To-Do Tab Logic
 */
class TodoModule {
  constructor(app) {
    this.app = app;
    this.currentSubTab = 'active';
    this.currentUserFilter = 'all';
    this.searchQuery = '';
  }

  render() {
    this.renderTodoList();
  }

  switchSubTab(subTab) {
    this.currentSubTab = subTab;
    const btnActive = document.getElementById('todoSubTab-active');
    const btnArchive = document.getElementById('todoSubTab-archive');
    const header = document.getElementById('todoListHeader');

    if (subTab === 'active') {
      if (btnActive) btnActive.className = "flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 font-semibold";
      if (btnArchive) btnArchive.className = "flex-1 py-1.5 rounded-lg text-gray-500 dark:text-slate-400 font-medium";
      if (header) header.innerText = "Việc cần làm";
    } else {
      if (btnArchive) btnArchive.className = "flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 font-semibold";
      if (btnActive) btnActive.className = "flex-1 py-1.5 rounded-lg text-gray-500 dark:text-slate-400 font-medium";
      if (header) header.innerText = "Việc đã hoàn thành";
    }
    this.renderTodoList();
  }

  filterUser(user) {
    this.currentUserFilter = user;
    ['all', 'Đ', 'S', 'Both'].forEach(u => {
      const btn = document.getElementById(`todoFilter-${u}`);
      if (!btn) return;
      if (u === user) {
        btn.className = "px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm";
      } else {
        btn.className = "px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700";
      }
    });
    this.renderTodoList();
  }

  search(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.renderTodoList();
  }

  renderTodoList() {
    const todoList = document.getElementById('todoList');
    if (!todoList) return;

    let filtered = (this.app.data.todos || []).filter(t =>
      this.currentSubTab === 'archive' ? t.done : !t.done
    );

    if (this.currentUserFilter !== 'all') {
      filtered = filtered.filter(t => t.user === this.currentUserFilter);
    }

    if (this.searchQuery) {
      filtered = filtered.filter(t =>
        (t.title && t.title.toLowerCase().includes(this.searchQuery)) ||
        (t.notes && t.notes.toLowerCase().includes(this.searchQuery))
      );
    }

    const priorityRank = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1) || new Date(b.date || 0) - new Date(a.date || 0));

    const todoCountEl = document.getElementById('todoCount');
    if (todoCountEl) todoCountEl.innerText = filtered.length;

    if (filtered.length === 0) {
      todoList.innerHTML = `<p class="text-sm text-gray-400 dark:text-slate-500 text-center py-4">${this.currentSubTab === 'archive' ? 'Chưa có công việc nào hoàn thành' : 'Không tìm thấy công việc nào'}</p>`;
      return;
    }

    todoList.innerHTML = filtered.map(todo => {
      const realIndex = this.app.data.todos.indexOf(todo);
      const userBadge = todo.user === 'Đ'
        ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-semibold">Đức</span>'
        : todo.user === 'S'
          ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold">Sương</span>'
          : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-semibold">Cả hai</span>';

      const categoryBadge = `<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">${todo.category || 'Việc nhà'}</span>`;
      const priorityMeta = {
        high: ['Cao', 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'],
        medium: ['Trung bình', 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'],
        low: ['Thấp', 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400']
      }[todo.priority] || ['Trung bình', 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'];
      const priorityBadge = `<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold ${priorityMeta[1]}">Ưu tiên ${priorityMeta[0]}</span>`;
      const dateStr = todo.date ? Utils.formatDate(todo.date) : '';

      return `
        <div class="task-item bg-gray-50 dark:bg-slate-800/80 rounded-xl p-3 border border-gray-100 dark:border-slate-700/60 space-y-1 hover:bg-gray-100 dark:hover:bg-slate-700/50">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 flex-1">
              <input type="checkbox" onclick="event.stopPropagation()" onchange="window.app.todo.toggleTodo(${realIndex})" ${todo.done ? 'checked' : ''} class="w-5 h-5 rounded text-blue-600 focus:ring-0 cursor-pointer">
              <div onclick="window.app.todo.editTodo(${realIndex})" class="flex-1 cursor-pointer">
                <p class="text-sm font-medium text-gray-800 dark:text-slate-200 ${todo.done ? 'line-through text-gray-400 dark:text-slate-500' : ''}">${todo.title}</p>
                <div class="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                  ${userBadge}
                  ${categoryBadge}
                  ${priorityBadge}
                  ${dateStr ? `<span class="text-[10px] text-gray-400 dark:text-slate-500"><i class="fa-regular fa-calendar mr-1"></i>${dateStr}</span>` : ''}
                </div>
              </div>
            </div>
            <button onclick="window.app.todo.deleteTodo(${realIndex})" class="text-gray-300 hover:text-red-500 p-1.5 transition-colors" title="Xóa">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
          ${todo.notes ? `<p onclick="window.app.todo.editTodo(${realIndex})" class="text-[11px] text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-gray-100 dark:border-slate-800 mt-1 cursor-pointer">📝 ${todo.notes}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  toggleTodo(idx) {
    if (this.app.data.todos && this.app.data.todos[idx]) {
      this.app.data.todos[idx].done = !this.app.data.todos[idx].done;
      this.app.log?.system(this.app.data.todos[idx].done ? 'Hoàn thành công việc' : 'Mở lại công việc', this.app.data.todos[idx].title);
      this.app.save();
      this.app.render();
    }
  }

  deleteTodo(idx) {
    if (this.app.data.todos && this.app.data.todos[idx]) {
      const todo = this.app.data.todos[idx];
      this.app.data.todos.splice(idx, 1);
      this.app.log?.system('Xóa công việc', todo.title);
      this.app.save();
      this.app.render();
    }
  }

  editTodo(index) {
    ModalManager.editingType = 'todo';
    ModalManager.editingIndex = index;
    const todo = this.app.data.todos[index];

    document.getElementById('modalMainTitle').innerText = "Chỉnh sửa công việc";
    document.getElementById('typeSelector').classList.add('hidden');
    ModalManager.setAddType('todo');

    document.getElementById('todoInput').value = todo.title || '';
    document.getElementById('todoCategory').value = todo.category || 'Việc nhà';
    document.getElementById('todoUser').value = todo.user || 'Both';
    document.getElementById('todoPriority').value = todo.priority || 'medium';
    document.getElementById('todoNotes').value = todo.notes || '';
    document.getElementById('saveTodoBtn').innerText = "Cập nhật công việc";

    ModalManager.openAddModal();
  }

  saveTodoAction() {
    const title = document.getElementById('todoInput').value.trim();
    const category = document.getElementById('todoCategory').value;
    const user = document.getElementById('todoUser').value;
    const priority = document.getElementById('todoPriority').value;
    const notes = document.getElementById('todoNotes').value.trim();

    if (!title) return alert('Vui lòng nhập tên công việc!');

    if (ModalManager.editingType === 'todo' && ModalManager.editingIndex >= 0) {
      this.app.data.todos[ModalManager.editingIndex] = {
        ...this.app.data.todos[ModalManager.editingIndex],
        title,
        category,
        user,
        priority,
        notes
      };
    } else {
      this.app.data.todos.push({
        title,
        category,
        user,
        priority,
        notes,
        done: false,
        date: new Date().toISOString()
      });
    }

    this.app.log?.system(
      ModalManager.editingIndex >= 0 ? 'Cập nhật công việc' : 'Thêm công việc',
      title
    );
    this.app.save();
    this.app.render();
    ModalManager.closeAddModal();
  }
}

// Global aliases for compatibility
function switchTodoSubTab(subTab) { window.app.todo.switchSubTab(subTab); }
function filterTodoUser(user) { window.app.todo.filterUser(user); }
function searchTodo(query) { window.app.todo.search(query); }
function toggleTodo(idx) { window.app.todo.toggleTodo(idx); }
function deleteTodo(idx) { window.app.todo.deleteTodo(idx); }
function editTodo(idx) { window.app.todo.editTodo(idx); }
function saveTodoAction() { window.app.todo.saveTodoAction(); }
