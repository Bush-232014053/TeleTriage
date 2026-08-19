document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role') || 'patient';
  const patientPanel = document.getElementById('patientResetPanel');
  const doctorPanel = document.getElementById('doctorResetPanel');

  if (role === 'doctor') {
    patientPanel?.classList.add('d-none');
    doctorPanel?.classList.remove('d-none');
    document.title = 'Doctor Password Help — TeleTriage';
    return;
  }

  const form = document.getElementById('patientResetForm');
  const alertBox = document.getElementById('resetAlert');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    const phone = document.getElementById('resetPhone').value.trim();
    const password = document.getElementById('resetPassword').value;
    const confirmPassword = document.getElementById('resetConfirm').value;

    if (password !== confirmPassword) {
      showAlert('Passwords do not match.', 'danger');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      const result = await TeleTriageAPI.request('/api/auth/reset-password/patient', {
        method: 'POST',
        body: JSON.stringify({ email, phone, password, confirmPassword }),
      });
      showAlert(result.message, 'success');
      form.reset();
      setTimeout(() => { window.location.href = 'patient-login.html'; }, 2000);
    } catch (err) {
      showAlert(err.message || 'Could not reset password.', 'danger');
    } finally {
      btn.disabled = false;
    }
  });

  function showAlert(msg, type) {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} small`;
    alertBox.textContent = msg;
    alertBox.classList.remove('d-none');
  }
});
