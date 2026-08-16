// js/doctor-login-controller.js — Handles Doctor Login Page Logic

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('doctorLoginForm');
  const doctorIdInput = document.getElementById('doctorId');
  const passwordInput = document.getElementById('doctorPassword');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  const toggleEyeIcon = document.getElementById('toggleEyeIcon');
  const alertBox = document.getElementById('loginAlert');

  // 1. Password Visibility Toggle
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleEyeIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
  }

  // 2. Form Submission & Validation
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const docId = doctorIdInput.value.trim();
      const password = passwordInput.value.trim();

      if (!docId || !password) {
        showError('Please enter both Doctor ID and Password.');
        return;
      }

      // Save active doctor session info
      const activeDoctor = {
        id: docId,
        name: docId.startsWith('DOC') ? docId : 'Dr. Karim',
        role: 'Doctor',
        loggedInAt: new Date().toISOString()
      };
      localStorage.setItem('teletriage_active_doctor', JSON.stringify(activeDoctor));

      // Redirect to Doctor Dashboard
      window.location.href = 'doctor-dashboard.html';
    });
  }

  function showError(msg) {
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.classList.remove('d-none');
    }
  }
});