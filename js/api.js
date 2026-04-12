// ============================================================
// API通信モジュール（自動環境判定）
// localhost → プロキシ経由 / GitHub Pages → JSONP方式
// ============================================================

var IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// --- JSONP方式（GitHub Pages用） ---
var _jsonpCounter = 0;
function jsonpRequest(action, params) {
  return new Promise(function(resolve, reject) {
    var callbackName = '_jsonpCb_' + (++_jsonpCounter) + '_' + Date.now();
    var url = CONFIG.GAS_URL + '?action=' + encodeURIComponent(action) + '&callback=' + callbackName;
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (params[k] !== undefined && params[k] !== '') {
        url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }
    }

    var script = document.createElement('script');
    function cleanup() {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    script.onerror = function() {
      cleanup();
      reject(new Error('API通信に失敗しました'));
    };

    script.src = url;
    document.body.appendChild(script);

    setTimeout(function() {
      if (window[callbackName]) {
        cleanup();
        reject(new Error('タイムアウト'));
      }
    }, 30000);
  });
}

// --- プロキシ方式（localhost用） ---
function proxyRequest(action, params) {
  var url = '/api?action=' + encodeURIComponent(action);
  var keys = Object.keys(params);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (params[k] !== undefined && params[k] !== '') {
      url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
  }
  return fetch(url).then(function(res) { return res.json(); });
}

// --- 統合API ---
const API = {
  request: function(action, params) {
    params = params || {};
    if (IS_LOCAL) {
      return proxyRequest(action, params);
    }
    return jsonpRequest(action, params);
  },

  // ユーザー
  getUsers: function() { return this.request('getUsers'); },
  addUser: function(userName, hourlyRate) {
    return this.request('addUser', { user_name: userName, hourly_rate: hourlyRate });
  },
  updateUser: function(userId, data) {
    var params = { user_id: userId };
    if (data.user_name !== undefined) params.user_name = data.user_name;
    if (data.hourly_rate !== undefined) params.hourly_rate = data.hourly_rate;
    if (data.is_active !== undefined) params.is_active = data.is_active;
    return this.request('updateUser', params);
  },
  deleteUser: function(userId) {
    return this.request('deleteUser', { user_id: userId });
  },

  // 出退勤・休憩
  clockIn: function(userId) { return this.request('clockIn', { user_id: userId }); },
  clockOut: function(userId) { return this.request('clockOut', { user_id: userId }); },
  breakIn: function(userId) { return this.request('breakIn', { user_id: userId }); },
  breakOut: function(userId) { return this.request('breakOut', { user_id: userId }); },
  getAttendance: function(params) { return this.request('getAttendance', params); },
  updateAttendance: function(data) { return this.request('updateAttendance', data); },

  // 日報
  saveReport: function(data) { return this.request('saveReport', data); },
  getReports: function(params) { return this.request('getReports', params); },

  // シフト
  saveShift: function(data) { return this.request('saveShift', data); },
  getShifts: function(params) { return this.request('getShifts', params); },
  deleteShift: function(shiftId) { return this.request('deleteShift', { shift_id: shiftId }); },

  // 月次レポート
  getMonthlyReport: function(params) { return this.request('getMonthlyReport', params); },

  // CSV
  exportCSV: function(year, month) {
    return this.request('exportCSV', { year: year, month: month }).then(function(res) { return res.data; });
  }
};
