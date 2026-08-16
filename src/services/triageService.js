// Talks to the Python triage microservice over HTTP.
// Falls back to the local rule engine if the service is cold-starting or down.
const axios = require('axios');
require('dotenv').config();
const { scoreSymptoms } = require('./triageRules');

const TRIAGE_SERVICE_URL = process.env.TRIAGE_SERVICE_URL || 'http://localhost:6000';
const REQUEST_TIMEOUT_MS = Number(process.env.TRIAGE_TIMEOUT_MS || 30000);
const MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callTriageEngine(payload) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await axios.post(`${TRIAGE_SERVICE_URL}/score`, payload, {
        timeout: REQUEST_TIMEOUT_MS,
      });
      return response.data;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(2000 * attempt);
      }
    }
  }

  throw lastError;
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
