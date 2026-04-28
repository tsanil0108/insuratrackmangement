// policies.js — Complete Policies Module with File Upload/Download/View
// ✅ FIX 1: Renew button only on EXPIRING_SOON (not EXPIRED)
// ✅ FIX 2: Renew form locks Company, Insurance Type, Insurance Item
// ✅ FIX 3: Date fields show dd/mm/yyyy
// ✅ FIX 4: Document viewer uses blob-fetch (JWT auth) — fixes broken image preview
// ✅ FIX 5: Removed "Remaining" card from Payment Details
// ✅ FIX 6: Fully responsive
// ✅ FIX 7: Renew API integration (calls /renew endpoint)

let policiesData = [];
let policyFilter = 'all';
let _policySubmitting = false;
let _renewingFromId = null;

// Date filter variables
let activeDateFilter = { start: '', end: '' };
let expiringDateFilter = { start: '', end: '' };
let expiredDateFilter = { start: '', end: '' };

// ═══════════════════════════════════════════════════════════
// DATE HELPERS — dd/mm/yyyy ↔ yyyy-mm-dd
// ═══════════════════════════════════════════════════════════

function toDisplayDate(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function toISODate(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  if (ddmmyyyy.includes('-')) return ddmmyyyy;
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return ddmmyyyy;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function setCustomDateValue(id, isoVal) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = isoVal ? toDisplayDate(isoVal) : '';
}

function getCustomDateValue(id) {
  const el = document.getElementById(id);
  if (!el || !el.value) return '';
  return toISODate(el.value);
}

window._formatDateInput = function (input) {
  let raw = input.value.replace(/\D/g, '').slice(0, 8);
  let out = '';
  if (raw.length > 4) out = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
  else if (raw.length > 2) out = raw.slice(0, 2) + '/' + raw.slice(2);
  else out = raw;
  input.value = out;
};

window._validateDateInput = function (input) {
  if (!input.value) { input.style.borderColor = ''; return; }
  const ok = /^\d{2}\/\d{2}\/\d{4}$/.test(input.value);
  input.style.borderColor = ok ? '' : 'var(--red, #ef4444)';
  input.title = ok ? '' : 'Format: dd/mm/yyyy';
};

function _makeDateInput(id, placeholder) {
  return `<input type="text" id="${id}"
    placeholder="${placeholder || 'dd/mm/yyyy'}"
    oninput="window._formatDateInput(this)"
    onblur="window._validateDateInput(this)"
    maxlength="10"
    autocomplete="off"
    style="font-variant-numeric:tabular-nums;">`;
}

// ═══════════════════════════════════════════════════════════
// STATUS CALCULATOR
// ═══════════════════════════════════════════════════════════

function calculatePolicyStatus(policy) {
  if (policy.status && (policy.status === 'RENEWED' || policy.status === 'CANCELLED')) {
    return policy.status;
  }
  const endDate = policy.endDate;
  if (!endDate) return 'ACTIVE';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

// ═══════════════════════════════════════════════════════════
// LOAD
// ═══════════════════════════════════════════════════════════

async function loadPolicies() {
  const isAdmin = authUtils?.isAdmin() || false;
  const data = await api.get('v1/policies');

  policiesData = (data || []).map(policy => ({
    ...policy,
    status: calculatePolicyStatus(policy)
  }));

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Policies</h2>
        <p class="text-muted" id="policies-count">${policiesData.length} policies</p>
      </div>
      <div class="flex items-center gap-8" style="flex-wrap:wrap;">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="policy-search" placeholder="Search by policy number, company...">
        </div>
        ${isAdmin ? `
        <div style="position:relative;" id="export-dropdown-wrapper">
          <button class="btn btn-ghost" onclick="window.toggleExportMenu(event)"
            style="display:flex;align-items:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div id="export-menu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;
            background:var(--bg-card);border:1px solid var(--border);border-radius:8px;
            min-width:180px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.12);overflow:hidden;">
            <div style="padding:6px 0;">
              <div style="padding:4px 12px 2px;font-size:10px;color:var(--text-muted);
                text-transform:uppercase;letter-spacing:.05em;">All Policies</div>
              <button class="export-item" onclick="window.doExport('policies','csv')">📄 CSV</button>
              <button class="export-item" onclick="window.doExport('policies','excel')">📊 Excel</button>
              <button class="export-item" onclick="window.doExport('policies','pdf')">📑 HTML Report</button>
              <div style="height:1px;background:var(--border);margin:4px 0;"></div>
              <div style="padding:4px 12px 2px;font-size:10px;color:var(--red,#ef4444);
                text-transform:uppercase;letter-spacing:.05em;">Export by Status</div>
              <button class="export-item" onclick="window.exportByStatus('ACTIVE')" style="color:var(--green,#10b981);">🟢 Active CSV</button>
              <button class="export-item" onclick="window.exportByStatus('EXPIRING_SOON')" style="color:var(--yellow,#f59e0b);">🟡 Expiring Soon CSV</button>
              <button class="export-item" onclick="window.exportByStatus('EXPIRED')" style="color:var(--red,#ef4444);">🔴 Expired CSV</button>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="window.openPolicyModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Policy
        </button>` : ''}
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs">
      <div class="tab active" onclick="window.filterPolicies(this,'all')">All</div>
      <div class="tab" onclick="window.filterPolicies(this,'ACTIVE')">
        <span style="color:var(--green);">●</span> Active
      </div>
      <div class="tab" onclick="window.filterPolicies(this,'EXPIRING_SOON')">
        <span style="color:var(--yellow);">●</span> Expiring Soon
      </div>
      <div class="tab" onclick="window.filterPolicies(this,'EXPIRED')">
        <span style="color:var(--red);">●</span> Expired
      </div>
    </div>

    <!-- DATE FILTER PANEL -->
    <div id="date-filter-panel" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin:16px 0;display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:13px;font-weight:600;">📅 Filter by End Date:</span>
          <input type="date" id="filter-start-date" style="height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--border);">
          <span>to</span>
          <input type="date" id="filter-end-date" style="height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--border);">
          <button class="btn btn-primary btn-sm" onclick="window.applyDateFilter()">Apply</button>
          <button class="btn btn-ghost btn-sm" onclick="window.clearDateFilter()">Clear</button>
        </div>
        <div id="filter-status-badge" style="font-size:12px;color:var(--text-muted);"></div>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Policy Number</th><th>Company</th><th>Provider</th><th>Type</th>
            <th>Premium</th><th>Paid</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="policies-tbody">
          ${renderPolicyRows(policiesData, isAdmin)}
        </tbody>
      </table>
    </div>

    <div id="policy-detail-panel" style="display:none;margin-top:24px;">
      <div class="section-header" style="margin-bottom:16px;">
        <h3 class="section-title" style="font-size:16px;">Policy Details</h3>
        <button class="btn btn-ghost btn-sm" onclick="window.closeDetailPanel()">✕ Close</button>
      </div>
      <div id="policy-detail-content"></div>
    </div>
  `;

  injectStyles();
  createDocumentViewerModal();
  document.removeEventListener('click', _closeExportOnOutside);
  document.addEventListener('click', _closeExportOnOutside);

  const si = document.getElementById('policy-search');
  if (si) si.addEventListener('input', filterPoliciesTable);

  if (isAdmin) buildPolicyModal();
}

// ═══════════════════════════════════════════════════════════
// EXPORT BY STATUS
// ═══════════════════════════════════════════════════════════

window.exportByStatus = function (status) {
  const filtered = policiesData.filter(p => p.status === status);
  if (!filtered.length) { window.showToast(`No ${status} policies found`, 'warning'); return; }
  const statusNames = { 'ACTIVE': 'Active', 'EXPIRING_SOON': 'Expiring_Soon', 'EXPIRED': 'Expired' };
  const headers = ['Policy Number', 'Company', 'Provider', 'Insurance Type', 'Premium', 'Paid Amount', 'Start Date', 'End Date', 'Status'];
  const rows = filtered.map(p => [p.policyNumber || '', p.companyName || '', p.providerName || '', p.insuranceTypeName || '', p.premiumAmount || 0, p.amountPaid || 0, p.startDate || '', p.endDate || '', p.status || '']);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${statusNames[status]}_Policies_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  window.showToast(`${filtered.length} ${status} policies exported!`, 'success');
  const menu = document.getElementById('export-menu');
  if (menu) menu.style.display = 'none';
};

// ═══════════════════════════════════════════════════════════
// DATE FILTER FUNCTIONS
// ═══════════════════════════════════════════════════════════

window.applyDateFilter = function () {
  const startDate = document.getElementById('filter-start-date')?.value || '';
  const endDate   = document.getElementById('filter-end-date')?.value   || '';
  if (policyFilter === 'ACTIVE')             activeDateFilter   = { start: startDate, end: endDate };
  else if (policyFilter === 'EXPIRING_SOON') expiringDateFilter = { start: startDate, end: endDate };
  else if (policyFilter === 'EXPIRED')       expiredDateFilter  = { start: startDate, end: endDate };
  filterPoliciesTable();
  const badge = document.getElementById('filter-status-badge');
  if (badge && (startDate || endDate)) badge.textContent = `Filter: ${startDate || 'any'} to ${endDate || 'any'}`;
};

window.clearDateFilter = function () {
  const startInput = document.getElementById('filter-start-date');
  const endInput   = document.getElementById('filter-end-date');
  if (startInput) startInput.value = '';
  if (endInput)   endInput.value   = '';
  if (policyFilter === 'ACTIVE')             activeDateFilter   = { start: '', end: '' };
  else if (policyFilter === 'EXPIRING_SOON') expiringDateFilter = { start: '', end: '' };
  else if (policyFilter === 'EXPIRED')       expiredDateFilter  = { start: '', end: '' };
  const badge = document.getElementById('filter-status-badge');
  if (badge) badge.textContent = '';
  filterPoliciesTable();
};

function getDateFilterForCurrentTab() {
  if (policyFilter === 'ACTIVE')        return activeDateFilter;
  if (policyFilter === 'EXPIRING_SOON') return expiringDateFilter;
  if (policyFilter === 'EXPIRED')       return expiredDateFilter;
  return { start: '', end: '' };
}

function applyDateFilterToPolicies(policies) {
  const dateFilter = getDateFilterForCurrentTab();
  if (!dateFilter.start && !dateFilter.end) return policies;
  return policies.filter(policy => {
    const endDate = policy.endDate || '';
    if (!endDate) return false;
    let matches = true;
    if (dateFilter.start && endDate < dateFilter.start) matches = false;
    if (dateFilter.end   && endDate > dateFilter.end)   matches = false;
    return matches;
  });
}

// ═══════════════════════════════════════════════════════════
// STYLES — including responsive
// ═══════════════════════════════════════════════════════════

function injectStyles() {
  if (document.getElementById('pol-styles')) return;
  const s = document.createElement('style');
  s.id = 'pol-styles';
  s.textContent = `
    .export-item{display:block;width:100%;text-align:left;padding:8px 16px;background:none;border:none;
      color:var(--text-primary);font-size:13px;cursor:pointer;transition:background .2s;}
    .export-item:hover{background:var(--bg-hover);}
    .btn-renew{background:rgba(59,130,246,0.15);color:#3b82f6;
      border:1px solid rgba(59,130,246,0.35);font-weight:600;}
    .btn-renew:hover{background:rgba(59,130,246,0.28);}
    .pol-section-title{grid-column:1/-1;font-size:11px;font-weight:700;
      text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);
      padding:10px 0 4px;border-bottom:1px solid var(--border);margin-top:8px;}
    .renew-banner{display:flex;align-items:center;gap:12px;
      background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.28);
      border-radius:10px;padding:14px 16px;margin-bottom:20px;font-size:13px;}
    .pay-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;
      border-radius:20px;font-size:11px;font-weight:600;}
    .pay-badge-paid{background:rgba(16,185,129,0.12);color:var(--green,#10b981);}
    .pay-badge-partial{background:rgba(245,158,11,0.12);color:var(--yellow,#f59e0b);}
    .pay-badge-unpaid{background:rgba(148,163,184,0.12);color:var(--text-muted);}
    .upload-zone{border:2px dashed var(--border);border-radius:10px;padding:16px;
      text-align:center;cursor:pointer;background:var(--bg-surface);position:relative;
      transition:border-color .2s,background .2s;}
    .upload-zone:hover{border-color:var(--accent);background:rgba(99,102,241,0.04);}
    .upload-zone.has-file{border-color:var(--green);background:rgba(16,185,129,0.04);}
    .upload-zone input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
    #pol-insurance-item-group{transition:opacity .2s;}
    .doc-list{display:flex;flex-direction:column;gap:8px;}
    .doc-item{display:flex;align-items:center;justify-content:space-between;
      padding:10px 12px;background:var(--bg-surface);border:1px solid var(--border);
      border-radius:8px;margin-bottom:6px;gap:8px;}
    .doc-upload-loading{display:flex;align-items:center;gap:8px;padding:12px;
      background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;
      font-size:13px;color:var(--text-muted);}
    .field-locked{opacity:0.62 !important;cursor:not-allowed !important;
      background:var(--bg-elevated,#f3f4f6) !important;}
    .locked-badge{display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;
      background:rgba(99,102,241,0.12);color:var(--accent);margin-left:6px;font-weight:600;
      vertical-align:middle;}
    .detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:22px;}
    .detail-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px;}
    .detail-card-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;}
    .detail-card-value{font-size:14px;color:var(--text-primary);}
    .payment-section{background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:16px;}
    .payment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;}
    .doc-actions{display:flex;gap:8px;flex-shrink:0;}

    /* ── RESPONSIVE ──────────────────────────────────────────── */
    @media (max-width: 900px) {
      .section-header{flex-direction:column;align-items:flex-start;gap:12px;}
      .section-header > div:last-child{width:100%;}
      .search-bar{width:100%;}
      .search-bar input{width:100%;}
    }
    @media (max-width: 768px) {
      .tabs{overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch;padding-bottom:4px;}
      .table-wrapper{overflow-x:auto;-webkit-overflow-scrolling:touch;}
      .data-table{min-width:700px;}
      .modal-content{width:98vw !important;max-width:98vw !important;
        margin:4px auto !important;max-height:96vh !important;}
      .form-grid{grid-template-columns:1fr !important;}
      .pol-section-title{grid-column:1 !important;}
      .detail-grid{grid-template-columns:repeat(2,1fr) !important;}
      .payment-grid{grid-template-columns:repeat(2,1fr) !important;}
      .doc-item{flex-direction:column;align-items:flex-start;}
      .doc-item .doc-actions{width:100%;justify-content:flex-start;}
      .renew-banner{flex-direction:column;align-items:flex-start;}
      #date-filter-panel .flex{flex-direction:column;align-items:flex-start;}
      #export-menu{right:auto;left:0;}
    }
    @media (max-width: 480px) {
      .detail-grid{grid-template-columns:1fr !important;}
      .payment-grid{grid-template-columns:1fr !important;}
      .btn{font-size:12px;padding:6px 10px;}
      .modal-body{padding:12px !important;}
      .modal-footer{flex-direction:column;gap:8px;}
      .modal-footer .btn{width:100%;text-align:center;}
      .doc-actions{flex-wrap:wrap;}
      .doc-actions .btn{flex:1;min-width:80px;text-align:center;}
    }
  `;
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT VIEWER MODAL — blob-fetch for JWT auth images
// ═══════════════════════════════════════════════════════════

function createDocumentViewerModal() {
  if (document.getElementById('doc-viewer-modal')) return;
  const modal = document.createElement('div');
  modal.id        = 'doc-viewer-modal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:960px;width:95vw;max-height:92vh;display:flex;flex-direction:column;">
      <div class="modal-header" style="flex-shrink:0;">
        <h3 id="doc-viewer-title" style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80%;">Document Viewer</h3>
        <button class="modal-close" onclick="window.closeDocumentViewer()">&times;</button>
      </div>
      <div class="modal-body" style="flex:1;overflow:auto;padding:0;background:#111827;">
        <div id="doc-viewer-content" style="width:100%;height:100%;min-height:520px;
          display:flex;align-items:center;justify-content:center;"></div>
      </div>
      <div class="modal-footer" style="flex-shrink:0;">
        <button class="btn btn-primary" id="doc-viewer-download-btn">⬇️ Download</button>
        <button class="btn btn-ghost" onclick="window.closeDocumentViewer()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.closeDocumentViewer = function () {
  const modal   = document.getElementById('doc-viewer-modal');
  const content = document.getElementById('doc-viewer-content');
  if (content) {
    const img    = content.querySelector('img');
    const iframe = content.querySelector('iframe');
    if (img    && img.src.startsWith('blob:'))    URL.revokeObjectURL(img.src);
    if (iframe && iframe.src.startsWith('blob:')) { URL.revokeObjectURL(iframe.src); iframe.src = ''; }
    content.innerHTML = '';
  }
  if (modal) modal.style.display = 'none';
};

window.viewDocument = async function (docId, fileName, docType, policyId, fileType) {
  createDocumentViewerModal();
  const modal       = document.getElementById('doc-viewer-modal');
  const title       = document.getElementById('doc-viewer-title');
  const content     = document.getElementById('doc-viewer-content');
  const downloadBtn = document.getElementById('doc-viewer-download-btn');

  const icon = docType === 'PAYMENT_SLIP' ? '💰' : '📄';
  if (title) title.textContent = `${icon} ${fileName}`;

  if (content) content.innerHTML = `
    <div style="color:#fff;padding:40px;text-align:center;">
      <div style="font-size:36px;margin-bottom:14px;">⏳</div>
      <div style="font-size:14px;opacity:.7;">Loading document...</div>
    </div>`;

  modal.style.display = 'flex';

  const apiUrl = window.api.buildUrl(`v1/policies/${policyId}/documents/${docId}/download`);
  const token  = localStorage.getItem('insura_token');

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  const isPDF   = /\.pdf$/i.test(fileName);

  let blobUrl = null;

  try {
    const res = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const blob = await res.blob();
    blobUrl = URL.createObjectURL(blob);

    if (isImage) {
      content.innerHTML = `
        <div style="padding:20px;text-align:center;width:100%;">
          <img src="${blobUrl}"
            style="max-width:100%;max-height:72vh;border-radius:8px;
              box-shadow:0 4px 24px rgba(0,0,0,0.5);object-fit:contain;"
            alt="${window.escapeHtml(fileName)}">
        </div>`;
    } else if (isPDF) {
      content.innerHTML = `
        <iframe src="${blobUrl}#toolbar=1&navpanes=1"
          style="width:100%;height:76vh;border:none;display:block;"
          title="${window.escapeHtml(fileName)}">
        </iframe>`;
    } else {
      const ext = fileName.split('.').pop().toUpperCase();
      content.innerHTML = `
        <div style="padding:56px 32px;text-align:center;color:#fff;">
          <div style="font-size:64px;margin-bottom:20px;">📄</div>
          <div style="font-size:17px;font-weight:600;margin-bottom:8px;">${window.escapeHtml(fileName)}</div>
          <div style="font-size:13px;opacity:.65;margin-bottom:28px;">
            .${ext} files cannot be previewed in the browser
          </div>
          <button class="btn btn-primary" id="doc-fallback-dl-btn">⬇️ Download to View</button>
        </div>`;
      const fallbackBtn = document.getElementById('doc-fallback-dl-btn');
      if (fallbackBtn && blobUrl) {
        fallbackBtn.onclick = () => {
          const a = document.createElement('a'); a.href = blobUrl; a.download = fileName;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };
      }
    }

    if (downloadBtn) {
      const newBtn = downloadBtn.cloneNode(true);
      downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
      newBtn.onclick = () => {
        const a = document.createElement('a'); a.href = blobUrl; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      };
    }

  } catch (e) {
    console.error('viewDocument error:', e);
    if (content) content.innerHTML = `
      <div style="color:#fff;padding:40px;text-align:center;">
        <div style="font-size:36px;margin-bottom:14px;">⚠️</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;">Could not load document</div>
        <div style="font-size:13px;opacity:.6;margin-bottom:24px;">${e.message}</div>
        <button class="btn btn-primary"
          onclick="window.${docType === 'PAYMENT_SLIP' ? 'downloadPaymentSlip' : 'downloadPolicyDocument'}('${policyId}','${docId}')">
          ⬇️ Try Download Instead
        </button>
      </div>`;
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════

function toggleExportMenu(e) {
  e.stopPropagation();
  const m = document.getElementById('export-menu');
  if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

function _closeExportOnOutside(e) {
  const w = document.getElementById('export-dropdown-wrapper');
  if (w && !w.contains(e.target)) {
    const m = document.getElementById('export-menu');
    if (m) m.style.display = 'none';
  }
}

function _exportFileName(prefix, ext) {
  const n = new Date();
  return `${prefix}_${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}.${ext}`;
}

async function doExport(type, format) {
  const m = document.getElementById('export-menu');
  if (m) m.style.display = 'none';
  const ext = format === 'csv' ? 'csv' : format === 'excel' ? 'xlsx' : 'html';
  try {
    if (format === 'csv') await api.downloadCSV(`export/${type}/csv`, _exportFileName(type, 'csv'));
    else await api.download(`export/${type}/${format}`, _exportFileName(type, ext));
  } catch (err) { window.showToast(`Export failed: ${err.message}`, 'error'); }
}

async function exportExpiredPolicies(format) {
  const m = document.getElementById('export-menu');
  if (m) m.style.display = 'none';
  try {
    if (format === 'csv') await api.downloadCSV(`export/policies/expired/csv`, _exportFileName('expired_policies', 'csv'));
    else await api.download(`export/policies/expired/excel`, _exportFileName('expired_policies', 'xlsx'));
  } catch (err) {
    const expired = policiesData.filter(p => p.status === 'EXPIRED');
    if (!expired.length) { window.showToast('No expired policies found', 'warning'); return; }
    _downloadExpiredCSV(expired);
  }
}

function _downloadExpiredCSV(policies) {
  const headers = ['Policy Number','Company','Provider','Insurance Type','Premium','Paid Amount','Start Date','End Date','Status'];
  const rows    = policies.map(p => [p.policyNumber||'',p.companyName||'',p.providerName||'',p.insuranceTypeName||'',p.premiumAmount||0,p.amountPaid||0,p.startDate||'',p.endDate||'',p.status||'']);
  const csv     = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const blob    = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const a       = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = _exportFileName('expired_policies','csv');
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  window.showToast('Expired policies exported!','success');
}

// ═══════════════════════════════════════════════════════════
// PAYMENT BADGE
// ═══════════════════════════════════════════════════════════

function paymentBadge(policy) {
  const premium = policy.premiumAmount || 0;
  const paid    = policy.amountPaid    || 0;
  if (policy.paid || (paid >= premium && premium > 0)) {
    return `<span class="pay-badge pay-badge-paid">✓ Paid (₹${window.fmt.currency(paid)})</span>`;
  } else if (paid > 0) {
    const pct = Math.round((paid / premium) * 100);
    return `<span class="pay-badge pay-badge-partial">⬤ ${pct}% (₹${window.fmt.currency(paid)})</span>`;
  } else {
    return `<span class="pay-badge pay-badge-unpaid">○ Unpaid</span>`;
  }
}

// ═══════════════════════════════════════════════════════════
// RENEW HELPER
// ═══════════════════════════════════════════════════════════

function _isAlreadyRenewed(policy) {
  if (!policy) return false;
  return policiesData.some(p =>
    p.id !== policy.id && p.renewedFromPolicyId === policy.id
  );
}

// ═══════════════════════════════════════════════════════════
// RENDER ROWS
// ═══════════════════════════════════════════════════════════

function renderPolicyRows(data, isAdmin) {
  if (!data.length) {
    return `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-muted);">
      No policies found${getDateFilterForCurrentTab().start || getDateFilterForCurrentTab().end ? ' matching the date filter' : ''}</td></tr>`;
  }
  return data.map(policy => {
    const canRenew   = isAdmin && policy.status === 'EXPIRING_SOON' && !_isAlreadyRenewed(policy);
    const safePN     = (policy.policyNumber || '').replace(/'/g, "\\'");
    const isExpiring = policy.status === 'EXPIRING_SOON';
    const isExpired  = policy.status === 'EXPIRED';

    return `
    <tr style="cursor:pointer;${isExpiring ? 'background:rgba(245,158,11,0.03);' : ''}${isExpired ? 'background:rgba(239,68,68,0.03);' : ''}">
      <td onclick="window.showPolicyDetail('${policy.id}')">
        <div style="display:flex;align-items:center;gap:6px;">
          ${isExpiring ? '<span title="Expiring Soon" style="font-size:14px;">⚠️</span>' : ''}
          ${isExpired  ? '<span title="Expired"       style="font-size:14px;">🔴</span>' : ''}
          <span class="mono" style="color:var(--accent);font-weight:600;">${window.escapeHtml(policy.policyNumber) || 'N/A'}</span>
        </div>
      </td>
      <td onclick="window.showPolicyDetail('${policy.id}')">${window.escapeHtml(policy.companyName)       || '—'}</td>
      <td onclick="window.showPolicyDetail('${policy.id}')">${window.escapeHtml(policy.providerName)      || '—'}</td>
      <td onclick="window.showPolicyDetail('${policy.id}')">${window.escapeHtml(policy.insuranceTypeName) || '—'}</td>
      <td onclick="window.showPolicyDetail('${policy.id}')"><strong class="mono">${window.fmt.currency(policy.premiumAmount || 0)}</strong></td>
      <td onclick="window.showPolicyDetail('${policy.id}')">${paymentBadge(policy)}</td>
      <td onclick="window.showPolicyDetail('${policy.id}')">
        ${policy.startDate ? window.fmt.date(policy.startDate) : '<span class="text-muted">—</span>'}
      </td>
      <td onclick="window.showPolicyDetail('${policy.id}')">
        ${policy.endDate
          ? `<span style="${isExpired ? 'color:var(--red);font-weight:600;' : isExpiring ? 'color:var(--yellow);font-weight:600;' : ''}">${window.fmt.date(policy.endDate)}</span>`
          : '<span class="text-muted">—</span>'}
      </td>
      <td onclick="window.showPolicyDetail('${policy.id}')">${window.statusBadge(policy.status)}</td>
      <td>
        <div class="flex gap-8" style="flex-wrap:wrap;">
          ${canRenew ? `<button class="btn btn-renew btn-sm"
            onclick="event.stopPropagation();window.renewPolicy('${policy.id}')"
            title="Renew this policy">🔄 Renew</button>` : ''}
          ${isAdmin ? `
          <button class="btn btn-ghost btn-sm"
            onclick="event.stopPropagation();window.editPolicy('${policy.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm"
            onclick="event.stopPropagation();window.deletePolicy('${policy.id}','${window.escapeHtml(safePN)}')">🗑 Delete</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function exportSinglePolicy(policyId) {
  const policy = policiesData.find(p => p.id === policyId);
  if (!policy) { window.showToast('Policy not found', 'error'); return; }
  _downloadExpiredCSV([policy]);
}

// ═══════════════════════════════════════════════════════════
// RENEW POLICY
// ═══════════════════════════════════════════════════════════

window.renewPolicy = async function (oldPolicyId) {
  const oldPolicy = policiesData.find(p => p.id === oldPolicyId) || await api.get(`v1/policies/${oldPolicyId}`);
  if (!oldPolicy) { window.showToast('Policy not found', 'error'); return; }

  buildPolicyModal();
  _policySubmitting = false;
  _renewingFromId   = oldPolicyId;
  _resetPolicyForm();

  const titleEl = document.querySelector('#policy-modal .modal-header h3');
  if (titleEl) titleEl.textContent = '🔄 Renew Policy';

  const banner = document.getElementById('pol-renew-banner');
  if (banner) {
    banner.style.display = 'flex';
    banner.innerHTML = `
      <span style="font-size:22px;">🔄</span>
      <div style="flex:1;">
        <strong style="color:#3b82f6;">Renewing Policy:</strong>
        <span style="color:var(--text-secondary);margin-left:6px;font-size:13px;">
          Old: <strong class="mono">${window.escapeHtml(oldPolicy.policyNumber)}</strong> —
          Enter a <strong>NEW policy number</strong> below.
        </span>
        <div style="margin-top:5px;font-size:12px;color:var(--text-muted);">
          🔒 Company, Insurance Type and Insurance Item are locked on renewal.
        </div>
      </div>`;
  }

  const numEl = document.getElementById('pol-number');
  if (numEl) {
    numEl.value       = '';
    numEl.placeholder = 'Enter NEW policy number (required)';
    numEl.style.borderColor = '#3b82f6';
    numEl.disabled    = false;
  }

  const sv = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  sv('pol-premium',     oldPolicy.premiumAmount);
  sv('pol-sum-insured', oldPolicy.sumInsured);
  sv('pol-reference',   oldPolicy.description);

  const freqEl = document.getElementById('pol-frequency');
  if (freqEl && oldPolicy.premiumFrequency) freqEl.value = oldPolicy.premiumFrequency;

  if (oldPolicy.endDate) {
    try {
      const oldEnd   = new Date(oldPolicy.endDate + 'T00:00:00');
      const newStart = new Date(oldEnd); newStart.setDate(newStart.getDate() + 1);
      const newEnd   = new Date(oldEnd); newEnd.setFullYear(newEnd.getFullYear() + 1);
      setCustomDateValue('pol-start-date', newStart.toISOString().split('T')[0]);
      setCustomDateValue('pol-end-date',   newEnd.toISOString().split('T')[0]);
    } catch (_) {}
  }

  await _waitForDropdowns(['pol-company', 'pol-type', 'pol-provider', 'pol-hypothecation']);
  const setDd = (id, val) => { if (!val) return; const el = document.getElementById(id); if (el) el.value = val; };
  setDd('pol-company',       oldPolicy.companyId);
  setDd('pol-type',          oldPolicy.insuranceTypeId);
  setDd('pol-provider',      oldPolicy.providerId);
  setDd('pol-hypothecation', oldPolicy.hypothecationId);

  if (oldPolicy.insuranceTypeId) {
    await loadInsuranceItemsForType(oldPolicy.insuranceTypeId);
    if (oldPolicy.insuranceItemId) {
      const itemEl = document.getElementById('pol-insurance-item');
      if (itemEl) itemEl.value = oldPolicy.insuranceItemId;
    }
  }

  const _lock = (id, labelText) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = true;
    el.classList.add('field-locked');
    el.title = labelText;
    const label = el.closest('.form-group')?.querySelector('label');
    if (label && !label.querySelector('.locked-badge')) {
      label.insertAdjacentHTML('beforeend', '<span class="locked-badge">🔒 Locked</span>');
    }
  };
  _lock('pol-company',        'Company cannot be changed on renewal');
  _lock('pol-type',           'Insurance Type cannot be changed on renewal');

  const itemGroup = document.getElementById('pol-insurance-item-group');
  if (itemGroup) itemGroup.style.display = 'block';
  _lock('pol-insurance-item', 'Insurance Item cannot be changed on renewal');

  const btn = document.getElementById('pol-submit-btn');
  if (btn) { btn.disabled = false; btn.textContent = '🔄 Create Renewed Policy'; }

  setTimeout(() => document.getElementById('pol-number')?.focus(), 300);
  window.openModal('policy-modal');
};

// ═══════════════════════════════════════════════════════════
// INSURANCE ITEM CASCADE
// ═══════════════════════════════════════════════════════════

async function loadInsuranceItemsForType(typeId) {
  const group  = document.getElementById('pol-insurance-item-group');
  const select = document.getElementById('pol-insurance-item');
  if (!group || !select) return;
  if (!typeId) { group.style.display = 'none'; select.innerHTML = '<option value="">Select item...</option>'; return; }
  select.innerHTML = '<option value="">Loading...</option>';
  group.style.display = 'block';
  try {
    const items    = await api.get(`v1/insurance-items?typeId=${typeId}`) || [];
    const filtered = items.filter
      ? items.filter(i => i.active !== false && (i.insuranceType?.id === typeId || i.insuranceTypeId === typeId))
      : items;
    select.innerHTML = filtered.length
      ? '<option value="">Select item (optional)</option>' + filtered.map(i => `<option value="${i.id}">${window.escapeHtml(i.name)}</option>`).join('')
      : '<option value="">No items for this type</option>';
  } catch (e) { select.innerHTML = '<option value="">Could not load items</option>'; }
}

// ═══════════════════════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════════════════════

let _currentDetailPolicyId = null;

async function showPolicyDetail(id) {
  _currentDetailPolicyId = id;
  const policy = policiesData.find(p => p.id === id);
  if (policy) policy.status = calculatePolicyStatus(policy);
  const updatedPolicy = policy || await api.get(`v1/policies/${id}`);
  if (!updatedPolicy) return;

  const isAdmin   = authUtils?.isAdmin() || false;
  const canRenew  = isAdmin && updatedPolicy.status === 'EXPIRING_SOON' && !_isAlreadyRenewed(updatedPolicy);
  const isExpired = updatedPolicy.status === 'EXPIRED';

  let policyDocs  = [];
  let paymentSlip = null;
  try {
    const documents = await api.get(`v1/policies/${id}/documents`) || [];
    policyDocs  = documents.filter(d => d.docType === 'POLICY_DOCUMENT');
    paymentSlip = documents.find(d => d.docType === 'PAYMENT_SLIP') || null;
  } catch (e) { console.warn('Could not load documents:', e); }

  const content = document.getElementById('policy-detail-content');
  if (!content) return;

  const paidPct = updatedPolicy.premiumAmount > 0
    ? Math.round(((updatedPolicy.amountPaid || 0) / updatedPolicy.premiumAmount) * 100) : 0;

  content.innerHTML = `
    <div class="detail-grid">
      ${_dCard('Policy Number',  `<span class="mono" style="color:var(--accent)">${window.escapeHtml(updatedPolicy.policyNumber)}</span>`)}
      ${_dCard('Company',        window.escapeHtml(updatedPolicy.companyName)       || '—')}
      ${_dCard('Provider',       window.escapeHtml(updatedPolicy.providerName)      || '—')}
      ${_dCard('Insurance Type', window.escapeHtml(updatedPolicy.insuranceTypeName) || '—')}
      ${updatedPolicy.insuranceItemName ? _dCard('Insurance Item', window.escapeHtml(updatedPolicy.insuranceItemName)) : ''}
      ${_dCard('Status',         window.statusBadge(updatedPolicy.status))}
      ${_dCard('Premium Freq.',  (updatedPolicy.premiumFrequency || 'ANNUALLY').replace(/_/g,' '))}
      ${_dCard('Premium Amount', `<strong class="mono">${window.fmt.currency(updatedPolicy.premiumAmount || 0)}</strong>`)}
      ${_dCard('Sum Insured',    `<strong class="mono">${window.fmt.currency(updatedPolicy.sumInsured    || 0)}</strong>`)}
      ${_dCard('Start Date',     updatedPolicy.startDate ? window.fmt.date(updatedPolicy.startDate) : '—')}
      ${_dCard('End Date',       updatedPolicy.endDate
          ? `<span style="${isExpired ? 'color:var(--red);font-weight:700;' : ''}">${window.fmt.date(updatedPolicy.endDate)}</span>` : '—')}
      ${_dCard('Hypothecation',  window.escapeHtml(updatedPolicy.hypothecationName) || (updatedPolicy.hypothecationId ? '✅ Yes' : '❌ No'))}
      ${_dCard('Reference',      window.escapeHtml(updatedPolicy.description)       || '<span class="text-muted">—</span>')}
    </div>

    <div class="payment-section">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:14px;">💰 Payment Details</div>
      <div class="payment-grid">
        ${_dCard('Amount Paid',    `<strong class="mono" style="color:var(--green);">${window.fmt.currency(updatedPolicy.amountPaid || 0)}</strong>`)}
        ${_dCard('Payment Status', paymentBadge(updatedPolicy))}
        ${updatedPolicy.paidDate         ? _dCard('Paid Date',     window.fmt.date(updatedPolicy.paidDate)) : ''}
        ${updatedPolicy.paymentMode      ? _dCard('Payment Mode',  updatedPolicy.paymentMode.replace(/_/g,' ')) : ''}
        ${updatedPolicy.paymentReference ? _dCard('Reference No.', `<span class="mono">${window.escapeHtml(updatedPolicy.paymentReference)}</span>`) : ''}
      </div>
      ${updatedPolicy.premiumAmount > 0 ? `
      <div style="margin-top:12px;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">Payment Progress</div>
        <div style="background:var(--bg-elevated);border-radius:6px;height:8px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(100,paidPct)}%;background:${paidPct>=100?'var(--green)':paidPct>0?'var(--yellow)':'var(--border)'};border-radius:6px;transition:width .5s;"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${paidPct}% paid</div>
      </div>` : ''}

      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);">💰 Payment Slip</div>
          ${isAdmin ? `
          <label class="btn btn-primary btn-sm" style="cursor:pointer;background:var(--green);">
            📎 ${paymentSlip ? 'Replace Slip' : 'Upload Slip'}
            <input type="file" accept="image/*,.pdf" style="display:none;"
              onchange="window.uploadPaymentSlip('${updatedPolicy.id}',this)">
          </label>` : ''}
        </div>
        <div id="payment-slip-container">
          ${paymentSlip
            ? renderPaymentSlip(paymentSlip, updatedPolicy.id)
            : '<div style="text-align:center;padding:20px;color:var(--text-muted);">No payment slip uploaded</div>'}
        </div>
      </div>
    </div>

    <div class="payment-section">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);">
          📄 Policy Documents
          <span id="doc-count-badge" style="font-size:11px;font-weight:600;background:var(--accent-soft);color:var(--accent);padding:1px 8px;border-radius:10px;margin-left:6px;">
            ${policyDocs.length}
          </span>
        </div>
        ${isAdmin ? `
        <label class="btn btn-primary btn-sm" style="cursor:pointer;">
          ⬆️ Upload Document
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="display:none;"
            onchange="window.uploadPolicyDocument('${updatedPolicy.id}',this)">
        </label>` : ''}
      </div>
      <div id="policy-docs-list" class="doc-list">
        ${renderDocumentList(policyDocs, updatedPolicy.id, isAdmin)}
      </div>
    </div>

    ${canRenew ? `
    <div class="renew-banner">
      <span style="font-size:28px;">🔄</span>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:14px;color:#3b82f6;margin-bottom:3px;">⚠️ This policy is expiring soon.</div>
        <div style="font-size:12px;color:var(--text-muted);">Click Renew to create a new policy based on this one.</div>
      </div>
      <button class="btn btn-renew" onclick="window.renewPolicy('${updatedPolicy.id}')">🔄 Renew Policy</button>
    </div>` : ''}

    ${isExpired && isAdmin ? `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
      <button class="btn btn-sm" style="background:var(--red-soft);color:var(--red);border:1px solid rgba(239,68,68,.3);"
        onclick="window.exportSinglePolicy('${updatedPolicy.id}')">📥 Export This Policy (CSV)</button>
    </div>` : ''}
  `;

  const panel = document.getElementById('policy-detail-panel');
  if (panel) { panel.style.display = 'block'; panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

// ═══════════════════════════════════════════════════════════
// REFRESH DOCUMENT SECTIONS
// ═══════════════════════════════════════════════════════════

async function _refreshDocumentSections(policyId) {
  try {
    const documents = await api.get(`v1/policies/${policyId}/documents`) || [];
    const policyDocs  = documents.filter(d => d.docType === 'POLICY_DOCUMENT');
    const paymentSlip = documents.find(d => d.docType === 'PAYMENT_SLIP') || null;
    const isAdmin     = authUtils?.isAdmin() || false;

    const slipContainer = document.getElementById('payment-slip-container');
    if (slipContainer) slipContainer.innerHTML = paymentSlip
      ? renderPaymentSlip(paymentSlip, policyId)
      : '<div style="text-align:center;padding:20px;color:var(--text-muted);">No payment slip uploaded</div>';

    const docsList = document.getElementById('policy-docs-list');
    if (docsList) docsList.innerHTML = renderDocumentList(policyDocs, policyId, isAdmin);

    const badge = document.getElementById('doc-count-badge');
    if (badge) badge.textContent = policyDocs.length;
  } catch (e) { console.warn('_refreshDocumentSections error:', e); }
}

// ═══════════════════════════════════════════════════════════
// RENDER HELPERS
// ═══════════════════════════════════════════════════════════

function renderPaymentSlip(slip, policyId) {
  const fileType     = slip.fileType || '';
  const isImage      = fileType.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(slip.fileName || '');
  const safeFileName = (slip.fileName || '').replace(/'/g, "\\'");
  return `
    <div class="doc-item">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
        <div style="font-size:32px;flex-shrink:0;">${isImage ? '🖼️' : '📑'}</div>
        <div style="min-width:0;">
          <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${window.escapeHtml(slip.fileName)}
          </div>
          <div style="font-size:11px;color:var(--text-muted);">${_fileSize(slip.fileSize)}</div>
        </div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-ghost btn-sm"
          onclick="window.viewDocument('${slip.id}','${safeFileName}','PAYMENT_SLIP','${policyId}','${fileType}')">
          👁️ View
        </button>
        <button class="btn btn-primary btn-sm"
          onclick="window.downloadPaymentSlip('${policyId}','${slip.id}')">
          ⬇️ Download
        </button>
      </div>
    </div>`;
}

function renderDocumentList(docs, policyId, isAdmin) {
  if (!docs.length) return `
    <div style="text-align:center;padding:24px;color:var(--text-muted);">
      <div style="font-size:24px;margin-bottom:8px;">📂</div>No documents uploaded yet
    </div>`;
  return docs.map(doc => {
    const safeFileName = (doc.fileName || '').replace(/'/g, "\\'");
    return `
    <div class="doc-item">
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
        <span style="font-size:20px;flex-shrink:0;">${_fileIcon(doc.fileType)}</span>
        <div style="min-width:0;">
          <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.escapeHtml(doc.fileName)}</div>
          <div style="font-size:11px;color:var(--text-muted);">${_fileSize(doc.fileSize)}</div>
        </div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-ghost btn-sm"
          onclick="window.viewDocument('${doc.id}','${safeFileName}','POLICY_DOCUMENT','${policyId}','${doc.fileType}')">
          👁️ View
        </button>
        <button class="btn btn-primary btn-sm"
          onclick="window.downloadPolicyDocument('${policyId}','${doc.id}')">
          ⬇️ Download
        </button>
        ${isAdmin ? `<button class="btn btn-danger btn-sm"
          onclick="window.deletePolicyDocument('${policyId}','${doc.id}')">🗑 Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function _fileIcon(fileType) {
  if (!fileType) return '📄';
  if (fileType.includes('pdf'))   return '📑';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('word') || fileType.includes('doc')) return '📝';
  return '📄';
}

function _fileSize(bytes) {
  if (!bytes)          return '';
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ═══════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════

window.uploadPaymentSlip = async function (policyId, input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { window.showToast('Payment slip must be under 5MB', 'error'); input.value = ''; return; }
  const slipContainer = document.getElementById('payment-slip-container');
  if (slipContainer) slipContainer.innerHTML = `<div class="doc-upload-loading"><span style="font-size:20px;">⏳</span><span>Uploading <strong>${window.escapeHtml(file.name)}</strong>...</span></div>`;
  const formData = new FormData();
  formData.append('file', file); formData.append('docType', 'PAYMENT_SLIP');
  try {
    const token = localStorage.getItem('insura_token');
    const res   = await fetch(window.api.buildUrl(`v1/policies/${policyId}/documents`), { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
    if (res.ok) { window.showToast('✅ Payment slip uploaded!', 'success'); await _refreshDocumentSections(policyId); }
    else { const err = await res.json().catch(() => ({})); window.showToast(err.message || 'Upload failed', 'error'); if (slipContainer) slipContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No payment slip uploaded</div>'; }
  } catch (e) { window.showToast('Upload failed', 'error'); if (slipContainer) slipContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No payment slip uploaded</div>'; }
  input.value = '';
};

window.uploadPolicyDocument = async function (policyId, input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { window.showToast('File size must be under 10MB', 'error'); input.value = ''; return; }
  const docsList = document.getElementById('policy-docs-list');
  if (docsList) { const d = document.createElement('div'); d.id = 'doc-upload-temp'; d.className = 'doc-upload-loading'; d.innerHTML = `<span style="font-size:20px;">⏳</span><span>Uploading <strong>${window.escapeHtml(file.name)}</strong>...</span>`; docsList.prepend(d); }
  const formData = new FormData();
  formData.append('file', file); formData.append('docType', 'POLICY_DOCUMENT');
  try {
    const token = localStorage.getItem('insura_token');
    const res   = await fetch(window.api.buildUrl(`v1/policies/${policyId}/documents`), { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
    if (res.ok) { window.showToast('✅ Document uploaded!', 'success'); await _refreshDocumentSections(policyId); }
    else { const err = await res.json().catch(() => ({})); window.showToast(err.message || 'Upload failed', 'error'); document.getElementById('doc-upload-temp')?.remove(); }
  } catch (e) { window.showToast('Upload failed', 'error'); document.getElementById('doc-upload-temp')?.remove(); }
  input.value = '';
};

// ═══════════════════════════════════════════════════════════
// DOWNLOAD / DELETE
// ═══════════════════════════════════════════════════════════

window.downloadPaymentSlip = async function (policyId, docId) {
  try {
    window.showSpinner();
    const token = localStorage.getItem('insura_token');
    const res   = await fetch(window.api.buildUrl(`v1/policies/${policyId}/documents/${docId}/download`), { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const cd   = res.headers.get('Content-Disposition');
    let filename = 'payment-slip';
    if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m) filename = m[1]; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    window.hideSpinner(); window.showToast('Payment slip downloaded!', 'success');
  } catch (e) { window.hideSpinner(); window.showToast('Download failed', 'error'); }
};

window.downloadPolicyDocument = async function (policyId, docId) {
  try {
    window.showSpinner();
    const token = localStorage.getItem('insura_token');
    const res   = await fetch(window.api.buildUrl(`v1/policies/${policyId}/documents/${docId}/download`), { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const cd   = res.headers.get('Content-Disposition');
    let filename = 'document';
    if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m) filename = m[1]; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    window.hideSpinner(); window.showToast('Downloaded!', 'success');
  } catch (e) { window.hideSpinner(); window.showToast('Download failed', 'error'); }
};

window.deletePolicyDocument = async function (policyId, docId) {
  if (!confirm('Delete this document?')) return;
  try {
    const deletedBy = localStorage.getItem('insura_email') || 'admin';
    const result    = await api.del(`v1/policies/${policyId}/documents/${docId}?deletedBy=${deletedBy}`);
    if (result !== null) { window.showToast('Document deleted', 'success'); await _refreshDocumentSections(policyId); }
  } catch (e) { window.showToast('Delete failed', 'error'); }
};

// ═══════════════════════════════════════════════════════════
// POLICY MODAL
// ═══════════════════════════════════════════════════════════

function buildPolicyModal() {
  if (document.getElementById('policy-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'policy-modal'; modal.className = 'modal'; modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:900px;">
      <div class="modal-header">
        <h3>Add Policy</h3>
        <button class="modal-close" id="policy-modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div id="pol-renew-banner" class="renew-banner" style="display:none;"></div>
        <div class="form-grid" style="grid-template-columns:repeat(2,1fr);gap:16px;">

          <div class="pol-section-title">📄 Policy Details</div>

          <div class="form-group">
            <label>Policy Number <span style="color:var(--red)">*</span></label>
            <input type="text" id="pol-number" placeholder="e.g. POL-2025-001">
          </div>
          <div class="form-group">
            <label>Company <span style="color:var(--red)">*</span></label>
            <select id="pol-company"></select>
          </div>
          <div class="form-group">
            <label>Insurance Type <span style="color:var(--red)">*</span></label>
            <select id="pol-type" onchange="window._onTypeChange(this.value)"></select>
          </div>
          <div class="form-group" id="pol-insurance-item-group" style="display:none;">
            <label>Insurance Item</label>
            <select id="pol-insurance-item"><option value="">Select item (optional)</option></select>
            <small style="color:var(--text-muted);font-size:11px;">Based on selected insurance type</small>
          </div>
          <div class="form-group">
            <label>Provider <span style="color:var(--red)">*</span></label>
            <select id="pol-provider"></select>
          </div>
          <div class="form-group">
            <label>Hypothecation</label>
            <select id="pol-hypothecation"><option value="">None</option></select>
          </div>
          <div class="form-group">
            <label>Premium Frequency <span style="color:var(--red)">*</span></label>
            <select id="pol-frequency">
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half Yearly</option>
              <option value="ANNUALLY" selected>Annually</option>
              <option value="ONETIMEPAYMENT">One Time Payment</option>
            </select>
          </div>
          <div class="form-group">
            <label>Premium Amount (₹) <span style="color:var(--red)">*</span></label>
            <input type="number" id="pol-premium" placeholder="5000" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Sum Insured (₹)</label>
            <input type="number" id="pol-sum-insured" placeholder="100000" min="0" step="0.01">
          </div>

          <div class="form-group">
            <label>Start Date</label>
            ${_makeDateInput('pol-start-date')}
          </div>
          <div class="form-group">
            <label>End Date</label>
            ${_makeDateInput('pol-end-date')}
          </div>

          <div class="form-group" style="grid-column:1/-1;">
            <label>Reference / Notes</label>
            <input type="text" id="pol-reference" placeholder="Reference number or notes">
          </div>

          <div class="pol-section-title">💰 Payment Details</div>

          <div class="form-group">
            <label>Amount Paid (₹)</label>
            <input type="number" id="pol-amount-paid" placeholder="0.00" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Payment Date</label>
            ${_makeDateInput('pol-paid-date')}
          </div>
          <div class="form-group">
            <label>Payment Mode</label>
            <select id="pol-payment-mode">
              <option value="">Select mode</option>
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="CREDIT_CARD">Credit Card</option>
            </select>
          </div>
          <div class="form-group">
            <label>Transaction / Reference No.</label>
            <input type="text" id="pol-payment-reference" placeholder="UTR / Cheque / Transaction ID">
          </div>
          <div class="form-group" style="grid-column:1/-1;">
            <label>Payment Slip / Receipt</label>
            <div class="upload-zone" id="pol-slip-zone">
              <input type="file" id="pol-payment-slip" accept="image/*,.pdf" onchange="window._onSlipChange(this)">
              <div id="pol-slip-label">
                <div style="font-size:24px;margin-bottom:6px;">📎</div>
                <div style="font-size:13px;color:var(--text-muted);">Click to upload payment slip (image or PDF)</div>
              </div>
            </div>
          </div>

          <div class="pol-section-title">📄 Policy Document</div>

          <div class="form-group" style="grid-column:1/-1;">
            <label>Policy Document (Optional)</label>
            <div class="upload-zone" id="pol-doc-zone">
              <input type="file" id="pol-policy-doc" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onchange="window._onPolicyDocChange(this)">
              <div id="pol-doc-label">
                <div style="font-size:24px;margin-bottom:6px;">📋</div>
                <div style="font-size:13px;color:var(--text-muted);">Upload policy document (PDF, Image, DOC)</div>
              </div>
            </div>
          </div>

        </div>
        <input type="hidden" id="pol-id">
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="policy-modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="pol-submit-btn">Save Policy</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('policy-modal-close-btn').onclick  = () => window.closePolicyModal();
  document.getElementById('policy-modal-cancel-btn').onclick = () => window.closePolicyModal();
  document.getElementById('pol-submit-btn').onclick          = () => window.submitPolicy();
  window.loadDropdown('pol-company',       'v1/companies',       'name');
  window.loadDropdown('pol-type',          'v1/insurance-types', 'name');
  window.loadDropdown('pol-provider',      'v1/providers',       'name');
  window.loadDropdown('pol-hypothecation', 'v1/hypothecations',  'bankName');
}

window.closePolicyModal = function () {
  const modal = document.getElementById('policy-modal');
  if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; document.body.classList.remove('modal-open'); }
  _resetPolicyForm();
  _policySubmitting = false;
  _renewingFromId = null;
};

window._onTypeChange = async function (typeId) { await loadInsuranceItemsForType(typeId); };

window._onSlipChange = function (input) {
  const zone = document.getElementById('pol-slip-zone'); const label = document.getElementById('pol-slip-label');
  if (input.files?.[0]) {
    zone?.classList.add('has-file');
    if (label) label.innerHTML = `<div style="font-size:20px;margin-bottom:4px;">✅</div><div style="font-size:12px;color:var(--green);font-weight:600;">${input.files[0].name}</div><div style="font-size:11px;color:var(--text-muted);">${(input.files[0].size/1024).toFixed(1)} KB</div>`;
  } else {
    zone?.classList.remove('has-file');
    if (label) label.innerHTML = `<div style="font-size:24px;margin-bottom:6px;">📎</div><div style="font-size:13px;color:var(--text-muted);">Click to upload payment slip (image or PDF)</div>`;
  }
};

window._onPolicyDocChange = function (input) {
  const zone = document.getElementById('pol-doc-zone'); const label = document.getElementById('pol-doc-label');
  if (input.files?.[0]) {
    zone?.classList.add('has-file');
    if (label) label.innerHTML = `<div style="font-size:20px;margin-bottom:4px;">✅</div><div style="font-size:12px;color:var(--green);font-weight:600;">${input.files[0].name}</div><div style="font-size:11px;color:var(--text-muted);">${(input.files[0].size/1024).toFixed(1)} KB</div>`;
  } else {
    zone?.classList.remove('has-file');
    if (label) label.innerHTML = `<div style="font-size:24px;margin-bottom:6px;">📋</div><div style="font-size:13px;color:var(--text-muted);">Upload policy document (PDF, Image, DOC)</div>`;
  }
};

function _resetPolicyForm() {
  ['pol-number','pol-premium','pol-sum-insured','pol-reference','pol-id','pol-amount-paid','pol-payment-reference']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['pol-start-date','pol-end-date','pol-paid-date']
    .forEach(id => { const el = document.getElementById(id); if (el) { el.value = ''; el.style.borderColor = ''; } });

  const fr = document.getElementById('pol-frequency');    if (fr) fr.value = 'ANNUALLY';
  const hy = document.getElementById('pol-hypothecation'); if (hy) hy.value = '';
  const pm = document.getElementById('pol-payment-mode'); if (pm) pm.value = '';

  ['pol-company','pol-type','pol-insurance-item'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = false; el.classList.remove('field-locked'); el.style.opacity = ''; el.style.cursor = ''; el.title = '';
    el.closest('.form-group')?.querySelectorAll('.locked-badge').forEach(b => b.remove());
  });

  const slipInput = document.getElementById('pol-payment-slip'); if (slipInput) slipInput.value = '';
  const slipZone  = document.getElementById('pol-slip-zone');    if (slipZone)  slipZone.classList.remove('has-file');
  const slipLabel = document.getElementById('pol-slip-label');
  if (slipLabel) slipLabel.innerHTML = `<div style="font-size:24px;margin-bottom:6px;">📎</div><div style="font-size:13px;color:var(--text-muted);">Click to upload payment slip (image or PDF)</div>`;

  const docInput = document.getElementById('pol-policy-doc'); if (docInput) docInput.value = '';
  const docZone  = document.getElementById('pol-doc-zone');   if (docZone)  docZone.classList.remove('has-file');
  const docLabel = document.getElementById('pol-doc-label');
  if (docLabel) docLabel.innerHTML = `<div style="font-size:24px;margin-bottom:6px;">📋</div><div style="font-size:13px;color:var(--text-muted);">Upload policy document (PDF, Image, DOC)</div>`;

  const itemGroup  = document.getElementById('pol-insurance-item-group'); if (itemGroup)  itemGroup.style.display = 'none';
  const itemSelect = document.getElementById('pol-insurance-item');       if (itemSelect) itemSelect.innerHTML = '<option value="">Select item (optional)</option>';
  const banner     = document.getElementById('pol-renew-banner');         if (banner)     banner.style.display = 'none';
}

async function openPolicyModal(id = null) {
  buildPolicyModal();
  _policySubmitting = false; 
  _renewingFromId = null;
  _resetPolicyForm();
  const titleEl = document.querySelector('#policy-modal .modal-header h3');
  if (titleEl) titleEl.textContent = id ? 'Edit Policy' : 'Add Policy';
  const btn = document.getElementById('pol-submit-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Save Policy'; }

  if (id) {
    const policy = await api.get(`v1/policies/${id}`);
    if (policy) {
      document.getElementById('pol-id').value                = id;
      document.getElementById('pol-number').value            = policy.policyNumber || '';
      document.getElementById('pol-premium').value           = policy.premiumAmount || '';
      document.getElementById('pol-sum-insured').value       = policy.sumInsured    || '';
      document.getElementById('pol-reference').value         = policy.description   || '';
      document.getElementById('pol-amount-paid').value       = policy.amountPaid    || '';
      document.getElementById('pol-payment-reference').value = policy.paymentReference || '';
      setCustomDateValue('pol-start-date', policy.startDate);
      setCustomDateValue('pol-end-date',   policy.endDate);
      setCustomDateValue('pol-paid-date',  policy.paidDate);
      const fr = document.getElementById('pol-frequency');    if (fr && policy.premiumFrequency) fr.value = policy.premiumFrequency;
      const pm = document.getElementById('pol-payment-mode'); if (pm && policy.paymentMode)     pm.value = policy.paymentMode;
      await _waitForDropdowns(['pol-company','pol-type','pol-provider','pol-hypothecation']);
      const setDd = (elId, val) => { if (!val) return; const el = document.getElementById(elId); if (el) el.value = val; };
      setDd('pol-company',       policy.companyId);
      setDd('pol-type',          policy.insuranceTypeId);
      setDd('pol-provider',      policy.providerId);
      setDd('pol-hypothecation', policy.hypothecationId);
      if (policy.insuranceTypeId) {
        await loadInsuranceItemsForType(policy.insuranceTypeId);
        if (policy.insuranceItemId) { const el = document.getElementById('pol-insurance-item'); if (el) el.value = policy.insuranceItemId; }
      }
    }
  }
  window.openModal('policy-modal');
}

function _waitForDropdowns(ids, maxMs = 3000) {
  return new Promise(resolve => {
    const start = Date.now();
    (function check() {
      const ok = ids.every(id => { const el = document.getElementById(id); return el && el.options.length > 0; });
      if (ok || Date.now() - start > maxMs) return resolve();
      setTimeout(check, 50);
    })();
  });
}

// ═══════════════════════════════════════════════════════════
// FIELD-LEVEL VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════

function _fieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--red, #ef4444)';
  el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.15)';
  const existing = el.parentNode.querySelector('.pol-field-error');
  if (existing) existing.remove();
  const errDiv = document.createElement('div');
  errDiv.className = 'pol-field-error';
  errDiv.style.cssText = 'color:#ef4444;font-size:11px;margin-top:4px;display:flex;align-items:center;gap:4px;font-weight:500;';
  errDiv.innerHTML = `<span>⚠</span> ${msg}`;
  el.parentNode.appendChild(errDiv);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function _fieldOk(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '';
  el.style.boxShadow   = '';
  el.parentNode.querySelector('.pol-field-error')?.remove();
}

function _clearAllFieldErrors() {
  document.querySelectorAll('#policy-modal .pol-field-error').forEach(e => e.remove());
  ['pol-number','pol-company','pol-type','pol-provider','pol-frequency','pol-premium',
   'pol-start-date','pol-end-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });
}

function _attachFieldClearListeners() {
  const fields = ['pol-number','pol-company','pol-type','pol-provider','pol-frequency','pol-premium',
                  'pol-start-date','pol-end-date'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el || el._errorListenerAttached) return;
    el.addEventListener('input',  () => _fieldOk(id));
    el.addEventListener('change', () => _fieldOk(id));
    el._errorListenerAttached = true;
  });
}

// ═══════════════════════════════════════════════════════════
// SUBMIT POLICY — with renewal API integration
// ═══════════════════════════════════════════════════════════

async function submitPolicy() {
  if (_policySubmitting) return;
  _clearAllFieldErrors();
  _attachFieldClearListeners();

  const id           = document.getElementById('pol-id')?.value?.trim();
  const policyNumber = document.getElementById('pol-number')?.value?.trim();
  const isRenewal    = _renewingFromId !== null;

  // Collect values
  const body = {
    policyNumber,
    companyId:        document.getElementById('pol-company')?.value?.trim(),
    insuranceTypeId:  document.getElementById('pol-type')?.value?.trim(),
    insuranceItemId:  document.getElementById('pol-insurance-item')?.value?.trim() || null,
    providerId:       document.getElementById('pol-provider')?.value?.trim(),
    hypothecationId:  document.getElementById('pol-hypothecation')?.value?.trim()  || null,
    premiumAmount:    parseFloat(document.getElementById('pol-premium')?.value)      || 0,
    sumInsured:       parseFloat(document.getElementById('pol-sum-insured')?.value)  || 0,
    startDate:        getCustomDateValue('pol-start-date') || null,
    endDate:          getCustomDateValue('pol-end-date')   || null,
    description:      document.getElementById('pol-reference')?.value?.trim()        || '',
    premiumFrequency: document.getElementById('pol-frequency')?.value?.trim(),
    amountPaid:       parseFloat(document.getElementById('pol-amount-paid')?.value)  || 0,
    paidDate:         getCustomDateValue('pol-paid-date') || null,
    paymentMode:      document.getElementById('pol-payment-mode')?.value?.trim()     || null,
    paymentReference: document.getElementById('pol-payment-reference')?.value?.trim() || null,
  };
  body.paid = body.amountPaid >= body.premiumAmount && body.premiumAmount > 0;

  // Validation
  let hasError = false;

  if (!policyNumber) {
    _fieldError('pol-number', 'Policy number is required');
    hasError = true;
  } else if (!isRenewal && !id) {
    const duplicate = policiesData.find(
      p => p.policyNumber?.trim().toLowerCase() === policyNumber.toLowerCase()
        && p.id !== id
    );
    if (duplicate) {
      _fieldError('pol-number', `Policy number "${policyNumber}" already exists.`);
      hasError = true;
    }
  }

  if (!body.companyId) { _fieldError('pol-company', 'Please select a company'); hasError = true; }
  if (!body.insuranceTypeId) { _fieldError('pol-type', 'Please select an insurance type'); hasError = true; }
  if (!body.providerId) { _fieldError('pol-provider', 'Please select a provider'); hasError = true; }
  if (!body.premiumFrequency) { _fieldError('pol-frequency', 'Please select a premium frequency'); hasError = true; }
  if (!body.premiumAmount || body.premiumAmount <= 0) { _fieldError('pol-premium', 'Premium amount must be greater than 0'); hasError = true; }
  if (!body.startDate) { _fieldError('pol-start-date', 'Start date is required'); hasError = true; }
  if (!body.endDate) { _fieldError('pol-end-date', 'End date is required'); hasError = true; }
  if (body.startDate && body.endDate && body.endDate <= body.startDate) { _fieldError('pol-end-date', 'End date must be after start date'); hasError = true; }

  if (hasError) {
    const firstErr = document.querySelector('#policy-modal .pol-field-error');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Submit
  _policySubmitting = true;
  const btn = document.getElementById('pol-submit-btn');
  const origText = btn?.textContent || 'Save Policy';
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    window.showSpinner();
    const slipFile = document.getElementById('pol-payment-slip')?.files?.[0];
    const policyDocFile = document.getElementById('pol-policy-doc')?.files?.[0];
    const token = localStorage.getItem('insura_token');

    let policyResult;
    let url;
    let method;

    if (isRenewal) {
      // Use renewal endpoint
      url = window.api.buildUrl(`v1/policies/${_renewingFromId}/renew`);
      method = 'POST';
    } else if (id) {
      url = window.api.buildUrl(`v1/policies/${id}`);
      method = 'PUT';
    } else {
      url = window.api.buildUrl('v1/policies');
      method = 'POST';
    }

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errMsg = isRenewal ? 'Renewal failed' : (id ? 'Update failed' : 'Creation failed');
      try {
        const errJson = await res.json();
        errMsg = errJson.message || errJson.error || errMsg;
      } catch (_) {}
      
      if (errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('duplicate')) {
        _fieldError('pol-number', `❌ Policy number "${policyNumber}" already exists.`);
        window.hideSpinner();
        return;
      }
      throw new Error(errMsg);
    }

    policyResult = await res.json();
    const policyId = policyResult.id;

    // Upload documents
    if (slipFile && token) {
      const fd = new FormData();
      fd.append('file', slipFile);
      fd.append('docType', 'PAYMENT_SLIP');
      await fetch(window.api.buildUrl(`v1/policies/${policyId}/documents`), {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd
      }).catch(e => console.warn('Slip upload failed:', e));
    }
    
    if (policyDocFile && token) {
      const fd = new FormData();
      fd.append('file', policyDocFile);
      fd.append('docType', 'POLICY_DOCUMENT');
      await fetch(window.api.buildUrl(`v1/policies/${policyId}/documents`), {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd
      }).catch(e => console.warn('Doc upload failed:', e));
    }

    window.hideSpinner();
    const successMsg = isRenewal ? '✅ Policy renewed successfully!' : (id ? '✅ Policy updated!' : '✅ Policy created!');
    window.showToast(successMsg, 'success');
    window.closePolicyModal();
    await loadPolicies();
    
    if (policyId) {
      setTimeout(() => window.showPolicyDetail?.(policyId), 300);
    }
  } catch (err) {
    window.hideSpinner();
    window.showToast(err.message || 'Failed to save policy', 'error');
  } finally {
    _policySubmitting = false;
    _renewingFromId = null;
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function editPolicy(id) { await openPolicyModal(id); }

async function deletePolicy(id, policyNumber) {
  if (!confirm(`Delete policy "${policyNumber}"? This cannot be undone.`)) return;
  try {
    window.showSpinner();
    const deletedBy = localStorage.getItem('insura_email') || 'admin';
    await api.del(`v1/policies/${id}?deletedBy=${deletedBy}`);
    window.hideSpinner(); 
    window.showToast(`Policy "${policyNumber}" deleted!`, 'success');
    await loadPolicies();
  } catch (err) { 
    window.hideSpinner(); 
    window.showToast(err.message || 'Failed to delete policy', 'error'); 
  }
}

// ═══════════════════════════════════════════════════════════
// FILTER / SEARCH
// ═══════════════════════════════════════════════════════════

function filterPolicies(tab, status) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  policyFilter = status;
  closeDetailPanel();
  const filterPanel = document.getElementById('date-filter-panel');
  if (filterPanel) {
    filterPanel.style.display = status !== 'all' ? 'block' : 'none';
    const badge = document.getElementById('filter-status-badge');
    if (badge) badge.textContent =
      status === 'ACTIVE'        ? 'Active Policies — Filter by End Date'  :
      status === 'EXPIRING_SOON' ? 'Expiring Soon — Filter by End Date'    :
      status === 'EXPIRED'       ? 'Expired Policies — Filter by End Date' : '';
    const saved = getDateFilterForCurrentTab();
    const si    = document.getElementById('filter-start-date'); if (si) si.value = saved.start;
    const ei    = document.getElementById('filter-end-date');   if (ei) ei.value = saved.end;
  }
  filterPoliciesTable();
}

function filterPoliciesTable() {
  policiesData = policiesData.map(p => ({ ...p, status: calculatePolicyStatus(p) }));
  const term    = (document.getElementById('policy-search')?.value || '').toLowerCase();
  const isAdmin = authUtils?.isAdmin() || false;
  let filtered  = policiesData;
  if (policyFilter !== 'all') filtered = filtered.filter(p => p.status === policyFilter);
  filtered = applyDateFilterToPolicies(filtered);
  if (term) filtered = filtered.filter(p =>
    (p.policyNumber      || '').toLowerCase().includes(term) ||
    (p.companyName       || '').toLowerCase().includes(term) ||
    (p.providerName      || '').toLowerCase().includes(term) ||
    (p.insuranceTypeName || '').toLowerCase().includes(term)
  );
  const tbody = document.getElementById('policies-tbody');
  if (tbody) tbody.innerHTML = renderPolicyRows(filtered, isAdmin);
  closeDetailPanel();
  const c = document.getElementById('policies-count');
  if (c) c.textContent = `${filtered.length} policies`;
}

function closeDetailPanel() {
  const p = document.getElementById('policy-detail-panel');
  if (p) p.style.display = 'none';
  _currentDetailPolicyId = null;
}

function _dCard(label, value) {
  return `<div class="detail-card">
    <div class="detail-card-label">${label}</div>
    <div class="detail-card-value">${value}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// GLOBAL EXPORTS
// ═══════════════════════════════════════════════════════════

window.loadPolicies              = loadPolicies;
window.filterPolicies            = filterPolicies;
window.filterPoliciesTable       = filterPoliciesTable;
window.showPolicyDetail          = showPolicyDetail;
window.closeDetailPanel          = closeDetailPanel;
window.editPolicy                = editPolicy;
window.deletePolicy              = deletePolicy;
window.openPolicyModal           = openPolicyModal;
window.submitPolicy              = submitPolicy;
window.renewPolicy               = renewPolicy;
window.toggleExportMenu          = toggleExportMenu;
window.doExport                  = doExport;
window.exportExpiredPolicies     = exportExpiredPolicies;
window.exportSinglePolicy        = exportSinglePolicy;
window.exportByStatus            = exportByStatus;
window.loadInsuranceItemsForType = loadInsuranceItemsForType;
window.uploadPaymentSlip         = uploadPaymentSlip;
window.uploadPolicyDocument      = uploadPolicyDocument;
window.downloadPolicyDocument    = downloadPolicyDocument;
window.downloadPaymentSlip       = downloadPaymentSlip;
window.deletePolicyDocument      = deletePolicyDocument;
window.viewDocument              = viewDocument;
window.closeDocumentViewer       = closeDocumentViewer;
window.closePolicyModal          = closePolicyModal;
window.applyDateFilter           = applyDateFilter;
window.clearDateFilter           = clearDateFilter;

console.log('✅ Policies loaded | Renew API integrated | Blob-fetch viewer | Fully responsive');