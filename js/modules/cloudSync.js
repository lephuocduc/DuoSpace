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
    this.pendingPushAt = parseInt(localStorage.getItem('duospace_sync_pending_at') || '0', 10);
    this._lastSyncedSnapshot = null;
    this._lastSyncedLogIds = new Set();
    this._bindLifecycleListeners();
  }

  _captureSnapshot(data) {
    if (!data || typeof data !== 'object') return;
    const keys = [
      'usdRate', 'settings', 'todos', 'investments', 'netWorthHistory',
      'catWeights', 'bikeMaintenances', 'healthLogs', 'shoppingList', 'events', 'notes'
    ];
    const snap = {};
    for (const k of keys) {
      snap[k] = JSON.stringify(data[k] ?? null);
    }
    this._lastSyncedSnapshot = snap;
    this._lastSyncedLogIds = new Set((data.logs || []).map(l => l.id || `${l.date}|${l.title}|${l.notes}`));
  }

  _buildDiffPayload(currentData, rawUserCode) {
    const payload = {
      usdRate: currentData.usdRate || 25400,
      settings: currentData.settings || {},
      userCode: rawUserCode
    };
    const snap = this._lastSyncedSnapshot;
    const arrayKeys = [
      'todos', 'investments', 'netWorthHistory',
      'catWeights', 'bikeMaintenances', 'healthLogs', 'shoppingList', 'events', 'notes'
    ];
    let hasChanges = !snap ||
      snap.usdRate !== JSON.stringify(currentData.usdRate ?? null) ||
      snap.settings !== JSON.stringify(currentData.settings ?? null);

    for (const k of arrayKeys) {
      const serialized = JSON.stringify(currentData[k] ?? null);
      if (!snap || snap[k] !== serialized) {
        payload[k] = currentData[k] || [];
        hasChanges = true;
      }
    }

    // Chỉ gửi các dòng system_logs mới chưa từng đồng bộ (giảm mạnh rows written trên D1)
    const allLogs = Array.isArray(currentData.logs) ? currentData.logs.slice(-200) : [];
    const newLogs = snap
      ? allLogs.filter(l => !this._lastSyncedLogIds.has(l.id || `${l.date}|${l.title}|${l.notes}`))
      : allLogs.slice(-20);
    if (newLogs.length > 0) {
      payload.logs = newLogs;
      hasChanges = true;
    }

    if (payload.investments) {
      payload.allowEmptyInvestments = Boolean(this.localVersion > 0 && payload.investments.length === 0 && (this._explicitEmptyInvestments || (snap && snap.investments && snap.investments !== '[]')));
    }
    if (payload.todos) {
      payload.allowEmptyTodos = Boolean(this.localVersion > 0 && payload.todos.length === 0 && (this._explicitEmptyTodos || (snap && snap.todos && snap.todos !== '[]')));
    }
    if (payload.notes) payload.allowEmptyNotes = Boolean(payload.notes.length === 0 && snap && snap.notes && snap.notes !== '[]');
    if (payload.bikeMaintenances) payload.allowEmptyBikeMaintenances = Boolean(payload.bikeMaintenances.length === 0 && snap && snap.bikeMaintenances && snap.bikeMaintenances !== '[]');
    if (payload.healthLogs) payload.allowEmptyHealthLogs = Boolean(payload.healthLogs.length === 0 && snap && snap.healthLogs && snap.healthLogs !== '[]');
    if (payload.shoppingList) payload.allowEmptyShoppingList = Boolean(payload.shoppingList.length === 0 && snap && snap.shoppingList && snap.shoppingList !== '[]');
    if (payload.events) payload.allowEmptyEvents = Boolean(payload.events.length === 0 && snap && snap.events && snap.events !== '[]');

    return { payload, hasChanges };
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
      this.pendingPushAt = Date.now();
      localStorage.setItem('duospace_sync_pending', '1');
      localStorage.setItem('duospace_sync_pending_at', String(this.pendingPushAt));
    } else {
      this.pendingPushAt = 0;
      localStorage.removeItem('duospace_sync_pending');
      localStorage.removeItem('duospace_sync_pending_at');
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

    // Nếu còn thay đổi local chưa kịp đẩy lên Cloud (vd: vừa thêm ghi chú rồi refresh ngay):
    // - Chỉ cho phép đẩy nếu thay đổi còn mới (< 5 phút) VÀ Cloud chưa có phiên bản mới hơn.
    // - Nếu là session cũ để lâu (> 5 phút) hoặc Cloud đã có dữ liệu mới từ máy khác -> hủy pending push và tải từ Cloud về!
    if (!force && this.hasPendingPush) {
      const PENDING_MAX_AGE_MS = 5 * 60 * 1000;
      const pendingAge = this.pendingPushAt > 0 ? (Date.now() - this.pendingPushAt) : Infinity;
      let canPushPending = pendingAge <= PENDING_MAX_AGE_MS;

      if (canPushPending && this.localVersion > 0) {
        try {
          const checkHeaders = { 'Authorization': `Bearer ${idToken}` };
          if (CONFIG.D1_APP_SECRET) checkHeaders['X-App-Secret'] = CONFIG.D1_APP_SECRET;
          const checkRes = await fetch(`${this.apiUrl}/api/sync/check?v=${this.localVersion}`, {
            method: 'GET',
            headers: checkHeaders
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.success && checkData.changed && checkData.version > this.localVersion) {
              canPushPending = false;
            }
          }
        } catch (_) {}
      }

      if (canPushPending) {
        const pushed = await this.pushToCloud();
        if (pushed) return true;
      } else {
        console.warn('[CloudSync] Discarding stale local pending push to avoid overwriting newer Cloud data');
        this._setPendingPush(false);
      }
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
          this._captureSnapshot(this.storage.getData());
          this.setSyncStatus('success', 'Dữ liệu đã mới nhất (304)');
          return true;
        }

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.success && !checkData.changed) {
            this._captureSnapshot(this.storage.getData());
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
        this._captureSnapshot(this.storage.getData());
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
        this._captureSnapshot(merged);
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

  // Đẩy dữ liệu từ LocalStorage lên Cloudflare D1 (debounce 800ms + chỉ gửi bảng thay đổi để tối ưu rows written)
  debouncePushToCloud(delay = 800) {
    if (!this.isEnabled) return;
    this._setPendingPush(true);
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    this.syncTimeout = setTimeout(() => {
      this.syncTimeout = null;
      this.pushToCloud();
    }, delay);
  }

  async pushToCloud() {
    if (!this.isEnabled) return false;
    if (this.isSyncing) {
      this._resyncAfterCurrent = true;
      return false;
    }

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
      const { payload, hasChanges } = this._buildDiffPayload(currentData, rawUserCode);

      if (!hasChanges) {
        this._setPendingPush(false);
        this.setSyncStatus('success', 'Dữ liệu đã mới nhất');
        return true;
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-User-Code': safeUserCode,
        'Authorization': `Bearer ${idToken}`
      };
      if (CONFIG.D1_APP_SECRET) headers['X-App-Secret'] = CONFIG.D1_APP_SECRET;

      const isPageHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const res = await fetch(`${this.apiUrl}/api/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: isPageHidden
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (result.success) {
        this._setPendingPush(false);
        this._explicitEmptyInvestments = false;
        this._explicitEmptyTodos = false;
        this._captureSnapshot(currentData);
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
      if (this._resyncAfterCurrent) {
        this._resyncAfterCurrent = false;
        setTimeout(() => this.pushToCloud(), 150);
      }
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
      // Nếu máy hiện tại có thay đổi chưa kịp đẩy lên Cloud -> đẩy lên trước để không bị ghi đè mất!
      if (this.hasPendingPush) {
        if (this.syncTimeout) {
          clearTimeout(this.syncTimeout);
          this.syncTimeout = null;
        }
        await this.pushToCloud();
      }
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
