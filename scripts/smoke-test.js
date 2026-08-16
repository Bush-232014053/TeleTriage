/**
 * Smoke tests for TeleTriage API (run when server + DB + triage engine are up).
 * Usage: node scripts/smoke-test.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:5000';
const TRIAGE = process.argv[3] || process.env.TRIAGE_SERVICE_URL || 'http://localhost:6000';

async function check(name, url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`${name} failed (${res.status}): ${JSON.stringify(body)}`);
  console.log(`✓ ${name}`);
  return body;
}

async function main() {
  console.log(`Testing TeleTriage at ${BASE}\n`);

  await check('Backend health', `${BASE}/health`);
  await check('Triage health', `${TRIAGE}/health`);
  await check('Payment gateways', `${BASE}/api/payments/gateways`);

  const reg = await check('Patient register', `${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test Patient',
      email: `test${Date.now()}@example.com`,
      phone: '01712345678',
      password: 'Password1!',
    }),
  });

  const token = reg.token;
  await check('Patient profile', `${BASE}/api/patients/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const doc = await check('Doctor login', `${BASE}/api/auth/login/doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId: 'DOC-001', password: 'Password1!' }),
  });

  await check('Doctor queue', `${BASE}/api/doctors/queue`, {
    headers: { Authorization: `Bearer ${doc.token}` },
  });

  console.log('\nAll smoke tests passed.');
}

main().catch((err) => {
  console.error('\n✗', err.message);
  process.exit(1);
});
