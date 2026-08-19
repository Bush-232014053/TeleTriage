// Patient dashboard — live status, duration, cancel + refund

const tr = (s) => (window.TeleTriageI18n ? TeleTriageI18n.tr(s) : s);

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

    if (!status.hasActiveCase) return;

    updateText('dashCaseId', status.caseId ? `${tr('Case #')}Q-${status.caseId}` : tr('Active Case'));
    updateText('dashTriageLabel', status.urgencyLabel || '—');
    updateText('dashSpecialty', `${tr('Specialty:')} ${status.specialty || '—'}`);
    updateText('dashQueueText', status.status ? tr(status.status) : '—');
    updateText('dashEstWait', status.estimatedWaitMins != null
      ? `${tr('Est. Wait:')} ${status.estimatedWaitMins} ${tr('mins')}`
      : '');

    if (status.durationMinutes) {
      updateText('dashConsultDuration', `${status.durationMinutes}${tr(' min consultation')}`);
    }

    if (status.paymentAmount != null) {
      const payEl = document.getElementById('dashPaymentAmount');
      if (payEl) payEl.textContent = `BDT ${status.paymentAmount}`;
      const badge = document.getElementById('dashPaymentBadge');
      if (badge) {
        badge.innerHTML = `<i class="bi bi-shield-check me-1"></i> ${tr(status.paymentStatus)} (${tr(status.paymentMethod || 'Paid')})`;
      }
    }

    if (status.chiefComplaint && document.getElementById('submittedComplaint')) {
      document.getElementById('submittedComplaint').textContent = `"${status.chiefComplaint}"`;
    }

    if (status.assignedDoctor) {
      updateText('assignedDocName', status.assignedDoctor.name);
      updateText('assignedDocSpec', `${status.assignedDoctor.specialty} ${tr('Specialist')}`);
    }

    updateStepper(status.status);

    const cancelBtn = document.getElementById('cancelConsultBtn');
    const cancelHint = document.getElementById('cancelHint');
    if (status.canRequestRefund && cancelBtn) {
      cancelBtn.classList.remove('d-none');
      cancelBtn.addEventListener('click', handleCancel);
    } else if (cancelHint) {
      cancelHint.textContent = status.status === 'Queued'
        ? tr('Refund unavailable — payment not confirmed yet.')
        : tr('Refund only available while waiting in queue (before doctor review).');
    }
  } catch (err) {
    console.warn('Could not load patient status:', err.message);
  }

  document.getElementById('enterRoomBtn')?.addEventListener('click', () => {
    alert(tr('Your case is being reviewed. Please wait for updates from your doctor.'));
  });
});

function updateText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateStepper(status) {
  const order = ['Queued', 'Under Review', 'Consulting', 'Completed'];
  const current = order.indexOf(status);
  const steps = [
    { id: 'stepQueued', idx: 0 },
    { id: 'stepUnderReview', idx: 1 },
    { id: 'stepConsulting', idx: 2 },
    { id: 'stepCompleted', idx: 3 },
  ];

  steps.forEach(({ id, idx }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('completed', 'active');
    if (idx < current) el.classList.add('completed');
    else if (idx === current) el.classList.add('active');
  });
}

async function handleCancel() {
  const reason = prompt(
    `${tr('Why are you cancelling? (Optional)')}\n\n${tr('Full refund applies only while you are still in the queue.')}`
  );
  if (reason === null) return;

  if (!confirm(tr('Cancel consultation and request a full refund?'))) return;

  try {
    const result = await TeleTriageAPI.request('/api/patients/me/cancel-consultation', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || undefined }),
    });
    alert(`${result.message}\n${tr('Refund')}: BDT ${result.refundAmount}\nTransaction: ${result.refundTransactionId}`);
    window.location.href = 'patient-dashboard.html';
  } catch (err) {
    alert(err.message || tr('Could not process cancellation.'));
  }
}
