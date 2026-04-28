// hypothecations.js — Hypothecations module

if (typeof hypothecationsData === 'undefined') {
  var hypothecationsData = [];
  var hypothecationFilter = 'all';
  var hypothecationSearchTerm = '';
}

// ─── LOAD ─────────────────────────────────────────────────

async function loadHypothecations() {
  const data = await api.get('v1/hypothecations');
  hypothecationsData = data || [];
  hypothecationFilter = 'all';
  hypothecationSearchTerm = '';

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Hypothecations</h2>
        <p class="text-muted" id="hypo-count">${hypothecationsData.length} records</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="hypo-search" placeholder="Search by bank or employee...">
        </div>
        <button class="btn btn-primary" onclick="window.openAddHypothecationModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Hypothecation
        </button>
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="window.filterHypothecations(this,'all')">All</div>
      <div class="tab" onclick="window.filterHypothecations(this,'active')">Active</div>
      <div class="tab" onclick="window.filterHypothecations(this,'inactive')">Inactive</div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Bank Name</th>
            <th>Employee Name</th>
            <th>Mobile</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="hypo-tbody">
          ${renderHypoRows(hypothecationsData)}
        </tbody>
      </table>
    </div>
  `;

  buildHypoModal();

  setTimeout(() => {
    const searchInput = document.getElementById('hypo-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        hypothecationSearchTerm = e.target.value.toLowerCase();
        refreshHypoTable();
      });
    }
  }, 100);
}

// ─── RENDER ROWS ──────────────────────────────────────────

function renderHypoRows(data) {
  if (!data.length) {
    const msg = hypothecationSearchTerm
      ? `No records match "${hypothecationSearchTerm}"`
      : 'No hypothecation records found';
    return window.emptyState(msg, 6);
  }

  return data.map(h => {
    const safeBank  = window.escapeHtml(h.bankName     || '');
    const safeEmp   = window.escapeHtml(h.employeeName || '');
    const safeMob   = window.escapeHtml(h.mobileNumber || '');
    const safeEmail = window.escapeHtml(h.email        || '');
    const initials  = (h.bankName || '??').split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2);

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:32px; height:32px; border-radius:50%;
              background:var(--accent-soft); color:var(--accent);
              display:flex; align-items:center; justify-content:center;
              font-size:11px; font-weight:700; flex-shrink:0;">
              ${initials}
            </div>
            <span style="font-weight:500;">${safeBank}</span>
          </div>
        </td>
        <td>${safeEmp}</td>
        <td><span class="mono">${safeMob}</span></td>
        <td><span style="color:var(--accent);">${safeEmail}</span></td>
        <td>
          ${h.active
            ? `<span class="badge badge-active">Active</span>`
            : `<span class="badge badge-expired">Inactive</span>`}
        </td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm"
              onclick="window.openEditHypothecationModal('${h.id}')">
              ✏️ Edit
            </button>

            <button class="btn btn-danger btn-sm"
              onclick="window.deleteHypothecation('${h.id}', '${safeBank.replace(/'/g, "\\'")}')">
              🗑 Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── FILTER / SEARCH ──────────────────────────────────────

function getFilteredHypo() {
  let filtered = hypothecationsData;
  if (hypothecationFilter === 'active')   filtered = filtered.filter(h => h.active);
  if (hypothecationFilter === 'inactive') filtered = filtered.filter(h => !h.active);
  if (hypothecationSearchTerm) {
    filtered = filtered.filter(h =>
      (h.bankName     || '').toLowerCase().includes(hypothecationSearchTerm) ||
      (h.employeeName || '').toLowerCase().includes(hypothecationSearchTerm) ||
      (h.mobileNumber || '').toLowerCase().includes(hypothecationSearchTerm) ||
      (h.email        || '').toLowerCase().includes(hypothecationSearchTerm)
    );
  }
  return filtered;
}

function refreshHypoTable() {
  const filtered = getFilteredHypo();
  const tbody = document.getElementById('hypo-tbody');
  if (tbody) tbody.innerHTML = renderHypoRows(filtered);
  const countEl = document.getElementById('hypo-count');
  if (countEl) countEl.textContent = `${filtered.length} records`;
}

function filterHypothecations(tab, status) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  hypothecationFilter = status;
  refreshHypoTable();
}

// ─── MODAL FUNCTIONS ──────────────────────────────────────

function closeHypoModal() {
  const modal = document.getElementById('hypo-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

function openHypoModal() {
  const modal = document.getElementById('hypo-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function buildHypoModal() {
  if (document.getElementById('hypo-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'hypo-modal';
  modal.className = 'modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
  `;
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width:520px; width:90%; background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-2xl);">
      <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-bottom:1px solid var(--border);">
        <h3 id="hypo-modal-title" style="margin:0;">Add Hypothecation</h3>
        <button class="modal-close" onclick="window.closeHypoModal()" style="background:none; border:none; font-size:24px; cursor:pointer; color:var(--text-mutter);">&times;</button>
      </div>
      <div class="modal-body" style="padding:24px;">
        <div class="form-grid" style="display:grid; gap:16px;">
          <div class="form-group">
            <label>Bank Name *</label>
            <input type="text" id="hypo-bank" placeholder="e.g. HDFC Bank" class="form-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius);">
          </div>
          <div class="form-group">
            <label>Employee Name *</label>
            <input type="text" id="hypo-emp" placeholder="e.g. Rahul Sharma" class="form-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius);">
          </div>
          <div class="form-group">
            <label>Mobile Number *</label>
            <input type="text" id="hypo-mob" placeholder="9876543210" maxlength="10" class="form-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius);">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="hypo-email" placeholder="employee@bank.com" class="form-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius);">
          </div>
          <div class="form-group" id="hypo-status-group" style="display:none;">
            <label>Status</label>
            <select id="hypo-status" class="form-select" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius);">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <input type="hidden" id="hypo-id">
      </div>
      <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:12px; padding:16px 24px; border-top:1px solid var(--border);">
        <button class="btn btn-ghost" onclick="window.closeHypoModal()">Cancel</button>
        <button class="btn btn-primary" id="hypo-save-btn" onclick="window.submitHypothecation()">Save</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeHypoModal();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeHypoModal();
    }
  });
}

// Open modal for adding new hypothecation
async function openAddHypothecationModal() {
  buildHypoModal();

  // Reset form fields
  document.getElementById('hypo-id').value = '';
  document.getElementById('hypo-bank').value = '';
  document.getElementById('hypo-emp').value = '';
  document.getElementById('hypo-mob').value = '';
  document.getElementById('hypo-email').value = '';
  
  const titleEl = document.getElementById('hypo-modal-title');
  const statusGrp = document.getElementById('hypo-status-group');
  const saveBtn = document.getElementById('hypo-save-btn');
  
  if (titleEl) titleEl.textContent = 'Add Hypothecation';
  if (statusGrp) statusGrp.style.display = 'none';
  if (saveBtn) saveBtn.textContent = 'Save';
  
  openHypoModal();
}

// Open modal for editing existing hypothecation
async function openEditHypothecationModal(id) {
  if (!id || id === 'hypo-modal') {
    console.error('Invalid ID for edit:', id);
    return;
  }
  
  buildHypoModal();

  // Find the hypothecation in the data
  const hypothecation = hypothecationsData.find(x => x.id === id);
  
  if (!hypothecation) {
    window.showToast('Hypothecation record not found', 'error');
    return;
  }
  
  // Fill form fields
  document.getElementById('hypo-id').value = hypothecation.id;
  document.getElementById('hypo-bank').value = hypothecation.bankName || '';
  document.getElementById('hypo-emp').value = hypothecation.employeeName || '';
  document.getElementById('hypo-mob').value = hypothecation.mobileNumber || '';
  document.getElementById('hypo-email').value = hypothecation.email || '';
  
  const titleEl = document.getElementById('hypo-modal-title');
  const statusGrp = document.getElementById('hypo-status-group');
  const saveBtn = document.getElementById('hypo-save-btn');
  const statusSelect = document.getElementById('hypo-status');
  
  if (titleEl) titleEl.textContent = 'Edit Hypothecation';
  if (statusGrp) statusGrp.style.display = 'block';
  if (saveBtn) saveBtn.textContent = 'Update';
  if (statusSelect) statusSelect.value = String(hypothecation.active);
  
  openHypoModal();
}

// ─── SUBMIT ───────────────────────────────────────────────

async function submitHypothecation() {
  const id = document.getElementById('hypo-id')?.value?.trim();
  const bankName = document.getElementById('hypo-bank')?.value.trim();
  const empName = document.getElementById('hypo-emp')?.value.trim();
  const mobile = document.getElementById('hypo-mob')?.value.trim();
  const email = document.getElementById('hypo-email')?.value.trim();
  const active = document.getElementById('hypo-status')?.value === 'true';

  if (!bankName) { window.showToast('Bank name is required', 'warning'); return; }
  if (!empName) { window.showToast('Employee name is required', 'warning'); return; }
  if (!mobile) { window.showToast('Mobile number is required', 'warning'); return; }
  if (!email) { window.showToast('Email is required', 'warning'); return; }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.showToast('Enter a valid email address', 'warning'); return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    window.showToast('Enter a valid 10-digit mobile number', 'warning'); return;
  }

  const body = {
    bankName,
    employeeName: empName,
    mobileNumber: mobile,
    email,
    active: id ? active : true
  };

  const saveBtn = document.getElementById('hypo-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

  try {
    const result = id
      ? await api.put(`v1/hypothecations/${id}`, body)
      : await api.post('v1/hypothecations', body);

    if (result) {
      window.showToast(id ? 'Hypothecation updated!' : 'Hypothecation added!', 'success');
      closeHypoModal();
      await loadHypothecations();
    }
  } catch (error) {
    window.showToast(error.message || 'Failed to save', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = id ? 'Update' : 'Save'; }
  }
}

// ─── DELETE ───────────────────────────────────────────────

async function deleteHypothecation(id, bankName) {
  if (!id) {
    window.showToast('Unable to identify record. Please refresh and try again.', 'error');
    return;
  }

  const existing = document.getElementById('hypo-delete-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hypo-delete-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  `;

  overlay.innerHTML = `
    <div style="background:var(--bg-card); border-radius:var(--radius-lg); max-width:420px; width:90%; box-shadow:var(--shadow-2xl);">
      <div style="text-align:center; padding:32px 24px;">
        <div style="width:60px; height:60px; border-radius:var(--radius-lg); background:var(--red-soft); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; color:var(--red);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </div>
        <h3 style="margin-bottom:8px;">Delete Hypothecation</h3>
        <p style="color:var(--text-muted);">
          Delete hypothecation for <strong>"${bankName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</strong>?<br>This action cannot be undone.
        </p>
      </div>
      <div style="display:flex; justify-content:center; gap:12px; padding:16px 24px; border-top:1px solid var(--border);">
        <button id="hypo-del-cancel" class="btn btn-ghost">Cancel</button>
        <button id="hypo-del-confirm" class="btn btn-danger">🗑 Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById('hypo-del-cancel').addEventListener('click', () => {
    overlay.remove();
  });

  document.getElementById('hypo-del-confirm').addEventListener('click', async () => {
    overlay.remove();

    try {
      window.showSpinner();
      const deletedBy = localStorage.getItem('insura_email') || 'admin';
      const result = await api.del(`v1/hypothecations/${id}?deletedBy=${deletedBy}`);
      window.hideSpinner();

      if (result !== null) {
        window.showToast(`"${bankName}" deleted successfully!`, 'success');
        await loadHypothecations();
      } else {
        window.showToast('Failed to delete hypothecation', 'error');
      }
    } catch (error) {
      window.hideSpinner();
      window.showToast(error.message || 'Network error. Please try again.', 'error');
    }
  });
}

// ─── GLOBAL EXPORTS ───────────────────────────────────────

window.loadHypothecations = loadHypothecations;
window.filterHypothecations = filterHypothecations;
window.openAddHypothecationModal = openAddHypothecationModal;
window.openEditHypothecationModal = openEditHypothecationModal;
window.submitHypothecation = submitHypothecation;
window.deleteHypothecation = deleteHypothecation;
window.closeHypoModal = closeHypoModal;

console.log('Hypothecations module loaded ✅');