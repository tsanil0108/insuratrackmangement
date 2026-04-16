// utils.js — Shared utility functions (load FIRST)

// ─── ESCAPE HTML ──────────────────────────────────────────
window.escapeHtml = function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
};

// ─── EMPTY STATE ROW ──────────────────────────────────────
window.emptyState = function emptyState(message = 'No data found', colspan = 10) {
  return `
    <tr>
      <td colspan="${colspan}">
        <div class="empty-state" style="padding:48px 0;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:12px;">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
          </svg>
          <p style="color:var(--text-muted); font-size:14px;">${message}</p>
        </div>
      </td>
    </tr>`;
};

// ─── FILTER TABLE ─────────────────────────────────────────
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

// ─── CREATE MODAL HELPER ──────────────────────────────────
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
        <button class="modal-close" onclick="window.closeModal('${id}')">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">${footerHtml}</div>
    </div>`;
  document.body.appendChild(modal);
};

// ─── MODAL HELPERS ────────────────────────────────────────
window.openModal = function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
};

console.log('Utils module loaded');