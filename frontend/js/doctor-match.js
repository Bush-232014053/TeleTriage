// Loads detected problem + ranked doctor matches — patient selects one before payment.

const tr = (s) => (window.TeleTriageI18n ? TeleTriageI18n.tr(s) : s);

document.addEventListener('DOMContentLoaded', async () => {
  const submissionId = sessionStorage.getItem('teletriage_submission_id');
  const alertBox = document.getElementById('matchAlert');
  const doctorList = document.getElementById('doctorList');
  const noDoctors = document.getElementById('noDoctors');
  const continueBtn = document.getElementById('continueBtn');
  const selectedBanner = document.getElementById('selectedDoctorBanner');

  let selectedDoctorId = sessionStorage.getItem('teletriage_selected_doctor_id');

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

    if (selectedDoctorId) {
      highlightSelection(Number(selectedDoctorId));
      updateContinueState(true);
    } else {
      updateContinueState(false);
    }
  } catch (err) {
    showError(err.message || tr('Could not load matched doctors.'));
  }

  continueBtn?.addEventListener('click', (e) => {
    if (!sessionStorage.getItem('teletriage_selected_doctor_id')) {
      e.preventDefault();
      showError(tr('Please select a doctor before continuing to payment.'));
    }
  });

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
      const selected = String(doc.doctorId) === String(selectedDoctorId);
      return `
        <div class="col-md-6 col-lg-4">
          <div class="doctor-card border rounded-4 p-3 h-100 ${selected ? 'border-success border-3 bg-success-subtle' : isTop ? 'border-success border-2 bg-success-subtle' : 'bg-white'}" data-doctor-id="${doc.doctorId}">
            ${isTop ? `<span class="badge bg-success mb-2">${tr('Best Match')}</span>` : `<span class="badge bg-secondary mb-2">#${doc.rank}</span>`}
            <h6 class="fw-bold mb-1">${escapeHtml(doc.fullName)}</h6>
            <p class="text-muted small mb-1">${escapeHtml(doc.specialty)} · ${escapeHtml(doc.doctorCode)}</p>
            <p class="small mb-2"><i class="bi bi-mortarboard me-1"></i>${escapeHtml(doc.qualification || 'MBBS')}</p>
            <p class="small text-muted mb-2">${doc.yearsExperience || 0} ${tr('years experience')}</p>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">${tr('Active cases:')} ${doc.activeCases}</span>
              <span class="badge rounded-pill" style="background:#187D85;">${doc.matchScore}%${tr(' fit')}</span>
            </div>
            <button type="button" class="btn btn-sm w-100 rounded-3 ${selected ? 'btn-success' : 'btn-outline-secondary'}" data-select="${doc.doctorId}">
              ${selected ? tr('Selected') : tr('Choose This Doctor')}
            </button>
          </div>
        </div>`;
    }).join('');

    doctorList.querySelectorAll('[data-select]').forEach((btn) => {
      btn.addEventListener('click', () => selectDoctor(Number(btn.dataset.select), doctors));
    });
  }

  async function selectDoctor(doctorId, doctors) {
    try {
      const result = await TeleTriageAPI.request(`/api/patients/triage/${submissionId}/select-doctor`, {
        method: 'POST',
        body: JSON.stringify({ doctorId }),
      });
      selectedDoctorId = String(doctorId);
      sessionStorage.setItem('teletriage_selected_doctor_id', selectedDoctorId);
      sessionStorage.setItem('teletriage_selected_doctor', JSON.stringify(result.selectedDoctor));
      highlightSelection(doctorId);
      updateContinueState(true);
      if (selectedBanner) {
        selectedBanner.classList.remove('d-none');
        selectedBanner.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>${tr('You selected:')} <strong>${escapeHtml(result.selectedDoctor.fullName)}</strong> (${escapeHtml(result.selectedDoctor.qualification || '')})`;
      }
      hideError();
    } catch (err) {
      showError(err.message || tr('Could not select doctor.'));
    }
  }

  function highlightSelection(doctorId) {
    doctorList.querySelectorAll('.doctor-card').forEach((card) => {
      const id = Number(card.dataset.doctorId);
      const selected = id === doctorId;
      card.classList.toggle('border-success', selected);
      card.classList.toggle('border-3', selected);
      card.classList.toggle('bg-success-subtle', selected);
      const btn = card.querySelector('[data-select]');
      if (btn) {
        btn.className = `btn btn-sm w-100 rounded-3 ${selected ? 'btn-success' : 'btn-outline-secondary'}`;
        btn.textContent = selected ? tr('Selected') : tr('Choose This Doctor');
      }
    });
  }

  function updateContinueState(ok) {
    if (!continueBtn) return;
    continueBtn.classList.toggle('disabled', !ok);
    continueBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
    if (!ok) continueBtn.href = '#';
    else continueBtn.href = 'payment.html';
  }

  function showError(msg) {
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.classList.remove('d-none');
    }
  }

  function hideError() {
    alertBox?.classList.add('d-none');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
