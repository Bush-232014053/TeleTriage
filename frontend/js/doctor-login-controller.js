// Doctor login — wired to backend API

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('doctorLoginForm');
  const doctorIdInput = document.getElementById('doctorId');
  const passwordInput = document.getElementById('doctorPassword');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  const toggleEyeIcon = document.getElementById('toggleEyeIcon');
  const alertBox = document.getElementById('loginAlert');

  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      if (toggleEyeIcon) toggleEyeIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const doctorId = doctorIdInput.value.trim();
      const password = passwordInput.value;

      if (!doctorId || !password) {
        showError('Please enter both Doctor ID and Password.');
        return;
      }

      try {
        const data = await TeleTriageAPI.request('/api/auth/login/doctor', {
          method: 'POST',
          body: JSON.stringify({ doctorId, password }),
        });

        TeleTriageAPI.setToken(data.token);
        sessionStorage.setItem('teletriage_doctor', JSON.stringify(data.user));

        window.location.href = 'doctor-dashboard.html';
      } catch (err) {
        showError(err.message || 'Invalid doctor ID or password.');
      }
    });
  }

  function showError(msg) {
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.classList.remove('d-none');
    }
  }
});
