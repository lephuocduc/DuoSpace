/** Nhật ký hoạt động của hệ thống */
class LogModule {
  constructor(app) {
    this.app = app;
    this.filter = 'all';
    this.countLoaded = 10;
  }

  getLogKind(entry) {
    if (/^(Thêm|Hoàn thành|Mở lại)/.test(entry.title)) return 'add';
    if (/^(Cập nhật)/.test(entry.title)) return 'update';
    if (/^(Xóa)/.test(entry.title)) return 'delete';
    return 'other';
  }

  filterLogs(filter) {
    this.filter = filter;
    this.countLoaded = 10;
    this.render();
  }

  loadMore() {
    this.countLoaded += 10;
    this.render();
  }

  exportLogsCsv() {
    const allLogs = [...(this.app.data.logs || [])]
      .filter(entry => entry.type === 'system')
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!allLogs.length) {
      if (typeof Utils !== 'undefined' && Utils.notify) {
        Utils.notify('Chưa có nhật ký nào để xuất!', 'info');
      } else {
        alert('Chưa có nhật ký nào để xuất!');
      }
      return;
    }

    const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Thời gian', 'Phân loại', 'Thao tác / Tiêu đề', 'Chi tiết thay đổi'],
      ...allLogs.map(entry => [
        entry.date ? new Date(entry.date).toLocaleString('vi-VN') : '',
        this.getLogKind(entry),
        entry.title || '',
        entry.notes || ''
      ])
    ];

    const csv = '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n');
    const filename = `duospace-nhat-ky-he-thong-${new Date().toISOString().slice(0, 10)}.csv`;
    
    if (typeof Utils !== 'undefined' && Utils.downloadFile) {
      Utils.downloadFile(csv, filename, 'text/csv;charset=utf-8');
    } else {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    if (typeof Utils !== 'undefined' && Utils.notify) {
      Utils.notify(`Đã xuất ${allLogs.length} nhật ký hệ thống ra file CSV!`, 'success');
    }
  }

  render() {
    const container = document.getElementById('logList');
    if (!container) return;
    const allLogs = [...(this.app.data.logs || [])]
      .filter(entry => entry.type === 'system')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const logs = this.filter === 'all' ? allLogs : allLogs.filter(entry => this.getLogKind(entry) === this.filter);
    const displayed = logs.slice(0, this.countLoaded);
    const remainingCount = logs.length - displayed.length;

    const countEl = document.getElementById('logCount');
    if (countEl) countEl.textContent = `${logs.length} hoạt động`;
    ['all', 'add', 'update', 'delete', 'other'].forEach(kind => {
      const button = document.getElementById(`logFilter-${kind}`);
      if (button) button.className = kind === this.filter
        ? 'shrink-0 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold'
        : 'shrink-0 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-semibold';
    });
    if (!logs.length) {
      container.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">Chưa có hoạt động hệ thống nào</p>';
      document.getElementById('loadMoreLogsBtn')?.classList.add('hidden');
      return;
    }
    container.innerHTML = displayed.map(entry => {
      return `<div class="p-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-700/60">
        <div class="flex justify-between gap-3"><p class="text-sm font-semibold text-gray-800 dark:text-slate-200">${Utils.escapeHtml(entry.title)}</p><i class="fa-solid fa-gear text-blue-400 text-xs mt-1" title="Hoạt động hệ thống"></i></div>
        ${entry.notes ? `<p class="text-xs text-gray-500 dark:text-slate-400 mt-1 whitespace-pre-wrap">${Utils.escapeHtml(entry.notes)}</p>` : ''}
        <p class="text-[10px] text-gray-400 mt-2">${new Date(entry.date).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>
      </div>`;
    }).join('');
    const loadMoreButton = document.getElementById('loadMoreLogsBtn');
    if (loadMoreButton) {
      if (remainingCount > 0) {
        loadMoreButton.classList.remove('hidden');
        loadMoreButton.innerHTML = `<i class="fa-solid fa-arrow-down mr-1.5"></i>Xem thêm (Còn ${remainingCount} hoạt động · Hiển thị ${displayed.length}/${logs.length})`;
      } else {
        loadMoreButton.classList.add('hidden');
      }
    }
  }

  system(title, notes = '') {
    if (!this.app.data.logs) this.app.data.logs = [];
    this.app.data.logs.push({ title, notes, type: 'system', date: new Date().toISOString() });
    // Keep the activity history useful without allowing it to grow forever.
    if (this.app.data.logs.length > 200) this.app.data.logs.splice(0, this.app.data.logs.length - 200);
  }
}

function filterSystemLog(filter) { window.app.log.filterLogs(filter); }
function loadMoreSystemLogs() { window.app.log.loadMore(); }
function exportSystemLogsCsv() { window.app.log.exportLogsCsv(); }
