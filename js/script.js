// script.js — Main app entry point: routing, layout, nav
// Depends on: utils.js, api.js, auth.js (load before this)

document.addEventListener('DOMContentLoaded', () => {
  if (!authUtils.requireAuth()) return;

  renderLayout();
  initNotifications();

  const page = (window.location.hash || '#dashboard').replace('#', '');
  navigate(page, true);
});

// ─── NAVIGATE ─────────────────────────────────────────────

function navigate(page, skipHistory = false) {
  if (!skipHistory) window.location.hash = page;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const titles = {
    dashboard:  'Dashboard',
    policies:   'Policies',
    payments:   'Payments',
    reminders:  'Reminders',
    companies:  'Companies',
    providers:  'Providers',
    types:      'Insurance Types',
    export:     'Export Data',
    recycle:    'Recycle Bin',
  };
  const titleEl = document.getElementById('navbar-title');
  if (titleEl) titleEl.textContent = titles[page] || 'InsuraTrack';

  // Close notification panel on navigation
  document.getElementById('notif-panel')?.classList.add('hidden');

  const loaders = {
    dashboard:  () => { if (typeof loadDashboard  === 'function') loadDashboard();  },
    policies:   () => { if (typeof loadPolicies   === 'function') loadPolicies();   },
    payments:   () => { if (typeof loadPayments   === 'function') loadPayments();   },
    reminders:  () => { if (typeof loadReminders  === 'function') loadReminders();  },
    companies:  () => { if (typeof loadCompanies  === 'function') loadCompanies();  },
    providers:  () => { if (typeof loadProviders  === 'function') loadProviders();  },
    types:      () => { if (typeof loadTypes      === 'function') loadTypes();      },
    export:     () => { if (typeof loadExport     === 'function') loadExport();     },
    recycle:    () => {
      if (authUtils.isAdmin() && typeof loadRecycleBin === 'function') {
        loadRecycleBin();
      } else {
        navigate('dashboard');
      }
    },
  };

  const loader = loaders[page];
  loader ? loader() : (typeof loadDashboard === 'function' && loadDashboard());

  closeMobileSidebar();
}

// ─── LAYOUT RENDER ────────────────────────────────────────

function renderLayout() {
  const user    = authUtils.getUser();
  const isAdmin = authUtils.isAdmin();

  let initials = '?';
  if (user?.name) {
    initials = typeof fmt !== 'undefined' && fmt.initials
      ? fmt.initials(user.name)
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
        <div class="nav-item" data-page="payments"   onclick="navigate('payments')" >${navIcon('credit-card')} Payments</div>
        <div class="nav-item" data-page="reminders"  onclick="navigate('reminders')">${navIcon('bell')} Reminders</div>

        ${isAdmin ? `
          <div class="nav-section-label" style="margin-top:8px">Management</div>
          <div class="nav-item" data-page="companies" onclick="navigate('companies')">${navIcon('home')} Companies</div>
          <div class="nav-item" data-page="providers" onclick="navigate('providers')">${navIcon('briefcase')} Providers</div>
          <div class="nav-item" data-page="types"     onclick="navigate('types')"    >${navIcon('tag')} Insurance Types</div>
          <div class="nav-section-label" style="margin-top:8px">Tools</div>
          <div class="nav-item" data-page="export"  onclick="navigate('export')" >${navIcon('download')} Export Data</div>
          <div class="nav-item" data-page="recycle" onclick="navigate('recycle')">${navIcon('trash')} Recycle Bin</div>
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">${window.escapeHtml(initials)}</div>
          <div class="user-details">
            <div class="user-name">${window.escapeHtml(user?.name || 'User')}</div>
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
        <div class="nav-icon-btn" onclick="toggleNotifPanel()" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span class="notif-dot" id="notif-dot" style="display:none"></span>
        </div>
        <div class="nav-icon-btn" onclick="doLogout()" title="Logout">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
      </div>
    </header>

    <div class="notif-dropdown hidden" id="notif-panel">
      <div class="notif-header">
        <span>Notifications</span>
        <button class="btn btn-ghost btn-sm" onclick="toggleNotifPanel()">✕</button>
      </div>
      <div class="notif-list" id="notif-list">
        <div class="notif-empty">Loading...</div>
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
    grid:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    'file-text': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    'credit-card':`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    bell:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
    home:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    briefcase:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
    tag:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    download:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    trash:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
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

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if (isHidden && typeof loadNotifications === 'function') loadNotifications();
}

function initNotifications() {
  setTimeout(() => {
    if (typeof loadNotifications === 'function') loadNotifications();
  }, 800);

  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const btn   = e.target.closest('.nav-icon-btn');
    if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && !btn) {
      panel.classList.add('hidden');
    }
  });
}

// ─── LOGOUT ───────────────────────────────────────────────

function doLogout() {
  api.post('/auth/logout', {}).catch(() => {});
  authUtils.logout();
}

window.addEventListener('hashchange', () => {
  navigate(window.location.hash.replace('#', '') || 'dashboard', true);
});

// ─── GLOBAL EXPORTS ───────────────────────────────────────
window.navigate             = navigate;
window.doLogout             = doLogout;
window.toggleMobileSidebar  = toggleMobileSidebar;
window.closeMobileSidebar   = closeMobileSidebar;
window.toggleNotifPanel     = toggleNotifPanel;