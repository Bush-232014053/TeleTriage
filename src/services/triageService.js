// Talks to the Python triage microservice over HTTP.
// The Node backend NEVER trusts a severity score computed in the browser —
// this is the single authoritative place a triage score is produced.
const axios = require('axios');
require('dotenv').config();

const TRIAGE_SERVICE_URL = process.env.TRIAGE_SERVICE_URL || 'http://localhost:6000';

async function getTriageScore({ complaint, duration, pain, bodyLocation }) {
  try {
    const response = await axios.post(`${TRIAGE_SERVICE_URL}/score`, {
      complaint,
      duration,
      pain,
      body_location: bodyLocation,
    }, { timeout: 5000 }); // FR-16: triage must resolve within 5 seconds

    // Expected shape from the Python service:
    // { severity_score: 1-5, urgency_label: "Urgent"|"Moderate"|"Non-Urgent", specialty: "Cardiology" }
    return response.data;
  } catch (err) {
    const error = new Error('Triage engine is unavailable. Please try again shortly.');
    error.statusCode = 502;
    throw error;
  }
}

module.exports = { getTriageScore };
