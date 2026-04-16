// reminders.js — Reminders module (Fixed delete functions)

let remindersData    = [];
let showingDismissed = false;

// ─── LOAD ────────────────────────────────────────────────

async function loadReminders() {
  showingDismissed = false;
  const isAdmin = authUtils.isAdmin();
  const path = isAdmin ? '/reminders/active' : '/reminders/my/active';
  const data = await api.get(path);
  remindersData = data || [];
  renderRemindersPage(isAdmin);
}

function renderRemindersPage(isAdmin) {
  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Reminders</h2>
        <p class="text-muted" id="rem-count">${remindersData.length} active reminders</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="rem-search" placeholder="Search reminders...">
        </div>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" onclick="window.toggleDismissedView()" id="show-dismissed-btn">
            📋 Show Dismissed
          </button>
          ${isAdmin ? `
            <button class="btn btn-secondary" onclick="window.triggerGenerate()">⚡ Auto Generate</button>
            <button class="btn btn-primary"   onclick="window.openReminderModal()">🔔 Send Reminder</button>
          ` : ''}
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" data-filter="all"     onclick="window.filterReminders(this,'all')">All</div>
      <div class="tab"        data-filter="PAYMENT"  onclick="window.filterReminders(this,'PAYMENT')">Payment Due</div>
      <div class="tab"        data-filter="EXPIRY"   onclick="window.filterReminders(this,'EXPIRY')">Policy Expiry</div>
      <div class="tab"        data-filter="RENEWAL"  onclick="window.filterReminders(this,'RENEWAL')">Renewal</div>
      <div class="tab"        data-filter="GENERAL"  onclick="window.filterReminders(this,'GENERAL')">General</div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Policy</th>
            <th>Type</th>
            <th>Message</th>
            <th>Remind On</th>
            <th>Severity</th>
            <th>Status</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="reminders-tbody">
          ${renderReminderRows(remindersData, isAdmin)}
        </tbody>
      </table>
    </div>
  `;

  window.filterTable('rem-search', 'reminders-tbody');
}

// ─── TOGGLE DISMISSED ─────────────────────────────────────

async function toggleDismissedView() {
  const isAdmin = authUtils.isAdmin();
  const btn = document.getElementById('show-dismissed-btn');
  showingDismissed = !showingDismissed;

  const path = showingDismissed
    ? (isAdmin ? '/reminders/dismissed'    : '/reminders/my/dismissed')
    : (isAdmin ? '/reminders/active'       : '/reminders/my/active');

  const data = await api.get(path);
  remindersData = data || [];

  btn.innerHTML = showingDismissed ? '📋 Show Active' : '📋 Show Dismissed';

  const countEl = document.getElementById('rem-count');
  if (countEl) countEl.textContent = `${remindersData.length} reminders`;

  const tbody = document.getElementById('reminders-tbody');
  if (tbody) tbody.innerHTML = renderReminderRows(getFilteredReminders(), isAdmin);
}

function getFilteredReminders() {
  const activeTab = document.querySelector('.tabs .tab.active');
  const filter = activeTab?.dataset.filter || 'all';
  return filter === 'all' ? remindersData : remindersData.filter(r => r.type === filter);
}

// ─── RENDER ───────────────────────────────────────────────

function renderReminderRows(data, isAdmin) {
  if (!data.length) {
    const msg = showingDismissed ? 'No dismissed reminders' : 'No active reminders';
    return window.emptyState(msg, isAdmin ? 7 : 6);
  }

  return data.map(r => `
    <tr>
      <td><span class="mono" style="color:var(--accent);">${window.escapeHtml(r.policyNumber) || '—'}</span></td>
      <td>${reminderTypeBadge(r.type)}</td>
      <td style="max-width:250px;">${window.escapeHtml(r.message) || '—'}</td>
      <td>${window.fmt.date(r.reminderDate)}</td>
      <td>${severityBadge(r.severity)}</td>
      <td>
        ${r.dismissed
          ? '<span class="badge badge-expired">✓ Dismissed</span>'
          : '<span class="badge badge-active">Active</span>'}
      </td>
      ${isAdmin ? `
        <td>
          <div class="flex gap-8">
            ${!r.dismissed ? `
              <button class="btn btn-ghost btn-sm" style="color:var(--green);"
                onclick="window.dismissReminder('${r.id}')">✓ Dismiss</button>
            ` : `
              <button class="btn btn-ghost btn-sm" style="color:var(--accent);"
                onclick="window.restoreReminder('${r.id}')">↺ Restore</button>
            `}
            <button class="btn btn-danger btn-sm"
              onclick="window.permanentDeleteReminder('${r.id}')">🗑 Delete</button>
          </div>
         </td>` : ''}
    </tr>
  `).join('');
}

function reminderTypeBadge(type) {
  const map = {
    PAYMENT: { label: 'Payment Due',      cls: 'badge-active'  },
    EXPIRY:  { label: 'Policy Expiry',    cls: 'badge-red'     },
    RENEWAL: { label: 'Renewal Reminder', cls: 'badge-purple'  },
    GENERAL: { label: 'General',          cls: 'badge-gray'    },
  };
  const t = map[type] || { label: type || '—', cls: 'badge-gray' };
  return `<span class="badge ${t.cls}">${t.label}</span>`;
}

function severityBadge(severity) {
  const map = { HIGH: 'badge-red', MEDIUM: 'badge-yellow', LOW: 'badge-green' };
  return `<span class="badge ${map[severity] || 'badge-gray'}">${severity || '—'}</span>`;
}

// ─── FILTER ───────────────────────────────────────────────

function filterReminders(tab, type) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  tab.dataset.filter = type;

  const isAdmin = authUtils.isAdmin();
  const tbody = document.getElementById('reminders-tbody');
  if (tbody) tbody.innerHTML = renderReminderRows(getFilteredReminders(), isAdmin);
}

// ─── ACTIONS (FIXED DELETE) ──────────────────────────────────────────────

async function dismissReminder(id) {
  window.showConfirm('Dismiss Reminder', 'Dismiss this reminder? It will move to the dismissed list.', async () => {
    const result = await api.put(`/reminders/${id}/dismiss`, {});
    if (result !== null) {
      window.showToast('Reminder dismissed', 'success');
      showingDismissed ? await toggleDismissedView() : await loadReminders();
    }
  });
}

async function restoreReminder(id) {
  const result = await api.put(`/reminders/${id}/restore`, {});
  if (result !== null) {
    window.showToast('Reminder restored', 'success');
    showingDismissed ? await toggleDismissedView() : await loadReminders();
  }
}

// ✅ FIXED DELETE FUNCTION - Direct fetch with better error handling
async function permanentDeleteReminder(id) {
  console.log('🔴 Delete reminder called for ID:', id);
  
  const confirmed = confirm('Delete reminder permanently? This action cannot be undone.');
  
  if (!confirmed) {
    console.log('User cancelled delete');
    return;
  }
  
  try {
    window.showSpinner();
    console.log('📤 Sending DELETE request for reminder:', id);
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/reminders/${id}/permanent`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast('Reminder permanently deleted', 'success');
      console.log('✅ Reminder deleted, reloading...');
      showingDismissed ? await toggleDismissedView() : await loadReminders();
    } else {
      const errorText = await response.text();
      console.error('❌ Delete failed:', errorText);
      window.showToast(errorText || 'Failed to delete reminder', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    console.error('❌ Delete error:', error);
    window.showToast(error.message || 'Failed to delete reminder', 'error');
  }
}

async function dismissAllByPolicy(policyId) {
  if (!policyId) return;
  window.showConfirm('Dismiss All', 'Dismiss all active reminders for this policy?', async () => {
    const result = await api.put(`/reminders/policy/${policyId}/dismiss-all`, {});
    if (result !== null) {
      window.showToast('All reminders dismissed for this policy', 'success');
      await loadReminders();
    }
  });
}

async function triggerGenerate() {
  const result = await api.post('/reminders/generate', {});
  if (result !== null) {
    window.showToast('Reminders generated successfully!', 'success');
    await loadReminders();
  }
}

// ─── CREATE REMINDER MODAL ────────────────────────────────

function buildReminderModal() {
  if (document.getElementById('reminder-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'reminder-modal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h3>Send Reminder</h3>
        <button class="modal-close" onclick="window.closeModal('reminder-modal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">

          <div class="form-group" id="rem-policy-dropdown-group">
            <label>Policy *</label>
            <select id="rem-policy-id"></select>
          </div>

          <div class="form-group" id="rem-policy-display-group" style="display:none;">
            <label>Policy</label>
            <input type="text" id="rem-policy-display" disabled style="opacity:.6;">
            <input type="hidden" id="rem-policy-id-hidden">
          </div>

          <div class="form-group">
            <label>Reminder Type *</label>
            <select id="rem-type">
              <option value="PAYMENT">Payment Due</option>
              <option value="EXPIRY">Policy Expiry</option>
              <option value="RENEWAL">Renewal Reminder</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
          <div class="form-group">
            <label>Remind On *</label>
            <input type="date" id="rem-date">
          </div>
          <div class="form-group">
            <label>Severity</label>
            <select id="rem-severity">
              <option value="HIGH">🔴 High</option>
              <option value="MEDIUM" selected>🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1;">
            <label>Message *</label>
            <textarea id="rem-message" rows="3" placeholder="Enter reminder message..."></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="window.closeModal('reminder-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="window.submitReminder()">🔔 Send Reminder</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function openReminderModal(policyId, policyNumber) {
  buildReminderModal();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateEl = document.getElementById('rem-date');
  if (dateEl) dateEl.value = tomorrow.toISOString().split('T')[0];

  const msgEl = document.getElementById('rem-message');
  if (msgEl) msgEl.value = '';
  document.getElementById('rem-type').value     = 'PAYMENT';
  document.getElementById('rem-severity').value = 'MEDIUM';

  const dropdownGroup = document.getElementById('rem-policy-dropdown-group');
  const displayGroup  = document.getElementById('rem-policy-display-group');

  if (policyId) {
    if (dropdownGroup) dropdownGroup.style.display = 'none';
    if (displayGroup)  displayGroup.style.display  = '';
    const displayEl = document.getElementById('rem-policy-display');
    const hiddenEl  = document.getElementById('rem-policy-id-hidden');
    if (displayEl) displayEl.value = policyNumber || policyId;
    if (hiddenEl)  hiddenEl.value  = policyId;
  } else {
    if (dropdownGroup) dropdownGroup.style.display = '';
    if (displayGroup)  displayGroup.style.display  = 'none';
    window.loadDropdown('rem-policy-id', '/policies', 'policyNumber');
  }

  window.openModal('reminder-modal');
}

let _isSubmitting = false;

async function submitReminder() {
  if (_isSubmitting) { window.showToast('Please wait...', 'warning'); return; }

  const dropdownGroup = document.getElementById('rem-policy-dropdown-group');
  const usingDropdown = dropdownGroup && dropdownGroup.style.display !== 'none';

  const policyId = usingDropdown
    ? document.getElementById('rem-policy-id')?.value
    : document.getElementById('rem-policy-id-hidden')?.value;

  const type         = document.getElementById('rem-type')?.value;
  const reminderDate = document.getElementById('rem-date')?.value;
  const message      = document.getElementById('rem-message')?.value.trim();
  const severity     = document.getElementById('rem-severity')?.value;

  if (!policyId)     { window.showToast('Please select a policy', 'warning');       return; }
  if (!reminderDate) { window.showToast('Please select a reminder date', 'warning'); return; }
  if (!message)      { window.showToast('Please enter a message', 'warning');        return; }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(reminderDate) < today) {
    window.showToast('Reminder date cannot be in the past', 'warning');
    return;
  }

  _isSubmitting = true;
  try {
    const result = await api.post('/reminders', { policyId, type, reminderDate, message, severity });
    if (result) {
      window.showToast('Reminder created successfully!', 'success');
      window.closeModal('reminder-modal');
      if (typeof loadReminders === 'function') await loadReminders();
    }
  } finally {
    _isSubmitting = false;
  }
}

// ─── GLOBAL EXPORTS ───────────────────────────────────────
window.loadReminders           = loadReminders;
window.filterReminders         = filterReminders;
window.toggleDismissedView     = toggleDismissedView;
window.dismissReminder         = dismissReminder;
window.restoreReminder         = restoreReminder;
window.permanentDeleteReminder = permanentDeleteReminder;
window.dismissAllByPolicy      = dismissAllByPolicy;
window.triggerGenerate         = triggerGenerate;
window.openReminderModal       = openReminderModal;
window.submitReminder          = submitReminder;
window.showDismissedReminders  = toggleDismissedView;

console.log('Reminders module loaded');
console.log('window.permanentDeleteReminder type:', typeof window.permanentDeleteReminder);