// api.js — Centralized API handler with auth headers and error handling

const BASE_URL = 'http://localhost:8080/api';

const api = {
  // Get stored token
  token() {
    return localStorage.getItem('insura_token');
  },

  // Build default headers
  headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const t = this.token();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  },

  // Generic request
  async request(method, path, body = null, opts = {}) {
    const url = `${BASE_URL}${path}`;
    const config = {
      method,
      headers: this.headers(opts.headers || {}),
    };
    if (body) config.body = JSON.stringify(body);

    try {
      showSpinner();
      const res = await fetch(url, config);
      hideSpinner();

      if (res.status === 401 || res.status === 403) {
        authUtils.logout();
        showToast('Session expired. Please login again.', 'error');
        return null;
      }

      if (res.status === 204 || res.headers.get('content-length') === '0') return true;

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          const msg = data.message || data.error || `Error ${res.status}`;
          showToast(msg, 'error');
          return null;
        }
        return data;
      }

      if (!res.ok) { showToast(`Error ${res.status}`, 'error'); return null; }
      return true;

    } catch (err) {
      hideSpinner();
      if (err.name === 'TypeError') {
        showToast('Cannot connect to server. Is the backend running?', 'error');
      } else {
        showToast(err.message || 'An error occurred', 'error');
      }
      return null;
    }
  },

  // File/blob request (for exports)
  async download(path, filename) {
    const url = `${BASE_URL}${path}`;
    try {
      showSpinner();
      const res = await fetch(url, { headers: this.headers() });
      hideSpinner();
      if (!res.ok) { showToast('Export failed', 'error'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(`${filename} downloaded!`, 'success');
    } catch {
      hideSpinner();
      showToast('Download failed', 'error');
    }
  },

  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body = {}) => api.request('PUT', path, body),
  del: (path) => api.request('DELETE', path),
};

// ─── SPINNER ────────────────────────────────────────────
let spinnerCount = 0;
function showSpinner() {
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
}
function hideSpinner() {
  spinnerCount = Math.max(0, spinnerCount - 1);
  if (spinnerCount === 0) {
    const el = document.getElementById('global-spinner');
    if (el) el.style.display = 'none';
  }
}

// ─── TOAST ──────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
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
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <span class="toast-msg">${msg}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ─── CONFIRM DIALOG ─────────────────────────────────────
function showConfirm(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal confirm-modal">
      <div class="modal-body">
        <div class="confirm-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}