// recycle.js — Recycle Bin module (Admin only)
// FIX: restore uses api.post (backend @PostMapping("/{id}/restore"))
// FIX: fixed </details> typo → </td></tr>

let recycleBinData = [];
let recycleFilter  = 'ALL';
let recycleSearchTerm = '';

async function loadRecycleBin() {
  if (!authUtils || !authUtils.isAdmin()) { navigate('dashboard'); return; }

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Recycle Bin</h2>
        <p class="text-muted" id="recycle-count">Loading...</p>
      </div>
      <div class="flex items-center gap-8" style="flex-wrap:wrap;">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="recycle-search" placeholder="Search deleted items...">
        </div>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:16px;">
      <div class="tab active" onclick="filterRecycle(this,'ALL')">All</div>
      <div class="tab" onclick="filterRecycle(this,'POLICY')">Policies</div>
      <div class="tab" onclick="filterRecycle(this,'COMPANY')">Companies</div>
      <div class="tab" onclick="filterRecycle(this,'PROVIDER')">Providers</div>
      <div class="tab" onclick="filterRecycle(this,'INSURANCE_TYPE')">Insurance Types</div>
      <div class="tab" onclick="filterRecycle(this,'HYPOTHECATION')">Hypothecations</div>
      <div class="tab" onclick="filterRecycle(this,'INSURANCE_ITEM')">Insurance Items</div>
      <div class="tab" onclick="filterRecycle(this,'USER')">Users</div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Name / Policy No.</th>
            <th>Assigned To</th>
            <th>Company</th>
            <th>Provider</th>
            <th>Insurance Type</th>
            <th>Deleted At</th>
            <th>Deleted By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="recycle-tbody">
          <tr><td colspan="9" style="text-align:center;padding:40px;">
            <div class="spinner" style="margin:0 auto;"></div>
          </td></tr>
        </tbody>
      </table>
    </div>
  `;

  setTimeout(() => {
    const searchInput = document.getElementById('recycle-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        recycleSearchTerm = e.target.value.toLowerCase();
        renderRecycleRows();
      });
    }
  }, 100);

  await refreshRecycleBin();
}

async function refreshRecycleBin() {
  try {
    window.showSpinner();
    // FIX: path is 'recycle-bin' → buildUrl makes it '/api/recycle-bin'
    const data = await api.get('recycle-bin');
    recycleBinData = data || [];
    window.hideSpinner();

    const countEl = document.getElementById('recycle-count');
    if (countEl) countEl.textContent = `${recycleBinData.length} deleted items`;
  } catch (error) {
    window.hideSpinner();
    const tbody = document.getElementById('recycle-tbody');
    if (tbody) tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state" style="padding:48px 0;text-align:center;">
          <p style="color:var(--red);">Failed to load recycle bin</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="refreshRecycleBin()">Retry</button>
        </div>
      </td></tr>`;
  }
  renderRecycleRows();
}

function renderRecycleRows() {
  const tbody = document.getElementById('recycle-tbody');
  if (!tbody) return;

  let filtered = recycleFilter === 'ALL'
    ? recycleBinData
    : recycleBinData.filter(i => i.type === recycleFilter);

  if (recycleSearchTerm) {
    filtered = filtered.filter(item =>
      (item.policyNumber || item.name || '').toLowerCase().includes(recycleSearchTerm) ||
      (item.companyName    || '').toLowerCase().includes(recycleSearchTerm) ||
      (item.providerName   || '').toLowerCase().includes(recycleSearchTerm) ||
      (item.type           || '').toLowerCase().includes(recycleSearchTerm) ||
      (item.assignedTo     || '').toLowerCase().includes(recycleSearchTerm) ||
      (item.deletedBy      || '').toLowerCase().includes(recycleSearchTerm)
    );
  }

  if (!filtered.length) {
    const msg = recycleSearchTerm ? `No items match "${recycleSearchTerm}"` : 'Recycle bin is empty';
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state" style="padding:48px 0;text-align:center;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:12px;">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          <p style="color:var(--text-muted);font-size:14px;">${msg}</p>
        </div>
      </td></tr>`;
    return;
  }

  // FIX: fixed closing tag — was </details> now </tr>
  tbody.innerHTML = filtered.map(item => {
    const nameRaw  = item.policyNumber || item.name || '—';
    const nameSafe = window.escapeHtml(nameRaw).replace(/'/g, "\\'");

    return `
      <tr>
        <td>${recycleTypeBadge(item.type)}</td>
        <td><span class="mono" style="color:var(--accent);font-weight:600;">${window.escapeHtml(nameRaw)}</span></td>
        <td>
          ${item.assignedTo
            ? `<span style="display:flex;align-items:center;gap:6px;">
                <span style="width:24px;height:24px;border-radius:50%;background:var(--accent);
                  display:inline-flex;align-items:center;justify-content:center;
                  font-size:10px;font-weight:700;color:#fff;flex-shrink:0;">
                  ${(item.assignedTo || '?').charAt(0).toUpperCase()}
                </span>
                ${window.escapeHtml(item.assignedTo)}
               </span>`
            : '<span class="text-muted">—</span>'}
        </td>
        <td>${window.escapeHtml(item.companyName)       || '<span class="text-muted">—</span>'}</td>
        <td>${window.escapeHtml(item.providerName)      || '<span class="text-muted">—</span>'}</td>
        <td>${window.escapeHtml(item.insuranceTypeName) || '<span class="text-muted">—</span>'}</td>
        <td style="white-space:nowrap;">${recycleFormatDate(item.deletedAt)}</td>
        <td>
          <span style="display:flex;align-items:center;gap:6px;">
            <span style="width:24px;height:24px;border-radius:50%;background:var(--bg-elevated);
              border:1px solid var(--border);display:inline-flex;align-items:center;
              justify-content:center;font-size:10px;font-weight:700;color:var(--text-primary);flex-shrink:0;">
              ${(item.deletedBy || '?').charAt(0).toUpperCase()}
            </span>
            ${window.escapeHtml(item.deletedBy) || '—'}
          </span>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm" style="color:var(--green);border-color:rgba(16,185,129,.3);white-space:nowrap;"
            onclick="restoreRecycleItem('${item.id}', '${item.type}', '${nameSafe}')">
            &#8617; Restore
          </button>
        </td>
      </tr>`;
  }).join('');
}

function recycleTypeBadge(type) {
  const colors = {
    POLICY:         { bg: 'rgba(99,102,241,.15)',  color: '#818cf8' },
    COMPANY:        { bg: 'rgba(16,185,129,.15)',  color: '#34d399' },
    PROVIDER:       { bg: 'rgba(245,158,11,.15)',  color: '#fbbf24' },
    HYPOTHECATION:  { bg: 'rgba(239,68,68,.15)',   color: '#f87171' },
    INSURANCE_TYPE: { bg: 'rgba(139,92,246,.15)',  color: '#a78bfa' },
    INSURANCE_ITEM: { bg: 'rgba(6,182,212,.15)',   color: '#22d3ee' },
    USER:           { bg: 'rgba(236,72,153,.15)',  color: '#f472b6' },
  };
  const c = colors[type] || { bg: 'rgba(156,163,175,.15)', color: '#9ca3af' };
  const label = type === 'INSURANCE_TYPE' ? 'INS.TYPE'
              : type === 'INSURANCE_ITEM' ? 'INS.ITEM'
              : (type || '—');
  return `<span style="background:${c.bg};color:${c.color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.04em;white-space:nowrap;">${label}</span>`;
}

function recycleFormatDate(raw) {
  if (!raw) return '<span class="text-muted">—</span>';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return raw; }
}

function filterRecycle(tab, type) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  recycleFilter = type;
  renderRecycleRows();
}

async function restoreRecycleItem(id, type, name) {
  const confirmed = confirm(`Restore "${name}" (${type}) back to active records?`);
  if (!confirmed) return;

  try {
    window.showSpinner();
    // FIX: backend is @PostMapping("/{id}/restore") under /api/recycle-bin
    const result = await api.post(`recycle-bin/${id}/restore`, {});
    window.hideSpinner();

    if (result !== null) {
      window.showToast(`"${name}" restored successfully`, 'success');
      await refreshRecycleBin();
    } else {
      window.showToast('Failed to restore item', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    window.showToast(error.message || 'Failed to restore', 'error');
  }
}

window.loadRecycleBin     = loadRecycleBin;
window.filterRecycle      = filterRecycle;
window.refreshRecycleBin  = refreshRecycleBin;
window.restoreRecycleItem = restoreRecycleItem;

console.log('Recycle bin module loaded');