const config = require('../config/config');

/**
 * Sinh link ảnh QR VietQR chuẩn ngân hàng
 * @param {number} userId - ID người dùng
 * @param {number} amount - Số tiền nạp
 * @returns {object} Thông tin nạp tiền và URL ảnh QR
 */
const generateVietQR = (userId, amount = 0) => {
  const bankName = config.bank.name;
  const accountNo = config.bank.accountNo;
  const accountName = encodeURIComponent(config.bank.accountName);
  
  // Định dạng nội dung chuyển khoản bắt buộc: NAPTIEN <USER_ID>
  const memo = `NAPTIEN ${userId}`;
  const memoEncoded = encodeURIComponent(memo);

  // Link QR chuẩn VietQR (compact2 template)
  const qrUrl = `https://img.vietqr.io/image/${bankName}-${accountNo}-compact2.png?amount=${amount}&addInfo=${memoEncoded}&accountName=${accountName}`;

  return {
    bankName: config.bank.name,
    accountNo: config.bank.accountNo,
    accountName: config.bank.accountName,
    memo,
    amount,
    qrUrl,
  };
};

/**
 * Phân tích nội dung chuyển khoản từ SePay để tìm User ID
 * Ví dụ: "NAPTIEN 123", "NAPTIEN 123 CHUYEN TIEN", "NAP 123"
 * @param {string} content - Nội dung chuyển khoản
 * @returns {number|null} User ID nếu tìm thấy
 */
const parseUserIdFromMemo = (content) => {
  if (!content || typeof content !== 'string') return null;

  // Tìm cú pháp: NAPTIEN <USER_ID> hoặc NAPTIEN<USER_ID> hoặc NAP <USER_ID>
  const match = content.match(/NAP(?:TIEN)?\s*(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return null;
};

module.exports = {
  generateVietQR,
  parseUserIdFromMemo,
};
