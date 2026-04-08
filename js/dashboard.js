// dashboard.js — Dashboard stats and charts

async function loadDashboard() {
  const data = await api.get('/dashboard');
  if (!data) return;

  // Stats cards
  document.getElementById('dash-content').innerHTML = `
    <div class="stats-grid">
      ${statCard('Total Users', data.totalUsers ?? 0, 'blue',
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
        `${data.activeUsers ?? 0} active`)}
      ${statCard('Admin Users', data.adminUsers ?? 0, 'purple',
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        'with full access')}
      ${statCard('Companies', data.totalCompanies ?? 0, 'cyan',
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        'registered')}
      ${statCard('Total Policies', data.totalPolicies ?? 0, 'green',
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        `${data.activePolicies ?? 0} active`)}
      ${statCard('Total Payments', data.totalPayments ?? 0, 'yellow',
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
        `${data.pendingPayments ?? 0} pending`)}
      ${statCard('Overdue', data.overduePayments ?? 0, 'red',
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        'require attention')}
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Policy Status Distribution</div>
        <canvas id="policy-chart" height="180"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">Payment Overview</div>
        <canvas id="payment-chart" height="180"></canvas>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="section-header">
          <span class="section-title">Recent Reminders</span>
          <span class="text-muted">Today</span>
        </div>
        <div id="reminders-list">
          <div class="empty-state"><p>Loading reminders...</p></div>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <span class="section-title">Quick Actions</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px" id="quick-actions">
          ${authUtils.isAdmin() ? `
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('policies')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
              Manage Policies
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('payments')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/></svg>
              View Payments
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('companies')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              Manage Companies
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('export')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Data
            </button>
          ` : `
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('policies')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
              My Policies
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('payments')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/></svg>
              My Payments
            </button>
          `}
        </div>
      </div>
    </div>
  `;

  // Charts
  drawPolicyChart(data);
  drawPaymentChart(data);

  // Load reminders
  loadRemindersWidget();
}

function statCard(label, value, color, icon, sub) {
  const colorMap = {
    blue: { icon: 'var(--accent-soft)', text: 'var(--accent)' },
    purple: { icon: 'var(--purple-soft)', text: 'var(--purple)' },
    cyan: { icon: 'var(--cyan-soft)', text: 'var(--cyan)' },
    green: { icon: 'var(--green-soft)', text: 'var(--green)' },
    yellow: { icon: 'var(--yellow-soft)', text: 'var(--yellow)' },
    red: { icon: 'var(--red-soft)', text: 'var(--red)' },
  };
  const c = colorMap[color] || colorMap.blue;
  return `
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">${label}</span>
        <div class="stat-icon" style="background:${c.icon};color:${c.text}">${icon}</div>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-sub">${sub}</div>
    </div>
  `;
}

function drawPolicyChart(data) {
  const canvas = document.getElementById('policy-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300, H = 180;
  canvas.width = W; canvas.height = H;

  const items = [
    { label: 'Active', value: data.activePolicies ?? 0, color: '#34d399' },
    { label: 'Expiring', value: data.expiringSoonPolicies ?? 0, color: '#a78bfa' },
    { label: 'Expired', value: (data.totalPolicies ?? 0) - (data.activePolicies ?? 0) - (data.expiringSoonPolicies ?? 0), color: '#4a5568' },
  ];

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) { ctx.fillStyle = '#4a5568'; ctx.font = '14px Space Grotesk'; ctx.fillText('No data', W/2 - 30, H/2); return; }

  const cx = 90, cy = H / 2, r = 65, ir = 40;
  let angle = -Math.PI / 2;

  items.forEach(item => {
    if (!item.value) return;
    const sweep = (item.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = '#0a0d14';
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += sweep;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, ir, 0, 2 * Math.PI);
  ctx.fillStyle = 'var(--bg-card, #1a2035)';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#e8edf5';
  ctx.font = 'bold 18px Space Grotesk';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);
  ctx.font = '11px Space Grotesk';
  ctx.fillStyle = '#8896b0';
  ctx.fillText('Total', cx, cy + 18);

  // Legend
  const lx = 180, ly = 40;
  items.forEach((item, i) => {
    const y = ly + i * 36;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(lx, y, 10, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#8896b0';
    ctx.font = '11px Space Grotesk';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 15, y + 9);
    ctx.fillStyle = '#e8edf5';
    ctx.font = 'bold 16px Space Grotesk';
    ctx.fillText(item.value, lx + 15, y + 26);
  });
}

function drawPaymentChart(data) {
  const canvas = document.getElementById('payment-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300, H = 180;
  canvas.width = W; canvas.height = H;

  const items = [
    { label: 'Paid', value: data.paidPayments ?? 0, color: '#34d399' },
    { label: 'Pending', value: data.pendingPayments ?? 0, color: '#fbbf24' },
    { label: 'Overdue', value: data.overduePayments ?? 0, color: '#f87171' },
  ];

  const max = Math.max(...items.map(i => i.value), 1);
  const bw = 40, gap = 30, padL = 40, padB = 30, chartH = H - padB - 20;

  ctx.fillStyle = '#4a5568';
  ctx.font = '11px Space Grotesk';

  items.forEach((item, i) => {
    const x = padL + i * (bw + gap);
    const bh = (item.value / max) * chartH;
    const y = H - padB - bh;

    // Bar
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, [4, 4, 0, 0]);
    ctx.fill();

    // Value
    ctx.fillStyle = '#e8edf5';
    ctx.font = 'bold 13px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.fillText(item.value, x + bw / 2, y - 6);

    // Label
    ctx.fillStyle = '#8896b0';
    ctx.font = '11px Space Grotesk';
    ctx.fillText(item.label, x + bw / 2, H - 8);
  });
}

async function loadRemindersWidget() {
  const list = document.getElementById('reminders-list');
  if (!list) return;

  const data = await api.get('/reminders');
  if (!data || !data.length) {
    list.innerHTML = '<div class="empty-state"><p>No active reminders</p></div>';
    return;
  }

  list.innerHTML = data.slice(0, 5).map(r => `
    <div class="reminder-item ${(r.severity || '').toLowerCase()}">
      <div>
        <div style="font-size:0.825rem;font-weight:500;margin-bottom:3px">${r.message}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${fmt.date(r.reminderDate)} · ${r.type}</div>
      </div>
    </div>
  `).join('');
}

async function loadNotifications() {
  const data = await api.get('/reminders');
  const dot = document.getElementById('notif-dot');
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (!data || !data.length) {
    if (dot) dot.style.display = 'none';
    list.innerHTML = '<div class="notif-empty">All caught up! 🎉</div>';
    return;
  }

  if (dot) dot.style.display = 'block';
  list.innerHTML = data.slice(0, 10).map(r => {
    const colors = { HIGH: ['var(--red-soft)','var(--red)'], MEDIUM: ['var(--yellow-soft)','var(--yellow)'], LOW: ['var(--green-soft)','var(--green)'] };
    const [bg, fg] = colors[r.severity] || colors.LOW;
    return `
      <div class="notif-item">
        <div class="notif-icon" style="background:${bg};color:${fg}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <div class="notif-text">
          <p>${r.message}</p>
          <div class="time">${fmt.date(r.reminderDate)}</div>
        </div>
      </div>
    `;
  }).join('');
}