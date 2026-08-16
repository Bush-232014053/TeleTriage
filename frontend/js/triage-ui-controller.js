// Triage result page — displays server-authoritative triage from sessionStorage

document.addEventListener('DOMContentLoaded', () => {
  const storedUser = JSON.parse(sessionStorage.getItem('teletriage_user') || 'null');
  if (storedUser) {
    const name = storedUser.full_name || storedUser.fullName;
    const sidebarUser = document.getElementById('sidebarUserName');
    const headerUser = document.getElementById('headerUserName');
    if (sidebarUser) sidebarUser.textContent = name;
    if (headerUser) headerUser.textContent = name;
  }

  const triage = JSON.parse(sessionStorage.getItem('teletriage_triage') || 'null');
  if (!triage) {
    console.warn('No triage data in session — complete the symptom form first.');
    return;
  }

  const score = triage.severityScore;
  const label = triage.urgencyLabel;
  const specialty = triage.specialty;
  const painLevel = triage.painLevel ?? '—';

  const scoreVal = document.getElementById('severityScoreVal');
  const painVal = document.getElementById('painLevelVal');
  const specialityVal = document.getElementById('specialityVal');
  const statusBanner = document.getElementById('triageStatusBanner');
  const categoryText = document.getElementById('triageCategoryText');
  const actionBtn = document.getElementById('actionBtn');

  if (scoreVal) scoreVal.textContent = score;
  if (painVal) painVal.textContent = `${painLevel}/10`;
  if (specialityVal) specialityVal.textContent = specialty;
  if (categoryText) categoryText.textContent = label;

  for (let i = 1; i <= 5; i++) {
    document.getElementById(`step${i}`)?.classList.remove('active');
  }

  let cssClass = 'moderate';
  if (score <= 2) cssClass = 'urgent';
  else if (score >= 4) cssClass = 'non-urgent';

  if (cssClass === 'urgent') {
    if (statusBanner) statusBanner.style.backgroundColor = '#dc2626';
    if (actionBtn) {
      actionBtn.textContent = 'Proceed to Urgent Payment';
      actionBtn.setAttribute('href', 'payment.html');
    }
    document.getElementById('step4')?.classList.add('active');
    document.getElementById('step5')?.classList.add('active');
  } else if (cssClass === 'moderate') {
    if (statusBanner) statusBanner.style.backgroundColor = '#eab308';
    if (actionBtn) {
      actionBtn.textContent = 'Proceed to Payment';
      actionBtn.setAttribute('href', 'payment.html');
    }
    document.getElementById('step3')?.classList.add('active');
  } else {
    if (statusBanner) statusBanner.style.backgroundColor = '#84cc16';
    if (actionBtn) {
      actionBtn.textContent = 'Proceed to Payment';
      actionBtn.setAttribute('href', 'payment.html');
    }
    document.getElementById('step1')?.classList.add('active');
    document.getElementById('step2')?.classList.add('active');
  }
});
