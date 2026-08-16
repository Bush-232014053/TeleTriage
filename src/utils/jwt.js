// Small wrapper around jsonwebtoken so every controller signs/verifies tokens the same way.
const jwt = require('jsonwebtoken');
require('dotenv').config();

function signToken(payload) {
  // payload should always include: id, role ('patient' | 'doctor' | 'admin')
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
