// Patient dashboard — loads live status from backend API

document.addEventListener('DOMContentLoaded', async () => {
  const token = TeleTriageAPI.getToken();
  if (!token) {
    window.location.href = 'patient-login.html';
    return;
  }

  const storedUser = JSON.parse(sessionStorage.getItem('teletriage_user') || 'null');
  const displayName = storedUser?.full_name || storedUser?.fullName || 'Patient';

  ['sidebarUserName', 'headerUserName', 'welcomeUserName'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = displayName;
  });

  try {
    const status = await TeleTriageAPI.request('/api/patients/me/status');

    if (!status.hasActiveCase) {
      return;
    }

    if (document.getElementById('dashTriageLabel')) {
      document.getElementById('dashTriageLabel').textContent = status.urgencyLabel || 'Pending';
    }
    if (document.getElementById('dashSpecialty')) {
      document.getElementById('dashSpecialty').textContent = `Specialty: ${status.specialty || '—'}`;
    }
    if (document.getElementById('dashQueueText')) {
      document.getElementById('dashQueueText').textContent = status.status || '—';
    }
    if (document.getElementById('dashEstWait')) {
      const wait = status.estimatedWaitMins != null ? `Est. Wait: ${status.estimatedWaitMins} mins` : '';
      document.getElementById('dashEstWait').textContent = wait;
    }
    if (status.assignedDoctor && document.getElementById('assignedDocName')) {
      document.getElementById('assignedDocName').textContent = status.assignedDoctor.name;
      document.getElementById('assignedDocSpec').textContent = `${status.assignedDoctor.specialty} Specialist`;
    }
  } catch (err) {
    console.warn('Could not load patient status:', err.message);
  }

  const enterRoomBtn = document.getElementById('enterRoomBtn');
  if (enterRoomBtn) {
    enterRoomBtn.addEventListener('click', () => {
      alert('Your case is being reviewed. Please wait for updates from your doctor.');
    });
  }
});
