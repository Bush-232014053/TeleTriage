// Patient-facing endpoints: symptom submission, triage result, case status.
// FR-07 .. FR-16, FR-28 .. FR-33
const pool = require('../config/db');
const { getTriageScore } = require('../services/triageService');
const { getQueueInfoForPatient } = require('../services/queueService');

// POST /api/patients/symptoms  (FR-07 .. FR-15)
async function submitSymptoms(req, res) {
  const patientId = req.user.id;
  const { chiefComplaint, duration, painLevel, bodyLocation, notes } = req.body;

  if (!chiefComplaint || !duration || painLevel === undefined) {
    return res.status(400).json({ error: 'chiefComplaint, duration and painLevel are required.' });
  }

  // FR-09: only one active case at a time per patient. "Active" means the
  // submission hasn't been archived as Completed yet — this covers a case
  // that is still waiting on payment too, not just one already in the queue.
  const { rows: activeCases } = await pool.query(
    `SELECT s.submission_id, tr.severity_score, tr.urgency_label, tr.assigned_specialty
     FROM symptom_submissions s
     JOIN triage_results tr ON tr.submission_id = s.submission_id
     WHERE s.patient_id = $1
       AND NOT EXISTS (SELECT 1 FROM case_archive a WHERE a.submission_id = s.submission_id)
     ORDER BY s.submitted_at DESC
     LIMIT 1`,
    [patientId]
  );
  if (activeCases.length > 0) {
    const existing = activeCases[0];
    return res.status(409).json({
      error: 'You already have an active case. Please wait until it is marked Completed before submitting a new one.',
      existingSubmissionId: existing.submission_id,
      existingTriage: {
        severityScore: existing.severity_score,
        urgencyLabel: existing.urgency_label,
        specialty: existing.assigned_specialty,
      },
    });
  }

  // Save the raw submission first (FR-10, FR-11).
  const { rows: submissionRows } = await pool.query(
    `INSERT INTO symptom_submissions (patient_id, chief_complaint, duration, pain_level, body_location, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING submission_id, submitted_at`,
    [patientId, chiefComplaint, duration, painLevel, bodyLocation || null, notes || null]
  );
  const submission = submissionRows[0];

  // Server-side authoritative scoring — never trust a client-computed score (FR-12).
  const triage = await getTriageScore({ complaint: chiefComplaint, duration, pain: painLevel, bodyLocation });

  const { rows: triageRows } = await pool.query(
    `INSERT INTO triage_results (submission_id, severity_score, urgency_label, assigned_specialty)
     VALUES ($1, $2, $3, $4)
     RETURNING triage_id, severity_score, urgency_label, assigned_specialty, processed_at`,
    [submission.submission_id, triage.severity_score, triage.urgency_label, triage.specialty]
  );
  const triageResult = triageRows[0];

  // FR-15/FR-28: patient sees severity, specialty and urgency label immediately.
  // Note: the queue entry is NOT created yet — FR-39 requires payment first.
  res.status(201).json({
    submissionId: submission.submission_id,
    submittedAt: submission.submitted_at,
    triage: {
      triageId: triageResult.triage_id,
      severityScore: triageResult.severity_score,
      urgencyLabel: triageResult.urgency_label,
      specialty: triageResult.assigned_specialty,
    },
    nextStep: 'payment', // tells the frontend to route to the bKash payment step
  });
}

// GET /api/patients/triage/:submissionId  (view a specific triage result again)
async function getTriageResult(req, res) {
  const patientId = req.user.id;
  const { submissionId } = req.params;

  const { rows } = await pool.query(
    `SELECT s.submission_id, s.chief_complaint, s.duration, s.pain_level, s.body_location,
            tr.triage_id, tr.severity_score, tr.urgency_label, tr.assigned_specialty
     FROM symptom_submissions s
     JOIN triage_results tr ON tr.submission_id = s.submission_id
     WHERE s.submission_id = $1 AND s.patient_id = $2`,
    [submissionId, patientId]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Triage result not found.' });
  res.json(rows[0]);
}

// GET /api/patients/me/status  (FR-29, FR-30 — patient dashboard)
async function getMyStatus(req, res) {
  const patientId = req.user.id;

  // First check the queue (this covers Queued / Under Review / Consulting).
  const queueInfo = await getQueueInfoForPatient(patientId);
  if (queueInfo) {
    return res.json({
      hasActiveCase: true,
      caseId: queueInfo.queueId,
      status: queueInfo.status, // Queued | Under Review | Consulting | Completed
      queuePosition: queueInfo.position,
      estimatedWaitMins: queueInfo.estimatedWaitMins,
      severityScore: queueInfo.severityScore,
      urgencyLabel: queueInfo.urgencyLabel,
      specialty: queueInfo.specialty,
      paymentStatus: queueInfo.paymentStatus,
      // FR-31: patient sees a "doctor is ready" indicator when status flips to Consulting
      doctorReady: queueInfo.status === 'Consulting',
      // null until a doctor has opened/updated the case at least once
      assignedDoctor: queueInfo.assignedDoctor,
    });
  }

  // No queue entry yet — the patient may still have a submission that's
  // waiting on payment (FR-39: queue entry only appears after payment).
  const { rows } = await pool.query(
    `SELECT s.submission_id, tr.severity_score, tr.urgency_label, tr.assigned_specialty,
            pay.status AS payment_status
     FROM symptom_submissions s
     JOIN triage_results tr ON tr.submission_id = s.submission_id
     LEFT JOIN payments pay ON pay.submission_id = s.submission_id
     WHERE s.patient_id = $1
       AND NOT EXISTS (SELECT 1 FROM case_archive a WHERE a.submission_id = s.submission_id)
     ORDER BY s.submitted_at DESC
     LIMIT 1`,
    [patientId]
  );

  if (rows.length === 0) {
    return res.json({ hasActiveCase: false });
  }

  const pending = rows[0];
  res.json({
    hasActiveCase: true,
    status: 'Awaiting Payment',
    submissionId: pending.submission_id,
    severityScore: pending.severity_score,
    urgencyLabel: pending.urgency_label,
    specialty: pending.assigned_specialty,
    paymentStatus: pending.payment_status || 'Not Started',
    doctorReady: false,
  });
}

// GET /api/patients/me/history  (FR-33-adjacent: patient's own past cases)
async function getMyHistory(req, res) {
  const patientId = req.user.id;
  const { rows } = await pool.query(
    `SELECT a.archive_id, a.completed_at, tr.severity_score, tr.urgency_label,
            tr.assigned_specialty, s.chief_complaint
     FROM case_archive a
     JOIN triage_results tr ON tr.triage_id = a.triage_id
     JOIN symptom_submissions s ON s.submission_id = a.submission_id
     WHERE a.patient_id = $1
     ORDER BY a.completed_at DESC`,
    [patientId]
  );
  res.json(rows);
}

// GET /api/patients/me — the logged-in patient's own profile. Every page's
// sidebar shows the patient's name and links to a profile.html that
// wasn't included in the frontend files yet, but this is what it'll call.
async function getMyProfile(req, res) {
  const { rows } = await pool.query(
    `SELECT patient_id, full_name, email, phone, district, date_of_birth, registration_date
     FROM patients WHERE patient_id = $1`,
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Patient not found.' });
  res.json(rows[0]);
}

// GET /api/patients/triage/:submissionId/doctors
// Returns detected problem summary + doctors best matched to the triage specialty.
async function getRecommendedDoctors(req, res) {
  const patientId = req.user.id;
  const { submissionId } = req.params;

  const { rows } = await pool.query(
    `SELECT tr.assigned_specialty, tr.severity_score, tr.urgency_label,
            s.chief_complaint, s.pain_level, s.duration, s.body_location
     FROM symptom_submissions s
     JOIN triage_results tr ON tr.submission_id = s.submission_id
     WHERE s.submission_id = $1 AND s.patient_id = $2`,
    [submissionId, patientId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Triage submission not found.' });
  }

  const triage = rows[0];

  const { rows: doctors } = await pool.query(
    `SELECT d.doctor_id, d.doctor_code, d.full_name, d.specialty,
            COALESCE(
              (SELECT COUNT(*)::int FROM queue_entries q
               JOIN triage_results tr2 ON tr2.triage_id = q.triage_id
               WHERE q.assigned_doctor_id = d.doctor_id AND q.status != 'Completed'),
              0
            ) AS active_cases
     FROM doctors d
     WHERE d.specialty = $1 AND d.is_active = TRUE
     ORDER BY active_cases ASC, d.full_name ASC`,
    [triage.assigned_specialty]
  );

  const recommendedDoctors = doctors.map((d, index) => ({
    doctorId: d.doctor_id,
    doctorCode: d.doctor_code,
    fullName: d.full_name,
    specialty: d.specialty,
    activeCases: Number(d.active_cases),
    matchScore: Math.max(60, 100 - Number(d.active_cases) * 8 - index * 2),
    rank: index + 1,
  }));

  res.json({
    detectedProblem: {
      chiefComplaint: triage.chief_complaint,
      bodyLocation: triage.body_location,
      duration: triage.duration,
      painLevel: triage.pain_level,
      severityScore: triage.severity_score,
      urgencyLabel: triage.urgency_label,
      specialty: triage.assigned_specialty,
      summary: `Based on your symptoms, we detected a ${triage.urgency_label.toLowerCase()} case requiring ${triage.assigned_specialty}.`,
    },
    recommendedDoctors,
  });
}

module.exports = {
  submitSymptoms,
  getTriageResult,
  getMyStatus,
  getMyHistory,
  getMyProfile,
  getRecommendedDoctors,
};
