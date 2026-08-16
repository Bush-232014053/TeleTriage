// Core priority-queue logic (FR-17 .. FR-21, FR-27).
// Rule: order by severity_score ascending (1 = most critical, first),
// tie-break by submission timestamp ascending (earlier submission wins).
const pool = require('../config/db');

const MINUTES_PER_CASE = 10; // FR-21 default estimate

// Recomputes queue_position (in memory, for API responses) and estimated
// wait time for every ACTIVE (non-completed) entry, then returns the
// ordered list. We don't persist "position" as a column because it shifts
// constantly — it's derived fresh on every read, which is simpler and
// avoids race conditions for a project at this scale.
async function getOrderedQueue({ specialty = null } = {}) {
  const params = [];
  let specialtyFilter = '';
  if (specialty) {
    params.push(specialty);
    specialtyFilter = `AND tr.assigned_specialty = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
        q.queue_id, q.patient_id, q.submission_id, q.triage_id, q.status,
        q.duration_minutes, q.created_at,
        p.full_name AS patient_name,
        tr.severity_score, tr.urgency_label, tr.assigned_specialty,
        s.chief_complaint, s.pain_level, s.body_location, s.duration AS symptom_duration,
        pay.status AS payment_status, pay.amount AS payment_amount, pay.payment_method,
        doc.full_name AS assigned_doctor_name, doc.specialty AS assigned_doctor_specialty
     FROM queue_entries q
     JOIN triage_results tr        ON tr.triage_id = q.triage_id
     JOIN symptom_submissions s    ON s.submission_id = q.submission_id
     JOIN patients p               ON p.patient_id = q.patient_id
     LEFT JOIN payments pay        ON pay.submission_id = q.submission_id
     LEFT JOIN doctors doc         ON doc.doctor_id = q.assigned_doctor_id
     WHERE q.status NOT IN ('Completed', 'Cancelled')
     ${specialtyFilter}
     ORDER BY tr.severity_score ASC, q.created_at ASC`,
    params
  );

  return rows.map((row, index) => {
    const waitMins = rows
      .slice(0, index)
      .reduce((sum, r) => sum + (r.duration_minutes || MINUTES_PER_CASE), 0);

    return {
    queueId: row.queue_id,
    position: index + 1,
    patientId: row.patient_id,
    patientDisplayId: `P-${String(row.patient_id).padStart(4, '0')}`,
    submissionId: row.submission_id,
    triageId: row.triage_id,
    status: row.status,
    durationMinutes: row.duration_minutes || MINUTES_PER_CASE,
    severityScore: row.severity_score,
    urgencyLabel: row.urgency_label,
    specialty: row.assigned_specialty,
    chiefComplaint: row.chief_complaint,
    painLevel: row.pain_level,
    bodyLocation: row.body_location,
    paymentStatus: row.payment_status || 'Pending',
    paymentAmount: row.payment_amount ? Number(row.payment_amount) : null,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    estimatedWaitMins: waitMins,
    assignedDoctor: row.assigned_doctor_name
      ? { name: row.assigned_doctor_name, specialty: row.assigned_doctor_specialty }
      : null,
  };
  });
}

// Position + wait time for a single patient's active case (patient dashboard use).
async function getQueueInfoForPatient(patientId) {
  const fullQueue = await getOrderedQueue();
  return fullQueue.find((entry) => entry.patientId === patientId) || null;
}

module.exports = { getOrderedQueue, getQueueInfoForPatient, MINUTES_PER_CASE };
