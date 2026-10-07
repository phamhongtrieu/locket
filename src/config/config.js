require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
  bank: {
    name: process.env.BANK_NAME || 'MBBank',
    accountNo: process.env.BANK_ACCOUNT_NO || '0987654321',
    accountName: process.env.BANK_ACCOUNT_NAME || 'NGUYEN VAN A',
  },
  sepayApiKey: process.env.SEPAY_API_KEY || 'sepay_secret_token_123456',
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@locketgold.vn',
    password: process.env.ADMIN_PASSWORD || 'admin123456',
  }
};
