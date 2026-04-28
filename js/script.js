// script.js — Main app entry point: routing, layout, nav

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.api === 'undefined') {
    console.error('API module not loaded! Waiting...');
    setTimeout(() => {
      if (typeof window.api !== 'undefined' && authUtils) init();
    }, 500);
    return;
  }
  init();
});

function init() {
  if (!authUtils.requireAuth()) return;
  renderLayout();
  initNotifications();
  const page = (window.location.hash || '#dashboard').replace('#', '');
  navigate(page, true);
}

// ─── NAVIGATE ─────────────────────────────────────────────

function navigate(page, skipHistory = false) {
  if (!skipHistory) window.location.hash = page;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const titles = {
    dashboard:      'Dashboard',
    policies:       'Policies',
    reminders:      'Reminders',
    companies:      'Companies',
    providers:      'Providers',
    types:          'Insurance Types',
    insuranceItems: 'Insurance Items',
    hypothecations: 'Hypothecations',
    export:         'Export Data',
    recycle:        'Recycle Bin',
    users:          'User Management',
  };
  const titleEl = document.getElementById('navbar-title');
  if (titleEl) titleEl.textContent = titles[page] || 'InsuraTrack';

  document.getElementById('notif-panel')?.classList.add('hidden');

  const loaders = {
    dashboard:      () => { if (typeof loadDashboard      === 'function') loadDashboard();      },
    policies:       () => { if (typeof loadPolicies       === 'function') loadPolicies();       },
    reminders:      () => { if (typeof loadReminders      === 'function') loadReminders();      },
    companies:      () => { if (typeof loadCompanies      === 'function') loadCompanies();      },
    providers:      () => { if (typeof loadProviders      === 'function') loadProviders();      },
    types:          () => { if (typeof loadTypes          === 'function') loadTypes();          },
    insuranceItems: () => { if (typeof initInsuranceItems === 'function') initInsuranceItems(); },
    hypothecations: () => { if (typeof loadHypothecations === 'function') loadHypothecations(); },
    export:         () => { if (typeof loadExport         === 'function') loadExport();         },
    recycle:        () => {
      if (authUtils.isAdmin() && typeof loadRecycleBin === 'function') loadRecycleBin();
      else navigate('dashboard');
    },
    users: () => {
      if (authUtils.isAdmin() && typeof loadUsers === 'function') loadUsers();
      else navigate('dashboard');
    },
  };

  const loader = loaders[page];
  loader ? loader() : (typeof loadDashboard === 'function' && loadDashboard());
  closeMobileSidebar();
}

// ─── REFRESH ──────────────────────────────────────────────

function refreshCurrentPage() {
  const page = (window.location.hash || '#dashboard').replace('#', '');
  const svg = document.querySelector('#refresh-btn svg');
  if (svg) {
    svg.style.transition = 'transform 0.6s ease';
    svg.style.transform  = 'rotate(360deg)';
    setTimeout(() => { svg.style.transition = ''; svg.style.transform = ''; }, 650);
  }
  navigate(page, true);
}
window.refreshCurrentPage = refreshCurrentPage;

// ─── LAYOUT ───────────────────────────────────────────────

function renderLayout() {
  const user    = authUtils.getUser();
  const isAdmin = authUtils.isAdmin();

  let initials = '?';
  if (user?.name) {
    initials = (typeof window.fmt !== 'undefined' && window.fmt.initials)
      ? window.fmt.initials(user.name)
      : user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  document.getElementById('app').innerHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeMobileSidebar()"></div>

    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="sidebar-logo-text">
          <span>InsuraTrack</span>
          <span>Management System</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Main</div>
        <div class="nav-item" data-page="dashboard"  onclick="navigate('dashboard')" >${navIcon('grid')} Dashboard</div>
        <div class="nav-item" data-page="policies"   onclick="navigate('policies')" >${navIcon('file-text')} Policies</div>
        <div class="nav-item" data-page="reminders"  onclick="navigate('reminders')">${navIcon('bell')} Reminders</div>
        <div class="nav-item" data-page="export"     onclick="navigate('export')"   >${navIcon('download')} Export Data</div>

        <div class="nav-section-label" style="margin-top:8px">Management</div>
        <div class="nav-item" data-page="companies" onclick="navigate('companies')">${navIcon('home')} Companies</div>

        ${isAdmin ? `
          <div class="nav-item" data-page="providers"      onclick="navigate('providers')"     >${navIcon('briefcase')}     Providers</div>
          <div class="nav-item" data-page="types"          onclick="navigate('types')"         >${navIcon('tag')}           Insurance Types</div>
          <div class="nav-item" data-page="insuranceItems" onclick="navigate('insuranceItems')">${navIcon('package')}       Insurance Items</div>
          <div class="nav-item" data-page="hypothecations" onclick="navigate('hypothecations')">${navIcon('hypothecation')} Hypothecations</div>
          <div class="nav-section-label" style="margin-top:8px">User Management</div>
          <div class="nav-item" data-page="users"   onclick="navigate('users')"  >${navIcon('users')} Users</div>
          <div class="nav-section-label" style="margin-top:8px">Tools</div>
          <div class="nav-item" data-page="recycle" onclick="navigate('recycle')">${navIcon('trash')} Recycle Bin</div>
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">${escapeHtml(initials)}</div>
          <div class="user-details">
            <div class="user-name">${escapeHtml(user?.name || 'User')}</div>
            <div class="user-role">${isAdmin ? 'Administrator' : 'User'}</div>
          </div>
          <button class="logout-btn" onclick="doLogout()" title="Logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <header class="navbar">
      <button class="hamburger" id="hamburger" onclick="toggleMobileSidebar()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <span class="navbar-title" id="navbar-title">Dashboard</span>
      <div class="navbar-actions">
        <div class="nav-icon-btn" id="refresh-btn" onclick="refreshCurrentPage()" title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </div>

        <!-- ✅ Bell icon with unread count badge -->
        <div class="nav-icon-btn" onclick="toggleNotifPanel()" title="Notifications"
          style="position:relative;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span id="notif-dot" style="
            display:none;
            position:absolute;
            top:4px; right:4px;
            min-width:16px; height:16px;
            background:#ef4444;
            border-radius:50%;
            border:2px solid white;
            font-size:9px;
            font-weight:700;
            color:white;
            align-items:center;
            justify-content:center;
            line-height:1;
          "></span>
        </div>

        <div class="nav-icon-btn" onclick="doLogout()" title="Logout">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
      </div>
    </header>

    <!-- ✅ Notification Panel -->
    <div class="notif-dropdown hidden" id="notif-panel" style="
      position:fixed;
      top:60px; right:16px;
      width:380px;
      max-width:calc(100vw - 32px);
      background:var(--bg-card, white);
      border-radius:14px;
      box-shadow:0 12px 40px rgba(0,0,0,0.15);
      border:1px solid var(--border, #e5e7eb);
      z-index:9999;
      max-height:520px;
      display:flex;
      flex-direction:column;
      overflow:hidden;">

      <!-- Panel Header -->
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:14px 16px;
        border-bottom:1px solid var(--border, #e5e7eb);
        background:var(--bg-surface, #f9fafb);
        border-radius:14px 14px 0 0;
        flex-shrink:0;">
        <span style="font-weight:700;font-size:14px;">🔔 Notifications</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button onclick="markAllNotificationsRead()"
            style="background:none;border:1px solid var(--border,#e5e7eb);border-radius:6px;
              padding:4px 10px;font-size:11px;cursor:pointer;color:var(--accent,#3b82f6);
              font-weight:600;">
            Mark all read
          </button>
          <button onclick="toggleNotifPanel()"
            style="background:none;border:none;cursor:pointer;font-size:18px;
              color:var(--text-muted,#9ca3af);line-height:1;padding:2px 6px;">
            ✕
          </button>
        </div>
      </div>

      <!-- Notification List -->
      <div id="notif-list" style="
        overflow-y:auto;
        flex:1;
        max-height:440px;">
        <div style="padding:32px;text-align:center;color:#9ca3af;font-size:13px;">
          Loading...
        </div>
      </div>
    </div>

    <main class="main-content">
      <div class="page-content" id="dash-content">
        <div class="empty-state" style="margin-top:48px;background:transparent;border:none;">
          <div class="spinner"></div>
        </div>
      </div>
    </main>
  `;
}

// ─── NAV ICONS ────────────────────────────────────────────

function navIcon(name) {
  const icons = {
    grid:          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    'file-text':   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    bell:          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
    home:          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    briefcase:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
    tag:           `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    package:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-4.18A3 3 0 0013 5.18V4a2 2 0 00-2-2H9a2 2 0 00-2 2v1.18A3 3 0 006.18 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><circle cx="12" cy="15" r="3"/><line x1="9" y1="7" x2="15" y2="7"/></svg>`,
    hypothecation: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
    download:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    trash:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
    users:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  };
  return icons[name] || '';
}

// ─── MOBILE SIDEBAR ───────────────────────────────────────

function toggleMobileSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebar-overlay')?.classList.toggle('open');
}
function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}

// ─── NOTIFICATIONS ────────────────────────────────────────

function getNotificationIcon(type) {
  const icons = {
    EXPIRED:         '🔴',
    EXPIRING_TODAY:  '🚨',
    EXPIRING_URGENT: '⚠️',
    EXPIRING_SOON:   '📅',
    REMINDER:        '🔔',
    GENERAL:         '📢',
    SUCCESS:         '✅',
    WARNING:         '⚠️',
    INFO:            'ℹ️',
  };
  return icons[type] || '📌';
}

function getNotificationBg(type) {
  const map = {
    EXPIRED:         'rgba(239,68,68,0.08)',
    EXPIRING_TODAY:  'rgba(239,68,68,0.08)',
    EXPIRING_URGENT: 'rgba(245,158,11,0.08)',
    EXPIRING_SOON:   'rgba(59,130,246,0.08)',
    REMINDER:        'rgba(59,130,246,0.08)',
  };
  return map[type] || 'transparent';
}

async function loadNotifications() {
  const notifList = document.getElementById('notif-list');
  const notifDot  = document.getElementById('notif-dot');

  if (!notifList) return;

  try {
    // ✅ Calls GET /api/v1/notifications/my — returns List<NotificationDTO>
    const notifications = await api.get('v1/notifications/my');

    // ✅ Handle null/empty
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      notifList.innerHTML = `
        <div style="padding:40px 20px;text-align:center;color:#9ca3af;">
          <div style="font-size:36px;margin-bottom:12px;">🔔</div>
          <div style="font-size:13px;">No notifications yet</div>
        </div>`;
      if (notifDot) notifDot.style.display = 'none';
      return;
    }

    // ✅ Update unread badge
    const unreadCount = notifications.filter(n => !n.read).length;
    if (notifDot) {
      if (unreadCount > 0) {
        notifDot.style.display = 'flex';
        notifDot.textContent   = unreadCount > 9 ? '9+' : String(unreadCount);
      } else {
        notifDot.style.display = 'none';
      }
    }

    // ✅ Render each notification
    notifList.innerHTML = notifications.map(n => `
      <div onclick="markNotificationRead('${n.id}')"
        style="
          display:flex;
          align-items:flex-start;
          gap:12px;
          padding:12px 14px;
          border-bottom:1px solid var(--border,#f3f4f6);
          cursor:pointer;
          position:relative;
          background:${n.read ? 'transparent' : getNotificationBg(n.type)};
          transition:background .2s;
        "
        onmouseenter="this.style.background='var(--bg-hover,#f9fafb)'"
        onmouseleave="this.style.background='${n.read ? 'transparent' : getNotificationBg(n.type)}'">

        <!-- Unread dot -->
        ${!n.read ? `<span style="
          position:absolute;left:6px;top:50%;transform:translateY(-50%);
          width:6px;height:6px;border-radius:50%;background:#3b82f6;flex-shrink:0;">
        </span>` : ''}

        <!-- Icon -->
        <div style="
          font-size:20px;
          flex-shrink:0;
          width:36px;height:36px;
          display:flex;align-items:center;justify-content:center;
          background:var(--bg-surface,#f3f4f6);
          border-radius:10px;">
          ${getNotificationIcon(n.type)}
        </div>

        <!-- Content -->
        <div style="flex:1;min-width:0;">
          <div style="
            font-weight:${n.read ? '500' : '700'};
            font-size:13px;
            color:var(--text-primary,#111827);
            margin-bottom:3px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(n.title || '')}
          </div>
          <div style="
            font-size:12px;
            color:var(--text-muted,#6b7280);
            margin-bottom:4px;
            display:-webkit-box;
            -webkit-line-clamp:2;
            -webkit-box-orient:vertical;
            overflow:hidden;">
            ${escapeHtml(n.message || '')}
          </div>
          <div style="font-size:11px;color:#9ca3af;">
            ${window.fmt ? window.fmt.date(n.createdAt) : (n.createdAt || '')}
          </div>
        </div>

        <!-- Delete button -->
        <button onclick="event.stopPropagation(); deleteNotification('${n.id}')"
          title="Delete"
          style="
            background:none;border:none;cursor:pointer;
            padding:4px;border-radius:6px;
            color:#9ca3af;flex-shrink:0;
            opacity:0.6;transition:opacity .2s,background .2s;"
          onmouseenter="this.style.opacity='1';this.style.background='#fee2e2';this.style.color='#dc2626';"
          onmouseleave="this.style.opacity='0.6';this.style.background='none';this.style.color='#9ca3af';">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `).join('');

  } catch (error) {
    console.error('loadNotifications error:', error);
    if (notifList) {
      notifList.innerHTML = `
        <div style="padding:32px;text-align:center;color:#ef4444;font-size:13px;">
          ❌ Failed to load notifications
        </div>`;
    }
  }
}

async function markNotificationRead(id) {
  try {
    await api.patch(`v1/notifications/${id}/read`, {});
    await loadNotifications();
  } catch (e) {
    console.error('markNotificationRead error:', e);
  }
}

async function markAllNotificationsRead() {
  try {
    await api.patch('v1/notifications/read-all', {});
    await loadNotifications();
    window.showToast('All notifications marked as read', 'success');
  } catch (e) {
    window.showToast('Failed to mark all as read', 'error');
  }
}

async function deleteNotification(id) {
  if (!confirm('Delete this notification?')) return;
  try {
    const deletedBy = localStorage.getItem('insura_email') || 'admin';
    await api.del(`v1/notifications/${id}?deletedBy=${deletedBy}`);
    await loadNotifications();
    window.showToast('Notification deleted', 'success');
  } catch (e) {
    window.showToast('Failed to delete notification', 'error');
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  // ✅ Load fresh notifications every time panel opens
  if (isHidden) loadNotifications();
}

function initNotifications() {
  // ✅ Load on startup after 1s delay (layout must be ready)
  setTimeout(loadNotifications, 1000);

  // ✅ Auto-refresh every 60 seconds
  setInterval(loadNotifications, 60_000);

  // ✅ Close panel on outside click
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const bellBtn = e.target.closest('[onclick="toggleNotifPanel()"]');
    if (panel && !panel.classList.contains('hidden')
        && !panel.contains(e.target) && !bellBtn) {
      panel.classList.add('hidden');
    }
  });
}

// ─── LOGOUT ───────────────────────────────────────────────

function doLogout() {
  if (typeof api !== 'undefined') api.post('auth/logout', {}).catch(() => {});
  authUtils.logout();
}

window.escapeHtml = function(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
};

window.addEventListener('hashchange', () => {
  navigate(window.location.hash.replace('#', '') || 'dashboard', true);
});

// ─── GLOBAL EXPORTS ───────────────────────────────────────
window.navigate                 = navigate;
window.doLogout                 = doLogout;
window.toggleMobileSidebar      = toggleMobileSidebar;
window.closeMobileSidebar       = closeMobileSidebar;
window.toggleNotifPanel         = toggleNotifPanel;
window.loadNotifications        = loadNotifications;
window.markNotificationRead     = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.deleteNotification       = deleteNotification;

console.log('Script module loaded ✅');