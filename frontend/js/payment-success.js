document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const gateway = params.get('gateway') || sessionStorage.getItem('teletriage_payment_gateway') || '—';
  const trxID = params.get('trxID') || params.get('tran_id') || '—';
  const amount = params.get('amount') || sessionStorage.getItem('teletriage_fee') || '—';
  const paymentID = params.get('paymentID') || '—';

  const txnEl = document.getElementById('receiptTxnId');
  const gatewayEl = document.getElementById('receiptGateway');
  const amountEl = document.getElementById('receiptAmount');
  const dateEl = document.getElementById('receiptDate');
  const routingEl = document.getElementById('receiptRouting');

  if (txnEl) txnEl.textContent = trxID !== '—' ? trxID : paymentID;
  if (gatewayEl) gatewayEl.textContent = gateway;
  if (amountEl) amountEl.textContent = `${amount} BDT`;
  if (dateEl) dateEl.textContent = new Date().toLocaleString();
  if (routingEl) routingEl.textContent = 'Live Priority Queue';

  sessionStorage.removeItem('teletriage_pending_payment_id');
  sessionStorage.removeItem('teletriage_pending_tran_id');
});
