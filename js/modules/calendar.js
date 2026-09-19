/**
 * DuoSpace - Calendar & Events Module
 */
class CalendarModule {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('eventsContainer');
  }

  render() {
    this.container = document.getElementById('eventsContainer');
    if (!this.container) return;
    
    const events = this.app.data.events || [];
    
    if (events.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-10 text-gray-400 dark:text-slate-500">
          <i class="fa-regular fa-calendar-xmark text-5xl mb-3 opacity-30"></i>
          <p class="text-sm">Chưa có sự kiện hay hóa đơn nào.</p>
        </div>
      `;
      return;
    }
    
    // Sort by date ascending
    const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    let html = '<div class="space-y-3">';
    sorted.forEach(ev => {
      const evDate = new Date(ev.date);
      evDate.setHours(0, 0, 0, 0);
      
      const diffTime = evDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let dateColor = 'text-gray-500 dark:text-gray-400';
      let badge = '';
      
      if (diffDays < 0) {
        dateColor = 'text-rose-500';
        badge = '<span class="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full ml-2">Đã qua</span>';
      } else if (diffDays === 0) {
        dateColor = 'text-orange-500 font-bold';
        badge = '<span class="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full ml-2">Hôm nay</span>';
      } else if (diffDays <= 3) {
        dateColor = 'text-amber-500 font-semibold';
        badge = `<span class="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full ml-2">Sắp tới (${diffDays} ngày)</span>`;
      }
      
      const isBill = ev.type === 'bill';
      const icon = isBill ? 'fa-solid fa-file-invoice-dollar text-rose-500' : 'fa-solid fa-calendar-day text-blue-500';
      const amountStr = (isBill && ev.amount) ? `<div class="text-xs font-semibold text-rose-600 mt-1">${Utils.formatCurrency(ev.amount)}</div>` : '';
      
      html += `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-start hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
          <div class="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center mr-4 shrink-0 cursor-pointer" onclick="window.app.calendar.openModal('${ev.id}')">
            <i class="${icon}"></i>
          </div>
          <div class="flex-1 cursor-pointer" onclick="window.app.calendar.openModal('${ev.id}')">
            <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">${ev.title} ${badge}</h4>
            <div class="text-xs ${dateColor} mt-1"><i class="fa-regular fa-clock mr-1"></i> ${Utils.formatDate(ev.date)}</div>
            ${amountStr}
            ${ev.notes ? `<div class="text-xs text-gray-500 mt-1 truncate">${ev.notes}</div>` : ''}
          </div>
          ${isBill ? `
          <button onclick="event.stopPropagation(); window.app.calendar.payBill('${ev.id}')" class="ml-2 mt-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-semibold transition-colors shrink-0">
            <i class="fa-solid fa-check mr-1"></i> Đã đóng
          </button>
          ` : ''}
        </div>
      `;
    });
    html += '</div>';
    
    this.container.innerHTML = html;
  }
  
  openModal(id = null) {
    let ev = null;
    if (id) {
      ev = (this.app.data.events || []).find(e => e.id === id);
    }
    
    document.getElementById('eventId').value = id || '';
    document.getElementById('eventTitle').value = ev ? ev.title : '';
    document.getElementById('eventDate').value = ev ? ev.date : new Date().toISOString().slice(0, 10);
    document.getElementById('eventType').value = ev ? (ev.type || 'event') : 'event';
    document.getElementById('eventAmount').value = ev ? (ev.amount || '') : '';
    document.getElementById('eventNotes').value = ev ? (ev.notes || '') : '';
    
    Utils.formatNumberInput(document.getElementById('eventAmount'));
    this.toggleAmountField();
    
    const delBtn = document.getElementById('deleteEventBtn');
    if (delBtn) {
      if (id) {
        delBtn.classList.remove('hidden');
        delBtn.onclick = () => this.deleteEvent(id);
      } else {
        delBtn.classList.add('hidden');
      }
    }
    
    const modal = document.getElementById('eventModal');
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.querySelector('div').classList.add('scale-100', 'opacity-100');
        modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
      }, 10);
    }
  }
  
  closeModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
      modal.querySelector('div').classList.remove('scale-100', 'opacity-100');
      modal.querySelector('div').classList.add('scale-95', 'opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
    }
  }
  
  toggleAmountField() {
    const type = document.getElementById('eventType').value;
    const amountContainer = document.getElementById('eventAmountContainer');
    if (amountContainer) {
      if (type === 'bill') {
        amountContainer.classList.remove('hidden');
      } else {
        amountContainer.classList.add('hidden');
      }
    }
  }
  
  saveEvent() {
    const id = document.getElementById('eventId').value;
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const type = document.getElementById('eventType').value;
    const amountRaw = document.getElementById('eventAmount').value;
    const amount = Number(amountRaw.replace(/\D/g, '')) || 0;
    const notes = document.getElementById('eventNotes').value.trim();
    
    if (!title || !date) {
      Utils.notify('Vui lòng nhập tên và ngày', 'error');
      return;
    }
    
    if (!this.app.data.events) this.app.data.events = [];
    
    if (id) {
      const idx = this.app.data.events.findIndex(e => e.id === id);
      if (idx !== -1) {
        this.app.data.events[idx] = {
          ...this.app.data.events[idx],
          title, date, type, amount, notes
        };
      }
    } else {
      this.app.data.events.push({
        id: 'event-' + Date.now(),
        title, date, type, amount, notes, user: 'Both',
        createdAt: new Date().toISOString()
      });
    }
    
    this.app.save();
    this.render();
    this.closeModal();
    Utils.notify('Đã lưu sự kiện!');
  }
  
  deleteEvent(id) {
    if (!confirm('Xóa sự kiện này?')) return;
    this.app.data.events = (this.app.data.events || []).filter(e => e.id !== id);
    this.app.save();
    this.render();
    this.closeModal();
    Utils.notify('Đã xóa!');
  }
  
  payBill(id) {
    const ev = (this.app.data.events || []).find(e => e.id === id);
    if (!ev) return;
    
    if (!confirm(`Bạn có muốn tự động ghi nhận khoản chi ${Utils.formatCurrency(ev.amount || 0)} cho "${ev.title}" vào Quản lý Thu Chi không?`)) return;
    
    // Add to expenses
    if (!this.app.data.expenses) this.app.data.expenses = [];
    this.app.data.expenses.push({
      id: 'expense-' + Date.now(),
      amount: ev.amount || 0,
      category: 'Hóa đơn',
      date: new Date().toISOString().slice(0, 10),
      note: ev.title + (ev.notes ? ` - ${ev.notes}` : ''),
      user: 'Both',
      createdAt: new Date().toISOString()
    });
    
    // Remove the bill from calendar
    this.app.data.events = this.app.data.events.filter(e => e.id !== id);
    
    this.app.save();
    this.app.render(); // Re-render everything to update finance tab
    Utils.notify('Đã thanh toán và ghi nhận chi tiêu!', 'success');
  }
}
