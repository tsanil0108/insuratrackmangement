// utils.js — Shared utility functions

// ─── DATE / FORMAT ────────────────────────────────────────
const fmt = {
  date(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  currency(n) {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  },
  initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
};

// ─── BADGE HELPERS ────────────────────────────────────────
function statusBadge(status) {
  const map = {
    ACTIVE: 'green', PAID: 'green',
    PENDING: 'yellow',
    OVERDUE: 'red', EXPIRED: 'expired',
    EXPIRING_SOON: 'purple',
    CANCELLED: 'red',
    INACTIVE: 'expired',
  };
  const cls = map[status] || 'yellow';
  return `<span class="badge badge-${cls}">${status}</span>`;
}

// ─── AVATAR COLORS ────────────────────────────────────────
const avatarColors = [
  ['#4f8ef7','#1a3a6b'], ['#34d399','#0d3d27'], ['#a78bfa','#2d1b5e'],
  ['#f87171','#4b1c1c'], ['#fbbf24','#4a3400'], ['#22d3ee','#0c3540'],
];
function avatarColor(str) {
  const i = (str || '').charCodeAt(0) % avatarColors.length;
  return avatarColors[i];
}

// ─── SEARCH FILTER ────────────────────────────────────────
function filterTable(inputId, tbodyId, cols = null) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    const rows = document.querySelectorAll(`#${tbodyId} tr`);
    rows.forEach(row => {
      const text = (cols
        ? [...row.querySelectorAll('td')].filter((_, i) => cols.includes(i)).map(td => td.textContent).join(' ')
        : row.textContent
      ).toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

// ─── MODAL HELPERS ───────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function createModal(id, title, bodyHTML, footerHTML = '') {
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.className = 'modal-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="closeModal('${id}')">&times;</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(id); });
  return overlay;
}

// ─── EMPTY STATE ─────────────────────────────────────────
function emptyState(message = 'No data found') {
  return `
    <tr><td colspan="99">
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
        </svg>
        <p>${message}</p>
      </div>
    </td></tr>
  `;
}

// ─── DROPDOWN LOADER ─────────────────────────────────────
async function loadDropdown(selectId, path, labelKey, valueKey = 'id', placeholder = 'Select...') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">Loading...</option>`;
  const data = await api.get(path);
  if (!data) { sel.innerHTML = `<option value="">Failed to load</option>`; return; }
  const items = Array.isArray(data) ? data : (data.content || []);
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    items.filter(i => i.active !== false).map(i =>
      `<option value="${i[valueKey]}">${i[labelKey]}</option>`
    ).join('');
}

// ─── PAGINATION (simple) ────────────────────────────────
function paginateArray(arr, page, size) {
  const start = (page - 1) * size;
  return { items: arr.slice(start, start + size), total: arr.length, pages: Math.ceil(arr.length / size) };
}

// ─── CLIPBOARD ──────────────────────────────────────────
function copyText(text) {
  navigator.clipboard?.writeText(text).then(() => showToast('Copied!', 'success'));
}

// ─── COLOR ARRAYS ───────────────────────────────────────
const CHART_COLORS = ['#4f8ef7','#34d399','#a78bfa','#fbbf24','#f87171','#22d3ee'];