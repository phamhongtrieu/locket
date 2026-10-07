const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { generateToken } = require('../utils/jwt');

/**
 * Đăng ký tài khoản mới
 */
const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Email và Mật khẩu' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Kiểm tra email trùng lặp
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng' });
    }

    // Mã hóa mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo người dùng
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        balance: 0.0,
        role: 'USER',
      },
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          balance: user.balance,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng ký' });
  }
};

/**
 * Đăng nhập
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Email và Mật khẩu' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          balance: user.balance,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng nhập' });
  }
};

/**
 * Lấy thông tin cá nhân
 */
const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy thông tin cá nhân' });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
