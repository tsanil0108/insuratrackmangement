// companies.js — Complete working version

async function loadCompanies() {
  const data = await api.get('/companies');
  const isAdmin = authUtils.isAdmin();

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Companies</h2>
        <p class="text-muted">${(data || []).length} companies</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="co-search" placeholder="Search companies...">
        </div>
        ${isAdmin ? `
          <button class="btn btn-primary" onclick="openCompanyModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Company
          </button>` : ''}
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Short Name</th>
            <th>Email</th>
            <th>Address</th>
            <th>Status</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="co-tbody">
          ${renderCompanyRows(data || [], isAdmin)}
        </tbody>
      </table>
    </div>
  `;

  window.filterTable('co-search', 'co-tbody');
  if (isAdmin) buildCompanyModal();
}

function renderCompanyRows(data, isAdmin) {
  if (!data.length) return window.emptyState('No companies found', isAdmin ? 6 : 5);

  return data.map(c => `
    <tr>
      <td><strong>${window.escapeHtml(c.name)}</strong></td>
      <td>${window.escapeHtml(c.shortName) || '<span class="text-muted">—</span>'}</td>
      <td>${window.escapeHtml(c.contactEmail) || '<span class="text-muted">—</span>'}</td>
      <td>${window.escapeHtml(c.address) || '<span class="text-muted">—</span>'}</td>
      <td>${c.active ? '<span class="badge badge-active">● Active</span>' : '<span class="badge badge-expired">● Inactive</span>'}</td>
      ${isAdmin ? `
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="openCompanyModal('${c.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteCompany('${c.id}', '${window.escapeHtml(c.name).replace(/'/g, "\\'")}')">Delete</button>
          </div>
        </td>` : ''}
      </tr>
  `).join('');
}

function buildCompanyModal() {
  if (document.getElementById('company-modal')) return;
  window.createModal('company-modal', 'Company',
    `<div class="form-grid">
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
        <label>Address</label>
        <input type="text" id="cm-address" placeholder="Mumbai, Maharashtra">
      </div>
    </div>
    <div class="form-group" style="margin-top:8px">
      <label class="checkbox-label">
        <input type="checkbox" id="cm-active" checked> Active
      </label>
    </div>
    <input type="hidden" id="cm-id">`,
    `<button class="btn btn-ghost" onclick="window.closeModal('company-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="submitCompany()">Save</button>`
  );
}

async function openCompanyModal(id = null) {
  buildCompanyModal();

  ['cm-name', 'cm-short', 'cm-email', 'cm-address', 'cm-id'].forEach(i => {
    const el = document.getElementById(i);
    if (el) el.value = '';
  });
  const activeEl = document.getElementById('cm-active');
  if (activeEl) activeEl.checked = true;

  const titleEl = document.querySelector('#company-modal .modal-header h3');
  if (titleEl) titleEl.textContent = id ? 'Edit Company' : 'Add Company';

  if (id) {
    const c = await api.get(`/companies/${id}`);
    if (!c) return;
    document.getElementById('cm-id').value = id;
    document.getElementById('cm-name').value = c.name || '';
    document.getElementById('cm-short').value = c.shortName || '';
    document.getElementById('cm-email').value = c.contactEmail || '';
    document.getElementById('cm-address').value = c.address || '';
    if (activeEl) activeEl.checked = !!c.active;
  }

  window.openModal('company-modal');
}

async function submitCompany() {
  const id = document.getElementById('cm-id')?.value;
  const body = {
    name: document.getElementById('cm-name')?.value.trim(),
    shortName: document.getElementById('cm-short')?.value.trim(),
    contactEmail: document.getElementById('cm-email')?.value.trim(),
    address: document.getElementById('cm-address')?.value.trim(),
    active: document.getElementById('cm-active')?.checked ?? true,
  };

  if (!body.name) { window.showToast('Company name is required', 'warning'); return; }

  const result = id ? await api.put(`/companies/${id}`, body) : await api.post('/companies', body);

  if (result) {
    window.showToast(id ? 'Company updated!' : 'Company added!', 'success');
    window.closeModal('company-modal');
    loadCompanies();
  }
}

// ✅ CRITICAL: Make sure deleteCompany is attached to window object
async function deleteCompany(id, name) {
  console.log('Delete function called for:', id, name);
  
  const confirmed = confirm(`Delete "${name}"? This cannot be undone.`);
  if (!confirmed) return;
  
  try {
    window.showSpinner();
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/companies/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast('Company deleted successfully!', 'success');
      loadCompanies();
    } else {
      const error = await response.text();
      window.showToast(error || 'Failed to delete', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    window.showToast(error.message, 'error');
  }
}

// ✅ IMPORTANT: Explicitly attach all functions to window
window.loadCompanies = loadCompanies;
window.openCompanyModal = openCompanyModal;
window.submitCompany = submitCompany;
window.deleteCompany = deleteCompany;  // This is the critical line!

// ✅ Verify registration
console.log('Companies module loaded');
console.log('window.deleteCompany type:', typeof window.deleteCompany);
console.log('window.deleteCompany function:', window.deleteCompany);