document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');
  const alertBox = document.getElementById('loginAlert');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    try {
      const data = await TeleTriageAPI.request('/api/auth/login/admin', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      TeleTriageAPI.setToken(data.token);
      sessionStorage.setItem('teletriage_admin', JSON.stringify(data.user));
      window.location.href = 'admin-dashboard.html';
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Invalid username or password.';
        alertBox.classList.remove('d-none');
      }
    }
  });
});
