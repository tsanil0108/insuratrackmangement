// providers.js — Insurance Providers module (standalone)

async function loadProviders() {
  const data = await api.get('v1/providers');
  const isAdmin = authUtils?.isAdmin() || false;

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Insurance Providers</h2>
        <p class="text-muted">${(data || []).length} active providers</p>
        <p class="text-muted" style="font-size:12px; margin-top:4px;">
          💡 Deleted providers go to Recycle Bin
        </p>
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
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
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
    return `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">
      No active providers found
    </td></tr>`;
  }
  return data.map(p => `
    <tr>
      <td><strong>${window.escapeHtml(p.name)}</strong></td>
      <td>${formatContactInfo(p.contactInfo) || '<span class="text-muted">—</span>'}</td>
      <td>${window.escapeHtml(p.email) || '<span class="text-muted">—</span>'}</td>
      <td>
        ${p.active
          ? '<span class="badge badge-active">● Active</span>'
          : '<span class="badge badge-expired">● Inactive</span>'}
      </td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm"
            onclick="event.stopPropagation(); window.openProviderModal('${p.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm"
            onclick="event.stopPropagation(); window.deleteProvider('${p.id}', '${window.escapeHtml(p.name).replace(/'/g, "\\'")}')">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function formatContactInfo(contactInfo) {
  if (!contactInfo) return null;
  const mobileMatch = contactInfo.match(/\d{10}/);
  if (mobileMatch) {
    const mobile = mobileMatch[0];
    return contactInfo.replace(mobile, `<span class="mobile-highlight">${mobile}</span>`);
  }
  return window.escapeHtml(contactInfo);
}

function validateContactInfo(contactInfo) {
  if (!contactInfo || contactInfo.trim() === '') {
    return { valid: true, message: '' };
  }
  
  const mobileNumbers = contactInfo.match(/\d{10}/g);
  
  if (mobileNumbers && mobileNumbers.length > 0) {
    return { valid: true, message: '', mobileNumber: mobileNumbers[0] };
  }
  
  const digits = contactInfo.match(/\d+/g);
  if (digits) {
    for (let digit of digits) {
      if (digit.length > 0 && digit.length !== 10) {
        return { 
          valid: false, 
          message: 'Mobile number must be exactly 10 digits' 
        };
      }
    }
  }
  
  return { valid: true, message: '' };
}

// ─── BUILD PROVIDER MODAL ─────────────────────────────────

function buildProviderModal() {
  if (document.getElementById('provider-modal')) return;
  
  const bodyHtml = `
    <div class="form-grid">
      <div class="form-group">
        <label>Provider Name *</label>
        <input type="text" id="pvm-name" placeholder="ICICI Lombard">
      </div>
      <div class="form-group">
        <label>Contact Info</label>
        <input type="text" id="pvm-contact" placeholder="Enter contact info">
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" id="pvm-email" placeholder="provider@example.com">
      </div>
      <div class="form-group" style="margin-top:8px">
        <label class="checkbox-label">
          <input type="checkbox" id="pvm-active" checked> Active
        </label>
      </div>
      <input type="hidden" id="pvm-id">
    </div>
  `;
  
  const footerHtml = `
    <button class="btn btn-ghost" id="provider-modal-cancel-btn">Cancel</button>
    <button class="btn btn-primary" id="provider-modal-save-btn">Save Provider</button>
  `;

  const modal = document.createElement('div');
  modal.id = 'provider-modal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h3 id="provider-modal-title">Provider</h3>
        <button class="modal-close" id="provider-modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">${footerHtml}</div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const closeBtn = document.getElementById('provider-modal-close-btn');
  const cancelBtn = document.getElementById('provider-modal-cancel-btn');
  const saveBtn = document.getElementById('provider-modal-save-btn');
  const contactInput = document.getElementById('pvm-contact');
  
  if (contactInput) {
    contactInput.addEventListener('input', function(e) {
      const validation = validateContactInfo(this.value);
      if (!validation.valid) {
        this.style.borderColor = 'var(--red, #ef4444)';
        let errorDiv = this.parentElement.querySelector('.contact-error');
        if (!errorDiv) {
          errorDiv = document.createElement('div');
          errorDiv.className = 'contact-error';
          errorDiv.style.cssText = 'color: var(--red, #ef4444); font-size: 11px; margin-top: 4px;';
          this.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = validation.message;
      } else {
        this.style.borderColor = 'var(--green, #10b981)';
        const errorDiv = this.parentElement.querySelector('.contact-error');
        if (errorDiv) errorDiv.remove();
      }
    });
    
    contactInput.addEventListener('blur', function(e) {
      const validation = validateContactInfo(this.value);
      if (!validation.valid) {
        window.showToast(validation.message, 'warning');
        this.style.borderColor = 'var(--red, #ef4444)';
      } else if (this.value && this.value.length > 0) {
        this.style.borderColor = 'var(--green, #10b981)';
      } else {
        this.style.borderColor = '';
      }
    });
  }
  
  if (closeBtn) {
    closeBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.closeProviderModal();
    };
  }
  
  if (cancelBtn) {
    cancelBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.closeProviderModal();
    };
  }
  
  if (saveBtn) {
    saveBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.submitProvider();
    };
  }
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      window.closeProviderModal();
    }
  });
}

// ─── CLOSE PROVIDER MODAL ─────────────────────────────────

window.closeProviderModal = function() {
  console.log('Closing provider modal...');
  const modal = document.getElementById('provider-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    const errorDiv = document.querySelector('.contact-error');
    if (errorDiv) errorDiv.remove();
  }
};

// ─── OPEN PROVIDER MODAL ─────────────────────────────────

window.openProviderModal = async function(id = null) {
  if (!document.getElementById('provider-modal')) {
    buildProviderModal();
  }

  // Clear all fields
  document.getElementById('pvm-name').value = '';
  document.getElementById('pvm-contact').value = '';
  document.getElementById('pvm-email').value = '';
  document.getElementById('pvm-id').value = '';
  
  const activeEl = document.getElementById('pvm-active');
  if (activeEl) activeEl.checked = true;

  const titleEl = document.getElementById('provider-modal-title');
  
  if (id) {
    // EDIT MODE - Load existing data
    titleEl.textContent = 'Edit Provider';
    try {
      const p = await api.get(`v1/providers/${id}`);
      if (p) {
        document.getElementById('pvm-id').value = id;
        document.getElementById('pvm-name').value = p.name || '';
        document.getElementById('pvm-contact').value = p.contactInfo || '';
        document.getElementById('pvm-email').value = p.email || '';
        if (activeEl) activeEl.checked = !!p.active;
      }
    } catch (error) {
      console.error('Error loading provider:', error);
      window.showToast('Failed to load provider data', 'error');
      return;
    }
  } else {
    // ADD MODE
    titleEl.textContent = 'Add Provider';
  }

  const contactInput = document.getElementById('pvm-contact');
  if (contactInput) {
    contactInput.style.borderColor = '';
    const errorDiv = contactInput.parentElement.querySelector('.contact-error');
    if (errorDiv) errorDiv.remove();
  }

  const modal = document.getElementById('provider-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

// ─── SUBMIT PROVIDER ─────────────────────────────────────

window.submitProvider = async function() {
  const id = document.getElementById('pvm-id')?.value;
  const contactInfo = document.getElementById('pvm-contact')?.value?.trim();
  
  const validation = validateContactInfo(contactInfo);
  if (!validation.valid) {
    window.showToast(validation.message, 'warning');
    document.getElementById('pvm-contact').style.borderColor = 'var(--red, #ef4444)';
    return;
  }
  
  const body = {
    name: document.getElementById('pvm-name')?.value.trim(),
    contactInfo: contactInfo || null,
    email: document.getElementById('pvm-email')?.value.trim(),
    active: document.getElementById('pvm-active')?.checked ?? true,
  };

  if (!body.name) {
    window.showToast('Provider name is required', 'warning');
    return;
  }
  if (!body.email) {
    window.showToast('Provider email is required', 'warning');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    window.showToast('Please enter a valid email address', 'warning');
    return;
  }

  const saveBtn = document.getElementById('provider-modal-save-btn');
  const originalText = saveBtn?.textContent || 'Save';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    let result;
    if (id) {
      // UPDATE - PUT request
      console.log('Updating provider with ID:', id);
      result = await api.put(`v1/providers/${id}`, body);
      if (result) {
        window.showToast('✅ Provider updated successfully!', 'success');
      }
    } else {
      // CREATE - POST request
      console.log('Creating new provider');
      result = await api.post('v1/providers', body);
      if (result) {
        window.showToast('✅ Provider added successfully!', 'success');
      }
    }

    if (result) {
      window.closeProviderModal();
      await loadProviders();
      if (document.getElementById('recycle-bin-tbody')) {
        if (window.loadRecycleBin) await window.loadRecycleBin();
      }
    }
  } catch (error) {
    console.error('Provider save error:', error);
    let errorMsg = error.message || 'Failed to save provider';
    
    // Show the actual error message from backend
    if (errorMsg.includes('already exists')) {
      errorMsg = `Provider with name '${body.name}' already exists!`;
    }
    
    window.showToast(errorMsg, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
};

// ─── DELETE PROVIDER ─────────────────────────────────────────

window.deleteProvider = async function(id, name) {
  console.log('🔴 Delete provider called for:', id, name);
  
  const confirmed = confirm(`⚠️ Delete "${name}"?\n\nThis will move the provider to Recycle Bin.\nYou can restore it later from there.`);
  
  if (!confirmed) {
    console.log('❌ Delete cancelled by user');
    return;
  }
  
  try {
    if (window.showSpinner) window.showSpinner();
    console.log('📤 Sending DELETE request for provider:', id);

    const deletedBy = localStorage.getItem('insura_email') || 'admin';
    const result = await api.del(`v1/providers/${id}?deletedBy=${deletedBy}`);

    console.log('📥 Response:', result);
    if (window.hideSpinner) window.hideSpinner();

    if (result !== null && result !== undefined) {
      window.showToast(`✅ "${name}" moved to Recycle Bin!`, 'success');
      console.log('✅ Provider soft deleted, reloading...');
      await loadProviders();
      if (document.getElementById('recycle-bin-tbody')) {
        if (window.loadRecycleBin) await window.loadRecycleBin();
      }
    } else {
      window.showToast('Failed to delete provider', 'error');
    }
  } catch (error) {
    if (window.hideSpinner) window.hideSpinner();
    console.error('❌ Delete error:', error);
    window.showToast(error.message || 'Failed to delete provider', 'error');
  }
};

// ─── ADD CSS STYLES ───────────────────────────────────────

const style = document.createElement('style');
style.textContent = `
  .mobile-highlight {
    color: var(--accent, #6366f1);
    font-weight: 600;
    font-family: monospace;
    background: rgba(99, 102, 241, 0.1);
    padding: 2px 4px;
    border-radius: 4px;
    display: inline-block;
  }
  
  #pvm-contact {
    transition: border-color 0.3s ease;
  }
  
  #pvm-contact:focus {
    outline: none;
    border-color: var(--accent, #6366f1);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`;
document.head.appendChild(style);

// ─── GLOBAL EXPORTS ───────────────────────────────────────
window.loadProviders = loadProviders;
window.openProviderModal = window.openProviderModal;
window.submitProvider = window.submitProvider;
window.deleteProvider = window.deleteProvider;
window.closeProviderModal = window.closeProviderModal;

console.log('✅ Providers module loaded');