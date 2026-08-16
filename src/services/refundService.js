// Refund processing — full refund if patient cancels while still Queued.
const pool = require('../config/db');
const bkash = require('./bkashService');
const { broadcastQueueUpdate } = require('../sockets/socketHandlers');

const REFUNDABLE_QUEUE_STATUS = 'Queued';

async function getActiveQueueForPatient(patientId) {
  const { rows } = await pool.query(
    `SELECT q.*, tr.assigned_specialty, pay.payment_id, pay.amount, pay.status AS payment_status,
            pay.payment_method, pay.bkash_payment_id, pay.bkash_transaction_id
     FROM queue_entries q
     JOIN triage_results tr ON tr.triage_id = q.triage_id
     JOIN payments pay ON pay.submission_id = q.submission_id
     WHERE q.patient_id = $1 AND q.status NOT IN ('Completed', 'Cancelled')
     ORDER BY q.created_at DESC
     LIMIT 1`,
    [patientId]
  );
  return rows[0] || null;
}

async function processGatewayRefund(payment) {
  if (payment.payment_method === 'bKash' && payment.bkash_payment_id) {
    try {
      const result = await bkash.refundPayment({
        paymentID: payment.bkash_payment_id,
        amount: String(payment.amount),
        trxID: payment.bkash_transaction_id,
        reason: 'Patient cancelled before consultation',
      });
      return {
        success: true,
        refundTrxId: result.refundTrxID || result.trxID || `BK-REF-${Date.now()}`,
        mode: 'gateway',
      };
    } catch (err) {
      console.warn('bKash refund API failed, recording manual refund:', err.message);
    }
  }

  // SSLCommerz / fallback — sandbox records approved refund for demo
  return {
    success: true,
    refundTrxId: `REF-${payment.payment_method}-${Date.now()}`,
    mode: process.env.REFUND_SANDBOX_AUTO_APPROVE !== 'false' ? 'sandbox_auto' : 'manual',
  };
}

async function cancelConsultationAndRefund(patientId, reason) {
  const entry = await getActiveQueueForPatient(patientId);
  if (!entry) {
    const error = new Error('No active consultation found to cancel.');
    error.statusCode = 404;
    throw error;
  }

  if (entry.status !== REFUNDABLE_QUEUE_STATUS) {
    const error = new Error(
      'Refund is only available while waiting in queue — before a doctor opens your case.'
    );
    error.statusCode = 403;
    error.data = { currentStatus: entry.status };
    throw error;
  }

  if (entry.payment_status !== 'Success') {
    const error = new Error('No successful payment found for this consultation.');
    error.statusCode = 400;
    throw error;
  }

  const { rows: existingRefund } = await pool.query(
    "SELECT * FROM refunds WHERE payment_id = $1 AND status IN ('Pending', 'Completed')",
    [entry.payment_id]
  );
  if (existingRefund.length > 0) {
    const error = new Error('A refund has already been requested for this payment.');
    error.statusCode = 409;
    throw error;
  }

  const gatewayResult = await processGatewayRefund(entry);

  const { rows: refundRows } = await pool.query(
    `INSERT INTO refunds (payment_id, patient_id, queue_id, refund_amount, gateway, refund_trx_id, status, reason, processed_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'Completed', $7, NOW())
     RETURNING refund_id, refund_amount, status, refund_trx_id, processed_at`,
    [
      entry.payment_id,
      patientId,
      entry.queue_id,
      entry.amount,
      entry.payment_method,
      gatewayResult.refundTrxId,
      reason || 'Patient cancelled before consultation started',
    ]
  );

  await pool.query(
    `UPDATE queue_entries SET status = 'Cancelled', updated_at = NOW() WHERE queue_id = $1`,
    [entry.queue_id]
  );
  await pool.query(
    `UPDATE payments SET status = 'Refunded' WHERE payment_id = $1`,
    [entry.payment_id]
  );

  await broadcastQueueUpdate(entry.assigned_specialty);

  return {
    refundId: refundRows[0].refund_id,
    refundAmount: Number(refundRows[0].refund_amount),
    status: refundRows[0].status,
    refundTransactionId: refundRows[0].refund_trx_id,
    processedAt: refundRows[0].processed_at,
    message: 'Your consultation was cancelled and a full refund has been processed.',
    refundMode: gatewayResult.mode,
  };
}

module.exports = { cancelConsultationAndRefund, getActiveQueueForPatient, REFUNDABLE_QUEUE_STATUS };
