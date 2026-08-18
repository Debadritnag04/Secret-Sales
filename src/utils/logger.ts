import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL || 'info',
  redact: {
    paths: ['hostToken', 'sessionToken', 'password', 'secret', '*.hostToken', '*.sessionToken'],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss Z',
          },
        }
      : undefined,
});

/**
 * Helper to log bid submissions without leaking amounts in standard logs
 */
export const logBidSubmitted = (roomId: string, participantId: string, squadName: string) => {
  logger.info(
    { roomId, participantId, squadName },
    `[Auction] Sealed bid submitted for participant ${participantId} (${squadName})`
  );
};
