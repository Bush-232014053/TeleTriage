// Socket.IO setup — broadcasts live queue updates to connected dashboards.
// FR-19 / FR-27 / FR-29: queue changes must push to clients in real time,
// not require a page reload.
const { getOrderedQueue } = require('../services/queueService');

let ioInstance = null;

function initSockets(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Doctors join a room per specialty so they only receive updates
    // relevant to their own queue (e.g. "queue:Cardiology").
    socket.on('join-doctor-queue', (specialty) => {
      socket.join(`queue:${specialty}`);
    });

    // Patients join a room keyed by their own patient ID for personal
    // status updates (e.g. "patient:42").
    socket.on('join-patient-room', (patientId) => {
      socket.join(`patient:${patientId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

// Call this after any change to the queue (new entry, status update,
// completion) so every connected dashboard re-syncs.
async function broadcastQueueUpdate(specialty = null) {
  if (!ioInstance) return;
  const queue = await getOrderedQueue({ specialty });

  if (specialty) {
    ioInstance.to(`queue:${specialty}`).emit('queue-updated', queue);
  } else {
    // Broadcast to everyone if we don't know which specialty changed
    // (e.g. a brand-new submission before triage assigns a specialty room).
    ioInstance.emit('queue-updated', queue);
  }
}

function notifyPatient(patientId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`patient:${patientId}`).emit(event, payload);
}

module.exports = { initSockets, broadcastQueueUpdate, notifyPatient };
