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

  console.log('Seeding demo doctors (multiple per specialty for patient choice)...');
  // [doctorCode, fullName, specialty, qualification, yearsExperience]
  const doctors = [
    ['DOC-001', 'Dr. Farhana Rahman', 'Cardiology', 'MBBS, FCPS (Cardiology)', 12],
    ['DOC-007', 'Dr. Arif Mahmud', 'Cardiology', 'MBBS, MD (Cardiology)', 8],
    ['DOC-008', 'Dr. Sabrina Khan', 'Cardiology', 'MBBS, D.Card', 15],
    ['DOC-002', 'Dr. Imran Chowdhury', 'Neurology', 'MBBS, FCPS (Neurology)', 10],
    ['DOC-009', 'Dr. Rahima Begum', 'Neurology', 'MBBS, MD (Neurology)', 7],
    ['DOC-003', 'Dr. Nusrat Jahan', 'Emergency Medicine', 'MBBS, FCPS (Emergency)', 11],
    ['DOC-012', 'Dr. Karim Uddin', 'Emergency Medicine', 'MBBS, MD (Emergency Med)', 6],
    ['DOC-004', 'Dr. Kamal Hossain', 'General Medicine', 'MBBS, FCPS', 20],
    ['DOC-010', 'Dr. Nasreen Sultana', 'General Medicine', 'MBBS, MD', 14],
    ['DOC-011', 'Dr. Abdullah Al Mamun', 'General Medicine', 'MBBS, D.Medicine', 9],
    ['DOC-005', 'Dr. Shirin Akter', 'Rheumatology', 'MBBS, FCPS (Rheumatology)', 13],
    ['DOC-013', 'Dr. Faisal Haque', 'Rheumatology', 'MBBS, MD (Rheumatology)', 8],
    ['DOC-006', 'Dr. Tanvir Ahmed', 'Dermatology', 'MBBS, DDV', 10],
    ['DOC-014', 'Dr. Meherun Nessa', 'Dermatology', 'MBBS, MD (Dermatology)', 7],
  ];

  for (const [doctorCode, fullName, specialty, qualification, yearsExperience] of doctors) {
    await pool.query(
      `INSERT INTO doctors (doctor_code, full_name, specialty, qualification, years_experience, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (doctor_code) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         specialty = EXCLUDED.specialty,
         qualification = EXCLUDED.qualification,
         years_experience = EXCLUDED.years_experience,
         is_active = TRUE`,
      [doctorCode, fullName, specialty, qualification, yearsExperience, passwordHash]
    );
  }

  console.log('Seed complete.');
  if (closePool) await pool.end();
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log(`  Admin login    -> username: admin           password: ${DEMO_PASSWORD}`);
      console.log(`  Doctor logins  -> doctorCode: DOC-001..014   password: ${DEMO_PASSWORD}`);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };
