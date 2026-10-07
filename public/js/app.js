/**
 * Locket Gold Service - Main Client JavaScript
 */

const API_BASE = '/api';

// Toast Notification Manager
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-amber-600';
  toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between text-sm font-semibold animate-bounce transition-all duration-300`;
  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="${type === 'success' ? 'fa-solid fa-circle-check' : type === 'error' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-info'} text-lg"></i>
      <span>${message}</span>
    </div>
    <button onclick="this.parentElement.remove()" class="ml-4 opacity-70 hover:opacity-100">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Token & Auth Helper
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function logout(e) {
  if (e) {
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }
  removeToken();
  showToast('Đã đăng xuất tài khoản', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 500);
}

// Login Handler
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btnSubmit = document.getElementById('btn-submit');
  const alertBox = document.getElementById('alert-box');

  if (!email || !password) {
    showAlert(alertBox, 'Vui lòng điền đầy đủ Email và Mật khẩu', 'error');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập...';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showAlert(alertBox, data.message || 'Đăng nhập thất bại', 'error');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>Đăng Nhập</span><i class="fa-solid fa-arrow-right"></i>';
      return;
    }

    setToken(data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));

    showToast('Đăng nhập thành công!');
    setTimeout(() => {
      if (data.data.user.role === 'ADMIN') {
        window.location.href = '/admin.html';
      } else {
        window.location.href = '/dashboard.html';
      }
    }, 600);

  } catch (error) {
    console.error(error);
    showAlert(alertBox, 'Lỗi kết nối máy chủ', 'error');
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>Đăng Nhập</span><i class="fa-solid fa-arrow-right"></i>';
  }
}

// Register Handler
async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const btnSubmit = document.getElementById('btn-submit');
  const alertBox = document.getElementById('alert-box');

  if (password !== confirmPassword) {
    showAlert(alertBox, 'Mật khẩu xác nhận không khớp', 'error');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang khởi tạo...';

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showAlert(alertBox, data.message || 'Đăng ký thất bại', 'error');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>Đăng Ký Ngay</span><i class="fa-solid fa-user-plus"></i>';
      return;
    }

    setToken(data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));

    showToast('Tạo tài khoản thành công!');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 600);

  } catch (error) {
    console.error(error);
    showAlert(alertBox, 'Lỗi kết nối máy chủ', 'error');
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>Đăng Ký Ngay</span><i class="fa-solid fa-user-plus"></i>';
  }
}

function showAlert(box, msg, type = 'error') {
  if (!box) return;
  box.classList.remove('hidden', 'bg-rose-500/20', 'text-rose-400', 'border-rose-500/30', 'bg-emerald-500/20', 'text-emerald-400');
  if (type === 'error') {
    box.classList.add('bg-rose-500/20', 'text-rose-400', 'border', 'border-rose-500/30');
  } else {
    box.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border', 'border-emerald-500/30');
  }
  box.innerText = msg;
}

// Global Variables
let currentUser = null;

// Dashboard initialization
async function initDashboard() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  await fetchUserProfile();
  await fetchPackagesDashboard();
  await fetchUserOrders();

  // Auto refresh user profile & balance every 8 seconds (check for automated deposit)
  setInterval(() => {
    fetchUserProfile(true);
  }, 8000);
}

// Fetch user profile
async function fetchUserProfile(silent = false) {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      removeToken();
      window.location.href = '/login.html';
      return;
    }

    const data = await res.json();
    if (data.success && data.data.user) {
      currentUser = data.data.user;

      const balanceEl = document.getElementById('user-balance');
      const emailEl = document.getElementById('user-email-display');
      const userIdBadge = document.getElementById('user-id-badge');
      const syntaxPreview = document.getElementById('syntax-preview');

      if (balanceEl) balanceEl.innerText = currentUser.balance.toLocaleString('vi-VN');
      if (emailEl) emailEl.innerText = currentUser.email;
      if (userIdBadge) userIdBadge.innerText = `#${currentUser.id}`;
      if (syntaxPreview) syntaxPreview.innerText = `NAPTIEN ${currentUser.id}`;

      // Admin badge
      const adminBadge = document.getElementById('admin-badge-container');
      if (adminBadge && currentUser.role === 'ADMIN') {
        adminBadge.innerHTML = `<a href="/admin.html" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold hover:underline"><i class="fa-solid fa-crown"></i> Vào Trang Admin Quản Lý</a>`;
      }

      // Check if there is a pending order from home quick order form
      const pendingOrderStr = sessionStorage.getItem('pending_order');
      if (pendingOrderStr) {
        try {
          const pending = JSON.parse(pendingOrderStr);
          if (pending.targetUsername && document.getElementById('target-username')) {
            document.getElementById('target-username').value = pending.targetUsername;
          }
          if (pending.packageId) {
            const radio = document.querySelector(`input[name="packageId"][value="${pending.packageId}"]`);
            if (radio) radio.checked = true;
          }
          sessionStorage.removeItem('pending_order');
          showToast('Đã tự động điền thông tin đơn hàng từ Trang chủ!', 'info');
        } catch (e) {
          console.error(e);
        }
      }
    }
  } catch (error) {
    console.error('Fetch profile error:', error);
  }
}

// Packages for landing home page
async function fetchPackagesHome() {
  updateNavAuthArea();
  const container = document.getElementById('packages-container');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/orders/packages`);
    const data = await res.json();

    if (!data.success || !data.data.packages.length) {
      container.innerHTML = '<p class="text-slate-400 text-center col-span-3">Chưa có gói dịch vụ nào</p>';
      return;
    }

    container.innerHTML = data.data.packages.map(pkg => `
      <div class="bg-white/80 backdrop-blur-md border-2 border-indigo-500 p-8 rounded-2xl text-center relative flex flex-col justify-between shadow-lg shadow-indigo-500/10 max-w-md mx-auto w-full">
        <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-black px-4 py-1 rounded-full tracking-wider uppercase shadow-sm">ƯU ĐÃI ĐẶC BIỆT</div>
        <div>
          <h3 class="text-2xl font-black text-slate-900 mb-2">${pkg.name}</h3>
          <p class="text-xs text-indigo-600 font-bold mb-6">Thời hạn: ${pkg.duration}</p>
          <div class="mb-6">
            <span class="text-4xl font-black text-indigo-600">${pkg.price.toLocaleString('vi-VN')}</span>
            <span class="text-sm font-bold text-indigo-600">VNĐ</span>
            ${pkg.originalPrice ? `<div class="text-xs text-slate-400 line-through mt-1">${pkg.originalPrice.toLocaleString('vi-VN')} VNĐ</div>` : ''}
          </div>
          <p class="text-sm text-slate-600 mb-6 leading-relaxed">${pkg.description || 'Sử dụng trọn vẹn 12 tháng • Bảo hành full 100%'}</p>
        </div>
        <a href="#quick-order" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all">
          <span>Nạp Ngay</span>
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    `).join('');
  } catch (error) {
    console.error('Fetch packages home error:', error);
  }
}

// Dynamic auth area on home page header
function updateNavAuthArea() {
  const navAuthArea = document.getElementById('nav-auth-area');
  const token = getToken();
  if (navAuthArea && token) {
    const userStr = localStorage.getItem('user');
    let isUserAdmin = false;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.role === 'ADMIN') isUserAdmin = true;
      } catch (e) {}
    }
    navAuthArea.innerHTML = `
      <a href="${isUserAdmin ? '/admin.html' : '/dashboard.html'}" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
        <i class="fa-solid fa-user"></i> Bảng Điều Khiển
      </a>
      <button type="button" onclick="logout(event)" class="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-all border border-red-200/60">
        🚪 Đăng Xuất
      </button>
    `;
  }
}

// Packages for Dashboard Order Form
async function fetchPackagesDashboard() {
  const grid = document.getElementById('order-packages-grid');
  if (!grid) return;

  try {
    const res = await fetch(`${API_BASE}/orders/packages`);
    const data = await res.json();

    if (!data.success || !data.data.packages.length) {
      grid.innerHTML = '<p class="text-slate-400 text-center col-span-3">Không có gói dịch vụ</p>';
      return;
    }

    grid.innerHTML = data.data.packages.map((pkg, idx) => `
      <label class="relative bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-5 rounded-xl border-2 border-indigo-500 cursor-pointer shadow-md shadow-indigo-500/5 flex flex-col justify-between">
        <input type="radio" name="packageId" value="${pkg.id}" ${idx === 0 ? 'checked' : ''} class="peer hidden">
        <div class="peer-checked:ring-2 peer-checked:ring-indigo-600 absolute inset-0 rounded-xl pointer-events-none transition-all"></div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-black text-slate-900 text-lg">${pkg.name}</span>
            <span class="text-[11px] bg-indigo-100 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200">iOS Supported</span>
          </div>
          <p class="text-xs text-slate-500 mb-3">${pkg.duration} • Bảo hành full 100%</p>
        </div>
        <div class="text-2xl font-black text-indigo-600">
          ${pkg.price.toLocaleString('vi-VN')} VNĐ
        </div>
      </label>
    `).join('');
  } catch (error) {
    console.error('Fetch packages dashboard error:', error);
  }
}

// Create Order Handler
async function handleCreateOrder(e) {
  e.preventDefault();
  const token = getToken();
  if (!token) return;

  const selectedPkg = document.querySelector('input[name="packageId"]:checked');
  const targetUsername = document.getElementById('target-username').value.trim();
  const btnSubmit = document.getElementById('btn-order-submit');

  if (!selectedPkg) {
    showToast('Vui lòng chọn 1 gói dịch vụ', 'warning');
    return;
  }

  if (!targetUsername) {
    showToast('Vui lòng nhập Username Locket', 'warning');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý đơn hàng...';

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        packageId: selectedPkg.value,
        targetUsername,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || 'Tạo đơn hàng thất bại', 'error');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác Nhận Thanh Toán & Tạo Đơn';
      return;
    }

    showToast('Đặt hàng thành công! Đang tiến hành kích hoạt Locket Gold.', 'success');
    document.getElementById('target-username').value = '';
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác Nhận Thanh Toán & Tạo Đơn';

    // Refresh profile balance & order list
    await fetchUserProfile(true);
    await fetchUserOrders();

  } catch (error) {
    console.error('Create order error:', error);
    showToast('Lỗi kết nối máy chủ', 'error');
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác Nhận Thanh Toán & Tạo Đơn';
  }
}

// Fetch user orders history
async function fetchUserOrders() {
  const tbody = document.getElementById('user-orders-table-body');
  if (!tbody) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!data.success || !data.data.orders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-gray-500 font-medium">Bạn chưa có đơn hàng nào. Hãy chọn gói Locket Gold để khởi tạo đơn hàng đầu tiên!</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.data.orders.map(order => {
      const dateStr = new Date(order.createdAt).toLocaleString('vi-VN');
      
      let statusBadge = '';
      if (order.status === 'PENDING') {
        statusBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold badge-pending animate-pulse-amber"><i class="fa-solid fa-clock"></i> Chờ Xử Lý</span>`;
      } else if (order.status === 'PROCESSING') {
        statusBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold badge-processing"><i class="fa-solid fa-gear fa-spin"></i> Đang Kích Hoạt</span>`;
      } else if (order.status === 'COMPLETED') {
        statusBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold badge-completed"><i class="fa-solid fa-circle-check"></i> Thành Công</span>`;
      } else {
        statusBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold badge-failed"><i class="fa-solid fa-circle-xmark"></i> Hủy & Hoàn Tiền</span>`;
      }

      return `
        <tr class="hover:bg-white/5 transition-colors">
          <td class="py-4 px-4 font-mono font-bold text-amber-400">${order.orderCode}</td>
          <td class="py-4 px-4 font-semibold text-white">${order.packageName}</td>
          <td class="py-4 px-4 font-mono text-gray-300">@${order.targetUsername}</td>
          <td class="py-4 px-4 font-bold text-white">${order.price.toLocaleString('vi-VN')} VN\u0110</td>
          <td class="py-4 px-4">${statusBadge}</td>
          <td class="py-4 px-4 text-xs text-gray-400">${dateStr}</td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Fetch user orders error:', error);
  }
}

// Deposit Modal VietQR logic
async function openDepositModal() {
  const modal = document.getElementById('deposit-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  await refreshQRImage();
}

function closeDepositModal() {
  const modal = document.getElementById('deposit-modal');
  if (modal) modal.classList.add('hidden');
}

async function refreshQRImage() {
  const token = getToken();
  if (!token || !currentUser) return;

  const amountInput = document.getElementById('deposit-amount-input');
  const amount = amountInput ? parseInt(amountInput.value, 10) || 50000 : 50000;

  try {
    const res = await fetch(`${API_BASE}/wallet/deposit-info?amount=${amount}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (data.success && data.data) {
      const qr = data.data;
      document.getElementById('qr-bank-name').innerText = qr.bankName;
      document.getElementById('qr-account-no').innerText = qr.accountNo;
      document.getElementById('qr-account-name').innerText = qr.accountName;
      document.getElementById('qr-memo').innerText = qr.memo;
      document.getElementById('qr-image').src = qr.qrUrl;
    }
  } catch (error) {
    console.error('Refresh QR error:', error);
  }
}

function copyMemoSyntax() {
  if (!currentUser) return;
  const syntax = `NAPTIEN ${currentUser.id}`;
  copyText(syntax);
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Đã sao chép: "${text}"`, 'success');
  }).catch(() => {
    showToast('Lỗi khi sao chép', 'error');
  });
}
