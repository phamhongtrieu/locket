/**
 * Locket Gold Service - Admin Dashboard JavaScript
 */

let currentFilter = 'ALL';
let allOrders = [];
let allUsers = [];

// Initialize Admin Dashboard
async function initAdminDashboard() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Check if current user is ADMIN
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.role !== 'ADMIN') {
      showToast('Bạn không có quyền truy cập trang Admin', 'error');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);
      return;
    }
  }

  await fetchAdminStats();
  await fetchAdminOrders();
  await fetchAdminUsers();

  // Auto refresh admin stats & orders every 10 seconds
  setInterval(() => {
    fetchAdminStats();
    fetchAdminOrders(true);
    fetchAdminUsers(true);
  }, 10000);
}

// Fetch Admin Statistics
async function fetchAdminStats() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (data.success && data.data) {
      const stats = data.data;
      document.getElementById('stat-total-revenue').innerText = `${stats.totalRevenue.toLocaleString('vi-VN')} VNĐ`;
      document.getElementById('stat-today-revenue').innerText = `${stats.todayRevenue.toLocaleString('vi-VN')} VNĐ`;
      document.getElementById('stat-pending-orders').innerText = `${stats.pendingOrdersCount} đơn`;
      document.getElementById('stat-total-users').innerText = `${stats.totalUsers} người dùng`;
      document.getElementById('stat-user-balances').innerText = `Ví: ${stats.totalUserBalance.toLocaleString('vi-VN')} VNĐ`;
    }
  } catch (error) {
    console.error('Fetch admin stats error:', error);
  }
}

// Fetch Admin Orders List
async function fetchAdminOrders(silent = false) {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/admin/orders?status=${currentFilter}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data.success && data.data) {
      allOrders = data.data.orders;
      renderAdminOrdersTable(allOrders);
    }
  } catch (error) {
    console.error('Fetch admin orders error:', error);
  }
}

// Filter orders handler
function filterOrders(status) {
  currentFilter = status;
  
  // Update active state of filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
    btn.classList.add('text-slate-600', 'hover:text-slate-900');
  });

  const activeBtn = document.getElementById(`filter-btn-${status}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600', 'hover:text-slate-900');
    activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
  }

  fetchAdminOrders();
}

// Render Admin Orders Table
function renderAdminOrdersTable(orders) {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400 font-medium">Không có đơn hàng nào trong danh sách.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const dateStr = new Date(order.createdAt).toLocaleString('vi-VN');
    const userEmail = order.user ? order.user.email : `User #${order.userId}`;

    let statusBadge = '';
    if (order.status === 'PENDING') {
      statusBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold badge-pending animate-pulse-amber"><i class="fa-solid fa-clock"></i> PENDING</span>`;
    } else if (order.status === 'PROCESSING') {
      statusBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold badge-processing"><i class="fa-solid fa-gear fa-spin"></i> PROCESSING</span>`;
    } else if (order.status === 'COMPLETED') {
      statusBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold badge-completed"><i class="fa-solid fa-circle-check"></i> COMPLETED</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold badge-failed"><i class="fa-solid fa-circle-xmark"></i> FAILED (REFUNDED)</span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <!-- Mã Đơn -->
        <td class="py-4 px-4 font-mono font-bold text-indigo-600">${order.orderCode}</td>
        
        <!-- Khách Hàng -->
        <td class="py-4 px-4 text-slate-700">
          <div class="font-bold text-slate-900">${userEmail}</div>
          <div class="text-xs text-slate-400">ID: #${order.userId}</div>
        </td>

        <!-- Username Locket + Nút Copy Nhanh 1-Click -->
        <td class="py-4 px-4">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-slate-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              @${order.targetUsername}
            </span>
            <button onclick="copyLocketUsername('${order.targetUsername}')" title="Copy Username cho Telegram Bot" 
              class="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-indigo-200">
              <i class="fa-solid fa-copy"></i> Copy
            </button>
          </div>
        </td>

        <!-- Gói Dịch Vụ -->
        <td class="py-4 px-4 text-slate-700 font-medium">${order.packageName}</td>

        <!-- Giá Tiền -->
        <td class="py-4 px-4 font-black text-slate-900">${order.price.toLocaleString('vi-VN')} VN\u0110</td>

        <!-- Trạng Thái -->
        <td class="py-4 px-4">${statusBadge}</td>

        <!-- Thao Tác Admin -->
        <td class="py-4 px-4 text-center">
          ${order.status === 'PENDING' || order.status === 'PROCESSING' ? `
            <div class="flex items-center justify-center gap-2">
              <button onclick="markOrderCompleted(${order.id}, '${order.orderCode}')" 
                class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1">
                <i class="fa-solid fa-check"></i> Hoàn Thành
              </button>
              <button onclick="markOrderFailed(${order.id}, '${order.orderCode}')" 
                class="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition-all flex items-center gap-1">
                <i class="fa-solid fa-rotate-left"></i> Hoàn Tiền
              </button>
            </div>
          ` : `
            <span class="text-xs text-slate-400 italic">Đã xử lý (${order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString('vi-VN') : ''})</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

// Fetch Admin Users List
async function fetchAdminUsers(silent = false) {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (data.success && data.data) {
      allUsers = data.data.users;
      renderAdminUsersTable(allUsers);
    }
  } catch (error) {
    console.error('Fetch admin users error:', error);
  }
}

// Render Admin Users Table
function renderAdminUsersTable(users) {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400 font-medium">Chưa có thành viên nào.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => {
    const dateStr = new Date(user.createdAt).toLocaleDateString('vi-VN');
    const roleBadge = user.role === 'ADMIN' 
      ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-700 border border-purple-200">ADMIN</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">USER</span>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-4 px-4 font-mono font-bold text-slate-900">#${user.id}</td>
        <td class="py-4 px-4 font-bold text-slate-800">${user.email}</td>
        <td class="py-4 px-4 font-black text-indigo-600">${user.balance.toLocaleString('vi-VN')} VN\u0110</td>
        <td class="py-4 px-4">${roleBadge}</td>
        <td class="py-4 px-4 text-xs text-slate-500 font-medium">${dateStr}</td>
        <td class="py-4 px-4 text-center">
          <button onclick="fillManualUser('${user.email}')" class="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition border border-indigo-200">
            ➕ Nạp Tiền
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Pre-fill email into manual deposit input
function fillManualUser(email) {
  const emailInput = document.getElementById('manual_email');
  if (emailInput) {
    emailInput.value = email;
    emailInput.focus();
    showToast(`Đã chọn tài khoản: ${email}. Hãy nhập số tiền cần cộng.`, 'info');
  }
}

// Admin Nạp / Cộng Tiền Thủ Công cho Khách
async function addManualBalance() {
  const emailInput = document.getElementById('manual_email');
  const amountInput = document.getElementById('manual_amount');

  const email = emailInput ? emailInput.value.trim() : '';
  const amount = amountInput ? parseFloat(amountInput.value) : 0;

  if (!email) {
    showToast('Vui lòng nhập Email hoặc User ID của khách hàng', 'warning');
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast('Số tiền cần cộng phải lớn hơn 0 VNĐ', 'warning');
    return;
  }

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/admin/deposit-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, amount }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || 'Cộng tiền thất bại', 'error');
      return;
    }

    showToast(data.message, 'success');
    if (amountInput) amountInput.value = '';

    // Refresh statistics, orders & user list
    await fetchAdminStats();
    await fetchAdminOrders();
    await fetchAdminUsers();

  } catch (error) {
    console.error('Add manual balance error:', error);
    showToast('Lỗi máy chủ khi nạp tiền thủ công', 'error');
  }
}

// Copy Locket Username helper for Telegram Bot / manual activation
function copyLocketUsername(username) {
  const textToCopy = username.replace(/^@/, '');
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast(`Đã sao chép Username Locket: "${textToCopy}" (Sẵn sàng dán vào Bot Telegram)`, 'success');
  }).catch(() => {
    showToast('Lỗi khi sao chép Username', 'error');
  });
}

// Mark order as completed
async function markOrderCompleted(orderId, orderCode) {
  if (!confirm(`Xác nhận hoàn thành đơn hàng #${orderCode}?`)) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      await fetchAdminStats();
      await fetchAdminOrders();
    } else {
      showToast(data.message || 'Lỗi khi hoàn thành đơn', 'error');
    }
  } catch (error) {
    console.error('Mark completed error:', error);
    showToast('Lỗi kết nối máy chủ', 'error');
  }
}

// Mark order as failed & auto refund
async function markOrderFailed(orderId, orderCode) {
  const reason = prompt(`Nhập lý do thất bại & hoàn tiền cho đơn #${orderCode}:`, 'Kích hoạt thất bại. Đã hoàn tiền vào ví.');
  if (reason === null) return; // User cancelled prompt

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/refund`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      await fetchAdminStats();
      await fetchAdminOrders();
    } else {
      showToast(data.message || 'Lỗi khi hoàn tiền đơn', 'error');
    }
  } catch (error) {
    console.error('Mark refund error:', error);
    showToast('Lỗi kết nối máy chủ', 'error');
  }
}
