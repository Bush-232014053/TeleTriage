// Admin endpoints: user management (FR-34) + doctor pre-registration
// (doctors do not self-register — the admin creates their accounts).
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

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
    `SELECT doctor_id, doctor_code, full_name, specialty, is_active, created_at
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

module.exports = { listPatients, listDoctors, createDoctor, deactivatePatient, deactivateDoctor };
