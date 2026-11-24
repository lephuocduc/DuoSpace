/**
 * DuoSpace Cloudflare D1 Synchronization Manager
 * Quản lý đồng bộ 2 chiều giữa LocalStorage và Cloudflare D1
 */
class CloudSync {
  constructor(storage) {
    this.storage = storage;
    this.syncTimeout = null;
    this.isSyncing = false;
    this.cachedEtag = localStorage.getItem('duospace_sync_etag') || null;
    this.localVersion = parseInt(localStorage.getItem('duospace_sync_version') || '0', 10);
    this.hasPendingPush = localStorage.getItem('duospace_sync_pending') === '1';
    this._bindLifecycleListeners();
  }

  _bindLifecycleListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this._listenersBound) return;
    this._listenersBound = true;

    // Đẩy ngay thay đổi đang chờ khi người dùng chuyển tab hoặc đóng/refresh trang
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.hasPendingPush) {
        if (this.syncTimeout) {
          clearTimeout(this.syncTimeout);
          this.syncTimeout = null;
        }
        this.pushToCloud();
      }
    });

    // Đồng bộ tức thì giữa các tab trình duyệt cùng mở ứng dụng
    window.addEventListener('storage', (e) => {
      if (e.key === this.storage.key && e.newValue) {
        try {
          const updated = this.storage.mergeWithDefaults(JSON.parse(e.newValue));
          this.storage.data = updated;
          if (window.app && typeof window.app.render === 'function') {
            window.app.data = updated;
            window.app.render();
          }
        } catch (_) {}
      }
    });
  }

  _setPendingPush(pending) {
    this.hasPendingPush = Boolean(pending);
    if (this.hasPendingPush) {
      localStorage.setItem('duospace_sync_pending', '1');
    } else {
      localStorage.removeItem('duospace_sync_pending');
    }
  }

  get apiUrl() {
    return CONFIG.D1_API_URL || '';
  }

  get isEnabled() {
    return Boolean(this.apiUrl && this.apiUrl.startsWith('http'));
  }

  /**
   * Tải dữ liệu từ Cloudflare D1 về.
   * Sử dụng kết hợp ETag (HTTP 304) và kiểm tra Version trước để giảm tối đa đọc DB & băng thông.
   * @param {boolean} force - Bắt buộc tải lại toàn bộ mà không qua kiểm tra version
   */
  async pullFromCloud(force = false) {
    if (!this.isEnabled) return false;

    // Lấy Google ID Token từ AuthModule (chờ nếu đang khôi phục phiên)
    const idToken = await window.authManager?.getIdToken();
    if (!idToken) {
      return false;
    }

    // Nếu còn thay đổi local chưa kịp đẩy lên Cloud (vd: vừa thêm ghi chú rồi refresh ngay),
    // ưu tiên đẩy lên Cloud trước để không bị dữ liệu cũ trên Cloud ghi đè mất!
    if (!force && this.hasPendingPush) {
      const pushed = await this.pushToCloud();
      if (pushed) return true;
    }

    try {
      this.setSyncStatus('loading', 'Đang kiểm tra dữ liệu...');

      // BƯỚC 1: Nếu không ép tải (force), kiểm tra nhẹ qua /api/sync/check (Chỉ tốn 1 row read siêu nhẹ)
      if (!force && this.localVersion > 0) {
        const checkHeaders = {
          'Authorization': `Bearer ${idToken}`
        };
        if (this.cachedEtag) checkHeaders['If-None-Match'] = this.cachedEtag;
        if (CONFIG.D1_APP_SECRET) checkHeaders['X-App-Secret'] = CONFIG.D1_APP_SECRET;

        const checkRes = await fetch(`${this.apiUrl}/api/sync/check?v=${this.localVersion}`, {
          method: 'GET',
          headers: checkHeaders
        });

        // Nếu máy chủ báo 304 Not Modified hoặc changed = false -> Dữ liệu trên máy bạn đã mới nhất!
        if (checkRes.status === 304) {
          this.setSyncStatus('success', 'Dữ liệu đã mới nhất (304)');
          return true;
        }

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.success && !checkData.changed) {
            this.setSyncStatus('success', 'Dữ liệu đã mới nhất');
            return true;
          }
        }
      }

      // BƯỚC 2: Có dữ liệu mới hoặc lần đầu mở -> Tải toàn bộ qua /api/sync kèm ETag
      this.setSyncStatus('loading', 'Đang cập nhật từ Cloud...');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };
      if (this.cachedEtag && !force) headers['If-None-Match'] = this.cachedEtag;
      if (CONFIG.D1_APP_SECRET) headers['X-App-Secret'] = CONFIG.D1_APP_SECRET;

      const res = await fetch(`${this.apiUrl}/api/sync`, {
        method: 'GET',
        headers
      });

      if (res.status === 304) {
        this.setSyncStatus('success', 'Dữ liệu đã mới nhất');
        return true;
      }

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (result.success && result.data) {
        // Lưu ETag và version mới để dùng cho các lần sau
        const newEtag = res.headers.get('ETag');
        const newVersion = result.version || parseInt(res.headers.get('X-Data-Version') || '0', 10);
        if (newEtag) {
          this.cachedEtag = newEtag;
          localStorage.setItem('duospace_sync_etag', newEtag);
        }
        if (newVersion) {
          this.localVersion = newVersion;
          localStorage.setItem('duospace_sync_version', String(newVersion));
        }

        // Merge dữ liệu từ Cloud vào LocalStorage
        // Bảo toàn các trường mới (notes, shoppingList, events, savingsGoals) nếu Worker chưa trả về trường đó
        const localBefore = this.storage.getData() || {};
        const cloudData = { ...result.data };
        for (const key of ['notes', 'shoppingList', 'events', 'savingsGoals']) {
          if (cloudData[key] === undefined && Array.isArray(localBefore[key])) {
            cloudData[key] = localBefore[key];
          }
        }
        const merged = this.storage.mergeWithDefaults(cloudData);
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

  // Đẩy dữ liệu từ LocalStorage lên Cloudflare D1 (debounce 1.2s + đánh dấu pending để tránh mất dữ liệu khi refresh)
  debouncePushToCloud(delay = 1200) {
    if (!this.isEnabled) return;
    this._setPendingPush(true);
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    this.syncTimeout = setTimeout(() => {
      this.syncTimeout = null;
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
        this._setPendingPush(false);
        // Cập nhật ETag & Version mới từ phản hồi POST
        const newEtag = res.headers.get('ETag');
        const newVersion = result.version || parseInt(res.headers.get('X-Data-Version') || '0', 10);
        if (newEtag) {
          this.cachedEtag = newEtag;
          localStorage.setItem('duospace_sync_etag', newEtag);
        }
        if (newVersion) {
          this.localVersion = newVersion;
          localStorage.setItem('duospace_sync_version', String(newVersion));
        }

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
      const success = await this.pullFromCloud(true); // force=true để đảm bảo ép tải mới nhất khi bấm thủ công
      if (success) {
        if (typeof Utils !== 'undefined' && Utils.notify) {
          Utils.notify('Đã cập nhật dữ liệu mới nhất từ Cloud!', 'success');
        }
      } else {
        const idToken = await window.authManager?.getIdToken();
        if (!idToken) {
          this.setSyncStatus('idle', 'Cloud');
          if (typeof Utils !== 'undefined' && Utils.notify) {
            Utils.notify('Bạn chưa đăng nhập. Vui lòng đăng nhập để đồng bộ Cloud.', 'warning');
          }
        } else {
          this.setSyncStatus('error', 'Lỗi kết nối');
          if (typeof Utils !== 'undefined' && Utils.notify) {
            Utils.notify('Không thể đồng bộ Cloud hoặc chưa có kết nối mạng', 'error');
          }
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
      el.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin text-blue-500 shrink-0 ${text ? 'mr-1' : ''}"></i><span class="text-blue-600 dark:text-blue-400 font-semibold text-[10px] sm:text-xs">${text || ''}</span>`;
    } else if (status === 'success') {
      el.innerHTML = `<i class="fa-solid fa-cloud-check text-emerald-500 shrink-0 mr-1"></i><span class="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] sm:text-xs">${text}</span>`;
      setTimeout(() => {
        if (el && !this.isSyncing) {
          el.innerHTML = `<i class="fa-solid fa-cloud text-emerald-500 shrink-0 mr-1"></i><span class="text-[10px] sm:text-xs text-gray-600 dark:text-slate-300 font-medium">Đã đồng bộ</span>`;
        }
      }, 3500);
    } else if (status === 'error') {
      el.innerHTML = `<i class="fa-solid fa-cloud-slash text-amber-500 shrink-0 mr-1"></i><span class="text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-semibold">${text}</span>`;
      setTimeout(() => {
        if (el && !this.isSyncing) {
          el.innerHTML = `<i class="fa-solid fa-cloud text-gray-400 shrink-0 mr-1"></i><span class="text-[10px] sm:text-xs text-gray-600 dark:text-slate-300 font-medium">Cloud</span>`;
        }
      }, 4000);
    } else {
      el.innerHTML = `<i class="fa-solid fa-cloud text-gray-400 shrink-0 mr-1"></i><span class="text-[10px] sm:text-xs text-gray-600 dark:text-slate-300 font-medium">${text || 'Cloud'}</span>`;
    }
  }
}
