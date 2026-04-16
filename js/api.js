// api.js — Centralized API handler

const BASE_URL = 'https://insuratrack-8.onrender.com/api';

const api = {
  token() {
    return localStorage.getItem('insura_token');
  },

  headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const t = this.token();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  },

  async request(method, path, body = null, opts = {}) {
    const url = `${BASE_URL}${path}`;
    const config = { method, headers: this.headers(opts.headers || {}) };
    if (body) config.body = JSON.stringify(body);

    try {
      if (window.showSpinner) window.showSpinner();
      const res = await fetch(url, config);
      if (window.hideSpinner) window.hideSpinner();

      if (res.status === 401 || res.status === 403) {
        if (authUtils) authUtils.logout();
        if (window.showToast) window.showToast('Session expired. Please login again.', 'error');
        return null;
      }

      if (res.status === 204) return true;

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          if (window.showToast) window.showToast(data.message || data.error || `Error ${res.status}`, 'error');
          return null;
        }
        return data;
      }

      if (!res.ok) {
        if (window.showToast) window.showToast(`Error ${res.status}`, 'error');
        return null;
      }
      return true;

    } catch (err) {
      if (window.hideSpinner) window.hideSpinner();
      if (window.showToast) window.showToast(
        err.name === 'TypeError' ? 'Cannot connect to server. Is the backend running?' : (err.message || 'An error occurred'),
        'error'
      );
      return null;
    }
  },

  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body = {}) => api.request('PUT', path, body),
  del: (path) => api.request('DELETE', path),
};

// Spinner
let spinnerCount = 0;
window.showSpinner = function() {
  spinnerCount++;
  let el = document.getElementById('global-spinner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-spinner';
    el.className = 'spinner-overlay';
    el.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
};

window.hideSpinner = function() {
  spinnerCount = Math.max(0, spinnerCount - 1);
  if (spinnerCount === 0) {
    const el = document.getElementById('global-spinner');
    if (el) el.style.display = 'none';
  }
};

// Toast
window.showToast = function(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, duration);
};

// Confirm Dialog
window.showConfirm = function(title, message, onConfirm) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal confirm-modal">
      <div class="modal-body">
        <div class="confirm-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); if (onConfirm) onConfirm(); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
};

// Dropdown Loader
window.loadDropdown = async function(selectId, endpoint, labelKey, valueKey = 'id', placeholder = 'Select...') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading...</option>';
  const data = await api.get(endpoint);
  if (!data || !Array.isArray(data)) {
    sel.innerHTML = `<option value="">Failed to load</option>`;
    return;
  }
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    data.filter(i => i.active !== false).map(i =>
      `<option value="${i[valueKey]}">${i[labelKey]}</option>`
    ).join('');
};

// Status Badge
window.statusBadge = function(status) {
  const map = {
    ACTIVE: '<span class="badge badge-active">● Active</span>',
    EXPIRING_SOON: '<span class="badge badge-expiring">● Expiring Soon</span>',
    EXPIRED: '<span class="badge badge-expired">● Expired</span>',
    PAID: '<span class="badge badge-paid">● Paid</span>',
    UNPAID: '<span class="badge badge-red">● Unpaid</span>',
    OVERDUE: '<span class="badge badge-overdue">● Overdue</span>',
    PENDING: '<span class="badge badge-pending">● Pending</span>',
    PENDING_VERIFICATION: '<span class="badge badge-warning">⏳ Pending Verification</span>',
  };
  return map[status] || `<span class="badge">${status || '—'}</span>`;
};

// Format Helpers
window.fmt = {
  currency: (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  },
  date: (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) { return dateString; }
  },
  initials: (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
};

// Download functions for export
api.download = async function(path, filename) {
  const url = `${BASE_URL}${path}`;
  try {
    window.showSpinner();
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.token()}` }
    });
    window.hideSpinner();

    if (!res.ok) {
      let errorMsg = 'Export failed';
      try { const e = await res.json(); errorMsg = e.message || e.error || errorMsg; } catch (_) {}
      window.showToast(errorMsg, 'error');
      return;
    }

    const blob = await res.blob();
    if (blob.size === 0) { window.showToast('No data available to export', 'warning'); return; }

    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    window.showToast(`${filename} downloaded successfully!`, 'success');
  } catch (error) {
    window.hideSpinner();
    window.showToast('Download failed. Please try again.', 'error');
  }
};

api.downloadCSV = async function(path, filename) {
  const url = `${BASE_URL}${path}`;
  try {
    window.showSpinner();
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.token()}`, 'Accept': 'text/csv, application/json' }
    });
    window.hideSpinner();

    if (!res.ok) {
      let errorMsg = 'Export failed';
      try {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const e = await res.json(); errorMsg = e.message || e.error || errorMsg;
        } else {
          const t = await res.text(); if (t) errorMsg = t;
        }
      } catch (_) {}
      window.showToast(errorMsg, 'error');
      return;
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) { window.showToast('No data available to export', 'warning'); return; }

    const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    window.showToast(`${filename} downloaded successfully!`, 'success');
  } catch (error) {
    window.hideSpinner();
    window.showToast('Download failed. Please try again.', 'error');
  }
};

console.log('API module loaded');