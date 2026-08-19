// Loads detected problem + ranked doctor matches from the backend API.

const tr = (s) => (window.TeleTriageI18n ? TeleTriageI18n.tr(s) : s);

document.addEventListener('DOMContentLoaded', async () => {
  const submissionId = sessionStorage.getItem('teletriage_submission_id');
  const alertBox = document.getElementById('matchAlert');
  const doctorList = document.getElementById('doctorList');
  const noDoctors = document.getElementById('noDoctors');

  if (!TeleTriageAPI.getToken()) {
    window.location.href = 'patient-login.html';
    return;
  }

  if (!submissionId) {
    showError(tr('No triage submission found. Please submit your symptoms first.'));
    setTimeout(() => { window.location.href = 'symptom-form.html'; }, 2000);
    return;
  }

  try {
    const data = await TeleTriageAPI.request(`/api/patients/triage/${submissionId}/doctors`);
    renderProblem(data.detectedProblem);
    renderDoctors(data.recommendedDoctors || []);
    sessionStorage.setItem('teletriage_recommended_doctors', JSON.stringify(data.recommendedDoctors));
  } catch (err) {
    showError(err.message || tr('Could not load matched doctors.'));
  }

  function renderProblem(problem) {
    if (!problem) return;
    document.getElementById('detectedComplaint').textContent = problem.chiefComplaint || '—';
    document.getElementById('detectedSummary').textContent = problem.summary || '—';
    document.getElementById('detectedUrgency').textContent = problem.urgencyLabel || '—';
    document.getElementById('detectedSeverity').textContent = problem.severityScore ?? '—';
    document.getElementById('detectedSpecialty').textContent = problem.specialty || '—';
    document.getElementById('detectedPain').textContent = problem.painLevel != null ? `${problem.painLevel}/10` : '—';
  }

  function renderDoctors(doctors) {
    document.getElementById('doctorCountBadge').textContent =
      `${doctors.length} ${tr(doctors.length === 1 ? 'doctor' : 'doctors')}`;

    if (doctors.length === 0) {
      noDoctors.classList.remove('d-none');
      return;
    }

    doctorList.innerHTML = doctors.map((doc) => {
      const isTop = doc.rank === 1;
      return `
        <div class="col-md-6 col-lg-4">
          <div class="border rounded-4 p-3 h-100 ${isTop ? 'border-success border-2 bg-success-subtle' : 'bg-white'}">
            ${isTop ? `<span class="badge bg-success mb-2">${tr('Best Match')}</span>` : `<span class="badge bg-secondary mb-2">#${doc.rank}</span>`}
            <h6 class="fw-bold mb-1">${escapeHtml(doc.fullName)}</h6>
            <p class="text-muted small mb-2">${escapeHtml(doc.specialty)} · ${escapeHtml(doc.doctorCode)}</p>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">${tr('Active cases:')} ${doc.activeCases}</span>
              <span class="badge rounded-pill" style="background:#187D85;">${doc.matchScore}%${tr(' fit')}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function showError(msg) {
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.classList.remove('d-none');
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
