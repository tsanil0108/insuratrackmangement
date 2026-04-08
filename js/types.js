// types.js — Insurance Types module

let typesData = [];

async function loadTypes() {
  const isAdmin = authUtils.isAdmin();
  const data = await api.get('/insurance-types');
  typesData = data || [];

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Types</h2>
        <p class="text-muted">${typesData.length} types</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <input type="text" id="types-search" placeholder="Search types...">
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="openTypeModal()">+ Add Type</button>` : ''}
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            ${isAdmin ? `<th>Actions</th>` : ''}
          </tr>
        </thead>
        <tbody id="types-tbody">
          ${renderTypeRows(typesData, isAdmin)}
        </tbody>
      </table>
    </div>
  `;

  filterTable('types-search', 'types-tbody');
  if (isAdmin) buildTypeModal();
}

function renderTypeRows(data, isAdmin) {
  if (!data.length) return emptyState('No insurance types found');

  return data.map(t => `
    <tr>
      <td><strong>${t.name || '—'}</strong></td>
      <td>${t.description || '<span class="text-muted">—</span>'}</td>
      <td>${t.active
        ? '<span class="badge badge-success">Active</span>'
        : '<span class="badge badge-danger">Inactive</span>'
      }</td>
      ${isAdmin ? `
        <td>
          <div class="flex gap-8">
            <button class="btn btn-secondary btn-sm" onclick="openEditTypeModal('${t.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteType('${t.id}')">Delete</button>
          </div>
        </td>
      ` : ''}
    </tr>
  `).join('');
}

function buildTypeModal() {
  createModal('type-modal', 'Add Insurance Type', `
    <div class="form-grid">
      <div class="form-group">
        <label>Name *</label>
        <input type="text" id="type-name" placeholder="e.g. Health, Vehicle, Fire">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="type-desc" placeholder="Optional description">
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal('type-modal')">Cancel</button>
    <button class="btn btn-primary" onclick="submitType()">Add Type</button>
  `);
}

function openTypeModal() {
  // Reset fields
  const nameEl = document.getElementById('type-name');
  const descEl = document.getElementById('type-desc');
  if (nameEl) nameEl.value = '';
  if (descEl) descEl.value = '';

  // Reset modal title and button
  const titleEl = document.querySelector('#type-modal .modal-title');
  const submitBtn = document.querySelector('#type-modal .btn-primary');
  if (titleEl) titleEl.textContent = 'Add Insurance Type';
  if (submitBtn) {
    submitBtn.textContent = 'Add Type';
    submitBtn.setAttribute('onclick', 'submitType()');
  }

  openModal('type-modal');
}

function openEditTypeModal(id) {
  const type = typesData.find(t => t.id === id);
  if (!type) return;

  const nameEl = document.getElementById('type-name');
  const descEl = document.getElementById('type-desc');
  if (nameEl) nameEl.value = type.name || '';
  if (descEl) descEl.value = type.description || '';

  const titleEl = document.querySelector('#type-modal .modal-title');
  const submitBtn = document.querySelector('#type-modal .btn-primary');
  if (titleEl) titleEl.textContent = 'Edit Insurance Type';
  if (submitBtn) {
    submitBtn.textContent = 'Save Changes';
    submitBtn.setAttribute('onclick', `updateType('${id}')`);
  }

  openModal('type-modal');
}

async function submitType() {
  const name = document.getElementById('type-name').value.trim();
  const description = document.getElementById('type-desc').value.trim();

  if (!name) {
    showToast('Name is required', 'warning');
    return;
  }

  const body = { name, description, active: true };
  const result = await api.post('/insurance-types', body);

  if (result) {
    showToast('Insurance type added!', 'success');
    closeModal('type-modal');
    loadTypes();
  }
}

async function updateType(id) {
  const name = document.getElementById('type-name').value.trim();
  const description = document.getElementById('type-desc').value.trim();

  if (!name) {
    showToast('Name is required', 'warning');
    return;
  }

  const body = { name, description, active: true };
  const result = await api.put(`/insurance-types/${id}`, body);

  if (result) {
    showToast('Insurance type updated!', 'success');
    closeModal('type-modal');
    loadTypes();
  }
}

async function deleteType(id) {
  showConfirm('Delete Insurance Type', 'Are you sure you want to delete this type?', async () => {
    const result = await api.del(`/insurance-types/${id}`);
    if (result !== null) {
      showToast('Insurance type deleted', 'success');
      loadTypes();
    }
  });
}