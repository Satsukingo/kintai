// ============================================================
// 日報モジュール
// ============================================================

const Report = {
  async load() {
    const user = App.getSelectedUser('report-user-select');
    if (!user) {
      document.getElementById('report-list').innerHTML =
        '<p class="text-muted">ユーザーを選択してください</p>';
      return;
    }
    this.setDefaultDate();
    this.loadReportList();
    this.loadExistingReport();
  },

  setDefaultDate() {
    const dateEl = document.getElementById('report-date');
    if (!dateEl.value) {
      const today = new Date();
      dateEl.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
  },

  async loadExistingReport() {
    const user = App.getSelectedUser('report-user-select');
    const dateStr = document.getElementById('report-date').value;
    if (!user || !dateStr) return;

    const [year, month] = dateStr.split('-');
    try {
      const res = await API.getReports({
        user_id: user.user_id,
        year: parseInt(year),
        month: parseInt(month)
      });
      if (res.status === 'ok') {
        const existing = res.data.find(r => r.date === dateStr);
        if (existing) {
          document.getElementById('report-work-content').value = existing.work_content || '';
          document.getElementById('report-progress').value = existing.progress || '';
          document.getElementById('report-notes').value = existing.notes || '';
        } else {
          document.getElementById('report-work-content').value = '';
          document.getElementById('report-progress').value = '';
          document.getElementById('report-notes').value = '';
        }
      }
    } catch (e) {
      // ignore
    }
  },

  async save() {
    const user = App.getSelectedUser('report-user-select');
    if (!user) return App.showAlert('ユーザーを選択してください', 'warning');

    const date = document.getElementById('report-date').value;
    const workContent = document.getElementById('report-work-content').value;
    const progress = document.getElementById('report-progress').value;
    const notes = document.getElementById('report-notes').value;

    if (!date) return App.showAlert('日付を選択してください', 'warning');
    if (!workContent) return App.showAlert('業務内容を入力してください', 'warning');

    try {
      const res = await API.saveReport({
        user_id: user.user_id,
        date: date,
        work_content: workContent,
        progress: progress,
        notes: notes
      });
      if (res.status === 'ok') {
        App.showAlert(res.message, 'success');
        this.loadReportList();
      } else {
        App.showAlert(res.message, 'danger');
      }
    } catch (e) {
      App.showAlert('日報の保存に失敗しました', 'danger');
    }
  },

  async loadReportList() {
    const user = App.getSelectedUser('report-user-select');
    if (!user) return;

    const { year, month } = App.getCurrentYearMonth();
    try {
      const res = await API.getReports({
        user_id: user.user_id,
        year: year,
        month: month
      });
      if (res.status === 'ok') {
        this.renderReportList(res.data);
      }
    } catch (e) {
      // ignore
    }
  },

  renderReportList(reports) {
    const container = document.getElementById('report-list');
    if (reports.length === 0) {
      container.innerHTML = '<p class="text-muted">今月の日報はまだありません</p>';
      return;
    }

    container.innerHTML = reports.sort((a, b) => b.date.localeCompare(a.date)).map(r => `
      <div class="card mb-2">
        <div class="card-body py-2 px-3">
          <div class="d-flex justify-content-between align-items-center">
            <strong>${r.date}</strong>
            <button class="btn btn-sm btn-outline-secondary" onclick="Report.fillReport('${r.date}', '${encodeURIComponent(r.work_content || '')}', '${encodeURIComponent(r.progress || '')}', '${encodeURIComponent(r.notes || '')}')">
              編集
            </button>
          </div>
          <div class="small mt-1">
            <div><span class="text-muted">業務:</span> ${r.work_content || '-'}</div>
            <div><span class="text-muted">進捗:</span> ${r.progress || '-'}</div>
            ${r.notes ? `<div><span class="text-muted">備考:</span> ${r.notes}</div>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  },

  fillReport(date, workContent, progress, notes) {
    document.getElementById('report-date').value = date;
    document.getElementById('report-work-content').value = decodeURIComponent(workContent);
    document.getElementById('report-progress').value = decodeURIComponent(progress);
    document.getElementById('report-notes').value = decodeURIComponent(notes);
  }
};
