const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getGatewayStatus,
  initiatePayment,
  initiateSslcommerz,
  executePayment,
  bkashReturn,
  bkashWebhook,
  sslSuccess,
  sslFail,
  sslCancel,
  sslIpn,
  pollPaymentStatus,
} = require('../controllers/paymentController');

// Public — shows which sandbox gateways are active
router.get('/gateways', asyncHandler(getGatewayStatus));

// bKash direct checkout (sandbox: wallet 01929918378, PIN 12121, OTP 123456)
router.post('/initiate', requireAuth, requireRole('patient'), asyncHandler(initiatePayment));
router.post('/execute', requireAuth, requireRole('patient'), asyncHandler(executePayment));
router.get('/bkash/return', asyncHandler(bkashReturn));
router.post('/bkash/callback', asyncHandler(bkashWebhook));

// SSLCommerz hosted checkout (sandbox store: testbox / qwerty — includes bKash/Nagad/card inside)
router.post('/initiate-sslcommerz', requireAuth, requireRole('patient'), asyncHandler(initiateSslcommerz));
router.post('/ssl-success', asyncHandler(sslSuccess));
router.get('/ssl-success', asyncHandler(sslSuccess));
router.post('/ssl-fail', asyncHandler(sslFail));
router.get('/ssl-fail', asyncHandler(sslFail));
router.post('/ssl-cancel', asyncHandler(sslCancel));
router.get('/ssl-cancel', asyncHandler(sslCancel));
router.post('/ssl-ipn', asyncHandler(sslIpn));

// Polling fallback — keep last
router.get('/:paymentID/status', requireAuth, requireRole('patient'), asyncHandler(pollPaymentStatus));

module.exports = router;
