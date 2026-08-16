// bKash Tokenized Checkout (Sandbox/Live) integration.
// Sandbox docs: https://developer.bka.sh/docs/tokenized-checkout-overview
const axios = require('axios');
require('dotenv').config();

const SANDBOX_DEFAULTS = {
  baseUrl: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
  appKey: '4f6o0cjiki2rfm34kfdadl1eqq',
  appSecret: '2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b',
  username: 'sandboxTokenizedUser02',
  password: 'sandboxTokenizedUser02@12345',
};

const IS_SANDBOX = process.env.BKASH_SANDBOX !== 'false';
const BASE_URL = process.env.BKASH_BASE_URL
  || (IS_SANDBOX ? SANDBOX_DEFAULTS.baseUrl : 'https://tokenized.pay.bka.sh/v1.2.0-beta');

function cred(name, sandboxFallback) {
  const value = process.env[name];
  if (value) return value;
  return IS_SANDBOX ? sandboxFallback : '';
}

const APP_KEY = cred('BKASH_APP_KEY', SANDBOX_DEFAULTS.appKey);
const APP_SECRET = cred('BKASH_APP_SECRET', SANDBOX_DEFAULTS.appSecret);
const USERNAME = cred('BKASH_USERNAME', SANDBOX_DEFAULTS.username);
const PASSWORD = cred('BKASH_PASSWORD', SANDBOX_DEFAULTS.password);
const CALLBACK_URL = process.env.BKASH_CALLBACK_URL
  || `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api/payments/bkash/return`;

let cachedToken = null;
let tokenExpiresAt = 0;

function isConfigured() {
  return Boolean(APP_KEY && APP_SECRET && USERNAME && PASSWORD && BASE_URL);
}

function sandboxInfo() {
  return {
    configured: isConfigured(),
    mode: IS_SANDBOX ? 'sandbox' : 'live',
    baseUrl: BASE_URL,
    callbackUrl: CALLBACK_URL,
    testWallet: IS_SANDBOX ? '01929918378 (PIN: 12121, OTP: 123456)' : null,
  };
}

async function callBkash(fn, actionLabel) {
  if (!isConfigured()) {
    const error = new Error('bKash is not configured. Set BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, and BKASH_PASSWORD.');
    error.statusCode = 502;
    throw error;
  }

  try {
    return await fn();
  } catch (err) {
    console.error(`bKash ${actionLabel} failed:`, err.response?.data || err.message);
    const error = new Error(`Payment gateway (${actionLabel}) is currently unavailable. Please try again shortly.`);
    error.statusCode = 502;
    throw error;
  }
}

async function getAuthToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  return callBkash(async () => {
    const { data } = await axios.post(
      `${BASE_URL}/tokenized/checkout/token/grant`,
      { app_key: APP_KEY, app_secret: APP_SECRET },
      {
        headers: {
          username: USERNAME,
          password: PASSWORD,
          'Content-Type': 'application/json',
        },
      }
    );
    cachedToken = data.id_token;
    tokenExpiresAt = Date.now() + (Number(data.expires_in || 3300) - 60) * 1000;
    return cachedToken;
  }, 'token grant');
}

function authHeaders(token) {
  return {
    Authorization: token,
    'X-App-Key': APP_KEY,
    'Content-Type': 'application/json',
  };
}

async function createPayment({ amount, invoiceNumber }) {
  const token = await getAuthToken();
  return callBkash(async () => {
    const { data } = await axios.post(
      `${BASE_URL}/tokenized/checkout/create`,
      {
        mode: '0011',
        payerReference: invoiceNumber,
        callbackURL: CALLBACK_URL,
        amount: String(amount),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: invoiceNumber,
      },
      { headers: authHeaders(token) }
    );
    return data;
  }, 'create payment');
}

async function executePayment(paymentID) {
  const token = await getAuthToken();
  return callBkash(async () => {
    const { data } = await axios.post(
      `${BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      { headers: authHeaders(token) }
    );
    return data;
  }, 'execute payment');
}

async function queryPaymentStatus(paymentID) {
  const token = await getAuthToken();
  return callBkash(async () => {
    const { data } = await axios.post(
      `${BASE_URL}/tokenized/checkout/payment/status`,
      { paymentID },
      { headers: authHeaders(token) }
    );
    return data;
  }, 'payment status query');
}

async function refundPayment({ paymentID, amount, trxID, reason }) {
  const token = await getAuthToken();
  return callBkash(async () => {
    const { data } = await axios.post(
      `${BASE_URL}/tokenized/checkout/payment/refund`,
      {
        paymentID,
        amount,
        trxID,
        sku: 'consultation',
        reason: reason || 'Patient cancelled consultation',
      },
      { headers: authHeaders(token) }
    );
    return data;
  }, 'refund payment');
}

module.exports = {
  getAuthToken,
  createPayment,
  executePayment,
  queryPaymentStatus,
  refundPayment,
  isConfigured,
  sandboxInfo,
};
