// policies.js — Complete Policies Module with Fixed Delete

let policiesData = [];
let policyFilter = 'all';

async function loadPolicies() {
  const isAdmin = authUtils.isAdmin();
  const endpoint = isAdmin ? '/policies' : '/policies/my';
  const data = await api.get(endpoint);
  policiesData = data || [];

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Policies</h2>
        <p class="text-muted" id="policies-count">${policiesData.length} policies</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="policy-search" placeholder="Search by policy number, company...">
        </div>

        <!-- Export Dropdown -->
        <div style="position:relative;" id="export-dropdown-wrapper">
          <button class="btn btn-ghost" onclick="window.toggleExportMenu(event)"
            style="display:flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div id="export-menu" style="
            display:none; position:absolute; top:calc(100% + 6px); right:0;
            background:var(--bg-card); border:1px solid var(--border);
            border-radius:8px; min-width:160px; z-index:200;
            box-shadow:0 4px 16px rgba(0,0,0,0.12); overflow:hidden;">
            <div style="padding:6px 0;">
              <div style="padding:4px 12px 2px; font-size:10px; color:var(--text-muted);
                text-transform:uppercase; letter-spacing:.05em;">Policies</div>
              <button class="export-item" onclick="window.doExport('policies','csv')">📄 CSV</button>
              <button class="export-item" onclick="window.doExport('policies','excel')">📊 Excel</button>
              <button class="export-item" onclick="window.doExport('policies','pdf')">📑 HTML</button>
              <div style="border-top:1px solid var(--border); margin:4px 0;"></div>
              <div style="padding:4px 12px 2px; font-size:10px; color:var(--text-muted);
                text-transform:uppercase; letter-spacing:.05em;">Payments</div>
              <button class="export-item" onclick="window.doExport('payments','csv')">📄 CSV</button>
              <button class="export-item" onclick="window.doExport('payments','excel')">📊 Excel</button>
              <button class="export-item" onclick="window.doExport('payments','pdf')">📑 HTML</button>
            </div>
          </div>
        </div>

        ${isAdmin ? `
          <button class="btn btn-primary" onclick="window.openPolicyModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Policy
          </button>` : ''}
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="window.filterPolicies(this,'all')">All</div>
      <div class="tab" onclick="window.filterPolicies(this,'ACTIVE')">Active</div>
      <div class="tab" onclick="window.filterPolicies(this,'EXPIRING_SOON')">Expiring Soon</div>
      <div class="tab" onclick="window.filterPolicies(this,'EXPIRED')">Expired</div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Policy Number</th>
            ${isAdmin ? '<th>Assigned To</th>' : ''}
            <th>Company</th>
            <th>Provider</th>
            <th>Type</th>
            <th>Premium</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="policies-tbody">
          ${renderPolicyRows(policiesData, isAdmin)}
        </tbody>
      </table>
    </div>

    <!-- Detail Panel -->
    <div id="policy-detail-panel" style="display:none; margin-top:24px;">
      <div class="section-header" style="margin-bottom:16px;">
        <h3 class="section-title" style="font-size:16px;">Policy Details</h3>
        <button class="btn btn-ghost btn-sm" onclick="window.closeDetailPanel()">✕ Close</button>
      </div>
      <div id="policy-detail-content"></div>
    </div>
  `;

  injectExportItemStyles();
  document.removeEventListener('click', closeExportMenuOnOutsideClick);
  document.addEventListener('click', closeExportMenuOnOutsideClick);

  const searchInput = document.getElementById('policy-search');
  if (searchInput) searchInput.addEventListener('input', filterPoliciesTable);

  if (isAdmin) buildPolicyModal();
}

// ─── EXPORT FUNCTIONS ───────────────────────────────────────────────

function injectExportItemStyles() {
  if (document.getElementById('export-item-style')) return;
  const style = document.createElement('style');
  style.id = 'export-item-style';
  style.textContent = `
    .export-item {
      display:block; width:100%; text-align:left;
      padding:8px 16px; background:none; border:none;
      color:var(--text-primary); font-size:13px; cursor:pointer;
      transition: background .2s;
    }
    .export-item:hover { background:var(--bg-hover); }
  `;
  document.head.appendChild(style);
}

function toggleExportMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('export-menu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function closeExportMenuOnOutsideClick(e) {
  const wrapper = document.getElementById('export-dropdown-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    const menu = document.getElementById('export-menu');
    if (menu) menu.style.display = 'none';
  }
}

function getExportFileName(prefix, extension) {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const time = `${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`;
  return `${prefix}_${date}_${time}.${extension}`;
}

async function doExport(type, format) {
  const menu = document.getElementById('export-menu');
  if (menu) menu.style.display = 'none';
  const ext = format === 'csv' ? 'csv' : (format === 'excel' ? 'xlsx' : 'html');
  const filename = getExportFileName(type, ext);
  try {
    if (format === 'csv')   await api.downloadCSV(`/export/${type}/csv`, filename);
    else                    await api.download(`/export/${type}/${format}`, filename);
  } catch (error) {
    window.showToast(`Export failed: ${error.message}`, 'error');
  }
}

// ─── RENDER ROWS ──────────────────────────────────────────

function renderPolicyRows(data, isAdmin) {
  if (!data.length) return window.emptyState('No policies found', isAdmin ? 10 : 9);

  return data.map(policy => `
    <tr style="cursor:pointer;">
      <td onclick="window.showPolicyDetail('${policy.id}')">
        <span class="mono" style="color:var(--accent)">
          ${window.escapeHtml(policy.policyNumber) || 'N/A'}
        </span>
      </td>
      ${isAdmin ? `
      <td onclick="window.showPolicyDetail('${policy.id}')">
        <span style="display:flex; align-items:center; gap:6px;">
          <span style="width:24px; height:24px; border-radius:50%; background:var(--accent);
            display:inline-flex; align-items:center; justify-content:center;
            font-size:10px; font-weight:700; color:#fff;">
            ${(policy.userName || '?').charAt(0).toUpperCase()}
          </span>
          ${window.escapeHtml(policy.userName) || '<span class="text-muted">Unassigned</span>'}
        </span>
      </td>` : ''}
      <td onclick="window.showPolicyDetail('${policy.id}')">${window.escapeHtml(policy.companyName) || '—'}</td>
      <td onclick="window.showPolicyDetail('${policy.id}')">${window.escapeHtml(policy.providerName) || '—'}</td>
      <td onclick="window.showPolicyDetail('${policy.id}')">${window.escapeHtml(policy.insuranceTypeName) || '—'}</td>
      <td onclick="window.showPolicyDetail('${policy.id}')">
        <strong class="mono">${window.fmt.currency(policy.premiumAmount || 0)}</strong>
      </td>
      <td onclick="window.showPolicyDetail('${policy.id}')">
        ${policy.startDate ? window.fmt.date(policy.startDate) : '<span class="text-muted">—</span>'}
      </td>
      <td onclick="window.showPolicyDetail('${policy.id}')">
        ${policy.endDate ? window.fmt.date(policy.endDate) : '<span class="text-muted">—</span>'}
      </td>
      <td onclick="window.showPolicyDetail('${policy.id}')">${window.statusBadge(policy.status)}</td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm"
            onclick="event.stopPropagation(); window.openReminderModal('${policy.id}', '${window.escapeHtml(policy.policyNumber).replace(/'/g,"\\'")}')">
            🔔 Remind
          </button>
          ${isAdmin ? `
            <button class="btn btn-ghost btn-sm"
              onclick="event.stopPropagation(); window.editPolicy('${policy.id}')">Edit</button>
            <button class="btn btn-danger btn-sm"
              onclick="event.stopPropagation(); window.deletePolicy('${policy.id}', '${window.escapeHtml(policy.policyNumber).replace(/'/g,"\\'")}')">Delete</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── DETAIL PANEL ─────────────────────────────────────────

async function showPolicyDetail(id) {
  const policy = policiesData.find(p => p.id === id) || await api.get(`/policies/${id}`);
  if (!policy) return;

  const payments = await api.get(`/payments/policy/${id}`) || [];
  const totalPaid   = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalUnpaid = payments.filter(p => p.status === 'UNPAID' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0);

  const isAdmin = authUtils.isAdmin();
  const content = document.getElementById('policy-detail-content');
  if (!content) return;

  content.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:24px;">
      ${detailCard('Policy Number', `<span class="mono">${window.escapeHtml(policy.policyNumber) || '—'}</span>`)}
      ${isAdmin ? detailCard('Assigned To', window.escapeHtml(policy.userName) || '<span class="text-muted">Unassigned</span>') : ''}
      ${detailCard('Company',        window.escapeHtml(policy.companyName)       || '—')}
      ${detailCard('Provider',       window.escapeHtml(policy.providerName)      || '—')}
      ${detailCard('Insurance Type', window.escapeHtml(policy.insuranceTypeName) || '—')}
      ${detailCard('Status',         window.statusBadge(policy.status))}
      ${detailCard('Premium Frequency', policy.premiumFrequency || '—')}
      ${detailCard('Premium Amount', `<strong class="mono">${window.fmt.currency(policy.premiumAmount || 0)}</strong>`)}
      ${detailCard('Sum Insured',    `<strong class="mono">${window.fmt.currency(policy.sumInsured || 0)}</strong>`)}
      ${detailCard('Start Date', policy.startDate ? window.fmt.date(policy.startDate) : '—')}
      ${detailCard('End Date',   policy.endDate   ? window.fmt.date(policy.endDate)   : '—')}
      ${detailCard('Hypothecation', policy.hypothecation ? '✅ Yes' : '❌ No')}
      ${detailCard('Description', window.escapeHtml(policy.description) || '<span class="text-muted">—</span>')}
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; margin-bottom:24px;">
      ${summaryCard('Total Payments', payments.length,           'var(--text-secondary)')}
      ${summaryCard('Total Paid',     window.fmt.currency(totalPaid),   'var(--green)')}
      ${summaryCard('Total Unpaid',   window.fmt.currency(totalUnpaid), 'var(--red)')}
    </div>

    <h4 style="margin-bottom:12px; color:var(--text-secondary); font-size:13px;
      text-transform:uppercase; letter-spacing:.05em;">Payment History</h4>
    <div class="table-wrapper" style="margin-bottom:0;">
      <table>
        <thead>
          <tr><th>Amount</th><th>Due Date</th><th>Paid Date</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${payments.length
            ? payments.map(p => `
                <tr>
                  <td><strong class="mono">${window.fmt.currency(p.amount)}</strong></td>
                  <td>${window.fmt.date(p.dueDate)}</td>
                  <td>${p.paidDate ? window.fmt.date(p.paidDate) : '<span class="text-muted">—</span>'}</td>
                  <td>${window.statusBadge(p.status)}</td>
                </tr>`).join('')
            : `<tr><td colspan="4" class="empty-state">No payment records</td></tr>`}
        </tbody>
       </table>
    </div>
  `;

  const panel = document.getElementById('policy-detail-panel');
  if (panel) { panel.style.display = 'block'; panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

function detailCard(label, value) {
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border);
      border-radius:8px; padding:14px 16px;">
      <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;
        letter-spacing:.05em; margin-bottom:6px;">${label}</div>
      <div style="font-size:14px; color:var(--text-primary);">${value}</div>
    </div>`;
}

function summaryCard(label, value, color) {
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border);
      border-radius:8px; padding:16px; text-align:center;">
      <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;
        letter-spacing:.05em; margin-bottom:8px;">${label}</div>
      <div style="font-size:20px; font-weight:700; color:${color};">${value}</div>
    </div>`;
}

function closeDetailPanel() {
  const panel = document.getElementById('policy-detail-panel');
  if (panel) panel.style.display = 'none';
}

// ─── FILTER ───────────────────────────────────────────────

function filterPolicies(tab, status) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  policyFilter = status;
  closeDetailPanel();
  filterPoliciesTable();
}

function filterPoliciesTable() {
  const searchTerm = document.getElementById('policy-search')?.value.toLowerCase() || '';
  const isAdmin = authUtils.isAdmin();
  let filtered = policiesData;

  if (policyFilter !== 'all') filtered = filtered.filter(p => p.status === policyFilter);

  if (searchTerm) {
    filtered = filtered.filter(p =>
      (p.policyNumber     || '').toLowerCase().includes(searchTerm) ||
      (p.userName         || '').toLowerCase().includes(searchTerm) ||
      (p.companyName      || '').toLowerCase().includes(searchTerm) ||
      (p.providerName     || '').toLowerCase().includes(searchTerm) ||
      (p.insuranceTypeName|| '').toLowerCase().includes(searchTerm)
    );
  }

  const tbody = document.getElementById('policies-tbody');
  if (tbody) tbody.innerHTML = renderPolicyRows(filtered, isAdmin);
  closeDetailPanel();
  
  const countEl = document.getElementById('policies-count');
  if (countEl) countEl.textContent = `${filtered.length} policies`;
}

// ─── POLICY MODAL ─────────────────────────────────────────

function buildPolicyModal() {
  if (document.getElementById('policy-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'policy-modal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:800px;">
      <div class="modal-header">
        <h3>Create Policy</h3>
        <button class="modal-close" onclick="window.closeModal('policy-modal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Policy Number *</label>
            <input type="text" id="pol-number" placeholder="POL-2024-001">
          </div>
          <div class="form-group">
            <label>Assign To User *</label>
            <select id="pol-user"></select>
          </div>
          <div class="form-group">
            <label>Company *</label>
            <select id="pol-company"></select>
          </div>
          <div class="form-group">
            <label>Insurance Type *</label>
            <select id="pol-type"></select>
          </div>
          <div class="form-group">
            <label>Provider *</label>
            <select id="pol-provider"></select>
          </div>
          <div class="form-group">
            <label>Premium Frequency *</label>
            <select id="pol-frequency">
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half Yearly</option>
              <option value="ANNUALLY">Annually</option>
            </select>
          </div>
          <div class="form-group">
            <label>Premium Amount (₹) *</label>
            <input type="number" id="pol-premium" placeholder="5000" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Sum Insured (₹)</label>
            <input type="number" id="pol-sum-insured" placeholder="100000" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Start Date</label>
            <input type="date" id="pol-start-date">
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input type="date" id="pol-end-date">
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" id="pol-description" placeholder="Optional notes">
          </div>
          <div class="form-group" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="pol-hypothecation">
            <label for="pol-hypothecation" style="margin:0;">Hypothecation</label>
          </div>
        </div>
        <input type="hidden" id="pol-id">
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="window.closeModal('policy-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="window.submitPolicy()">Save Policy</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  window.loadDropdown('pol-user',     '/users',            'name');
  window.loadDropdown('pol-company',  '/companies',        'name');
  window.loadDropdown('pol-type',     '/insurance-types',  'name');
  window.loadDropdown('pol-provider', '/providers',        'name');
}

async function openPolicyModal(id = null) {
  buildPolicyModal();

  ['pol-number', 'pol-premium', 'pol-sum-insured', 'pol-start-date', 'pol-end-date', 'pol-description', 'pol-id']
    .forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });

  const hypothecationEl = document.getElementById('pol-hypothecation');
  if (hypothecationEl) hypothecationEl.checked = false;
  const frequencyEl = document.getElementById('pol-frequency');
  if (frequencyEl) frequencyEl.value = 'MONTHLY';

  const titleEl = document.querySelector('#policy-modal .modal-header h3');
  if (titleEl) titleEl.textContent = id ? 'Edit Policy' : 'Create Policy';

  if (id) {
    const policy = await api.get(`/policies/${id}`);
    if (policy) {
      document.getElementById('pol-id').value          = id;
      document.getElementById('pol-number').value      = policy.policyNumber    || '';
      document.getElementById('pol-premium').value     = policy.premiumAmount   || '';
      document.getElementById('pol-sum-insured').value = policy.sumInsured      || '';
      document.getElementById('pol-start-date').value  = policy.startDate       || '';
      document.getElementById('pol-end-date').value    = policy.endDate         || '';
      document.getElementById('pol-description').value = policy.description     || '';
      if (hypothecationEl) hypothecationEl.checked = !!policy.hypothecation;
      if (frequencyEl && policy.premiumFrequency) frequencyEl.value = policy.premiumFrequency;

      await waitForDropdowns(['pol-user', 'pol-company', 'pol-type', 'pol-provider']);
      if (policy.userId)          document.getElementById('pol-user').value     = policy.userId;
      if (policy.companyId)       document.getElementById('pol-company').value  = policy.companyId;
      if (policy.insuranceTypeId) document.getElementById('pol-type').value     = policy.insuranceTypeId;
      if (policy.providerId)      document.getElementById('pol-provider').value = policy.providerId;
    }
  }

  window.openModal('policy-modal');
}

function waitForDropdowns(ids, maxMs = 3000) {
  return new Promise(resolve => {
    const start = Date.now();
    (function check() {
      const allReady = ids.every(id => { const el = document.getElementById(id); return el && el.options.length > 0; });
      if (allReady || Date.now() - start > maxMs) return resolve();
      setTimeout(check, 50);
    })();
  });
}

async function checkDuplicatePolicyNumber(policyNumber, excludeId = null) {
  const isAdmin = authUtils.isAdmin();
  const endpoint = isAdmin ? '/policies' : '/policies/my';
  const policies = await api.get(endpoint);
  if (!policies) return false;
  return policies.some(p => p.policyNumber === policyNumber && p.id !== excludeId);
}

async function submitPolicy() {
  const id           = document.getElementById('pol-id')?.value;
  const policyNumber = document.getElementById('pol-number')?.value.trim();

  const isDuplicate = await checkDuplicatePolicyNumber(policyNumber, id);
  if (isDuplicate) {
    window.showToast(`Policy number "${policyNumber}" already exists!`, 'error');
    const el = document.getElementById('pol-number');
    if (el) { el.focus(); el.style.borderColor = 'var(--red)'; setTimeout(() => el.style.borderColor = '', 3000); }
    return;
  }

  const body = {
    policyNumber,
    userId:           document.getElementById('pol-user')?.value,
    companyId:        document.getElementById('pol-company')?.value,
    insuranceTypeId:  document.getElementById('pol-type')?.value,
    providerId:       document.getElementById('pol-provider')?.value,
    premiumAmount:    parseFloat(document.getElementById('pol-premium')?.value)     || 0,
    sumInsured:       parseFloat(document.getElementById('pol-sum-insured')?.value) || 0,
    startDate:        document.getElementById('pol-start-date')?.value  || null,
    endDate:          document.getElementById('pol-end-date')?.value    || null,
    description:      document.getElementById('pol-description')?.value.trim() || '',
    premiumFrequency: document.getElementById('pol-frequency')?.value,
    hypothecation:    document.getElementById('pol-hypothecation')?.checked,
  };

  if (!body.policyNumber)     { window.showToast('Policy number is required',            'warning'); return; }
  if (!body.userId)           { window.showToast('Please assign a user',                 'warning'); return; }
  if (!body.companyId)        { window.showToast('Please select a company',              'warning'); return; }
  if (!body.insuranceTypeId)  { window.showToast('Please select an insurance type',      'warning'); return; }
  if (!body.providerId)       { window.showToast('Please select a provider',             'warning'); return; }
  if (!body.premiumFrequency) { window.showToast('Please select premium frequency',      'warning'); return; }
  if (!body.premiumAmount || body.premiumAmount <= 0) { window.showToast('Valid premium amount is required', 'warning'); return; }

  const submitBtn = document.querySelector('#policy-modal .btn-primary');
  const origText = submitBtn?.textContent;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

  try {
    const result = id
      ? await api.put(`/policies/${id}`, body)
      : await api.post('/policies', body);

    if (result) {
      window.showToast(id ? 'Policy updated!' : 'Policy created!', 'success');
      window.closeModal('policy-modal');
      await loadPolicies();
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
  }
}

async function editPolicy(id) { 
  await openPolicyModal(id); 
}

// ─── DELETE POLICY (FIXED) ───────────────────────────────────────────────

async function deletePolicy(id, policyNumber) {
  console.log('🔴 Delete policy called for:', { id, policyNumber });
  
  const confirmed = confirm(`Delete policy "${policyNumber}"? This action cannot be undone.\n\nThis will also soft-delete all associated payments.`);
  
  if (!confirmed) {
    console.log('User cancelled delete');
    return;
  }
  
  try {
    window.showSpinner();
    console.log('📤 Sending DELETE request for policy:', id);
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/policies/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast(`Policy "${policyNumber}" deleted successfully!`, 'success');
      console.log('✅ Policy deleted, reloading...');
      await loadPolicies();
    } else {
      let errorMessage = 'Failed to delete policy';
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        errorMessage = await response.text();
      }
      console.error('❌ Delete failed:', errorMessage);
      window.showToast(errorMessage, 'error');
    }
  } catch (error) {
    window.hideSpinner();
    console.error('❌ Delete error:', error);
    window.showToast(error.message || 'Failed to delete policy', 'error');
  }
}

// ─── GLOBAL EXPORTS ───────────────────────────────────────

window.loadPolicies = loadPolicies;
window.filterPolicies = filterPolicies;
window.filterPoliciesTable = filterPoliciesTable;
window.showPolicyDetail = showPolicyDetail;
window.closeDetailPanel = closeDetailPanel;
window.editPolicy = editPolicy;
window.deletePolicy = deletePolicy;
window.openPolicyModal = openPolicyModal;
window.submitPolicy = submitPolicy;
window.toggleExportMenu = toggleExportMenu;
window.doExport = doExport;
window.injectExportItemStyles = injectExportItemStyles;

console.log('Policies module loaded');
console.log('window.deletePolicy type:', typeof window.deletePolicy);