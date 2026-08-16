/* Socket.IO helper — live queue updates for doctor-facing pages. */
const TeleTriageSocket = (() => {
  let socket = null;
  let joinedSpecialty = null;
  let queueHandler = null;

  function connect() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO client not loaded');
      return null;
    }
    if (!socket) {
      socket = io(TeleTriageAPI.BASE, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socket.on('connect', () => {
        if (joinedSpecialty) socket.emit('join-doctor-queue', joinedSpecialty);
      });
    }
    return socket;
  }

  function joinDoctorQueue(specialty, onQueueUpdated) {
    if (!specialty || typeof onQueueUpdated !== 'function') return null;

    const s = connect();
    if (!s) return null;

    joinedSpecialty = specialty;
    s.emit('join-doctor-queue', specialty);

    if (queueHandler) s.off('queue-updated', queueHandler);
    queueHandler = onQueueUpdated;
    s.on('queue-updated', queueHandler);

    return s;
  }

  return { connect, joinDoctorQueue };
})();
