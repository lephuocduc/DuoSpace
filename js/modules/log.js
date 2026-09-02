/** Nhật ký hoạt động của hệ thống */
class LogModule {
  constructor(app) { this.app = app; }

  render() {
    const container = document.getElementById('logList');
    if (!container) return;
    const logs = [...(this.app.data.logs || [])]
      .filter(entry => entry.type === 'system')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!logs.length) {
      container.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">Chưa có hoạt động hệ thống nào</p>';
      return;
    }
    container.innerHTML = logs.map(entry => {
      return `<div class="p-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-700/60">
        <div class="flex justify-between gap-3"><p class="text-sm font-semibold text-gray-800 dark:text-slate-200">${Utils.escapeHtml(entry.title)}</p><i class="fa-solid fa-gear text-blue-400 text-xs mt-1" title="Hoạt động hệ thống"></i></div>
        ${entry.notes ? `<p class="text-xs text-gray-500 dark:text-slate-400 mt-1 whitespace-pre-wrap">${Utils.escapeHtml(entry.notes)}</p>` : ''}
        <p class="text-[10px] text-gray-400 mt-2">${new Date(entry.date).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>
      </div>`;
    }).join('');
  }

  system(title, notes = '') {
    if (!this.app.data.logs) this.app.data.logs = [];
    this.app.data.logs.push({ title, notes, type: 'system', date: new Date().toISOString() });
    // Keep the activity history useful without allowing it to grow forever.
    if (this.app.data.logs.length > 200) this.app.data.logs.splice(0, this.app.data.logs.length - 200);
  }
}
