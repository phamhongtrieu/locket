const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Quyền truy cập bị từ chối. Cần tài khoản Admin' });
  }
  next();
};

module.exports = requireAdmin;
