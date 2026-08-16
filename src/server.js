// TeleTriage backend — entry point.
// Wires together Express (REST API) + Socket.IO (live queue updates) on
// one HTTP server, per the project's tech stack.
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

// Middleware & Socket handlers
const errorHandler = require('./middleware/errorHandler');

// Sockets directory support (services context match)
let initSockets;
try {
  initSockets = require('./services/socketHandlers').initSockets;
} catch (e) {
  initSockets = require('./sockets/socketHandlers').initSockets;
}

// Routes Definition
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const publicRoutes = require('./routes/publicRoutes');
let adminRoutes;
try {
  adminRoutes = require('./routes/adminRoutes');
} catch (e) {
  adminRoutes = require('./routes/adminRoutes_2');
}

const app = express();
const server = http.createServer(app);

// Socket.IO — same-origin as the REST API, CORS restricted to the frontend.
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_ORIGIN || '*', methods: ['GET', 'POST'] },
});
initSockets(io);

// ---- Core middleware -------------------------------------------------
app.use(helmet({ contentSecurityPolicy: false })); // Allowed for embedded frontend
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (Connects the frontend folder automatically)
app.use(express.static(path.join(__dirname, '../frontend')));

// Basic rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// ---- API Routes -------------------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// 404 for unmatched API routes
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Fallback to send index.html for direct frontend page routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Central error handler — must be registered last.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`TeleTriage backend listening on http://${HOST}:${PORT}`);
});

module.exports = { app, server, io };
