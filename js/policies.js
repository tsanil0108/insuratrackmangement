// policies.js — Policies module

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
        <p class="text-muted">${policiesData.length} policies</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="policy-search" placeholder="Search by policy number, company...">
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="openPolicyModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Policy
        </button>` : ''}
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="filterPolicies(this,'all')">All</div>
      <div class="tab" onclick="filterPolicies(this,'ACTIVE')">Active</div>
      <div class="tab" onclick="filterPolicies(this,'EXPIRING_SOON')">Expiring Soon</div>
      <div class="tab" onclick="filterPolicies(this,'EXPIRED')">Expired</div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Policy Number</th>
            <th>Assigned To</th>
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

    <!-- Detail Panel (hidden by default) -->
    <div id="policy-detail-panel" style="display:none; margin-top:24px;">
      <div class="section-header" style="margin-bottom:16px;">
        <h3 class="section-title" style="font-size:16px;">Policy Details</h3>
        <button class="btn btn-ghost btn-sm" onclick="closeDetailPanel()">✕ Close</button>
      </div>
      <div id="policy-detail-content"></div>
    </div>
  `;

  const searchInput = document.getElementById('policy-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterPoliciesTable());
  }

  if (isAdmin) buildPolicyModal();
  buildReminderModal();
}

// ─── RENDER ROWS ──────────────────────────────────────────

function renderPolicyRows(data, isAdmin) {
  if (!data.length) return emptyState('No policies found');

  return data.map(policy => `
    <tr style="cursor:pointer;">
      <td onclick="showPolicyDetail('${policy.id}')">
        <span class="mono" style="color:var(--primary)">${policy.policyNumber || 'N/A'}</span>
      </td>
      <td onclick="showPolicyDetail('${policy.id}')">
        <span style="display:flex; align-items:center; gap:6px;">
          <span style="width:24px; height:24px; border-radius:50%; background:var(--primary); display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff;">
            ${(policy.userName || '?').charAt(0).toUpperCase()}
          </span>
          ${policy.userName || '<span class="text-muted">Unassigned</span>'}
        </span>
      </td>
      <td onclick="showPolicyDetail('${policy.id}')">${policy.companyName || '—'}</td>
      <td onclick="showPolicyDetail('${policy.id}')">${policy.providerName || '—'}</td>
      <td onclick="showPolicyDetail('${policy.id}')">${policy.insuranceTypeName || '—'}</td>
      <td onclick="showPolicyDetail('${policy.id}')"><strong class="mono">${fmt.currency(policy.premiumAmount || 0)}</strong></td>
      <td onclick="showPolicyDetail('${policy.id}')">${policy.startDate ? fmt.date(policy.startDate) : '<span class="text-muted">—</span>'}</td>
      <td onclick="showPolicyDetail('${policy.id}')">${policy.endDate ? fmt.date(policy.endDate) : '<span class="text-muted">—</span>'}</td>
      <td onclick="showPolicyDetail('${policy.id}')">${statusBadge(policy.status)}</td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" onclick="openReminderModal('${policy.id}','${policy.policyNumber}')">
            🔔 Remind
          </button>
          ${isAdmin ? `
            <button class="btn btn-ghost btn-sm" onclick="editPolicy('${policy.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deletePolicy('${policy.id}','${policy.policyNumber}')">Delete</button>
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

  const totalPaid = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalUnpaid = payments
    .filter(p => p.status === 'UNPAID' || p.status === 'OVERDUE')
    .reduce((sum, p) => sum + p.amount, 0);

  const panel = document.getElementById('policy-detail-panel');
  const content = document.getElementById('policy-detail-content');

  content.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:24px;">
      ${detailCard('Policy Number', `<span class="mono">${policy.policyNumber || '—'}</span>`)}
      ${detailCard('Assigned To', policy.userName || '<span class="text-muted">Unassigned</span>')}
      ${detailCard('Company', policy.companyName || '—')}
      ${detailCard('Provider', policy.providerName || '—')}
      ${detailCard('Insurance Type', policy.insuranceTypeName || '—')}
      ${detailCard('Status', statusBadge(policy.status))}
      ${detailCard('Premium Frequency', policy.premiumFrequency || '—')}
      ${detailCard('Premium Amount', `<strong class="mono">${fmt.currency(policy.premiumAmount || 0)}</strong>`)}
      ${detailCard('Sum Insured', `<strong class="mono">${fmt.currency(policy.sumInsured || 0)}</strong>`)}
      ${detailCard('Start Date', policy.startDate ? fmt.date(policy.startDate) : '—')}
      ${detailCard('End Date', policy.endDate ? fmt.date(policy.endDate) : '—')}
      ${detailCard('Hypothecation', policy.hypothecation ? '✅ Yes' : '❌ No')}
      ${detailCard('Description', policy.description || '<span class="text-muted">—</span>')}
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; margin-bottom:24px;">
      ${summaryCard('Total Payments', payments.length, 'var(--text-secondary)')}
      ${summaryCard('Total Paid', fmt.currency(totalPaid), 'var(--success)')}
      ${summaryCard('Total Unpaid', fmt.currency(totalUnpaid), 'var(--danger)')}
    </div>

    <h4 style="margin-bottom:12px; color:var(--text-secondary); font-size:13px; text-transform:uppercase; letter-spacing:.05em;">Payment History</h4>
    <div class="table-wrapper" style="margin-bottom:0;">
      <table>
        <thead>
          <tr>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Paid Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${payments.length ? payments.map(p => `
            <tr>
              <td><strong class="mono">${fmt.currency(p.amount)}</strong></td>
              <td>${fmt.date(p.dueDate)}</td>
              <td>${p.paidDate ? fmt.date(p.paidDate) : '<span class="text-muted">—</span>'}</td>
              <td>${statusBadge(p.status)}</td>
            </tr>
          `).join('') : `<tr><td colspan="4">${emptyState('No payment records')}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function detailCard(label, value) {
  return `
    <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:8px; padding:14px 16px;">
      <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px;">${label}</div>
      <div style="font-size:14px; color:var(--text-primary);">${value}</div>
    </div>
  `;
}

function summaryCard(label, value, color) {
  return `
    <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:8px; padding:16px; text-align:center;">
      <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px;">${label}</div>
      <div style="font-size:20px; font-weight:700; color:${color};">${value}</div>
    </div>
  `;
}

function closeDetailPanel() {
  const panel = document.getElementById('policy-detail-panel');
  if (panel) panel.style.display = 'none';
}

// ─── REMINDER MODAL ───────────────────────────────────────

function buildReminderModal() {
  createModal('reminder-modal', 'Send Reminder', `
    <div class="form-grid">
      <div class="form-group">
        <label>Policy</label>
        <input type="text" id="rem-policy-display" disabled style="opacity:.6;">
        <input type="hidden" id="rem-policy-id">
      </div>
      <div class="form-group">
        <label>Reminder Type *</label>
        <select id="rem-type">
          <option value="PAYMENT_DUE">Payment Due</option>
          <option value="POLICY_EXPIRY">Policy Expiry</option>
          <option value="RENEWAL">Renewal Reminder</option>
          <option value="GENERAL">General</option>
        </select>
      </div>
      <div class="form-group">
        <label>Remind On *</label>
        <input type="date" id="rem-date">
      </div>
      <div class="form-group" style="grid-column:1/-1;">
        <label>Message *</label>
        <textarea id="rem-message" rows="3" placeholder="Enter reminder message..."
          style="width:100%; padding:8px 12px; background:var(--bg-primary); border:1px solid var(--border); border-radius:6px; color:var(--text-primary); resize:vertical; font-family:inherit; font-size:13px;"></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal('reminder-modal')">Cancel</button>
    <button class="btn btn-primary" onclick="submitReminder()">🔔 Send Reminder</button>
  `);
}

function openReminderModal(policyId, policyNumber) {
  document.getElementById('rem-policy-id').value = policyId;
  document.getElementById('rem-policy-display').value = policyNumber;
  document.getElementById('rem-type').value = 'PAYMENT_DUE';
  document.getElementById('rem-date').value = '';
  document.getElementById('rem-message').value = '';
  openModal('reminder-modal');
}

async function submitReminder() {
  const policyId = document.getElementById('rem-policy-id').value;
  const type     = document.getElementById('rem-type').value;
  const remindOn = document.getElementById('rem-date').value;
  const message  = document.getElementById('rem-message').value.trim();

  if (!remindOn) { showToast('Please select a reminder date', 'warning'); return; }
  if (!message)  { showToast('Please enter a message', 'warning'); return; }

  const body = { policyId, type, remindOn, message };
  const result = await api.post('/reminders', body);

  if (result) {
    showToast('Reminder scheduled!', 'success');
    closeModal('reminder-modal');
  }
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

  if (policyFilter !== 'all') {
    filtered = filtered.filter(p => p.status === policyFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(p =>
      (p.policyNumber?.toLowerCase().includes(searchTerm)) ||
      (p.userName?.toLowerCase().includes(searchTerm)) ||
      (p.companyName?.toLowerCase().includes(searchTerm)) ||
      (p.providerName?.toLowerCase().includes(searchTerm)) ||
      (p.insuranceTypeName?.toLowerCase().includes(searchTerm))
    );
  }

  const tbody = document.getElementById('policies-tbody');
  if (tbody) tbody.innerHTML = renderPolicyRows(filtered, isAdmin);
  closeDetailPanel();
}

// ─── MODAL ────────────────────────────────────────────────

function buildPolicyModal() {
  createModal('policy-modal', 'Create Policy', `
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
        <input type="number" id="pol-premium" placeholder="5000" min="0">
      </div>
      <div class="form-group">
        <label>Sum Insured (₹)</label>
        <input type="number" id="pol-sum-insured" placeholder="100000" min="0">
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
  `, `
    <button class="btn btn-ghost" onclick="closeModal('policy-modal')">Cancel</button>
    <button class="btn btn-primary" onclick="submitPolicy()">Save Policy</button>
  `);

  loadDropdown('pol-user',     '/users',           'name');
  loadDropdown('pol-company',  '/companies',       'name');
  loadDropdown('pol-type',     '/insurance-types', 'name');
  loadDropdown('pol-provider', '/providers',       'name');
}

async function openPolicyModal(id = null) {
  if (!document.getElementById('policy-modal')) buildPolicyModal();

  document.getElementById('pol-number').value = '';
  document.getElementById('pol-premium').value = '';
  document.getElementById('pol-sum-insured').value = '';
  document.getElementById('pol-start-date').value = '';
  document.getElementById('pol-end-date').value = '';
  document.getElementById('pol-description').value = '';
  document.getElementById('pol-hypothecation').checked = false;
  document.getElementById('pol-id').value = '';
  document.getElementById('pol-frequency').value = 'MONTHLY';

  const modalTitle = document.querySelector('#policy-modal .modal-header h3');
  if (modalTitle) modalTitle.textContent = id ? 'Edit Policy' : 'Create Policy';

  if (id) {
    const policy = await api.get(`/policies/${id}`);
    if (policy) {
      document.getElementById('pol-id').value = id;
      document.getElementById('pol-number').value = policy.policyNumber || '';
      document.getElementById('pol-premium').value = policy.premiumAmount || '';
      document.getElementById('pol-sum-insured').value = policy.sumInsured || '';
      document.getElementById('pol-start-date').value = policy.startDate || '';
      document.getElementById('pol-end-date').value = policy.endDate || '';
      document.getElementById('pol-description').value = policy.description || '';
      document.getElementById('pol-hypothecation').checked = policy.hypothecation || false;
      if (policy.premiumFrequency) {
        document.getElementById('pol-frequency').value = policy.premiumFrequency;
      }
      setTimeout(() => {
        if (policy.userId)          document.getElementById('pol-user').value     = policy.userId;
        if (policy.companyId)       document.getElementById('pol-company').value  = policy.companyId;
        if (policy.insuranceTypeId) document.getElementById('pol-type').value     = policy.insuranceTypeId;
        if (policy.providerId)      document.getElementById('pol-provider').value = policy.providerId;
      }, 500);
    }
  }

  openModal('policy-modal');
}

async function submitPolicy() {
  const id = document.getElementById('pol-id').value;

  const body = {
    policyNumber:     document.getElementById('pol-number').value.trim(),
    userId:           document.getElementById('pol-user').value,
    companyId:        document.getElementById('pol-company').value,
    insuranceTypeId:  document.getElementById('pol-type').value,
    providerId:       document.getElementById('pol-provider').value,
    premiumAmount:    parseFloat(document.getElementById('pol-premium').value) || 0,
    sumInsured:       parseFloat(document.getElementById('pol-sum-insured').value) || 0,
    startDate:        document.getElementById('pol-start-date').value || null,
    endDate:          document.getElementById('pol-end-date').value || null,
    description:      document.getElementById('pol-description').value.trim() || '',
    premiumFrequency: document.getElementById('pol-frequency').value,
    hypothecation:    document.getElementById('pol-hypothecation').checked,
  };

  if (!body.policyNumber)    { showToast('Policy number is required', 'warning'); return; }
  if (!body.userId)          { showToast('Please assign a user', 'warning'); return; }
  if (!body.companyId)       { showToast('Please select a company', 'warning'); return; }
  if (!body.insuranceTypeId) { showToast('Please select an insurance type', 'warning'); return; }
  if (!body.providerId)      { showToast('Please select a provider', 'warning'); return; }
  if (!body.premiumFrequency){ showToast('Please select premium frequency', 'warning'); return; }
  if (!body.premiumAmount || body.premiumAmount <= 0) {
    showToast('Valid premium amount is required', 'warning'); return;
  }

  const result = id
    ? await api.put(`/policies/${id}`, body)
    : await api.post('/policies', body);

  if (result) {
    showToast(id ? 'Policy updated!' : 'Policy created!', 'success');
    closeModal('policy-modal');
    loadPolicies();
  }
}

async function editPolicy(id) {
  await openPolicyModal(id);
}

async function deletePolicy(id, policyNumber) {
  showConfirm('Delete Policy', `Delete policy "${policyNumber}"? This action cannot be undone.`, async () => {
    const result = await api.del(`/policies/${id}`);
    if (result !== null) {
      showToast('Policy deleted', 'success');
      loadPolicies();
    }
  });
}