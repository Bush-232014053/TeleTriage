// Central error handler — keeps error responses consistent across the API.
function errorHandler(err, req, res, next) {
  console.error(err);

  // Postgres unique-violation (e.g. duplicate phone/payment) -> 409 Conflict
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }

  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error.' });
}

module.exports = errorHandler;
