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

  return { BASE, getToken, setToken, clearToken, request };
})();
