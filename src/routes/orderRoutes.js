const express = require('express');
const router = express.Router();
const { getPackages, createOrder, getUserOrders } = require('../controllers/orderController');
const authenticateToken = require('../middlewares/authMiddleware');

router.get('/packages', getPackages);
router.post('/', authenticateToken, createOrder);
router.get('/', authenticateToken, getUserOrders);

module.exports = router;
