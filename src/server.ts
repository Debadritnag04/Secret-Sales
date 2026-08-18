import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { initializeWebSocketServer } from './websocket/socket.js';
import { healthRoutes } from './api/routes/health.js';
import { roomRoutes } from './api/routes/rooms.js';
import { playerRoutes } from './api/routes/players.js';
import { teamRoutes } from './api/routes/teams.js';
import { resultRoutes } from './api/routes/results.js';

export async function buildApp(): Promise<{ app: FastifyInstance; io: any }> {
  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
  });

  // Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // For easier dev and API consumption
  });

  // CORS Configuration
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost and configured FRONTEND_URL
      if (!origin || origin.includes('localhost') || origin === env.FRONTEND_URL) {
        cb(null, true);
        return;
      }
      cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });

  // Register REST API Routes
  await app.register(healthRoutes);
  await app.register(roomRoutes);
  await app.register(playerRoutes);
  await app.register(teamRoutes);
  await app.register(resultRoutes);

  // Initialize Socket.IO on Fastify's raw HTTP server
  const io = initializeWebSocketServer(app.server);

  return { app, io };
}

export async function startServer() {
  try {
    const { app } = await buildApp();

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`🚀 Sealed-Bid Football Auction Server running on port ${env.PORT}`);
    logger.info(`🌐 Environment: ${env.NODE_ENV}`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Start if executed directly
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  startServer();
}
