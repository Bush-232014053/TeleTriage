// Admin endpoints: user management (FR-34) + doctor pre-registration
// (doctors do not self-register — the admin creates their accounts).
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const SALT_ROUNDS = 10;
const DEMO_PASSWORD_FALLBACK = 'Password1!';

// GET /api/admin/patients  (FR-34)
async function listPatients(req, res) {
  const { rows } = await pool.query(
    `SELECT patient_id, full_name, phone, district, registration_date, is_active
     FROM patients ORDER BY registration_date DESC`
  );
  res.json(rows);
}

// GET /api/admin/doctors
async function listDoctors(req, res) {
  const { rows } = await pool.query(
    `SELECT doctor_id, doctor_code, full_name, specialty, qualification, years_experience, is_active, created_at
     FROM doctors ORDER BY created_at DESC`
  );
  res.json(rows);
}

// POST /api/admin/doctors  — admin pre-registers a doctor account.
async function createDoctor(req, res) {
  const { doctorCode, fullName, specialty, password } = req.body;
  if (!doctorCode || !fullName || !specialty || !password) {
    return res.status(400).json({ error: 'doctorCode, fullName, specialty and password are required.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO doctors (doctor_code, full_name, specialty, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING doctor_id, doctor_code, full_name, specialty`,
    [doctorCode, fullName, specialty, passwordHash]
  );

  res.status(201).json(rows[0]);
}

// PATCH /api/admin/patients/:id/deactivate  (FR-34)
async function deactivatePatient(req, res) {
  const { id } = req.params;
  await pool.query('UPDATE patients SET is_active = FALSE WHERE patient_id = $1', [id]);
  res.json({ message: `Patient ${id} deactivated.` });
}

// PATCH /api/admin/doctors/:id/deactivate  (FR-34)
async function deactivateDoctor(req, res) {
  const { id } = req.params;
  await pool.query('UPDATE doctors SET is_active = FALSE WHERE doctor_id = $1', [id]);
  res.json({ message: `Doctor ${id} deactivated.` });
}

// GET /api/admin/doctor-interest?status=pending
async function listDoctorInterest(req, res) {
  const status = req.query.status || 'pending';
  const { rows } = await pool.query(
    `SELECT request_id, full_name, email, phone, specialty, registration_no, message, status, created_at
     FROM doctor_interest_requests
     WHERE status = $1
     ORDER BY created_at DESC`,
    [status]
  );
  res.json(rows);
}

// POST /api/admin/doctor-interest/:id/approve — create doctor account from application
async function approveDoctorInterest(req, res) {
  const { id } = req.params;
  const { doctorCode, password } = req.body;

  const { rows: requests } = await pool.query(
    `SELECT * FROM doctor_interest_requests WHERE request_id = $1 AND status = 'pending'`,
    [id]
  );
  const request = requests[0];
  if (!request) {
    return res.status(404).json({ error: 'Pending application not found.' });
  }

  const code = doctorCode || `DOC-${String(Date.now()).slice(-6)}`;
  const plainPassword = password || DEMO_PASSWORD_FALLBACK;
  const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

  const { rows: doctors } = await pool.query(
    `INSERT INTO doctors (doctor_code, full_name, specialty, qualification, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING doctor_id, doctor_code, full_name, specialty`,
    [code, request.full_name, request.specialty, request.registration_no ? `BMDC: ${request.registration_no}` : 'Verified by Admin', passwordHash]
  );

  await pool.query(
    `UPDATE doctor_interest_requests SET status = 'approved' WHERE request_id = $1`,
    [id]
  );

  res.status(201).json({
    doctor: doctors[0],
    temporaryPassword: plainPassword,
    message: `Doctor approved. They can log in with ID ${code}.`,
  });
}

// PATCH /api/admin/doctor-interest/:id/reject
async function rejectDoctorInterest(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `UPDATE doctor_interest_requests SET status = 'rejected' WHERE request_id = $1 AND status = 'pending' RETURNING request_id`,
    [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Pending application not found.' });
  }
  res.json({ message: 'Application rejected.' });
}

module.exports = {
  listPatients,
  listDoctors,
  createDoctor,
  deactivatePatient,
  deactivateDoctor,
  listDoctorInterest,
  approveDoctorInterest,
  rejectDoctorInterest,
};
