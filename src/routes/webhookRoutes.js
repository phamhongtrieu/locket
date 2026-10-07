const express = require('express');
const router = express.Router();
const { handleSepayWebhook } = require('../controllers/webhookController');

// Webhook endpoint cho SePay.vn / Casso.vn
router.post('/sepay', handleSepayWebhook);

module.exports = router;
