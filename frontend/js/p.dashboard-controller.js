// js/dashboard-controller.js — Controls Patient Dashboard UI Dynamics

document.addEventListener('DOMContentLoaded', () => {
  // 1. Fetch Active Session User
  const storedUsers = JSON.parse(localStorage.getItem('teletriage_users') || '[]');
  const activeUser = storedUsers.length > 0 ? storedUsers[storedUsers.length - 1].name : "Sumaiya Bintey";

  // Update User Name Elements
  ['sidebarUserName', 'headerUserName', 'welcomeUserName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = activeUser;
  });

  // 2. Fetch Triage & Symptom Submission Data
  const symptomData = JSON.parse(localStorage.getItem('teletriage_symptom_form')) || {
    complaint: "Chest pain and difficulty breathing",
    pain: 8,
    duration: "Sudden"
  };

  // Populate Chief Complaint
  if (document.getElementById('submittedComplaint')) {
    document.getElementById('submittedComplaint').textContent = `"${symptomData.complaint}"`;
  }
  if (document.getElementById('submittedPain')) {
    document.getElementById('submittedPain').textContent = `Pain Level: ${symptomData.pain}/10`;
  }
  if (document.getElementById('submittedDuration')) {
    document.getElementById('submittedDuration').textContent = `Duration: ${symptomData.duration}`;
  }

  // 3. Fetch Booked Appointment or Queue Info
  const activeAppointment = JSON.parse(localStorage.getItem('teletriage_active_appointment'));

  if (activeAppointment) {
    // --- NON-URGENT / APPOINTMENT SLOT CASE ---
    document.getElementById('dashRoutingBadge').textContent = 'Fixed-Time Appointment';
    document.getElementById('dashTriageLabel').textContent = 'Non-Urgent';
    document.getElementById('triageIndicator').style.backgroundColor = '#84cc16'; // Light Green

    document.getElementById('queueCardHeader').textContent = 'Appointment Slot';
    document.getElementById('dashQueueText').textContent = activeAppointment.time || '09:00 AM';
    document.getElementById('dashEstWait').textContent = `Booked for ${activeAppointment.date || 'Today'}`;

    document.getElementById('assignedDocName').textContent = activeAppointment.doctor || 'Dr. Karim';
    document.getElementById('assignedDocSpec').textContent = `${activeAppointment.specialty || 'Dermatologist'} Specialist`;
    document.getElementById('dashSpecialty').textContent = `Specialty: ${activeAppointment.specialty || 'Dermatology'}`;

  } else {
    // --- URGENT / PRIORITY QUEUE CASE ---
    document.getElementById('dashRoutingBadge').textContent = 'Live Priority Queue';
    document.getElementById('dashTriageLabel').textContent = 'Urgent';
    document.getElementById('triageIndicator').style.backgroundColor = '#ea580c'; // Orange/Red

    document.getElementById('queueCardHeader').textContent = 'Queue Status';
    document.getElementById('dashQueueText').textContent = 'In Consultation';
    document.getElementById('dashEstWait').textContent = 'Est. Wait: Active Now';
    
    // Match Doctor Specialty with Triage Summary
    document.getElementById('assignedDocSpec').textContent = 'Cardiologist & Medical Officer';
    document.getElementById('dashSpecialty').textContent = 'Specialty: Cardiology';
  }

  // 4. Consultation Status Button Action (Out of scope for video consultation)
  const enterRoomBtn = document.getElementById('enterRoomBtn');
  if (enterRoomBtn) {
    enterRoomBtn.addEventListener('click', () => {
      alert("Case #TT-2026 Status: Doctor is currently reviewing your symptoms. Please standby for prescription or direct updates.");
    });
  }
});