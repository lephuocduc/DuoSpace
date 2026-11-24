/**
 * DuoSpace Modules - Home Tab Logic
 */
class HomeModule {
  constructor(app) {
    this.app = app;
    this.searchQuery = '';
  }

  render() {
    this.renderUpcomingReminders();
    this.renderImportantReminders();
    this.updateDynamicInfo();
    this.updateBadges();
  }

  renderImportantReminders() {
    const container = document.getElementById('importantList');
    if (!container) return;

    let importantTodos = (this.app.data.todos || [])
      .filter(t => !t.done && (t.priority === 'high' || t.priority === 'medium'))
      .sort((a, b) => (a.priority === 'high' ? -1 : 1));

    if (this.searchQuery) {
      importantTodos = importantTodos.filter(t => t.title.toLowerCase().includes(this.searchQuery));
    }

    if (importantTodos.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400 dark:text-slate-500 text-center py-3">Không có việc quan trọng cần làm</p>';
      return;
    }

    container.innerHTML = importantTodos.map(todo => {
      const realIdx = this.app.data.todos.indexOf(todo);
      const priorityBadge = todo.priority === 'high'
        ? '<span class="text-[10px] font-bold px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-md">🔴 Cao</span>'
        : '<span class="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-md">🟡 Trung bình</span>';
      const userText = todo.user === 'Đ' ? 'Đức' : todo.user === 'S' ? 'Sương' : 'Cả hai';
      
      let dateInfo = '';
      if (todo.dueDate) {
        const isOverdue = !todo.done && new Date(todo.dueDate).setHours(23,59,59,999) < Date.now();
        dateInfo = ` • <span class="${isOverdue ? 'text-rose-500 font-semibold' : ''}">⏰ Hạn: ${Utils.formatDate(todo.dueDate)}</span>`;
      } else if (todo.startDate) {
        dateInfo = ` • 📅 Từ: ${Utils.formatDate(todo.startDate)}`;
      } else if (todo.date) {
        dateInfo = ` • 📅 ${Utils.formatDate(todo.date)}`;
      }

      return `
        <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-800 hover:bg-gray-100/80 transition-colors">
          <div class="flex items-center space-x-3 flex-1">
            <input type="checkbox" onchange="window.app.todo.toggleTodo(${realIdx})" class="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer">
            <div onclick="window.app.todo.editTodo(${realIdx})" class="flex-1 cursor-pointer">
              <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">${Utils.escapeHtml(todo.title)}</p>
              <p class="text-[11px] text-gray-400 dark:text-slate-500">${todo.category} • ${userText}${dateInfo}</p>
            </div>
          </div>
          ${priorityBadge}
        </div>
      `;
    }).join('');
  }

  renderUpcomingReminders() {
    const widget = document.getElementById('homeRemindersWidget');
    const listContainer = document.getElementById('homeRemindersList');
    if (!widget || !listContainer) return;

    let hasReminders = false;
    let html = '';
    const now = new Date();
    now.setHours(0,0,0,0);

    // 1. Check Events/Bills (Next 3 days)
    const upcomingEvents = (this.app.data.events || []).filter(ev => {
      const evDate = new Date(ev.date);
      evDate.setHours(0,0,0,0);
      const diffDays = Math.ceil((evDate - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

    if (upcomingEvents.length > 0) {
      hasReminders = true;
      html += upcomingEvents.map(ev => {
        const isBill = ev.type === 'bill';
        const icon = isBill ? 'fa-solid fa-file-invoice-dollar text-rose-500' : 'fa-solid fa-calendar-day text-blue-500';
        const amountStr = isBill && ev.amount ? ` - ${Utils.formatCurrency(ev.amount)}` : '';
        const evDate = new Date(ev.date);
        evDate.setHours(0,0,0,0);
        const diffDays = Math.ceil((evDate - now) / (1000 * 60 * 60 * 24));
        const dayStr = diffDays === 0 ? 'Hôm nay' : `Còn ${diffDays} ngày`;
        
        return `
          <div class="flex items-center p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-amber-100 dark:border-slate-700 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors" onclick="switchTab('calendar', 'Lịch & Hóa Đơn'); window.app.calendar.openModal('${ev.id}')">
            <div class="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center mr-3 shadow-sm shrink-0">
              <i class="${icon} text-xs"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">${ev.title}${amountStr}</p>
              <p class="text-[10px] text-amber-600 dark:text-amber-400 font-medium">${dayStr}</p>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Check Shopping List
    const shopList = (this.app.data.shoppingList || []).filter(item => !item.done);
    const shopReminder = document.getElementById('homeShoppingReminder');
    const shopCount = document.getElementById('homeShoppingCount');
    
    if (shopList.length > 0) {
      hasReminders = true;
      if (shopReminder) shopReminder.classList.remove('hidden');
      if (shopCount) shopCount.innerText = shopList.length;
    } else {
      if (shopReminder) shopReminder.classList.add('hidden');
    }

    if (hasReminders) {
      listContainer.innerHTML = html;
      widget.classList.remove('hidden');
    } else {
      widget.classList.add('hidden');
    }
  }

  search(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.renderImportantReminders();
  }

  updateDynamicInfo() {
    const s = this.app.data.settings || {};
    const viewNmaxOdo = document.getElementById('viewNmaxOdo');
    if (viewNmaxOdo) viewNmaxOdo.innerText = `${(s.nmaxOdo || 0).toLocaleString('vi-VN')} km`;

    const viewNmaxPlate = document.getElementById('viewNmaxPlate');
    if (viewNmaxPlate) viewNmaxPlate.innerText = `BS: ${CONFIG.VEHICLES.NMAX.plate}`;

    const viewGrandeOdo = document.getElementById('viewGrandeOdo');
    if (viewGrandeOdo) viewGrandeOdo.innerText = `${(s.grandeOdo || 0).toLocaleString('vi-VN')} km`;

    const viewGrandePlate = document.getElementById('viewGrandePlate');
    if (viewGrandePlate) viewGrandePlate.innerText = `BS: ${CONFIG.VEHICLES.Grande.plate}`;

    const latestWeights = (this.app.data.catWeights && this.app.data.catWeights.length > 0)
      ? this.app.data.catWeights[this.app.data.catWeights.length - 1]
      : { mun: 0, bong: 0 };
    const viewCatsInfo = document.getElementById('viewCatsInfo');
    if (viewCatsInfo) {
      viewCatsInfo.innerText = `Mun (${latestWeights.mun}kg) • Bông (${latestWeights.bong}kg)`;
    }
  }

  updateBadges() {
    const incompleteTodos = (this.app.data.todos || []).filter(t => !t.done).length;
    const badge = document.getElementById('todoBadge');
    if (badge) {
      if (incompleteTodos > 0) {
        badge.innerText = incompleteTodos;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }
}

// Global alias for compatibility
function searchHome(query) {
  if (window.app && window.app.home) {
    window.app.home.search(query);
  }
}
