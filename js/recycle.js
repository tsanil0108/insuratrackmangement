// recycle.js — Recycle Bin module (Admin only)
// Depends on: utils.js, api.js

let recycleBinData = [];
let recycleFilter  = 'ALL';
let searchTerm     = '';

async function loadRecycleBin() {
  if (!authUtils.isAdmin()) { navigate('dashboard'); return; }

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Recycle Bin</h2>
        <p class="text-muted" id="recycle-count">Loading...</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="recycle-search" placeholder="Search by name, policy, company...">
        </div>
        <button class="btn btn-danger" onclick="emptyRecycleBin()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          Empty Bin
        </button>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:16px;">
      <div class="tab active" onclick="filterRecycle(this,'ALL')">All</div>
      <div class="tab" onclick="filterRecycle(this,'POLICY')">Policies</div>
      <div class="tab" onclick="filterRecycle(this,'COMPANY')">Companies</div>
      <div class="tab" onclick="filterRecycle(this,'PROVIDER')">Providers</div>
      <div class="tab" onclick="filterRecycle(this,'INSURANCE_TYPE')">Insurance Types</div>
      <div class="tab" onclick="filterRecycle(this,'PAYMENT')">Payments</div>
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
            <th>Description</th>
            <th>Deleted At</th>
            <th>Deleted By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="recycle-tbody">
          <tr><td colspan="10" style="text-align:center; padding:40px;">
            <div class="spinner"></div>
          </td</tr>
        </tbody>
      </table>
    </div>
  `;

  // Initialize search listener
  setTimeout(() => {
    const searchInput = document.getElementById('recycle-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderRecycleRows();
      });
    }
  }, 100);

  await refreshRecycleBin();
}

// ─── LOAD & RENDER ────────────────────────────────────────

async function refreshRecycleBin() {
  try {
    window.showSpinner();
    const data = await api.get('/recycle-bin');
    recycleBinData = data || [];
    window.hideSpinner();

    const countEl = document.getElementById('recycle-count');
    if (countEl) countEl.textContent = `${recycleBinData.length} deleted items`;

    renderRecycleRows();
  } catch (error) {
    window.hideSpinner();
    const tbody = document.getElementById('recycle-tbody');
    if (tbody) tbody.innerHTML = `
      <tr><td colspan="10">
        <div class="empty-state" style="padding:48px 0;">
          <p style="color:var(--red);">Failed to load recycle bin data</p>
          <button class="btn btn-primary btn-sm" onclick="refreshRecycleBin()">Retry</button>
        </div>
      </td></tr>`;
  }
}

function renderRecycleRows() {
  const tbody = document.getElementById('recycle-tbody');
  if (!tbody) return;

  // Apply type filter
  let filtered = recycleFilter === 'ALL'
    ? recycleBinData
    : recycleBinData.filter(i => i.type === recycleFilter);
  
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(item => {
      const name = (item.policyNumber || item.name || '').toLowerCase();
      const company = (item.companyName || '').toLowerCase();
      const provider = (item.providerName || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const assignedTo = (item.assignedTo || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      
      return name.includes(searchTerm) ||
             company.includes(searchTerm) ||
             provider.includes(searchTerm) ||
             type.includes(searchTerm) ||
             assignedTo.includes(searchTerm) ||
             description.includes(searchTerm);
    });
  }

  if (!filtered.length) {
    const message = searchTerm 
      ? `No items match "${searchTerm}"`
      : 'Recycle bin is empty';
    tbody.innerHTML = `
      <tr><td colspan="10">
        <div class="empty-state" style="padding:48px 0;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:12px;">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          <p style="color:var(--text-muted); font-size:14px;">${message}</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const nameRaw  = item.policyNumber || item.name || '—';
    const nameSafe = window.escapeHtml(nameRaw).replace(/'/g, "\\'");

    return `
      <tr>
        <td>${typeBadge(item.type)}</td>
        <td>
          <span class="mono" style="color:var(--accent); font-weight:600;">
            ${window.escapeHtml(nameRaw)}
          </span>
         </td>
        <td>
          ${item.type === 'POLICY' || item.type === 'PAYMENT'
            ? `<span style="display:flex; align-items:center; gap:6px;">
                 <span style="width:24px; height:24px; border-radius:50%; background:var(--accent);
                   display:inline-flex; align-items:center; justify-content:center;
                   font-size:10px; font-weight:700; color:#fff;">
                   ${(item.assignedTo || item.deletedBy || '?').charAt(0).toUpperCase()}
                 </span>
                 ${window.escapeHtml(item.assignedTo) || '<span class="text-muted">—</span>'}
               </span>`
            : '<span class="text-muted">—</span>'}
         </td>
        <td>${window.escapeHtml(item.companyName)       || '<span class="text-muted">—</span>'}</td>
        <td>${window.escapeHtml(item.providerName)      || '<span class="text-muted">—</span>'}</td>
        <td>${window.escapeHtml(item.insuranceTypeName) || '<span class="text-muted">—</span>'}</td>
        <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
            title="${window.escapeHtml(item.description || '')}">
          ${window.escapeHtml(item.description) || '<span class="text-muted">—</span>'}
        </td>
        <td style="white-space:nowrap;">${formatDeletedAt(item.deletedAt)}</td>
        <td>
          <span style="display:flex; align-items:center; gap:6px;">
            <span style="width:24px; height:24px; border-radius:50%; background:var(--bg-surface);
              border:1px solid var(--border); display:inline-flex; align-items:center;
              justify-content:center; font-size:10px; font-weight:700; color:var(--text-primary);">
              ${(item.deletedBy || '?').charAt(0).toUpperCase()}
            </span>
            ${window.escapeHtml(item.deletedBy) || '—'}
          </span>
         </td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" style="color:var(--green); border-color:var(--green);"
              onclick="window.restoreRecycleItem('${item.id}', '${item.type}', '${nameSafe}')">
              ↩ Restore
            </button>
            <button class="btn btn-danger btn-sm"
              onclick="window.permanentDeleteRecycleItem('${item.id}', '${nameSafe}')">
              🗑 Delete Forever
            </button>
          </div>
         </td>
      </table>`;
  }).join('');
}

// ─── TYPE BADGE ───────────────────────────────────────────

function typeBadge(type) {
  const colors = {
    POLICY:         { bg: 'rgba(99,102,241,.15)',  color: '#818cf8' },
    COMPANY:        { bg: 'rgba(16,185,129,.15)',  color: '#34d399' },
    PROVIDER:       { bg: 'rgba(245,158,11,.15)',  color: '#fbbf24' },
    PAYMENT:        { bg: 'rgba(239,68,68,.15)',   color: '#f87171' },
    INSURANCE_TYPE: { bg: 'rgba(139,92,246,.15)',  color: '#a78bfa' },
  };
  const c = colors[type] || { bg: 'rgba(156,163,175,.15)', color: '#9ca3af' };
  const label = type === 'INSURANCE_TYPE' ? 'INS. TYPE' : type;
  return `<span style="background:${c.bg}; color:${c.color};
    padding:3px 10px; border-radius:20px;
    font-size:11px; font-weight:600; letter-spacing:.04em; white-space:nowrap;">
    ${label}
  </span>`;
}

// ─── FORMAT DATE ──────────────────────────────────────────

function formatDeletedAt(raw) {
  if (!raw) return '<span class="text-muted">—</span>';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch { return raw; }
}

// ─── FILTER ───────────────────────────────────────────────

function filterRecycle(tab, type) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  recycleFilter = type;
  renderRecycleRows();
}

// ─── RESTORE (FIXED) ─────────────────────────────────────────────

async function restoreRecycleItem(id, type, name) {
  console.log('🔄 Restoring item:', { id, type, name });
  
  const confirmed = confirm(`Restore "${name}" (${type}) back to active records?`);
  
  if (!confirmed) return;
  
  try {
    window.showSpinner();
    console.log('📤 Sending restore request for:', id);
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/recycle-bin/${id}/restore`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast(`"${name}" restored successfully`, 'success');
      await refreshRecycleBin();
    } else {
      const errorText = await response.text();
      console.error('❌ Restore failed:', errorText);
      window.showToast(errorText || 'Failed to restore', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    console.error('❌ Restore error:', error);
    window.showToast(error.message || 'Failed to restore', 'error');
  }
}

// ─── PERMANENT DELETE (FIXED) ────────────────────────────────────

async function permanentDeleteRecycleItem(id, name) {
  console.log('🗑 Permanent delete called for:', { id, name });
  
  const confirmed = confirm(`Permanently delete "${name}"? This CANNOT be undone.`);
  
  if (!confirmed) return;
  
  try {
    window.showSpinner();
    console.log('📤 Sending permanent delete request for:', id);
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/recycle-bin/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast(`"${name}" permanently deleted`, 'success');
      await refreshRecycleBin();
    } else {
      const errorText = await response.text();
      console.error('❌ Delete failed:', errorText);
      window.showToast(errorText || 'Failed to delete', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    console.error('❌ Delete error:', error);
    window.showToast(error.message || 'Failed to delete', 'error');
  }
}

// ─── EMPTY BIN ────────────────────────────────────────────

async function emptyRecycleBin() {
  if (!recycleBinData.length) { 
    window.showToast('Recycle bin is already empty', 'warning'); 
    return; 
  }
  
  const confirmed = confirm(`Permanently delete ALL ${recycleBinData.length} items? This CANNOT be undone.`);
  
  if (!confirmed) return;
  
  try {
    window.showSpinner();
    console.log('📤 Emptying recycle bin...');
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/recycle-bin/empty`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast('Recycle bin emptied', 'success');
      await refreshRecycleBin();
    } else {
      const errorText = await response.text();
      console.error('❌ Empty bin failed:', errorText);
      window.showToast(errorText || 'Failed to empty bin', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    console.error('❌ Empty bin error:', error);
    window.showToast(error.message || 'Failed to empty bin', 'error');
  }
}

// ─── CLEAR SEARCH ────────────────────────────────────────────

function clearRecycleSearch() {
  searchTerm = '';
  const searchInput = document.getElementById('recycle-search');
  if (searchInput) searchInput.value = '';
  renderRecycleRows();
}

// ─── GLOBAL EXPORTS ───────────────────────────────────────
window.loadRecycleBin             = loadRecycleBin;
window.filterRecycle              = filterRecycle;
window.restoreRecycleItem         = restoreRecycleItem;
window.permanentDeleteRecycleItem = permanentDeleteRecycleItem;
window.emptyRecycleBin            = emptyRecycleBin;
window.refreshRecycleBin          = refreshRecycleBin;
window.clearRecycleSearch         = clearRecycleSearch;

console.log('Recycle bin module loaded');
console.log('window.permanentDeleteRecycleItem type:', typeof window.permanentDeleteRecycleItem);