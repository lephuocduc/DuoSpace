/**
 * DuoSpace Cloudflare D1 Synchronization Manager
 * Quản lý đồng bộ 2 chiều giữa LocalStorage và Cloudflare D1
 */
class CloudSync {
  constructor(storage) {
    this.storage = storage;
    this.syncTimeout = null;
    this.isSyncing = false;
  }

  get apiUrl() {
    return CONFIG.D1_API_URL || '';
  }

  get isEnabled() {
    return Boolean(this.apiUrl && this.apiUrl.startsWith('http'));
  }

  // Tải dữ liệu mới nhất từ Cloudflare D1 về
  async pullFromCloud() {
    if (!this.isEnabled) return false;

    // Lấy Google ID Token từ AuthModule (chờ nếu đang khôi phục phiên)
    const idToken = await window.authManager?.getIdToken();
    if (!idToken) {
      // Người dùng chưa đăng nhập Google hoặc phiên chưa sẵn sàng -> bỏ qua pull ngầm
      return false;
    }

    try {
      this.setSyncStatus('loading', 'Đang tải dữ liệu từ Cloud...');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };
      if (CONFIG.D1_APP_SECRET) headers['X-App-Secret'] = CONFIG.D1_APP_SECRET;

      const res = await fetch(`${this.apiUrl}/api/sync`, {
        method: 'GET',
        headers
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (result.success && result.data) {
        // Merge dữ liệu từ Cloud vào LocalStorage
        const merged = this.storage.mergeWithDefaults(result.data);
        this.storage.save(merged);
        if (window.app && typeof window.app.render === 'function') {
          window.app.data = merged;
          window.app.render();
        }
        this.setSyncStatus('success', 'Đã đồng bộ từ Cloud');
        return true;
      }
    } catch (err) {
      console.warn('[CloudSync] Pull failed:', err);
      this.setSyncStatus('error', 'Không thể kết nối Cloud');
    }
    return false;
  }

  // Đẩy dữ liệu từ LocalStorage lên Cloudflare D1 (có debounce chống spam request)
  debouncePushToCloud(delay = 1500) {
    if (!this.isEnabled) return;
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    this.syncTimeout = setTimeout(() => {
      this.pushToCloud();
    }, delay);
  }

  async pushToCloud() {
    if (!this.isEnabled || this.isSyncing) return false;

    // Lấy Google ID Token từ AuthModule
    const idToken = await window.authManager?.getIdToken();
    if (!idToken) {
      // Người dùng chưa đăng nhập Google -> chỉ lưu local
      return false;
    }

    try {
      this.isSyncing = true;
      this.setSyncStatus('loading', 'Đang lưu lên Cloud...');

      const currentData = this.storage.getData();
      const rawUserCode = window.authManager?.matchedProfile?.code || 'Đ';
      const safeUserCode = rawUserCode === 'Đ' ? 'D' : (rawUserCode === 'S' ? 'S' : 'Both');

      const headers = {
        'Content-Type': 'application/json',
        'X-User-Code': safeUserCode,
        'Authorization': `Bearer ${idToken}`
      };
      if (CONFIG.D1_APP_SECRET) headers['X-App-Secret'] = CONFIG.D1_APP_SECRET;

      const res = await fetch(`${this.apiUrl}/api/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...currentData,
          userCode: rawUserCode
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (result.success) {
        this.setSyncStatus('success', 'Đã lưu lên Cloudflare D1');
        return true;
      }
    } catch (err) {
      console.warn('[CloudSync] Push failed:', err);
      this.setSyncStatus('error', 'Lỗi lưu Cloud (đã lưu máy local)');
    } finally {
      this.isSyncing = false;
    }
    return false;
  }

  // Đồng bộ thủ công khi người dùng bấm trực tiếp vào nút Cloud ở header
  async manualSync() {
    if (this.isSyncing) return;
    if (!this.isEnabled) {
      if (typeof Utils !== 'undefined' && Utils.notify) {
        Utils.notify('Cloudflare D1 chưa được kích hoạt', 'warning');
      }
      return;
    }

    try {
      this.setSyncStatus('loading', 'Đang đồng bộ...');
      const success = await this.pullFromCloud();
      if (success) {
        if (typeof Utils !== 'undefined' && Utils.notify) {
          Utils.notify('Đã cập nhật dữ liệu mới nhất từ Cloud!', 'success');
        }
      } else {
        if (typeof Utils !== 'undefined' && Utils.notify) {
          Utils.notify('Không thể đồng bộ Cloud hoặc chưa có kết nối mạng', 'error');
        }
      }
    } catch (err) {
      console.error('[CloudSync] Manual sync error:', err);
      this.setSyncStatus('error', 'Lỗi đồng bộ');
    }
  }

  setSyncStatus(status, text) {
    const el = document.getElementById('cloudSyncStatus');
    if (!el) return;

    if (status === 'loading') {
      el.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin text-blue-500 mr-1"></i> <span class="text-blue-600 dark:text-blue-400 font-semibold">${text}</span>`;
    } else if (status === 'success') {
      el.innerHTML = `<i class="fa-solid fa-cloud-check text-emerald-500 mr-1"></i> <span class="text-emerald-600 dark:text-emerald-400 font-semibold">${text}</span>`;
      setTimeout(() => {
        if (el && !this.isSyncing) {
          el.innerHTML = `<i class="fa-solid fa-cloud text-emerald-500 mr-1"></i> <span>Đã đồng bộ</span>`;
        }
      }, 3500);
    } else if (status === 'error') {
      el.innerHTML = `<i class="fa-solid fa-cloud-slash text-amber-500 mr-1"></i> <span class="text-amber-600 dark:text-amber-400">${text}</span>`;
    }
  }
}
