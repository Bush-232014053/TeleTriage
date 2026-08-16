// Doctor-facing endpoints: specialty-filtered queue, case detail, status
// updates, filtering, and case completion/archiving.
// FR-22 .. FR-27, FR-33
const pool = require('../config/db');
const { getOrderedQueue } = require('../services/queueService');
const { broadcastQueueUpdate, notifyPatient } = require('../sockets/socketHandlers');

const VALID_STATUSES = ['Under Review', 'Consulting', 'Completed'];

// GET /api/doctors/queue  (FR-20, FR-22, FR-26)
// Returns only patients matching the logged-in doctor's own specialty.
// Optional query params: ?severity=1  and/or the doctor's specialty is
// always applied automatically from their JWT.
async function getMyQueue(req, res) {
  const { specialty } = req.user; // set at login time from the doctors table
  const { severity } = req.query;

  let queue = await getOrderedQueue({ specialty });

  if (severity) {
    queue = queue.filter((entry) => entry.severityScore === Number(severity));
  }

  res.json({ specialty, count: queue.length, queue });
}

// GET /api/doctors/queue/:queueId  (FR-23 — full triage summary + history)
async function getCaseDetail(req, res) {
  const { queueId } = req.params;
  const { specialty } = req.user;

  const { rows } = await pool.query(
    `SELECT q.queue_id, q.status, q.created_at, q.patient_id,
            s.chief_complaint, s.duration, s.pain_level, s.body_location, s.notes, s.submitted_at,
            tr.severity_score, tr.urgency_label, tr.assigned_specialty,
            pay.status AS payment_status
     FROM queue_entries q
     JOIN symptom_submissions s ON s.submission_id = q.submission_id
     JOIN triage_results tr     ON tr.triage_id = q.triage_id
     LEFT JOIN payments pay     ON pay.submission_id = q.submission_id
     WHERE q.queue_id = $1`,
    [queueId]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Case not found.' });
  const caseDetail = rows[0];

  // A doctor may only open cases in their own specialty.
  if (caseDetail.assigned_specialty !== specialty) {
    return res.status(403).json({ error: 'This case is not assigned to your specialty.' });
  }

  // FR-33: include the patient's past (archived) case history for context.
  const { rows: history } = await pool.query(
    `SELECT a.completed_at, tr.severity_score, tr.assigned_specialty, s.chief_complaint
     FROM case_archive a
     JOIN triage_results tr ON tr.triage_id = a.triage_id
     JOIN symptom_submissions s ON s.submission_id = a.submission_id
     WHERE a.patient_id = $1
     ORDER BY a.completed_at DESC
     LIMIT 10`,
    [caseDetail.patient_id]
  );

  res.json({
    queueId: caseDetail.queue_id,
    patientDisplayId: `P-${String(caseDetail.patient_id).padStart(4, '0')}`,
    status: caseDetail.status,
    severityScore: caseDetail.severity_score,
    urgencyLabel: caseDetail.urgency_label,
    specialty: caseDetail.assigned_specialty,
    chiefComplaint: caseDetail.chief_complaint,
    duration: caseDetail.duration,
    painLevel: caseDetail.pain_level,
    bodyLocation: caseDetail.body_location,
    notes: caseDetail.notes,
    submittedAt: caseDetail.submitted_at,
    paymentStatus: caseDetail.payment_status || 'Pending',
    pastCases: history,
  });
}

// PATCH /api/doctors/queue/:queueId/status
// Body: { status, notes?, diagnosis?, outcome? }  (FR-24, FR-25)
// diagnosis/outcome are only meaningful (and only stored) when status is
// "Completed" — they feed the doctor's case-history table.
async function updateCaseStatus(req, res) {
  const { queueId } = req.params;
  const { status, diagnosis, outcome } = req.body;
  const doctorId = req.user.id;
  const { specialty } = req.user;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const { rows } = await pool.query(
    `SELECT q.*, tr.assigned_specialty FROM queue_entries q
     JOIN triage_results tr ON tr.triage_id = q.triage_id
     WHERE q.queue_id = $1`,
    [queueId]
  );
  const entry = rows[0];
  if (!entry) return res.status(404).json({ error: 'Case not found.' });
  if (entry.assigned_specialty !== specialty) {
    return res.status(403).json({ error: 'This case is not assigned to your specialty.' });
  }

  if (status === 'Completed') {
    // FR-25: move it out of the active queue and into the archive table.
    await pool.query(
      `INSERT INTO case_archive (patient_id, submission_id, triage_id, completed_by, notes, diagnosis, outcome)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.patient_id, entry.submission_id, entry.triage_id, doctorId,
        req.body.notes || null, diagnosis || null, outcome || 'Completed',
      ]
    );
    await pool.query(
      `UPDATE queue_entries SET status = 'Completed', assigned_doctor_id = $1, updated_at = NOW() WHERE queue_id = $2`,
      [doctorId, queueId]
    );
  } else {
    // Record which doctor is actually handling this case as soon as they
    // touch it — the patient dashboard's "Assigned Medical Specialist"
    // card reads this.
    await pool.query(
      `UPDATE queue_entries SET status = $1, assigned_doctor_id = $2, updated_at = NOW() WHERE queue_id = $3`,
      [status, doctorId, queueId]
    );
  }

  await broadcastQueueUpdate(specialty);
  notifyPatient(entry.patient_id, 'status-updated', { queueId: Number(queueId), status });

  res.json({ queueId: Number(queueId), status, message: `Case status updated to "${status}".` });
}

// GET /api/doctors/me/stats — summary numbers for the dashboard cards.
// Broken out to match priority-queue.html's four cards (Critical / Urgent /
// Moderate-or-Low / Total Active) plus the doctor-dashboard.html cards
// (Live Urgent Queue / Currently Consulting / Completed Today).
async function getMyStats(req, res) {
  const { specialty } = req.user;

  const { rows } = await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE tr.severity_score = 1 AND q.status NOT IN ('Completed', 'Cancelled'))                    AS critical_count,
        COUNT(*) FILTER (WHERE tr.severity_score = 2 AND q.status NOT IN ('Completed', 'Cancelled'))                    AS urgent_count,
        COUNT(*) FILTER (WHERE tr.severity_score >= 3 AND q.status NOT IN ('Completed', 'Cancelled'))                   AS moderate_or_low_count,
        COUNT(*) FILTER (WHERE q.status = 'Consulting')                                               AS consulting_count,
        COUNT(*) FILTER (WHERE q.status NOT IN ('Completed', 'Cancelled'))                                              AS active_count
     FROM queue_entries q
     JOIN triage_results tr ON tr.triage_id = q.triage_id
     WHERE tr.assigned_specialty = $1`,
    [specialty]
  );

  const { rows: completedToday } = await pool.query(
    `SELECT COUNT(*) AS completed_today
     FROM case_archive a
     JOIN triage_results tr ON tr.triage_id = a.triage_id
     WHERE tr.assigned_specialty = $1 AND a.completed_at::date = CURRENT_DATE`,
    [specialty]
  );

  const s = rows[0];
  res.json({
    criticalCount: Number(s.critical_count),
    urgentCount: Number(s.urgent_count),
    moderateOrLowCount: Number(s.moderate_or_low_count),
    consultingCount: Number(s.consulting_count),
    activeCount: Number(s.active_count),
    completedToday: Number(completedToday[0].completed_today),
  });
}

// GET /api/doctors/me — the logged-in doctor's own profile (sidebar shows
// "Dr. XXXXXX" / specialty on every doctor page — this fills that in).
async function getMyProfile(req, res) {
  const { rows } = await pool.query(
    `SELECT doctor_id, doctor_code, full_name, specialty FROM doctors WHERE doctor_id = $1`,
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Doctor not found.' });
  res.json(rows[0]);
}

// GET /api/doctors/case-history — powers case-history.html.
// Specialty-scoped like the live queue; optional filters mirror that
// page's filter bar: ?outcome=, ?date=YYYY-MM-DD, ?search= (patient
// display ID or diagnosis text).
async function getCaseHistory(req, res) {
  const { specialty } = req.user;
  const { outcome, date, search } = req.query;

  // Build the WHERE clause one condition at a time. Each condition adds
  // its value to params and references its own position ($1, $2, ...) —
  // always push the value first, then read params.length for its index.
  const params = [specialty];
  let where = 'tr.assigned_specialty = $1';

  if (outcome && outcome !== 'all') {
    params.push(outcome);
    where += ` AND a.outcome = $${params.length}`;
  }
  if (date) {
    params.push(date);
    where += ` AND a.completed_at::date = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    const searchTextParamIndex = params.length;

    const searchDigitsOnly = search.replace(/\D/g, '') || '-1'; // '-1' never matches a real patient_id
    params.push(searchDigitsOnly);
    const searchIdParamIndex = params.length;

    where += ` AND (a.diagnosis ILIKE $${searchTextParamIndex} OR CAST(a.patient_id AS TEXT) = $${searchIdParamIndex})`;
  }

  const { rows } = await pool.query(
    `SELECT a.archive_id, a.completed_at, a.diagnosis, a.outcome, a.notes,
            tr.severity_score, tr.urgency_label, a.patient_id, s.chief_complaint
     FROM case_archive a
     JOIN triage_results tr ON tr.triage_id = a.triage_id
     JOIN symptom_submissions s ON s.submission_id = a.submission_id
     WHERE ${where}
     ORDER BY a.completed_at DESC
     LIMIT 200`,
    params
  );

  const cases = rows.map((r) => ({
    archiveId: r.archive_id,
    completedAt: r.completed_at,
    patientDisplayId: `P-${String(r.patient_id).padStart(4, '0')}`,
    severityScore: r.severity_score,
    urgencyLabel: r.urgency_label,
    chiefComplaint: r.chief_complaint,
    diagnosis: r.diagnosis,
    outcome: r.outcome,
    notes: r.notes,
  }));

  // Small summary block for the page's own summary cards.
  const { rows: summary } = await pool.query(
    `SELECT
        COUNT(*)                                             AS completed_cases,
        COUNT(*) FILTER (WHERE a.outcome = 'Follow-up Required') AS followups_pending,
        COUNT(*) FILTER (WHERE a.outcome = 'Referred to Specialist') AS referrals
     FROM case_archive a
     JOIN triage_results tr ON tr.triage_id = a.triage_id
     WHERE tr.assigned_specialty = $1`,
    [specialty]
  );

  res.json({
    specialty,
    count: cases.length,
    summary: {
      completedCases: Number(summary[0].completed_cases),
      followupsPending: Number(summary[0].followups_pending),
      referrals: Number(summary[0].referrals),
    },
    cases,
  });
}

module.exports = { getMyQueue, getCaseDetail, updateCaseStatus, getMyStats, getMyProfile, getCaseHistory };
