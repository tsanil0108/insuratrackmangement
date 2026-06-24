// backups.js — Automatic Backups module (Admin only)

let backupsData = [];

async function loadBackups() {
  if (!authUtils || !authUtils.isAdmin()) { navigate('dashboard'); return; }

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Backups</h2>
        <p class="text-muted" id="backups-count">Loading...</p>
      </div>
      <div class="flex items-center gap-8" style="flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="run-backup-btn" onclick="window.runBackupNow()">⚡ Run Backup Now</button>
      </div>
    </div>

    <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:var(--text-muted);">
      📦 An automatic backup runs on the server on a schedule (daily by default) and bundles all data plus uploaded
      documents &amp; payment slips into one file. Every admin gets a notification when a backup completes or fails —
      check the 🔔 bell icon. Only the most recent backups are kept; older ones are cleaned up automatically.
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Status</th><th>Triggered By</th><th>Summary</th><th>Size</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="backups-tbody">
          <tr><td colspan="6" style="text-align:center;padding:40px;">
            <div class="spinner" style="margin:0 auto;"></div>
          </td></tr>
        </tbody>
      </table>
    </div>
  `;

  await refreshBackups();
}

async function refreshBackups() {
  try {
    window.showSpinner();
    const data = await api.get('v1/backups');
    backupsData = data || [];
    window.hideSpinner();

    const countEl = document.getElementById('backups-count');
    if (countEl) countEl.textContent = `${backupsData.length} backup${backupsData.length === 1 ? '' : 's'} on record`;
  } catch (error) {
    window.hideSpinner();
    backupsData = [];
    const tbody = document.getElementById('backups-tbody');
    if (tbody) tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state" style="padding:48px 0;text-align:center;">
          <p style="color:var(--red);">Failed to load backups</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="refreshBackups()">Retry</button>
        </div>
      </td></tr>`;
    return;
  }
  renderBackupRows();
}

function renderBackupRows() {
  const tbody = document.getElementById('backups-tbody');
  if (!tbody) return;

  if (!backupsData.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
      No backups yet. Click "Run Backup Now" to create the first one — the scheduled job will then keep adding to this list automatically.</td></tr>`;
    return;
  }

  tbody.innerHTML = backupsData.map(b => {
    const isSuccess = b.status === 'SUCCESS';
    const safeFileName = (b.fileName || 'backup.zip').replace(/'/g, "\\'");
    return `
    <tr>
      <td>${window.fmt.datetime(b.createdAt)}</td>
      <td>${isSuccess
        ? '<span class="badge badge-active">● Success</span>'
        : '<span class="badge badge-expired">● Failed</span>'}</td>
      <td>${b.triggeredBy === 'SCHEDULED' ? '⏰ Scheduled' : window.escapeHtml(b.triggeredBy || '—')}</td>
      <td style="font-size:12px;${isSuccess ? 'color:var(--text-muted);' : 'color:var(--red);'}">
        ${isSuccess ? window.escapeHtml(b.summary || '—') : window.escapeHtml(b.errorMessage || 'Unknown error')}
      </td>
      <td>${_formatBytes(b.fileSize)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${isSuccess ? `<button class="btn btn-ghost btn-sm" onclick="window.downloadBackup('${b.id}','${safeFileName}')">⬇️ Download</button>` : ''}
          <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="window.deleteBackup('${b.id}')">🗑 Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function _formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

window.runBackupNow = async function () {
  const btn = document.getElementById('run-backup-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Running...'; }

  try {
    const result = await api.post('v1/backups/trigger');
    if (result) {
      const ok = result.status === 'SUCCESS';
      window.showToast(
        ok ? '✅ Backup completed!' : ('❌ Backup failed: ' + (result.errorMessage || 'Unknown error')),
        ok ? 'success' : 'error'
      );
    }
  } catch (e) {
    window.showToast('Backup failed to run', 'error');
  }

  if (btn) { btn.disabled = false; btn.textContent = '⚡ Run Backup Now'; }
  await refreshBackups();
};

window.downloadBackup = async function (id, fileName) {
  await window.api.download(`v1/backups/${id}/download`, fileName || 'backup.zip');
};

window.deleteBackup = async function (id) {
  if (!confirm('Delete this backup permanently? This cannot be undone.')) return;
  try {
    const result = await api.del(`v1/backups/${id}`);
    if (result) {
      window.showToast('Backup deleted', 'success');
      await refreshBackups();
    }
  } catch (e) {
    window.showToast('Failed to delete backup', 'error');
  }
};

window.loadBackups    = loadBackups;
window.refreshBackups = refreshBackups;
