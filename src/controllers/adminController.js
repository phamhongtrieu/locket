const prisma = require('../config/db');

/**
 * Lấy các thông số thống kê tổng quan cho Admin Dashboard
 */
const getStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    
    // Tổng số dư các ví người dùng
    const usersBalanceAggregate = await prisma.user.aggregate({
      where: { role: 'USER' },
      _sum: { balance: true },
    });
    const totalUserBalance = usersBalanceAggregate._sum.balance || 0;

    // Tổng số đơn hàng theo các trạng thái
    const totalOrders = await prisma.order.count();
    const pendingOrdersCount = await prisma.order.count({ where: { status: 'PENDING' } });
    const completedOrdersCount = await prisma.order.count({ where: { status: 'COMPLETED' } });
    const failedOrdersCount = await prisma.order.count({ where: { status: 'FAILED' } });

    // Tổng doanh thu từ các đơn hàng thành công
    const revenueAggregate = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { price: true },
    });
    const totalRevenue = revenueAggregate._sum.price || 0;

    // Doanh thu hôm nay
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayRevenueAggregate = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfToday },
      },
      _sum: { price: true },
    });
    const todayRevenue = todayRevenueAggregate._sum.price || 0;

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalUserBalance,
        totalOrders,
        pendingOrdersCount,
        completedOrdersCount,
        failedOrdersCount,
        totalRevenue,
        todayRevenue,
      },
    });
  } catch (error) {
    console.error('Admin getStats Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy thống kê' });
  }
};

/**
 * Danh sách toàn bộ đơn hàng quản trị
 */
const getOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('Admin getOrders Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách đơn hàng' });
  }
};

/**
 * Đánh dấu hoàn thành đơn hàng (Mark Completed)
 */
const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        note: 'Đã kích hoạt thành công Locket Gold',
      },
    });

    return res.json({
      success: true,
      message: `Đơn hàng #${order.orderCode} đã được đánh dấu HOÀN THÀNH`,
      data: { order: updatedOrder },
    });
  } catch (error) {
    console.error('Admin completeOrder Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi hoàn thành đơn hàng' });
  }
};

/**
 * Đánh dấu thất bại & Hoàn tiền tự động cho người dùng (Mark Failed & Refund)
 */
const refundOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const orderId = parseInt(id, 10);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (order.status === 'FAILED') {
      return res.status(400).json({ success: false, message: 'Đơn hàng này đã bị thất bại/hoàn tiền trước đó' });
    }

    // Thực hiện Atomic Transaction: Cập nhật trạng thái + Hoàn tiền lại ví người dùng
    const result = await prisma.$transaction(async (tx) => {
      // 1. Chuyển trạng thái đơn hàng sang FAILED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'FAILED',
          note: reason || 'Kích hoạt thất bại. Hệ thống đã tự động hoàn tiền vào ví.',
        },
      });

      // 2. Hoàn lại số tiền order.price vào ví người dùng
      const updatedUser = await tx.user.update({
        where: { id: order.userId },
        data: {
          balance: { increment: order.price },
        },
      });

      // 3. Tạo bản ghi giao dịch hoàn tiền REFUND
      const transaction = await tx.transaction.create({
        data: {
          userId: order.userId,
          amount: order.price,
          type: 'REFUND',
          referenceCode: order.orderCode,
          status: 'SUCCESS',
          description: `Hoàn tiền đơn hàng Locket Gold #${order.orderCode}. Lý do: ${reason || 'Admin hoàn tiền'}`,
        },
      });

      return { order: updatedOrder, newBalance: updatedUser.balance, transaction };
    });

    return res.json({
      success: true,
      message: `Đơn hàng #${order.orderCode} đã hủy & tự động hoàn ${order.price.toLocaleString()} VNĐ vào ví người dùng.`,
      data: result,
    });

  } catch (error) {
    console.error('Admin refundOrder Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi hoàn tiền đơn hàng' });
  }
};

/**
 * Lấy danh sách thành viên người dùng
 */
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        balance: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('Admin getUsers Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách người dùng' });
  }
};

/**
 * Nạp / Cộng tiền thủ công vào ví cho người dùng
 */
const addManualBalance = async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Email hoặc ID của khách hàng' });
    }

    const addAmount = parseFloat(amount);
    if (isNaN(addAmount) || addAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền cộng phải lớn hơn 0 VNĐ' });
    }

    const queryStr = email.trim().toLowerCase();
    
    // Tìm theo Email hoặc ID (nếu nhập dạng số #12)
    let user = null;
    const isNumeric = /^\d+$/.test(queryStr.replace('#', ''));
    if (isNumeric) {
      user = await prisma.user.findUnique({
        where: { id: parseInt(queryStr.replace('#', ''), 10) },
      });
    }

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: queryStr },
      });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản người dùng: "${email}"` });
    }

    // Thực hiện Atomic Transaction: Cộng số dư + Ghi nhật ký Transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: addAmount },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          amount: addAmount,
          type: 'DEPOSIT',
          referenceCode: `ADMIN_MANUAL_${Date.now()}`,
          status: 'SUCCESS',
          description: `Admin (${req.user.email}) cộng tiền thủ công vào ví.`,
        },
      });

      return { updatedUser, transaction };
    });

    console.log(`✅ Admin ${req.user.email} đã cộng +${addAmount.toLocaleString()} VNĐ cho User #${user.id} (${user.email})`);

    return res.json({
      success: true,
      message: `Đã nạp thành công ${addAmount.toLocaleString()} VNĐ vào ví của tài khoản ${user.email}`,
      data: {
        userId: user.id,
        email: user.email,
        addedAmount: addAmount,
        newBalance: result.updatedUser.balance,
      },
    });

  } catch (error) {
    console.error('Admin addManualBalance Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi nạp tiền thủ công' });
  }
};

module.exports = {
  getStats,
  getOrders,
  getUsers,
  completeOrder,
  refundOrder,
  addManualBalance,
};
