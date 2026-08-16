// Priority queue page — live queue with search/filter + Socket.IO updates.

document.addEventListener('DOMContentLoaded', async () => {
  if (!TeleTriageAPI.getToken()) {
    window.location.href = 'doctor-login.html';
    return;
  }

  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const queueBody = document.getElementById('queueTableBody');
  const statCards = document.querySelectorAll('.row.g-3.mb-4 .fs-3.fw-bold');
  const sidebarName = document.getElementById('sidebarDoctorName') || document.querySelector('aside h6.mb-0');
  const sidebarSpec = document.getElementById('sidebarDoctorSpec') || document.querySelector('aside small.text-white-50');

  let allQueue = [];
  let doctorSpecialty = null;

  try {
    const [profile, stats, queueData] = await Promise.all([
      TeleTriageAPI.request('/api/doctors/me'),
      TeleTriageAPI.request('/api/doctors/me/stats'),
      TeleTriageAPI.request('/api/doctors/queue'),
    ]);

    doctorSpecialty = profile.specialty || null;
    const name = profile.full_name || 'Doctor';
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarSpec) sidebarSpec.textContent = doctorSpecialty || '';

    updateStatCards(stats);
    applyQueue(queueData.queue || []);

    if (doctorSpecialty) {
      TeleTriageSocket.joinDoctorQueue(doctorSpecialty, (queue) => {
        applyQueue(Array.isArray(queue) ? queue : []);
        updateStatCards(computeStatsFromQueue(allQueue));
      });
    }
  } catch (err) {
    console.error('Priority queue load failed:', err);
    if (queueBody) {
      queueBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">${err.message || 'Failed to load queue.'}</td></tr>`;
    }
    if (err.status === 401 || err.status === 403) {
      window.location.href = 'doctor-login.html';
    }
  }

  function applyQueue(queue) {
    allQueue = queue;
    filterQueue();
  }

  function updateStatCards(stats) {
    if (statCards.length < 4 || !stats) return;
    statCards[0].textContent = `${stats.criticalCount ?? 0} Patient${stats.criticalCount === 1 ? '' : 's'}`;
    statCards[1].textContent = `${stats.urgentCount ?? 0} Patient${stats.urgentCount === 1 ? '' : 's'}`;
    statCards[2].textContent = `${stats.moderateOrLowCount ?? 0} Patient${stats.moderateOrLowCount === 1 ? '' : 's'}`;
    statCards[3].textContent = `${stats.activeCount ?? 0} In Line`;
  }

  function computeStatsFromQueue(queue) {
    const criticalCount = queue.filter((e) => e.severityScore === 1).length;
    const urgentCount = queue.filter((e) => e.severityScore === 2).length;
    const moderateOrLowCount = queue.filter((e) => e.severityScore >= 3).length;
    return {
      criticalCount,
      urgentCount,
      moderateOrLowCount,
      activeCount: queue.length,
    };
  }

  function renderQueue(queue) {
    if (!queueBody) return;

    if (queue.length === 0) {
      queueBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Queue is empty.</td></tr>';
      return;
    }

    queueBody.innerHTML = queue.map((entry) => `
      <tr>
        <td class="ps-4 fw-bold text-slate-800">${entry.position}</td>
        <td class="fw-bold text-slate-800">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-person-fill fs-5 text-slate-400"></i>
            ${entry.patientDisplayId}
          </div>
        </td>
        <td>
          <span class="d-inline-flex align-items-center gap-2">
            <span class="sev-badge sev-${entry.severityScore}">${entry.severityScore}</span>
            <span class="fw-bold">${entry.urgencyLabel}</span>
          </span>
        </td>
        <td><span class="badge px-3 py-2 rounded-pill fw-medium status-badge">${entry.status}</span></td>
        <td class="text-end pe-4">
          <button class="btn btn-sm btn-outline-secondary rounded-3 px-3" data-queue-id="${entry.queueId}" data-action="review">
            <i class="bi bi-file-earmark-medical me-1"></i> Start Review
          </button>
        </td>
      </tr>`).join('');

    queueBody.querySelectorAll('[data-action="review"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const queueId = btn.dataset.queueId;
        btn.disabled = true;
        try {
          await TeleTriageAPI.request(`/api/doctors/queue/${queueId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'Under Review' }),
          });
          btn.textContent = 'Under Review';
        } catch (e) {
          btn.disabled = false;
          alert(e.message || 'Could not update case status.');
        }
      });
    });
  }

  function filterQueue() {
    const term = (searchInput?.value || '').toLowerCase().trim();
    const status = (statusFilter?.value || 'all').toLowerCase();

    const filtered = allQueue.filter((entry) => {
      const haystack = `${entry.patientDisplayId} ${entry.status} ${entry.urgencyLabel} ${entry.chiefComplaint}`.toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const normalizedStatus = entry.status.toLowerCase().replace(/\s+/g, '_');
      const matchesStatus = status === 'all' || normalizedStatus === status;
      return matchesSearch && matchesStatus;
    });

    renderQueue(filtered);
  }

  searchInput?.addEventListener('input', filterQueue);
  statusFilter?.addEventListener('change', filterQueue);
});
