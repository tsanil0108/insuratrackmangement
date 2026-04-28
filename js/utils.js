// utils.js — Shared utility functions (load FIRST)
(function () {
  'use strict';

  window.escapeHtml = function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };

  window.fmt = {
    currency: (amount) => {
      if (amount === undefined || amount === null) return '₹0';
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(num)) return '₹0';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0, maximumFractionDigits: 0
      }).format(num);
    },
    date: (dateString) => {
      if (!dateString) return '—';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (_) { return dateString; }
    },
    datetime: (dateString) => {
      if (!dateString) return '—';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch (_) { return dateString; }
    },
    initials: (name) => {
      if (!name) return '?';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },
    number: (num) => {
      if (num === undefined || num === null) return '0';
      return new Intl.NumberFormat('en-IN').format(num);
    }
  };

  window.statusBadge = function (status) {
    const map = {
      'ACTIVE': '<span class="badge badge-active">● Active</span>',
      'EXPIRING_SOON': '<span class="badge badge-expiring">● Expiring Soon</span>',
      'EXPIRED': '<span class="badge badge-expired">● Expired</span>'
    };
    return map[status] || `<span class="badge">${status || '—'}</span>`;
  };

  window.filterTable = function filterTable(searchInputId, tbodyId) {
    setTimeout(() => {
      const input = document.getElementById(searchInputId);
      if (!input) return;
      input.addEventListener('input', () => {
        const term = input.value.toLowerCase();
        const rows = document.querySelectorAll(`#${tbodyId} tr`);
        rows.forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
      });
    }, 100);
  };

  window.emptyState = function emptyState(message, colspan) {
    colspan = colspan || 10;
    return `<tr><td colspan="${colspan}">
      <div class="empty-state" style="padding:48px 0;text-align:center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:12px;">
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
        <p style="color:var(--text-muted);font-size:14px;">${message}</p>
      </div>
    </td></tr>`;
  };

  // FIXED: createModal with proper close handling
  window.createModal = function createModal(id, title, bodyHtml, footerHtml) {
    if (document.getElementById(id)) return;
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${window.escapeHtml(title)}</h3>
          <button class="modal-close" type="button" data-modal-close>&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">${footerHtml}</div>
      </div>`;
    document.body.appendChild(modal);
    
    // Add close button event listener
    const closeBtn = modal.querySelector('[data-modal-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.closeModal(id);
      });
    }
    
    // Close when clicking outside
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        window.closeModal(id);
      }
    });
  };

  // FIXED: openModal
  window.openModal = function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { 
      modal.style.display = 'flex'; 
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
  };

  // FIXED: closeModal - More robust
  window.closeModal = function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { 
      modal.style.display = 'none'; 
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
  };

  // FIXED: loadDropdown
  window.loadDropdown = async function (selectId, path, labelKey, valueKey, placeholder) {
    valueKey = valueKey || 'id';
    placeholder = placeholder || 'Select...';
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading...</option>';
    try {
      const data = await window.api.get(path);
      if (!data || !Array.isArray(data)) {
        sel.innerHTML = `<option value="">Failed to load</option>`;
        return;
      }
      sel.innerHTML = `<option value="">${placeholder}</option>` +
        data
          .filter(i => i.active !== false)
          .map(i => `<option value="${i[valueKey]}">${window.escapeHtml(String(i[labelKey] || ''))}</option>`)
          .join('');
    } catch (error) {
      console.error('loadDropdown error:', error);
      sel.innerHTML = `<option value="">Error loading</option>`;
    }
  };

  window.showConfirm = function (title, message, onConfirm, onCancel) {
    const confirmed = confirm(`${title}\n\n${message}`);
    if (confirmed && onConfirm) onConfirm();
    else if (!confirmed && onCancel) onCancel();
  };

  // Helper to close all modals (emergency)
  window.closeAllModals = function() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  };

  console.log('Utils module loaded');
})();