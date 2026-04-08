// companies.js

async function loadCompanies() {
  const data = await api.get('/companies');
  const isAdmin = authUtils.isAdmin();

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Companies</h2>
        <p class="text-muted">${(data||[]).length} companies</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="co-search" placeholder="Search companies...">
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="openCompanyModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Company
        </button>` : ''}
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Short Name</th><th>Email</th><th>Address</th><th>Status</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="co-tbody">
          ${(data||[]).map(c => `
            <tr>
              <td>${c.name}</td>
              <td>${c.shortName || '—'}</td>
              <td>${c.contactEmail || '—'}</td>
              <td>${c.address || '—'}</td>
              <td>${c.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-expired">Inactive</span>'}</td>
              ${isAdmin ? `<td>
                <div class="flex gap-8">
                  <button class="btn btn-ghost btn-sm" onclick="openCompanyModal('${c.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteCompany('${c.id}','${c.name}')">Delete</button>
                </div>
              </td>` : ''}
            </tr>
          `).join('') || emptyState('No companies found')}
        </tbody>
      </table>
    </div>
  `;
  filterTable('co-search', 'co-tbody');
  if (isAdmin) buildCompanyModal(data);
}

function buildCompanyModal(companies = []) {
  createModal('company-modal', 'Company', `
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
        <label>Address</label>
        <input type="text" id="cm-address" placeholder="Mumbai, Maharashtra">
      </div>
    </div>
    <div class="form-group" style="margin-top:8px">
      <label class="checkbox-label">
        <input type="checkbox" id="cm-active" checked> Active
      </label>
    </div>
    <input type="hidden" id="cm-id">
  `, `
    <button class="btn btn-ghost" onclick="closeModal('company-modal')">Cancel</button>
    <button class="btn btn-primary" onclick="submitCompany()">Save</button>
  `);
}

async function openCompanyModal(id = null) {
  if (!document.getElementById('company-modal')) buildCompanyModal();
  ['cm-name','cm-short','cm-email','cm-address','cm-id'].forEach(i => { const el = document.getElementById(i); if(el) el.value=''; });
  document.getElementById('cm-active').checked = true;
  document.querySelector('#company-modal .modal-header h3').textContent = id ? 'Edit Company' : 'Add Company';
  if (id) {
    const c = await api.get(`/companies/${id}`);
    if (!c) return;
    document.getElementById('cm-id').value = id;
    document.getElementById('cm-name').value = c.name || '';
    document.getElementById('cm-short').value = c.shortName || '';
    document.getElementById('cm-email').value = c.contactEmail || '';
    document.getElementById('cm-address').value = c.address || '';
    document.getElementById('cm-active').checked = !!c.active;
  }
  openModal('company-modal');
}

async function submitCompany() {
  const id = document.getElementById('cm-id').value;
  const body = {
    name: document.getElementById('cm-name').value.trim(),
    shortName: document.getElementById('cm-short').value.trim(),
    contactEmail: document.getElementById('cm-email').value.trim(),
    address: document.getElementById('cm-address').value.trim(),
    active: document.getElementById('cm-active').checked,
  };
  if (!body.name) { showToast('Company name is required', 'warning'); return; }
  const result = id ? await api.put(`/companies/${id}`, body) : await api.post('/companies', body);
  if (result) {
    showToast(id ? 'Company updated!' : 'Company added!', 'success');
    closeModal('company-modal');
    loadCompanies();
  }
}

async function deleteCompany(id, name) {
  showConfirm('Delete Company', `Delete "${name}"?`, async () => {
    const result = await api.del(`/companies/${id}`);
    if (result !== null) { showToast('Company deleted', 'success'); loadCompanies(); }
  });
}

// ─── PROVIDERS ─────────────────────────────────────────────

async function loadProviders() {
  const data = await api.get('/providers');
  const isAdmin = authUtils.isAdmin();

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Providers</h2>
        <p class="text-muted">${(data||[]).length} providers</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="pv-search" placeholder="Search providers...">
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="openProviderModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Provider
        </button>` : ''}
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>Name</th><th>Contact Info</th><th>Status</th>${isAdmin ? '<th>Actions</th>' : ''}</tr>
        </thead>
        <tbody id="pv-tbody">
          ${(data||[]).map(p => `
            <tr>
              <td>${p.name}</td>
              <td>${p.contactInfo || '—'}</td>
              <td>${p.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-expired">Inactive</span>'}</td>
              ${isAdmin ? `<td>
                <button class="btn btn-danger btn-sm" onclick="deleteProvider('${p.id}','${p.name}')">Delete</button>
              </td>` : ''}
            </tr>
          `).join('') || emptyState('No providers found')}
        </tbody>
      </table>
    </div>
  `;
  filterTable('pv-search', 'pv-tbody');
  if (isAdmin) buildProviderModal();
}

function buildProviderModal() {
  createModal('provider-modal', 'Add Provider', `
    <div class="form-grid">
      <div class="form-group">
        <label>Provider Name *</label>
        <input type="text" id="pvm-name" placeholder="ICICI Lombard">
      </div>
      <div class="form-group">
        <label>Contact Info</label>
        <input type="text" id="pvm-contact" placeholder="1800-xxx-xxxx">
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal('provider-modal')">Cancel</button>
    <button class="btn btn-primary" onclick="submitProvider()">Add Provider</button>
  `);
}

function openProviderModal() {
  if (!document.getElementById('provider-modal')) buildProviderModal();
  document.getElementById('pvm-name').value = '';
  document.getElementById('pvm-contact').value = '';
  openModal('provider-modal');
}

async function submitProvider() {
  const body = {
    name: document.getElementById('pvm-name').value.trim(),
    contactInfo: document.getElementById('pvm-contact').value.trim(),
    active: true,
  };
  if (!body.name) { showToast('Provider name is required', 'warning'); return; }
  const result = await api.post('/providers', body);
  if (result) {
    showToast('Provider added!', 'success');
    closeModal('provider-modal');
    loadProviders();
  }
}

async function deleteProvider(id, name) {
  showConfirm('Delete Provider', `Delete "${name}"?`, async () => {
    const result = await api.del(`/providers/${id}`);
    if (result !== null) { showToast('Provider deleted', 'success'); loadProviders(); }
  });
}

// ─── INSURANCE TYPES ──────────────────────────────────────

async function loadTypes() {
  const data = await api.get('/insurance-types');
  const isAdmin = authUtils.isAdmin();

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Types</h2>
        <p class="text-muted">${(data||[]).length} types</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="ty-search" placeholder="Search types...">
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="openTypeModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Type
        </button>` : ''}
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>Name</th><th>Description</th><th>Status</th>${isAdmin ? '<th>Actions</th>' : ''}</tr>
        </thead>
        <tbody id="ty-tbody">
          ${(data||[]).map(t => `
            <tr>
              <td>${t.name}</td>
              <td>${t.description || '—'}</td>
              <td>${t.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-expired">Inactive</span>'}</td>
              ${isAdmin ? `<td>
                <div class="flex gap-8">
                  <button class="btn btn-ghost btn-sm" onclick="openTypeModal('${t.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteType('${t.id}','${t.name}')">Deactivate</button>
                </div>
              </td>` : ''}
            </tr>
          `).join('') || emptyState('No insurance types found')}
        </tbody>
      </table>
    </div>
  `;
  filterTable('ty-search', 'ty-tbody');
  if (isAdmin) buildTypeModal();
}

function buildTypeModal() {
  createModal('type-modal', 'Insurance Type', `
    <div class="form-grid">
      <div class="form-group">
        <label>Type Name *</label>
        <input type="text" id="tym-name" placeholder="Health, Vehicle, Fire...">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="tym-desc" placeholder="Brief description">
      </div>
    </div>
    <div class="form-group" style="margin-top:8px">
      <label class="checkbox-label">
        <input type="checkbox" id="tym-active" checked> Active
      </label>
    </div>
    <input type="hidden" id="tym-id">
  `, `
    <button class="btn btn-ghost" onclick="closeModal('type-modal')">Cancel</button>
    <button class="btn btn-primary" onclick="submitType()">Save</button>
  `);
}

async function openTypeModal(id = null) {
  if (!document.getElementById('type-modal')) buildTypeModal();
  document.getElementById('tym-name').value = '';
  document.getElementById('tym-desc').value = '';
  document.getElementById('tym-id').value = '';
  document.getElementById('tym-active').checked = true;
  document.querySelector('#type-modal .modal-header h3').textContent = id ? 'Edit Type' : 'Add Type';
  if (id) {
    // Find in current data
    const el = document.querySelector(`#ty-tbody tr`);
    // fetch fresh
    const all = await api.get('/insurance-types/all') || await api.get('/insurance-types');
    const t = (all||[]).find(x => x.id === id);
    if (t) {
      document.getElementById('tym-id').value = id;
      document.getElementById('tym-name').value = t.name || '';
      document.getElementById('tym-desc').value = t.description || '';
      document.getElementById('tym-active').checked = !!t.active;
    }
  }
  openModal('type-modal');
}

async function submitType() {
  const id = document.getElementById('tym-id').value;
  const body = {
    name: document.getElementById('tym-name').value.trim(),
    description: document.getElementById('tym-desc').value.trim(),
    active: document.getElementById('tym-active').checked,
  };
  if (!body.name) { showToast('Type name is required', 'warning'); return; }
  const result = id ? await api.put(`/insurance-types/${id}`, body) : await api.post('/insurance-types', body);
  if (result) {
    showToast(id ? 'Type updated!' : 'Type added!', 'success');
    closeModal('type-modal');
    loadTypes();
  }
}

async function deleteType(id, name) {
  showConfirm('Deactivate Type', `Deactivate type "${name}"?`, async () => {
    const result = await api.del(`/insurance-types/${id}`);
    if (result !== null) { showToast('Type deactivated', 'success'); loadTypes(); }
  });
}

// ─── EXPORT ───────────────────────────────────────────────

function loadExport() {
  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Export Data</h2>
        <p class="text-muted">Download reports in various formats</p>
      </div>
    </div>

    <h3 style="font-size:0.875rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:12px">Policies</h3>
    <div class="export-grid" style="margin-bottom:24px">
      ${exportCard('CSV', 'policies', '/export/policies/csv', 'policies.csv', '#34d399', 'green')}
      ${exportCard('Excel', 'policies', '/export/policies/excel', 'policies.xlsx', '#4f8ef7', 'blue')}
      ${exportCard('PDF/HTML', 'policies', '/export/policies/pdf', 'policies.html', '#a78bfa', 'purple')}
    </div>

    <h3 style="font-size:0.875rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:12px">Payments</h3>
    <div class="export-grid">
      ${exportCard('CSV', 'payments', '/export/payments/csv', 'payments.csv', '#34d399', 'green')}
      ${exportCard('Excel', 'payments', '/export/payments/excel', 'payments.xlsx', '#4f8ef7', 'blue')}
      ${exportCard('PDF/HTML', 'payments', '/export/payments/pdf', 'payments.html', '#a78bfa', 'purple')}
    </div>
  `;
}

function exportCard(format, type, path, filename, color, cls) {
  const icons = {
    CSV: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    Excel: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    'PDF/HTML': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 17H8M16 13H8M10 9H8"/></svg>`,
  };
  return `
    <div class="export-card" onclick="api.download('${path}','${filename}')">
      <div class="export-icon" style="background:var(--${cls}-soft);color:${color}">${icons[format]}</div>
      <h4>${format}</h4>
      <p>Export ${type} as ${format}</p>
    </div>
  `;
}

// ─── RECYCLE BIN ──────────────────────────────────────────

async function loadRecycleBin() {
  const data = await api.get('/recycle-bin');
  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Recycle Bin</h2>
        <p class="text-muted">${(data||[]).length} deleted items</p>
      </div>
      ${(data||[]).length ? `<button class="btn btn-danger" onclick="emptyRecycleBin()">Empty Bin</button>` : ''}
    </div>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Type</th><th>Name</th><th>Deleted At</th><th>Deleted By</th><th>Actions</th></tr></thead>
        <tbody>
          ${(data||[]).map(item => `
            <tr>
              <td><span class="badge badge-purple">${item.type || '—'}</span></td>
              <td>${item.name || item.id}</td>
              <td>${fmt.date(item.deletedAt)}</td>
              <td>${item.deletedBy || '—'}</td>
              <td>
                <div class="flex gap-8">
                  <button class="btn btn-success btn-sm" onclick="restoreItem('${item.id}')">Restore</button>
                  <button class="btn btn-danger btn-sm" onclick="permanentDelete('${item.id}')">Delete Forever</button>
                </div>
              </td>
            </tr>
          `).join('') || emptyState('Recycle bin is empty')}
        </tbody>
      </table>
    </div>
  `;
}

async function restoreItem(id) {
  const result = await api.put(`/recycle-bin/${id}/restore`);
  if (result !== null) { showToast('Item restored!', 'success'); loadRecycleBin(); }
}
async function permanentDelete(id) {
  showConfirm('Permanent Delete', 'This cannot be undone!', async () => {
    const result = await api.del(`/recycle-bin/${id}`);
    if (result !== null) { showToast('Permanently deleted', 'success'); loadRecycleBin(); }
  });
}
async function emptyRecycleBin() {
  showConfirm('Empty Recycle Bin', 'Permanently delete all items? This cannot be undone!', async () => {
    const result = await api.del('/recycle-bin/empty');
    if (result !== null) { showToast('Recycle bin emptied', 'success'); loadRecycleBin(); }
  });
}