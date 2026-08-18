import { Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager.js';
import { SocketData } from '../types/socket.js';
import { logger } from '../utils/logger.js';

export function socketAuthMiddleware(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void
) {
  const auth = socket.handshake.auth || {};
  const query = socket.handshake.query || {};

  const roomCode = (auth.roomCode || query.roomCode) as string;
  const participantId = (auth.participantId || query.participantId) as string;
  const sessionToken = (auth.sessionToken || query.sessionToken) as string;

  if (!roomCode || !participantId || !sessionToken) {
    logger.warn({ socketId: socket.id }, '[SocketAuth] Missing credentials on socket connection');
    return next(new Error('AUTHENTICATION_REQUIRED: roomCode, participantId, and sessionToken are required'));
  }

  try {
    const { room, participant } = RoomManager.authenticate(
      roomCode,
      participantId,
      sessionToken
    );

    // Attach authoritative session data to socket
    socket.data.roomCode = room.code;
    socket.data.participantId = participant.id;
    socket.data.squadId = participant.squadId;
    socket.data.sessionToken = participant.sessionToken;
    socket.data.isHost = participant.isHost;

    logger.info(
      { socketId: socket.id, roomCode, participantId, isHost: participant.isHost },
      `[SocketAuth] Authenticated socket for ${participant.name}`
    );

    next();
  } catch (err: any) {
    logger.warn(
      { socketId: socket.id, roomCode, participantId, error: err.message },
      '[SocketAuth] Authentication failed'
    );
    next(new Error(`AUTHENTICATION_FAILED: ${err.message}`));
  }
}
