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
  }

  loadSettingsToForm() {
    // Kept for backwards compatibility with the app initializer.
  }

  saveSettings() {
    // Kept as a harmless global alias for old inline handlers.
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
      ...(this.app.data.incomes || []).map(item => ['Thu nhập', item.date, 'Thu nhập', item.desc, item.amount, item.user, item.notes])
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
