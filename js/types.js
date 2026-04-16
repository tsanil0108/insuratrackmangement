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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="types-search" placeholder="Search types...">
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="window.openTypeModal()">+ Add Type</button>` : ''}
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="types-tbody">
          ${renderTypeRows(typesData, isAdmin)}
        </tbody>
      </table>
    </div>
  `;

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

function renderTypeRows(data, isAdmin) {
  if (!data.length) {
    return `<tr><td colspan="${isAdmin ? 4 : 3}" class="empty-state">No insurance types found</td></tr>`;
  }

  return data.map(t => `
    <tr>
      <td><strong>${window.escapeHtml(t.name) || '—'}</strong></td>
      <td>${window.escapeHtml(t.description) || '<span class="text-muted">—</span>'}</td>
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

function buildTypeModal() {
  if (document.getElementById('type-modal')) return;
  
  window.createModal('type-modal', 'Add Insurance Type', `
    <div class="form-grid">
      <div class="form-group">
        <label>Name *</label>
        <input type="text" id="type-name" placeholder="e.g. Health, Vehicle, Fire">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="type-desc" placeholder="Optional description">
      </div>
      <div class="form-group" style="margin-top:8px">
        <label class="checkbox-label">
          <input type="checkbox" id="type-active" checked> Active
        </label>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="window.closeModal('type-modal')">Cancel</button>
    <button class="btn btn-primary" onclick="window.submitType()">Save Type</button>
  `);
}

function openTypeModal() {
  buildTypeModal();
  document.getElementById('type-name').value = '';
  document.getElementById('type-desc').value = '';
  const activeEl = document.getElementById('type-active');
  if (activeEl) activeEl.checked = true;
  const titleEl = document.querySelector('#type-modal .modal-header h3');
  if (titleEl) titleEl.textContent = 'Add Insurance Type';
  
  // Reset save button
  const saveBtn = document.querySelector('#type-modal .btn-primary');
  if (saveBtn) {
    saveBtn.textContent = 'Save Type';
    saveBtn.onclick = () => window.submitType();
  }
  
  window.openModal('type-modal');
}

function openEditTypeModal(id) {
  buildTypeModal();
  const type = typesData.find(t => t.id === id);
  if (!type) {
    window.showToast('Type not found', 'error');
    return;
  }
  
  document.getElementById('type-name').value = type.name || '';
  document.getElementById('type-desc').value = type.description || '';
  const activeEl = document.getElementById('type-active');
  if (activeEl) activeEl.checked = !!type.active;
  
  const titleEl = document.querySelector('#type-modal .modal-header h3');
  if (titleEl) titleEl.textContent = 'Edit Insurance Type';
  
  const saveBtn = document.querySelector('#type-modal .btn-primary');
  if (saveBtn) {
    saveBtn.textContent = 'Update Type';
    saveBtn.onclick = () => window.updateType(id);
  }
  
  window.openModal('type-modal');
}

async function submitType() {
  const name = document.getElementById('type-name')?.value.trim();
  const description = document.getElementById('type-desc')?.value.trim();
  const active = document.getElementById('type-active')?.checked ?? true;

  if (!name) {
    window.showToast('Name is required', 'warning');
    return;
  }

  const result = await api.post('/insurance-types', { name, description, active });
  if (result) {
    window.showToast('Insurance type added!', 'success');
    window.closeModal('type-modal');
    await loadTypes();
  }
}

async function updateType(id) {
  const name = document.getElementById('type-name')?.value.trim();
  const description = document.getElementById('type-desc')?.value.trim();
  const active = document.getElementById('type-active')?.checked ?? true;

  if (!name) {
    window.showToast('Name is required', 'warning');
    return;
  }

  const result = await api.put(`/insurance-types/${id}`, { name, description, active });
  if (result) {
    window.showToast('Insurance type updated!', 'success');
    window.closeModal('type-modal');
    await loadTypes();
  }
}

// ✅ FIXED DELETE FUNCTION - Direct fetch with better error handling
async function deleteType(id, name) {
  console.log('🔴 Delete type called for:', id, name);
  
  const confirmed = confirm(`Delete insurance type "${name}"? This action cannot be undone.`);
  
  if (!confirmed) {
    console.log('User cancelled delete');
    return;
  }
  
  try {
    window.showSpinner();
    console.log('📤 Sending DELETE request for type:', id);
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/insurance-types/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast('Insurance type deleted successfully!', 'success');
      console.log('✅ Type deleted, reloading...');
      await loadTypes();
    } else {
      const errorText = await response.text();
      console.error('❌ Delete failed:', errorText);
      window.showToast(errorText || 'Failed to delete insurance type', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    console.error('❌ Delete error:', error);
    window.showToast(error.message || 'Failed to delete insurance type', 'error');
  }
}

// Make sure all functions are attached to window
window.loadTypes = loadTypes;
window.openTypeModal = openTypeModal;
window.openEditTypeModal = openEditTypeModal;
window.submitType = submitType;
window.updateType = updateType;
window.deleteType = deleteType;

console.log('Insurance Types module loaded');
console.log('window.deleteType type:', typeof window.deleteType);