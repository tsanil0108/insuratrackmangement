// script.js — Main app entry point: routing, layout, nav

document.addEventListener('DOMContentLoaded', () => {
  if (!authUtils.requireAuth()) return;

  renderLayout();
  initNotifications();

  // Route from hash or default to dashboard
  const page = (window.location.hash || '#dashboard').replace('#', '');
  navigate(page, true);
});

// ─── NAVIGATE ────────────────────────────────────────────
function navigate(page, skipHistory = false) {
  if (!skipHistory) window.location.hash = page;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update navbar title
  const titles = {
    dashboard: 'Dashboard',
    policies: 'Policies',
    payments: 'Payments',
    companies: 'Companies',
    providers: 'Providers',
    types: 'Insurance Types',
    export: 'Export Data',
    recycle: 'Recycle Bin',
  };
  const titleEl = document.getElementById('navbar-title');
  if (titleEl) titleEl.textContent = titles[page] || 'InsuraTrack';

  // Load page content
  const loaders = {
    dashboard: loadDashboard,
    policies: loadPolicies,
    payments: loadPayments,
    companies: loadCompanies,
    providers: loadProviders,
    types: loadTypes,
    export: loadExport,
    recycle: () => authUtils.isAdmin() ? loadRecycleBin() : navigate('dashboard'),
  };

  const loader = loaders[page];
  if (loader) loader();
  else loadDashboard();

  // Close mobile sidebar
  closeMobileSidebar();
}

// ─── LAYOUT RENDER ────────────────────────────────────────
function renderLayout() {
  const user = authUtils.getUser();
  const isAdmin = authUtils.isAdmin();
  const initials = fmt.initials(user?.name || '?');

  document.getElementById('app').innerHTML = `
    <!-- Sidebar Overlay (mobile) -->
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeMobileSidebar()"></div>

    <!-- Sidebar -->
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
        <div class="nav-item" data-page="dashboard" onclick="navigate('dashboard')">
          ${navIcon('grid')} Dashboard
        </div>
        <div class="nav-item" data-page="policies" onclick="navigate('policies')">
          ${navIcon('file-text')} Policies
        </div>
        <div class="nav-item" data-page="payments" onclick="navigate('payments')">
          ${navIcon('credit-card')} Payments
        </div>

        ${isAdmin ? `
          <div class="nav-section-label" style="margin-top:8px">Management</div>
          <div class="nav-item" data-page="companies" onclick="navigate('companies')">
            ${navIcon('home')} Companies
          </div>
          <div class="nav-item" data-page="providers" onclick="navigate('providers')">
            ${navIcon('briefcase')} Providers
          </div>
          <div class="nav-item" data-page="types" onclick="navigate('types')">
            ${navIcon('tag')} Insurance Types
          </div>
          <div class="nav-section-label" style="margin-top:8px">Tools</div>
          <div class="nav-item" data-page="export" onclick="navigate('export')">
            ${navIcon('download')} Export Data
          </div>
          <div class="nav-item" data-page="recycle" onclick="navigate('recycle')">
            ${navIcon('trash')} Recycle Bin
          </div>
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">${initials}</div>
          <div class="user-details">
            <div class="user-name">${user?.name || 'User'}</div>
            <div class="user-role">${user?.role || 'USER'}</div>
          </div>
          <button class="logout-btn" onclick="doLogout()" title="Logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Navbar -->
    <header class="navbar">
      <button class="hamburger" id="hamburger" onclick="toggleMobileSidebar()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <span class="navbar-title" id="navbar-title">Dashboard</span>
      <div class="navbar-actions">
        <div class="nav-icon-btn" onclick="toggleNotifPanel()">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span class="notif-dot" id="notif-dot" style="display:none"></span>
        </div>
        <div class="nav-icon-btn" onclick="doLogout()" title="Logout">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
      </div>
    </header>

    <!-- Notification Panel -->
    <div class="notif-dropdown hidden" id="notif-panel">
      <div class="notif-header">
        <span>Notifications</span>
        <button class="btn btn-ghost btn-sm" onclick="toggleNotifPanel()">✕</button>
      </div>
      <div class="notif-list" id="notif-list">
        <div class="notif-empty">Loading...</div>
      </div>
    </div>

    <!-- Main content -->
    <main class="main-content">
      <div class="page-content" id="dash-content">
        <div class="empty-state" style="margin-top:48px">
          <div class="spinner"></div>
        </div>
      </div>
    </main>
  `;
}

// ─── ICONS ────────────────────────────────────────────────
function navIcon(name) {
  const icons = {
    grid: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    'file-text': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    'credit-card': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    briefcase: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
    tag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  };
  return icons[name] || '';
}

// ─── MOBILE SIDEBAR ───────────────────────────────────────
function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}

// ─── NOTIFICATIONS ────────────────────────────────────────
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('hidden');
}

function initNotifications() {
  // Load notifications after layout rendered
  setTimeout(() => loadNotifications(), 500);

  // Close on outside click
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const btn = e.target.closest('.nav-icon-btn');
    if (!panel?.contains(e.target) && !btn) {
      panel?.classList.add('hidden');
    }
  });
}

// ─── LOGOUT ───────────────────────────────────────────────
function doLogout() {
  // Optionally call backend logout
  api.post('/auth/logout', {}).catch(() => {});
  authUtils.logout();
}

// Handle hash changes
window.addEventListener('hashchange', () => {
  const page = window.location.hash.replace('#', '') || 'dashboard';
  navigate(page, true);
});

// Make functions globally available
window.navigate = navigate;
window.doLogout = doLogout;
window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.toggleNotifPanel = toggleNotifPanel;