const prisma = require('../config/db');

/**
 * Lấy bảng giá các gói Locket Gold
 */
const getPackages = async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });

    return res.json({
      success: true,
      data: { packages },
    });
  } catch (error) {
    console.error('GetPackages Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách gói dịch vụ' });
  }
};

/**
 * Tạo đơn hàng nâng cấp Locket Gold mới (Kiểm tra & trừ số dư ví)
 */
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { packageId, targetUsername } = req.body;

    if (!packageId || !targetUsername || !targetUsername.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn gói dịch vụ và nhập Username Locket chính xác',
      });
    }

    const cleanUsername = targetUsername.trim().replace(/^@/, ''); // Bỏ ký tự @ nếu có

    // Tìm thông tin gói dịch vụ
    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(packageId, 10) },
    });

    if (!pkg || !pkg.active) {
      return res.status(404).json({ success: false, message: 'Gói dịch vụ không khả dụng' });
    }

    // Thực hiện giao dịch nguyên tử (Atomic Transaction): Trừ tiền & Tạo đơn hàng
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra lại số dư thực tế của người dùng
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.balance < pkg.price) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // 2. Trừ số dư tài khoản
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: pkg.price },
        },
      });

      // 3. Tạo mã đơn hàng duy nhất (Ví dụ: LK893201)
      const orderCode = 'LK' + Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90);

      // 4. Tạo bản ghi đơn hàng với trạng thái PENDING
      const order = await tx.order.create({
        data: {
          orderCode,
          userId,
          packageName: `${pkg.name} (${pkg.duration})`,
          targetUsername: cleanUsername,
          price: pkg.price,
          status: 'PENDING',
          note: 'Đơn hàng mới tạo, đang chờ kích hoạt',
        },
      });

      // 5. Ghi nhật ký giao dịch mua hàng (Transaction)
      await tx.transaction.create({
        data: {
          userId,
          amount: -pkg.price,
          type: 'PURCHASE',
          referenceCode: orderCode,
          status: 'SUCCESS',
          description: `Thanh toán đơn nâng cấp Locket Gold: ${pkg.name} cho user @${cleanUsername}`,
        },
      });

      return { order, newBalance: updatedUser.balance };
    });

    return res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công! Đơn hàng đang được hệ thống xử lý.',
      data: result,
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({
        success: false,
        message: 'Số dư ví không đủ. Vui lòng nạp thêm tiền vào tài khoản để mua hàng!',
      });
    }

    console.error('CreateOrder Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo đơn hàng' });
  }
};

/**
 * Lấy lịch sử đơn hàng của người dùng đang đăng nhập
 */
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('GetUserOrders Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách đơn hàng' });
  }
};

module.exports = {
  getPackages,
  createOrder,
  getUserOrders,
};
