// bKash Tokenized Checkout (Sandbox) integration.
// Docs pattern: grant token -> create payment -> user approves on bKash's
// page -> execute payment -> (webhook OR polling) confirms final status.
const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BKASH_BASE_URL;

let cachedToken = null;
let tokenExpiresAt = 0;

// Wraps any bKash call so a network/API failure becomes a clean 502 instead
// of a raw axios error message leaking to the client.
async function callBkash(fn, actionLabel) {
  try {
    return await fn();
  } catch (err) {
    console.error(`bKash ${actionLabel} failed:`, err.response?.data || err.message);
    const error = new Error(`Payment gateway (${actionLabel}) is currently unavailable. Please try again shortly.`);
    error.statusCode = 502;
    throw error;
  }
}

// Step 1: grant token. bKash sandbox tokens are short-lived, so we cache
// and re-fetch only when expired instead of on every request.
async function getAuthToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  return callBkash(async () => {
    const { data } = await axios.post(
      `${BASE_URL}/tokenized/checkout/token/grant`,
      {
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      },
      {
        headers: {
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD,
          'Content-Type': 'application/json',
        },
      }
    );
    cachedToken = data.id_token;
    // expires_in is in seconds; refresh a little early to be safe
    tokenExpiresAt = Date.now() + (Number(data.expires_in || 3300) - 60) * 1000;
    return cachedToken;
  }, 'token grant');
}

function authHeaders(token) {
  return {
    Authorization: token,
    'X-App-Key': process.env.BKASH_APP_KEY,
    'Content-Type': 'application/json',
  };
}

// Step 2: create a payment. Returns { paymentID, bkashURL } that the
// frontend redirects the patient to for approval.
async function createPayment({ amount, invoiceNumber }) {
  const token = await getAuthToken();
  return callBkash(async () => {
    const { data } = await axios.post(
      `${BASE_URL}/tokenized/checkout/create`,
      {
        mode: '0011', // checkout (URL based) mode
        payerReference: invoiceNumber,
        callbackURL: process.env.BKASH_CALLBACK_URL,
        amount: String(amount),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: invoiceNumber,
      },
      { headers: authHeaders(token) }
    );
    return data; // includes paymentID, bkashURL, successCallbackURL, etc.
  }, 'create payment');
}

// Step 3: execute payment after the patient approves it on bKash's page.
async function executePayment(paymentID) {
  const token = await getAuthToken();
  return callBkash(async () => {
    const { data } = await axios.post(
      `${BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      { headers: authHeaders(token) }
    );
    return data; // includes transactionStatus, trxID, amount, paymentID
  }, 'execute payment');
}

// Fallback polling: query bKash directly for the current status of a
// paymentID. Used when the webhook callback is delayed, dropped, or the
// client wants to actively re-check ("Check payment status" button).
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

module.exports = { getAuthToken, createPayment, executePayment, queryPaymentStatus };
