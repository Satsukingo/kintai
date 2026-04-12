// ============================================================
// 管理者モジュール
// ============================================================

const Admin = {
  async load() {
    this.initFilters();
    this.showSubTab('admin-attendance');
  },

  initFilters() {
    const { year, month } = App.getCurrentYearMonth();
    ['admin-year', 'admin-report-year', 'admin-comp-year', 'admin-shift-year'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.options.length === 0) {
        for (let y = year - 1; y <= year + 1; y++) {
          const opt = document.createElement('option');
          opt.value = y; opt.textContent = y + '年';
          if (y === year) opt.selected = true;
          el.appendChild(opt);
        }
      }
    });
    ['admin-month', 'admin-report-month', 'admin-comp-month', 'admin-shift-month'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.options.length === 0) {
        for (let m = 1; m <= 12; m++) {
          const opt = document.createElement('option');
          opt.value = m; opt.textContent = m + '月';
          if (m === month) opt.selected = true;
          el.appendChild(opt);
        }
      }
    });
  },

  showSubTab(tabName) {
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.adminTab === tabName);
    });
    document.querySelectorAll('.admin-subtab').forEach(el => {
      el.classList.toggle('d-none', el.id !== tabName);
    });

    switch (tabName) {
      case 'admin-attendance': this.loadAttendance(); break;
      case 'admin-reports': this.loadReports(); break;
      case 'admin-compensation': this.loadCompensation(); break;
      case 'admin-shifts': this.loadShifts(); break;
      case 'admin-users': this.loadUsers(); break;
    }
  },

  // 全員の勤怠確認
  async loadAttendance() {
    const year = document.getElementById('admin-year').value;
    const month = document.getElementById('admin-month').value;
    const userId = document.getElementById('admin-user-filter').value;

    try {
      const params = { year, month };
      if (userId) params.user_id = userId;
      const res = await API.getAttendance(params);
      if (res.status === 'ok') {
        this.renderAdminAttendance(res.data);
      }
    } catch (e) {
      App.showAlert('勤怠データの取得に失敗しました', 'danger');
    }
  },

  renderAdminAttendance(records) {
    const tbody = document.getElementById('admin-attendance-body');
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">データがありません</td></tr>';
      return;
    }

    tbody.innerHTML = records.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : (a.user_name || '').localeCompare(b.user_name || '');
    }).map(r => `
      <tr>
        <td>${r.user_name}</td>
        <td>${r.date}</td>
        <td>${r.clock_in ? r.clock_in.substring(11, 16) : '-'}</td>
        <td>${r.clock_out ? r.clock_out.substring(11, 16) : '-'}</td>
        <td>${r.break_hours ? App.formatHours(r.break_hours) : '-'}</td>
        <td>${App.formatHours(r.working_hours)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="Attendance.editRecord('${r.record_id}', '${r.clock_in}', '${r.clock_out}')">
            修正
          </button>
        </td>
      </tr>
    `).join('');
  },

  // 全員の日報確認
  async loadReports() {
    const year = document.getElementById('admin-report-year').value;
    const month = document.getElementById('admin-report-month').value;

    try {
      const res = await API.getReports({ year, month });
      if (res.status === 'ok') {
        this.renderAdminReports(res.data);
      }
    } catch (e) {
      App.showAlert('日報の取得に失敗しました', 'danger');
    }
  },

  renderAdminReports(reports) {
    const container = document.getElementById('admin-reports-body');
    if (reports.length === 0) {
      container.innerHTML = '<p class="text-muted">データがありません</p>';
      return;
    }

    container.innerHTML = reports.sort((a, b) => b.date.localeCompare(a.date)).map(r => `
      <div class="card mb-2">
        <div class="card-body py-2 px-3">
          <div class="d-flex justify-content-between">
            <strong>${r.date} - ${r.user_name}</strong>
          </div>
          <div class="small mt-1">
            <div><span class="text-muted">業務内容:</span> ${r.work_content || '-'}</div>
            <div><span class="text-muted">進捗:</span> ${r.progress || '-'}</div>
            ${r.notes ? `<div><span class="text-muted">備考:</span> ${r.notes}</div>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  },

  // 月次報酬計算
  async loadCompensation() {
    const year = document.getElementById('admin-comp-year').value;
    const month = document.getElementById('admin-comp-month').value;

    try {
      const res = await API.getMonthlyReport({ year, month });
      if (res.status === 'ok') {
        this.renderCompensation(res.data, year, month);
      }
    } catch (e) {
      App.showAlert('報酬データの取得に失敗しました', 'danger');
    }
  },

  renderCompensation(data, year, month) {
    const tbody = document.getElementById('admin-comp-body');
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">データがありません</td></tr>';
      document.getElementById('comp-total').textContent = '';
      return;
    }

    let grandTotal = 0;
    tbody.innerHTML = data.map(r => {
      grandTotal += r.total_compensation;
      return `
        <tr>
          <td>${r.user_name}</td>
          <td class="text-end">${r.days_worked} 日</td>
          <td class="text-end">${App.formatHours(r.total_hours)}</td>
          <td class="text-end">¥${r.hourly_rate.toLocaleString()}</td>
          <td class="text-end fw-bold">¥${r.total_compensation.toLocaleString()}</td>
        </tr>`;
    }).join('');

    document.getElementById('comp-total').innerHTML =
      `${year}年${month}月 合計報酬: <strong>¥${grandTotal.toLocaleString()}</strong>`;
  },

  // CSV出力
  async downloadCSV() {
    const year = document.getElementById('admin-year').value;
    const month = document.getElementById('admin-month').value;

    try {
      const csv = await API.exportCSV(year, month);
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `勤怠_${year}年${month}月.csv`;
      a.click();
      URL.revokeObjectURL(url);
      App.showAlert('CSVをダウンロードしました', 'success');
    } catch (e) {
      App.showAlert('CSV出力に失敗しました', 'danger');
    }
  },

  // ユーザー管理
  async loadUsers() {
    try {
      const res = await API.getUsers();
      if (res.status === 'ok') {
        this.renderUserList(res.data);
      }
    } catch (e) {
      App.showAlert('ユーザー情報の取得に失敗しました', 'danger');
    }
  },

  renderUserList(users) {
    const tbody = document.getElementById('admin-users-body');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.user_id}</td>
        <td>${u.user_name}</td>
        <td class="text-end">¥${Number(u.hourly_rate).toLocaleString()}</td>
        <td><span class="badge ${u.is_active !== false && u.is_active !== 'FALSE' ? 'bg-success' : 'bg-secondary'}">${u.is_active !== false && u.is_active !== 'FALSE' ? '有効' : '無効'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="Admin.editUser('${u.user_id}', '${u.user_name}', ${u.hourly_rate})">
            編集
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="Admin.deleteUser('${u.user_id}', '${u.user_name}')">
            削除
          </button>
        </td>
      </tr>
    `).join('');
  },

  async addUser() {
    const name = document.getElementById('new-user-name').value.trim();
    const rate = parseInt(document.getElementById('new-user-rate').value);

    if (!name) return App.showAlert('ユーザー名を入力してください', 'warning');
    if (!rate || rate <= 0) return App.showAlert('時給を正しく入力してください', 'warning');

    try {
      const res = await API.addUser(name, rate);
      if (res.status === 'ok') {
        App.showAlert(`${name} を追加しました (ID: ${res.data.user_id})`, 'success');
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-rate').value = '';
        this.loadUsers();
        await App.loadUsers();
      } else {
        App.showAlert(res.message, 'danger');
      }
    } catch (e) {
      App.showAlert('ユーザー追加に失敗しました', 'danger');
    }
  },

  async deleteUser(userId, userName) {
    if (!confirm(userName + ' を削除しますか？')) return;
    try {
      const res = await API.deleteUser(userId);
      if (res.status === 'ok') {
        App.showAlert(userName + ' を削除しました', 'success');
        this.loadUsers();
        await App.loadUsers();
      } else {
        App.showAlert(res.message, 'danger');
      }
    } catch (e) {
      App.showAlert('削除に失敗しました', 'danger');
    }
  },

  editUser(userId, userName, hourlyRate) {
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-name').value = userName;
    document.getElementById('edit-user-rate').value = hourlyRate;
    new bootstrap.Modal(document.getElementById('edit-user-modal')).show();
  },

  async saveUser() {
    const userId = document.getElementById('edit-user-id').value;
    const userName = document.getElementById('edit-user-name').value.trim();
    const hourlyRate = parseInt(document.getElementById('edit-user-rate').value);
    const isActive = document.getElementById('edit-user-active').checked;

    if (!userName) return App.showAlert('ユーザー名を入力してください', 'warning');

    try {
      const res = await API.updateUser(userId, {
        user_name: userName,
        hourly_rate: hourlyRate,
        is_active: isActive
      });
      if (res.status === 'ok') {
        App.showAlert('ユーザー情報を更新しました', 'success');
        bootstrap.Modal.getInstance(document.getElementById('edit-user-modal')).hide();
        this.loadUsers();
        await App.loadUsers();
      } else {
        App.showAlert(res.message, 'danger');
      }
    } catch (e) {
      App.showAlert('更新に失敗しました', 'danger');
    }
  },

  // シフト管理
  async loadShifts() {
    const year = document.getElementById('admin-shift-year').value;
    const month = document.getElementById('admin-shift-month').value;
    const userId = document.getElementById('admin-shift-user').value;

    try {
      const params = { year, month };
      if (userId) params.user_id = userId;
      const res = await API.getShifts(params);
      if (res.status === 'ok') {
        this.renderAdminShifts(res.data);
      }
    } catch (e) {
      App.showAlert('シフトデータの取得に失敗しました', 'danger');
    }
  },

  renderAdminShifts(shifts) {
    const tbody = document.getElementById('admin-shifts-body');
    if (shifts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">データがありません</td></tr>';
      return;
    }

    const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];
    tbody.innerHTML = shifts.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : (a.user_name || '').localeCompare(b.user_name || '');
    }).map(s => {
      const d = new Date(s.date);
      const dayIdx = (d.getDay() + 6) % 7;
      const dayName = DAY_NAMES[dayIdx];
      return `
        <tr>
          <td>${s.user_name}</td>
          <td>${s.date}（${dayName}）</td>
          <td>${s.start_time || '-'}</td>
          <td>${s.end_time || '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger" onclick="Admin.deleteShift('${s.shift_id}')">
              削除
            </button>
          </td>
        </tr>`;
    }).join('');
  },

  async deleteShift(shiftId) {
    if (!confirm('このシフトを削除しますか？')) return;
    try {
      const res = await API.deleteShift(shiftId);
      if (res.status === 'ok') {
        App.showAlert('シフトを削除しました', 'success');
        this.loadShifts();
      } else {
        App.showAlert(res.message, 'danger');
      }
    } catch (e) {
      App.showAlert('シフト削除に失敗しました', 'danger');
    }
  },

  populateAdminUserFilter() {
    ['admin-user-filter', 'admin-shift-user'].forEach(id => {
      const select = document.getElementById(id);
      if (select && select.options.length <= 1) {
        App.users.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.user_id;
          opt.textContent = u.user_name;
          select.appendChild(opt);
        });
      }
    });
  }
};
