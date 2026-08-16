/* ==========================================================================
   TeleTriage — auth & security helpers (client side)
   IMPORTANT: everything here is a UX / first line of defence only.
   Real security (password hashing, session tokens, rate limiting) MUST be
   enforced again on the server. See README "Security checklist".
   ========================================================================== */
/* ==========================================================================
   TeleTriage — Auth Logic (Registration & UI Actions)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const alertBox = document.getElementById("alertMsg");

  // ----------------------------------------------------
  // 1. Password Visibility Toggles (Login & Register)
  // ----------------------------------------------------
  
  // Login Password Toggle
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", function () {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      this.classList.toggle("bi-eye");
      this.classList.toggle("bi-eye-slash");
    });
  }

  // Confirm Password Toggle (For Registration Form)
  const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  if (toggleConfirmPassword && confirmPasswordInput) {
    toggleConfirmPassword.addEventListener("click", function () {
      const type = confirmPasswordInput.getAttribute("type") === "password" ? "text" : "password";
      confirmPasswordInput.setAttribute("type", type);
      this.classList.toggle("bi-eye");
      this.classList.toggle("bi-eye-slash");
    });
  }

  // ----------------------------------------------------
  // 2. Language Switcher Toggle
  // ----------------------------------------------------
  const langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.addEventListener("click", function () {
      this.textContent = this.textContent.trim().startsWith("EN") ? "বাং | EN" : "EN | বাং";
    });
  }
  // ----------------------------------------------------
  // 3. Login Form Handler (With Strict Password Check)
  // ----------------------------------------------------
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const pass = document.getElementById("password").value;

      // 1. Basic empty check
      if (!email || !pass) {
        showAlert("Please fill in both email and password.", "danger");
        return;
      }

      // 2. Strict Password Policy Validation
      if (typeof TeleAuth !== "undefined" && !TeleAuth.meetsMinimumPolicy(pass)) {
        showAlert("Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.", "warning");
        return;
      }

      // 3. Fetch stored users from LocalStorage
      const users = JSON.parse(localStorage.getItem("teletriage_users") || "[]");

      // 4. Match user credentials
      const matchedUser = users.find(u => u.email === email && u.password === pass);

      if (matchedUser) {
        // Save logged-in user session
        localStorage.setItem("teletriage_session", JSON.stringify(matchedUser));

        showAlert("Login successful! Redirecting to dashboard...", "success");

        setTimeout(() => {
          window.location.href = "patient-dashboard.html";
        }, 1200);
      } else {
        showAlert("Invalid email address or password. Please try again.", "danger");
      }
    });
  }

  // ----------------------------------------------------
  // 4. Registration Form Handler
  // ----------------------------------------------------
  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Retrieve & sanitize input values
      const fullName = TeleAuth ? TeleAuth.sanitize(document.getElementById("fullName").value.trim()) : document.getElementById("fullName").value.trim();
      const email = TeleAuth ? TeleAuth.sanitize(document.getElementById("email").value.trim()) : document.getElementById("email").value.trim();
      const phone = TeleAuth ? TeleAuth.sanitize(document.getElementById("phone").value.trim()) : document.getElementById("phone").value.trim();
      const pass = document.getElementById("password").value;
      const confirmPass = confirmPasswordInput ? confirmPasswordInput.value : "";

      // Validation 1: Name format check
      const nameRegex = /^[a-zA-Z\s.-]+$/;
      if (!nameRegex.test(fullName)) {
        showAlert("Full Name must contain only letters and spaces.", "danger");
        return;
      }

      // Validation 2: Email format check
      if (typeof TeleAuth !== "undefined" && !TeleAuth.isValidEmail(email)) {
        showAlert("Please enter a valid email address.", "danger");
        return;
      }

      // Validation 3: BD phone format check
      if (typeof TeleAuth !== "undefined" && !TeleAuth.isValidPhoneBD(phone)) {
        showAlert("Please enter a valid 11-digit Bangladeshi mobile number.", "danger");
        return;
      }

      // Validation 4: Password policy check
      if (typeof TeleAuth !== "undefined" && !TeleAuth.meetsMinimumPolicy(pass)) {
        showAlert("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.", "warning");
        return;
      }

      // Validation 5: Password match check
      if (pass !== confirmPass) {
        showAlert("Passwords do not match. Please try again.", "danger");
        return;
      }

      // Prepare user record object
      const userData = {
        name: fullName,
        email: email,
        phone: phone,
        password: pass,
        role: "patient"
      };

      // Fetch existing users
      let users = JSON.parse(localStorage.getItem("teletriage_users") || "[]");

      // Check for existing duplicate email
      if (users.some(u => u.email === email)) {
        showAlert("An account with this email address already exists.", "danger");
        return;
      }

      // Save user record
      users.push(userData);
      localStorage.setItem("teletriage_users", JSON.stringify(users));

      showAlert("Registration successful! Redirecting to login page...", "success");

      setTimeout(() => {
        window.location.href = "login.html?registered=true";
      }, 1500);
    });
  }

  // ----------------------------------------------------
  // 5. Alert Utility Function
  // ----------------------------------------------------
  function showAlert(msg, type) {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} py-2 text-start small mb-3`;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }
});