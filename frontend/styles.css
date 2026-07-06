:root {
  --ink: #1C1F26;
  --ink-soft: #2B303B;
  --steel: #3D5A73;
  --steel-light: #6E8CA0;
  --safety: #F2B705;
  --safety-dark: #C99400;
  --paper: #ECEBE6;
  --paper-dark: #DAD8D0;
  --white: #FFFFFF;
  --pass: #2E7D32;
  --pass-bg: #E4F2E4;
  --fail: #C62828;
  --fail-bg: #FBE5E5;
  --pending: #8A6D00;
  --pending-bg: #FBF1D2;
  --border: #D3D1C8;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --surface: var(--white);
  --bg: var(--paper);
  --text: var(--ink);
  --text-muted: var(--steel);
  --sidebar-bg: var(--ink);
  --sidebar-text: #C7CCD6;
}

body.dark {
  --surface: #1E2128;
  --bg: #14161B;
  --text: #EDEDED;
  --text-muted: #9AA3AF;
  --border: #33373F;
  --paper-dark: #262A32;
  --sidebar-bg: #0E0F13;
  --sidebar-text: #9AA3AF;
  --pass-bg: #163420;
  --fail-bg: #3A1414;
  --pending-bg: #3A2E0A;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  transition: background 0.2s ease, color 0.2s ease;
}

.hidden { display: none !important; }
.muted { color: var(--text-muted); }
.small { font-size: 12px; }

/* ---------- Hazard stripe ---------- */
.hazard-bar {
  height: 10px; width: 100%;
  background: repeating-linear-gradient(-45deg, var(--safety), var(--safety) 16px, var(--ink) 16px, var(--ink) 32px);
}

/* ---------- Login / Register / Verify ---------- */
.screen { min-height: 100vh; display: flex; flex-direction: column; background: var(--ink); }
.login-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 20px; background: var(--ink); }
.login-card { background: var(--paper); border-radius: 4px; padding: 40px 36px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); color: var(--ink); }
.brand { text-align: center; margin-bottom: 28px; }
.brand-mark { width: 56px; height: 56px; background: var(--safety); color: var(--ink); font-family: var(--font-display); font-weight: 800; font-size: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; border-radius: 4px; letter-spacing: 1px; }
.brand-mark.small { width: 38px; height: 38px; font-size: 16px; margin: 0; }
.brand h1 { font-family: var(--font-display); font-weight: 700; font-size: 30px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ink); }
.brand-sub { color: var(--steel); font-size: 14px; margin-top: 4px; font-weight: 500; }

form label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--steel); margin-bottom: 14px; }
form input, form select, form textarea { display: block; width: 100%; margin-top: 6px; padding: 11px 12px; border: 1.5px solid var(--border); border-radius: 3px; font-family: var(--font-body); font-size: 14px; background: var(--white); color: var(--ink); }
form input:focus, form select:focus, form textarea:focus { outline: none; border-color: var(--safety-dark); box-shadow: 0 0 0 3px rgba(242,183,5,0.25); }

.btn { font-family: var(--font-body); font-weight: 600; font-size: 14px; padding: 11px 20px; border-radius: 3px; border: none; cursor: pointer; transition: transform 0.05s ease, filter 0.15s ease; }
.btn:active { transform: translateY(1px); }
.btn-block { width: 100%; }
.btn-primary { background: var(--safety); color: var(--ink); }
.btn-primary:hover { filter: brightness(0.95); }
.btn-secondary { background: var(--steel); color: var(--white); }
.btn-secondary:hover { filter: brightness(1.1); }
.btn-danger { background: var(--fail); color: var(--white); }
.btn-danger:hover { filter: brightness(1.08); }
.btn-ghost { background: transparent; border: 1.5px solid var(--border); color: var(--text); }
.btn-ghost:hover { background: var(--paper-dark); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 6px 12px; font-size: 12px; }

.form-error { background: var(--fail-bg); color: var(--fail); padding: 10px 12px; border-radius: 3px; font-size: 13px; margin-bottom: 14px; font-weight: 500; }
.form-success { background: var(--pass-bg); color: var(--pass); padding: 10px 12px; border-radius: 3px; font-size: 13px; margin-bottom: 14px; font-weight: 500; }

.switch-link { text-align: center; margin-top: 16px; font-size: 13px; color: var(--steel); }
.switch-link a { color: var(--safety-dark); font-weight: 600; text-decoration: none; }

.demo-box { margin-top: 24px; padding: 14px; background: var(--paper-dark); border-radius: 3px; border: 1px dashed var(--border); }
.demo-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; color: var(--steel); }
.demo-row { display: flex; justify-content: space-between; font-size: 13px; margin-top: 6px; }
.demo-row code { font-family: var(--font-mono); font-size: 12px; background: var(--white); padding: 2px 6px; border-radius: 2px; }

/* ================= APP SHELL ================= */
.app-shell { display: flex; min-height: 100vh; background: var(--bg); }

.sidebar {
  width: 240px; flex-shrink: 0;
  background: var(--sidebar-bg); color: var(--sidebar-text);
  display: flex; flex-direction: column;
  border-right: 4px solid var(--safety);
}
.sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 20px 18px; font-family: var(--font-display); font-weight: 700; font-size: 16px; letter-spacing: 0.4px; color: var(--white); text-transform: uppercase; }
.side-nav { display: flex; flex-direction: column; gap: 2px; padding: 10px; flex: 1; }
.nav-item { display: flex; align-items: center; gap: 12px; background: transparent; border: none; color: var(--sidebar-text); font-family: var(--font-body); font-weight: 600; font-size: 14px; padding: 11px 14px; cursor: pointer; border-radius: 4px; text-align: left; }
.nav-item .ic { font-size: 15px; width: 18px; text-align: center; }
.nav-item:hover { background: rgba(255,255,255,0.06); color: var(--white); }
.nav-item.active { background: var(--safety); color: var(--ink); }
.sidebar-footer { padding: 14px; }

.main-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.topbar { background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 14px 26px; gap: 16px; }
.topbar h2 { font-family: var(--font-display); font-size: 24px; text-transform: uppercase; letter-spacing: 0.4px; flex: 1; }
.topbar-actions { display: flex; align-items: center; gap: 10px; }
.icon-btn { background: transparent; border: 1.5px solid var(--border); color: var(--text); font-size: 16px; width: 38px; height: 38px; border-radius: 6px; cursor: pointer; position: relative; }
.icon-btn:hover { background: var(--paper-dark); }
.user-chip { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; padding: 6px 12px; background: var(--paper-dark); border-radius: 20px; }
.role-pill { font-size: 10px; text-transform: uppercase; background: var(--safety); color: var(--ink); padding: 2px 8px; border-radius: 10px; font-weight: 700; letter-spacing: 0.4px; }

.badge { position: absolute; top: -4px; right: -4px; background: var(--fail); color: white; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 0 3px; }

.notif-wrap { position: relative; }
.notif-dropdown { position: absolute; right: 0; top: 46px; width: 340px; max-height: 420px; overflow-y: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.2); z-index: 50; }
.notif-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); font-weight: 700; font-size: 13px; }
.notif-head a { font-size: 12px; color: var(--steel-light); text-decoration: none; font-weight: 600; }
.notif-list { padding: 6px; }
.notif-item { padding: 10px 12px; border-radius: 6px; margin-bottom: 4px; font-size: 13px; border-left: 3px solid var(--steel); }
.notif-item.unread { background: var(--paper-dark); }
.notif-item.type-danger { border-left-color: var(--fail); }
.notif-item.type-warning { border-left-color: var(--pending); }
.notif-item.type-success { border-left-color: var(--pass); }
.notif-item .notif-title { font-weight: 700; margin-bottom: 2px; }
.notif-item .notif-time { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.notif-empty { padding: 30px; text-align: center; color: var(--text-muted); font-size: 13px; }

.content { padding: 26px; flex: 1; overflow-y: auto; }
.view { display: none; }
.view.active { display: block; }

/* ---------- Stat cards ---------- */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-left: 5px solid var(--steel); border-radius: 6px; padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; }
.stat-card.pass { border-left-color: var(--pass); }
.stat-card.fail { border-left-color: var(--fail); }
.stat-card.pending { border-left-color: var(--pending); }
.stat-value { font-family: var(--font-display); font-size: 32px; font-weight: 700; line-height: 1; }
.stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 600; }

/* ---------- Panels ---------- */
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.panel.narrow { max-width: 560px; }
.panel h3 { font-family: var(--font-display); font-size: 18px; text-transform: uppercase; margin-bottom: 14px; letter-spacing: 0.4px; }

.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar input { flex: 1; min-width: 200px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }
.toolbar select { padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
table.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
table.data-table th { text-align: left; padding: 12px 14px; background: var(--paper-dark); font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-muted); font-weight: 700; }
table.data-table td { padding: 12px 14px; border-top: 1px solid var(--border); }
table.data-table tr.clickable { cursor: pointer; }
table.data-table tr.clickable:hover { background: var(--paper-dark); }
.empty-state { text-align: center; padding: 44px 20px; color: var(--text-muted); font-size: 14px; }

/* ---------- Stamp badge ---------- */
.stamp { font-family: var(--font-display); font-weight: 800; font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; border: 2px solid currentColor; display: inline-block; }
.stamp.pass { color: var(--pass); background: var(--pass-bg); }
.stamp.fail { color: var(--fail); background: var(--fail-bg); }
.stamp.pending { color: var(--pending); background: var(--pending-bg); }

.role-badge { font-size: 10px; text-transform: uppercase; font-weight: 700; padding: 3px 8px; border-radius: 10px; background: var(--paper-dark); }
.role-badge.admin { background: var(--safety); color: var(--ink); }

/* ---------- Modal ---------- */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: var(--surface); color: var(--text); border-radius: 8px; padding: 26px; width: 100%; max-width: 620px; max-height: 88vh; overflow-y: auto; position: relative; }
.modal-close { position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-muted); line-height: 1; }
.modal h3 { font-family: var(--font-display); font-size: 22px; text-transform: uppercase; margin-bottom: 16px; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin-bottom: 16px; font-size: 14px; }
.detail-grid .label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }

.defect-form-box { margin-top: 20px; padding-top: 18px; border-top: 2px dashed var(--border); }
.defect-form-box h4 { font-family: var(--font-display); font-size: 16px; text-transform: uppercase; margin-bottom: 12px; }
.defect-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.defect-card { border: 1px solid var(--border); border-radius: 6px; padding: 12px; margin-bottom: 10px; display: flex; gap: 12px; background: var(--bg); }
.defect-card img { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border); }
.defect-severity { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 2px; }
.sev-minor { background: var(--pending-bg); color: var(--pending); }
.sev-major { background: #FCE4CC; color: #B25900; }
.sev-critical { background: var(--fail-bg); color: var(--fail); }

/* ---------- AI analysis box ---------- */
.ai-box { border: 1.5px dashed var(--steel-light); border-radius: 8px; padding: 14px; margin: 14px 0; background: var(--paper-dark); }
.ai-box-head { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; margin-bottom: 8px; }
.ai-confidence-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-top: 6px; }
.ai-confidence-fill { height: 100%; background: var(--steel); }
.ai-tag { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); margin: 2px 4px 2px 0; }
.ai-status-ok { color: var(--pass); }
.ai-status-warn { color: var(--pending); }
.ai-status-bad { color: var(--fail); }

/* ---------- Categories ---------- */
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.cat-card { border: 1px solid var(--border); border-radius: 8px; padding: 14px; background: var(--bg); }
.cat-card h4 { font-family: var(--font-display); font-size: 17px; text-transform: uppercase; margin-bottom: 4px; }
.cat-card p { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
.inline-form { display: flex; gap: 10px; margin-top: 6px; }
.inline-form input { flex: 1; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }

/* ---------- Recommendations ---------- */
.recs-list { display: flex; flex-direction: column; gap: 10px; }
.rec-item { padding: 12px 14px; border-radius: 6px; border-left: 4px solid var(--steel); background: var(--bg); font-size: 13px; }
.rec-item.level-critical { border-left-color: var(--fail); }
.rec-item.level-warning { border-left-color: var(--pending); }
.rec-item.level-success { border-left-color: var(--pass); }
.rec-item.level-info { border-left-color: var(--steel-light); }

/* ---------- Recent activity ---------- */
.recent-list { display: flex; flex-direction: column; gap: 8px; }
.recent-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 6px; background: var(--bg); font-size: 13px; }

/* ---------- Scanner ---------- */
.scanner-box { position: relative; width: 100%; max-width: 420px; aspect-ratio: 1; background: #000; border-radius: 8px; overflow: hidden; margin: 12px 0; }
.scanner-box video { width: 100%; height: 100%; object-fit: cover; }
.scan-overlay { position: absolute; inset: 15%; border: 3px solid var(--safety); border-radius: 8px; pointer-events: none; }
.scanner-controls { display: flex; gap: 10px; margin-bottom: 10px; }
.scan-result { padding: 12px 14px; border-radius: 6px; background: var(--pass-bg); color: var(--pass); font-weight: 600; margin-top: 10px; }

/* ---------- Export ---------- */
.export-btns { display: flex; gap: 10px; flex-wrap: wrap; }
.export-btns .btn { text-decoration: none; display: inline-flex; align-items: center; }

/* ---------- Settings ---------- */
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border); }
.setting-row:last-child { border-bottom: none; }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: var(--border); transition: 0.2s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: 0.2s; border-radius: 50%; }
.switch input:checked + .slider { background-color: var(--safety); }
.switch input:checked + .slider:before { transform: translateX(20px); }

/* ---------- Toast ---------- */
.toast-container { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 300; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.toast { background: var(--ink); color: var(--white); padding: 12px 22px; border-radius: 6px; font-size: 14px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.3); border-left: 4px solid var(--safety); }
.toast.error { border-left-color: var(--fail); }
.toast.success { border-left-color: var(--pass); }

/* ---------- Responsive ---------- */
.mobile-only { display: none; }
@media (max-width: 900px) {
  .panel-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .sidebar { position: fixed; z-index: 60; height: 100vh; transform: translateX(-100%); transition: transform 0.2s ease; }
  .sidebar.open { transform: translateX(0); }
  .mobile-only { display: inline-flex; }
  .content { padding: 16px; }
}

.admin-only.hidden { display: none !important; }
