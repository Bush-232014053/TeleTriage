// Doctor dashboard — live stats and queue preview from API.

document.addEventListener('DOMContentLoaded', async () => {
  if (!TeleTriageAPI.getToken()) {
    window.location.href = 'doctor-login.html';
    return;
  }

  const statEls = document.querySelectorAll('.row.g-3.mb-4 .fs-2.fw-bold');
  const queueBody = document.getElementById('doctorQueueBody');
  const welcomeEl = document.querySelector('main h2.fw-bold');
  const sidebarName = document.querySelector('aside h6.mb-0');
  const sidebarSpec = document.querySelector('aside small.text-white-50');

  try {
    const [profile, stats, queueData] = await Promise.all([
      TeleTriageAPI.request('/api/doctors/me'),
      TeleTriageAPI.request('/api/doctors/me/stats'),
      TeleTriageAPI.request('/api/doctors/queue'),
    ]);

    const name = profile.full_name || 'Doctor';
    if (welcomeEl) welcomeEl.textContent = `Welcome, ${name}`;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarSpec) sidebarSpec.textContent = profile.specialty || '';

    if (statEls.length >= 4) {
      statEls[0].textContent = String(stats.activeCount ?? 0).padStart(2, '0');
      statEls[1].textContent = '00'; // fixed appointments — not implemented yet
      statEls[2].textContent = String(stats.consultingCount ?? 0).padStart(2, '0');
      statEls[3].textContent = String(stats.completedToday ?? 0).padStart(2, '0');
    }

    if (queueBody) {
      const queue = (queueData.queue || []).slice(0, 5);
      if (queue.length === 0) {
        queueBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No patients in queue right now.</td></tr>';
      } else {
        queueBody.innerHTML = queue.map((entry) => `
          <tr>
            <td>${entry.patientDisplayId}</td>
            <td>${severityBadge(entry.severityScore, entry.urgencyLabel)}</td>
            <td>${entry.estimatedWaitMins} mins</td>
            <td><span class="text-emerald-600"><i class="bi bi-check-circle-fill me-1"></i>${entry.paymentStatus || 'Paid'}</span></td>
            <td class="text-end"><a href="priority-queue.html" class="btn btn-sm text-white px-3 rounded-2" style="background-color:#187D85;">View</a></td>
          </tr>`).join('');
      }
    }
  } catch (err) {
    console.error('Doctor dashboard load failed:', err);
    if (err.status === 401 || err.status === 403) {
      window.location.href = 'doctor-login.html';
    }
  }
});

function severityBadge(score, label) {
  let cls = 'bg-info-subtle text-info';
  if (score <= 1) cls = 'bg-danger-subtle text-danger';
  else if (score === 2) cls = 'bg-warning-subtle text-warning-emphasis';
  else if (score >= 4) cls = 'bg-success-subtle text-success';
  return `<span class="badge ${cls} px-2.5 py-1 rounded-pill">${label || score}</span>`;
}
