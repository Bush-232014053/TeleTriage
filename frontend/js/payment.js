// 4. Integrated Payment Trigger (SSLCommerz Sandbox Redirect)
  const payBtn = document.getElementById('paySSLBtn') || document.getElementById('payNowBtn');
  if (payBtn) {
    payBtn.addEventListener('click', async function() {
      const selectedProvider = document.querySelector('.provider-card.selected')?.dataset.provider || 'bKash';
      const token = localStorage.getItem('token');

      this.disabled = true;
      this.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Redirecting to Payment Gateway...`;

      try {
        // SSLCommerz স্যান্ডবক্স কল দেওয়া হচ্ছে
        const response = await fetch('http://localhost:5000/api/payments/initiate-sslcommerz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            submissionId: parseInt(submissionId),
            amount: parseInt(fee),
            gateway: selectedProvider
          })
        });

        const data = await response.json();

        if (response.ok && data.GatewayPageURL) {
          // আসল SSLCommerz Sandbox পেজে পাঠাবে
          window.location.href = data.GatewayPageURL;
        } else {
          alert(data.error || 'Payment gateway connection failed.');
          this.disabled = false;
          this.innerText = 'Pay Now & Confirm Booking';
        }
      } catch (error) {
        console.error('Payment Error:', error);
        alert('Server not responding. Please check backend status.');
        this.disabled = false;
        this.innerText = 'Pay Now & Confirm Booking';
      }
    });
  }
  