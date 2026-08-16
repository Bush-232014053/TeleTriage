/* ==========================================================================
   TeleTriage — Auth & Security Helpers (Client Side)
   ========================================================================== */

const TeleAuth = (() => {

  // Strip tags and script contents from inputs to prevent XSS attacks
  function sanitize(input) {
    if (typeof input !== "string") return input;
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML.trim();
  }

  // Validate standard email format
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Validate 11-digit Bangladeshi mobile numbers (e.g., 01XXXXXXXXX or +8801XXXXXXXXX)
  function isValidPhoneBD(phone) {
    return /^(\+8801|01)[3-9]\d{8}$/.test(phone.replace(/\s/g, ""));
  }

  // Evaluate password strength (returns score 0-4 and associated UI label)
  function passwordStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const levels = [
      { label: "Too weak",  color: "#A31E22" },
      { label: "Weak",      color: "#E07B39" },
      { label: "Okay",      color: "#D4AF37" },
      { label: "Good",      color: "#8BC34A" },
      { label: "Strong",    color: "#3C8A45" },
    ];
    return { score, ...levels[score] };
  }

  // Enforce minimum password policy: 8+ chars, uppercase, lowercase, digit, special character
  function meetsMinimumPolicy(pw) {
    return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) &&
           /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  }

  // Rate limiting configuration
  const LOCK_KEY_PREFIX = "tt_login_attempts_";
  const MAX_ATTEMPTS = 5;
  const LOCK_MINUTES = 5;

  // Track failed login attempts and trigger lockout when limit is reached
  function recordFailedAttempt(identifier) {
    const key = LOCK_KEY_PREFIX + identifier;
    const now = Date.now();
    let data = JSON.parse(sessionStorage.getItem(key) || '{"count":0,"lockUntil":0}');
    if (data.lockUntil && now < data.lockUntil) return data;
    data.count = (data.count || 0) + 1;
    if (data.count >= MAX_ATTEMPTS) {
      data.lockUntil = now + LOCK_MINUTES * 60 * 1000;
      data.count = 0;
    }
    sessionStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  // Check if an identifier is currently locked out
  function isLocked(identifier) {
    const key = LOCK_KEY_PREFIX + identifier;
    const data = JSON.parse(sessionStorage.getItem(key) || '{"count":0,"lockUntil":0}');
    return data.lockUntil && Date.now() < data.lockUntil ? data.lockUntil : false;
  }

  // Clear recorded failed attempts upon successful login
  function clearAttempts(identifier) {
    sessionStorage.removeItem(LOCK_KEY_PREFIX + identifier);
  }

  // Automatically trigger callback after user inactivity timeout
  function startIdleTimer(minutes, onTimeout) {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onTimeout, minutes * 60 * 1000);
    };
    ["mousemove", "keydown", "click", "scroll"].forEach(evt =>
      document.addEventListener(evt, reset, { passive: true })
    );
    reset();
  }

  return {
    sanitize, isValidEmail, isValidPhoneBD,
    passwordStrength, meetsMinimumPolicy,
    recordFailedAttempt, isLocked, clearAttempts,
    startIdleTimer,
  };
})();