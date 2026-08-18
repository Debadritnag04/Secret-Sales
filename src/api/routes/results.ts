import { FastifyPluginAsync } from 'fastify';
import { roomCodeParamSchema } from '../../validation/roomSchemas.js';
import { defaultResultService } from '../../services/ResultService.js';
import { AppError } from '../../utils/errors.js';

export const resultRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/rooms/:roomCode/results', async (request, reply) => {
    const paramsResult = roomCodeParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid room code parameter',
      });
    }

    try {
      const results = await defaultResultService.getAuctionResults(
        paramsResult.data.roomCode
      );
      return reply.status(200).send(results);
    } catch (err: any) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message });
      }
      request.log.error({ err }, 'Error fetching auction results');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to fetch auction results' });
    }
  });
};
