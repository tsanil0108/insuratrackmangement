// users.js — User Management (Admin Only)
// FIX: all API paths corrected to 'v1/users/...'
// FIX: /stats endpoint now calls real backend endpoint
// FIX: toggle-active uses PATCH /v1/users/{id}/toggle-active

let allUsers = [];

async function loadUsers() {
  if (!authUtils || !authUtils.isAdmin()) {
    navigate('dashboard');
    return;
  }

  const container = document.getElementById('dash-content');
  if (!container) return;

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">User Management</h2>
        <p class="text-muted" id="users-subtitle">Loading...</p>
      </div>
      <button class="btn btn-primary" onclick="showAddUserModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add New User
      </button>
    </div>

    <div class="stats-grid" id="user-stats" style="margin-bottom:24px;">
      <div class="stat-card"><div style="text-align:center;padding:16px;"><div class="spinner" style="margin:0 auto;"></div></div></div>
    </div>

    <div class="table-wrapper">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);">
        <span style="font-weight:600;font-size:14px;">All Users</span>
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="user-search" placeholder="Search users..." oninput="filterUsers()">
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr><td colspan="5" style="text-align:center;padding:32px;"><div class="spinner" style="margin:0 auto;"></div></td></tr>
        </tbody>
      </table>
    </div>
  `;

  // Load stats and users in parallel
  await Promise.all([loadUserStats(), loadAllUsers()]);
}

async function loadUserStats() {
  try {
    // FIX: calls real backend endpoint GET /api/v1/users/stats
    const stats = await api.get('v1/users/stats');
    if (!stats) throw new Error('No stats');

    const statsEl = document.getElementById('user-stats');
    if (!statsEl) return;

    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Total Users</span>
          <div class="stat-icon" style="background:rgba(59,130,246,.15);color:#3b82f6;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">${stats.totalUsers || 0}</div>
        <div class="stat-sub">${stats.activeUsers || 0} active</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Active</span>
          <div class="stat-icon" style="background:rgba(16,185,129,.15);color:#10b981;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">${stats.activeUsers || 0}</div>
        <div class="stat-sub">enabled accounts</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Inactive</span>
          <div class="stat-icon" style="background:rgba(239,68,68,.15);color:#ef4444;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">${stats.inactiveUsers || 0}</div>
        <div class="stat-sub">disabled accounts</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Admins</span>
          <div class="stat-icon" style="background:rgba(139,92,246,.15);color:#8b5cf6;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">${stats.adminCount || 0}</div>
        <div class="stat-sub">${stats.userCount || 0} regular users</div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load user stats:', error);
    const statsEl = document.getElementById('user-stats');
    if (statsEl) statsEl.innerHTML = '<div class="stat-card"><p style="color:var(--text-muted);padding:16px;">Stats unavailable</p></div>';
  }
}

async function loadAllUsers() {
  try {
    const data = await api.get('v1/users');
    allUsers = data || [];
    renderUsersTable(allUsers);
    const sub = document.getElementById('users-subtitle');
    if (sub) sub.textContent = `${allUsers.length} users`;
  } catch (error) {
    console.error('Failed to load users:', error);
    const tbody = document.getElementById('users-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--red);">Failed to load users</td></tr>';
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">No users found</td></tr>`;
    return;
  }

  const currentUser = authUtils ? authUtils.getUser() : null;

  tbody.innerHTML = users.map(user => {
    const initials = (user.name || '?').split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2);
    const isSelf = currentUser && currentUser.email === user.email;

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:50%;background:var(--accent-soft);
              color:var(--accent);display:flex;align-items:center;justify-content:center;
              font-size:12px;font-weight:700;flex-shrink:0;">${window.escapeHtml(initials)}</div>
            <strong>${window.escapeHtml(user.name || '')}</strong>
          </div>
        </td>
        <td>${window.escapeHtml(user.email || '')}</td>
        <td>
          <span class="badge" style="background:${user.role === 'ADMIN' ? 'rgba(139,92,246,.15)' : 'rgba(16,185,129,.15)'};
            color:${user.role === 'ADMIN' ? '#8b5cf6' : '#10b981'};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;">
            ${user.role === 'ADMIN' ? 'Admin' : 'User'}
          </span>
        </td>
        <td>
          <span class="badge ${user.active ? 'badge-active' : 'badge-expired'}"
            style="cursor:pointer;" title="Click to toggle"
            onclick="toggleUserStatus('${user.id}', ${user.active})">
            ${user.active ? '&#9679; Active' : '&#9679; Inactive'}
          </span>
        </td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="editUser('${user.id}')">&#9999; Edit</button>
            ${!isSelf
              ? `<button class="btn btn-danger btn-sm" onclick="deleteUserById('${user.id}', '${window.escapeHtml(user.name || '').replace(/'/g, "\\'")}')">&#128465; Delete</button>`
              : '<span class="text-muted" style="font-size:12px;">You</span>'}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function filterUsers() {
  const term = (document.getElementById('user-search')?.value || '').toLowerCase();
  const filtered = allUsers.filter(u =>
    (u.name || '').toLowerCase().includes(term) ||
    (u.email || '').toLowerCase().includes(term) ||
    (u.role || '').toLowerCase().includes(term)
  );
  renderUsersTable(filtered);
}

async function toggleUserStatus(userId, currentActive) {
  if (!confirm(`${currentActive ? 'Disable' : 'Enable'} this user?`)) return;
  try {
    // FIX: uses PATCH /api/v1/users/{id}/toggle-active
    const result = await api.patch(`v1/users/${userId}/toggle-active`, {});
    if (result !== null) {
      window.showToast(`User ${currentActive ? 'disabled' : 'enabled'} successfully`, 'success');
      await loadAllUsers();
      await loadUserStats();
    }
  } catch (error) {
    window.showToast('Failed to update user status', 'error');
  }
}

function showAddUserModal() {
  if (document.getElementById('user-modal')) {
    document.getElementById('user-modal-title').textContent = 'Add New User';
    document.getElementById('um-id').value = '';
    document.getElementById('um-name').value = '';
    document.getElementById('um-email').value = '';
    document.getElementById('um-password').value = '';
    document.getElementById('um-role').value = 'USER';
    document.getElementById('um-email').disabled = false;
    window.openModal('user-modal');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'user-modal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h3 id="user-modal-title">Add New User</h3>
        <button class="modal-close" onclick="window.closeModal('user-modal')">&times;</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="um-id">
        <div class="form-grid">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="um-name" placeholder="John Doe">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="um-email" placeholder="john@example.com">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="um-password" placeholder="Leave blank to keep current (edit only)" minlength="6">
          </div>
          <div class="form-group">
            <label>Role</label>
            <select id="um-role">
              <option value="USER">Regular User</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="window.closeModal('user-modal')">Cancel</button>
        <button class="btn btn-primary" id="um-save-btn" onclick="saveUser()">Create User</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.openModal('user-modal');
}

async function editUser(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) { window.showToast('User not found', 'error'); return; }

  showAddUserModal();

  setTimeout(() => {
    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('um-id').value      = user.id;
    document.getElementById('um-name').value    = user.name  || '';
    document.getElementById('um-email').value   = user.email || '';
    document.getElementById('um-email').disabled = true; // email cannot change
    document.getElementById('um-password').value = '';
    document.getElementById('um-role').value    = user.role  || 'USER';
    const btn = document.getElementById('um-save-btn');
    if (btn) btn.textContent = 'Update User';
  }, 50);
}

async function saveUser() {
  const id       = document.getElementById('um-id')?.value?.trim();
  const name     = document.getElementById('um-name')?.value.trim();
  const email    = document.getElementById('um-email')?.value.trim();
  const password = document.getElementById('um-password')?.value;
  const role     = document.getElementById('um-role')?.value;

  if (!name)  { window.showToast('Name is required', 'warning'); return; }
  if (!id && !email) { window.showToast('Email is required', 'warning'); return; }
  if (!id && password.length < 6) { window.showToast('Password must be at least 6 characters', 'warning'); return; }

  const btn = document.getElementById('um-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    let result;
    if (id) {
      // Edit: PUT /api/v1/users/{id}
      const body = { name, role };
      if (password && password.length >= 6) body.password = password;
      result = await api.put(`v1/users/${id}`, body);
    } else {
      // Create: POST /api/v1/users
      result = await api.post('v1/users', { name, email, password, role });
    }

    if (result) {
      window.showToast(id ? 'User updated successfully' : 'User created successfully', 'success');
      window.closeModal('user-modal');
      await loadAllUsers();
      await loadUserStats();
    }
  } catch (error) {
    window.showToast(error.message || 'Failed to save user', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = id ? 'Update User' : 'Create User'; }
  }
}

async function deleteUserById(userId, userName) {
  if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
  try {
    const deletedBy = localStorage.getItem('insura_email') || 'admin';
    const result = await api.del(`v1/users/${userId}?deletedBy=${encodeURIComponent(deletedBy)}`);
    if (result !== null) {
      window.showToast('User deleted successfully', 'success');
      await loadAllUsers();
      await loadUserStats();
    }
  } catch (error) {
    window.showToast('Failed to delete user', 'error');
  }
}

window.loadUsers         = loadUsers;
window.filterUsers       = filterUsers;
window.toggleUserStatus  = toggleUserStatus;
window.showAddUserModal  = showAddUserModal;
window.editUser          = editUser;
window.saveUser          = saveUser;
window.deleteUserById    = deleteUserById;

console.log('Users module loaded');