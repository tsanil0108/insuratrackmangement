// payments.js — Payments module with slip upload

let paymentsData = [];
let paymentFilter = 'all';
let paymentSearchTerm = '';

async function loadPayments() {
  const isAdmin = authUtils.isAdmin();
  const path = isAdmin ? '/payments' : '/payments/my-payments';
  const data = await api.get(path);
  paymentsData = data || [];

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Payments</h2>
        <p class="text-muted" id="payments-count">${paymentsData.length} records</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="pay-search" placeholder="Search by policy, amount, status...">
        </div>
        ${isAdmin ? `
          <button class="btn btn-secondary" onclick="window.showPendingVerification()">
            📋 Pending Verification
          </button>
          <button class="btn btn-primary" onclick="window.openPaymentModal()">
            + Schedule Payment
          </button>
        ` : ''}
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="filterPayments(this,'all')">All</div>
      <div class="tab" onclick="filterPayments(this,'UNPAID')">Unpaid</div>
      <div class="tab" onclick="filterPayments(this,'PAID')">Paid</div>
      <div class="tab" onclick="filterPayments(this,'OVERDUE')">Overdue</div>
      <div class="tab" onclick="filterPayments(this,'PENDING_VERIFICATION')">Pending</div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Policy</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Paid Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="payments-tbody">
          ${renderPaymentRows(getFilteredAndSearchedPayments(), isAdmin)}
        </tbody>
      </table>
    </div>
  `;

  // Initialize search with live filtering
  setTimeout(() => {
    const searchInput = document.getElementById('pay-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        paymentSearchTerm = e.target.value.toLowerCase();
        const tbody = document.getElementById('payments-tbody');
        if (tbody) {
          tbody.innerHTML = renderPaymentRows(getFilteredAndSearchedPayments(), authUtils.isAdmin());
        }
        const countEl = document.getElementById('payments-count');
        if (countEl) {
          const filtered = getFilteredAndSearchedPayments();
          countEl.textContent = `${filtered.length} records`;
        }
      });
    }
  }, 100);
  
  if (isAdmin) buildPaymentModal();
  buildUploadModal();
}

function getFilteredAndSearchedPayments() {
  // Apply status filter
  let filtered = paymentFilter === 'all'
    ? paymentsData
    : paymentsData.filter(p => p.status === paymentFilter);
  
  // Apply search filter
  if (paymentSearchTerm) {
    filtered = filtered.filter(p => {
      const policyNumber = (p.policyNumber || '').toLowerCase();
      const amount = p.amount ? p.amount.toString() : '';
      const status = (p.status || '').toLowerCase();
      const remarks = (p.remarks || '').toLowerCase();
      const reference = (p.paymentReference || '').toLowerCase();
      
      return policyNumber.includes(paymentSearchTerm) ||
             amount.includes(paymentSearchTerm) ||
             status.includes(paymentSearchTerm) ||
             remarks.includes(paymentSearchTerm) ||
             reference.includes(paymentSearchTerm);
    });
  }
  
  return filtered;
}

function renderPaymentRows(data, isAdmin) {
  if (!data.length) {
    const message = paymentSearchTerm ? `No payments match "${paymentSearchTerm}"` : 'No payment records found';
    return `<tr><td colspan="6" class="empty-state">${message}</td></tr>`;
  }

  return data.map(p => `
    <tr>
      <td><span class="mono" style="color:var(--accent);">${window.escapeHtml(p.policyNumber) || '—'}</span></td>
      <td><strong class="mono">${window.fmt.currency(p.amount)}</strong></td>
      <td>${window.fmt.date(p.dueDate)}</td>
      <td>${p.paidDate ? window.fmt.date(p.paidDate) : '<span class="text-muted">—</span>'}</td>
      <td>${window.statusBadge(p.status)}</td>
      <td>
        <div class="flex gap-8" style="flex-wrap: wrap;">
          ${(p.status === 'UNPAID' || p.status === 'OVERDUE') && !isAdmin ? `
            <button class="btn btn-success btn-sm" onclick="window.openUploadModal('${p.id}')">
              📤 Pay Now
            </button>
          ` : ''}
          ${(p.status === 'UNPAID' || p.status === 'OVERDUE') && isAdmin ? `
            <button class="btn btn-success btn-sm" onclick="window.markPaid('${p.id}', true)">
              ✓ Mark Paid
            </button>
          ` : ''}
          ${p.status === 'PENDING_VERIFICATION' && !isAdmin ? `
            <span class="badge badge-warning">⏳ Awaiting Verification</span>
          ` : ''}
          ${p.paymentSlipUrl && isAdmin && p.status === 'PENDING_VERIFICATION' ? `
            <button class="btn btn-info btn-sm" onclick="window.viewPaymentSlip('${p.id}')">📎 View Slip</button>
            <button class="btn btn-success btn-sm" onclick="window.verifyPayment('${p.id}')">✓ Verify</button>
            <button class="btn btn-danger btn-sm" onclick="window.rejectPayment('${p.id}')">✗ Reject</button>
          ` : ''}
          ${p.paymentSlipUrl && (p.status === 'PAID' || isAdmin) && p.status !== 'PENDING_VERIFICATION' ? `
            <button class="btn btn-ghost btn-sm" onclick="window.viewPaymentSlip('${p.id}')">📎 View Slip</button>
          ` : ''}
          ${isAdmin ? `
            <button class="btn btn-danger btn-sm" onclick="window.deletePayment('${p.id}', '${window.escapeHtml(p.policyNumber).replace(/'/g, "\\'")}')">🗑 Delete</button>
          ` : ''}
        </div>
        </td>
      </tr>
  `).join('');
}

// ─── UPLOAD MODAL ─────────────────────────────────────────

function buildUploadModal() {
  if (document.getElementById('upload-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'upload-modal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3>Upload Payment Slip</h3>
        <button class="modal-close" onclick="window.closeModal('upload-modal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Payment Slip *</label>
            <input type="file" id="upload-slip" accept="image/*,.pdf" style="padding: 8px;">
            <small class="text-muted">Upload image or PDF of payment receipt (Max 5MB)</small>
          </div>
          <div class="form-group">
            <label>Transaction/Reference Number</label>
            <input type="text" id="upload-reference" placeholder="e.g., UTR123456789">
          </div>
          <div class="form-group">
            <label>Payment Method</label>
            <select id="upload-method">
              <option value="">Select...</option>
              <option value="UPI">UPI</option>
              <option value="NET_BANKING">Net Banking</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="window.closeModal('upload-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="window.submitPaymentSlip()">📤 Submit Slip</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

let currentPaymentId = null;

function openUploadModal(paymentId) {
  buildUploadModal();
  currentPaymentId = paymentId;
  
  // Reset form
  const slipInput = document.getElementById('upload-slip');
  const referenceInput = document.getElementById('upload-reference');
  const methodSelect = document.getElementById('upload-method');
  
  if (slipInput) slipInput.value = '';
  if (referenceInput) referenceInput.value = '';
  if (methodSelect) methodSelect.value = '';
  
  window.openModal('upload-modal');
}

async function submitPaymentSlip() {
  const slipFile = document.getElementById('upload-slip').files[0];
  const reference = document.getElementById('upload-reference')?.value.trim() || '';
  const paymentMethod = document.getElementById('upload-method')?.value || '';
  
  if (!slipFile) {
    window.showToast('Please select a payment slip file', 'warning');
    return;
  }
  
  if (slipFile.size > 5 * 1024 * 1024) {
    window.showToast('File size should be less than 5MB', 'warning');
    return;
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(slipFile.type)) {
    window.showToast('Only JPG, PNG, or PDF files are allowed', 'warning');
    return;
  }
  
  const formData = new FormData();
  formData.append('slip', slipFile);
  if (reference) formData.append('reference', reference);
  if (paymentMethod) formData.append('paymentMethod', paymentMethod);
  
  try {
    window.showSpinner();
    const token = localStorage.getItem('insura_token');
    
    const response = await fetch(`http://localhost:8080/api/payments/${currentPaymentId}/upload-slip`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    window.hideSpinner();
    
    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || 'Upload failed';
      } catch (e) {
        errorMessage = await response.text();
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    window.showToast('Payment slip uploaded! Awaiting admin verification.', 'success');
    window.closeModal('upload-modal');
    loadPayments();
    
  } catch (error) {
    window.hideSpinner();
    console.error('Upload error:', error);
    window.showToast(error.message, 'error');
  }
}

// ─── ADMIN VERIFICATION ───────────────────────────────────

async function showPendingVerification() {
  const data = await api.get('/payments/pending-verification');
  paymentsData = data || [];
  paymentFilter = 'PENDING_VERIFICATION';
  paymentSearchTerm = '';
  
  // Clear search input
  const searchInput = document.getElementById('pay-search');
  if (searchInput) searchInput.value = '';
  
  const tbody = document.getElementById('payments-tbody');
  if (tbody) {
    tbody.innerHTML = renderPaymentRows(paymentsData, true);
  }
  
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  const pendingTab = Array.from(document.querySelectorAll('.tabs .tab')).find(t => t.textContent.includes('Pending'));
  if (pendingTab) pendingTab.classList.add('active');
}

async function viewPaymentSlip(paymentId) {
  try {
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/payments/${paymentId}/slip`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load slip');
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (error) {
    window.showToast(error.message, 'error');
  }
}

async function verifyPayment(paymentId) {
  const adminRemarks = prompt('Enter verification remarks (optional):');
  
  try {
    const result = await api.put(`/payments/${paymentId}/verify-payment`, { adminRemarks: adminRemarks || '' });
    if (result) {
      window.showToast('Payment verified successfully!', 'success');
      loadPayments();
    }
  } catch (error) {
    window.showToast(error.message, 'error');
  }
}

async function rejectPayment(paymentId) {
  const rejectionReason = prompt('Enter rejection reason:');
  if (!rejectionReason) {
    window.showToast('Rejection reason is required', 'warning');
    return;
  }
  
  try {
    const result = await api.put(`/payments/${paymentId}/reject-payment`, { rejectionReason });
    if (result) {
      window.showToast('Payment rejected', 'success');
      loadPayments();
    }
  } catch (error) {
    window.showToast(error.message, 'error');
  }
}

// ─── FILTER ───────────────────────────────────────────────

function filterPayments(tab, status) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  paymentFilter = status;
  
  const tbody = document.getElementById('payments-tbody');
  if (tbody) {
    tbody.innerHTML = renderPaymentRows(getFilteredAndSearchedPayments(), authUtils.isAdmin());
  }
  
  const countEl = document.getElementById('payments-count');
  if (countEl) {
    const filtered = getFilteredAndSearchedPayments();
    countEl.textContent = `${filtered.length} records`;
  }
}

// ─── MARK AS PAID ─────────────────────────────────────────

async function markPaid(id, isAdminFlag) {
  const path = isAdminFlag ? `/payments/${id}/pay` : `/payments/${id}/user-pay`;
  const result = await api.put(path);

  if (result) {
    window.showToast('Payment marked as paid!', 'success');
    loadPayments();
  }
}

// ✅ FIXED DELETE FUNCTION for Payments
async function deletePayment(id, policyNumber) {
  console.log('🔴 Delete payment called for:', { id, policyNumber });
  
  const confirmed = confirm(`Delete payment for policy "${policyNumber || id}"? This action cannot be undone.`);
  
  if (!confirmed) {
    console.log('User cancelled delete');
    return;
  }
  
  try {
    window.showSpinner();
    console.log('📤 Sending DELETE request for payment:', id);
    
    const token = localStorage.getItem('insura_token');
    const response = await fetch(`http://localhost:8080/api/payments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    window.hideSpinner();
    
    if (response.ok) {
      window.showToast('Payment deleted successfully!', 'success');
      console.log('✅ Payment deleted, reloading...');
      await loadPayments();
    } else {
      const errorText = await response.text();
      console.error('❌ Delete failed:', errorText);
      window.showToast(errorText || 'Failed to delete payment', 'error');
    }
  } catch (error) {
    window.hideSpinner();
    console.error('❌ Delete error:', error);
    window.showToast(error.message || 'Failed to delete payment', 'error');
  }
}

// ─── SCHEDULE PAYMENT (ADMIN) ────────────────────────────

function buildPaymentModal() {
  if (document.getElementById('payment-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'payment-modal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3>Schedule Payment</h3>
        <button class="modal-close" onclick="window.closeModal('payment-modal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Policy *</label>
            <select id="pay-policy"></select>
          </div>
          <div class="form-group">
            <label>Amount (₹) *</label>
            <input type="number" id="pay-amount" placeholder="5000" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Due Date *</label>
            <input type="date" id="pay-due">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="window.closeModal('payment-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="window.submitPayment()">Schedule</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  window.loadDropdown('pay-policy', '/policies', 'policyNumber');
}

function openPaymentModal() {
  buildPaymentModal();
  const amountInput = document.getElementById('pay-amount');
  const dueInput = document.getElementById('pay-due');
  if (amountInput) amountInput.value = '';
  if (dueInput) dueInput.value = '';
  window.openModal('payment-modal');
}

async function submitPayment() {
  const policySelect = document.getElementById('pay-policy');
  const amountInput = document.getElementById('pay-amount');
  const dueInput = document.getElementById('pay-due');
  
  const policyId = policySelect?.value;
  const amount = amountInput?.value;
  const dueDate = dueInput?.value;

  if (!policyId || !amount || !dueDate) {
    window.showToast('Please fill all fields', 'warning');
    return;
  }

  const result = await api.post('/payments', { policyId, amount, dueDate });

  if (result) {
    window.showToast('Payment scheduled!', 'success');
    window.closeModal('payment-modal');
    loadPayments();
  }
}

// Make functions global
window.loadPayments = loadPayments;
window.filterPayments = filterPayments;
window.markPaid = markPaid;
window.deletePayment = deletePayment;
window.openPaymentModal = openPaymentModal;
window.submitPayment = submitPayment;
window.openUploadModal = openUploadModal;
window.submitPaymentSlip = submitPaymentSlip;
window.viewPaymentSlip = viewPaymentSlip;
window.verifyPayment = verifyPayment;
window.rejectPayment = rejectPayment;
window.showPendingVerification = showPendingVerification;

console.log('Payments module loaded');
console.log('window.deletePayment type:', typeof window.deletePayment);