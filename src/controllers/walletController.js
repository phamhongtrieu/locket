const prisma = require('../config/db');
const { generateVietQR } = require('../utils/vietqr');

/**
 * Lấy thông tin VietQR để người dùng nạp tiền
 */
const getDepositInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const amount = parseInt(req.query.amount, 10) || 0;

    const qrData = generateVietQR(userId, amount);

    return res.json({
      success: true,
      data: qrData,
    });
  } catch (error) {
    console.error('GetDepositInfo Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo mã QR nạp tiền' });
  }
};

/**
 * Lấy lịch sử biến động số dư / giao dịch của người dùng
 */
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    console.error('GetTransactions Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải lịch sử giao dịch' });
  }
};

module.exports = {
  getDepositInfo,
  getTransactions,
};
