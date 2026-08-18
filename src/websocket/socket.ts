import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket.js';
import { socketAuthMiddleware } from './middleware.js';
import { registerSocketEvents } from './events.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function initializeWebSocketServer(httpServer: HttpServer): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  any,
  SocketData
> {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, any, SocketData>(
    httpServer,
    {
      cors: {
        origin: env.FRONTEND_URL === '*' ? '*' : [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 20000,
      pingInterval: 10000,
      maxHttpBufferSize: 1e6, // 1MB payload limit
    }
  );

  // Authentication Middleware
  io.use(socketAuthMiddleware);

  // Connection Handler
  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, roomCode: socket.data.roomCode }, '[Socket] Client connected');
    registerSocketEvents(io, socket);
  });

  logger.info('[WebSocket] Socket.IO server initialized successfully');
  return io;
}
