document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('doctorInterestForm');
  const alertBox = document.getElementById('joinAlert');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      specialty: document.getElementById('specialty').value,
      registrationNo: document.getElementById('registrationNo').value.trim(),
      message: document.getElementById('message').value.trim(),
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const result = await TeleTriageAPI.request('/api/public/doctor-interest', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alertBox.className = 'alert alert-success';
      alertBox.textContent = result.message;
      alertBox.classList.remove('d-none');
      form.reset();
    } catch (err) {
      alertBox.className = 'alert alert-danger';
      alertBox.textContent = err.message || 'Submission failed. Please try again.';
      alertBox.classList.remove('d-none');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Interest Application';
    }
  });
});
