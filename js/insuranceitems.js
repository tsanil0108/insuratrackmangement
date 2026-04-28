// insurance-items.js - Complete Insurance Item Management (FIXED)

let allItems = [];
let insuranceTypes = [];
let deleteId = null;
let currentFilter = { typeId: '', status: 'all' };

// ✅ FIXED: Initialize page - pehle HTML render karo, phir data load karo
async function initInsuranceItems() {
  const isAdmin = authUtils?.isAdmin() || false;

  // ✅ STEP 1: Pehle dash-content mein poora HTML inject karo
  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Items</h2>
        <p class="text-muted" id="items-count">Loading...</p>
      </div>
      <div class="flex items-center gap-8">
        <select id="typeFilter" class="form-select" style="min-width:180px">
          <option value="">All Insurance Types</option>
        </select>
        <select id="statusFilter" class="form-select">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        ${isAdmin ? `<button class="btn btn-primary" onclick="openCreateModal()">+ Add Item</button>` : ''}
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Status</th>
            <th>Created</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="itemsTableBody">
          <tr><td colspan="${isAdmin ? 6 : 5}" style="text-align:center;padding:32px">Loading...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <div id="itemModal" class="modal" style="display:none">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">Add Insurance Item</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="itemId">
          <div class="form-grid">
            <div class="form-group">
              <label>Insurance Type *</label>
              <select id="typeId">
                <option value="">Select Insurance Type</option>
              </select>
            </div>
            <div class="form-group">
              <label>Item Name *</label>
              <input type="text" id="name" placeholder="e.g. Honda Jazz, Term Life 1Cr">
            </div>
            <div class="form-group">
              <label>Description</label>
              <input type="text" id="description" placeholder="Optional description">
            </div>
            <div class="form-group" style="margin-top:8px">
              <label class="checkbox-label">
                <input type="checkbox" id="active" checked> Active
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" id="saveItemBtn" onclick="saveItem()">Save Item</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="modal" style="display:none">
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header">
          <h3>Delete Item</h3>
          <button class="modal-close" onclick="closeDeleteModal()">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete this insurance item? This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeDeleteModal()">Cancel</button>
          <button class="btn btn-danger" onclick="confirmDelete()">Delete</button>
        </div>
      </div>
    </div>
  `;

  // ✅ STEP 2: Data load karo HTML inject hone ke baad
  await loadInsuranceTypes();
  await loadItems();
  setupEventListeners();
}

// Load insurance types for dropdown
async function loadInsuranceTypes() {
  try {
    const data = await api.get('v1/insurance-types');
    if (data && data.length) {
      insuranceTypes = data;
      populateTypeFilter();
      populateTypeSelect();
    } else {
      console.warn('No insurance types found');
      insuranceTypes = [];
    }
  } catch (error) {
    console.error('Failed to load insurance types:', error);
    window.showToast('Failed to load insurance types', 'error');
  }
}

// Populate type filter dropdown (top bar)
function populateTypeFilter() {
  const typeFilter = document.getElementById('typeFilter');
  if (!typeFilter) return;

  typeFilter.innerHTML =
    '<option value="">All Insurance Types</option>' +
    insuranceTypes.map(type =>
      `<option value="${type.id}">${escapeHtml(type.name)}</option>`
    ).join('');
}

// Populate type select in Add/Edit modal
function populateTypeSelect() {
  const typeSelect = document.getElementById('typeId');
  if (!typeSelect) return;

  typeSelect.innerHTML =
    '<option value="">Select Insurance Type</option>' +
    insuranceTypes.map(type =>
      `<option value="${type.id}">${escapeHtml(type.name)}</option>`
    ).join('');
}

// Load all insurance items
async function loadItems() {
  try {
    const data = await api.get('v1/insurance-items');
    if (data) {
      allItems = data;
    } else {
      allItems = [];
    }
    applyFilters();
  } catch (error) {
    console.error('Failed to load insurance items:', error);
    window.showToast('Failed to load insurance items', 'error');
    allItems = [];
    renderItemsTable([]);
  }
}

// Apply filters to items
function applyFilters() {
  let filtered = [...allItems];

  if (currentFilter.typeId) {
    filtered = filtered.filter(item =>
      item.insuranceType && item.insuranceType.id === currentFilter.typeId
    );
  }

  if (currentFilter.status === 'active') {
    filtered = filtered.filter(item => item.active === true);
  } else if (currentFilter.status === 'inactive') {
    filtered = filtered.filter(item => item.active === false);
  }

  // Update count
  const countEl = document.getElementById('items-count');
  if (countEl) countEl.textContent = `${filtered.length} items`;

  renderItemsTable(filtered);
}

// Render items table
function renderItemsTable(items) {
  const isAdmin = authUtils?.isAdmin() || false;
  const tbody = document.getElementById('itemsTableBody');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${isAdmin ? 6 : 5}">
          <div class="empty-state" style="padding:48px 0; text-align:center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-muted,#aaa)" stroke-width="1.5" style="margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">
              <path d="M20 7h-4.18A3 3 0 0013 5.18V4a2 2 0 00-2-2H9a2 2 0 00-2 2v1.18A3 3 0 006.18 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
              <circle cx="12" cy="15" r="3"/>
              <line x1="9" y1="7" x2="15" y2="7"/>
            </svg>
            <p style="color:var(--text-muted,#aaa); font-size:14px;">No insurance items found</p>
            ${isAdmin ? `<button class="btn btn-primary" style="margin-top:16px;" onclick="openCreateModal()">Add Your First Insurance Item</button>` : ''}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>
        <span class="badge" style="background:var(--color-info-light,#e8f0fe);color:var(--color-info,#1a73e8);border-radius:4px;padding:2px 8px;font-size:12px;">
          ${item.insuranceType ? escapeHtml(item.insuranceType.name) : 'N/A'}
        </span>
      </td>
      <td>${item.description ? escapeHtml(item.description.substring(0, 80)) + (item.description.length > 80 ? '…' : '') : '<span class="text-muted">—</span>'}</td>
      <td>${item.active
        ? '<span class="badge badge-active">● Active</span>'
        : '<span class="badge badge-expired">● Inactive</span>'}</td>
      <td>${window.fmt?.date(item.createdAt) || '—'}</td>
      ${isAdmin ? `
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${item.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${item.id}')">🗑 Delete</button>
        </div>
      </td>` : ''}
    </tr>
  `).join('');
}

// Setup event listeners for filter dropdowns
function setupEventListeners() {
  const typeFilter = document.getElementById('typeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      currentFilter.typeId = e.target.value;
      applyFilters();
    });
  }

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilter.status = e.target.value;
      applyFilters();
    });
  }
}

// ✅ FIXED: Open create modal — style.display use karo, classList nahi
function openCreateModal() {
  const modal = document.getElementById('itemModal');
  if (!modal) return;

  document.getElementById('modalTitle').textContent = 'Add Insurance Item';
  document.getElementById('itemId').value = '';
  document.getElementById('name').value = '';
  document.getElementById('description').value = '';
  document.getElementById('active').checked = true;

  // Re-populate type select in case types loaded after init
  populateTypeSelect();
  document.getElementById('typeId').value = '';

  const saveBtn = document.getElementById('saveItemBtn');
  if (saveBtn) {
    saveBtn.textContent = 'Save Item';
    saveBtn.onclick = () => saveItem();
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// ✅ FIXED: Open edit modal
async function openEditModal(id) {
  try {
    const item = await api.get(`v1/insurance-items/${id}`);
    if (!item) {
      window.showToast('Item not found', 'error');
      return;
    }

    const modal = document.getElementById('itemModal');
    if (!modal) return;

    document.getElementById('modalTitle').textContent = 'Edit Insurance Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('name').value = item.name || '';
    document.getElementById('description').value = item.description || '';
    document.getElementById('active').checked = item.active === true;

    // Re-populate type select then set value
    populateTypeSelect();
    document.getElementById('typeId').value = item.insuranceType?.id || '';

    const saveBtn = document.getElementById('saveItemBtn');
    if (saveBtn) {
      saveBtn.textContent = 'Update Item';
      saveBtn.onclick = () => saveItem();
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } catch (error) {
    console.error('Failed to load item:', error);
    window.showToast('Failed to load item details', 'error');
  }
}

// ✅ FIXED: Save item (create or update)
async function saveItem() {
  const id = document.getElementById('itemId')?.value;
  const typeId = document.getElementById('typeId')?.value;
  const name = document.getElementById('name')?.value.trim();
  const description = document.getElementById('description')?.value.trim();
  const active = document.getElementById('active')?.checked ?? true;

  if (!typeId) {
    window.showToast('Please select an insurance type', 'warning');
    return;
  }

  if (!name) {
    window.showToast('Please enter item name', 'warning');
    return;
  }

  const insuranceType = insuranceTypes.find(t => t.id === typeId);
  if (!insuranceType) {
    window.showToast('Invalid insurance type selected', 'error');
    return;
  }

  const itemData = {
    name,
    description: description || null,
    active,
    insuranceType: {
      id: typeId,
      name: insuranceType.name
    }
  };

  const saveBtn = document.getElementById('saveItemBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

  try {
    let result;
    if (id) {
      result = await api.put(`v1/insurance-items/${id}`, itemData);
      if (result) {
        window.showToast('Insurance item updated successfully!', 'success');
        closeModal();
        await loadItems();
      }
    } else {
      result = await api.post('v1/insurance-items', itemData);
      if (result) {
        window.showToast('Insurance item created successfully!', 'success');
        closeModal();
        await loadItems();
      }
    }
  } catch (error) {
    console.error('Failed to save item:', error);
    window.showToast(error.message || 'Failed to save insurance item', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = id ? 'Update Item' : 'Save Item';
    }
  }
}

// ✅ FIXED: Open delete modal
function openDeleteModal(id) {
  deleteId = id;
  const modal = document.getElementById('deleteModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

// Confirm delete
async function confirmDelete() {
  if (!deleteId) return;

  try {
    const deletedBy = localStorage.getItem('insura_email') || 'admin';
    const result = await api.del(`v1/insurance-items/${deleteId}?deletedBy=${deletedBy}`);
    if (result !== null) {
      window.showToast('Insurance item deleted successfully!', 'success');
      closeDeleteModal();
      await loadItems();
    }
  } catch (error) {
    console.error('Failed to delete item:', error);
    window.showToast('Failed to delete insurance item', 'error');
  }
}

// ✅ FIXED: Close modals using style.display (consistent with rest of app)
function closeModal() {
  const modal = document.getElementById('itemModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
  deleteId = null;
}

// Refresh data
async function refreshData() {
  await loadItems();
}

// Helper escapeHtml (local fallback — window.escapeHtml bhi available hai)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ✅ Global exports
window.initInsuranceItems = initInsuranceItems;
window.openCreateModal    = openCreateModal;
window.openEditModal      = openEditModal;
window.openDeleteModal    = openDeleteModal;
window.saveItem           = saveItem;
window.confirmDelete      = confirmDelete;
window.closeModal         = closeModal;
window.closeDeleteModal   = closeDeleteModal;
window.refreshData        = refreshData;

console.log('Insurance Items module loaded ✅');