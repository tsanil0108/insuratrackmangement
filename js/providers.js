// providers.js — Insurance Providers module (standalone)
// Depends on: utils.js, api.js

async function loadProviders() {
  const data = await api.get('/providers');
  const isAdmin = authUtils.isAdmin();

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Providers</h2>
        <p class="text-muted">${(data || []).length} providers</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="pv-search" placeholder="Search providers...">
        </div>
        ${isAdmin ? `
          <button class="btn btn-primary" onclick="window.openProviderModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Provider
          </button>` : ''}
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact Info</th>
            <th>Status</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="pv-tbody">
          ${renderProviderRows(data || [], isAdmin)}
        </tbody>
      </table>
    </div>
  `;

  window.filterTable('pv-search', 'pv-tbody');
  if (isAdmin) buildProviderModal();
}

// ─── RENDER ───────────────────────────────────────────────

function renderProviderRows(data, isAdmin) {
  if (!data.length) {
    return window.emptyState('No providers found', isAdmin ? 4 : 3);
  }
  return data.map(p => `
    <tr>
      <td><strong>${window.escapeHtml(p.name)}</strong></td>
      <td>${window.escapeHtml(p.contactInfo) || '<span class="text-muted">—</span>'}</td>
      <td>
        ${p.active
          ? '<span class="badge badge-active">● Active</span>'
          : '<span class="badge badge-expired">● Inactive</span>'}
      </td>
      ${isAdmin ? `
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm"
              onclick="window.openProviderModal('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-sm"
              onclick="window.deleteProvider('${p.id}', '${window.escapeHtml(p.name).replace(/'/g, "\\'")}')">Delete</button>
          </div>
        </td>` : ''}
    </tr>
  `).join('');
}

// ─── MODAL ────────────────────────────────────────────────

function buildProviderModal() {
  if (document.getElementById('provider-modal')) return;
  window.createModal(
    'provider-modal',
    'Add Provider',
    `<div class="form-grid">
      <div class="form-group">
        <label>Provider Name *</label>
        <input type="text" id="pvm-name" placeholder="ICICI Lombard">
      </div>
      <div class="form-group">
        <label>Contact Info</label>
        <input type="text" id="pvm-contact" placeholder="1800-xxx-xxxx">
      </div>
      <div class="form-group" style="margin-top:8px">
        <label class="checkbox-label">
          <input type="checkbox" id="pvm-active" checked> Active
        </label>
      </div>
      <input type="hidden" id="pvm-id">
    </div>`,
    `<button class="btn btn-ghost" onclick="window.closeModal('provider-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="window.submitProvider()">Save Provider</button>`
  );
}

async function openProviderModal(id = null) {
  buildProviderModal();

  // Reset fields
  ['pvm-name', 'pvm-contact', 'pvm-id'].forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = '';
  });
  const activeEl = document.getElementById('pvm-active');
  if (activeEl) activeEl.checked = true;

  const titleEl = document.querySelector('#provider-modal .modal-header h3');
  if (titleEl) titleEl.textContent = id ? 'Edit Provider' : 'Add Provider';

  if (id) {
    const p = await api.get(`/providers/${id}`);
    if (!p) return;
    document.getElementById('pvm-id').value      = id;
    document.getElementById('pvm-name').value    = p.name || '';
    document.getElementById('pvm-contact').value = p.contactInfo || '';
    if (activeEl) activeEl.checked = !!p.active;
  }

  window.openModal('provider-modal');
}

async function submitProvider() {
  const id = document.getElementById('pvm-id')?.value;
  const body = {
    name:        document.getElementById('pvm-name')?.value.trim(),
    contactInfo: document.getElementById('pvm-contact')?.value.trim(),
    active:      document.getElementById('pvm-active')?.checked ?? true,
  };

  if (!body.name) { window.showToast('Provider name is required', 'warning'); return; }

  const result = id
    ? await api.put(`/providers/${id}`, body)
    : await api.post('/providers', body);

  if (result) {
    window.showToast(id ? 'Provider updated!' : 'Provider added!', 'success');
    window.closeModal('provider-modal');
    loadProviders();
  }
}

// ✅ FIXED DELETE FUNCTION - Direct fetch with better error handling
async function deleteProvider(id, name) {
  console.log('🔴 Delete provider called for:', id, name);
  
  const confirmed = confirm(`Delete provider "${name}"? This action cannot be undone.`);
  
  if (!confirmed) {
    console.log('User cancelled delete');
    return;
  }
  
  try {
    window.showSpinner();
    console.log('📤 Sending DELETE request for provider:', id);
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/providers/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast('Provider deleted successfully!', 'success');
      console.log('✅ Provider deleted, reloading...');
      await loadProviders();
    } else {
      const errorText = await response.text();
      console.error('❌ Delete failed:', errorText);
      window.showToast(errorText || 'Failed to delete provider', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    console.error('❌ Delete error:', error);
    window.showToast(error.message || 'Failed to delete provider', 'error');
  }
}

// ─── GLOBAL EXPORTS ───────────────────────────────────────
window.loadProviders      = loadProviders;
window.openProviderModal  = openProviderModal;
window.submitProvider     = submitProvider;
window.deleteProvider     = deleteProvider;

console.log('Providers module loaded');
console.log('window.deleteProvider type:', typeof window.deleteProvider);