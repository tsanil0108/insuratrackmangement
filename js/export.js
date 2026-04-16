// export.js - Export functionality

async function loadExport() {
  // Check if user is authenticated
  if (!authUtils.getToken()) {
    showToast('Please login to access export', 'error');
    navigate('dashboard');
    return;
  }

  document.getElementById('dash-content').innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Export Data</h2>
        <p class="text-muted">Export your data in various formats</p>
      </div>
    </div>
    
    <div class="card" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        📄 Export Policies
      </h3>
      <div class="flex gap-8" style="flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="exportPoliciesCSV()" id="export-policies-csv">
          📄 CSV
        </button>
        <button class="btn btn-primary" onclick="exportPoliciesExcel()" id="export-policies-excel">
          📊 Excel
        </button>
        <button class="btn btn-primary" onclick="exportPoliciesPDF()" id="export-policies-pdf">
          📑 HTML
        </button>
      </div>
    </div>
    
    <div class="card">
      <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        💰 Export Payments
      </h3>
      <div class="flex gap-8" style="flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="exportPaymentsCSV()" id="export-payments-csv">
          📄 CSV
        </button>
        <button class="btn btn-primary" onclick="exportPaymentsExcel()" id="export-payments-excel">
          📊 Excel
        </button>
        <button class="btn btn-primary" onclick="exportPaymentsPDF()" id="export-payments-pdf">
          📑 HTML
        </button>
      </div>
    </div>
  `;
}

// Helper function to get formatted filename
function getExportFilename(prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${prefix}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Export functions for Policies
async function exportPoliciesCSV() {
  const filename = `${getExportFilename('policies')}.csv`;
  console.log('Exporting policies as CSV:', filename);
  
  try {
    if (typeof api.downloadCSV !== 'function') {
      console.error('api.downloadCSV is not defined');
      showToast('Export function not available. Please check api.js', 'error');
      return;
    }
    await api.downloadCSV('/export/policies/csv', filename);
  } catch (error) {
    console.error('Export failed:', error);
    showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
  }
}

async function exportPoliciesExcel() {
  const filename = `${getExportFilename('policies')}.xlsx`;
  console.log('Exporting policies as Excel:', filename);
  
  try {
    if (typeof api.download !== 'function') {
      console.error('api.download is not defined');
      showToast('Export function not available. Please check api.js', 'error');
      return;
    }
    await api.download('/export/policies/excel', filename);
  } catch (error) {
    console.error('Export failed:', error);
    showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
  }
}

async function exportPoliciesPDF() {
  const filename = `${getExportFilename('policies')}.html`;
  console.log('Exporting policies as HTML:', filename);
  
  try {
    if (typeof api.download !== 'function') {
      console.error('api.download is not defined');
      showToast('Export function not available. Please check api.js', 'error');
      return;
    }
    await api.download('/export/policies/pdf', filename);
  } catch (error) {
    console.error('Export failed:', error);
    showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
  }
}

// Export functions for Payments
async function exportPaymentsCSV() {
  const filename = `${getExportFilename('payments')}.csv`;
  console.log('Exporting payments as CSV:', filename);
  
  try {
    if (typeof api.downloadCSV !== 'function') {
      console.error('api.downloadCSV is not defined');
      showToast('Export function not available. Please check api.js', 'error');
      return;
    }
    await api.downloadCSV('/export/payments/csv', filename);
  } catch (error) {
    console.error('Export failed:', error);
    showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
  }
}

async function exportPaymentsExcel() {
  const filename = `${getExportFilename('payments')}.xlsx`;
  console.log('Exporting payments as Excel:', filename);
  
  try {
    if (typeof api.download !== 'function') {
      console.error('api.download is not defined');
      showToast('Export function not available. Please check api.js', 'error');
      return;
    }
    await api.download('/export/payments/excel', filename);
  } catch (error) {
    console.error('Export failed:', error);
    showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
  }
}

async function exportPaymentsPDF() {
  const filename = `${getExportFilename('payments')}.html`;
  console.log('Exporting payments as HTML:', filename);
  
  try {
    if (typeof api.download !== 'function') {
      console.error('api.download is not defined');
      showToast('Export function not available. Please check api.js', 'error');
      return;
    }
    await api.download('/export/payments/pdf', filename);
  } catch (error) {
    console.error('Export failed:', error);
    showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
  }
}

// Make functions global
window.loadExport = loadExport;
window.exportPoliciesCSV = exportPoliciesCSV;
window.exportPoliciesExcel = exportPoliciesExcel;
window.exportPoliciesPDF = exportPoliciesPDF;
window.exportPaymentsCSV = exportPaymentsCSV;
window.exportPaymentsExcel = exportPaymentsExcel;
window.exportPaymentsPDF = exportPaymentsPDF;

console.log('Export module loaded successfully');