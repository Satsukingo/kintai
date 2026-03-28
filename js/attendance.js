// ============================================================
// 出退勤モジュール
// ============================================================

const Attendance = {
  // 出退勤タブ: 本日の状態表示
  async loadToday() {
    const user = App.getSelectedUser('clock-user-select');
    if (!user) {
      document.getElementById('clock-status').innerHTML =
        '<p class="text-muted">ユーザーを選択してください</p>';
      return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    try {
      const res = await API.getAttendance({
        user_id: user.user_id,
        year: year,
        month: month
      });

      if (res.status !== 'ok') return;

      const todayRecord = res.data.find(r => r.date === dateStr);
      this.renderTodayStatus(todayRecord, user);
    } catch (e) {
      App.showAlert('勤怠情報の取得に失敗しました', 'danger');
    }
  },

  renderTodayStatus(record, user) {
    const container = document.getElementById('clock-status');

    if (!record) {
      container.innerHTML = `
        <div class="text-center py-4">
          <p class="fs-5 mb-3"><strong>${user.user_name}</strong> さん</p>
          <p class="text-muted mb-4">本日はまだ出勤していません</p>
          <button class="btn btn-success btn-lg px-5" onclick="Attendance.doClockIn()">
            <i class="bi bi-box-arrow-in-right"></i> 出勤
          </button>
        </div>`;
      return;
    }

    if (!record.clock_out) {
      var isOnBreak = record.break_start && !record.break_end;
      var breakInfo = '';
      if (isOnBreak) {
        breakInfo = `
          <div class="alert alert-warning d-inline-block">
            <i class="bi bi-cup-hot"></i> 休憩中 ― ${record.break_start.substring(11, 16)} から
          </div><br>
          <button class="btn btn-info btn-lg px-4 mt-3 me-2" onclick="Attendance.doBreakOut()">
            <i class="bi bi-arrow-return-left"></i> 休憩戻り
          </button>`;
      } else {
        breakInfo = `
          <div class="alert alert-success d-inline-block">
            <i class="bi bi-clock"></i> 出勤中 ― ${record.clock_in.substring(11, 16)} から勤務中
          </div><br>
          <div class="mt-3">
            <button class="btn btn-warning btn-lg px-4 me-2" onclick="Attendance.doBreakIn()">
              <i class="bi bi-cup-hot"></i> 休憩入り
            </button>
            <button class="btn btn-danger btn-lg px-4" onclick="Attendance.doClockOut()">
              <i class="bi bi-box-arrow-right"></i> 退勤
            </button>
          </div>`;
      }
      if (record.break_hours > 0) {
        breakInfo += `<div class="mt-2"><span class="badge bg-warning text-dark fs-6">休憩: ${App.formatHours(record.break_hours)}</span></div>`;
      }
      container.innerHTML = `
        <div class="text-center py-4">
          <p class="fs-5 mb-3"><strong>${user.user_name}</strong> さん</p>
          ${breakInfo}
        </div>`;
      return;
    }

    var breakBadge = record.break_hours > 0
      ? `<span class="badge bg-warning text-dark fs-6 me-2">休憩: ${App.formatHours(record.break_hours)}</span>`
      : '';

    container.innerHTML = `
      <div class="text-center py-4">
        <p class="fs-5 mb-3"><strong>${user.user_name}</strong> さん</p>
        <div class="alert alert-secondary d-inline-block">
          本日の勤務は完了しています
        </div>
        <div class="mt-3">
          <span class="badge bg-primary fs-6 me-2">出勤: ${record.clock_in.substring(11, 16)}</span>
          <span class="badge bg-danger fs-6 me-2">退勤: ${record.clock_out.substring(11, 16)}</span>
          ${breakBadge}
          <span class="badge bg-info fs-6">稼働: ${App.formatHours(record.working_hours)}</span>
        </div>
      </div>`;
  },

  async doClockIn() {
    const user = App.getSelectedUser('clock-user-select');
    if (!user) return App.showAlert('ユーザーを選択してください', 'warning');

    try {
      const res = await API.clockIn(user.user_id);
      if (res.status === 'ok') {
        App.showAlert('出勤しました', 'success');
        this.loadToday();
      } else {
        App.showAlert(res.message, 'warning');
      }
    } catch (e) {
      App.showAlert('出勤登録に失敗しました', 'danger');
    }
  },

  async doClockOut() {
    const user = App.getSelectedUser('clock-user-select');
    if (!user) return App.showAlert('ユーザーを選択してください', 'warning');

    try {
      const res = await API.clockOut(user.user_id);
      if (res.status === 'ok') {
        App.showAlert(`退勤しました（稼働時間: ${App.formatHours(res.data.working_hours)}）`, 'success');
        this.loadToday();
      } else {
        App.showAlert(res.message, 'warning');
      }
    } catch (e) {
      App.showAlert('退勤登録に失敗しました', 'danger');
    }
  },

  async doBreakIn() {
    const user = App.getSelectedUser('clock-user-select');
    if (!user) return App.showAlert('ユーザーを選択してください', 'warning');

    try {
      const res = await API.breakIn(user.user_id);
      if (res.status === 'ok') {
        App.showAlert('休憩に入りました', 'success');
        this.loadToday();
      } else {
        App.showAlert(res.message, 'warning');
      }
    } catch (e) {
      App.showAlert('休憩登録に失敗しました', 'danger');
    }
  },

  async doBreakOut() {
    const user = App.getSelectedUser('clock-user-select');
    if (!user) return App.showAlert('ユーザーを選択してください', 'warning');

    try {
      const res = await API.breakOut(user.user_id);
      if (res.status === 'ok') {
        App.showAlert(`休憩戻りしました（休憩時間: ${App.formatHours(res.data.break_hours)}）`, 'success');
        this.loadToday();
      } else {
        App.showAlert(res.message, 'warning');
      }
    } catch (e) {
      App.showAlert('休憩戻り登録に失敗しました', 'danger');
    }
  },

  // 勤怠一覧タブ
  async loadList() {
    const user = App.getSelectedUser('list-user-select');
    if (!user) {
      document.getElementById('attendance-table-body').innerHTML =
        '<tr><td colspan="6" class="text-center text-muted">ユーザーを選択してください</td></tr>';
      document.getElementById('list-total').textContent = '';
      return;
    }

    const yearEl = document.getElementById('list-year');
    const monthEl = document.getElementById('list-month');
    const year = yearEl.value;
    const month = monthEl.value;

    try {
      const res = await API.getAttendance({
        user_id: user.user_id,
        year: year,
        month: month
      });

      if (res.status === 'ok') {
        this.renderList(res.data);
      }
    } catch (e) {
      App.showAlert('勤怠一覧の取得に失敗しました', 'danger');
    }
  },

  renderList(records) {
    const tbody = document.getElementById('attendance-table-body');
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">データがありません</td></tr>';
      document.getElementById('list-total').textContent = '';
      return;
    }

    let totalHours = 0;
    tbody.innerHTML = records.map(r => {
      totalHours += Number(r.working_hours) || 0;
      return `
        <tr>
          <td>${r.date}</td>
          <td>${r.clock_in ? r.clock_in.substring(11, 16) : '-'}</td>
          <td>${r.clock_out ? r.clock_out.substring(11, 16) : '-'}</td>
          <td>${r.break_hours ? App.formatHours(r.break_hours) : '-'}</td>
          <td>${App.formatHours(r.working_hours)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="Attendance.editRecord('${r.record_id}', '${r.clock_in}', '${r.clock_out}')">
              編集
            </button>
          </td>
        </tr>`;
    }).join('');

    document.getElementById('list-total').textContent =
      `合計稼働時間: ${App.formatHours(totalHours)}`;
  },

  editRecord(recordId, clockIn, clockOut) {
    const modal = document.getElementById('edit-attendance-modal');
    document.getElementById('edit-record-id').value = recordId;
    document.getElementById('edit-clock-in').value = clockIn ? clockIn.replace(' ', 'T') : '';
    document.getElementById('edit-clock-out').value = clockOut ? clockOut.replace(' ', 'T') : '';
    new bootstrap.Modal(modal).show();
  },

  async saveEdit() {
    const recordId = document.getElementById('edit-record-id').value;
    const clockIn = document.getElementById('edit-clock-in').value.replace('T', ' ');
    const clockOut = document.getElementById('edit-clock-out').value.replace('T', ' ');

    try {
      const res = await API.updateAttendance({
        record_id: recordId,
        clock_in: clockIn,
        clock_out: clockOut
      });
      if (res.status === 'ok') {
        App.showAlert('更新しました', 'success');
        bootstrap.Modal.getInstance(document.getElementById('edit-attendance-modal')).hide();
        this.loadList();
      } else {
        App.showAlert(res.message, 'danger');
      }
    } catch (e) {
      App.showAlert('更新に失敗しました', 'danger');
    }
  },

  initListFilters() {
    const { year, month } = App.getCurrentYearMonth();
    const yearEl = document.getElementById('list-year');
    const monthEl = document.getElementById('list-month');
    for (let y = year - 1; y <= year + 1; y++) {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y + '年';
      if (y === year) opt.selected = true;
      yearEl.appendChild(opt);
    }
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m + '月';
      if (m === month) opt.selected = true;
      monthEl.appendChild(opt);
    }
  }
};
