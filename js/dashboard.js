// dashboard.js — Dashboard stats, charts, reminders, and notifications

// ─── DASHBOARD LOADER ─────────────────────────────────────

async function loadDashboard() {
  const data = await api.get('v1/dashboard');
  if (!data) return;

  const isAdmin = authUtils?.isAdmin() || false;

  document.getElementById('dash-content').innerHTML = `
    <div class="stats-grid">

      ${isAdmin
        ? statCard('Total Users', data.totalUsers ?? 0, 'blue',
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
            `${data.activeUsers ?? 0} active`, 'users')
        : statCard('Total Users', data.totalUsers ?? 0, 'blue',
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
            `${data.activeUsers ?? 0} active`, null)}

      ${isAdmin
        ? statCard('Admin Users', data.adminUsers ?? 0, 'purple',
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
            'with full access', 'users')
        : statCard('Admin Users', data.adminUsers ?? 0, 'purple',
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
            'with full access', null)}

      ${statCard('Companies', data.totalCompanies ?? 0, 'cyan',
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
          'registered', isAdmin ? 'companies' : null)}

      ${statCard('Total Policies', data.totalPolicies ?? 0, 'green',
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
          `${data.activePolicies ?? 0} active`, 'policies')}

      ${statCard('Insurance Types', data.totalInsuranceTypes ?? 0, 'yellow',
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>`,
          'available', 'insurance-types')}

      ${statCard('Insurance Providers', data.totalInsuranceProviders ?? 0, 'red',
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-4.18A3 3 0 0013 5.18V4a2 2 0 00-2-2H9a2 2 0 00-2 2v1.18A3 3 0 006.18 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><circle cx="12" cy="15" r="3"/><path d="M9 7h6"/></svg>`,
          'insurance providers', 'insurance-providers')}

    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Policy Status Distribution</div>
        <canvas id="policy-chart" height="180"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">Policies by Insurance Type</div>
        <canvas id="items-chart" height="180"></canvas>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="section-header">
          <span class="section-title">Recent Reminders</span>
          <span class="text-muted">Today</span>
        </div>
        <div id="reminders-list">
          <div class="empty-state" style="background:transparent;border:none;padding:24px;">
            <p>Loading reminders...</p>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <span class="section-title">Quick Actions</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px" id="quick-actions">
          ${isAdmin ? `
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('policies')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
              Manage Policies
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('insurance-types')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
              Insurance Types
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('companies')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              Manage Companies
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('users')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Manage Users
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('reminders')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              View Reminders
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
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigate('reminders')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              My Reminders
            </button>
          `}
        </div>
      </div>
    </div>
  `;

  drawPolicyChart(data);
  drawItemsChart(data);
  loadRemindersWidget();
}

// ─── STAT CARD ────────────────────────────────────────────

function statCard(label, value, color, icon, sub, navigateTo) {
  const colorMap = {
    blue:   { icon: 'var(--accent-soft)', text: 'var(--accent)' },
    purple: { icon: 'rgba(139,92,246,0.15)', text: '#8b5cf6' },
    cyan:   { icon: 'rgba(6,182,212,0.15)', text: '#06b6d4' },
    green:  { icon: 'rgba(16,185,129,0.15)', text: '#10b981' },
    yellow: { icon: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    red:    { icon: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  };
  const c = colorMap[color] || colorMap.blue;

  const clickAttrs = navigateTo ? `
    onclick="navigate('${navigateTo}')"
    title="Click to open ${navigateTo}"
    style="cursor:pointer;"
    onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.13)';"
    onmouseleave="this.style.transform='';this.style.boxShadow='';"
  ` : '';

  const arrow = navigateTo
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
         style="opacity:.45;margin-left:4px;vertical-align:middle;">
         <line x1="5" y1="12" x2="19" y2="12"/>
         <polyline points="12 5 19 12 12 19"/>
       </svg>`
    : '';

  return `
    <div class="stat-card" ${clickAttrs}>
      <div class="stat-header">
        <span class="stat-label">${label}</span>
        <div class="stat-icon" style="background:${c.icon};color:${c.text}">${icon}</div>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-sub">${sub}${arrow}</div>
    </div>
  `;
}

// ─── CHARTS ───────────────────────────────────────────────

function drawPolicyChart(data) {
  const canvas = document.getElementById('policy-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300, H = 180;
  canvas.width = W; canvas.height = H;

  const items = [
    { label: 'Active',   value: data.activePolicies ?? 0,      color: '#10b981' },
    { label: 'Expiring', value: data.expiringSoonPolicies ?? 0, color: '#8b5cf6' },
    { label: 'Expired',  value: data.expiredPolicies ?? 0,      color: '#94a3b8' },
  ];

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', W / 2, H / 2);
    return;
  }

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
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += sweep;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, ir, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Center total label
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);
  ctx.font = '11px Space Grotesk, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Total', cx, cy + 18);

  // Legend
  const lx = 180, ly = 30;
  items.forEach((item, i) => {
    const y = ly + i * 38;
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, y, 10, 10);
    ctx.fillStyle = '#475569';
    ctx.font = '11px Space Grotesk, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 15, y + 9);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Space Grotesk, sans-serif';
    ctx.fillText(item.value, lx + 15, y + 26);
  });
}

function drawItemsChart(data) {
  const canvas = document.getElementById('items-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300, H = 180;
  canvas.width = W; canvas.height = H;

  const itemsByType = data.policiesByType || [];
  const totalItems = itemsByType.reduce((s, i) => s + (i.count || 0), 0);

  if (totalItems === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No policies by type', W / 2, H / 2);
    return;
  }

  const max    = Math.max(...itemsByType.map(i => i.count || 0), 1);
  const bw     = Math.min(55, (W - 30) / itemsByType.length - 10);
  const gap    = 8;
  const padL   = 10;
  const padB   = 30;
  const chartH = H - padB - 20;
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  itemsByType.forEach((item, i) => {
    const x  = padL + i * (bw + gap);
    const bh = Math.max((item.count / max) * chartH, item.count > 0 ? 4 : 0);
    const y  = H - padB - bh;

    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, bw, bh);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.count, x + bw / 2, y - 6);

    ctx.fillStyle = '#475569';
    ctx.font = '10px Space Grotesk, sans-serif';
    let label = item.type || 'Unknown';
    if (label.length > 12) label = label.slice(0, 10) + '..';
    ctx.fillText(label, x + bw / 2, H - 8);
  });
}

// ─── REMINDERS WIDGET ─────────────────────────────────────

async function loadRemindersWidget() {
  const list = document.getElementById('reminders-list');
  if (!list) return;

  const data = await api.get('v1/reminders/pending');
  if (!data || !data.length) {
    list.innerHTML = `
      <div class="empty-state" style="background:transparent;border:none;padding:24px;">
        <p>No active reminders</p>
      </div>`;
    return;
  }

  list.innerHTML = data.slice(0, 5).map(r => `
    <div class="reminder-item ${(r.severity || 'info').toLowerCase()}">
      <div>
        <div style="font-size:0.825rem;font-weight:500;margin-bottom:3px">
          ${window.escapeHtml(r.message || r.title || 'Reminder')}
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted)">
          ${window.fmt.date(r.reminderDate)} · ${r.type || 'GENERAL'}
        </div>
      </div>
    </div>
  `).join('');
}

// ─── NOTIFICATIONS ────────────────────────────────────────

async function loadNotifications() {
  const notifList = document.getElementById('notif-list');
  if (!notifList) return;

  try {
    const isAdmin       = authUtils?.isAdmin() || false;
    const notifications = await api.get('v1/notifications/my') || [];
    const notifDot      = document.getElementById('notif-dot');
    const unreadCount   = notifications.filter(n => !n.read).length;

    // ── Dot badge ──────────────────────────────────────────
    if (notifDot) {
      notifDot.style.display = unreadCount > 0 ? 'block' : 'none';
      notifDot.textContent   = unreadCount > 9 ? '9+' : (unreadCount || '');
    }

    // ── Empty state ────────────────────────────────────────
    if (!notifications.length) {
      notifList.innerHTML = `
        <div class="notif-empty" style="text-align:center;padding:32px 16px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" style="opacity:0.4;margin-bottom:8px;">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <p style="color:var(--text-muted);margin:0;font-size:0.85rem;">No notifications yet</p>
        </div>
      `;
      return;
    }

    // ── Header ─────────────────────────────────────────────
    notifList.innerHTML = `
      <div style="padding:8px 12px;border-bottom:1px solid var(--border);
        display:flex;justify-content:space-between;align-items:center;
        position:sticky;top:0;background:var(--card);z-index:1;">
        <span style="font-size:0.75rem;font-weight:600;">
          ${isAdmin ? 'All Notifications' : 'My Notifications'}
          ${unreadCount > 0
            ? `<span style="color:#ef4444;">(${unreadCount} unread)</span>`
            : ''}
        </span>
        <div style="display:flex;gap:6px;">
          ${unreadCount > 0 ? `
            <button class="btn btn-ghost btn-sm"
              onclick="markAllNotificationsRead()"
              style="font-size:0.7rem;">Mark all read</button>
          ` : ''}
          <button class="btn btn-ghost btn-sm"
            onclick="clearAllNotifications()"
            style="font-size:0.7rem;color:#ef4444;">Clear All</button>
        </div>
      </div>

      ${notifications.map(notif => `
        <div class="notif-item ${notif.read ? '' : 'unread'}"
          data-id="${notif.id}"
          onclick="markNotificationRead('${notif.id}')"
          style="cursor:pointer;padding:10px 12px;border-bottom:1px solid var(--border);
            display:flex;align-items:flex-start;gap:10px;
            background:${notif.read ? 'transparent' : 'rgba(99,102,241,0.04)'};
            transition:background 0.2s;"
          onmouseenter="this.style.background='var(--hover)'"
          onmouseleave="this.style.background='${notif.read ? 'transparent' : 'rgba(99,102,241,0.04)'}'">

          <div style="background:${getNotifColor(notif.type)};color:white;font-size:13px;
            min-width:32px;height:32px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${getNotifIcon(notif.type)}
          </div>

          <div style="flex:1;min-width:0;">
            <p style="margin:0 0 2px 0;font-size:0.8rem;
              font-weight:${notif.read ? '400' : '600'};
              word-break:break-word;line-height:1.4;">
              ${window.escapeHtml(notif.message)}
            </p>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px;">
              <span style="font-size:0.68rem;color:var(--text-muted);">
                🕐 ${window.fmt.date(notif.createdAt)}
              </span>
              ${isAdmin && notif.userEmail ? `
                <span style="font-size:0.68rem;background:rgba(99,102,241,0.12);
                  color:#6366f1;padding:1px 7px;border-radius:10px;font-weight:500;">
                  👤 ${window.escapeHtml(notif.userName || notif.userEmail)}
                </span>
              ` : ''}
              <span style="font-size:0.68rem;
                background:${getNotifColor(notif.type)}22;
                color:${getNotifColor(notif.type)};
                padding:1px 7px;border-radius:10px;font-weight:500;">
                ${notif.type || 'GENERAL'}
              </span>
              ${!notif.read ? `
                <span style="width:6px;height:6px;background:#6366f1;
                  border-radius:50%;display:inline-block;"></span>
              ` : ''}
            </div>
          </div>

          <button onclick="event.stopPropagation(); deleteNotification('${notif.id}')"
            style="background:none;border:none;cursor:pointer;color:var(--text-muted);
              padding:4px;border-radius:4px;flex-shrink:0;opacity:0.6;"
            onmouseenter="this.style.opacity='1';this.style.color='#ef4444'"
            onmouseleave="this.style.opacity='0.6';this.style.color='var(--text-muted)'"
            title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `).join('')}
    `;

  } catch (error) {
    console.error('Failed to load notifications:', error);
    notifList.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.85rem;">
        Failed to load notifications
      </div>`;
  }
}

// ─── NOTIFICATION HELPERS ─────────────────────────────────

function getNotifColor(type) {
  const colors = {
    GENERAL:    '#6366f1',
    EXPIRY:     '#ef4444',
    EXPIRYSOON: '#f59e0b',
    RENEWAL:    '#10b981',
    REMINDER:   '#3b82f6',
  };
  return colors[type] || '#64748b';
}

function getNotifIcon(type) {
  const icons = {
    GENERAL:    '📢',
    EXPIRY:     '⚠️',
    EXPIRYSOON: '⏰',
    RENEWAL:    '🔄',
    REMINDER:   '🔔',
  };
  return icons[type] || '📌';
}

// ─── NOTIFICATION ACTIONS ─────────────────────────────────

async function markNotificationRead(id) {
  try {
    await api.patch(`v1/notifications/${id}/read`, {});
    await loadNotifications();
  } catch (error) {
    console.error('Failed to mark as read:', error);
  }
}

async function markAllNotificationsRead() {
  try {
    await api.patch('v1/notifications/read-all', {});
    window.showToast('All notifications marked as read', 'success');
    await loadNotifications();
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    window.showToast('Failed to mark all as read', 'error');
  }
}

async function deleteNotification(id) {
  window.showConfirm('Delete Notification', 'Delete this notification?', async () => {
    const deletedBy = encodeURIComponent(localStorage.getItem('insura_email') || 'user');
    const result = await api.del(`v1/notifications/${id}?deletedBy=${deletedBy}`);
    if (result !== null) {
      window.showToast('Notification deleted', 'success');
      await loadNotifications();
    }
  });
}

async function clearAllNotifications() {
  window.showConfirm(
    'Clear All Notifications',
    'Delete all notifications? This cannot be undone.',
    async () => {
      try {
        window.showSpinner?.();
        const notifications = await api.get('v1/notifications/my') || [];
        if (!notifications.length) {
          window.showToast('No notifications to clear', 'info');
          window.hideSpinner?.();
          return;
        }
        const deletedBy = encodeURIComponent(localStorage.getItem('insura_email') || 'user');
        await Promise.all(
          notifications.map(n => api.del(`v1/notifications/${n.id}?deletedBy=${deletedBy}`))
        );
        window.hideSpinner?.();
        window.showToast('All notifications cleared', 'success');
        await loadNotifications();
      } catch (error) {
        window.hideSpinner?.();
        window.showToast('Failed to clear notifications', 'error');
      }
    }
  );
}

// ─── EXPORTS ──────────────────────────────────────────────

window.loadDashboard            = loadDashboard;
window.loadNotifications        = loadNotifications;
window.markNotificationRead     = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.deleteNotification       = deleteNotification;
window.clearAllNotifications    = clearAllNotifications;

console.log('Dashboard module loaded ✅');