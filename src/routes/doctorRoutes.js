const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getMyQueue, getCaseDetail, updateCaseStatus, getMyStats, getMyProfile, getCaseHistory,
} = require('../controllers/doctorController');

// Every route below requires a valid doctor JWT.
router.use(requireAuth, requireRole('doctor'));

// GET   /api/doctors/me                      — this doctor's own profile
router.get('/me', asyncHandler(getMyProfile));
// GET   /api/doctors/queue                   — this doctor's specialty-filtered priority queue
router.get('/queue', asyncHandler(getMyQueue));
// GET   /api/doctors/queue/:queueId          — full case detail + patient history
router.get('/queue/:queueId', asyncHandler(getCaseDetail));
// PATCH /api/doctors/queue/:queueId/status   — { status: 'Under Review'|'Consulting'|'Completed', diagnosis?, outcome?, notes? }
router.patch('/queue/:queueId/status', asyncHandler(updateCaseStatus));
// GET   /api/doctors/me/stats                — dashboard + priority-queue summary cards
router.get('/me/stats', asyncHandler(getMyStats));
// GET   /api/doctors/case-history            — completed cases (case-history.html), filters: ?outcome= ?date= ?search=
router.get('/case-history', asyncHandler(getCaseHistory));

module.exports = router;
