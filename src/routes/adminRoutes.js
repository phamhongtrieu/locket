const express = require('express');
const router = express.Router();
const { getStats, getOrders, getUsers, completeOrder, refundOrder, addManualBalance } = require('../controllers/adminController');
const authenticateToken = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/adminMiddleware');

// Tất cả router Admin đều cần Đăng nhập + Quyền Admin
router.use(authenticateToken, requireAdmin);

router.get('/stats', getStats);
router.get('/orders', getOrders);
router.get('/users', getUsers);
router.post('/deposit-manual', addManualBalance);
router.patch('/orders/:id/complete', completeOrder);
router.patch('/orders/:id/refund', refundOrder);

module.exports = router;
