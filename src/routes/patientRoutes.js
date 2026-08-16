const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  submitSymptoms,
  getTriageResult,
  getMyStatus,
  getMyHistory,
  getMyProfile,
  getRecommendedDoctors,
  cancelConsultation,
} = require('../controllers/patientController');

// Every route below requires a valid patient JWT.
router.use(requireAuth, requireRole('patient'));

// GET  /api/patients/me                        — this patient's own profile
router.get('/me', asyncHandler(getMyProfile));
// POST /api/patients/symptoms                 — submit symptom form, get triage back
router.post('/symptoms', asyncHandler(submitSymptoms));
// GET  /api/patients/triage/:submissionId      — re-fetch a triage result
router.get('/triage/:submissionId', asyncHandler(getTriageResult));
// GET  /api/patients/triage/:submissionId/doctors — matched doctors for consultation
router.get('/triage/:submissionId/doctors', asyncHandler(getRecommendedDoctors));
// GET  /api/patients/me/status                 — current queue position/status
router.get('/me/status', asyncHandler(getMyStatus));
// GET  /api/patients/me/history                — this patient's past completed cases
router.get('/me/history', asyncHandler(getMyHistory));
// POST /api/patients/me/cancel-consultation    — cancel + refund while Queued
router.post('/me/cancel-consultation', asyncHandler(cancelConsultation));

module.exports = router;
