/* Shared API helpers — uses same origin when frontend is served by Express. */
const TeleTriageAPI = (() => {
  const BASE = window.location.origin;

  function getToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }

  function setToken(token) {
    sessionStorage.setItem('token', token);
    localStorage.setItem('token', token);
  }

  function clearToken() {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
  }

  function logout(redirect = 'index.html') {
    clearToken();
    [
      'teletriage_user',
      'teletriage_doctor',
      'teletriage_submission_id',
      'teletriage_triage',
      'teletriage_fee',
      'teletriage_consultation_duration',
      'teletriage_recommended_doctors',
      'teletriage_pending_payment_id',
      'teletriage_pending_tran_id',
      'teletriage_payment_gateway',
    ].forEach((key) => sessionStorage.removeItem(key));
    localStorage.removeItem('patientName');
    localStorage.removeItem('teletriage_session');
    localStorage.removeItem('teletriage_active_appointment');
    window.location.href = redirect;
  }

  function bindLogoutLinks() {
    document.querySelectorAll('[data-logout]').forEach((el) => {
      if (el.dataset.logoutBound) return;
      el.dataset.logoutBound = '1';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        logout(el.getAttribute('data-logout-redirect') || 'index.html');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', bindLogoutLinks);

  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${BASE}${path}`, { ...options, headers });
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const err = new Error(data.error || `Request failed (${response.status})`);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return { BASE, getToken, setToken, clearToken, logout, request };
})();
