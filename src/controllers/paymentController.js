// bKash payment endpoints (FR-35 .. FR-42).
// Flow: initiate -> patient approves on bKash's page -> bKash redirects to
// our callback URL -> we execute the payment -> on success we create the
// queue entry. A polling endpoint exists as a fallback if the callback/
// webhook is delayed or never arrives.
const pool = require('../config/db');
const bkash = require('../services/bkashService');
const { broadcastQueueUpdate, notifyPatient } = require('../sockets/socketHandlers');

const FEE = Number(process.env.CONSULTATION_FEE || 50);

// POST /api/payments/initiate  { submissionId }  (FR-35, FR-36, FR-42)
async function initiatePayment(req, res) {
  const patientId = req.user.id;
  const { submissionId } = req.body;
  if (!submissionId) return res.status(400).json({ error: 'submissionId is required.' });

  // FR-42: don't allow a second payment for a submission that already has one.
  const { rows: existing } = await pool.query(
    'SELECT * FROM payments WHERE submission_id = $1',
    [submissionId]
  );
  if (existing.length > 0 && existing[0].status === 'Success') {
    return res.status(409).json({ error: 'This submission has already been paid for.' });
  }

  const bkashResponse = await bkash.createPayment({
    amount: FEE,
    invoiceNumber: `TT-${submissionId}-${Date.now()}`,
  });

  if (existing.length > 0) {
    await pool.query(
      `UPDATE payments SET bkash_payment_id = $1, status = 'Pending', amount = $2
       WHERE submission_id = $3`,
      [bkashResponse.paymentID, FEE, submissionId]
    );
  } else {
    await pool.query(
      `INSERT INTO payments (patient_id, submission_id, bkash_payment_id, amount, status)
       VALUES ($1, $2, $3, $4, 'Pending')`,
      [patientId, submissionId, bkashResponse.paymentID, FEE]
    );
  }

  // Frontend redirects the patient's browser to bkashResponse.bkashURL
  res.json({ paymentID: bkashResponse.paymentID, bkashURL: bkashResponse.bkashURL, amount: FEE });
}

// Shared logic: called from both the webhook callback and manual "execute"
// so a queue entry is created exactly once, however confirmation arrives.
async function finalizePayment(paymentID, executeResult) {
  const { rows } = await pool.query('SELECT * FROM payments WHERE bkash_payment_id = $1', [paymentID]);
  const payment = rows[0];
  if (!payment) return null;

  const success = executeResult.transactionStatus === 'Completed';
  const status = success ? 'Success' : 'Failed';

  await pool.query(
    `UPDATE payments SET status = $1, bkash_transaction_id = $2, paid_at = $3
     WHERE payment_id = $4`,
    [status, executeResult.trxID || null, success ? new Date() : null, payment.payment_id]
  );

  if (!success) return { payment, success: false };

  // FR-39: only now does the patient's queue entry get created.
  const { rows: triageRows } = await pool.query(
    `SELECT triage_id, assigned_specialty FROM triage_results WHERE submission_id = $1`,
    [payment.submission_id]
  );
  const triage = triageRows[0];

  const { rows: queueRows } = await pool.query(
    `INSERT INTO queue_entries (patient_id, submission_id, triage_id, status)
     VALUES ($1, $2, $3, 'Queued')
     RETURNING queue_id`,
    [payment.patient_id, payment.submission_id, triage.triage_id]
  );

  await broadcastQueueUpdate(triage.assigned_specialty);
  notifyPatient(payment.patient_id, 'payment-confirmed', { queueId: queueRows[0].queue_id });

  return { payment, success: true, queueId: queueRows[0].queue_id };
}

// POST /api/payments/execute  { paymentID }
// Called by the frontend right after bKash redirects back with status=success,
// as the primary confirmation path (before any webhook arrives).
async function executePayment(req, res) {
  const { paymentID } = req.body;
  if (!paymentID) return res.status(400).json({ error: 'paymentID is required.' });

  if (req.body.cancelled) {
    // FR-38: patient cancelled — let them retry without losing the triage result.
    await pool.query(`UPDATE payments SET status = 'Failed' WHERE bkash_payment_id = $1`, [paymentID]);
    return res.status(200).json({ status: 'Cancelled', message: 'Payment was cancelled. You can retry.' });
  }

  const executeResult = await bkash.executePayment(paymentID);
  const result = await finalizePayment(paymentID, executeResult);

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

// POST /api/payments/bkash/callback  — bKash's own server-to-server webhook.
// This is the durable confirmation path in case the patient closes their
// browser tab right after approving payment (FR: webhook callback handling).
async function bkashWebhook(req, res) {
  const { paymentID, status } = req.body;
  if (!paymentID) return res.status(400).json({ error: 'paymentID missing from webhook payload.' });

  if (status && status !== 'success') {
    await pool.query(`UPDATE payments SET status = 'Failed' WHERE bkash_payment_id = $1`, [paymentID]);
    return res.status(200).json({ received: true });
  }

  const executeResult = await bkash.executePayment(paymentID);
  await finalizePayment(paymentID, executeResult);
  res.status(200).json({ received: true });
}

// GET /api/payments/:paymentID/status  — fallback polling (FR: fallback polling).
// The frontend can call this every few seconds if it never gets a webhook
// or an execute response (e.g. the user's connection dropped mid-flow).
async function pollPaymentStatus(req, res) {
  const { paymentID } = req.params;

  const { rows } = await pool.query('SELECT * FROM payments WHERE bkash_payment_id = $1', [paymentID]);
  const payment = rows[0];
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });

  // If we already resolved it locally, no need to re-hit bKash.
  if (payment.status !== 'Pending') {
    return res.json({ status: payment.status, transactionId: payment.bkash_transaction_id });
  }

  // Still pending locally — ask bKash directly, then finalize if it's done.
  const bkashStatus = await bkash.queryPaymentStatus(paymentID);
  if (bkashStatus.transactionStatus === 'Completed') {
    const result = await finalizePayment(paymentID, bkashStatus);
    return res.json({ status: 'Success', transactionId: bkashStatus.trxID, queueId: result.queueId });
  }

  res.json({ status: 'Pending' });
}

module.exports = { initiatePayment, executePayment, bkashWebhook, pollPaymentStatus };
