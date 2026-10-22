const jwt = require('jsonwebtoken');

let io = null;

function normalizeAgency(agencyCode) {
  return String(agencyCode || '')
    .trim()
    .toUpperCase();
}

function agencyRoom(agencyCode) {
  return `agency:${normalizeAgency(agencyCode)}`;
}

function authenticate(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token no provisto'));
  try {
    socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Token inválido o expirado'));
  }
}

function init(server, corsOrigin) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: corsOrigin || '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  io.use(authenticate);

  io.on('connection', (socket) => {
    const agency = normalizeAgency(socket.data.user?.agency_code);
    if (!agency) {
      socket.disconnect(true);
      return;
    }
    socket.join(agencyRoom(agency));
  });

  return io;
}

function emitToAgency(agencyCode, event, payload) {
  if (!io || !normalizeAgency(agencyCode)) return;
  io.to(agencyRoom(agencyCode)).emit(event, payload);
}

module.exports = { init, emitToAgency };
