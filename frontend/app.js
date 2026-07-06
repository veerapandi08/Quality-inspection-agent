// ============================================================
// Quality Inspection Agent — Frontend Application Logic
// ============================================================

const API = '/api';
let state = {
  token: localStorage.getItem('qia_token') || null,
  user: JSON.parse(localStorage.getItem('qia_user') || 'null'),
  inspections: [],
  categories: [],
  currentInspectionId: null,
  charts: {},
  mobilenetModel: null,
  scannerStream: null,
  scannerRAF: null,
  notifPollTimer: null
};

function authHeaders(extra) {
  const h = Object.assign({}, extra || {});
  if (state.token) h['Authorization'] = 'Bearer ' + state.token;
  return h;
}

async function api(path, options = {}) {
  const opts = Object.assign({}, options);
  opts.headers = authHeaders(opts.headers);
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(API + path, opts);
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-json (file downloads) */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ============================================================
// AUTH: Login / Register / Verify
// ============================================================

document.getElementById('showRegister').addEventListener('click', e => {
  e.preventDefault();
  switchScreen('registerScreen');
});
document.getElementById('showLoginFromRegister').addEventListener('click', e => {
  e.preventDefault();
  switchScreen('loginScreen');
});
document.getElementById('showLoginFromVerify').addEventListener('click', e => {
  e.preventDefault();
  switchScreen('loginScreen');
});

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.classList.add('hidden');
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('qia_token', state.token);
    localStorage.setItem('qia_user', JSON.stringify(state.user));
    await bootApp();
  } catch (err) {
    if (err.data && err.data.needsVerification) {
      pendingVerifyEmail = err.data.email;
      document.getElementById('verifyEmailLabel').textContent = `Enter the code sent to ${err.data.email}`;
      switchScreen('verifyScreen');
      showToast('Please verify your email first', 'error');
    } else {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  }
});

let pendingVerifyEmail = null;

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('registerError');
  errEl.classList.add('hidden');
  const payload = {
    fullName: document.getElementById('regFullName').value.trim(),
    username: document.getElementById('regUsername').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    password: document.getElementById('regPassword').value,
    role: document.getElementById('regRole').value
  };
  try {
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    pendingVerifyEmail = payload.email;
    document.getElementById('verifyEmailLabel').textContent = `Enter the code sent to ${payload.email}`;
    document.getElementById('demoModeNotice').classList.toggle('hidden', !data.demoMode);
    switchScreen('verifyScreen');
    showToast(data.message, 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

document.getElementById('verifyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('verifyError');
  const okEl = document.getElementById('verifySuccess');
  errEl.classList.add('hidden'); okEl.classList.add('hidden');
  const code = document.getElementById('verifyCode').value.trim();
  try {
    const data = await api('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email: pendingVerifyEmail, code }) });
    okEl.textContent = data.message;
    okEl.classList.remove('hidden');
    showToast('Email verified! Please log in.', 'success');
    setTimeout(() => switchScreen('loginScreen'), 1200);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

document.getElementById('resendCode').addEventListener('click', async e => {
  e.preventDefault();
  if (!pendingVerifyEmail) return;
  try {
    const data = await api('/auth/resend-code', { method: 'POST', body: JSON.stringify({ email: pendingVerifyEmail }) });
    showToast(data.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  state.token = null; state.user = null;
  localStorage.removeItem('qia_token'); localStorage.removeItem('qia_user');
  stopScanner();
  clearInterval(state.notifPollTimer);
  switchScreen('loginScreen');
});

// ============================================================
// NAVIGATION
// ============================================================

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.view));
});

const viewTitles = {
  dashboard: 'Dashboard', inspections: 'Inspections', newInspection: 'New Inspection',
  scanner: 'QR / Barcode Scanner', categories: 'Product Categories', reports: 'Reports & Export',
  users: 'User Management', settings: 'Settings'
};

async function navigateTo(view) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.getElementById('viewTitle').textContent = viewTitles[view] || view;
  document.getElementById('sidebar')?.classList.remove('open');
  document.querySelector('.sidebar').classList.remove('open');

  if (view === 'dashboard') await loadDashboard();
  if (view === 'inspections') await loadInspectionsList();
  if (view === 'categories') await loadCategories();
  if (view === 'reports') await loadReports();
  if (view === 'users') await loadUsers();
  if (view === 'settings') updateSettingsView();
  if (view === 'scanner') stopScanner();
}

document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

// ============================================================
// BOOT
// ============================================================

async function bootApp() {
  document.getElementById('userName').textContent = state.user.fullName;
  document.getElementById('userRole').textContent = state.user.role;
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', state.user.role !== 'admin'));
  switchScreen('appScreen');
  await loadCategoriesIntoSelects();
  await navigateTo('dashboard');
  startNotificationPolling();
  loadMobilenetInBackground();
}

(function initialBoot() {
  applyDarkModePreference();
  if (state.token && state.user) {
    bootApp().catch(() => { switchScreen('loginScreen'); });
  } else {
    switchScreen('loginScreen');
  }
})();

// ============================================================
// DARK MODE
// ============================================================

function applyDarkModePreference() {
  const pref = localStorage.getItem('qia_dark') === '1';
  document.body.classList.toggle('dark', pref);
  const sw = document.getElementById('darkModeSwitch');
  if (sw) sw.checked = pref;
  document.getElementById('darkModeToggle').textContent = pref ? '☀️' : '🌙';
}

function toggleDarkMode(force) {
  const next = typeof force === 'boolean' ? force : !document.body.classList.contains('dark');
  document.body.classList.toggle('dark', next);
  localStorage.setItem('qia_dark', next ? '1' : '0');
  document.getElementById('darkModeToggle').textContent = next ? '☀️' : '🌙';
  const sw = document.getElementById('darkModeSwitch');
  if (sw) sw.checked = next;
  if (document.getElementById('view-dashboard').classList.contains('active')) loadDashboard();
}

document.getElementById('darkModeToggle').addEventListener('click', () => toggleDarkMode());
document.getElementById('darkModeSwitch').addEventListener('change', e => toggleDarkMode(e.target.checked));

function updateSettingsView() {
  document.getElementById('settingsUserInfo').textContent = `${state.user.fullName} (${state.user.username}) — ${state.user.role}`;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

function startNotificationPolling() {
  loadNotifications();
  clearInterval(state.notifPollTimer);
  state.notifPollTimer = setInterval(loadNotifications, 20000);
}

async function loadNotifications() {
  try {
    const data = await api('/notifications');
    const unread = data.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notifBadge');
    badge.textContent = unread;
    badge.classList.toggle('hidden', unread === 0);

    const list = document.getElementById('notifList');
    if (data.notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      return;
    }
    list.innerHTML = data.notifications.map(n => `
      <div class="notif-item type-${n.type} ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div>${escapeHtml(n.message)}</div>
        <div class="notif-time">${timeAgo(n.createdAt)}</div>
      </div>
    `).join('');
  } catch (e) { /* silent */ }
}

document.getElementById('notifBtn').addEventListener('click', () => {
  const dd = document.getElementById('notifDropdown');
  dd.classList.toggle('hidden');
});
document.addEventListener('click', e => {
  const wrap = document.querySelector('.notif-wrap');
  if (wrap && !wrap.contains(e.target)) document.getElementById('notifDropdown').classList.add('hidden');
});
document.getElementById('markAllReadBtn').addEventListener('click', async e => {
  e.preventDefault();
  await api('/notifications/read-all', { method: 'PUT' });
  loadNotifications();
});

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ============================================================
// DASHBOARD
// ============================================================

function chartTextColor() {
  return document.body.classList.contains('dark') ? '#EDEDED' : '#1C1F26';
}
function chartGridColor() {
  return document.body.classList.contains('dark') ? '#33373F' : '#D3D1C8';
}

async function loadDashboard() {
  try {
    const [summary, recs, inspData] = await Promise.all([
      api('/reports/summary'),
      api('/reports/recommendations'),
      api('/inspections')
    ]);

    document.getElementById('statTotal').textContent = summary.total;
    document.getElementById('statPassed').textContent = summary.passed;
    document.getElementById('statFailed').textContent = summary.failed;
    document.getElementById('statPending').textContent = summary.pending;
    document.getElementById('statPassRate').textContent = summary.passRate + '%';
    document.getElementById('statDefects').textContent = summary.totalDefects;

    renderTrendChart(summary.trend);
    renderSeverityChart('severityChart', summary.bySeverity);
    renderBarChart('lineChart', summary.byProductLine, '#3D5A73');
    renderBarChart('categoryChart', summary.byCategory, '#F2B705');

    const recsList = document.getElementById('recommendationsList');
    recsList.innerHTML = recs.recommendations.map(r => `
      <div class="rec-item level-${r.level}">${escapeHtml(r.text)}</div>
    `).join('');

    const recent = inspData.inspections.slice(0, 6);
    const recentEl = document.getElementById('recentActivity');
    recentEl.innerHTML = recent.length ? recent.map(i => `
      <div class="recent-item">
        <span>${escapeHtml(i.itemName)} — <span class="muted">${escapeHtml(i.batchNumber)}</span></span>
        <span class="stamp ${i.status}">${i.status}</span>
      </div>
    `).join('') : '<div class="empty-state">No inspections logged yet</div>';
  } catch (e) {
    showToast('Failed to load dashboard: ' + e.message, 'error');
  }
}

function destroyChart(key) {
  if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; }
}

function renderTrendChart(trend) {
  destroyChart('trend');
  const ctx = document.getElementById('trendChart');
  const labels = Object.keys(trend).map(d => d.slice(5));
  const pass = Object.values(trend).map(v => v.pass || 0);
  const fail = Object.values(trend).map(v => v.fail || 0);
  const pending = Object.values(trend).map(v => v.pending || 0);
  state.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Pass', data: pass, borderColor: '#2E7D32', backgroundColor: 'rgba(46,125,50,0.15)', tension: 0.3, fill: true },
        { label: 'Fail', data: fail, borderColor: '#C62828', backgroundColor: 'rgba(198,40,40,0.15)', tension: 0.3, fill: true },
        { label: 'Pending', data: pending, borderColor: '#8A6D00', backgroundColor: 'rgba(138,109,0,0.15)', tension: 0.3, fill: true }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: chartTextColor() } } },
      scales: {
        x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
        y: { ticks: { color: chartTextColor(), stepSize: 1 }, grid: { color: chartGridColor() }, beginAtZero: true }
      }
    }
  });
}

function renderSeverityChart(canvasId, bySeverity) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  state.charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Minor', 'Major', 'Critical'],
      datasets: [{ data: [bySeverity.minor || 0, bySeverity.major || 0, bySeverity.critical || 0],
        backgroundColor: ['#8A6D00', '#B25900', '#C62828'] }]
    },
    options: { plugins: { legend: { labels: { color: chartTextColor() } } } }
  });
}

function renderBarChart(canvasId, dataObj, color) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  const labels = Object.keys(dataObj);
  const values = Object.values(dataObj);
  state.charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels.length ? labels : ['No data'], datasets: [{ label: 'Count', data: values.length ? values : [0], backgroundColor: color }] },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
        y: { ticks: { color: chartTextColor(), stepSize: 1 }, grid: { color: chartGridColor() }, beginAtZero: true }
      }
    }
  });
}

// ============================================================
// CATEGORIES
// ============================================================

async function loadCategoriesIntoSelects() {
  try {
    const data = await api('/categories');
    state.categories = data.categories;
    const niSel = document.getElementById('niCategory');
    const filterSel = document.getElementById('categoryFilter');
    const opts = data.categories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    niSel.innerHTML = '<option value="">— none —</option>' + opts;
    filterSel.innerHTML = '<option value="">All Categories</option>' + opts;
  } catch (e) { /* silent */ }
}

async function loadCategories() {
  await loadCategoriesIntoSelects();
  const grid = document.getElementById('categoriesGrid');
  if (state.categories.length === 0) {
    grid.innerHTML = '<div class="empty-state">No categories yet</div>';
    return;
  }
  grid.innerHTML = state.categories.map(c => `
    <div class="cat-card">
      <h4>${escapeHtml(c.name)}</h4>
      <p>${escapeHtml(c.description || 'No description')}</p>
      ${state.user.role === 'admin' ? `<button class="btn btn-danger btn-sm" data-delcat="${c.id}">Delete</button>` : ''}
    </div>
  `).join('');
  grid.querySelectorAll('[data-delcat]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this category?')) return;
      await api('/categories/' + btn.dataset.delcat, { method: 'DELETE' });
      showToast('Category deleted', 'success');
      loadCategories();
    });
  });
}

document.getElementById('newCategoryForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('catName').value.trim();
  const description = document.getElementById('catDesc').value.trim();
  try {
    await api('/categories', { method: 'POST', body: JSON.stringify({ name, description }) });
    document.getElementById('newCategoryForm').reset();
    showToast('Category added', 'success');
    loadCategories();
  } catch (err) { showToast(err.message, 'error'); }
});

// ============================================================
// NEW INSPECTION
// ============================================================

document.getElementById('newInspectionForm').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    productLine: document.getElementById('niProductLine').value.trim(),
    category: document.getElementById('niCategory').value,
    itemName: document.getElementById('niItemName').value.trim(),
    batchNumber: document.getElementById('niBatchNumber').value.trim(),
    notes: document.getElementById('niNotes').value.trim(),
    status: 'pending'
  };
  try {
    const data = await api('/inspections', { method: 'POST', body: JSON.stringify(payload) });
    document.getElementById('newInspectionForm').reset();
    showToast('Inspection created: ' + data.inspection.id, 'success');
    navigateTo('inspections');
    openInspectionModal(data.inspection.id);
  } catch (err) { showToast(err.message, 'error'); }
});

// ============================================================
// INSPECTIONS LIST
// ============================================================

async function loadInspectionsList() {
  const search = document.getElementById('searchInput').value.trim();
  const status = document.getElementById('statusFilter').value;
  const category = document.getElementById('categoryFilter').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (category) params.set('category', category);

  try {
    const data = await api('/inspections?' + params.toString());
    state.inspections = data.inspections;
    renderInspectionsTable(data.inspections);
  } catch (err) { showToast(err.message, 'error'); }
}

function renderInspectionsTable(list) {
  const wrap = document.getElementById('inspectionsTableWrap');
  if (list.length === 0) {
    wrap.innerHTML = '<div class="empty-state">No inspections found</div>';
    return;
  }
  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>ID</th><th>Item</th><th>Batch</th><th>Line</th><th>Category</th><th>Defects</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
        ${list.map(i => `
          <tr class="clickable" data-id="${i.id}">
            <td class="muted small">${i.id}</td>
            <td><b>${escapeHtml(i.itemName)}</b></td>
            <td>${escapeHtml(i.batchNumber)}</td>
            <td>${escapeHtml(i.productLine)}</td>
            <td>${escapeHtml(i.category || '-')}</td>
            <td>${(i.defects || []).length}</td>
            <td><span class="stamp ${i.status}">${i.status}</span></td>
            <td class="small muted">${new Date(i.createdAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  wrap.querySelectorAll('tr.clickable').forEach(row => {
    row.addEventListener('click', () => openInspectionModal(row.dataset.id));
  });
}

document.getElementById('searchInput').addEventListener('input', debounce(loadInspectionsList, 300));
document.getElementById('statusFilter').addEventListener('change', loadInspectionsList);
document.getElementById('categoryFilter').addEventListener('change', loadInspectionsList);

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ============================================================
// INSPECTION DETAIL MODAL + DEFECT LOGGING + AI ANALYSIS
// ============================================================

let pendingAiResult = null; // { label, confidence, notes }

async function openInspectionModal(id) {
  try {
    const data = await api('/inspections/' + id);
    state.currentInspectionId = id;
    renderInspectionModal(data.inspection);
    document.getElementById('inspectionModal').classList.remove('hidden');
  } catch (err) { showToast(err.message, 'error'); }
}

document.getElementById('closeInspectionModal').addEventListener('click', () => {
  document.getElementById('inspectionModal').classList.add('hidden');
  pendingAiResult = null;
});

function renderInspectionModal(insp) {
  const body = document.getElementById('inspectionModalBody');
  const canDelete = state.user.role === 'admin';
  body.innerHTML = `
    <h3>${escapeHtml(insp.itemName)} <span class="stamp ${insp.status}">${insp.status}</span></h3>
    <div class="detail-grid">
      <div><div class="label">Inspection ID</div>${insp.id}</div>
      <div><div class="label">Batch Number</div>${escapeHtml(insp.batchNumber)}</div>
      <div><div class="label">Product Line</div>${escapeHtml(insp.productLine)}</div>
      <div><div class="label">Category</div>${escapeHtml(insp.category || '-')}</div>
      <div><div class="label">Inspector</div>${escapeHtml(insp.inspectorName)}</div>
      <div><div class="label">Created</div>${new Date(insp.createdAt).toLocaleString()}</div>
    </div>
    ${insp.notes ? `<p><b>Notes:</b> ${escapeHtml(insp.notes)}</p>` : ''}

    <div class="status-actions" style="margin:14px 0;display:flex;gap:8px;">
      <button class="btn btn-secondary btn-sm" data-setstatus="pass">Mark Pass</button>
      <button class="btn btn-secondary btn-sm" data-setstatus="pending">Mark Pending</button>
      ${canDelete ? `<button class="btn btn-danger btn-sm" id="deleteInspectionBtn" style="margin-left:auto;">Delete Inspection</button>` : ''}
    </div>

    <h4 style="font-family:var(--font-display);text-transform:uppercase;font-size:15px;margin:16px 0 8px;">Defects (${(insp.defects || []).length})</h4>
    <div id="defectsList">
      ${(insp.defects || []).length ? insp.defects.map(d => `
        <div class="defect-card">
          ${d.photo ? `<img src="/uploads/${d.photo}" alt="defect photo">` : ''}
          <div style="flex:1;">
            <span class="defect-severity sev-${d.severity}">${d.severity}</span>
            <p style="margin-top:6px;">${escapeHtml(d.description)}</p>
            ${d.aiLabel ? `<span class="ai-tag">🤖 AI: ${escapeHtml(d.aiLabel)} (${d.aiConfidence}%)</span>` : ''}
            <div class="small muted" style="margin-top:4px;">Reported by ${escapeHtml(d.reportedBy)} · ${new Date(d.createdAt).toLocaleString()}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-deldefect="${d.id}">✕</button>
        </div>
      `).join('') : '<p class="muted small">No defects logged.</p>'}
    </div>

    <div class="defect-form-box">
      <h4>Log New Defect</h4>
      <div class="defect-row">
        <label>Description
          <input type="text" id="defectDescription" placeholder="e.g. scratch on casing">
        </label>
        <label>Severity
          <select id="defectSeverity">
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
          </select>
        </label>
      </div>
      <label>Photo Evidence
        <input type="file" id="defectPhoto" accept="image/png,image/jpeg,image/webp">
      </label>

      <div id="aiAnalysisBox" class="ai-box hidden">
        <div class="ai-box-head">🤖 AI Defect Analysis <span id="aiStatus" class="small"></span></div>
        <div id="aiAnalysisContent"></div>
      </div>

      <button type="button" id="submitDefectBtn" class="btn btn-danger" style="margin-top:12px;">Log Defect (marks Fail)</button>
    </div>
  `;

  body.querySelectorAll('[data-setstatus]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/inspections/' + insp.id, { method: 'PUT', body: JSON.stringify({ status: btn.dataset.setstatus }) });
      showToast('Status updated', 'success');
      openInspectionModal(insp.id);
      loadInspectionsList();
    });
  });

  const delBtn = document.getElementById('deleteInspectionBtn');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this inspection permanently?')) return;
    await api('/inspections/' + insp.id, { method: 'DELETE' });
    showToast('Inspection deleted', 'success');
    document.getElementById('inspectionModal').classList.add('hidden');
    loadInspectionsList();
    loadDashboard();
  });

  body.querySelectorAll('[data-deldefect]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this defect?')) return;
      await api(`/inspections/${insp.id}/defects/${btn.dataset.deldefect}`, { method: 'DELETE' });
      showToast('Defect removed', 'success');
      openInspectionModal(insp.id);
      loadInspectionsList();
    });
  });

  const photoInput = document.getElementById('defectPhoto');
  photoInput.addEventListener('change', () => runAiAnalysis(photoInput.files[0]));

  document.getElementById('submitDefectBtn').addEventListener('click', () => submitDefect(insp.id));
}

async function submitDefect(inspectionId) {
  const description = document.getElementById('defectDescription').value.trim();
  const severity = document.getElementById('defectSeverity').value;
  const photoFile = document.getElementById('defectPhoto').files[0];
  if (!description) { showToast('Please enter a defect description', 'error'); return; }

  const formData = new FormData();
  formData.append('description', description);
  formData.append('severity', severity);
  if (photoFile) formData.append('photo', photoFile);
  if (pendingAiResult) {
    formData.append('aiLabel', pendingAiResult.label);
    formData.append('aiConfidence', pendingAiResult.confidence);
  }

  try {
    await api(`/inspections/${inspectionId}/defects`, { method: 'POST', body: formData });
    showToast('Defect logged', 'success');
    pendingAiResult = null;
    openInspectionModal(inspectionId);
    loadInspectionsList();
    loadDashboard();
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// AI DEFECT DETECTION (real TensorFlow.js MobileNet + rule-based
// pixel/edge analysis run in-browser — see README for how this works
// and its limitations vs. a custom-trained defect classifier)
// ============================================================

async function loadMobilenetInBackground() {
  if (state.mobilenetModel || typeof mobilenet === 'undefined') return;
  try {
    state.mobilenetModel = await mobilenet.load({ version: 2, alpha: 0.75 });
    console.log('MobileNet model loaded for AI defect analysis');
  } catch (e) {
    console.warn('Could not load MobileNet model (offline / blocked CDN?)', e);
  }
}

async function runAiAnalysis(file) {
  const box = document.getElementById('aiAnalysisBox');
  const content = document.getElementById('aiAnalysisContent');
  const statusEl = document.getElementById('aiStatus');
  if (!file) { box.classList.add('hidden'); return; }

  box.classList.remove('hidden');
  statusEl.textContent = 'Analyzing…';
  statusEl.className = 'small';
  content.innerHTML = '<p class="muted small">Running MobileNet feature extraction + surface anomaly scan…</p>';

  const imgUrl = URL.createObjectURL(file);
  const img = new Image();
  img.src = imgUrl;
  await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });

  // ---- 1. Rule-based surface anomaly scan (real canvas pixel analysis) ----
  const anomaly = analyzeSurfaceAnomaly(img);

  // ---- 2. Real MobileNet inference (if model loaded) ----
  let predictions = [];
  if (state.mobilenetModel) {
    try {
      predictions = await state.mobilenetModel.classify(img);
    } catch (e) {
      console.warn('MobileNet classify failed', e);
    }
  } else {
    await loadMobilenetInBackground();
    if (state.mobilenetModel) {
      try { predictions = await state.mobilenetModel.classify(img); } catch (e) {}
    }
  }

  // ---- Combine into a defect-likelihood verdict ----
  const confidence = Math.round(anomaly.anomalyScore * 100);
  let verdict = 'Low defect likelihood';
  let statusClass = 'ai-status-ok';
  if (confidence >= 65) { verdict = 'High defect likelihood — review recommended'; statusClass = 'ai-status-bad'; }
  else if (confidence >= 35) { verdict = 'Moderate irregularity detected'; statusClass = 'ai-status-warn'; }

  pendingAiResult = { label: verdict, confidence };

  statusEl.textContent = verdict;
  statusEl.className = 'small ' + statusClass;

  content.innerHTML = `
    <div class="ai-confidence-bar"><div class="ai-confidence-fill" style="width:${confidence}%;background:${confidence>=65?'#C62828':confidence>=35?'#B25900':'#2E7D32'}"></div></div>
    <p class="small" style="margin-top:6px;">Surface anomaly score: <b>${confidence}%</b> (edge density: ${anomaly.edgeDensity}%, contrast variance: ${anomaly.contrastVariance})</p>
    ${predictions.length ? `
      <p class="small" style="margin-top:8px;">MobileNet visual features detected:</p>
      <div>${predictions.map(p => `<span class="ai-tag">${escapeHtml(p.className.split(',')[0])} · ${Math.round(p.probability*100)}%</span>`).join('')}</div>
    ` : '<p class="small muted" style="margin-top:6px;">(MobileNet model still loading — anomaly score above is based on real-time pixel analysis only)</p>'}
    <p class="small muted" style="margin-top:8px;">This is an assistive scan, not a certified defect classifier. Always confirm visually before logging severity.</p>
  `;

  URL.revokeObjectURL(imgUrl);
}

// Real pixel-level analysis: downsamples the image onto a canvas and measures
// edge density (Sobel-like gradient magnitude) and local contrast variance —
// both are genuine signals correlated with surface scratches, cracks, and
// texture irregularities in QC photography.
function analyzeSurfaceAnomaly(img) {
  const canvas = document.createElement('canvas');
  const W = 160, H = 160;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  let edgeSum = 0, edgeCount = 0;
  const values = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const idx = y * W + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + W] - gray[idx - W];
      const mag = Math.sqrt(gx * gx + gy * gy);
      edgeSum += mag;
      edgeCount++;
      values.push(gray[idx]);
    }
  }
  const avgEdge = edgeSum / edgeCount; // 0 - ~360
  const edgeDensity = Math.min(100, Math.round((avgEdge / 60) * 100));

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const contrastVariance = Math.round(stdDev);

  // Combine both signals into a 0-1 anomaly score.
  const edgeComponent = Math.min(1, avgEdge / 45);
  const contrastComponent = Math.min(1, stdDev / 70);
  const anomalyScore = Math.min(1, edgeComponent * 0.6 + contrastComponent * 0.4);

  return { edgeDensity, contrastVariance, anomalyScore };
}

// ============================================================
// QR / BARCODE SCANNER
// ============================================================

document.getElementById('startScanBtn').addEventListener('click', startScanner);
document.getElementById('stopScanBtn').addEventListener('click', stopScanner);

async function startScanner() {
  const video = document.getElementById('scannerVideo');
  const canvas = document.getElementById('scannerCanvas');
  const resultEl = document.getElementById('scanResult');
  resultEl.classList.add('hidden');
  try {
    state.scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = state.scannerStream;
    await video.play();
    document.getElementById('startScanBtn').disabled = true;
    document.getElementById('stopScanBtn').disabled = false;
    scanFrameLoop(video, canvas);
  } catch (e) {
    showToast('Camera access denied or unavailable: ' + e.message, 'error');
  }
}

function scanFrameLoop(video, canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  function tick() {
    if (!state.scannerStream) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        handleScannedCode(code.data);
        return; // stop loop after a hit; user can restart
      }
    }
    state.scannerRAF = requestAnimationFrame(tick);
  }
  tick();
}

function stopScanner() {
  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach(t => t.stop());
    state.scannerStream = null;
  }
  if (state.scannerRAF) cancelAnimationFrame(state.scannerRAF);
  document.getElementById('startScanBtn').disabled = false;
  document.getElementById('stopScanBtn').disabled = true;
}

async function handleScannedCode(code) {
  stopScanner();
  const resultEl = document.getElementById('scanResult');
  resultEl.classList.remove('hidden');
  resultEl.textContent = `Scanned: ${code} — looking up…`;
  try {
    const data = await api('/inspections/lookup/' + encodeURIComponent(code));
    resultEl.textContent = `Found: ${data.inspection.itemName} (${data.inspection.id})`;
    showToast('Inspection found!', 'success');
    navigateTo('inspections');
    openInspectionModal(data.inspection.id);
  } catch (e) {
    resultEl.textContent = `Scanned code "${code}" — no matching inspection found.`;
  }
}

document.getElementById('manualLookupBtn').addEventListener('click', async () => {
  const code = document.getElementById('manualCodeInput').value.trim();
  if (!code) return;
  await handleScannedCode(code);
});

// ============================================================
// REPORTS & EXPORT
// ============================================================

document.getElementById('exportCsvBtn').addEventListener('click', e => { e.preventDefault(); downloadExport('csv'); });
document.getElementById('exportXlsxBtn').addEventListener('click', e => { e.preventDefault(); downloadExport('xlsx'); });
document.getElementById('exportPdfBtn').addEventListener('click', e => { e.preventDefault(); downloadExport('pdf'); });

async function downloadExport(format) {
  try {
    const res = await fetch(`${API}/export/inspections.${format}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-report.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`${format.toUpperCase()} report downloaded`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadReports() {
  try {
    const summary = await api('/reports/summary');
    renderSeverityChart('reportSeverityChart', summary.bySeverity);
    destroyChart('reportStatusChart');
    const ctx = document.getElementById('reportStatusChart');
    state.charts.reportStatusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Pass', 'Fail', 'Pending'],
        datasets: [{ data: [summary.passed, summary.failed, summary.pending], backgroundColor: ['#2E7D32', '#C62828', '#8A6D00'] }]
      },
      options: { plugins: { legend: { labels: { color: chartTextColor() } } } }
    });
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// USER MANAGEMENT (admin)
// ============================================================

async function loadUsers() {
  if (state.user.role !== 'admin') return;
  try {
    const data = await api('/users');
    const wrap = document.getElementById('usersTableWrap');
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Verified</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          ${data.users.map(u => `
            <tr>
              <td>${escapeHtml(u.fullName)}</td>
              <td>${escapeHtml(u.username)}</td>
              <td class="small">${escapeHtml(u.email || '-')}</td>
              <td>
                <select data-roleuser="${u.id}" ${u.id === state.user.id ? 'disabled' : ''}>
                  <option value="inspector" ${u.role === 'inspector' ? 'selected' : ''}>Inspector</option>
                  <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
              </td>
              <td>${u.emailVerified ? '✅' : '⏳'}</td>
              <td class="small muted">${new Date(u.createdAt).toLocaleDateString()}</td>
              <td>${u.id !== state.user.id ? `<button class="btn btn-danger btn-sm" data-deluser="${u.id}">Delete</button>` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    wrap.querySelectorAll('[data-roleuser]').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await api(`/users/${sel.dataset.roleuser}/role`, { method: 'PUT', body: JSON.stringify({ role: sel.value }) });
          showToast('Role updated', 'success');
        } catch (err) { showToast(err.message, 'error'); loadUsers(); }
      });
    });
    wrap.querySelectorAll('[data-deluser]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this user account?')) return;
        try {
          await api('/users/' + btn.dataset.deluser, { method: 'DELETE' });
          showToast('User deleted', 'success');
          loadUsers();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  } catch (err) { showToast(err.message, 'error'); }
}
