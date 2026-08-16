// js/triage-ui-controller.js — Connects TriageEngine to the UI
// js/triage-ui-controller.js — Connects TriageEngine to the UI

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load User Name in Header & Sidebar
  const storedUsers = JSON.parse(localStorage.getItem('teletriage_users') || '[]');
  if (storedUsers.length > 0) {
    const activeUser = storedUsers[storedUsers.length - 1].name;
    const sidebarUser = document.getElementById('sidebarUserName');
    const headerUser = document.getElementById('headerUserName');
    if (sidebarUser) sidebarUser.textContent = activeUser;
    if (headerUser) headerUser.textContent = activeUser;
  }

  // 2. Fetch Form Data from Symptom Form (or Fallback for Testing)
  const symptomData = JSON.parse(localStorage.getItem('teletriage_symptom_form')) || {
    complaint: "chest pain and difficulty breathing", // Default Test Data
    duration: "sudden",
    pain: 8
  };

  // 3. Run TriageEngine Scoring Logic
  const result = TriageEngine.score(symptomData);

  // 4. Update UI Elements with Dynamic Engine Output
  const scoreVal = document.getElementById('severityScoreVal');
  const painVal = document.getElementById('painLevelVal');
  const specialityVal = document.getElementById('specialityVal');
  const statusBanner = document.getElementById('triageStatusBanner');
  const categoryText = document.getElementById('triageCategoryText');
  const actionBtn = document.getElementById('actionBtn');

  // Populate dynamic text values
  if (scoreVal) scoreVal.textContent = result.severityScore;
  if (painVal) painVal.textContent = `${result.painLevel}/10`;
  if (specialityVal) specialityVal.textContent = result.specialty;
  if (categoryText) categoryText.textContent = result.label;

  // Clear previous active scale steps
  for (let i = 1; i <= 5; i++) {
    const step = document.getElementById(`step${i}`);
    if (step) step.classList.remove('active');
  }

  // 5. Apply Dynamic Styling & Button Links Based on Triage Result
  if (result.cssClass === 'urgent') {
    // Urgent / Critical Case (Severity 1 & 2)
    if (statusBanner) statusBanner.style.backgroundColor = '#dc2626'; // Deep Red
    
    if (actionBtn) {
      actionBtn.textContent = 'Proceed to Urgent Payment';
      actionBtn.setAttribute('href', 'payment.html'); 
    }
    
    // Highlight step 4 & 5 on scale
    document.getElementById('step4')?.classList.add('active');
    document.getElementById('step5')?.classList.add('active');

  } else if (result.cssClass === 'moderate') {
    // Moderate Case (Severity 3)
    if (statusBanner) statusBanner.style.backgroundColor = '#eab308'; // Amber/Yellow
    
    if (actionBtn) {
      actionBtn.textContent = 'Proceed to Payment';
      actionBtn.setAttribute('href', 'payment.html'); 
    }

    // Highlight step 3 on scale
    document.getElementById('step3')?.classList.add('active');

  } else {
    // Non-Urgent Case (Severity 4 & 5)
    if (statusBanner) statusBanner.style.backgroundColor = '#84cc16'; // Light Green
    
    if (actionBtn) {
      actionBtn.textContent = 'Book Regular Appointment';
      actionBtn.setAttribute('href', 'payment.html'); 
    }

    // Highlight step 1 & 2 on scale
    document.getElementById('step1')?.classList.add('active');
    document.getElementById('step2')?.classList.add('active');
  }
});