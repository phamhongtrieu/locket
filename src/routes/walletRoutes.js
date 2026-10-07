const express = require('express');
const router = express.Router();
const { getDepositInfo, getTransactions } = require('../controllers/walletController');
const authenticateToken = require('../middlewares/authMiddleware');

router.get('/deposit-info', authenticateToken, getDepositInfo);
router.get('/transactions', authenticateToken, getTransactions);

module.exports = router;
