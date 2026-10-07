const prisma = require('../config/db');
const config = require('../config/config');
const { parseUserIdFromMemo } = require('../utils/vietqr');

/**
 * Xử lý Webhook biến động số dư từ SePay.vn / Casso.vn
 * SePay gửi POST payload khi có tiền đến ngân hàng.
 */
const handleSepayWebhook = async (req, res) => {
  try {
    // 1. Kiểm tra API Key / Token bảo mật từ Header hoặc Query Param
    const authHeader = req.headers['authorization'] || req.headers['x-api-key'] || '';
    const token = authHeader.replace(/^Apikey\s+|^Bearer\s+/i, '').trim();

    if (config.sepayApiKey && token !== config.sepayApiKey && req.query.secret !== config.sepayApiKey) {
      console.warn('⚡ Webhook SePay: Khóa Secret không hợp lệ!', { token, receivedHeader: authHeader });
      return res.status(401).json({ success: false, message: 'Unauthorized Webhook Token' });
    }

    const payload = req.body;
    console.log('📥 Nhận Webhook SePay Payload:', JSON.stringify(payload));

    /**
     * Cấu trúc tiêu chuẩn của SePay Webhook Payload:
     * {
     *   "id": 109432,
     *   "gateway": "MBBank",
     *   "transactionDate": "2026-09-01 19:10:00",
     *   "accountNumber": "0987654321",
     *   "code": null,
     *   "content": "NAPTIEN 12 CHUYEN TIEN",
     *   "transferType": "in",
     *   "transferAmount": 150000,
     *   "accumulated": 5000000,
     *   "subAccount": null,
     *   "referenceCode": "FT2624512345"
     * }
     */

    const {
      id: sepayId,
      content,
      transferType,
      transferAmount,
      referenceCode,
    } = payload;

    // 2. Chỉ xử lý giao dịch tiền vào (tiền cộng vào ngân hàng)
    const amount = parseFloat(transferAmount);
    if ((transferType && transferType.toLowerCase() !== 'in') || isNaN(amount) || amount <= 0) {
      return res.json({
        success: true,
        message: 'Bỏ qua giao dịch không phải tiền vào (transferType != in hoặc amount <= 0)',
      });
    }

    // Mã tham chiếu duy nhất của giao dịch ngân hàng
    const refCodeStr = String(referenceCode || sepayId || `SEPAY_${Date.now()}`);

    // 3. Phòng chống trùng lặp giao dịch (Idempotency Check)
    const existingTx = await prisma.transaction.findFirst({
      where: {
        type: 'DEPOSIT',
        referenceCode: refCodeStr,
      },
    });

    if (existingTx) {
      console.log(`⚠️ Giao dịch SePay ${refCodeStr} đã được xử lý trước đó.`);
      return res.json({
        success: true,
        message: 'Giao dịch đã được xử lý trước đó',
        data: { transactionId: existingTx.id },
      });
    }

    // 4. Phân tích nội dung chuyển khoản để lấy ID người dùng (Cú pháp: NAPTIEN <USER_ID>)
    const userId = parseUserIdFromMemo(content);

    if (!userId) {
      console.warn(`⚠️ Webhook SePay: Không thể tìm thấy USER_ID hợp lệ từ nội dung: "${content}"`);
      return res.json({
        success: false,
        message: 'Nội dung chuyển khoản không đúng cú pháp NAPTIEN <USER_ID>',
      });
    }

    // 5. Kiểm tra người dùng có tồn tại trong hệ thống hay không
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.warn(`⚠️ Webhook SePay: User ID ${userId} không tồn tại trong CSDL.`);
      return res.json({
        success: false,
        message: `Tài khoản người dùng ID ${userId} không tồn tại`,
      });
    }

    // 6. Thực hiện cộng tiền vào ví và ghi nhận Transaction nguyên tử
    const result = await prisma.$transaction(async (tx) => {
      // Cộng số dư ví người dùng
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
        },
      });

      // Tạo lịch sử nạp tiền thành công
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount,
          type: 'DEPOSIT',
          referenceCode: refCodeStr,
          status: 'SUCCESS',
          description: `Nạp tiền tự động qua SePay ngân hàng. Nội dung: ${content}`,
        },
      });

      return { updatedUser, transaction };
    });

    console.log(`✅ Nạp tiền tự động THÀNH CÔNG! User #${userId} (${user.email}) +${amount.toLocaleString()} VNĐ. Số dư mới: ${result.updatedUser.balance.toLocaleString()} VNĐ`);

    return res.json({
      success: true,
      message: 'Nạp tiền tự động thành công!',
      data: {
        userId,
        addedAmount: amount,
        newBalance: result.updatedUser.balance,
        transactionId: result.transaction.id,
      },
    });

  } catch (error) {
    console.error('❌ Lỗi xử lý SePay Webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xử lý Webhook SePay',
      error: error.message,
    });
  }
};

module.exports = {
  handleSepayWebhook,
};
