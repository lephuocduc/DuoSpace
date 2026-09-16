/**
 * DuoSpace Authentication Module
 * Quản lý phiên đăng nhập Google bằng Firebase Auth và kiểm tra phân quyền Whitelist.
 */
class AuthModule {
  constructor(app) {
    this.app = app;
    this.currentUser = null;
    this.matchedProfile = null;
    this.auth = null;
    this.isInitialized = false;

    this.init();
  }

  init() {
    this.bindEvents();

    if (!AUTH_CONFIG.isConfigured()) {
      console.warn('[DuoSpace Auth] Firebase chưa được cấu hình API Key thật trong js/authConfig.js.');
      this.showConfigNotice();
      if (!this.checkMockSession()) {
        this.showLoginScreen();
      }
      return;
    }

    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          firebase.initializeApp(AUTH_CONFIG.firebaseConfig);
        }
        this.auth = firebase.auth();
        this.isInitialized = true;

        // Lắng nghe thay đổi trạng thái đăng nhập
        this.auth.onAuthStateChanged((user) => {
          this.handleAuthStateChange(user);
        });
      } else {
        console.error('[DuoSpace Auth] Thư viện Firebase SDK chưa được nạp.');
      }
    } catch (err) {
      console.error('[DuoSpace Auth] Lỗi khởi tạo Firebase:', err);
      this.showAuthError('Lỗi khởi tạo xác thực: ' + (err.message || err));
    }
  }

  bindEvents() {
    const loginBtn = document.getElementById('googleSignInBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.signInWithGoogle());
    }

    const demoLoginDucBtn = document.getElementById('demoLoginDucBtn');
    if (demoLoginDucBtn) {
      demoLoginDucBtn.addEventListener('click', () => this.mockLogin('Đ'));
    }

    const demoLoginSuongBtn = document.getElementById('demoLoginSuongBtn');
    if (demoLoginSuongBtn) {
      demoLoginSuongBtn.addEventListener('click', () => this.mockLogin('S'));
    }

    const logoutSidebarBtn = document.getElementById('logoutSidebarBtn');
    if (logoutSidebarBtn) {
      logoutSidebarBtn.addEventListener('click', () => this.signOut());
    }

    const logoutSettingBtn = document.getElementById('logoutSettingBtn');
    if (logoutSettingBtn) {
      logoutSettingBtn.addEventListener('click', () => this.signOut());
    }
  }

  async signInWithGoogle() {
    this.clearAuthError();

    // Kiểm tra nếu người dùng đang mở app bằng file:/// (gây chặn popup của Firebase)
    if (window.location.protocol === 'file:') {
      const msg = 'LƯU Ý: Firebase Google Auth không hỗ trợ mở trực tiếp bằng đường dẫn file:///. Bạn vui lòng mở file index.html qua Live Server (VS Code) hoặc chạy "npx serve ." trên terminal để truy cập qua http://localhost!';
      alert(msg);
      this.showAuthError(msg);
      return;
    }

    if (!AUTH_CONFIG.isConfigured()) {
      this.showAuthError('Vui lòng cấu hình firebaseConfig trong js/authConfig.js trước khi đăng nhập bằng Google thật.');
      return;
    }

    if (!this.auth) {
      this.showAuthError('Hệ thống xác thực chưa sẵn sàng (Chưa tải được Firebase SDK). Vui lòng kiểm tra kết nối mạng và tải lại trang.');
      return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    this.setLoading(true);

    try {
      const result = await this.auth.signInWithPopup(provider);
      await this.verifyUserAccess(result.user);
    } catch (error) {
      console.error('[DuoSpace Auth] Lỗi đăng nhập:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        this.clearAuthError();
      } else if (error.code === 'auth/unauthorized-domain') {
        this.showAuthError(`Domain "${window.location.hostname || 'hiện tại'}" chưa được thêm vào "Authorized domains" trong Firebase Console -> Authentication -> Settings.`);
      } else if (error.code === 'auth/operation-not-allowed') {
        this.showAuthError('Google Provider chưa được Bật (Enable) trong Firebase Console -> Authentication -> Sign-in method.');
      } else {
        this.showAuthError(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      this.setLoading(false);
    }
  }

  async verifyUserAccess(user) {
    if (!user || !user.email) {
      await this.rejectAccess(user, 'Không tìm thấy thông tin email từ tài khoản Google.');
      return false;
    }

    const userEmail = user.email.toLowerCase().trim();
    const matched = AUTH_CONFIG.allowedUsers.find(
      u => u.email.toLowerCase().trim() === userEmail
    );

    if (!matched) {
      await this.rejectAccess(
        user,
        `Tài khoản (${user.email}) không có quyền truy cập ứng dụng gia đình DuoSpace. Chỉ tài khoản của Đức và Sương mới có quyền truy cập.`
      );
      return false;
    }

    this.matchedProfile = matched;
    this.currentUser = user;
    this.onAuthenticated();
    return true;
  }

  async rejectAccess(user, message) {
    console.warn('[DuoSpace Auth] Truy cập bị từ chối:', user?.email);
    this.showAuthError(message);
    if (this.auth && this.auth.currentUser) {
      await this.auth.signOut();
    }
    this.currentUser = null;
    this.matchedProfile = null;
    this.showLoginScreen();
  }

  handleAuthStateChange(user) {
    if (user) {
      this.verifyUserAccess(user);
    } else {
      this.currentUser = null;
      this.matchedProfile = null;
      this.showLoginScreen();
      this.updateProfileUI(null);
    }
  }

  // Đăng nhập giả lập để test trực quan khi chưa có API Key hoặc test nhanh
  mockLogin(userCode) {
    const matched = AUTH_CONFIG.allowedUsers.find(u => u.code === userCode) || {
      name: userCode === 'Đ' ? 'Phước Đức' : 'Thu Sương',
      code: userCode,
      email: userCode === 'Đ' ? 'leducst1@gmail.com' : 'suongtranst1@gmail.com'
    };

    this.matchedProfile = matched;
    this.currentUser = {
      displayName: matched.name,
      email: matched.email,
      photoURL: null
    };

    try {
      sessionStorage.setItem('duospace_mock_auth', JSON.stringify(this.currentUser));
    } catch (e) {}

    this.onAuthenticated();
  }

  checkMockSession() {
    try {
      const saved = sessionStorage.getItem('duospace_mock_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        const matched = AUTH_CONFIG.allowedUsers.find(u => u.email.toLowerCase() === parsed.email.toLowerCase());
        this.currentUser = parsed;
        this.matchedProfile = matched || { name: parsed.displayName, code: 'Đ', email: parsed.email };
        this.onAuthenticated();
        return true;
      }
    } catch (e) {
      console.warn(e);
    }
    return false;
  }

  async signOut() {
    try {
      sessionStorage.removeItem('duospace_mock_auth');
      if (this.auth && this.auth.currentUser) {
        await this.auth.signOut();
      }
    } catch (err) {
      console.error('[DuoSpace Auth] Lỗi khi đăng xuất:', err);
    } finally {
      this.currentUser = null;
      this.matchedProfile = null;
      this.showLoginScreen();
      this.updateProfileUI(null);
      if (typeof Utils !== 'undefined' && Utils.notify) {
        Utils.notify('Đã đăng xuất tài khoản thành công', 'info');
      }
    }
  }

  onAuthenticated() {
    this.hideLoginScreen();
    this.updateProfileUI(this.currentUser, this.matchedProfile);
    if (typeof Utils !== 'undefined' && Utils.notify) {
      Utils.notify(`Chào mừng ${this.matchedProfile?.name || this.currentUser.displayName}!`, 'success');
    }
  }

  showLoginScreen() {
    const screen = document.getElementById('loginOverlay');
    if (screen) {
      screen.style.display = 'flex';
      screen.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    }
  }

  hideLoginScreen() {
    const screen = document.getElementById('loginOverlay');
    if (screen) {
      screen.style.display = 'none';
      screen.classList.add('hidden', 'opacity-0', 'pointer-events-none');
    }
  }

  updateProfileUI(user, profile) {
    const userContainer = document.getElementById('authSidebarUser');
    const emailEl = document.getElementById('authSidebarEmail');
    const nameEl = document.getElementById('authSidebarName');
    const avatarEl = document.getElementById('authSidebarAvatar');
    const settingUserEl = document.getElementById('authSettingInfo');

    if (user && profile) {
      if (nameEl) nameEl.textContent = `${profile.name} (${profile.code})`;
      if (emailEl) emailEl.textContent = user.email;

      if (avatarEl) {
        if (user.photoURL) {
          avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${profile.name}" class="w-full h-full rounded-full object-cover ring-2 ring-blue-500">`;
        } else {
          avatarEl.innerHTML = `<span class="font-bold text-sm text-white">${profile.code}</span>`;
        }
      }

      if (userContainer) userContainer.classList.remove('hidden');

      if (settingUserEl) {
        settingUserEl.innerHTML = `
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-700/60">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full ${profile.code === 'Đ' ? 'bg-rose-500' : 'bg-blue-600'} text-white flex items-center justify-center font-bold overflow-hidden shadow-sm">
                ${user.photoURL ? `<img src="${user.photoURL}" class="w-full h-full object-cover">` : profile.code}
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">${profile.name}</p>
                <p class="text-xs text-gray-500 dark:text-slate-400">${user.email}</p>
              </div>
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <i class="fa-solid fa-shield-check mr-1"></i> Đã bảo vệ
            </span>
          </div>
        `;
      // Highlight header avatar
      const ducHeader = document.getElementById('headerAvatarDuc');
      const suongHeader = document.getElementById('headerAvatarSuong');
      if (profile.code === 'Đ') {
        ducHeader?.classList.add('ring-4', 'ring-rose-400', 'scale-110', 'z-10');
        suongHeader?.classList.remove('ring-4', 'ring-blue-400', 'scale-110', 'z-10');
      } else if (profile.code === 'S') {
        suongHeader?.classList.add('ring-4', 'ring-blue-400', 'scale-110', 'z-10');
        ducHeader?.classList.remove('ring-4', 'ring-rose-400', 'scale-110', 'z-10');
      }
    } else {
      if (userContainer) userContainer.classList.add('hidden');
      if (settingUserEl) {
        settingUserEl.innerHTML = `<p class="text-xs text-gray-400">Chưa đăng nhập</p>`;
      }
      const ducHeader = document.getElementById('headerAvatarDuc');
      const suongHeader = document.getElementById('headerAvatarSuong');
      ducHeader?.classList.remove('ring-4', 'ring-rose-400', 'scale-110', 'z-10');
      suongHeader?.classList.remove('ring-4', 'ring-blue-400', 'scale-110', 'z-10');
    }
  }

  setLoading(isLoading) {
    const btn = document.getElementById('googleSignInBtn');
    const spinner = document.getElementById('googleSignInSpinner');
    const icon = document.getElementById('googleSignInIcon');
    const text = document.getElementById('googleSignInText');

    if (!btn) return;

    if (isLoading) {
      btn.disabled = true;
      btn.classList.add('opacity-75', 'cursor-not-allowed');
      if (spinner) spinner.classList.remove('hidden');
      if (icon) icon.classList.add('hidden');
      if (text) text.textContent = 'Đang xác thực Google...';
    } else {
      btn.disabled = false;
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
      if (spinner) spinner.classList.add('hidden');
      if (icon) icon.classList.remove('hidden');
      if (text) text.textContent = 'Đăng nhập với Google';
    }
  }

  showAuthError(msg) {
    const errBox = document.getElementById('authErrorMessage');
    if (errBox) {
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    }
  }

  clearAuthError() {
    const errBox = document.getElementById('authErrorMessage');
    if (errBox) {
      errBox.textContent = '';
      errBox.classList.add('hidden');
    }
  }

  showConfigNotice() {
    const notice = document.getElementById('authConfigNotice');
    if (notice) notice.classList.remove('hidden');
  }
}
