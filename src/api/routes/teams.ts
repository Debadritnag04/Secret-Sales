import { FastifyPluginAsync } from 'fastify';
import { roomCodeParamSchema } from '../../validation/roomSchemas.js';
import { updateTeamNameSchema } from '../../validation/auctionSchemas.js';
import { defaultTeamService } from '../../services/TeamService.js';
import { AppError } from '../../utils/errors.js';

export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all teams for a room
  fastify.get('/api/rooms/:roomCode/teams', async (request, reply) => {
    const paramsResult = roomCodeParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid room code parameter',
      });
    }

    try {
      const teams = defaultTeamService.getTeamsForRoom(paramsResult.data.roomCode);
      return reply.status(200).send({ teams });
    } catch (err: any) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message });
      }
      request.log.error({ err }, 'Error fetching teams');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to fetch teams' });
    }
  });

  // Get single team by ID
  fastify.get('/api/rooms/:roomCode/teams/:teamId', async (request, reply) => {
    const { roomCode, teamId } = request.params as { roomCode: string; teamId: string };
    try {
      const team = defaultTeamService.getTeamById(roomCode, teamId);
      return reply.status(200).send(team);
    } catch (err: any) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message });
      }
      request.log.error({ err }, 'Error fetching team');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to fetch team' });
    }
  });

  // Update squad name
  fastify.patch('/api/rooms/:roomCode/teams/my-team', async (request, reply) => {
    const { roomCode } = request.params as { roomCode: string };
    const participantId = request.headers['x-participant-id'] as string;

    if (!participantId) {
      return reply.status(401).send({ code: 'INVALID_SESSION', message: 'Participant ID header missing' });
    }

    const bodyResult = updateTeamNameSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid squad name update',
        errors: bodyResult.error.flatten(),
      });
    }

    try {
      const updatedSquad = await defaultTeamService.updateTeamName(
        roomCode,
        participantId,
        bodyResult.data.squadName
      );
      return reply.status(200).send(updatedSquad);
    } catch (err: any) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ code: err.code, message: err.message });
      }
      request.log.error({ err }, 'Error updating team name');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Failed to update team name' });
    }
  });
};
