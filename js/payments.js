// payments.js — Payments module

let paymentsData = [];
let paymentFilter = 'all';

async function loadPayments() {
  const isAdmin = authUtils.isAdmin();
  const path = isAdmin ? '/payments' : '/payments/my-payments';
  const data = await api.get(path);
  paymentsData = data || [];

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Payments</h2>
        <p class="text-muted">${paymentsData.length} records</p>
      </div>
      <div class="flex items-center gap-8">
        <div class="search-bar">
          <input type="text" id="pay-search" placeholder="Search payments...">
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="openPaymentModal()">Schedule Payment</button>` : ''}
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="filterPayments(this,'all')">All</div>
      <div class="tab" onclick="filterPayments(this,'UNPAID')">Unpaid</div>
      <div class="tab" onclick="filterPayments(this,'PAID')">Paid</div>
      <div class="tab" onclick="filterPayments(this,'OVERDUE')">Overdue</div>
    </div>

    <div class="table-wrapper">
      <table>
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
          ${renderPaymentRows(paymentsData, isAdmin)}
        </tbody>
      </table>
    </div>
  `;

  filterTable('pay-search', 'payments-tbody');
  if (isAdmin) buildPaymentModal();
}

function renderPaymentRows(data, isAdmin) {
  if (!data.length) return emptyState('No payment records found');

  return data.map(p => `
    <tr>
      <td><span class="mono">${p.policyNumber || '—'}</span></td>
      <td><strong class="mono">${fmt.currency(p.amount)}</strong></td>
      <td>${fmt.date(p.dueDate)}</td>
      <td>${p.paidDate ? fmt.date(p.paidDate) : '<span class="text-muted">—</span>'}</td>
      <td>${statusBadge(p.status)}</td>
      <td>
        <div class="flex gap-8">
          ${(p.status === 'UNPAID' || p.status === 'OVERDUE') ? `
            ${isAdmin
              ? `<button class="btn btn-success btn-sm" onclick="markPaid('${p.id}', true)">Mark Paid</button>`
              : `<button class="btn btn-success btn-sm" onclick="markPaid('${p.id}', false)">Pay Now</button>`
            }
          ` : ''}
          ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deletePayment('${p.id}')">Delete</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function filterPayments(tab, status) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  paymentFilter = status;

  const filtered = status === 'all'
    ? paymentsData
    : paymentsData.filter(p => p.status === status);

  document.getElementById('payments-tbody').innerHTML =
    renderPaymentRows(filtered, authUtils.isAdmin());
}

async function markPaid(id, isAdmin) {
  const path = isAdmin ? `/payments/${id}/pay` : `/payments/${id}/user-pay`;
  const result = await api.put(path);

  if (result) {
    showToast('Payment marked as paid!', 'success');
    loadPayments();
  }
}

async function deletePayment(id) {
  showConfirm('Delete Payment', 'Are you sure you want to delete this payment?', async () => {
    const result = await api.del(`/payments/${id}`);
    if (result !== null) {
      showToast('Payment deleted', 'success');
      loadPayments();
    }
  });
}

function buildPaymentModal() {
  createModal('payment-modal', 'Schedule Payment', `
    <div class="form-grid">
      <div class="form-group">
        <label>Policy *</label>
        <select id="pay-policy"></select>
      </div>
      <div class="form-group">
        <label>Amount (₹) *</label>
        <input type="number" id="pay-amount" placeholder="5000" min="0">
      </div>
      <div class="form-group">
        <label>Due Date *</label>
        <input type="date" id="pay-due">
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal('payment-modal')">Cancel</button>
    <button class="btn btn-primary" onclick="submitPayment()">Schedule</button>
  `);

  loadDropdown('pay-policy', '/policies', 'policyNumber');
}

function openPaymentModal() {
  const m = document.getElementById('payment-modal');
  if (!m) buildPaymentModal();
  openModal('payment-modal');
}

function formatToISO(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const [dd, mm, yyyy] = dateStr.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return dateStr;
}

async function submitPayment() {
  const policyId = String(document.getElementById('pay-policy').value || '').trim();
  const amount   = String(document.getElementById('pay-amount').value || '').trim();
  const rawDate  = document.getElementById('pay-due').value;
  const dueDate  = formatToISO(rawDate);

  if (!policyId || !amount || !dueDate) {
    showToast('Please fill all fields', 'warning');
    return;
  }

  const body = { policyId, amount, dueDate };

  const result = await api.post('/payments', body);

  if (result) {
    showToast('Payment scheduled!', 'success');
    closeModal('payment-modal');
    loadPayments();
  }
}