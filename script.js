/* ============================================
   CITY BIKE GARAGE — script.js
   Garage Management App Logic (LocalStorage)
   ============================================ */

// =====================
// CONSTANTS & STATE
// =====================
const STORAGE_KEY = 'cityBikeGarageServices';
const GARAGE_NAME = 'CITY BIKE GARAGE';
const GARAGE_ADDR = 'Gathaman Patiya, Gathaman Road, Palanpur';
const GARAGE_PHONE = '+91 98765 43210'; // Update as needed

let services = [];          // Main data array
let currentFilter = '';     // Status filter
let activeModalId = null;   // Currently open modal service ID

// =====================
// DATA PERSISTENCE
// =====================

/** Load services from LocalStorage */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    services = raw ? JSON.parse(raw) : [];
  } catch (e) {
    services = [];
    console.warn('Data load error:', e);
  }
}

/** Save services to LocalStorage */
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

/** Generate unique ID */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// =====================
// NAVIGATION
// =====================

/** Switch to a page by ID */
function goToPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  // Update bottom nav active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  // Show/hide FAB
  const fab = document.getElementById('fabBtn');
  fab.classList.toggle('hidden', pageId === 'pageAdd');

  // Refresh content
  if (pageId === 'pageDashboard') renderDashboard();
  if (pageId === 'pageServices') renderServiceList();
}

// =====================
// DASHBOARD
// =====================

function renderDashboard() {
  const today = todayStr();
  const uniqueCustomers = new Set(services.map(s => s.mobile)).size;
  const uniqueVehicles  = new Set(services.map(s => s.vehicleNo)).size;
  const pending   = services.filter(s => s.status === 'Pending').length;
  const completed = services.filter(s => s.status === 'Completed').length;
  const todayRevenue = services
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  document.getElementById('statCustomers').textContent = uniqueCustomers;
  document.getElementById('statVehicles').textContent  = uniqueVehicles;
  document.getElementById('statPending').textContent   = pending;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('todayRevenue').textContent  = '₹' + todayRevenue.toLocaleString('en-IN');

  // Recent services (last 5)
  const recent = [...services].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const container = document.getElementById('recentList');
  const empty = document.getElementById('dashEmptyState');

  if (services.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('d-none');
  } else {
    empty.classList.add('d-none');
    container.innerHTML = recent.map(s => serviceCardHTML(s)).join('');
  }
}

// =====================
// SERVICE LIST
// =====================

function renderServiceList() {
  const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const clearBtn = document.getElementById('clearSearch');
  clearBtn.style.display = query ? 'block' : 'none';

  let filtered = services.filter(s => {
    const matchSearch = !query ||
      s.vehicleNo.toLowerCase().includes(query) ||
      s.mobile.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query);
    const matchFilter = !currentFilter || s.status === currentFilter;
    return matchSearch && matchFilter;
  });

  // Sort: newest first
  filtered.sort((a, b) => b.createdAt - a.createdAt);

  const container = document.getElementById('serviceList');
  const empty = document.getElementById('listEmptyState');

  if (filtered.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('d-none');
  } else {
    empty.classList.add('d-none');
    container.innerHTML = filtered.map(s => serviceCardHTML(s)).join('');
  }
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearch').style.display = 'none';
  renderServiceList();
}

/** Set active filter chip and re-render */
function filterStatus(status) {
  currentFilter = status;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === status);
  });
  renderServiceList();
  goToPage('pageServices');
}

// =====================
// SERVICE CARD HTML
// =====================
function serviceCardHTML(s) {
  const badgeClass = {
    'Pending': 'badge-pending',
    'Completed': 'badge-completed',
    'Delivered': 'badge-delivered'
  }[s.status] || 'badge-pending';

  const emergencyTag = s.emergency
    ? `<span class="sc-emergency-tag"><i class="bi bi-exclamation-triangle-fill"></i> EMERGENCY</span>`
    : '';

  const nextStatus = { 'Pending': 'Completed', 'Completed': 'Delivered', 'Delivered': 'Pending' }[s.status];

  return `
  <div class="service-card ${s.emergency ? 'emergency-card' : ''}" onclick="openDetail('${s.id}')">
    <div class="sc-top">
      <div>
        <div class="sc-vehicle">${esc(s.vehicleNo)}</div>
        <div class="sc-customer"><i class="bi bi-person-fill"></i> ${esc(s.name)} &nbsp;·&nbsp; <i class="bi bi-phone-fill"></i> ${esc(s.mobile)}</div>
      </div>
      <span class="sc-badge ${badgeClass}">${esc(s.status)}</span>
    </div>
    <div class="sc-meta">
      ${s.brand || s.model ? `<span class="sc-chip"><i class="bi bi-bicycle"></i> ${esc(s.brand)} ${esc(s.model)}</span>` : ''}
      ${s.serviceType ? `<span class="sc-chip"><i class="bi bi-wrench-adjustable"></i> ${esc(s.serviceType)}</span>` : ''}
      ${s.km ? `<span class="sc-chip"><i class="bi bi-speedometer2"></i> ${Number(s.km).toLocaleString()} km</span>` : ''}
      <span class="sc-chip"><i class="bi bi-calendar3"></i> ${formatDate(s.date)}</span>
      ${emergencyTag}
    </div>
    <div class="sc-actions" onclick="event.stopPropagation()">
      <button class="btn-status" onclick="quickStatus('${s.id}', '${nextStatus}')">
        <i class="bi bi-arrow-right-circle"></i> → ${nextStatus}
      </button>
      <span style="flex:1"></span>
      <span style="font-family:var(--font-head);font-size:18px;font-weight:700;color:var(--orange)">₹${Number(s.total||0).toLocaleString('en-IN')}</span>
    </div>
  </div>`;
}

// =====================
// ADD / EDIT FORM
// =====================

function openAddForm(editData = null) {
  document.getElementById('formTitle').textContent = editData ? 'Edit Service Entry' : 'New Service Entry';
  document.getElementById('submitBtn').innerHTML = editData
    ? '<i class="bi bi-pencil-fill me-2"></i>Update Entry'
    : '<i class="bi bi-check-circle-fill me-2"></i>Save Service Entry';

  // Reset form
  const fields = ['fName','fMobile','fVehicleNo','fBrand','fModel','fKm',
    'fServiceType','fProblem','fWorkDone','fParts','fPartsCost','fServiceCharge','fStatus'];
  fields.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('fEmergency').checked = false;
  document.getElementById('editId').value = '';
  calcTotal();

  if (editData) {
    document.getElementById('editId').value = editData.id;
    document.getElementById('fName').value = editData.name || '';
    document.getElementById('fMobile').value = editData.mobile || '';
    document.getElementById('fVehicleNo').value = editData.vehicleNo || '';
    document.getElementById('fBrand').value = editData.brand || '';
    document.getElementById('fModel').value = editData.model || '';
    document.getElementById('fKm').value = editData.km || '';
    document.getElementById('fServiceType').value = editData.serviceType || '';
    document.getElementById('fProblem').value = editData.problem || '';
    document.getElementById('fWorkDone').value = editData.workDone || '';
    document.getElementById('fParts').value = editData.parts || '';
    document.getElementById('fPartsCost').value = editData.partsCost || '';
    document.getElementById('fServiceCharge').value = editData.serviceCharge || '';
    document.getElementById('fStatus').value = editData.status || 'Pending';
    document.getElementById('fEmergency').checked = editData.emergency || false;
    calcTotal();
  }

  goToPage('pageAdd');
}

function cancelForm() {
  goToPage('pageDashboard');
}

/** Live total calculation */
function calcTotal() {
  const parts   = Number(document.getElementById('fPartsCost').value) || 0;
  const service = Number(document.getElementById('fServiceCharge').value) || 0;
  const total   = parts + service;
  document.getElementById('calcTotal').textContent = '₹ ' + total.toLocaleString('en-IN');
}

/** Form submit handler */
document.getElementById('serviceForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const name       = document.getElementById('fName').value.trim();
  const mobile     = document.getElementById('fMobile').value.trim();
  const vehicleNo  = document.getElementById('fVehicleNo').value.trim().toUpperCase();

  if (!name || !mobile || !vehicleNo) {
    showToast('Please fill required fields', 'error');
    return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    showToast('Enter valid 10-digit mobile number', 'error');
    return;
  }

  const partsCost     = Number(document.getElementById('fPartsCost').value) || 0;
  const serviceCharge = Number(document.getElementById('fServiceCharge').value) || 0;
  const editId = document.getElementById('editId').value;

  const entry = {
    id: editId || genId(),
    name, mobile, vehicleNo,
    brand:         document.getElementById('fBrand').value.trim(),
    model:         document.getElementById('fModel').value.trim(),
    km:            document.getElementById('fKm').value.trim(),
    serviceType:   document.getElementById('fServiceType').value,
    problem:       document.getElementById('fProblem').value.trim(),
    workDone:      document.getElementById('fWorkDone').value.trim(),
    parts:         document.getElementById('fParts').value.trim(),
    partsCost, serviceCharge,
    total:         partsCost + serviceCharge,
    emergency:     document.getElementById('fEmergency').checked,
    status:        document.getElementById('fStatus').value,
    date:          todayStr(),
    createdAt:     editId ? (services.find(s => s.id === editId)?.createdAt || Date.now()) : Date.now(),
    updatedAt:     Date.now()
  };

  if (editId) {
    const idx = services.findIndex(s => s.id === editId);
    if (idx > -1) services[idx] = entry;
    showToast('Entry updated!', 'success');
  } else {
    services.unshift(entry);
    showToast('Service entry saved!', 'success');
  }

  saveData();
  goToPage('pageDashboard');
});

// =====================
// QUICK STATUS UPDATE
// =====================
function quickStatus(id, newStatus) {
  const entry = services.find(s => s.id === id);
  if (!entry) return;
  entry.status = newStatus;
  entry.updatedAt = Date.now();
  saveData();
  renderDashboard();
  renderServiceList();
  showToast(`Status → ${newStatus}`, 'success');
}

// =====================
// DETAIL MODAL
// =====================

function openDetail(id) {
  const s = services.find(x => x.id === id);
  if (!s) return;
  activeModalId = id;

  document.getElementById('mVehicleNo').textContent = s.vehicleNo;
  document.getElementById('mCustomer').textContent  = s.name + ' · ' + s.mobile;

  const badgeClass = {
    'Pending': 'badge-pending',
    'Completed': 'badge-completed',
    'Delivered': 'badge-delivered'
  }[s.status] || 'badge-pending';

  document.getElementById('modalBody').innerHTML = `
    <div class="d-flex align-items-center gap-2 mb-3">
      <span class="sc-badge ${badgeClass}" style="font-size:12px;padding:4px 12px">${s.status}</span>
      ${s.emergency ? `<span class="sc-emergency-tag"><i class="bi bi-exclamation-triangle-fill"></i> Emergency</span>` : ''}
      <span style="font-size:11px;color:var(--text3);margin-left:auto">${formatDate(s.date)}</span>
    </div>

    <div class="detail-section"><i class="bi bi-bicycle"></i> Vehicle</div>
    ${detailRow('bi-bicycle', 'Brand / Model', [s.brand, s.model].filter(Boolean).join(' ') || '—')}
    ${detailRow('bi-speedometer2', 'KM Reading', s.km ? Number(s.km).toLocaleString() + ' km' : '—')}

    <div class="detail-section"><i class="bi bi-wrench-adjustable"></i> Service</div>
    ${detailRow('bi-tag-fill', 'Service Type', s.serviceType || '—')}
    ${detailRow('bi-chat-left-text-fill', 'Problem', s.problem || '—')}
    ${detailRow('bi-check-circle-fill', 'Work Done', s.workDone || '—')}

    <div class="detail-section"><i class="bi bi-box-seam"></i> Parts & Charges</div>
    ${detailRow('bi-box-seam', 'Spare Parts', s.parts || '—')}
    ${detailRow('bi-cash-coin', 'Parts Cost', '₹' + Number(s.partsCost||0).toLocaleString('en-IN'))}
    ${detailRow('bi-tools', 'Service Charge', '₹' + Number(s.serviceCharge||0).toLocaleString('en-IN'))}

    <div class="detail-total">
      <div><div class="detail-total-lbl">Grand Total</div></div>
      <div class="detail-total-amt">₹${Number(s.total||0).toLocaleString('en-IN')}</div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById('detailModal'));
  modal.show();
}

function detailRow(icon, label, value) {
  return `
  <div class="detail-row">
    <i class="bi ${icon} detail-icon"></i>
    <div>
      <div class="detail-lbl">${label}</div>
      <div class="detail-val">${esc(String(value))}</div>
    </div>
  </div>`;
}

function editFromModal() {
  const s = services.find(x => x.id === activeModalId);
  if (!s) return;
  bootstrap.Modal.getInstance(document.getElementById('detailModal'))?.hide();
  setTimeout(() => openAddForm(s), 300);
}

function deleteFromModal() {
  if (!activeModalId) return;
  if (!confirm('Delete this service entry? This cannot be undone.')) return;
  services = services.filter(s => s.id !== activeModalId);
  saveData();
  bootstrap.Modal.getInstance(document.getElementById('detailModal'))?.hide();
  activeModalId = null;
  renderDashboard();
  renderServiceList();
  showToast('Entry deleted', 'error');
}

// =====================
// PRINT BILL
// =====================
function printBill() {
  const s = services.find(x => x.id === activeModalId);
  if (!s) return;

  document.getElementById('billArea').innerHTML = buildBillHTML(s);
  window.print();
}

function buildBillHTML(s) {
  const invoiceNo = 'CBG' + String(s.createdAt).slice(-6);
  return `
  <div style="max-width:400px;margin:0 auto;font-family:'Nunito',sans-serif;color:#1a1a2e;padding:16px">

    <!-- Header -->
    <div style="text-align:center;border-bottom:3px solid #ff6b00;padding-bottom:14px;margin-bottom:14px">
      <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);display:inline-block;padding:10px 18px;border-radius:12px;margin-bottom:8px">
        <span style="font-size:28px;font-weight:800;color:#ff6b00;letter-spacing:1px;font-family:'Rajdhani',sans-serif">⚙ CITY BIKE GARAGE</span>
      </div>
      <div style="font-size:12px;color:#555770">${GARAGE_ADDR}</div>
      <div style="font-size:12px;color:#555770">📞 ${GARAGE_PHONE}</div>
    </div>

    <!-- Invoice Info -->
    <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:12px">
      <div><strong>Invoice No:</strong><br/>${invoiceNo}</div>
      <div style="text-align:right"><strong>Date:</strong><br/>${formatDate(s.date)}</div>
    </div>

    <!-- Customer & Vehicle -->
    <div style="background:#f2f4f8;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px">
      <div style="font-weight:800;color:#ff6b00;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Customer & Vehicle</div>
      <div><strong>Name:</strong> ${esc(s.name)}</div>
      <div><strong>Mobile:</strong> ${esc(s.mobile)}</div>
      <div><strong>Vehicle No:</strong> <span style="font-weight:700">${esc(s.vehicleNo)}</span></div>
      ${s.brand || s.model ? `<div><strong>Vehicle:</strong> ${esc(s.brand)} ${esc(s.model)}</div>` : ''}
      ${s.km ? `<div><strong>KM Reading:</strong> ${Number(s.km).toLocaleString()} km</div>` : ''}
    </div>

    <!-- Service Details -->
    <div style="background:#f2f4f8;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px">
      <div style="font-weight:800;color:#ff6b00;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Service Details</div>
      ${s.serviceType ? `<div><strong>Type:</strong> ${esc(s.serviceType)}</div>` : ''}
      ${s.problem ? `<div><strong>Problem:</strong> ${esc(s.problem)}</div>` : ''}
      ${s.workDone ? `<div><strong>Work Done:</strong> ${esc(s.workDone)}</div>` : ''}
      ${s.parts ? `<div><strong>Parts Used:</strong> ${esc(s.parts)}</div>` : ''}
      ${s.emergency ? `<div style="color:#e53935;font-weight:700;margin-top:4px">⚠ Emergency Service</div>` : ''}
    </div>

    <!-- Billing Table -->
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:14px">
      <thead>
        <tr style="background:#1a1a2e;color:#fff">
          <th style="padding:8px 10px;text-align:left;border-radius:8px 0 0 0">Description</th>
          <th style="padding:8px 10px;text-align:right;border-radius:0 8px 0 0">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #e0e3ef">
          <td style="padding:8px 10px">Spare Parts Cost</td>
          <td style="padding:8px 10px;text-align:right">₹${Number(s.partsCost||0).toLocaleString('en-IN')}</td>
        </tr>
        <tr style="border-bottom:1px solid #e0e3ef">
          <td style="padding:8px 10px">Service Charge</td>
          <td style="padding:8px 10px;text-align:right">₹${Number(s.serviceCharge||0).toLocaleString('en-IN')}</td>
        </tr>
        <tr style="background:#ff6b00;color:#fff;font-weight:800">
          <td style="padding:10px 10px;border-radius:0 0 0 8px">GRAND TOTAL</td>
          <td style="padding:10px 10px;text-align:right;font-size:18px;border-radius:0 0 8px 0">₹${Number(s.total||0).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <!-- Status -->
    <div style="text-align:center;margin-bottom:12px">
      <span style="background:#e8f5e9;color:#2e7d32;font-weight:800;padding:5px 16px;border-radius:20px;font-size:12px">STATUS: ${s.status.toUpperCase()}</span>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:11px;color:#9a9cb0;border-top:1px solid #e0e3ef;padding-top:10px">
      Thank you for choosing City Bike Garage!<br/>Drive safe 🏍️
    </div>
  </div>`;
}

// =====================
// WHATSAPP SHARE
// =====================
function whatsappShare() {
  const s = services.find(x => x.id === activeModalId);
  if (!s) return;

  const msg = `🏍️ *CITY BIKE GARAGE*\n${GARAGE_ADDR}\n\n` +
    `*Invoice for: ${s.name}*\n` +
    `📱 Mobile: ${s.mobile}\n` +
    `🚗 Vehicle: ${s.vehicleNo}${s.brand ? ` (${s.brand} ${s.model})` : ''}\n` +
    `🔧 Service: ${s.serviceType || 'General'}\n` +
    (s.workDone ? `✅ Work Done: ${s.workDone}\n` : '') +
    `\n💰 Parts Cost: ₹${Number(s.partsCost||0).toLocaleString('en-IN')}\n` +
    `💰 Service Charge: ₹${Number(s.serviceCharge||0).toLocaleString('en-IN')}\n` +
    `💵 *Total: ₹${Number(s.total||0).toLocaleString('en-IN')}*\n` +
    `📋 Status: ${s.status}\n\n` +
    `Thank you for choosing City Bike Garage! 🙏`;

  const phone = s.mobile.replace(/\D/g, '');
  window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// =====================
// DARK MODE
// =====================
function initDarkMode() {
  const saved = localStorage.getItem('cbg_theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('#darkToggle i');
  icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  localStorage.setItem('cbg_theme', theme);
}

document.getElementById('darkToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// =====================
// TOAST NOTIFICATIONS
// =====================
function showToast(msg, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill' };
  const div = document.createElement('div');
  div.className = `toast-msg ${type}`;
  div.innerHTML = `<i class="bi ${icons[type] || ''}"></i> ${msg}`;
  wrap.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// =====================
// UTILITIES
// =====================

/** HTML escape to prevent XSS */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Return today as YYYY-MM-DD */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD to readable */
function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// =====================
// INIT
// =====================
(function init() {
  loadData();
  initDarkMode();
  renderDashboard();

  // Uppercase vehicle number input as user types
  document.getElementById('fVehicleNo').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
  });

  console.log('🏍️ City Bike Garage — Ready!');
})();
