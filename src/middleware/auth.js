// Authentication + role-based access control middleware.
// FR-04: patients cannot access doctor endpoints and vice versa.
const { verifyToken } = require('../utils/jwt');

// Verifies the JWT sent in the Authorization header ("Bearer <token>").
// On success it attaches the decoded payload to req.user.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  try {
    req.user = verifyToken(token); // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Returns a middleware that only allows the given role(s) through.
// Usage: requireRole('doctor') or requireRole('patient', 'admin')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
