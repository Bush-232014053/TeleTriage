const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const {
  registerPatient, loginPatient, loginDoctor, loginAdmin, logout,
} = require('../controllers/authController');

// POST /api/auth/register            — patient self-registration
router.post('/register', asyncHandler(registerPatient));
// POST /api/auth/login/patient       — { phone, password }
router.post('/login/patient', asyncHandler(loginPatient));
// POST /api/auth/login/doctor        — { doctorCode, password }
router.post('/login/doctor', asyncHandler(loginDoctor));
// POST /api/auth/login/admin         — { username, password }
router.post('/login/admin', asyncHandler(loginAdmin));
// POST /api/auth/logout
router.post('/logout', asyncHandler(logout));

module.exports = router;
