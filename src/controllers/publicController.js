const pool = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+8801|01)[3-9]\d{8}$/;

async function submitDoctorInterest(req, res) {
  const { fullName, email, phone, specialty, registrationNo, message } = req.body;

  if (!fullName || !email || !phone || !specialty) {
    return res.status(400).json({ error: 'fullName, email, phone and specialty are required.' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!PHONE_REGEX.test(phone)) {
    return res.status(400).json({ error: 'Please provide a valid Bangladeshi phone number.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO doctor_interest_requests (full_name, email, phone, specialty, registration_no, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING request_id, created_at`,
    [fullName, email, phone, specialty, registrationNo || null, message || null]
  );

  res.status(201).json({
    requestId: rows[0].request_id,
    message: 'Thank you! Our admin team will review your application and contact you within 2–3 business days.',
    submittedAt: rows[0].created_at,
  });
}

module.exports = { submitDoctorInterest };
