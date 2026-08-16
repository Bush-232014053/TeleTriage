document.addEventListener('DOMContentLoaded', () => {
  const triageData = JSON.parse(sessionStorage.getItem('teletriage_triage') || 'null');
  const submissionId = sessionStorage.getItem('teletriage_submission_id');
  const fee = Number(sessionStorage.getItem('teletriage_fee') || 100);

  if (document.getElementById('summaryFee')) {
    document.getElementById('summaryFee').textContent = `${fee} BDT`;
  }

  const user = JSON.parse(sessionStorage.getItem('teletriage_user') || 'null');
  if (user && document.getElementById('sidebarUserName')) {
    document.getElementById('sidebarUserName').textContent = user.full_name || user.fullName || 'Patient';
  }

  const payBtn = document.getElementById('paySSLBtn') || document.getElementById('payNowBtn');
  if (!payBtn) return;

  payBtn.addEventListener('click', async function handlePay() {
    if (!submissionId) {
      alert('No triage submission found. Please complete the symptom form first.');
      window.location.href = 'symptom-form.html';
      return;
    }

    const gateway = document.querySelector('input[name="paymentGateway"]:checked')?.value || 'SSLCommerz';
    const token = TeleTriageAPI.getToken();

    if (!token) {
      alert('Please log in first.');
      window.location.href = 'patient-login.html';
      return;
    }

    this.disabled = true;
    this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Redirecting to payment gateway...';

    try {
      if (gateway === 'bKash') {
        const data = await TeleTriageAPI.request('/api/payments/initiate', {
          method: 'POST',
          body: JSON.stringify({ submissionId: Number(submissionId) }),
        });
        if (data.bkashURL) {
          window.location.href = data.bkashURL;
          return;
        }
        throw new Error('bKash payment URL was not returned.');
      }

      const data = await TeleTriageAPI.request('/api/payments/initiate-sslcommerz', {
        method: 'POST',
        body: JSON.stringify({
          submissionId: Number(submissionId),
          amount: fee,
          gateway,
        }),
      });

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
