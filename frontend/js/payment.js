document.addEventListener('DOMContentLoaded', async () => {
  const submissionId = sessionStorage.getItem('teletriage_submission_id');
  const fee = Number(sessionStorage.getItem('teletriage_fee') || 100);

  if (document.getElementById('summaryFee')) {
    document.getElementById('summaryFee').textContent = `${fee} BDT`;
  }

  const user = JSON.parse(sessionStorage.getItem('teletriage_user') || 'null');
  if (user && document.getElementById('sidebarUserName')) {
    document.getElementById('sidebarUserName').textContent = user.full_name || user.fullName || 'Patient';
  }

  // Show sandbox badges
  try {
    const gateways = await fetch(`${window.location.origin}/api/payments/gateways`).then((r) => r.json());
    renderSandboxInfo(gateways);
  } catch {
    /* optional UI */
  }

  const payBtn = document.getElementById('paySSLBtn') || document.getElementById('payNowBtn');
  if (!payBtn) return;

  payBtn.addEventListener('click', async function handlePay() {
    if (!submissionId) {
      alert('No triage submission found. Please complete the symptom form first.');
      window.location.href = 'symptom-form.html';
      return;
    }

    if (!TeleTriageAPI.getToken()) {
      alert('Please log in first.');
      window.location.href = 'patient-login.html';
      return;
    }

    const gateway = document.querySelector('input[name="paymentGateway"]:checked')?.value || 'SSLCommerz';

    this.disabled = true;
    this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Redirecting to payment gateway...';

    try {
      if (gateway === 'bKash') {
        const data = await TeleTriageAPI.request('/api/payments/initiate', {
          method: 'POST',
          body: JSON.stringify({ submissionId: Number(submissionId) }),
        });
        sessionStorage.setItem('teletriage_pending_payment_id', data.paymentID);
        sessionStorage.setItem('teletriage_payment_gateway', 'bKash');
        if (data.bkashURL) {
          window.location.href = data.bkashURL;
          return;
        }
        throw new Error('bKash payment URL was not returned.');
      }

      const data = await TeleTriageAPI.request('/api/payments/initiate-sslcommerz', {
        method: 'POST',
        body: JSON.stringify({ submissionId: Number(submissionId), amount: fee }),
      });

      sessionStorage.setItem('teletriage_pending_tran_id', data.tranId);
      sessionStorage.setItem('teletriage_payment_gateway', 'SSLCommerz');

      if (data.GatewayPageURL) {
        window.location.href = data.GatewayPageURL;
      } else {
        throw new Error(data.error || 'Payment gateway connection failed.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(error.message || 'Server not responding. Please check backend status.');
      this.disabled = false;
      this.innerText = 'Pay Now & Confirm Booking';
    }
  });
});

function renderSandboxInfo(gateways) {
  const container = document.getElementById('sandboxInfo');
  if (!container || !gateways) return;

  const bkash = gateways.bkash || {};
  const ssl = gateways.sslcommerz || {};

  container.innerHTML = `
    <div class="alert alert-info py-2 small mb-3">
      <strong>Sandbox mode</strong> — test payments only, no real money.
      <ul class="mb-0 mt-2">
        <li><strong>bKash direct:</strong> wallet <code>01929918378</code>, PIN <code>12121</code>, OTP <code>123456</code></li>
        <li><strong>SSLCommerz:</strong> store <code>${ssl.storeId || 'testbox'}</code> (${ssl.mode || 'sandbox'}) — pick bKash/Nagad/card on their page</li>
      </ul>
    </div>`;
}
