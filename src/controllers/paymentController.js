// Payment endpoints — bKash + SSLCommerz sandbox/live flows.
const pool = require('../config/db');
const bkash = require('../services/bkashService');
const sslcommerz = require('../services/sslcommerzService');
const { broadcastQueueUpdate, notifyPatient } = require('../sockets/socketHandlers');

const FEE = Number(process.env.CONSULTATION_FEE || 100);
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5000';

async function getPatientContact(patientId) {
  const { rows } = await pool.query(
    'SELECT full_name, email, phone FROM patients WHERE patient_id = $1',
    [patientId]
  );
  return rows[0] || { full_name: 'TeleTriage Patient', email: 'patient@example.com', phone: '01700000000' };
}

async function findPaymentByGatewayRef(gatewayRef) {
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE bkash_payment_id = $1',
    [gatewayRef]
  );
  return rows[0] || null;
}

async function createQueueEntryIfNeeded(payment) {
  const { rows: existingQueue } = await pool.query(
    'SELECT queue_id FROM queue_entries WHERE submission_id = $1 LIMIT 1',
    [payment.submission_id]
  );
  if (existingQueue.length > 0) {
    return existingQueue[0].queue_id;
  }

  const { rows: triageRows } = await pool.query(
    'SELECT triage_id, assigned_specialty FROM triage_results WHERE submission_id = $1',
    [payment.submission_id]
  );
  const triage = triageRows[0];
  if (!triage) return null;

  const { rows: queueRows } = await pool.query(
    `INSERT INTO queue_entries (patient_id, submission_id, triage_id, status)
     VALUES ($1, $2, $3, 'Queued')
     RETURNING queue_id`,
    [payment.patient_id, payment.submission_id, triage.triage_id]
  );

  await broadcastQueueUpdate(triage.assigned_specialty);
  notifyPatient(payment.patient_id, 'payment-confirmed', { queueId: queueRows[0].queue_id });
  return queueRows[0].queue_id;
}

async function markPaymentSuccess(payment, transactionId) {
  if (payment.status === 'Success') {
    const queueId = await createQueueEntryIfNeeded(payment);
    return { payment, success: true, queueId, alreadyCompleted: true };
  }

  await pool.query(
    `UPDATE payments
     SET status = 'Success', bkash_transaction_id = $1, paid_at = NOW()
     WHERE payment_id = $2`,
    [transactionId || null, payment.payment_id]
  );

  const queueId = await createQueueEntryIfNeeded(payment);
  return { payment, success: true, queueId };
}

async function upsertPendingPayment({ patientId, submissionId, gatewayRef, amount, method }) {
  const { rows: existing } = await pool.query(
    'SELECT * FROM payments WHERE submission_id = $1',
    [submissionId]
  );

  if (existing.length > 0 && existing[0].status === 'Success') {
    const error = new Error('This submission has already been paid for.');
    error.statusCode = 409;
    throw error;
  }

  if (existing.length > 0) {
    await pool.query(
      `UPDATE payments
       SET bkash_payment_id = $1, status = 'Pending', amount = $2, payment_method = $3
       WHERE submission_id = $4`,
      [gatewayRef, amount, method, submissionId]
    );
    return existing[0];
  }

  await pool.query(
    `INSERT INTO payments (patient_id, submission_id, bkash_payment_id, amount, status, payment_method)
     VALUES ($1, $2, $3, $4, 'Pending', $5)`,
    [patientId, submissionId, gatewayRef, amount, method]
  );
  return findPaymentByGatewayRef(gatewayRef);
}

// GET /api/payments/gateways — public sandbox/live status for the UI
async function getGatewayStatus(req, res) {
  res.json({
    consultationFee: FEE,
    bkash: bkash.sandboxInfo(),
    sslcommerz: sslcommerz.sandboxInfo(),
  });
}

// POST /api/payments/initiate  { submissionId }  — bKash direct
async function initiatePayment(req, res) {
  const patientId = req.user.id;
  const { submissionId } = req.body;
  if (!submissionId) return res.status(400).json({ error: 'submissionId is required.' });

  const invoiceNumber = `TT-BK-${submissionId}-${Date.now()}`;
  const bkashResponse = await bkash.createPayment({ amount: FEE, invoiceNumber });

  await upsertPendingPayment({
    patientId,
    submissionId,
    gatewayRef: bkashResponse.paymentID,
    amount: FEE,
    method: 'bKash',
  });

  res.json({
    gateway: 'bKash',
    paymentID: bkashResponse.paymentID,
    bkashURL: bkashResponse.bkashURL,
    amount: FEE,
    mode: bkash.sandboxInfo().mode,
  });
}

// POST /api/payments/initiate-sslcommerz  { submissionId, amount? }
async function initiateSslcommerz(req, res) {
  const patientId = req.user.id;
  const { submissionId, amount } = req.body;
  if (!submissionId) return res.status(400).json({ error: 'submissionId is required.' });

  const fee = Number(amount || FEE);
  const tranId = `TT-SSL-${submissionId}-${Date.now()}`;
  const patient = await getPatientContact(patientId);

  const session = await sslcommerz.createSession({
    amount: fee,
    tranId,
    customer: {
      name: patient.full_name,
      email: patient.email || 'patient@example.com',
      phone: patient.phone,
    },
    urls: {
      success: `${BASE_URL}/api/payments/ssl-success`,
      fail: `${BASE_URL}/api/payments/ssl-fail`,
      cancel: `${BASE_URL}/api/payments/ssl-cancel`,
      ipn: `${BASE_URL}/api/payments/ssl-ipn`,
    },
  });

  await upsertPendingPayment({
    patientId,
    submissionId,
    gatewayRef: tranId,
    amount: fee,
    method: 'SSLCommerz',
  });

  res.json({
    gateway: 'SSLCommerz',
    GatewayPageURL: session.GatewayPageURL,
    tranId,
    sessionkey: session.sessionkey,
    amount: fee,
    mode: sslcommerz.sandboxInfo().mode,
  });
}

async function finalizeBkashPayment(paymentID, executeResult) {
  const payment = await findPaymentByGatewayRef(paymentID);
  if (!payment) return null;

  const success = executeResult.transactionStatus === 'Completed';
  if (!success) {
    await pool.query(`UPDATE payments SET status = 'Failed' WHERE payment_id = $1`, [payment.payment_id]);
    return { payment, success: false };
  }

  return markPaymentSuccess(payment, executeResult.trxID);
}

async function finalizeSslcommerzPayment(tranId, validation) {
  const payment = await findPaymentByGatewayRef(tranId);
  if (!payment) return null;

  if (!sslcommerz.isSuccessfulValidation(validation)) {
    await pool.query(`UPDATE payments SET status = 'Failed' WHERE payment_id = $1`, [payment.payment_id]);
    return { payment, success: false };
  }

  return markPaymentSuccess(payment, validation.bank_tran_id || validation.tran_id);
}

// POST /api/payments/execute  { paymentID } — bKash execute (manual/polling)
async function executePayment(req, res) {
  const { paymentID } = req.body;
  if (!paymentID) return res.status(400).json({ error: 'paymentID is required.' });

  if (req.body.cancelled) {
    await pool.query(`UPDATE payments SET status = 'Failed' WHERE bkash_payment_id = $1`, [paymentID]);
    return res.status(200).json({ status: 'Cancelled', message: 'Payment was cancelled. You can retry.' });
  }

  const executeResult = await bkash.executePayment(paymentID);
  const result = await finalizeBkashPayment(paymentID, executeResult);

  if (!result) return res.status(404).json({ error: 'Payment record not found for this paymentID.' });
  if (!result.success) {
    return res.status(200).json({ status: 'Failed', message: 'Payment failed or was cancelled. Please retry.' });
  }

  res.json({
    status: 'Success',
    transactionId: executeResult.trxID,
    amount: executeResult.amount,
    paidAt: new Date().toISOString(),
    queueId: result.queueId,
  });
}

// GET /api/payments/bkash/return — browser return after bKash sandbox checkout
async function bkashReturn(req, res) {
  const paymentID = req.query.paymentID || req.query.paymentId;
  const status = (req.query.status || '').toLowerCase();

  if (status === 'cancel' || status === 'failure' || status === 'failed') {
    if (paymentID) {
      await pool.query(`UPDATE payments SET status = 'Failed' WHERE bkash_payment_id = $1`, [paymentID]);
    }
    return res.redirect('/payment-failed.html?gateway=bKash');
  }

  if (!paymentID) {
    return res.redirect('/payment-failed.html?gateway=bKash&error=missing_payment_id');
  }

  try {
    const executeResult = await bkash.executePayment(paymentID);
    const result = await finalizeBkashPayment(paymentID, executeResult);

    if (result?.success) {
      const params = new URLSearchParams({
        gateway: 'bKash',
        paymentID,
        trxID: executeResult.trxID || '',
        amount: executeResult.amount || FEE,
      });
      return res.redirect(`/payment-success.html?${params.toString()}`);
    }
  } catch (err) {
    console.error('bKash return failed:', err.message);
  }

  res.redirect('/payment-failed.html?gateway=bKash');
}

// POST /api/payments/bkash/callback — bKash server webhook
async function bkashWebhook(req, res) {
  const { paymentID, status } = req.body;
  if (!paymentID) return res.status(400).json({ error: 'paymentID missing from webhook payload.' });

  if (status && status !== 'success') {
    await pool.query(`UPDATE payments SET status = 'Failed' WHERE bkash_payment_id = $1`, [paymentID]);
    return res.status(200).json({ received: true });
  }

  const executeResult = await bkash.executePayment(paymentID);
  await finalizeBkashPayment(paymentID, executeResult);
  res.status(200).json({ received: true });
}

async function handleSslReturn(req, res, outcome) {
  const body = { ...req.query, ...req.body };
  const tranId = body.tran_id;
  const valId = body.val_id;

  if (outcome !== 'success') {
    if (tranId) {
      await pool.query(`UPDATE payments SET status = 'Failed' WHERE bkash_payment_id = $1`, [tranId]);
    }
    return res.redirect(`/payment-failed.html?gateway=SSLCommerz&status=${outcome}`);
  }

  if (!valId || !tranId) {
    return res.redirect('/payment-failed.html?gateway=SSLCommerz&error=missing_validation');
  }

  try {
    const validation = await sslcommerz.validateTransaction(valId);
    const result = await finalizeSslcommerzPayment(tranId, validation);

    if (result?.success) {
      const params = new URLSearchParams({
        gateway: 'SSLCommerz',
        tran_id: tranId,
        trxID: validation.bank_tran_id || validation.tran_id || '',
        amount: validation.amount || validation.currency_amount || FEE,
      });
      return res.redirect(`/payment-success.html?${params.toString()}`);
    }
  } catch (err) {
    console.error('SSLCommerz return failed:', err.message);
  }

  res.redirect('/payment-failed.html?gateway=SSLCommerz');
}

async function sslSuccess(req, res) {
  return handleSslReturn(req, res, 'success');
}

async function sslFail(req, res) {
  return handleSslReturn(req, res, 'failed');
}

async function sslCancel(req, res) {
  return handleSslReturn(req, res, 'cancelled');
}

// POST /api/payments/ssl-ipn — SSLCommerz instant payment notification
async function sslIpn(req, res) {
  const body = { ...req.query, ...req.body };
  const valId = body.val_id;
  const tranId = body.tran_id;
  const status = (body.status || '').toUpperCase();

  if (!valId || !tranId) {
    return res.status(400).json({ received: false, error: 'Missing val_id or tran_id' });
  }

  try {
    if (status === 'VALID' || status === 'VALIDATED') {
      const validation = await sslcommerz.validateTransaction(valId);
      await finalizeSslcommerzPayment(tranId, validation);
    } else {
      await pool.query(`UPDATE payments SET status = 'Failed' WHERE bkash_payment_id = $1`, [tranId]);
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('SSLCommerz IPN failed:', err.message);
    return res.status(500).json({ received: false });
  }
}

// GET /api/payments/:paymentID/status — bKash polling fallback
async function pollPaymentStatus(req, res) {
  const { paymentID } = req.params;

  const payment = await findPaymentByGatewayRef(paymentID);
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });

  if (payment.status !== 'Pending') {
    return res.json({ status: payment.status, transactionId: payment.bkash_transaction_id });
  }

  if (payment.payment_method === 'SSLCommerz') {
    return res.json({ status: 'Pending', message: 'Use SSLCommerz success callback for confirmation.' });
  }

  const bkashStatus = await bkash.queryPaymentStatus(paymentID);
  if (bkashStatus.transactionStatus === 'Completed') {
    const result = await finalizeBkashPayment(paymentID, bkashStatus);
    return res.json({ status: 'Success', transactionId: bkashStatus.trxID, queueId: result.queueId });
  }

  res.json({ status: 'Pending' });
}

module.exports = {
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
};
