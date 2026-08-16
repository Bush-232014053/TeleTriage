// Database seed — creates schema, admin, and demo doctors.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const DEMO_PASSWORD = 'Password1!';

async function runSeed({ closePool = true } = {}) {
  console.log('Applying schema...');
  const schemaSql = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  await pool.query(schemaSql);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('Seeding admin account...');
  await pool.query(
    `INSERT INTO admins (username, full_name, password_hash)
     VALUES ('admin', 'System Administrator', $1)
     ON CONFLICT (username) DO NOTHING`,
    [passwordHash]
  );

  console.log('Seeding demo doctors (one per specialty)...');
  const doctors = [
    ['DOC-001', 'Dr. Farhana Rahman', 'Cardiology'],
    ['DOC-002', 'Dr. Imran Chowdhury', 'Neurology'],
    ['DOC-003', 'Dr. Nusrat Jahan', 'Emergency Medicine'],
    ['DOC-004', 'Dr. Kamal Hossain', 'General Medicine'],
    ['DOC-005', 'Dr. Shirin Akter', 'Rheumatology'],
    ['DOC-006', 'Dr. Tanvir Ahmed', 'Dermatology'],
  ];

  for (const [doctorCode, fullName, specialty] of doctors) {
    await pool.query(
      `INSERT INTO doctors (doctor_code, full_name, specialty, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (doctor_code) DO NOTHING`,
      [doctorCode, fullName, specialty, passwordHash]
    );
  }

  console.log('Seed complete.');
  if (closePool) await pool.end();
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log(`  Admin login    -> username: admin           password: ${DEMO_PASSWORD}`);
      console.log(`  Doctor logins  -> doctorCode: DOC-001..006   password: ${DEMO_PASSWORD}`);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };
