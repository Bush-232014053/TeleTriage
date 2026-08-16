// Handles registration + login for patients, doctors, and admins.
// FR-01 .. FR-06
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;
const PHONE_REGEX = /^(\+8801|01)[3-9]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register  (patient self-registration — FR-01, extended with email)
// The newer register.html collects fullName/email/phone/password (no
// dateOfBirth or district field), while the SRS's FR-01 asks for
// dateOfBirth and district too — both are accepted but optional, so this
// works with either version of the form.
async function registerPatient(req, res) {
  const { fullName, email, phone, password, dateOfBirth, district } = req.body;

  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ error: 'fullName, email, phone and password are required.' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!PHONE_REGEX.test(phone)) {
    return res.status(400).json({ error: 'Please provide a valid Bangladeshi phone number.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await pool.query(
    `INSERT INTO patients (full_name, email, phone, date_of_birth, district, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING patient_id, full_name, email, phone, district, registration_date`,
    [fullName, email, phone, dateOfBirth || null, district || null, passwordHash]
  );

  const patient = rows[0];
  const token = signToken({ id: patient.patient_id, role: 'patient' });

  res.status(201).json({ token, user: { ...patient, role: 'patient' } });
}

// POST /api/auth/login/patient  (FR-02, extended)
// The new patient-login.html only has an email field, but the SRS's FR-02
// specifically calls for phone-based login — so this accepts EITHER
// { email, password } or { phone, password }, whichever the caller sends.
async function loginPatient(req, res) {
  const { email, phone, password } = req.body;
  const identifier = email || phone;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'email (or phone) and password are required.' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM patients WHERE (email = $1 OR phone = $1) AND is_active = TRUE',
    [identifier]
  );
  const patient = rows[0];
  if (!patient || !(await bcrypt.compare(password, patient.password_hash))) {
    return res.status(401).json({ error: 'Invalid email/phone or password.' });
  }

  const token = signToken({ id: patient.patient_id, role: 'patient' });
  res.json({
    token,
    user: {
      patient_id: patient.patient_id,
      full_name: patient.full_name,
      email: patient.email,
      phone: patient.phone,
      role: 'patient',
    },
  });
}

// POST /api/auth/login/doctor  (FR-03, doctors are pre-registered by admin)
// doctor-login.html's field is id="doctorId" ("Doctor ID/Registration
// No."), so this accepts either key name — doctorCode or doctorId — for
// the same value.
async function loginDoctor(req, res) {
  const doctorCode = req.body.doctorCode || req.body.doctorId;
  const { password } = req.body;
  if (!doctorCode || !password) {
    return res.status(400).json({ error: 'doctorCode (or doctorId) and password are required.' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM doctors WHERE doctor_code = $1 AND is_active = TRUE',
    [doctorCode]
  );
  const doctor = rows[0];
  if (!doctor || !(await bcrypt.compare(password, doctor.password_hash))) {
    return res.status(401).json({ error: 'Invalid doctor ID or password.' });
  }

  const token = signToken({ id: doctor.doctor_id, role: 'doctor', specialty: doctor.specialty });
  res.json({
    token,
    user: {
      doctor_id: doctor.doctor_id,
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      role: 'doctor',
    },
  });
}

// POST /api/auth/login/admin
async function loginAdmin(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required.' });
  }

  const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = signToken({ id: admin.admin_id, role: 'admin' });
  res.json({ token, user: { admin_id: admin.admin_id, full_name: admin.full_name, role: 'admin' } });
}

// POST /api/auth/logout (FR-06)
// JWTs are stateless, so "logout" is really just the client discarding the
// token. This endpoint exists for API-contract completeness and so a
// server-side denylist can be added later without changing the frontend.
async function logout(req, res) {
  res.json({ message: 'Logged out. Please discard your token on the client.' });
}

module.exports = { registerPatient, loginPatient, loginDoctor, loginAdmin, logout };
