// Profile Controller for TeleTriage

document.addEventListener("DOMContentLoaded", () => {
  // 1. Patient Profile Form Logic
  const patientForm = document.getElementById("patientProfileForm");
  if (patientForm) {
    // আগের সেভ করা তথ্য থাকলে লোড করবে
    const savedName = localStorage.getItem("patientName");
    if (savedName) {
      document.querySelectorAll('input[value="John Doe"]').forEach(el => el.value = savedName);
    }

    patientForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const updatedName = patientForm.querySelector('input[type="text"]').value;
      
      // LocalStorage-এ ডাটা সেভ করা
      localStorage.setItem("patientName", updatedName);
      
      alert("✅ Patient Profile updated successfully!");
      window.location.href = "patient-dashboard.html"; // ড্যাশবোর্ডে ফেরত যাবে
    });
  }

  // 2. Doctor Profile Form Logic
  const doctorForm = document.getElementById("doctorProfileForm");
  if (doctorForm) {
    doctorForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("✅ Doctor Profile updated successfully!");
      window.location.href = "doctor-dashboard.html"; // ড্যাশবোর্ডে ফেরত যাবে
    });
  }
});