const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { submitDoctorInterest } = require('../controllers/publicController');

router.post('/doctor-interest', asyncHandler(submitDoctorInterest));

module.exports = router;
