const express = require('express');
const router = express.Router();
const SSLCommerzPayment = require('sslcommerz-lts');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  initiatePayment,
  executePayment,
  bkashWebhook,
  pollPaymentStatus,
} = require('../controllers/paymentController');

const FEE = Number(process.env.CONSULTATION_FEE || 50);
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5000';

// bKash payment flow (SRS default)
router.post('/initiate', requireAuth, requireRole('patient'), asyncHandler(initiatePayment));
router.post('/execute', requireAuth, requireRole('patient'), asyncHandler(executePayment));
router.post('/bkash/callback', asyncHandler(bkashWebhook));

// SSLCommerz sandbox flow (used by payment.html)
router.post(
  '/initiate-sslcommerz',
  requireAuth,
  requireRole('patient'),
  asyncHandler(async (req, res) => {
    const { amount, submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required.' });
    }

    const data = {
      total_amount: amount || FEE,
      currency: 'BDT',
      tran_id: `TT-${submissionId}-${Date.now()}`,
      success_url: `${BASE_URL}/api/payments/ssl-success`,
      fail_url: `${BASE_URL}/api/payments/ssl-fail`,
      cancel_url: `${BASE_URL}/api/payments/ssl-cancel`,
      ipn_url: `${BASE_URL}/api/payments/ssl-ipn`,
      cus_name: 'TeleTriage Patient',
      cus_email: 'patient@example.com',
      cus_add1: 'Dhaka',
      cus_phone: '01700000000',
      shipping_method: 'NO',
      product_name: 'TeleTriage Doctor Consultation',
      product_category: 'Healthcare',
      product_profile: 'general',
    };

    const sslcz = new SSLCommerzPayment(
      process.env.SSLCOMMERZ_STORE_ID,
      process.env.SSLCOMMERZ_STORE_PASSWORD,
      process.env.SSLCOMMERZ_IS_LIVE === 'true'
    );

    const apiResponse = await sslcz.init(data);
    if (apiResponse?.GatewayPageURL) {
      return res.json({ GatewayPageURL: apiResponse.GatewayPageURL });
    }
    return res.status(502).json({ error: 'Failed to create SSLCommerz session.' });
  })
);

router.post('/ssl-success', (req, res) => {
  res.redirect('/payment-success.html');
});

router.post('/ssl-fail', (req, res) => {
  res.redirect('/payment-failed.html');
});

router.post('/ssl-cancel', (req, res) => {
  res.redirect('/payment-failed.html');
});

router.post('/ssl-ipn', (req, res) => {
  res.status(200).json({ received: true });
});

// Keep dynamic route last so it does not swallow named routes above.
router.get('/:paymentID/status', requireAuth, requireRole('patient'), asyncHandler(pollPaymentStatus));

module.exports = router;
