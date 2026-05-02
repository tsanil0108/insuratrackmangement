// companies.js — Companies Module (FINAL MERGED + FULLY ENHANCED)
// ✅ Fixed CSS (company-specific classes)
// ✅ Phone validation (10 digits)
// ✅ Table sorted ascending by policy number
// ✅ NO Remaining column anywhere (table, PDF, CSV)
// ✅ Status cards: ACTIVE / EXPIRING SOON / EXPIRED
// ✅ Graph: Insurance Type horizontal bar + detail table
// ✅ Graph: Payment Status cards + donut with center label
// ✅ Graph: Year-wise Analytics (grouped bar + mini cards)
// ✅ Graph: Status-wise Premium & Payment bar
// ✅ Graph: Monthly Payment Trend
// ✅ Graph: Premium Distribution by Type
// ✅ Graph: Insurance Items — by type bar, active/inactive donut, items table
// ✅ Address column in company table
// ✅ Graph filter bar (date + status)
// ✅ Export CSV + PDF (no Remaining column)
// ✅ Pincode auto-fill
// ✅ Soft-delete (recycle bin)
// ✅ FIX: Insurance Items graph — uses /all endpoint (active + inactive)
// ✅ FIX: Type matching by ID first, name as fallback
// ✅ FIX: Items with NULL insuranceType are always shown (not filtered out)
// ✅ FIX: /all endpoint failure properly caught + fallback to /v1/insurance-items
// ✅ FIX: calculatePolicyStatus() recalculates status client-side so EXPIRED policies
//         show correctly even if backend hasn't updated them yet

'use strict';

let currentCompanyId   = null;
let currentCompanyName = null;
let currentView        = 'table';
let currentPoliciesData  = [];
let currentAnalyticsData = null;

// ─── STATUS CALCULATOR (same logic as policies.js) ────────
// This is the KEY FIX: always recalculate status from endDate
// instead of trusting the stale value stored in the backend.

function calculatePolicyStatus(policy) {
  // Preserve terminal statuses that aren't date-driven
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
  if (diffDays < 0)  return 'EXPIRED';
  if (diffDays <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

// Apply recalculated status to a policy array
function recalcStatuses(policies) {
  return (policies || []).map(p => ({
    ...p,
    status: calculatePolicyStatus(p)
  }));
}

// ─── STYLES ───────────────────────────────────────────────

function addCompanyStyles() {
  if (document.getElementById('company-module-styles')) return;
  const style = document.createElement('style');
  style.id = 'company-module-styles';
  style.textContent = `
    .co-card {
      background: var(--bg-surface,#fff);
      border: 1px solid var(--border,#e5e7eb);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      transition: transform .18s, box-shadow .18s;
    }
    .co-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.08); }

    .co-filter-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      background: var(--bg-surface,#fff);
      border: 1px solid var(--border,#e5e7eb);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .co-input {
      height: 32px;
      padding: 0 8px;
      border-radius: 7px;
      border: 1px solid var(--border,#ddd);
      background: var(--bg,#fff);
      color: var(--text-primary,#1a2035);
      font-size: 12px;
      font-family: inherit;
    }
    .co-input:focus { outline: none; border-color: var(--accent,#3b82f6); box-shadow: 0 0 0 2px rgba(59,130,246,.12); }

    .co-table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border,#e5e7eb); }
    .co-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .co-table th {
      padding: 11px 10px;
      background: var(--bg-elevated,#f8fafc);
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--text-muted,#6b7280);
      border-bottom: 2px solid var(--border,#e5e7eb);
      white-space: nowrap;
    }
    .co-table td { padding: 10px; border-bottom: 1px solid var(--border,#f0f0f0); vertical-align: middle; }
    .co-table tbody tr:hover { background: var(--bg-hover,#f9fafb); }
    .co-table tbody tr { cursor: pointer; }

    .co-address-cell { max-width: 200px; }
    .co-address-line1 {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary,#1a2035);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 190px;
    }
    .co-address-line2 {
      font-size: 11px;
      color: var(--text-muted,#6b7280);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 190px;
    }

    .co-badge-active   { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(16,185,129,.12);color:#10b981; }
    .co-badge-expiring { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(245,158,11,.12);color:#f59e0b; }
    .co-badge-expired  { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(239,68,68,.12);color:#ef4444; }

    .co-prog-bar  { width:100%;height:6px;background:var(--border,#e5e7eb);border-radius:3px;overflow:hidden; }
    .co-prog-fill { height:100%;border-radius:3px;transition:width .3s; }

    .co-graph-header {
      background: linear-gradient(135deg,var(--accent,#3b82f6) 0%,#6366f1 100%);
      border-radius: 14px;
      padding: 22px 26px;
      margin-bottom: 20px;
      color: #fff;
    }
    .co-chart-card {
      background: var(--bg-surface,#fff);
      border: 1px solid var(--border,#e5e7eb);
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 16px;
    }
    .co-chart-title    { font-size:13px;font-weight:700;margin-bottom:3px;color:var(--text-primary,#1a2035); }
    .co-chart-subtitle { font-size:11px;color:var(--text-muted,#6b7280);margin-bottom:14px; }

    .co-pay-card { border-radius:10px;padding:10px 8px;text-align:center; }
    .co-pay-label { font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px; }
    .co-pay-count { font-size:22px;font-weight:800;line-height:1.1; }
    .co-pay-amt   { font-size:10px;font-weight:600;margin-top:3px; }

    .co-mono { font-family:'Courier New',monospace;font-weight:600;color:var(--accent,#3b82f6); }

    .co-section-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0 18px;
    }
    .co-section-divider-line  { flex:1;height:1px;background:var(--border,#e5e7eb); }
    .co-section-divider-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--text-muted,#6b7280);
      white-space: nowrap;
    }

    @media (max-width:768px) {
      .co-filter-bar { flex-direction:column;align-items:stretch; }
      .co-input { width:100%; }
    }
  `;
  document.head.appendChild(style);
}

// ─── PINCODE AUTO-FILL ────────────────────────────────────

async function autoFillAddressFromPincode() {
  const pincodeInput = document.getElementById('cm-pincode');
  const pincode = pincodeInput?.value.trim();
  if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) return;

  const loadingEl = document.getElementById('pincode-loading');
  if (loadingEl) loadingEl.style.display = 'inline';
  pincodeInput.classList.remove('pincode-success','pincode-error');

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 10000);
    const response   = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();

    if (data && data[0] && data[0].Status === 'Success') {
      const postOffices = data[0].PostOffice;
      const bestOffice  = postOffices.find(o => o.DeliveryStatus === 'Delivery') || postOffices[0];
      if (bestOffice) {
        const stateEl    = document.getElementById('cm-state');
        const districtEl = document.getElementById('cm-district');
        const cityEl     = document.getElementById('cm-city');
        if (stateEl)    stateEl.value    = bestOffice.State    || '';
        if (districtEl) districtEl.value = bestOffice.District || '';
        if (cityEl)     cityEl.value     = bestOffice.Block    || bestOffice.District || '';
        pincodeInput.classList.add('pincode-success');
        if (window.showToast) window.showToast(`📍 ${bestOffice.District}, ${bestOffice.State}`, 'success');
      }
    } else {
      pincodeInput.classList.add('pincode-error');
      if (window.showToast) window.showToast('Pincode not found. Please enter manually.', 'warning');
    }
  } catch (error) {
    pincodeInput.classList.add('pincode-error');
    if (window.showToast) window.showToast(
      error.name === 'AbortError' ? 'Request timeout. Please enter manually.' : 'Service unavailable. Please enter manually.',
      'warning'
    );
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
    setTimeout(() => pincodeInput.classList.remove('pincode-error','pincode-success'), 3000);
  }
}

// ─── PHONE VALIDATION ─────────────────────────────────────

function validatePhoneNumber(phone) {
  if (!phone || phone.length === 0) return { valid: true, message: '' };
  if (!phone.match(/^\d{10}$/)) return { valid: false, message: 'Phone number must be exactly 10 digits' };
  return { valid: true, message: '' };
}

// ─── LOAD COMPANIES ───────────────────────────────────────

async function loadCompanies() {
  addCompanyStyles();
  const data    = await api.get('v1/companies');
  const isAdmin = authUtils?.isAdmin() || false;

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Companies</h2>
        <p class="text-muted" id="co-count">${(data || []).length} companies</p>
      </div>
      <div class="flex items-center gap-8" style="flex-wrap:wrap;">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="co-search" placeholder="Search companies...">
        </div>
        ${isAdmin ? `
          <button class="btn btn-primary" onclick="window.openCompanyModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Company
          </button>` : ''}
      </div>
    </div>

    <div class="co-table-wrap">
      <table class="co-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Short Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Address</th>
            <th>City</th>
            <th>State</th>
            <th>Status</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="co-tbody">
          ${renderCompanyRows(data || [], isAdmin)}
        </tbody>
      </table>
    </div>

    <!-- POLICY PANEL -->
    <div id="company-policy-panel" style="display:none;margin-top:24px;">
      <div class="section-header" style="margin-bottom:16px;">
        <div>
          <h3 class="section-title" style="font-size:16px;" id="company-panel-title">Policies</h3>
          <p class="text-muted" id="company-panel-subtitle"></p>
        </div>
        <div class="flex gap-8" style="flex-wrap:wrap;">
          <button id="btn-table-view" class="btn btn-primary btn-sm" onclick="window.switchCompanyView('table')">☰ Table View</button>
          <button id="btn-graph-view" class="btn btn-ghost btn-sm"   onclick="window.switchCompanyView('graph')">📊 Graph View</button>
          <button class="btn btn-sm" style="background:#10b981;color:#fff;border-color:#10b981;"
            onclick="window.openExportModal()">📥 Export</button>
          <button class="btn btn-ghost btn-sm" onclick="window.closeCompanyPanel()">✕ Close</button>
        </div>
      </div>
      <div id="company-policy-content"></div>
      <div id="company-graph-content" style="display:none;"></div>
    </div>

    <!-- EXPORT MODAL -->
    <div id="export-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;align-items:center;justify-content:center;">
      <div style="background:var(--bg-surface,#fff);border-radius:14px;padding:28px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="font-size:16px;font-weight:700;">📥 Export Policies</h3>
          <button onclick="window.closeExportModal()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--text-muted,#888);">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#888);display:block;margin-bottom:5px;">Start Date</label>
            <input type="date" id="exp-start" class="co-input" style="width:100%;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#888);display:block;margin-bottom:5px;">End Date</label>
            <input type="date" id="exp-end" class="co-input" style="width:100%;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#888);display:block;margin-bottom:5px;">Status</label>
            <select id="exp-status" class="co-input" style="width:100%;">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_SOON">Expiring Soon</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#888);display:block;margin-bottom:5px;">Payment</label>
            <select id="exp-payment" class="co-input" style="width:100%;">
              <option value="">All Payments</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
        <div style="background:var(--bg,#f9fafb);border:1px solid var(--border,#eee);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:var(--text-muted,#888);">
          Records matching filters: <strong id="exp-preview-count" style="color:var(--accent,#2563eb);">0</strong>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button onclick="window.closeExportModal()" class="btn btn-ghost">Cancel</button>
          <button onclick="window.exportFilteredCSV()" class="btn btn-sm" style="background:#10b981;color:#fff;border-color:#10b981;">📄 CSV</button>
          <button onclick="window.exportFilteredPDF()" class="btn btn-sm" style="background:#ef4444;color:#fff;border-color:#ef4444;">📋 PDF</button>
        </div>
      </div>
    </div>
  `;

  if (window.filterTable) window.filterTable('co-search', 'co-tbody');
  buildCompanyModal();
  ['exp-start','exp-end','exp-status','exp-payment'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateExportPreview);
  });
}

// ─── EXPORT HELPERS ───────────────────────────────────────

window.openExportModal = function () {
  const modal = document.getElementById('export-modal');
  if (modal) modal.style.display = 'flex';
  updateExportPreview();
};
window.closeExportModal = function () {
  const modal = document.getElementById('export-modal');
  if (modal) modal.style.display = 'none';
};

function getExportFiltered() {
  const start   = document.getElementById('exp-start')?.value   || '';
  const end     = document.getElementById('exp-end')?.value     || '';
  const status  = document.getElementById('exp-status')?.value  || '';
  const payment = document.getElementById('exp-payment')?.value || '';

  // ✅ Use recalculated status when filtering
  return (currentPoliciesData || []).map(p => ({ ...p, status: calculatePolicyStatus(p) })).filter(p => {
    const endDate = p.endDate || '';
    const paid    = p.amountPaid    || 0;
    const premium = p.premiumAmount || 0;
    const rem     = premium - paid;
    const matchStart   = !start  || endDate >= start;
    const matchEnd     = !end    || endDate <= end;
    const matchStatus  = !status || p.status === status;
    let   matchPayment = true;
    if (payment === 'paid')    matchPayment = rem <= 0 && paid > 0;
    if (payment === 'partial') matchPayment = paid > 0 && rem > 0;
    if (payment === 'unpaid')  matchPayment = paid === 0;
    return matchStart && matchEnd && matchStatus && matchPayment;
  });
}

function updateExportPreview() {
  const el = document.getElementById('exp-preview-count');
  if (el) el.textContent = getExportFiltered().length;
}

// ─── CSV EXPORT ───────────────────────────────────────────

window.exportFilteredCSV = function () {
  const data = getExportFiltered();
  if (!data.length) { if (window.showToast) window.showToast('No records match filters', 'warning'); return; }

  const headers = [
    'Policy Number','Insurance Type','Provider','Status',
    'Premium Amount (₹)','Sum Insured (₹)','Start Date','End Date',
    'Premium Frequency','Amount Paid (₹)',
    'Payment Status','Payment Mode','Payment Reference','Paid Date','Description'
  ];

  const totalPremium = data.reduce((s, p) => s + (p.premiumAmount || 0), 0);
  const totalPaid    = data.reduce((s, p) => s + (p.amountPaid    || 0), 0);
  const collRate     = totalPremium > 0 ? ((totalPaid / totalPremium) * 100).toFixed(1) : 0;
  const startVal     = document.getElementById('exp-start')?.value || '';
  const endVal       = document.getElementById('exp-end')?.value   || '';

  let csv = '';
  csv += `"Company: ${currentCompanyName}",\n`;
  csv += `"Export Date: ${new Date().toLocaleString('en-IN')}",\n`;
  if (startVal) csv += `"Date From: ${startVal}",\n`;
  if (endVal)   csv += `"Date To: ${endVal}",\n`;
  csv += `"Total Records: ${data.length}",\n`;
  csv += `"Total Premium: ₹${totalPremium.toFixed(2)}",\n`;
  csv += `"Total Paid: ₹${totalPaid.toFixed(2)}",\n`;
  csv += `"Collection Rate: ${collRate}%",\n`;
  csv += `"\n"\n`;
  csv += headers.map(h => `"${h}"`).join(',') + '\n';

  data.forEach(p => {
    const paid      = p.amountPaid || 0;
    const premium   = p.premiumAmount || 0;
    const payStatus = paid >= premium && premium > 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');
    const row = [
      p.policyNumber || '',
      p.insuranceType?.name || p.insuranceTypeName || '—',
      p.provider?.name      || p.providerName      || '—',
      p.status || '—',
      premium.toFixed(2),
      (p.sumInsured || 0).toFixed(2),
      p.startDate || '—', p.endDate || '—',
      p.premiumFrequency || '—',
      paid.toFixed(2),
      payStatus,
      p.paymentMode      || '—',
      p.paymentReference || '—',
      p.paidDate         || '—',
      p.description      || '—'
    ];
    csv += row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',') + '\n';
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${(currentCompanyName || 'company').replace(/[^a-z0-9]/gi,'_')}_policies_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (window.showToast) window.showToast(`${data.length} policies exported!`, 'success');
  window.closeExportModal();
};

// ─── PDF EXPORT ───────────────────────────────────────────

window.exportFilteredPDF = function () {
  const data = getExportFiltered();
  if (!data.length) { if (window.showToast) window.showToast('No records match filters', 'warning'); return; }

  const totalPremium = data.reduce((s, p) => s + (p.premiumAmount || 0), 0);
  const totalPaid    = data.reduce((s, p) => s + (p.amountPaid    || 0), 0);
  const collRate     = totalPremium > 0 ? Math.round((totalPaid / totalPremium) * 100) : 0;
  const startVal     = document.getElementById('exp-start')?.value  || '';
  const endVal       = document.getElementById('exp-end')?.value    || '';
  const statusVal    = document.getElementById('exp-status')?.value || 'All';
  const payVal       = document.getElementById('exp-payment')?.value|| 'All';

  const fmtINR  = v => '₹' + (v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const fmtDate = d => { if (!d || d === '—') return '—'; try { const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; } catch(e) { return d; } };
  const stColor = s => s === 'ACTIVE' ? '#16a34a' : s === 'EXPIRED' ? '#dc2626' : '#d97706';
  const stBg    = s => s === 'ACTIVE' ? '#f0fdf4' : s === 'EXPIRED' ? '#fef2f2' : '#fffbeb';

  const rows = data.map(p => {
    const paid = p.amountPaid || 0;
    return `<tr>
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;font-family:monospace">${p.policyNumber || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${p.insuranceType?.name || p.insuranceTypeName || '—'}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${p.provider?.name || p.providerName || '—'}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">
        <span style="padding:2px 8px;border-radius:100px;font-size:11px;font-weight:700;
          background:${stBg(p.status)};color:${stColor(p.status)}">${p.status || '—'}</span>
      </td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${fmtINR(p.premiumAmount || 0)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center">${fmtDate(p.endDate)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;color:#16a34a;font-weight:600;text-align:right">${fmtINR(paid)}</td>
    </tr>`;
  }).join('');

  const filterInfo = [
    startVal ? `From: ${fmtDate(startVal)}` : '',
    endVal   ? `To: ${fmtDate(endVal)}`     : '',
    statusVal && statusVal !== 'All' ? `Status: ${statusVal}` : '',
    payVal    && payVal    !== 'All' ? `Payment: ${payVal}`   : '',
  ].filter(Boolean).join('  |  ') || 'All records';

  const html = `<!DOCTYPE html><html><head><title>${currentCompanyName || 'Company'} — Policies</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;padding:28px;color:#1a2035;font-size:13px}
    h1{font-size:20px;font-weight:700;margin-bottom:3px} h1 span{color:#2563eb}
    .meta{color:#6b7591;font-size:12px;margin-bottom:8px}
    .filters-bar{background:#f4f6fa;border:1px solid #e2e6ed;border-radius:8px;padding:8px 14px;font-size:12px;color:#6b7591;margin-bottom:16px}
    .summary{display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap}
    .sm{background:#f4f6fa;border-radius:8px;padding:10px 16px;min-width:110px}
    .sm .sl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7591;margin-bottom:4px}
    .sm .sv{font-size:17px;font-weight:800} .g{color:#16a34a}.b{color:#2563eb}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead th{padding:9px 8px;background:#f4f6fa;text-align:left;font-size:10px;font-weight:700;
      text-transform:uppercase;letter-spacing:.07em;color:#6b7591;border:1px solid #e2e6ed}
    thead th:nth-child(5),thead th:nth-child(7){text-align:right}
    tbody tr:nth-child(even){background:#fafafa}
    .footer{margin-top:16px;font-size:11px;color:#6b7591;text-align:right;border-top:1px solid #e2e6ed;padding-top:8px}
    @media print{body{padding:12px}@page{margin:12mm}thead{display:table-header-group}}
  </style></head><body>
  <h1>${window.escapeHtml(currentCompanyName || 'Company')} — <span>Policy Report</span></h1>
  <div class="meta">Generated: ${new Date().toLocaleString('en-IN')} | Records: ${data.length}</div>
  <div class="filters-bar"><strong>Filters:</strong> ${filterInfo}</div>
  <div class="summary">
    <div class="sm"><div class="sl">Total Policies</div><div class="sv b">${data.length}</div></div>
    <div class="sm"><div class="sl">Total Premium</div><div class="sv">${fmtINR(totalPremium)}</div></div>
    <div class="sm"><div class="sl">Total Paid</div><div class="sv g">${fmtINR(totalPaid)}</div></div>
    <div class="sm"><div class="sl">Collection Rate</div><div class="sv">${collRate}%</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Policy #</th><th>Type</th><th>Provider</th><th>Status</th>
      <th>Premium</th><th>End Date</th><th>Paid</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#f0f4ff">
        <td colspan="4" style="padding:9px 8px;border:1px solid #e5e7eb;font-weight:700;text-align:right">Totals</td>
        <td style="padding:9px 8px;border:1px solid #e5e7eb;font-weight:700;text-align:right">₹${totalPremium.toFixed(2)}</td>
        <td style="padding:9px 8px;border:1px solid #e5e7eb"></td>
        <td style="padding:9px 8px;border:1px solid #e5e7eb;font-weight:700;text-align:right;color:#16a34a">₹${totalPaid.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="footer">${window.escapeHtml(currentCompanyName || 'Company')} — ${new Date().toLocaleDateString('en-IN')}</div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  window.closeExportModal();
};

// ─── RENDER COMPANY ROWS ──────────────────────────────────

function renderCompanyRows(data, isAdmin) {
  if (!data.length) return window.emptyState('No companies found', isAdmin ? 9 : 8);

  return data.map(c => {
    const addrLine1  = c.address ? window.escapeHtml(c.address) : '';
    const addrParts2 = [c.city, c.district, c.state, c.pinCode].filter(Boolean);
    const addrLine2  = addrParts2.length ? window.escapeHtml(addrParts2.join(', ')) : '';
    const hasAddress = addrLine1 || addrLine2;

    const onClick = `onclick="window.showCompanyPolicies('${c.id}','${window.escapeHtml(c.name).replace(/'/g,"\\'")}')"`; 

    return `
      <tr>
        <td ${onClick}>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:var(--accent-soft);
              color:var(--accent);display:flex;align-items:center;justify-content:center;
              font-size:11px;font-weight:700;flex-shrink:0;">
              ${window.escapeHtml(c.name).substring(0,2).toUpperCase()}
            </div>
            <strong style="color:var(--accent);">${window.escapeHtml(c.name)}</strong>
          </div>
        </td>
        <td ${onClick}>${window.escapeHtml(c.shortName) || '<span class="text-muted">—</span>'}</td>
        <td ${onClick}>${window.escapeHtml(c.contactEmail) || '<span class="text-muted">—</span>'}</td>
        <td ${onClick}>${window.escapeHtml(c.contactPhone) || '<span class="text-muted">—</span>'}</td>
        <td ${onClick}>
          ${hasAddress
            ? `<div class="co-address-cell">
                ${addrLine1 ? `<div class="co-address-line1" title="${addrLine1}">${addrLine1.length > 30 ? addrLine1.substring(0,28)+'…' : addrLine1}</div>` : ''}
                ${addrLine2 ? `<div class="co-address-line2" title="${addrLine2}">${addrLine2.length > 32 ? addrLine2.substring(0,30)+'…' : addrLine2}</div>` : ''}
              </div>`
            : '<span class="text-muted">—</span>'}
        </td>
        <td ${onClick}>${window.escapeHtml(c.city) || '<span class="text-muted">—</span>'}</td>
        <td ${onClick}>${window.escapeHtml(c.state) || '<span class="text-muted">—</span>'}</td>
        <td ${onClick}>
          ${c.active ? '<span class="co-badge-active">● Active</span>' : '<span class="co-badge-expired">● Inactive</span>'}
        </td>
        ${isAdmin ? `
          <td>
            <div class="flex gap-8">
              <button class="btn btn-ghost btn-sm"
                onclick="event.stopPropagation();window.openCompanyModal('${c.id}')">Edit</button>
              <button class="btn btn-danger btn-sm"
                onclick="event.stopPropagation();window.deleteCompany('${c.id}','${window.escapeHtml(c.name).replace(/'/g,"\\'")}')">Delete</button>
            </div>
          </td>` : ''}
      </tr>
    `;
  }).join('');
}

// ─── COMPANY MODAL ────────────────────────────────────────

function buildCompanyModal() {
  if (document.getElementById('company-modal')) return;
  const bodyHtml = `
    <div class="form-grid">
      <div class="form-group">
        <label>Company Name *</label>
        <input type="text" id="cm-name" placeholder="ABC Pvt Ltd">
      </div>
      <div class="form-group">
        <label>Short Name</label>
        <input type="text" id="cm-short" placeholder="ABC">
      </div>
      <div class="form-group">
        <label>Contact Email</label>
        <input type="email" id="cm-email" placeholder="info@abc.com">
      </div>
      <div class="form-group">
        <label>Contact Phone (10 digits)</label>
        <input type="tel" id="cm-phone" placeholder="9876543210" maxlength="10" pattern="[0-9]{10}">
        <small style="color:var(--text-muted);font-size:11px;">Enter exactly 10 digits</small>
      </div>
      <div class="form-group">
        <label>PIN Code</label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="text" id="cm-pincode" placeholder="400001" maxlength="6" pattern="[0-9]{6}"
            style="flex:1;" onblur="autoFillAddressFromPincode()">
          <span id="pincode-loading" style="display:none;font-size:18px;">⏳</span>
        </div>
        <small class="text-muted">Enter 6-digit PIN to auto-fill address</small>
      </div>
      <div class="form-group">
        <label>City / Taluka</label>
        <input type="text" id="cm-city" placeholder="Auto-fills from PIN code">
      </div>
      <div class="form-group">
        <label>District</label>
        <input type="text" id="cm-district" placeholder="Auto-fills from PIN code">
      </div>
      <div class="form-group">
        <label>State</label>
        <input type="text" id="cm-state" placeholder="Auto-fills from PIN code">
      </div>
      <div class="form-group" style="grid-column:1/-1;">
        <label>Full Address</label>
        <textarea id="cm-address" rows="3" placeholder="Street address, landmark, area..."></textarea>
      </div>
    </div>
    <div class="form-group" style="margin-top:4px;">
      <label class="checkbox-label"><input type="checkbox" id="cm-active" checked> Active</label>
    </div>
    <input type="hidden" id="cm-id">
  `;
  const footerHtml = `
    <button class="btn btn-ghost" type="button" id="company-modal-cancel-btn">Cancel</button>
    <button class="btn btn-primary" type="button" id="company-modal-save-btn">Save Company</button>
  `;
  if (window.createModal) window.createModal('company-modal', 'Company', bodyHtml, footerHtml);
}

window.closeCompanyModal = function () {
  if (window.closeModal) window.closeModal('company-modal');
  const modal = document.getElementById('company-modal');
  if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; document.body.classList.remove('modal-open'); }
};

window.openCompanyModal = async function (id = null) {
  buildCompanyModal();
  ['cm-name','cm-short','cm-email','cm-phone','cm-pincode','cm-city','cm-district','cm-state','cm-address','cm-id']
    .forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
  const activeEl = document.getElementById('cm-active');
  if (activeEl) activeEl.checked = true;
  const modal = document.getElementById('company-modal');
  if (modal) { const t = modal.querySelector('.modal-header h3'); if (t) t.textContent = id ? 'Edit Company' : 'Add Company'; }

  if (id) {
    try {
      const c = await api.get(`v1/companies/${id}`);
      if (c) {
        document.getElementById('cm-id').value       = id;
        document.getElementById('cm-name').value     = c.name         || '';
        document.getElementById('cm-short').value    = c.shortName    || '';
        document.getElementById('cm-email').value    = c.contactEmail || '';
        document.getElementById('cm-phone').value    = c.contactPhone || '';
        document.getElementById('cm-pincode').value  = c.pinCode      || '';
        document.getElementById('cm-city').value     = c.city         || '';
        document.getElementById('cm-district').value = c.district     || '';
        document.getElementById('cm-state').value    = c.state        || '';
        document.getElementById('cm-address').value  = c.address      || '';
        if (activeEl) activeEl.checked = !!c.active;
      }
    } catch { if (window.showToast) window.showToast('Failed to load company data', 'error'); }
  }

  setTimeout(() => {
    const closeBtn  = document.querySelector('#company-modal .modal-close');
    const cancelBtn = document.getElementById('company-modal-cancel-btn');
    const saveBtn   = document.getElementById('company-modal-save-btn');
    if (closeBtn)  closeBtn.onclick  = () => window.closeCompanyModal();
    if (cancelBtn) cancelBtn.onclick = () => window.closeCompanyModal();
    if (saveBtn)   saveBtn.onclick   = () => window.submitCompany();
  }, 100);

  if (window.openModal) window.openModal('company-modal');
  else if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
};

window.submitCompany = async function () {
  const id          = document.getElementById('cm-id')?.value;
  const phoneNumber = document.getElementById('cm-phone')?.value.trim();
  const phoneVal    = validatePhoneNumber(phoneNumber);
  if (!phoneVal.valid) {
    if (window.showToast) window.showToast(phoneVal.message, 'warning');
    const ph = document.getElementById('cm-phone');
    if (ph) ph.style.borderColor = 'var(--red,#ef4444)';
    return;
  }
  const body = {
    name:         document.getElementById('cm-name')?.value.trim(),
    shortName:    document.getElementById('cm-short')?.value.trim(),
    contactEmail: document.getElementById('cm-email')?.value.trim(),
    contactPhone: phoneNumber || null,
    pinCode:      document.getElementById('cm-pincode')?.value.trim(),
    city:         document.getElementById('cm-city')?.value.trim(),
    district:     document.getElementById('cm-district')?.value.trim(),
    state:        document.getElementById('cm-state')?.value.trim(),
    address:      document.getElementById('cm-address')?.value.trim(),
    active:       document.getElementById('cm-active')?.checked ?? true,
  };
  if (!body.name) { if (window.showToast) window.showToast('Company name is required', 'warning'); return; }
  const saveBtn = document.getElementById('company-modal-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
  try {
    const result = id
      ? await api.put(`v1/companies/${id}`, body)
      : await api.post('v1/companies', body);
    if (result) {
      if (window.showToast) window.showToast(id ? 'Company updated!' : 'Company added!', 'success');
      window.closeCompanyModal();
      await loadCompanies();
    }
  } catch (error) {
    if (window.showToast) window.showToast(error?.message || 'Failed to save company', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Company'; }
  }
};

window.deleteCompany = async function (id, name) {
  if (!confirm(`Delete "${name}"?\n\nThe company will be moved to the Recycle Bin.`)) return;
  try {
    await api.del(`v1/companies/${id}?deletedBy=${localStorage.getItem('insura_email') || 'admin'}`);
    if (window.showToast) window.showToast(`"${name}" moved to Recycle Bin`, 'success');
    await loadCompanies();
  } catch { if (window.showToast) window.showToast('Failed to delete company', 'error'); }
};

// ─── VIEW SWITCHER ────────────────────────────────────────

window.switchCompanyView = function (view) {
  currentView = view;
  const tableContent = document.getElementById('company-policy-content');
  const graphContent = document.getElementById('company-graph-content');
  const btnTable     = document.getElementById('btn-table-view');
  const btnGraph     = document.getElementById('btn-graph-view');

  if (view === 'table') {
    if (tableContent) tableContent.style.display = 'block';
    if (graphContent) graphContent.style.display = 'none';
    if (btnTable) btnTable.className = 'btn btn-primary btn-sm';
    if (btnGraph) btnGraph.className = 'btn btn-ghost btn-sm';
  } else {
    if (tableContent) tableContent.style.display = 'none';
    if (graphContent) graphContent.style.display = 'block';
    if (btnTable) btnTable.className = 'btn btn-ghost btn-sm';
    if (btnGraph) btnGraph.className = 'btn btn-primary btn-sm';
    if (currentCompanyId) window.renderCompanyGraphs(currentCompanyId);
  }
};

// ─── SHOW COMPANY POLICIES ────────────────────────────────

window.showCompanyPolicies = async function (companyId, companyName) {
  currentCompanyId     = companyId;
  currentCompanyName   = companyName;
  currentView          = 'table';
  currentAnalyticsData = null;

  const panel    = document.getElementById('company-policy-panel');
  const title    = document.getElementById('company-panel-title');
  const subtitle = document.getElementById('company-panel-subtitle');
  const content  = document.getElementById('company-policy-content');
  const graphDiv = document.getElementById('company-graph-content');
  if (!panel || !content) return;

  content.style.display  = 'block';
  graphDiv.style.display = 'none';
  const btnTable = document.getElementById('btn-table-view');
  const btnGraph = document.getElementById('btn-graph-view');
  if (btnTable) btnTable.className = 'btn btn-primary btn-sm';
  if (btnGraph) btnGraph.className = 'btn btn-ghost btn-sm';

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (title)    title.textContent    = `${companyName} — Policies`;
  if (subtitle) subtitle.textContent = 'Loading...';
  content.innerHTML = '<div style="padding:32px;text-align:center;">⏳ Loading policies...</div>';

  try {
    const [policies, analytics] = await Promise.all([
      api.get(`v1/policies/company/${companyId}`).catch(() => []),
      api.get(`v1/companies/${companyId}/analytics`).catch(() => null)
    ]);

    // ✅ KEY FIX: recalculate status client-side before storing
    currentPoliciesData  = recalcStatuses(policies || []);
    currentAnalyticsData = analytics;

    if (subtitle) subtitle.textContent = `${currentPoliciesData.length} ${currentPoliciesData.length === 1 ? 'policy' : 'policies'}`;
    renderCompanyPolicyTable(currentPoliciesData);
    updateExportPreview();
  } catch (e) {
    console.error(e);
    content.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);">❌ Failed to load policies</div>`;
  }
};

// ─── POLICY TABLE ─────────────────────────────────────────

function renderCompanyPolicyTable(policies) {
  const content = document.getElementById('company-policy-content');
  if (!content) return;
  if (!policies.length) {
    content.innerHTML = `<div style="padding:32px;text-align:center;">📋 No policies found for this company.</div>`;
    return;
  }

  // ✅ Always recalculate status before rendering
  const sorted = recalcStatuses([...policies]).sort((a, b) =>
    (a.policyNumber || '').localeCompare(b.policyNumber || '', undefined, { numeric: true })
  );

  let totalPremium = 0, totalPaid = 0;
  sorted.forEach(p => { totalPremium += p.premiumAmount || 0; totalPaid += p.amountPaid || 0; });
  const collRate = totalPremium > 0 ? Math.round((totalPaid / totalPremium) * 100) : 0;

  const statusCount = { ACTIVE: 0, EXPIRING_SOON: 0, EXPIRED: 0 };
  sorted.forEach(p => {
    if      (p.status === 'ACTIVE')        statusCount.ACTIVE++;
    else if (p.status === 'EXPIRING_SOON') statusCount.EXPIRING_SOON++;
    else if (p.status === 'EXPIRED')       statusCount.EXPIRED++;
  });

  const pct = n => sorted.length ? Math.round((n / sorted.length) * 100) : 0;

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:20px;">
      <div class="co-card" style="border-top:3px solid #10b981;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">✅ Active</div>
        <div style="font-size:26px;font-weight:800;color:#10b981;">${statusCount.ACTIVE}</div>
        <div style="font-size:10px;color:var(--text-muted);">${pct(statusCount.ACTIVE)}% of total</div>
      </div>
      <div class="co-card" style="border-top:3px solid #f59e0b;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">⚠️ Expiring Soon</div>
        <div style="font-size:26px;font-weight:800;color:#f59e0b;">${statusCount.EXPIRING_SOON}</div>
        <div style="font-size:10px;color:var(--text-muted);">${pct(statusCount.EXPIRING_SOON)}% of total</div>
      </div>
      <div class="co-card" style="border-top:3px solid #ef4444;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">🔴 Expired</div>
        <div style="font-size:26px;font-weight:800;color:#ef4444;">${statusCount.EXPIRED}</div>
        <div style="font-size:10px;color:var(--text-muted);">${pct(statusCount.EXPIRED)}% of total</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px;">
      ${[
        ['Total Policies', sorted.length,                     ''],
        ['Total Premium',  window.fmt.currency(totalPremium), ''],
        ['Total Paid',     window.fmt.currency(totalPaid),    '#10b981'],
        ['Collection Rate',collRate + '%',                    collRate >= 80 ? '#10b981' : collRate >= 50 ? '#f59e0b' : '#ef4444'],
      ].map(([label, value, color]) => `
        <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">${label}</div>
          <div style="font-size:20px;font-weight:700;${color?'color:'+color:''}">${value}</div>
        </div>`).join('')}
    </div>

    <div class="co-filter-bar">
      <span style="font-size:12px;font-weight:700;color:var(--text-muted);">🔍 Filter by End Date:</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <label style="font-size:11px;color:var(--text-muted);white-space:nowrap;">From</label>
        <input type="date" id="cp-filter-start" class="co-input" onchange="window.applyCompanyPolicyFilter()">
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <label style="font-size:11px;color:var(--text-muted);white-space:nowrap;">To</label>
        <input type="date" id="cp-filter-end" class="co-input" onchange="window.applyCompanyPolicyFilter()">
      </div>
      <select id="cp-filter-status" class="co-input" onchange="window.applyCompanyPolicyFilter()">
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="EXPIRING_SOON">Expiring Soon</option>
        <option value="EXPIRED">Expired</option>
      </select>
      <button class="btn btn-ghost btn-sm" onclick="window.clearCompanyPolicyFilter()" style="font-size:12px;">✕ Clear</button>
      <span id="cp-filter-count" style="font-size:12px;color:var(--text-muted);"></span>
    </div>

    <div class="co-table-wrap">
      <table class="co-table">
        <thead>
          <tr>
            <th>Policy #</th><th>Type</th><th>Provider</th><th>Status</th>
            <th>Premium</th><th>End Date</th><th>Paid</th>
          </tr>
        </thead>
        <tbody id="cp-policy-tbody">
          ${buildCompanyPolicyRows(sorted)}
        </tbody>
      </table>
    </div>
  `;
}

function buildCompanyPolicyRows(policies) {
  if (!policies.length) {
    return `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">
      No policies match the selected filters</td></tr>`;
  }
  return policies.map(p => {
    // ✅ Recalculate status for each row so display is always accurate
    const status      = calculatePolicyStatus(p);
    const paid        = p.amountPaid || 0;
    const statusClass = status === 'ACTIVE' ? 'co-badge-active' : (status === 'EXPIRING_SOON' ? 'co-badge-expiring' : 'co-badge-expired');
    const statusText  = status === 'ACTIVE' ? '● Active' : (status === 'EXPIRING_SOON' ? '⚠️ Expiring' : '🔴 Expired');
    const endStyle    = status === 'EXPIRED' ? 'color:#ef4444;font-weight:700;' : status === 'EXPIRING_SOON' ? 'color:#f59e0b;font-weight:600;' : '';
    return `
      <tr onclick="window._goPolicyDetail('${p.id}')">
        <td><span class="co-mono">${window.escapeHtml(p.policyNumber || '')}</span></td>
        <td>${window.escapeHtml(p.insuranceType?.name || p.insuranceTypeName || '—')}</td>
        <td>${window.escapeHtml(p.provider?.name || p.providerName || '—')}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td><strong>${window.fmt.currency(p.premiumAmount || 0)}</strong></td>
        <td><span style="${endStyle}">${p.endDate ? window.fmt.date(p.endDate) : '—'}</span></td>
        <td><strong style="color:#10b981;">${window.fmt.currency(paid)}</strong></td>
      </tr>`;
  }).join('');
}

window.applyCompanyPolicyFilter = function () {
  const start  = document.getElementById('cp-filter-start')?.value  || '';
  const end    = document.getElementById('cp-filter-end')?.value    || '';
  const status = document.getElementById('cp-filter-status')?.value || '';

  // ✅ Recalculate statuses before filtering
  const sorted = recalcStatuses([...(currentPoliciesData || [])]).sort((a, b) =>
    (a.policyNumber || '').localeCompare(b.policyNumber || '', undefined, { numeric: true })
  );
  const filtered = sorted.filter(p => {
    const ed = p.endDate || '';
    return (!start || ed >= start) && (!end || ed <= end) && (!status || p.status === status);
  });

  const tbody   = document.getElementById('cp-policy-tbody');
  if (tbody) tbody.innerHTML = buildCompanyPolicyRows(filtered);
  const countEl = document.getElementById('cp-filter-count');
  if (countEl) countEl.textContent = (start || end || status)
    ? `${filtered.length} of ${currentPoliciesData.length} shown` : '';
};

window.clearCompanyPolicyFilter = function () {
  ['cp-filter-start','cp-filter-end'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const st = document.getElementById('cp-filter-status'); if (st) st.value = '';
  window.applyCompanyPolicyFilter();
};

// ─── CHART.JS LOADER ──────────────────────────────────────

async function loadChartJs() {
  if (typeof Chart !== 'undefined') return;
  return new Promise((resolve, reject) => {
    const s   = document.createElement('script');
    s.src     = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload  = resolve;
    s.onerror = () => reject(new Error('Chart.js failed to load'));
    document.head.appendChild(s);
  });
}

// ─── GRAPH VIEW ENTRY ─────────────────────────────────────

window.renderCompanyGraphs = async function (companyId) {
  const graphDiv = document.getElementById('company-graph-content');
  if (!graphDiv) return;

  graphDiv.innerHTML = `
    <div style="padding:32px;text-align:center;">
      <div style="font-size:24px;margin-bottom:8px;">⏳</div>
      <div>Loading analytics for <strong>${window.escapeHtml(currentCompanyName || '')}</strong>...</div>
    </div>`;
  _destroyAllCharts();

  try {
    await loadChartJs();
    if (!currentAnalyticsData) {
      currentAnalyticsData = await api.get(`v1/companies/${companyId}/analytics`).catch(() => null);
    }

    graphDiv.innerHTML = `
      <div class="co-graph-header">
        <div style="font-size:20px;font-weight:800;">📊 ${window.escapeHtml(currentCompanyName || 'Company')} — Analytics</div>
        <div style="font-size:13px;opacity:.85;margin-top:4px;">
          ${currentPoliciesData.length} total policies · ${new Date().toLocaleDateString('en-IN')}
        </div>
      </div>

      <div class="co-filter-bar" style="margin-bottom:20px;">
        <span style="font-size:12px;font-weight:700;color:var(--text-muted);">📅 Filter Graphs by End Date:</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <label style="font-size:11px;color:var(--text-muted);">From</label>
          <input type="date" id="gr-filter-start" class="co-input" onchange="window.applyGraphFilter()">
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <label style="font-size:11px;color:var(--text-muted);">To</label>
          <input type="date" id="gr-filter-end" class="co-input" onchange="window.applyGraphFilter()">
        </div>
        <select id="gr-filter-status" class="co-input" onchange="window.applyGraphFilter()">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRING_SOON">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <button class="btn btn-ghost btn-sm" onclick="window.clearGraphFilter()" style="font-size:12px;">✕ Clear</button>
        <span id="gr-filter-count" style="font-size:12px;color:var(--text-muted);"></span>
      </div>

      <div id="graph-charts-area"></div>
    `;

    // ✅ Pass recalculated policies to graph renderer
    await _renderGraphCharts(recalcStatuses(currentPoliciesData), currentAnalyticsData);
  } catch (error) {
    console.error('Graph render error:', error);
    graphDiv.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);">
      ❌ Failed to load analytics<br><small>${error.message}</small></div>`;
  }
};

window.applyGraphFilter = async function () {
  const start  = document.getElementById('gr-filter-start')?.value  || '';
  const end    = document.getElementById('gr-filter-end')?.value    || '';
  const status = document.getElementById('gr-filter-status')?.value || '';

  // ✅ Recalculate statuses before filtering graphs
  const filtered = recalcStatuses(currentPoliciesData || []).filter(p => {
    const ed = p.endDate || '';
    return (!start || ed >= start) && (!end || ed <= end) && (!status || p.status === status);
  });

  const countEl = document.getElementById('gr-filter-count');
  if (countEl) countEl.textContent = (start || end || status)
    ? `${filtered.length} of ${currentPoliciesData.length} policies` : '';

  await loadChartJs();
  await _renderGraphCharts(filtered, null);
};

window.clearGraphFilter = async function () {
  ['gr-filter-start','gr-filter-end'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const st = document.getElementById('gr-filter-status'); if (st) st.value = '';
  const c  = document.getElementById('gr-filter-count');  if (c)  c.textContent = '';
  await loadChartJs();
  // ✅ Always pass recalculated data
  await _renderGraphCharts(recalcStatuses(currentPoliciesData || []), currentAnalyticsData);
};

function _destroyAllCharts() {
  if (window._companyCharts) {
    Object.values(window._companyCharts).forEach(c => { try { c.destroy(); } catch(e){} });
  }
  window._companyCharts = {};
}

// ─── MAIN GRAPH RENDERER ──────────────────────────────────
// policies passed in here already have recalculated statuses

async function _renderGraphCharts(policies, analytics) {
  _destroyAllCharts();
  const area = document.getElementById('graph-charts-area');
  if (!area) return;

  if (!policies.length) {
    area.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-muted);">
      <div style="font-size:32px;margin-bottom:8px;">📭</div>No policies match the selected filters</div>`;
    return;
  }

  // ── Policy Aggregates ─────────────────────────────────────
  const statusCount = {};
  const typeCount   = {};
  const typeStats   = {};
  const yearMap     = {};
  let totalPremium = 0, totalPaid = 0;
  let paidCount = 0, partialCount = 0, unpaidCount = 0;
  let paidAmount = 0, partialAmount = 0, unpaidAmount = 0;

  policies.forEach(p => {
    const prem = p.premiumAmount || 0;
    const paid = p.amountPaid    || 0;
    totalPremium += prem;
    totalPaid    += paid;

    const st = p.status || 'UNKNOWN';
    statusCount[st] = (statusCount[st] || 0) + 1;

    if (paid >= prem && prem > 0) { paidCount++;    paidAmount    += paid; }
    else if (paid > 0)            { partialCount++; partialAmount += paid; }
    else                          { unpaidCount++;  unpaidAmount  += prem; }

    const typeName = p.insuranceTypeName || p.insuranceType?.name || 'Unknown';
    typeCount[typeName] = (typeCount[typeName] || 0) + 1;
    if (!typeStats[typeName]) typeStats[typeName] = { count:0, premium:0, paid:0 };
    typeStats[typeName].count++;
    typeStats[typeName].premium += prem;
    typeStats[typeName].paid    += paid;

    if (p.endDate) {
      const yr = p.endDate.substring(0, 4);
      if (!yearMap[yr]) yearMap[yr] = { premium:0, paid:0, count:0 };
      yearMap[yr].premium += prem;
      yearMap[yr].paid    += paid;
      yearMap[yr].count++;
    }
  });

  // Monthly trend
  const now = new Date();
  const monthLabels = [], monthPaidData = [], monthDueData = [];
  if (analytics?.monthlyPaymentTrend) {
    analytics.monthlyPaymentTrend.forEach(m => {
      monthLabels.push(m.month);
      monthPaidData.push(m.paid || 0);
      monthDueData.push(m.premiumDue || 0);
    });
  } else {
    for (let i = 11; i >= 0; i--) {
      const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear(), mo = d.getMonth() + 1;
      monthLabels.push(d.toLocaleString('en-IN', { month:'short' }) + ' ' + yr);
      monthPaidData.push(policies.filter(p => p.paidDate && new Date(p.paidDate).getFullYear()===yr && new Date(p.paidDate).getMonth()+1===mo).reduce((s,p)=>s+(p.amountPaid||0),0));
      monthDueData.push( policies.filter(p => p.endDate  && new Date(p.endDate).getFullYear() ===yr && new Date(p.endDate).getMonth() +1===mo).reduce((s,p)=>s+(p.premiumAmount||0),0));
    }
  }

  const collRate    = totalPremium > 0 ? Math.round((totalPaid / totalPremium) * 100) : 0;
  const fmtINR      = v => '₹' + (v||0).toLocaleString('en-IN', { minimumFractionDigits:0 });
  const sortedYears = Object.keys(yearMap).sort();
  const typeChartH  = Math.max(160, Object.keys(typeCount).length * 52);
  const palette     = ['#3b82f6','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4'];

  const typeSorted    = Object.entries(typeStats).sort((a,b) => b[1].premium - a[1].premium);
  const typeTableRows = typeSorted.map(([name, d]) => {
    const rate      = d.premium > 0 ? Math.round((d.paid/d.premium)*100) : 0;
    const rateColor = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444';
    return `<tr style="border-bottom:1px solid var(--border,#f0f0f0);">
      <td style="padding:8px 10px;font-weight:600;font-size:12px;" title="${name}">${name.length>22?name.substring(0,20)+'…':name}</td>
      <td style="padding:8px 6px;text-align:center;font-weight:700;color:var(--accent);font-size:13px;">${d.count}</td>
      <td style="padding:8px 6px;text-align:right;font-size:12px;">${fmtINR(d.premium)}</td>
      <td style="padding:8px 6px;text-align:right;font-size:12px;color:#10b981;font-weight:600;">${fmtINR(d.paid)}</td>
      <td style="padding:8px 6px;text-align:right;font-size:12px;">
        <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;">
          <div style="width:50px;height:6px;background:var(--border,#e5e7eb);border-radius:3px;overflow:hidden;">
            <div style="width:${rate}%;height:100%;background:${rateColor};border-radius:3px;"></div>
          </div>
          <span style="font-size:11px;font-weight:700;min-width:32px;text-align:right;">${rate}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  // ── Insurance Items Aggregates ─────────────────────────────
  let itemsData = [];
  try {
    const allResult = await api.get('v1/insurance-items/all').catch(err => {
      console.warn('⚠️ /all endpoint failed, trying default:', err?.message || err);
      return null;
    });
    if (Array.isArray(allResult)) {
      itemsData = allResult;
    } else {
      const defaultResult = await api.get('v1/insurance-items').catch(err => {
        console.warn('⚠️ Default items endpoint also failed:', err?.message || err);
        return null;
      });
      itemsData = Array.isArray(defaultResult) ? defaultResult : [];
    }
  } catch(e) {
    console.error('❌ Failed to load insurance items:', e);
    itemsData = [];
  }

  const companyTypeIds   = new Set(policies.map(p => p.insuranceType?.id).filter(Boolean));
  const companyTypeNames = new Set(
    policies.map(p => p.insuranceTypeName || p.insuranceType?.name).filter(Boolean)
  );
  const hasTypeFilter = companyTypeIds.size > 0 || companyTypeNames.size > 0;

  const relevantItems = itemsData.filter(item => {
    if (!item.insuranceType || !item.insuranceType.id) return true;
    if (!hasTypeFilter) return true;
    const itemTypeId   = item.insuranceType.id;
    const itemTypeName = item.insuranceType.name;
    return (itemTypeId   && companyTypeIds.has(itemTypeId))
        || (itemTypeName && companyTypeNames.has(itemTypeName));
  });

  const isActive = i => i.active === true || i.active === 'true' || i.active === 1;

  const itemActiveCount   = relevantItems.filter(isActive).length;
  const itemInactiveCount = relevantItems.filter(i => !isActive(i)).length;

  const itemsByType = {};
  relevantItems.forEach(item => {
    const t = item.insuranceType?.name || 'No Type Assigned';
    if (!itemsByType[t]) itemsByType[t] = { active: 0, inactive: 0 };
    if (isActive(item)) itemsByType[t].active++;
    else                itemsByType[t].inactive++;
  });

  const itemTypeLabels  = Object.keys(itemsByType).sort((a,b) =>
    (itemsByType[b].active + itemsByType[b].inactive) - (itemsByType[a].active + itemsByType[a].inactive)
  );
  const itemTypeActives = itemTypeLabels.map(t => itemsByType[t].active);
  const itemTypeInacts  = itemTypeLabels.map(t => itemsByType[t].inactive);
  const itemChartH      = Math.max(140, itemTypeLabels.length * 46);

  const sortedItems   = [...relevantItems].sort((a, b) => (isActive(b) ? 1 : 0) - (isActive(a) ? 1 : 0));
  const itemTableRows = sortedItems.map(item => `
    <tr style="border-bottom:1px solid var(--border,#f0f0f0);">
      <td style="padding:8px 10px;font-weight:600;font-size:12px;">${window.escapeHtml(item.name || '—')}</td>
      <td style="padding:8px 6px;font-size:12px;color:var(--text-muted);">
        ${item.insuranceType?.name
          ? window.escapeHtml(item.insuranceType.name)
          : '<span style="color:var(--text-muted);font-style:italic;">No Type</span>'}
      </td>
      <td style="padding:8px 6px;font-size:12px;">
        ${item.description
          ? window.escapeHtml(item.description.substring(0,40)) + (item.description.length > 40 ? '…' : '')
          : '<span style="color:var(--text-muted)">—</span>'}
      </td>
      <td style="padding:8px 6px;">
        ${isActive(item)
          ? '<span class="co-badge-active">● Active</span>'
          : '<span class="co-badge-expired">● Inactive</span>'}
      </td>
    </tr>`).join('');

  // ── HTML Output ───────────────────────────────────────────
  area.innerHTML = `

    <!-- KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:20px;">
      ${[
        ['📋 Policies',  policies.length,     '#3b82f6'],
        ['💵 Premium',   fmtINR(totalPremium),'#6366f1'],
        ['✅ Paid',      fmtINR(totalPaid),   '#10b981'],
        ['📈 Collected', collRate+'%',         collRate>=80?'#10b981':collRate>=50?'#f59e0b':'#ef4444'],
      ].map(([label,value,color])=>`
        <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;
          padding:16px;text-align:center;border-top:3px solid ${color};">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">${label}</div>
          <div style="font-size:18px;font-weight:800;color:${color};">${value}</div>
        </div>`).join('')}
    </div>

    <!-- ═══════════ SECTION: POLICY ANALYTICS ═══════════ -->
    <div class="co-section-divider">
      <div class="co-section-divider-line"></div>
      <span class="co-section-divider-label">📋 Policy Analytics</span>
      <div class="co-section-divider-line"></div>
    </div>

    <!-- Status Donut + Payment Breakdown -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="co-chart-card">
        <div class="co-chart-title">🟢 Policy Status Breakdown</div>
        <div class="co-chart-subtitle">Distribution by current policy status</div>
        <div style="position:relative;height:230px;"><canvas id="gc-status"></canvas></div>
      </div>
      <div class="co-chart-card">
        <div class="co-chart-title">💰 Payment Status Breakdown</div>
        <div class="co-chart-subtitle">Fully paid · partial · unpaid policies</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
          <div class="co-pay-card" style="background:#f0fdf4;border:1px solid #bbf7d0;">
            <div class="co-pay-label" style="color:#16a34a;">✅ Fully Paid</div>
            <div class="co-pay-count" style="color:#16a34a;">${paidCount}</div>
            <div class="co-pay-amt"   style="color:#16a34a;">${fmtINR(paidAmount)}</div>
          </div>
          <div class="co-pay-card" style="background:#fffbeb;border:1px solid #fde68a;">
            <div class="co-pay-label" style="color:#d97706;">⚡ Partial</div>
            <div class="co-pay-count" style="color:#d97706;">${partialCount}</div>
            <div class="co-pay-amt"   style="color:#d97706;">${fmtINR(partialAmount)} paid</div>
          </div>
          <div class="co-pay-card" style="background:#fef2f2;border:1px solid #fecaca;">
            <div class="co-pay-label" style="color:#dc2626;">❌ Unpaid</div>
            <div class="co-pay-count" style="color:#dc2626;">${unpaidCount}</div>
            <div class="co-pay-amt"   style="color:#dc2626;">${fmtINR(unpaidAmount)} due</div>
          </div>
        </div>
        <div style="position:relative;height:170px;">
          <canvas id="gc-payment"></canvas>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
            <div style="font-size:22px;font-weight:800;line-height:1;">${policies.length}</div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Total</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Insurance Type Bar + Table -->
    <div class="co-chart-card">
      <div class="co-chart-title">🏷️ Policies by Insurance Type</div>
      <div class="co-chart-subtitle">Count, premium & collection rate per type</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">
        <div style="position:relative;height:${typeChartH}px;"><canvas id="gc-type"></canvas></div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:var(--bg-elevated,#f8fafc);">
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:2px solid var(--border);">Type</th>
              <th style="padding:8px 6px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:2px solid var(--border);">#</th>
              <th style="padding:8px 6px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:2px solid var(--border);">Premium</th>
              <th style="padding:8px 6px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#10b981;border-bottom:2px solid var(--border);">Paid</th>
              <th style="padding:8px 6px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:2px solid var(--border);">Rate</th>
            </tr></thead>
            <tbody>${typeTableRows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--text-muted);">No data</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Year-wise Analytics -->
    <div class="co-chart-card">
      <div class="co-chart-title">📅 Year-wise Policy Analytics</div>
      <div class="co-chart-subtitle">Premium vs Paid by policy end-date year · ${sortedYears.length ? sortedYears[0]+' – '+sortedYears[sortedYears.length-1] : 'No data'}</div>
      ${sortedYears.length ? `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        ${sortedYears.map(yr => {
          const d    = yearMap[yr];
          const rate = d.premium > 0 ? Math.round((d.paid/d.premium)*100) : 0;
          const rc   = rate>=80?'#10b981':rate>=50?'#f59e0b':'#ef4444';
          return `<div style="background:var(--bg-elevated,#f8fafc);border:1px solid var(--border);
            border-radius:8px;padding:10px 14px;min-width:100px;text-align:center;flex:1;">
            <div style="font-size:15px;font-weight:800;color:var(--accent);">${yr}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${d.count} polic${d.count===1?'y':'ies'}</div>
            <div style="font-size:11px;font-weight:600;color:#10b981;margin-top:4px;">${fmtINR(d.paid)} paid</div>
            <div style="margin-top:5px;">
              <div class="co-prog-bar"><div class="co-prog-fill" style="width:${rate}%;background:${rc};"></div></div>
              <div style="font-size:10px;margin-top:3px;">${rate}% collected</div>
            </div>
          </div>`;
        }).join('')}
      </div>` : ''}
      <div style="position:relative;height:260px;"><canvas id="gc-year"></canvas></div>
    </div>

    <!-- Status-wise Premium & Payment -->
    <div class="co-chart-card">
      <div class="co-chart-title">💡 Status-wise Premium & Payment</div>
      <div class="co-chart-subtitle">Total premium vs amount collected per policy status</div>
      <div style="overflow-x:auto;margin-bottom:16px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:var(--bg-elevated,#f8fafc);">
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Status</th>
            <th style="padding:8px;text-align:center;border-bottom:2px solid var(--border);font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Policies</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid var(--border);font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Total Premium</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid var(--border);font-size:10px;font-weight:700;text-transform:uppercase;color:#10b981;">Amount Paid</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid var(--border);font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Collection %</th>
          </tr></thead>
          <tbody>
            ${[['Active','ACTIVE','#10b981'],['Expiring Soon','EXPIRING_SOON','#f59e0b'],['Expired','EXPIRED','#ef4444']].map(([label,key,color])=>{
              const d = { count:0, premium:0, paid:0 };
              policies.forEach(p => { if (p.status===key) { d.count++; d.premium+=p.premiumAmount||0; d.paid+=p.amountPaid||0; }});
              const rate = d.premium>0?((d.paid/d.premium)*100).toFixed(1):0;
              return `<tr style="border-bottom:1px solid var(--border);">
                <td style="padding:8px;font-weight:600;color:${color};">${label}</td>
                <td style="padding:8px;text-align:center;font-weight:700;">${d.count}</td>
                <td style="padding:8px;text-align:right;">${fmtINR(d.premium)}</td>
                <td style="padding:8px;text-align:right;color:#10b981;font-weight:600;">${fmtINR(d.paid)}</td>
                <td style="padding:8px;text-align:right;"><strong>${rate}%</strong></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="position:relative;height:220px;"><canvas id="gc-status-premium"></canvas></div>
    </div>

    <!-- Monthly Trend -->
    <div class="co-chart-card">
      <div class="co-chart-title">📆 Monthly Payment Trend (Last 12 Months)</div>
      <div class="co-chart-subtitle">Amount collected vs premium due per month</div>
      <div style="position:relative;height:240px;"><canvas id="gc-monthly"></canvas></div>
    </div>

    <!-- Premium Distribution by Type -->
    ${Object.keys(typeCount).length > 0 ? `
    <div class="co-chart-card">
      <div class="co-chart-title">💼 Premium Distribution by Insurance Type</div>
      <div class="co-chart-subtitle">Total premium amount per type</div>
      <div style="position:relative;height:${typeChartH}px;"><canvas id="gc-prem-type"></canvas></div>
    </div>` : ''}

    <!-- ═══════════ SECTION: INSURANCE ITEMS ═══════════ -->
    <div class="co-section-divider">
      <div class="co-section-divider-line"></div>
      <span class="co-section-divider-label">📦 Insurance Items Analytics</span>
      <div class="co-section-divider-line"></div>
    </div>

    ${relevantItems.length === 0 ? `
    <div class="co-chart-card" style="text-align:center;padding:32px;color:var(--text-muted);">
      <div style="font-size:32px;margin-bottom:8px;">📭</div>
      <div style="font-size:13px;">No insurance items found. Add items in the Insurance Items section.</div>
    </div>` : `

    <!-- Items KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:16px;">
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;border-top:3px solid #8b5cf6;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">📦 Total Items</div>
        <div style="font-size:22px;font-weight:800;color:#8b5cf6;">${relevantItems.length}</div>
      </div>
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;border-top:3px solid #10b981;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">✅ Active Items</div>
        <div style="font-size:22px;font-weight:800;color:#10b981;">${itemActiveCount}</div>
      </div>
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;border-top:3px solid #ef4444;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">❌ Inactive Items</div>
        <div style="font-size:22px;font-weight:800;color:#ef4444;">${itemInactiveCount}</div>
      </div>
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;border-top:3px solid #f59e0b;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">🏷️ Types Covered</div>
        <div style="font-size:22px;font-weight:800;color:#f59e0b;">${itemTypeLabels.length}</div>
      </div>
    </div>

    <!-- Items Charts: Stacked Bar + Donut -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="co-chart-card">
        <div class="co-chart-title">📊 Items by Insurance Type</div>
        <div class="co-chart-subtitle">Active vs inactive items per type</div>
        <div style="position:relative;height:${itemChartH}px;"><canvas id="gc-items-type"></canvas></div>
      </div>
      <div class="co-chart-card">
        <div class="co-chart-title">🔵 Active vs Inactive Items</div>
        <div class="co-chart-subtitle">Overall item status distribution</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div class="co-pay-card" style="background:#f0fdf4;border:1px solid #bbf7d0;">
            <div class="co-pay-label" style="color:#16a34a;">✅ Active</div>
            <div class="co-pay-count" style="color:#16a34a;">${itemActiveCount}</div>
            <div class="co-pay-amt"   style="color:#16a34a;">${relevantItems.length > 0 ? Math.round(itemActiveCount/relevantItems.length*100) : 0}%</div>
          </div>
          <div class="co-pay-card" style="background:#fef2f2;border:1px solid #fecaca;">
            <div class="co-pay-label" style="color:#dc2626;">❌ Inactive</div>
            <div class="co-pay-count" style="color:#dc2626;">${itemInactiveCount}</div>
            <div class="co-pay-amt"   style="color:#dc2626;">${relevantItems.length > 0 ? Math.round(itemInactiveCount/relevantItems.length*100) : 0}%</div>
          </div>
        </div>
        <div style="position:relative;height:180px;">
          <canvas id="gc-items-donut"></canvas>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
            <div style="font-size:22px;font-weight:800;line-height:1;">${relevantItems.length}</div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Items</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Items Detail Table -->
    <div class="co-chart-card">
      <div class="co-chart-title">📋 Insurance Items Detail</div>
      <div class="co-chart-subtitle">All items linked to this company's policy types (active first)</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:var(--bg-elevated,#f8fafc);">
            <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:2px solid var(--border);">Item Name</th>
            <th style="padding:9px 6px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:2px solid var(--border);">Insurance Type</th>
            <th style="padding:9px 6px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:2px solid var(--border);">Description</th>
            <th style="padding:9px 6px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:2px solid var(--border);">Status</th>
          </tr></thead>
          <tbody>
            ${itemTableRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--text-muted);">No items found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    `}
  `;

  // ── POLICY CHARTS ─────────────────────────────────────────
  const baseOpts = { responsive:true, maintainAspectRatio:false };

  // 1. Status donut
  const statusCtx = document.getElementById('gc-status');
  if (statusCtx && Object.keys(statusCount).length) {
    const labels   = Object.keys(statusCount);
    const colorMap = { ACTIVE:'#10b981', EXPIRING_SOON:'#f59e0b', EXPIRED:'#ef4444', UNKNOWN:'#94a3b8' };
    window._companyCharts.status = new Chart(statusCtx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data:labels.map(k=>statusCount[k]), backgroundColor:labels.map(k=>colorMap[k]||'#3b82f6'), borderWidth:2, borderColor:'transparent' }] },
      options: { ...baseOpts, cutout:'65%', plugins:{ legend:{ position:'bottom', labels:{ padding:16, font:{size:12} } }, tooltip:{ callbacks:{ label:ctx=>` ${ctx.label}: ${ctx.raw} policies` } } } }
    });
  }

  // 2. Payment donut
  const payCtx = document.getElementById('gc-payment');
  if (payCtx) {
    window._companyCharts.payment = new Chart(payCtx, {
      type: 'doughnut',
      data: { labels:['Fully Paid','Partial','Unpaid'], datasets:[{ data:[paidCount,partialCount,unpaidCount], backgroundColor:['#10b981','#f59e0b','#ef4444'], borderWidth:2, borderColor:'transparent' }] },
      options: { ...baseOpts, cutout:'68%', plugins:{ legend:{ position:'bottom', labels:{ padding:14, font:{size:12} } }, tooltip:{ callbacks:{ label:ctx=>{ const amts=[paidAmount,partialAmount,unpaidAmount]; return ` ${ctx.label}: ${ctx.raw} (${fmtINR(amts[ctx.dataIndex])})`; } } } } }
    });
  }

  // 3. Insurance type horizontal bar
  const typeCtx = document.getElementById('gc-type');
  if (typeCtx && Object.keys(typeCount).length) {
    const typeLabels = Object.keys(typeCount).sort((a,b)=>typeCount[b]-typeCount[a]);
    window._companyCharts.type = new Chart(typeCtx, {
      type: 'bar',
      data: { labels:typeLabels, datasets:[{ label:'Policies', data:typeLabels.map(k=>typeCount[k]), backgroundColor:typeLabels.map((_,i)=>palette[i%palette.length]), borderRadius:6, borderSkipped:false }] },
      options: {
        indexAxis:'y', ...baseOpts,
        plugins: { legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>{ const d=typeStats[ctx.label]||{}; return [`  ${ctx.raw} polic${ctx.raw===1?'y':'ies'}`,`  Premium: ${fmtINR(d.premium||0)}`,`  Paid: ${fmtINR(d.paid||0)}`]; } } } },
        scales: { x:{ beginAtZero:true, ticks:{ stepSize:1, font:{size:11} }, grid:{color:'rgba(0,0,0,.05)'} }, y:{ ticks:{ font:{size:11}, callback:function(v){ const l=this.getLabelForValue(v); return l.length>22?l.substring(0,20)+'…':l; } } } }
      }
    });
  }

  // 4. Year-wise grouped bar
  const yearCtx = document.getElementById('gc-year');
  if (yearCtx && sortedYears.length) {
    window._companyCharts.year = new Chart(yearCtx, {
      type: 'bar',
      data: { labels:sortedYears, datasets:[
        { label:'Total Premium', data:sortedYears.map(y=>yearMap[y].premium), backgroundColor:'rgba(99,102,241,.8)',  borderRadius:6 },
        { label:'Amount Paid',   data:sortedYears.map(y=>yearMap[y].paid),    backgroundColor:'rgba(16,185,129,.85)', borderRadius:6 }
      ]},
      options: { ...baseOpts, plugins:{legend:{position:'top',labels:{padding:14,font:{size:12}}}}, scales:{ y:{ beginAtZero:true, ticks:{ callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v) } }, x:{ ticks:{font:{size:12,weight:'bold'}} } } }
    });
  }

  // 5. Status-wise premium bar
  const stPremCtx = document.getElementById('gc-status-premium');
  if (stPremCtx) {
    const stLabels = ['Active','Expiring Soon','Expired'];
    const stKeys   = ['ACTIVE','EXPIRING_SOON','EXPIRED'];
    const stPrems  = stKeys.map(k => policies.filter(p=>p.status===k).reduce((s,p)=>s+(p.premiumAmount||0),0));
    const stPaids  = stKeys.map(k => policies.filter(p=>p.status===k).reduce((s,p)=>s+(p.amountPaid||0),0));
    window._companyCharts.statusPremium = new Chart(stPremCtx, {
      type: 'bar',
      data: { labels:stLabels, datasets:[
        { label:'Total Premium', data:stPrems, backgroundColor:'rgba(99,102,241,.8)',  borderRadius:6 },
        { label:'Amount Paid',   data:stPaids, backgroundColor:'rgba(16,185,129,.85)', borderRadius:6 }
      ]},
      options: { ...baseOpts, plugins:{legend:{position:'top',labels:{padding:14,font:{size:12}}}}, scales:{ y:{ beginAtZero:true, ticks:{ callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v) } } } }
    });
  }

  // 6. Monthly bar+line combo
  const monthCtx = document.getElementById('gc-monthly');
  if (monthCtx && monthLabels.length) {
    window._companyCharts.monthly = new Chart(monthCtx, {
      type: 'bar',
      data: { labels:monthLabels, datasets:[
        { type:'bar',  label:'Premium Due', data:monthDueData,  backgroundColor:'rgba(99,102,241,.6)', borderRadius:4, order:2 },
        { type:'line', label:'Amount Paid', data:monthPaidData, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.15)', borderWidth:2.5, fill:true, tension:.4, pointRadius:4, pointBackgroundColor:'#10b981', order:1 }
      ]},
      options: { ...baseOpts, plugins:{legend:{position:'top',labels:{padding:14,font:{size:12}}}}, scales:{ y:{ beginAtZero:true, ticks:{ callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v) } }, x:{ ticks:{font:{size:10},maxRotation:45} } } }
    });
  }

  // 7. Premium distribution by type
  const premTypeCtx = document.getElementById('gc-prem-type');
  if (premTypeCtx && Object.keys(typeCount).length) {
    const typePrems = {};
    policies.forEach(p => { const t=p.insuranceTypeName||p.insuranceType?.name||'Unknown'; typePrems[t]=(typePrems[t]||0)+(p.premiumAmount||0); });
    const tLabels = Object.keys(typePrems).sort((a,b)=>typePrems[b]-typePrems[a]);
    window._companyCharts.premType = new Chart(premTypeCtx, {
      type: 'bar',
      data: { labels:tLabels, datasets:[{ label:'Total Premium (₹)', data:tLabels.map(k=>typePrems[k]), backgroundColor:tLabels.map((_,i)=>palette[i%palette.length]), borderRadius:6 }] },
      options: { indexAxis:'y', ...baseOpts, plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>` ${fmtINR(ctx.raw)}`}} }, scales:{ x:{ beginAtZero:true, ticks:{callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)} }, y:{ ticks:{font:{size:11}, callback:function(v){ const l=this.getLabelForValue(v); return l.length>22?l.substring(0,20)+'…':l; }} } } }
    });
  }

  // ── INSURANCE ITEMS CHARTS ────────────────────────────────

  // 8. Items by type
  const itemsTypeCtx = document.getElementById('gc-items-type');
  if (itemsTypeCtx && itemTypeLabels.length) {
    window._companyCharts.itemsType = new Chart(itemsTypeCtx, {
      type: 'bar',
      data: {
        labels: itemTypeLabels,
        datasets: [
          { label:'Active',   data:itemTypeActives, backgroundColor:'rgba(16,185,129,.85)', borderRadius:4 },
          { label:'Inactive', data:itemTypeInacts,  backgroundColor:'rgba(239,68,68,.7)',   borderRadius:4 }
        ]
      },
      options: {
        indexAxis: 'y', ...baseOpts,
        plugins: { legend:{ position:'top', labels:{ padding:14, font:{size:12} } }, tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} item${ctx.raw===1?'':'s'}` } } },
        scales: { x:{ beginAtZero:true, stacked:false, ticks:{ stepSize:1, font:{size:11} }, grid:{color:'rgba(0,0,0,.05)'} }, y:{ ticks:{ font:{size:11}, callback:function(v){ const l=this.getLabelForValue(v); return l.length>22?l.substring(0,20)+'…':l; } } } }
      }
    });
  }

  // 9. Items Active/Inactive donut
  const itemsDonutCtx = document.getElementById('gc-items-donut');
  if (itemsDonutCtx && relevantItems.length) {
    window._companyCharts.itemsDonut = new Chart(itemsDonutCtx, {
      type: 'doughnut',
      data: { labels:['Active','Inactive'], datasets:[{ data:[itemActiveCount, itemInactiveCount], backgroundColor:['#10b981','#ef4444'], borderWidth:2, borderColor:'transparent' }] },
      options: { ...baseOpts, cutout:'68%', plugins:{ legend:{ position:'bottom', labels:{ padding:16, font:{size:12} } }, tooltip:{ callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.raw} item${ctx.raw===1?'':'s'}` } } } }
    });
  }
}

// ─── POLICY DETAIL NAV ────────────────────────────────────

window._goPolicyDetail = async function (policyId) {
  if (window.loadPolicies) {
    await window.loadPolicies();
    setTimeout(() => { if (window.showPolicyDetail) window.showPolicyDetail(policyId); }, 300);
  }
};

window.closeCompanyPanel = function () {
  const panel = document.getElementById('company-policy-panel');
  if (panel) panel.style.display = 'none';
  _destroyAllCharts();
  currentPoliciesData  = [];
  currentAnalyticsData = null;
};

// ─── GLOBAL EXPORTS ───────────────────────────────────────

window.loadCompanies              = loadCompanies;
window.openCompanyModal           = window.openCompanyModal;
window.submitCompany              = window.submitCompany;
window.deleteCompany              = window.deleteCompany;
window.autoFillAddressFromPincode = autoFillAddressFromPincode;
window.showCompanyPolicies        = showCompanyPolicies;
window.switchCompanyView          = switchCompanyView;
window.renderCompanyGraphs        = window.renderCompanyGraphs;
window.closeCompanyModal          = window.closeCompanyModal;
window.applyCompanyPolicyFilter   = window.applyCompanyPolicyFilter;
window.clearCompanyPolicyFilter   = window.clearCompanyPolicyFilter;
window.applyGraphFilter           = window.applyGraphFilter;
window.clearGraphFilter           = window.clearGraphFilter;
window._destroyAllCharts          = _destroyAllCharts;

console.log('✅ Companies module — client-side status recalculation: EXPIRED policies now display correctly');