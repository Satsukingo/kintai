// ============================================================
// シフトモジュール
// ============================================================

const Shift = {
  DAY_NAMES: ['月', '火', '水', '木', '金', '土', '日'],

  async load() {
    const user = App.getSelectedUser('shift-user-select');
    if (!user) {
      document.getElementById('shift-week-form').innerHTML = '';
      document.getElementById('shift-save-btn').style.display = 'none';
      document.getElementById('shift-monthly-view').innerHTML =
        '<p class="text-muted">ユーザーを選択してください</p>';
      document.getElementById('shift-monthly-summary').innerHTML = '';
      return;
    }
    this.initMonthFilters();
    this.setDefaultWeekStart();
    this.loadWeek();
    this.loadMonthly();
  },

  initMonthFilters() {
    const { year, month } = App.getCurrentYearMonth();
    const yearEl = document.getElementById('shift-month-year');
    const monthEl = document.getElementById('shift-month-month');
    if (yearEl.options.length === 0) {
      for (let y = year - 1; y <= year + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y + '年';
        if (y === year) opt.selected = true;
        yearEl.appendChild(opt);
      }
    }
    if (monthEl.options.length === 0) {
      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m + '月';
        if (m === month) opt.selected = true;
        monthEl.appendChild(opt);
      }
    }
  },

  setDefaultWeekStart() {
    const dateEl = document.getElementById('shift-week-start');
    if (!dateEl.value) {
      const today = new Date();
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      dateEl.value = this.formatDate(monday);
    }
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  getWeekDates(startStr) {
    const start = new Date(startStr);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(this.formatDate(d));
    }
    return dates;
  },

  async loadWeek() {
    const user = App.getSelectedUser('shift-user-select');
    const startStr = document.getElementById('shift-week-start').value;
    if (!user || !startStr) return;

    const dates = this.getWeekDates(startStr);
    const startDate = new Date(startStr);

    // 対象週を含む月のシフトを取得
    const months = new Set();
    dates.forEach(d => {
      const [y, m] = d.split('-');
      months.add(`${y}-${m}`);
    });

    let existingShifts = [];
    for (const ym of months) {
      const [y, m] = ym.split('-');
      try {
        const res = await API.getShifts({ user_id: user.user_id, year: parseInt(y), month: parseInt(m) });
        if (res.status === 'ok') existingShifts = existingShifts.concat(res.data);
      } catch (e) { /* ignore */ }
    }

    const shiftMap = {};
    existingShifts.forEach(s => { shiftMap[s.date] = s; });

    const container = document.getElementById('shift-week-form');
    container.innerHTML = dates.map((date, i) => {
      const existing = shiftMap[date] || {};
      const dayOfWeek = this.DAY_NAMES[i];
      const isWeekend = i >= 5;
      const bgClass = isWeekend ? 'bg-light' : '';
      const textClass = i === 5 ? 'text-primary' : (i === 6 ? 'text-danger' : '');
      return `
        <div class="row g-2 align-items-center mb-2 p-2 rounded ${bgClass}">
          <div class="col-3">
            <span class="fw-bold ${textClass}">${date.substring(5)}（${dayOfWeek}）</span>
          </div>
          <div class="col-3">
            <input type="time" class="form-control form-control-sm" id="shift-start-${i}" value="${existing.start_time || ''}">
          </div>
          <div class="col-1 text-center">〜</div>
          <div class="col-3">
            <input type="time" class="form-control form-control-sm" id="shift-end-${i}" value="${existing.end_time || ''}">
          </div>
          <div class="col-2">
            <button class="btn btn-sm btn-outline-secondary w-100" onclick="Shift.clearDay(${i})">消</button>
          </div>
        </div>`;
    }).join('');

    document.getElementById('shift-save-btn').style.display = 'block';
  },

  clearDay(index) {
    document.getElementById('shift-start-' + index).value = '';
    document.getElementById('shift-end-' + index).value = '';
  },

  async saveWeek() {
    const user = App.getSelectedUser('shift-user-select');
    if (!user) return App.showAlert('ユーザーを選択してください', 'warning');

    const startStr = document.getElementById('shift-week-start').value;
    if (!startStr) return App.showAlert('週の開始日を選択してください', 'warning');

    const dates = this.getWeekDates(startStr);
    let saved = 0;

    for (let i = 0; i < 7; i++) {
      const startTime = document.getElementById('shift-start-' + i).value;
      const endTime = document.getElementById('shift-end-' + i).value;

      if (startTime || endTime) {
        if (!startTime || !endTime) {
          App.showAlert(`${dates[i]}（${this.DAY_NAMES[i]}）の開始・終了を両方入力してください`, 'warning');
          return;
        }
        try {
          await API.saveShift({
            user_id: user.user_id,
            date: dates[i],
            start_time: startTime,
            end_time: endTime
          });
          saved++;
        } catch (e) {
          App.showAlert('シフト保存に失敗しました', 'danger');
          return;
        }
      }
    }

    if (saved > 0) {
      App.showAlert(`${saved}日分のシフトを保存しました`, 'success');
      this.loadMonthly();
    } else {
      App.showAlert('保存するシフトがありません', 'warning');
    }
  },

  async loadMonthly() {
    const user = App.getSelectedUser('shift-user-select');
    if (!user) return;

    const year = parseInt(document.getElementById('shift-month-year').value);
    const month = parseInt(document.getElementById('shift-month-month').value);

    try {
      const res = await API.getShifts({ user_id: user.user_id, year: year, month: month });
      if (res.status === 'ok') {
        this.renderMonthly(res.data, year, month);
      }
    } catch (e) {
      App.showAlert('シフトの取得に失敗しました', 'danger');
    }
  },

  renderMonthly(shifts, year, month) {
    const container = document.getElementById('shift-monthly-view');
    const summaryEl = document.getElementById('shift-monthly-summary');

    if (shifts.length === 0) {
      container.innerHTML = '<p class="text-muted">今月のシフトはまだありません</p>';
      summaryEl.innerHTML = '';
      return;
    }

    // 日ごとに表示
    let totalHours = 0;
    const sorted = shifts.sort((a, b) => a.date.localeCompare(b.date));

    container.innerHTML = `
      <div class="card">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>曜日</th>
                  <th>開始</th>
                  <th>終了</th>
                  <th class="text-end">時間</th>
                </tr>
              </thead>
              <tbody>
                ${sorted.map(s => {
                  const d = new Date(s.date);
                  const dayIdx = (d.getDay() + 6) % 7;
                  const dayName = this.DAY_NAMES[dayIdx];
                  const isWeekend = dayIdx >= 5;
                  const textClass = dayIdx === 5 ? 'text-primary' : (dayIdx === 6 ? 'text-danger' : '');
                  let hours = 0;
                  if (s.start_time && s.end_time) {
                    const [sh, sm] = s.start_time.split(':').map(Number);
                    const [eh, em] = s.end_time.split(':').map(Number);
                    hours = (eh + em / 60) - (sh + sm / 60);
                    if (hours < 0) hours += 24;
                    totalHours += hours;
                  }
                  return `
                    <tr class="${isWeekend ? 'table-light' : ''}">
                      <td>${s.date.substring(5)}</td>
                      <td class="${textClass} fw-bold">${dayName}</td>
                      <td>${s.start_time || '-'}</td>
                      <td>${s.end_time || '-'}</td>
                      <td class="text-end">${App.formatHours(Math.round(hours * 100) / 100)}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    summaryEl.innerHTML = `
      <div class="comp-total">
        ${year}年${month}月: シフト <strong>${shifts.length}日</strong> / 合計 <strong>${App.formatHours(Math.round(totalHours * 100) / 100)}</strong>
      </div>`;
  }
};
