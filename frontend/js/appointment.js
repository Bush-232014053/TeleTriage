// js/appointment.js — Handles Slot Selection & Confirmation Modal

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load User Session
  const sessionUser = JSON.parse(localStorage.getItem('teletriage_session') || '{}');
  if (sessionUser.name) {
    document.getElementById('sidebarUserName').textContent = sessionUser.name;
    document.getElementById('headerUserName').textContent = sessionUser.name;
  }

  // 2. Slot Selection Logic
  const slotButtons = document.querySelectorAll('.slot-btn');
  let selectedSlot = "9:00 AM"; // Default selected slot

  slotButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all
      slotButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active to clicked button
      button.classList.add('active');
      selectedSlot = button.getAttribute('data-slot');
    });
  });

  // 3. Confirm Appointment Button Action
  const confirmBtn = document.getElementById('confirmApptBtn');
  const overlay = document.getElementById('confirmationOverlay');
  const modalSelectedTime = document.getElementById('modalSelectedTime');

  if (confirmBtn && overlay) {
    confirmBtn.addEventListener('click', () => {
      // Update modal text with selected time
      if (modalSelectedTime) modalSelectedTime.textContent = selectedSlot;

      // Save booked appointment info to localStorage
      const appointmentData = {
        doctor: "Dr. Karim",
        specialty: "Dermatist",
        time: selectedSlot,
        date: "Today",
        status: "Confirmed"
      };
      localStorage.setItem('teletriage_active_appointment', JSON.stringify(appointmentData));

      // Show modal popup
      overlay.classList.remove('d-none');
      overlay.classList.add('d-flex');
    });
  }
});