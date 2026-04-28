// api.js — Centralized API handler
(function () {
  'use strict';

  window.API_BASE = (() => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8080';
    }
    return 'https://insuratrack-8.onrender.com';
  })();

  window.api = {
    token() {
      return localStorage.getItem('insura_token');
    },

    headers(extra) {
      extra = extra || {};
      const h = Object.assign({ 'Content-Type': 'application/json' }, extra);
      const t = this.token();
      if (t) h['Authorization'] = 'Bearer ' + t;
      return h;
    },

    /**
     * FIX: buildUrl correctly constructs URL.
     * Frontend passes paths like 'v1/companies', 'auth/login', 'export/policies/csv'.
     * We prepend 'api/' to get '/api/v1/companies' etc.
     * Paths already starting with 'api/' are used as-is.
     */
    buildUrl(path) {
      let cleanPath = path.startsWith('/') ? path.substring(1) : path;
      if (cleanPath.startsWith('api/')) {
        return `${window.API_BASE}/${cleanPath}`;
      }
      return `${window.API_BASE}/api/${cleanPath}`;
    },

    async request(method, path, body, opts) {
      opts = opts || {};
      const url = this.buildUrl(path);
      const isAuthEndpoint = path.includes('auth/');

      const config = { method, headers: this.headers(opts.headers || {}) };
      if (body !== null && body !== undefined && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      try {
        if (window.showSpinner) window.showSpinner();
        const res = await fetch(url, config);
        if (window.hideSpinner) window.hideSpinner();

        if ((res.status === 401 || res.status === 403) && !isAuthEndpoint) {
          if (window.authUtils) window.authUtils.logout();
          if (window.showToast) window.showToast('Session expired. Please login again.', 'error');
          return null;
        }

        if (res.status === 204) return true;

        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            const errorMsg = data.message || data.error || ('Error ' + res.status);
            if (window.showToast) window.showToast(errorMsg, 'error');
            console.error('API Error ' + res.status + ':', errorMsg);
            return null;
          }
          return data;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const msg = text || ('Error ' + res.status);
          if (window.showToast) window.showToast(msg, 'error');
          return null;
        }
        return true;

      } catch (err) {
        if (window.hideSpinner) window.hideSpinner();
        const errorMsg = err.name === 'TypeError'
          ? 'Cannot connect to server. Is the backend running?'
          : (err.message || 'An error occurred');
        if (window.showToast) window.showToast(errorMsg, 'error');
        console.error('API Request Error:', err);
        return null;
      }
    },

    get:   function(path)        { return window.api.request('GET',    path, null); },
    post:  function(path, body)  { return window.api.request('POST',   path, body); },
    put:   function(path, body)  { return window.api.request('PUT',    path, body !== undefined ? body : {}); },
    patch: function(path, body)  { return window.api.request('PATCH',  path, body !== undefined ? body : {}); },
    del:   function(path)        { return window.api.request('DELETE', path, null); },

    getBaseUrl: function() { return window.API_BASE; },

    async download(path, filename) {
      const url = this.buildUrl(path);
      try {
        if (window.showSpinner) window.showSpinner();
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + this.token() }
        });
        if (window.hideSpinner) window.hideSpinner();

        if (!res.ok) {
          let errorMsg = 'Export failed';
          try {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const e = await res.json();
              errorMsg = e.message || e.error || errorMsg;
            } else {
              const t = await res.text();
              if (t) errorMsg = t;
            }
          } catch (_) {}
          if (window.showToast) window.showToast(errorMsg, 'error');
          return;
        }

        const blob = await res.blob();
        if (blob.size === 0) {
          if (window.showToast) window.showToast('No data available to export', 'warning');
          return;
        }
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        if (window.showToast) window.showToast(filename + ' downloaded!', 'success');
      } catch (error) {
        if (window.hideSpinner) window.hideSpinner();
        if (window.showToast) window.showToast('Download failed. Please try again.', 'error');
        console.error('Download error:', error);
      }
    },

    async downloadCSV(path, filename) {
      const url = this.buildUrl(path);
      try {
        if (window.showSpinner) window.showSpinner();
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + this.token(),
            'Accept': 'text/csv, application/json'
          }
        });
        if (window.hideSpinner) window.hideSpinner();

        if (!res.ok) {
          let errorMsg = 'Export failed';
          try {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const e = await res.json();
              errorMsg = e.message || e.error || errorMsg;
            } else {
              const t = await res.text();
              if (t) errorMsg = t;
            }
          } catch (_) {}
          if (window.showToast) window.showToast(errorMsg, 'error');
          return;
        }

        const text = await res.text();
        if (!text || text.trim().length === 0) {
          if (window.showToast) window.showToast('No data available to export', 'warning');
          return;
        }
        const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        if (window.showToast) window.showToast(filename + ' downloaded!', 'success');
      } catch (error) {
        if (window.hideSpinner) window.hideSpinner();
        if (window.showToast) window.showToast('Download failed. Please try again.', 'error');
        console.error('CSV Download error:', error);
      }
    }
  };

  // ── SPINNER ──────────────────────────────────────────────
  let spinnerCount = 0;
  window.showSpinner = function () {
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
  window.hideSpinner = function () {
    spinnerCount = Math.max(0, spinnerCount - 1);
    if (spinnerCount === 0) {
      const el = document.getElementById('global-spinner');
      if (el) el.style.display = 'none';
    }
  };

  // ── TOAST ────────────────────────────────────────────────
  if (typeof window.showToast === 'undefined') {
    window.showToast = function (msg, type, duration) {
      type = type || 'info';
      duration = duration || 3500;
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const icons = {
        success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        error:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      };

      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.innerHTML = '<div class="toast-icon">' + (icons[type] || icons.info) + '</div>' +
        '<div class="toast-message">' + msg + '</div>';
      container.appendChild(toast);

      setTimeout(function () {
        toast.classList.add('removing');
        setTimeout(function () { toast.remove(); }, 250);
      }, duration);
    };
  }

  console.log('API module loaded - Base URL:', window.API_BASE);
})();