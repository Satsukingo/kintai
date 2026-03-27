// ============================================================
// メインアプリケーション
// ============================================================

const App = {
  currentUser: null,
  users: [],
  adminAuthenticated: false,

  async init() {
    this.setupTabs();
    await this.loadUsers();
    this.showTab('clock');
  },

  setupTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showTab(btn.dataset.tab);
      });
    });
  },

  showTab(tabName) {
    // 管理者タブはパスワード認証が必要
    if (tabName === 'admin' && !this.adminAuthenticated) {
      this.promptAdminPassword();
      return;
    }

    // タブボタン切り替え
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    // コンテンツ切り替え
    document.querySelectorAll('.tab-content').forEach(el => {
      el.classList.toggle('d-none', el.id !== 'tab-' + tabName);
    });

    // タブ表示時にデータ読み込み
    switch (tabName) {
      case 'clock': Attendance.loadToday(); break;
      case 'list': Attendance.loadList(); break;
      case 'report': Report.load(); break;
      case 'admin': Admin.load(); break;
    }
  },

  promptAdminPassword() {
    const password = prompt('管理者パスワードを入力してください');
    if (password === null) return; // キャンセル
    if (password === CONFIG.ADMIN_PASSWORD) {
      this.adminAuthenticated = true;
      this.showTab('admin');
    } else {
      this.showAlert('パスワードが正しくありません', 'danger');
    }
  },

  async loadUsers() {
    try {
      const res = await API.getUsers();
      if (res.status === 'ok') {
        this.users = res.data;
        this.populateUserSelectors();
      }
    } catch (e) {
      console.error('API Error:', e);
      this.showAlert('ユーザー情報の取得に失敗しました: ' + e.message, 'danger');
    }
  },

  populateUserSelectors() {
    document.querySelectorAll('.user-select').forEach(select => {
      const current = select.value;
      select.innerHTML = '<option value="">ユーザーを選択</option>';
      this.users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.user_id;
        opt.textContent = u.user_name;
        select.appendChild(opt);
      });
      if (current) select.value = current;
    });
  },

  getSelectedUser(selectId) {
    const select = document.getElementById(selectId);
    if (!select || !select.value) return null;
    return this.users.find(u => u.user_id === select.value);
  },

  // 小数時間を「○時間○分」形式に変換
  formatHours(decimalHours) {
    if (!decimalHours && decimalHours !== 0) return '-';
    var h = Math.floor(decimalHours);
    var m = Math.round((decimalHours - h) * 60);
    if (h === 0) return m + '分';
    if (m === 0) return h + '時間';
    return h + '時間' + m + '分';
  },

  showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
  },

  showLoading(elementId, show = true) {
    const el = document.getElementById(elementId);
    if (el) el.classList.toggle('d-none', !show);
  },

  getCurrentYearMonth() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => App.init());
