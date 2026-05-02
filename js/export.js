// export.js — Export functionality with Filters (Only Policies)

let exportFilters = {
  startDate: '',
  endDate: '',
  status: '',
  paymentStatus: '',
  companyId: '',
  insuranceTypeId: ''
};

// Cache for dropdown data
let companiesList = [];
let insuranceTypesList = [];

async function loadExport() {
  if (!authUtils.getToken()) {
    showToast('Please login to access export', 'error');
    navigate('dashboard');
    return;
  }

  const isAdmin = authUtils.isAdmin();

  // Load dropdown data
  await loadDropdownData();

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Export Policies</h2>
        <p class="text-muted">Download or email your filtered policy data</p>
      </div>
    </div>

    <!-- FILTERS SECTION -->
    <div class="card" style="margin-bottom:24px;padding:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div style="width:40px;height:40px;background:var(--accent-soft);border-radius:10px;
          display:flex;align-items:center;justify-content:center;font-size:20px;">🔍</div>
        <div>
          <h3 style="font-size:1rem;font-weight:700;">Filter Policies</h3>
          <p style="font-size:12px;color:var(--text-muted);">Apply filters before exporting</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;">Start Date (End Date Range)</label>
          <input type="date" id="export-start-date" class="form-control"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);width:100%;">
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;">End Date (End Date Range)</label>
          <input type="date" id="export-end-date" class="form-control"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);width:100%;">
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;">Policy Status</label>
          <select id="export-status" class="form-control"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);width:100%;">
            <option value="">All Status</option>
            <option value="ACTIVE">🟢 Active</option>
            <option value="EXPIRING_SOON">🟡 Expiring Soon</option>
            <option value="EXPIRED">🔴 Expired</option>
          </select>
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;">Payment Status</label>
          <select id="export-payment-status" class="form-control"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);width:100%;">
            <option value="">All Payments</option>
            <option value="paid">✅ Fully Paid</option>
            <option value="partial">🟡 Partial Payment</option>
            <option value="unpaid">❌ Unpaid</option>
          </select>
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;">Company</label>
          <select id="export-company" class="form-control"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);width:100%;">
            <option value="">All Companies</option>
            ${companiesList.map(c => `<option value="${c.id}">${window.escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;">Insurance Type</label>
          <select id="export-type" class="form-control"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);width:100%;">
            <option value="">All Types</option>
            ${insuranceTypesList.map(t => `<option value="${t.id}">${window.escapeHtml(t.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="applyExportFilters()">
          🔄 Apply Filters
        </button>
        <button class="btn btn-ghost btn-sm" onclick="clearExportFilters()">
          ✕ Clear All Filters
        </button>
        <span id="filter-count-badge" style="margin-left:auto;font-size:12px;color:var(--text-muted);"></span>
      </div>
    </div>

    <!-- Email Export Banner -->
    <div style="background:linear-gradient(135deg,var(--accent-soft),var(--purple-soft));
      border:1px solid var(--accent);border-radius:14px;padding:20px 24px;
      margin-bottom:28px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <div style="font-size:36px;">📧</div>
      <div style="flex:1;min-width:200px;">
        <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:4px;">
          Email Export
        </div>
        <div style="font-size:13px;color:var(--text-secondary);">
          Send filtered policies directly to your email (CSV + Excel + HTML attached)
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <input type="email" id="export-email" placeholder="your@email.com"
          style="padding:10px 14px;border:1px solid var(--border);border-radius:8px;
          font-size:13px;background:var(--bg-surface);color:var(--text-primary);
          min-width:220px;outline:none;">
        <button class="btn btn-primary btn-sm" onclick="emailPoliciesExport()">
          📧 Email Policies
        </button>
      </div>
    </div>

    <!-- Policies Export Cards -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div style="width:40px;height:40px;background:var(--accent-soft);border-radius:10px;
          display:flex;align-items:center;justify-content:center;font-size:20px;">📄</div>
        <div>
          <h3 style="font-size:1rem;font-weight:700;">Export Policies</h3>
          <p style="font-size:12px;color:var(--text-muted);" id="export-policy-count">
            ${isAdmin ? 'All policies in the system' : 'Your assigned policies'}
          </p>
        </div>
      </div>
      <div class="export-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));">
        <div class="export-format-card" onclick="exportFilteredPoliciesCSV()">
          <div class="export-format-icon" style="background:var(--green-soft);color:var(--green);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="export-format-label">CSV</div>
          <div class="export-format-sub">Spreadsheet-ready</div>
        </div>
        <div class="export-format-card" onclick="exportFilteredPoliciesExcel()">
          <div class="export-format-icon" style="background:var(--green-soft);color:#1d6f42;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div class="export-format-label">Excel</div>
          <div class="export-format-sub">.xlsx format</div>
        </div>
        <div class="export-format-card" onclick="exportFilteredPoliciesPDF()">
          <div class="export-format-icon" style="background:var(--red-soft);color:var(--red);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div class="export-format-label">HTML Report</div>
          <div class="export-format-sub">Print-friendly</div>
        </div>
      </div>
    </div>

    <style>
      .export-format-card {
        display:flex;flex-direction:column;align-items:center;gap:10px;
        padding:20px 16px;background:var(--bg-elevated);border:1px solid var(--border);
        border-radius:12px;cursor:pointer;transition:all 0.2s;text-align:center;
      }
      .export-format-card:hover {
        background:var(--bg-hover);border-color:var(--accent);
        transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,0.08);
      }
      .export-format-icon {
        width:52px;height:52px;border-radius:12px;
        display:flex;align-items:center;justify-content:center;
        transition:transform 0.2s;
      }
      .export-format-card:hover .export-format-icon { transform:scale(1.1); }
      .export-format-label { font-weight:700;font-size:0.9rem;color:var(--text-primary); }
      .export-format-sub   { font-size:0.7rem;color:var(--text-muted); }
      .export-grid         { display:grid;gap:16px; }
      .form-group label    { display:block;margin-bottom:6px;font-weight:500; }
    </style>
  `;

  attachFilterListeners();
}

// ─── DROPDOWN DATA ────────────────────────────────────────

async function loadDropdownData() {
  try {
    const token = localStorage.getItem('insura_token');
    if (!token) return;

    const [companiesRes, typesRes] = await Promise.all([
      fetch(api.buildUrl('v1/companies'),        { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(api.buildUrl('v1/insurance-types'),  { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (companiesRes.ok) companiesList      = await companiesRes.json();
    if (typesRes.ok)     insuranceTypesList = await typesRes.json();
  } catch (error) {
    console.error('Failed to load dropdown data:', error);
  }
}

// ─── FILTER LISTENERS ─────────────────────────────────────

function attachFilterListeners() {
  const ids = ['export-start-date','export-end-date','export-status',
               'export-payment-status','export-company','export-type'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { updateExportFilters(); updateFilterCount(); });
  });
}

function updateExportFilters() {
  exportFilters = {
    startDate:       document.getElementById('export-start-date')?.value    || '',
    endDate:         document.getElementById('export-end-date')?.value      || '',
    status:          document.getElementById('export-status')?.value        || '',
    paymentStatus:   document.getElementById('export-payment-status')?.value || '',
    companyId:       document.getElementById('export-company')?.value       || '',
    insuranceTypeId: document.getElementById('export-type')?.value          || ''
  };
}

function applyExportFilters() {
  updateExportFilters();
  updateFilterCount();
  window.showToast('Filters applied!', 'success');
}

function clearExportFilters() {
  ['export-start-date','export-end-date','export-status',
   'export-payment-status','export-company','export-type'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  exportFilters = { startDate:'', endDate:'', status:'', paymentStatus:'', companyId:'', insuranceTypeId:'' };
  updateFilterCount();
  window.showToast('All filters cleared!', 'success');
}

function updateFilterCount() {
  const count = Object.values(exportFilters).filter(v => v && v !== '').length;
  const badge = document.getElementById('filter-count-badge');
  if (badge) badge.textContent = count > 0 ? `${count} filter${count > 1 ? 's' : ''} active` : '';
}

// ─── QUERY STRING BUILDER ─────────────────────────────────
// ✅ FIX: URLSearchParams use karo — ? aur & automatically sahi lagta hai

function getFilterQueryString() {
  const params = new URLSearchParams();
  if (exportFilters.startDate)       params.append('startDate',       exportFilters.startDate);
  if (exportFilters.endDate)         params.append('endDate',         exportFilters.endDate);
  if (exportFilters.status)          params.append('status',          exportFilters.status);
  if (exportFilters.paymentStatus)   params.append('paymentStatus',   exportFilters.paymentStatus);
  if (exportFilters.companyId)       params.append('companyId',       exportFilters.companyId);
  if (exportFilters.insuranceTypeId) params.append('insuranceTypeId', exportFilters.insuranceTypeId);
  const query = params.toString();
  return query ? `?${query}` : '';
}

// ─── EMAIL QUERY STRING (email param + filters) ───────────
// ✅ FIX: email ko bhi URLSearchParams mein dalo — double ? nahi aayega

function getEmailQueryString(email) {
  const params = new URLSearchParams();
  params.append('email', email);                                          // ← pehla param
  if (exportFilters.startDate)       params.append('startDate',       exportFilters.startDate);
  if (exportFilters.endDate)         params.append('endDate',         exportFilters.endDate);
  if (exportFilters.status)          params.append('status',          exportFilters.status);
  if (exportFilters.paymentStatus)   params.append('paymentStatus',   exportFilters.paymentStatus);
  if (exportFilters.companyId)       params.append('companyId',       exportFilters.companyId);
  if (exportFilters.insuranceTypeId) params.append('insuranceTypeId', exportFilters.insuranceTypeId);
  return `?${params.toString()}`;
  // Result: ?email=abc@gmail.com&status=EXPIRED&paymentStatus=paid
  // ✅ Sirf ek ? — sab & se connected
}

// ─── FILTERED POLICY EXPORTS ─────────────────────────────

async function exportFilteredPoliciesCSV() {
  try {
    window.showSpinner?.();
    const qs       = getFilterQueryString();
    const filename = getExportFilename('policies_filtered');
    await api.downloadCSV(`/export/policies/csv${qs}`, `${filename}.csv`);
    window.hideSpinner?.();
    window.showToast('Policies exported successfully!', 'success');
  } catch (error) {
    window.hideSpinner?.();
    window.showToast(`Export failed: ${error.message}`, 'error');
  }
}

async function exportFilteredPoliciesExcel() {
  try {
    window.showSpinner?.();
    const qs       = getFilterQueryString();
    const filename = getExportFilename('policies_filtered');
    await api.download(`/export/policies/excel${qs}`, `${filename}.xlsx`);
    window.hideSpinner?.();
    window.showToast('Policies exported successfully!', 'success');
  } catch (error) {
    window.hideSpinner?.();
    window.showToast(`Export failed: ${error.message}`, 'error');
  }
}

async function exportFilteredPoliciesPDF() {
  try {
    window.showSpinner?.();
    const qs       = getFilterQueryString();
    const filename = getExportFilename('policies_filtered');
    await api.download(`/export/policies/pdf${qs}`, `${filename}.html`);
    window.hideSpinner?.();
    window.showToast('Policies exported successfully!', 'success');
  } catch (error) {
    window.hideSpinner?.();
    window.showToast(`Export failed: ${error.message}`, 'error');
  }
}

// ─── EMAIL EXPORT ─────────────────────────────────────────

async function emailPoliciesExport() {
  const emailInput = document.getElementById('export-email');
  const email      = emailInput?.value.trim();

  if (!email) {
    window.showToast('Please enter an email address', 'warning');
    emailInput?.focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    window.showToast('Please enter a valid email address', 'warning');
    return;
  }

  try {
    window.showSpinner?.();
    const token = localStorage.getItem('insura_token');

    // ✅ FIX: getEmailQueryString(email) use karo
    // Yeh sahi URL banata hai:
    // /api/export/policies/email?email=abc@gmail.com&status=EXPIRED
    // ❌ Pehle galat tha:
    // /api/export/policies/email?email=abc@gmail.com?status=EXPIRED  ← double ?
    const qs  = getEmailQueryString(email);
    const url = api.buildUrl(`/export/policies/email${qs}`);

    console.log('📧 Email export URL:', url); // debug ke liye

    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json'
      }
    });

    window.hideSpinner?.();

    if (response.ok) {
      const msg = await response.text();
      window.showToast(`✅ ${msg}`, 'success');
    } else {
      // ✅ Error response properly parse karo
      let errMsg = 'Email failed. Try downloading instead.';
      try {
        const text = await response.text();
        if (text) errMsg = text;
      } catch (_) {}
      window.showToast(errMsg, 'warning');
    }
  } catch (error) {
    window.hideSpinner?.();
    console.error('Email export error:', error);
    window.showToast('Email service unavailable. Try downloading instead.', 'warning');
  }
}

// ─── FILENAME HELPER ──────────────────────────────────────

function getExportFilename(prefix) {
  const now = new Date();
  const y   = now.getFullYear();
  const mo  = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  const h   = String(now.getHours()).padStart(2, '0');
  const mi  = String(now.getMinutes()).padStart(2, '0');
  const s   = String(now.getSeconds()).padStart(2, '0');

  let filterSuffix = '';
  if (exportFilters.status)                               filterSuffix += `_${exportFilters.status}`;
  if (exportFilters.paymentStatus)                        filterSuffix += `_${exportFilters.paymentStatus}`;
  if (exportFilters.companyId)                            filterSuffix += `_company`;
  if (exportFilters.insuranceTypeId)                      filterSuffix += `_type`;
  if (exportFilters.startDate || exportFilters.endDate)   filterSuffix += `_daterange`;

  return `${prefix}${filterSuffix}_${y}-${mo}-${d}_${h}-${mi}-${s}`;
}

// ─── GLOBAL EXPORTS ───────────────────────────────────────

window.loadExport                  = loadExport;
window.emailPoliciesExport         = emailPoliciesExport;
window.applyExportFilters          = applyExportFilters;
window.clearExportFilters          = clearExportFilters;
window.exportFilteredPoliciesCSV   = exportFilteredPoliciesCSV;
window.exportFilteredPoliciesExcel = exportFilteredPoliciesExcel;
window.exportFilteredPoliciesPDF   = exportFilteredPoliciesPDF;

console.log('✅ Export module loaded — URL query string bug fixed');