import { FastifyPluginAsync } from 'fastify';
import { createRoomSchema, joinRoomSchema, roomCodeParamSchema } from '../../validation/roomSchemas.js';
import { defaultRoomService } from '../../services/RoomService.js';
import { AppError } from '../../utils/errors.js';

export const roomRoutes: FastifyPluginAsync = async (fastify) => {
  // Create Room
  fastify.post('/api/rooms', async (request, reply) => {
    const parseResult = createRoomSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid room creation parameters',
        errors: parseResult.error.flatten(),
      });
    }

    try {
      const result = await defaultRoomService.createRoom(parseResult.data);
      return reply.status(201).send(result);
    } catch (err: any) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message });
      }
      request.log.error({ err }, 'Error creating room');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to create room' });
    }
  });

  // Join Room
  fastify.post('/api/rooms/:roomCode/join', async (request, reply) => {
    const paramsResult = roomCodeParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid room code parameter',
      });
    }

    const bodyResult = joinRoomSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid join parameters',
        errors: bodyResult.error.flatten(),
      });
    }

    try {
      const result = await defaultRoomService.joinRoom(
        paramsResult.data.roomCode,
        bodyResult.data
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message });
      }
      request.log.error({ err }, 'Error joining room');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to join room' });
    }
  });

  // Get Room State
  fastify.get('/api/rooms/:roomCode', async (request, reply) => {
    const paramsResult = roomCodeParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid room code parameter',
      });
    }

    const participantId = (request.headers['x-participant-id'] as string) || (request.query as any)?.participantId;

    try {
      const state = defaultRoomService.getRoomState(
        paramsResult.data.roomCode,
        participantId
      );
      return reply.status(200).send(state);
    } catch (err: any) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message });
      }
      request.log.error({ err }, 'Error fetching room state');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to fetch room state' });
    }
  });
};
