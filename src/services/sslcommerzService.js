// SSLCommerz sandbox/live integration.
// Sandbox docs: https://developer.sslcommerz.com/doc/v4/
// Default sandbox store: testbox / qwerty
const SSLCommerzPayment = require('sslcommerz-lts');
require('dotenv').config();

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID || 'testbox';
const STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD || 'qwerty';
const IS_LIVE = process.env.SSLCOMMERZ_IS_LIVE === 'true';

function getClient() {
  return new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
}

function isConfigured() {
  return Boolean(STORE_ID && STORE_PASSWORD);
}

function sandboxInfo() {
  return {
    configured: isConfigured(),
    mode: IS_LIVE ? 'live' : 'sandbox',
    storeId: STORE_ID,
    apiBase: IS_LIVE ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com',
  };
}

async function createSession({
  amount,
  tranId,
  customer = {},
  urls = {},
}) {
  if (!isConfigured()) {
    const error = new Error('SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.');
    error.statusCode = 502;
    throw error;
  }

  const sslcz = getClient();
  const payload = {
    total_amount: Number(amount),
    currency: 'BDT',
    tran_id: tranId,
    success_url: urls.success,
    fail_url: urls.fail,
    cancel_url: urls.cancel,
    ipn_url: urls.ipn,
    cus_name: customer.name || 'TeleTriage Patient',
    cus_email: customer.email || 'patient@example.com',
    cus_add1: customer.address || 'Dhaka, Bangladesh',
    cus_phone: customer.phone || '01700000000',
    shipping_method: 'NO',
    product_name: 'TeleTriage Doctor Consultation',
    product_category: 'Healthcare',
    product_profile: 'general',
  };

  try {
    const response = await sslcz.init(payload);
    if (!response?.GatewayPageURL) {
      const error = new Error(response?.failedreason || 'SSLCommerz session creation failed.');
      error.statusCode = 502;
      throw error;
    }
    return response;
  } catch (err) {
    console.error('SSLCommerz init failed:', err.response?.data || err.message || err);
    const error = new Error('SSLCommerz payment gateway is unavailable. Please try again shortly.');
    error.statusCode = 502;
    throw error;
  }
}

async function validateTransaction(valId) {
  if (!valId) {
    const error = new Error('SSLCommerz val_id is required for validation.');
    error.statusCode = 400;
    throw error;
  }

  const sslcz = getClient();
  try {
    const response = await sslcz.validate({ val_id: valId });
    return response;
  } catch (err) {
    console.error('SSLCommerz validate failed:', err.response?.data || err.message || err);
    const error = new Error('Could not validate SSLCommerz payment.');
    error.statusCode = 502;
    throw error;
  }
}

function isSuccessfulValidation(validation) {
  const status = (validation?.status || '').toUpperCase();
  return status === 'VALID' || status === 'VALIDATED';
}

module.exports = {
  createSession,
  validateTransaction,
  isSuccessfulValidation,
  isConfigured,
  sandboxInfo,
};
