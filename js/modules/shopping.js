/**
 * DuoSpace - Shopping List Module
 */
class ShoppingModule {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('shoppingListContainer');
  }

  render() {
    this.container = document.getElementById('shoppingListContainer');
    if (!this.container) return;
    
    const items = this.app.data.shoppingList || [];
    
    // Sort: undone first, then by created at
    const sorted = [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    if (sorted.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-10 text-gray-400 dark:text-slate-500">
          <i class="fa-solid fa-basket-shopping text-5xl mb-3 opacity-30"></i>
          <p class="text-sm">Chưa có món đồ nào cần mua.</p>
        </div>
      `;
      return;
    }
    
    let html = '<div class="space-y-2">';
    sorted.forEach(item => {
      const isDone = item.done;
      html += `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border ${isDone ? 'border-gray-100 dark:border-slate-800 opacity-60' : 'border-gray-200 dark:border-slate-700 shadow-sm'} transition-all">
          <div class="flex items-center flex-1 cursor-pointer" onclick="window.app.shopping.toggleItem('${item.id}')">
            <div class="w-6 h-6 rounded border ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-slate-600'} flex items-center justify-center mr-3">
              ${isDone ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
            </div>
            <span class="text-sm ${isDone ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-gray-200 font-medium'}">${item.title}</span>
          </div>
          <button onclick="window.app.shopping.deleteItem('${item.id}')" class="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors ml-2">
            <i class="fa-solid fa-trash-can text-sm"></i>
          </button>
        </div>
      `;
    });
    html += '</div>';
    
    this.container.innerHTML = html;
  }
  
  saveItem() {
    const input = document.getElementById('quickShoppingInput');
    const title = input.value.trim();
    if (!title) {
      Utils.notify('Vui lòng nhập tên món đồ', 'error');
      return;
    }
    
    if (!this.app.data.shoppingList) this.app.data.shoppingList = [];
    
    this.app.data.shoppingList.push({
      id: 'shop-' + Date.now(),
      title,
      done: false,
      createdAt: new Date().toISOString()
    });
    
    this.app.save();
    this.render();
    
    input.value = '';
    input.focus();
  }
  
  toggleItem(id) {
    if (!this.app.data.shoppingList) return;
    const item = this.app.data.shoppingList.find(s => s.id === id);
    if (item) {
      item.done = !item.done;
      this.app.save();
      this.render();
    }
  }
  
  deleteItem(id) {
    if (!confirm('Xóa món đồ này?')) return;
    this.app.data.shoppingList = (this.app.data.shoppingList || []).filter(s => s.id !== id);
    this.app.save();
    this.render();
  }
  
  clearDone() {
    if (!confirm('Xóa tất cả các món đồ đã gạch?')) return;
    this.app.data.shoppingList = (this.app.data.shoppingList || []).filter(s => !s.done);
    this.app.save();
    this.render();
  }
}
