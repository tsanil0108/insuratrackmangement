// reminders.js — Reminders module (Auto-generated reminders)
// Reminders are automatically generated when policies are added/edited

let remindersData = [];

// ─── HELPER: Extract policy number from message ───────────

function extractPolicyNumberFromMessage(message, reminder) {
  if (!message) return '—';
  
  // Try to extract policy number from message
  // Pattern matches: "1234567" or "POL-123456" or any number sequence at the end
  const patterns = [
    /:\s*([A-Z0-9\-]+)$/i,           // Matches: "something: 1234567"
    /policy\s*:\s*([A-Z0-9\-]+)/i,   // Matches: "policy: 1234567"
    /policy\s+([A-Z0-9\-]+)/i,       // Matches: "policy 1234567"
    /([A-Z0-9]{6,20})$/              // Matches: "1234567" at end
  ];
  
  for (let pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // If still not found, try to find any 6-20 character alphanumeric string
  const anyNumberMatch = message.match(/\b([A-Z0-9]{6,20})\b/);
  if (anyNumberMatch) {
    return anyNumberMatch[1];
  }
  
  return '—';
}

// ─── LOAD ────────────────────────────────────────────────

async function loadReminders() {
  const isAdmin = authUtils?.isAdmin() || false;
  // Use 'v1/reminders' paths - only show active reminders
  const path = isAdmin ? 'v1/reminders/active' : 'v1/reminders/my/active';
  const data = await api.get(path);
  
  console.log('Reminders loaded:', data);
  
  remindersData = data || [];
  
  // Extract policy numbers from messages
  for (let reminder of remindersData) {
    if (!reminder.policyNumber && reminder.message) {
      reminder.policyNumber = extractPolicyNumberFromMessage(reminder.message, reminder);
    }
  }
  
  renderRemindersPage(isAdmin);
}

function renderRemindersPage(isAdmin) {
  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Reminders</h2>
        <p class="text-muted" id="rem-count">${remindersData.length} active reminders</p>
        <p class="text-muted" style="font-size:12px; margin-top:4px;">
          💰 Payment reminders: 15, 7, 3 days before due | 
          ⚠️ Expiry reminders: 30, 15, 7, 3 days before
        </p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="rem-search" placeholder="Search reminders...">
        </div>
        ${isAdmin ? `
          <div class="flex gap-8">
            <button class="btn btn-secondary" onclick="window.triggerGenerate()">⚡ Regenerate All</button>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" data-filter="all"     onclick="window.filterReminders(this,'all')">All</div>
      <div class="tab"        data-filter="PAYMENT"  onclick="window.filterReminders(this,'PAYMENT')">💰 Payment Due</div>
      <div class="tab"        data-filter="EXPIRY"   onclick="window.filterReminders(this,'EXPIRY')">⚠️ Policy Expiry</div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Policy Number</th>
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
    
    </div>
  `;

  setTimeout(() => {
    const searchInput = document.getElementById('rem-search');
    if (searchInput) {
      searchInput.addEventListener('keyup', () => {
        filterRemindersTable();
      });
    }
  }, 100);
}

function filterRemindersTable() {
  const searchTerm = document.getElementById('rem-search')?.value.toLowerCase() || '';
  const rows = document.querySelectorAll('#reminders-tbody tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function getFilteredReminders() {
  const activeTab = document.querySelector('.tabs .tab.active');
  const filter = activeTab?.dataset.filter || 'all';
  return filter === 'all' ? remindersData : remindersData.filter(r => r.type === filter);
}

// ─── RENDER ───────────────────────────────────────────────

function renderReminderRows(data, isAdmin) {
  if (!data || !data.length) {
    const msg = 'No active reminders';
    const extraMsg = !isAdmin ? '<p style="font-size:12px; margin-top:8px;">Reminders are auto-generated when policies are added.</p>' : '';
    return `</tr><td colspan="${isAdmin ? 7 : 6}" style="text-align:center; padding:40px;">${msg}${extraMsg}</td></tr>`;
  }

  return data.map(r => {
    // Get policy number
    let policyNumber = r.policyNumber;
    if (!policyNumber || policyNumber === '—') {
      policyNumber = extractPolicyNumberFromMessage(r.message, r);
    }
    
    // Clean message to remove duplicate policy number display
    let message = r.message || '—';
    // Remove the policy number from the end of message if it appears
    if (policyNumber !== '—' && message.includes(policyNumber)) {
      // Remove trailing ": 1234567" or " 1234567"
      message = message.replace(new RegExp(`:\\s*${policyNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
      message = message.replace(new RegExp(`\\s+${policyNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
      message = message.trim();
    }
    
    // Format reminder date
    let reminderDate = '—';
    if (r.reminderDate) {
      try {
        reminderDate = window.fmt.date(r.reminderDate);
      } catch(e) {
        reminderDate = r.reminderDate;
      }
    }
    
    return `
      <tr>
        <td>
          ${r.policyId ? `
            <span class="mono" style="color:var(--accent); cursor:pointer;" onclick="window._goToPolicy('${r.policyId}')">
              ${window.escapeHtml(policyNumber)}
            </span>
          ` : `
            <span class="mono">${window.escapeHtml(policyNumber)}</span>
          `}
        </td>
        <td>${reminderTypeBadge(r.type)}</td>
        <td style="max-width:300px;">${window.escapeHtml(message)}</td>
        <td>${reminderDate}</td>
        <td>${severityBadge(r.severity)}</td>
        <td>
          ${!r.dismissed
            ? '<span class="badge badge-active">● Active</span>'
            : '<span class="badge badge-expired">✓ Dismissed</span>'}
        </td>
      ${isAdmin ? `
        <td>
          <div class="flex gap-8">
            <button class="btn btn-danger btn-sm"
              onclick="window.permanentDeleteReminder('${r.id}')">🗑 Delete</button>
          </div>
        </td>
      ` : ''}
    </tr>
    `;
  }).join('');
}

function reminderTypeBadge(type) {
  const map = {
    PAYMENT: { label: '💰 Payment Due',      cls: 'badge-active'  },
    EXPIRY:  { label: '⚠️ Policy Expiry',    cls: 'badge-red'     },
  };
  const t = map[type] || { label: type || '—', cls: 'badge-gray' };
  return `<span class="badge ${t.cls}">${t.label}</span>`;
}

function severityBadge(severity) {
  const map = { 
    HIGH: 'badge-red', 
    MEDIUM: 'badge-yellow', 
    LOW: 'badge-green' 
  };
  const labels = { HIGH: '🔴 High', MEDIUM: '🟡 Medium', LOW: '🟢 Low' };
  return `<span class="badge ${map[severity] || 'badge-gray'}">${labels[severity] || severity || '—'}</span>`;
}

// ─── FILTER ───────────────────────────────────────────────

function filterReminders(tab, type) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  tab.dataset.filter = type;

  const isAdmin = authUtils?.isAdmin() || false;
  const filteredData = getFilteredReminders();
  const tbody = document.getElementById('reminders-tbody');
  if (tbody) tbody.innerHTML = renderReminderRows(filteredData, isAdmin);
  
  // Re-apply search filter
  const searchTerm = document.getElementById('rem-search')?.value.toLowerCase();
  if (searchTerm) {
    filterRemindersTable();
  }
}

// ─── ACTIONS (ADMIN ONLY) ─────────────────────────────────

async function permanentDeleteReminder(id) {
  const isAdmin = authUtils?.isAdmin() || false;
  if (!isAdmin) {
    window.showToast('Only admin can delete reminders', 'error');
    return;
  }
  
  const confirmed = confirm('⚠️ Delete reminder permanently? This action cannot be undone.');
  if (!confirmed) return;
  
  try {
    window.showSpinner();
    const deletedBy = localStorage.getItem('insura_email') || 'admin';
    const result = await api.del(`v1/reminders/${id}?deletedBy=${deletedBy}`);
    window.hideSpinner();
    
    if (result !== null) {
      window.showToast('Reminder deleted permanently', 'success');
      await loadReminders();
    } else {
      window.showToast('Failed to delete reminder', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    window.showToast(error.message || 'Failed to delete reminder', 'error');
  }
}

async function triggerGenerate() {
  const isAdmin = authUtils?.isAdmin() || false;
  if (!isAdmin) {
    window.showToast('Only admin can generate reminders', 'error');
    return;
  }
  
  const confirmed = confirm('⚠️ This will regenerate all reminders for existing policies. Continue?');
  if (!confirmed) return;
  
  try {
    window.showSpinner();
    const result = await api.post('v1/reminders/generate', {});
    window.hideSpinner();
    
    if (result !== null) {
      window.showToast('Reminders regenerated successfully!', 'success');
      await loadReminders();
    } else {
      window.showToast('Failed to generate reminders', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    window.showToast(error.message || 'Failed to generate reminders', 'error');
  }
}

// Go to policy detail
window._goToPolicy = async function(policyId) {
  if (!policyId) return;
  if (window.navigate) window.navigate('policies');
  setTimeout(async () => {
    if (window.showPolicyDetail) await window.showPolicyDetail(policyId);
  }, 400);
};

// ─── AUTO-GENERATE REMINDERS (Called after policy create/update) ───

async function generateRemindersForPolicy(policyId) {
  try {
    window.showSpinner();
    const result = await api.post(`v1/reminders/policy/${policyId}/generate`, {});
    window.hideSpinner();
    
    if (result !== null) {
      console.log(`✅ Reminders generated for policy ${policyId}`);
      return true;
    }
    return false;
  } catch (error) {
    window.hideSpinner();
    console.error('Failed to generate reminders for policy:', error);
    return false;
  }
}

// Hook into policy save - this will be called after policy is created/updated
window.registerReminderGeneration = function() {
  // Store original function if exists
  if (window._originalSubmitPolicy) return;
  
  if (window.submitPolicy) {
    window._originalSubmitPolicy = window.submitPolicy;
    window.submitPolicy = async function() {
      const result = await window._originalSubmitPolicy();
      if (result && result.success) {
        // Get the newly created/updated policy ID
        const policyId = document.getElementById('pol-id')?.value || result.policyId;
        if (policyId) {
          // Wait for reminders to be generated
          await generateRemindersForPolicy(policyId);
          // Refresh reminders view if we're on reminders page
          if (document.getElementById('reminders-tbody')) {
            await loadReminders();
          }
        }
      }
      return result;
    };
    console.log('✅ Reminder generation registered with policy save');
  }
};

// Also hook into policy update from policy detail
window.registerPolicyUpdateHook = function() {
  if (window._originalUpdatePolicy) return;
  
  if (window.updatePolicy) {
    window._originalUpdatePolicy = window.updatePolicy;
    window.updatePolicy = async function() {
      const result = await window._originalUpdatePolicy();
      if (result && result.success) {
        const policyId = document.getElementById('pol-id')?.value;
        if (policyId) {
          await generateRemindersForPolicy(policyId);
          if (document.getElementById('reminders-tbody')) {
            await loadReminders();
          }
        }
      }
      return result;
    };
    console.log('✅ Reminder generation registered with policy update');
  }
};

// Initialize hooks when policies module loads
if (typeof window.loadPolicies === 'function') {
  window.registerReminderGeneration();
  window.registerPolicyUpdateHook();
}

// ─── GLOBAL EXPORTS ───────────────────────────────────────
window.loadReminders           = loadReminders;
window.filterReminders         = filterReminders;
window.permanentDeleteReminder = permanentDeleteReminder;
window.triggerGenerate         = triggerGenerate;
window.generateRemindersForPolicy = generateRemindersForPolicy;

console.log('Reminders module loaded ✅ - Auto-generated reminders on policy add');