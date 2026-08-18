import { FastifyPluginAsync } from 'fastify';
import { roomCodeParamSchema } from '../../validation/roomSchemas.js';
import { playerQuerySchema } from '../../validation/auctionSchemas.js';
import { defaultPlayerService } from '../../services/PlayerService.js';
import { AppError } from '../../utils/errors.js';

export const playerRoutes: FastifyPluginAsync = async (fastify) => {
  // Get Players for a room
  fastify.get('/api/rooms/:roomCode/players', async (request, reply) => {
    const paramsResult = roomCodeParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid room code parameter',
      });
    }

    const queryResult = playerQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        errors: queryResult.error.flatten(),
      });
    }

    try {
      const players = await defaultPlayerService.getPlayersForRoom(
        paramsResult.data.roomCode,
        queryResult.data
      );
      return reply.status(200).send({ players });
    } catch (err: any) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message });
      }
      request.log.error({ err }, 'Error fetching players');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to fetch players' });
    }
  });

  // Get single player by ID
  fastify.get('/api/players/:playerId', async (request, reply) => {
    const { playerId } = request.params as { playerId: string };
    try {
      const player = await defaultPlayerService.getPlayerById(playerId);
      if (!player) {
        return reply.status(404).send({ code: 'PLAYER_NOT_FOUND', message: 'Player not found' });
      }
      return reply.status(200).send({ player });
    } catch (err: any) {
      request.log.error({ err }, 'Error fetching player');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to fetch player' });
    }
  });
};
