// Talks to the Python triage microservice over HTTP.
// Falls back to the local rule engine if the service is cold-starting or down.
const axios = require('axios');
require('dotenv').config();
const { scoreSymptoms } = require('./triageRules');

const TRIAGE_SERVICE_URL = process.env.TRIAGE_SERVICE_URL || 'http://localhost:6000';
// Fail fast — patients should not wait on a sleeping microservice.
const REQUEST_TIMEOUT_MS = Number(process.env.TRIAGE_TIMEOUT_MS || 4000);

async function callTriageEngine(payload) {
  const response = await axios.post(`${TRIAGE_SERVICE_URL}/score`, payload, {
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

async function getTriageScore({ complaint, duration, pain, bodyLocation }) {
  const payload = {
    complaint,
    duration,
    pain,
    body_location: bodyLocation,
  };

  try {
    return await callTriageEngine(payload);
  } catch (err) {
    console.warn(
      'Triage microservice unavailable; using local fallback scorer.',
      err.code || err.message
    );
    return scoreSymptoms({ complaint, duration, pain });
  }
}

module.exports = { getTriageScore };
