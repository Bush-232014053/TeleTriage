const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listPatients, listDoctors, createDoctor, deactivatePatient, deactivateDoctor,
} = require('../controllers/adminController');

// Every route below requires a valid admin JWT.
router.use(requireAuth, requireRole('admin'));

router.get('/patients', asyncHandler(listPatients));
router.get('/doctors', asyncHandler(listDoctors));
router.post('/doctors', asyncHandler(createDoctor));
router.patch('/patients/:id/deactivate', asyncHandler(deactivatePatient));
router.patch('/doctors/:id/deactivate', asyncHandler(deactivateDoctor));

module.exports = router;
