import { TeamPublicInfo, Squad } from '../types/team.js';
import { RosterManager } from '../auction/RosterManager.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { Repositories, defaultRepositories } from '../repositories/index.js';
import { createError } from '../utils/errors.js';

export class TeamService {
  constructor(private repos: Repositories = defaultRepositories) {}

  getTeamsForRoom(roomCode: string): TeamPublicInfo[] {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    return Array.from(room.squads.values()).map((squad) =>
      RosterManager.getPublicTeamInfo(squad)
    );
  }

  getTeamById(roomCode: string, teamId: string): TeamPublicInfo {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    const squad = room.squads.get(teamId);
    if (!squad) {
      throw createError('SQUAD_NOT_FOUND', `Squad with ID ${teamId} not found`, 404);
    }

    return RosterManager.getPublicTeamInfo(squad);
  }

  async updateTeamName(
    roomCode: string,
    participantId: string,
    newSquadName: string
  ): Promise<Squad> {
    const squad = RoomManager.updateSquadName(roomCode, participantId, newSquadName);
    const room = RoomManager.getRoom(roomCode)!;
    await this.repos.teams.saveSquad(room.id, squad);
    return squad;
  }
}

export const defaultTeamService = new TeamService();
