/* TeleTriage — auth (registration & login wired to backend API) */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const alertBox = document.getElementById('alertMsg');

  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.classList.toggle('bi-eye');
      this.classList.toggle('bi-eye-slash');
    });
  }

  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  if (toggleConfirmPassword && confirmPasswordInput) {
    toggleConfirmPassword.addEventListener('click', function () {
      const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPasswordInput.setAttribute('type', type);
      this.classList.toggle('bi-eye');
      this.classList.toggle('bi-eye-slash');
    });
  }

  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.addEventListener('click', function () {
      this.textContent = this.textContent.trim().startsWith('EN') ? 'বাং | EN' : 'EN | বাং';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const pass = document.getElementById('password').value;

      if (!email || !pass) {
        showAlert('Please fill in both email and password.', 'danger');
        return;
      }

      if (typeof TeleAuth !== 'undefined' && !TeleAuth.meetsMinimumPolicy(pass)) {
        showAlert(
          'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.',
          'warning'
        );
        return;
      }

      try {
        const data = await TeleTriageAPI.request('/api/auth/login/patient', {
          method: 'POST',
          body: JSON.stringify({ email, password: pass }),
        });

        TeleTriageAPI.setToken(data.token);
        sessionStorage.setItem('teletriage_user', JSON.stringify(data.user));

        showAlert('Login successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = 'patient-dashboard.html';
        }, 800);
      } catch (err) {
        showAlert(err.message || 'Invalid email or password.', 'danger');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const fullName = TeleAuth
        ? TeleAuth.sanitize(document.getElementById('fullName').value.trim())
        : document.getElementById('fullName').value.trim();
      const email = TeleAuth
        ? TeleAuth.sanitize(document.getElementById('email').value.trim())
        : document.getElementById('email').value.trim();
      const phone = TeleAuth
        ? TeleAuth.sanitize(document.getElementById('phone').value.trim())
        : document.getElementById('phone').value.trim();
      const pass = document.getElementById('password').value;
      const confirmPass = confirmPasswordInput ? confirmPasswordInput.value : '';

      const nameRegex = /^[a-zA-Z\s.-]+$/;
      if (!nameRegex.test(fullName)) {
        showAlert('Full Name must contain only letters and spaces.', 'danger');
        return;
      }

      if (typeof TeleAuth !== 'undefined' && !TeleAuth.isValidEmail(email)) {
        showAlert('Please enter a valid email address.', 'danger');
        return;
      }

      if (typeof TeleAuth !== 'undefined' && !TeleAuth.isValidPhoneBD(phone)) {
        showAlert('Please enter a valid 11-digit Bangladeshi mobile number.', 'danger');
        return;
      }

      if (typeof TeleAuth !== 'undefined' && !TeleAuth.meetsMinimumPolicy(pass)) {
        showAlert(
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
          'warning'
        );
        return;
      }

      if (pass !== confirmPass) {
        showAlert('Passwords do not match. Please try again.', 'danger');
        return;
      }

      try {
        const data = await TeleTriageAPI.request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ fullName, email, phone, password: pass }),
        });

        TeleTriageAPI.setToken(data.token);
        sessionStorage.setItem('teletriage_user', JSON.stringify(data.user));

        showAlert('Registration successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = 'patient-dashboard.html';
        }, 800);
      } catch (err) {
        showAlert(err.message || 'Registration failed.', 'danger');
      }
    });
  }

  function showAlert(msg, type) {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} py-2 text-start small mb-3`;
    alertBox.textContent = msg;
    alertBox.classList.remove('d-none');
  }
});
