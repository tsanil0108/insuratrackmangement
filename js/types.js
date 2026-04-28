// types.js — Insurance Types module
// When type is selected in policy form, insurance items auto-load (handled in policies.js)

let typesData = [];

async function loadTypes() {
  const isAdmin = authUtils?.isAdmin() || false;
  const data = await api.get('v1/insurance-types');
  typesData = data || [];

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Types</h2>
        <p class="text-muted">${typesData.length} types</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="types-search" placeholder="Search types...">
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="window.openTypeModal()">+ Add Type</button>` : ''}
      </div>
    </div>

    <!-- Info banner -->
    <div style="background:var(--accent-soft);border:1px solid rgba(59,130,246,0.25);border-radius:10px;
      padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;font-size:13px;">
      <span style="font-size:18px;">ℹ️</span>
      <span style="color:var(--text-secondary);">
        When adding a policy, selecting an <strong>Insurance Type</strong> will automatically show related 
        <strong>Insurance Items</strong> for that type.
      </span>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Items Count</th>
            <th>Status</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="types-tbody">
          ${renderTypeRows(typesData, isAdmin)}
        </tbody>
      </table>
    </div>

    <!-- Modal inside dash-content -->
    <div id="type-modal" class="modal" style="display:none">
      <div class="modal-content" style="max-width:520px;">
        <div class="modal-header">
          <h3 id="type-modal-title">Add Insurance Type</h3>
          <button class="modal-close" onclick="window.closeTypeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group" style="grid-column:1/-1;">
              <label>Name *</label>
              <input type="text" id="type-name" placeholder="e.g. Health, Vehicle, Fire, Life">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label>Description</label>
              <input type="text" id="type-desc" placeholder="Optional description">
            </div>
            <div class="form-group" style="margin-top:8px">
              <label class="checkbox-label">
                <input type="checkbox" id="type-active" checked> Active
              </label>
            </div>
          </div>
          <div style="margin-top:16px;padding:12px;background:var(--accent-soft);
            border-radius:8px;font-size:12px;color:var(--text-secondary);">
            💡 After creating a type, go to <strong>Insurance Items</strong> to add specific items 
            (e.g. for "Vehicle" type → add "Honda Jazz", "Toyota Camry", etc.)
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="window.closeTypeModal()">Cancel</button>
          <button class="btn btn-primary" id="type-save-btn" onclick="window.submitType()">Save Type</button>
        </div>
      </div>
    </div>
  `;

  // Search listener
  setTimeout(() => {
    const searchInput = document.getElementById('types-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#types-tbody tr');
        rows.forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
      });
    }
  }, 100);
}

// Load insurance items count per type
async function getItemCountForType(typeId) {
  try {
    const items = await api.get('v1/insurance-items') || [];
    return items.filter(i => i.insuranceType?.id === typeId || i.insuranceTypeId === typeId).length;
  } catch { return 0; }
}

function renderTypeRows(data, isAdmin) {
  if (!data.length) {
    return `<tr><td colspan="${isAdmin ? 5 : 4}" style="text-align:center;padding:32px;color:var(--text-muted);">No insurance types found</td></tr>`;
  }

  return data.map(t => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--accent-soft);
            color:var(--accent);display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;flex-shrink:0;">
            ${window.escapeHtml(t.name).substring(0,2).toUpperCase()}
          </div>
          <strong>${window.escapeHtml(t.name) || '—'}</strong>
        </div>
      </td>
      <td>${window.escapeHtml(t.description) || '<span class="text-muted">—</span>'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" style="font-size:11px;" 
          onclick="window.viewTypeItems('${t.id}', '${window.escapeHtml(t.name).replace(/'/g,"\\'")}')"
          title="View insurance items for this type">
          🏷️ View Items
        </button>
      </td>
      <td>${t.active ? '<span class="badge badge-active">● Active</span>' : '<span class="badge badge-expired">● Inactive</span>'}</td>
      ${isAdmin ? `
        <td>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="window.openEditTypeModal('${t.id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteType('${t.id}', '${window.escapeHtml(t.name).replace(/'/g, "\\'")}')">🗑 Delete</button>
          </div>
        </td>
      ` : ''}
    </tr>
  `).join('');
}

// View items for a specific type
window.viewTypeItems = async function(typeId, typeName) {
  if (window.navigate) window.navigate('insuranceItems');
  setTimeout(() => {
    const filterEl = document.getElementById('typeFilter');
    if (filterEl) {
      filterEl.value = typeId;
      filterEl.dispatchEvent(new Event('change'));
    }
  }, 500);
};

function openTypeModal() {
  const modal = document.getElementById('type-modal');
  if (!modal) return;
  document.getElementById('type-name').value = '';
  document.getElementById('type-desc').value = '';
  const activeEl = document.getElementById('type-active');
  if (activeEl) activeEl.checked = true;
  document.getElementById('type-modal-title').textContent = 'Add Insurance Type';
  const saveBtn = document.getElementById('type-save-btn');
  if (saveBtn) { saveBtn.textContent = 'Save Type'; saveBtn.disabled = false; saveBtn.onclick = () => window.submitType(); }
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function openEditTypeModal(id) {
  const modal = document.getElementById('type-modal');
  if (!modal) return;
  const type = typesData.find(t => t.id === id);
  if (!type) { window.showToast('Type not found', 'error'); return; }
  document.getElementById('type-name').value = type.name || '';
  document.getElementById('type-desc').value = type.description || '';
  const activeEl = document.getElementById('type-active');
  if (activeEl) activeEl.checked = !!type.active;
  document.getElementById('type-modal-title').textContent = 'Edit Insurance Type';
  const saveBtn = document.getElementById('type-save-btn');
  if (saveBtn) { saveBtn.textContent = 'Update Type'; saveBtn.disabled = false; saveBtn.onclick = () => window.updateType(id); }
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeTypeModal() {
  const modal = document.getElementById('type-modal');
  if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

async function submitType() {
  const name = document.getElementById('type-name')?.value.trim();
  const description = document.getElementById('type-desc')?.value.trim();
  const active = document.getElementById('type-active')?.checked ?? true;
  if (!name) { window.showToast('Name is required', 'warning'); return; }
  const saveBtn = document.getElementById('type-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
  try {
    const result = await api.post('v1/insurance-types', { name, description, active });
    if (result) {
      window.showToast('Insurance type added!', 'success');
      closeTypeModal();
      await loadTypes();
    }
  } catch (error) {
    window.showToast(error.message || 'Failed to add type', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Type'; }
  }
}

async function updateType(id) {
  const name = document.getElementById('type-name')?.value.trim();
  const description = document.getElementById('type-desc')?.value.trim();
  const active = document.getElementById('type-active')?.checked ?? true;
  if (!name) { window.showToast('Name is required', 'warning'); return; }
  const saveBtn = document.getElementById('type-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Updating...'; }
  try {
    const result = await api.put(`v1/insurance-types/${id}`, { name, description, active });
    if (result) {
      window.showToast('Insurance type updated!', 'success');
      closeTypeModal();
      await loadTypes();
    }
  } catch (error) {
    window.showToast(error.message || 'Failed to update type', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Update Type'; }
  }
}

async function deleteType(id, name) {
  const confirmed = confirm(`Delete insurance type "${name}"? This cannot be undone.`);
  if (!confirmed) return;
  try {
    window.showSpinner();
    const deletedBy = localStorage.getItem('insura_email') || 'admin';
    const result = await api.del(`v1/insurance-types/${id}?deletedBy=${deletedBy}`);
    window.hideSpinner();
    if (result !== null) {
      window.showToast('Insurance type deleted!', 'success');
      await loadTypes();
    }
  } catch (error) {
    window.hideSpinner();
    window.showToast(error.message || 'Failed to delete type', 'error');
  }
}

window.loadTypes         = loadTypes;
window.openTypeModal     = openTypeModal;
window.openEditTypeModal = openEditTypeModal;
window.closeTypeModal    = closeTypeModal;
window.submitType        = submitType;
window.updateType        = updateType;
window.deleteType        = deleteType;

console.log('Insurance Types module loaded ✅');