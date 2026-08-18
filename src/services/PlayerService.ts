import { Player } from '../types/player.js';
import { PlayerFilter } from '../repositories/interfaces.js';
import { Repositories, defaultRepositories } from '../repositories/index.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { createError } from '../utils/errors.js';

export class PlayerService {
  constructor(private repos: Repositories = defaultRepositories) {}

  async getPlayersForRoom(roomCode: string, filter?: PlayerFilter): Promise<Player[]> {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    let result = [...room.playerPool];

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        result = result.filter((p) => (p.status || 'available') === filter.status);
      }
      if (filter.position) {
        result = result.filter((p) => p.position === filter.position);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.club.toLowerCase().includes(q) ||
            p.nationality.toLowerCase().includes(q)
        );
      }
      if (filter.minRating !== undefined) {
        result = result.filter((p) => p.rating >= filter.minRating!);
      }
    }

    return result;
  }

  async getAllCatalogPlayers(filter?: PlayerFilter): Promise<Player[]> {
    return this.repos.players.getPlayers(filter);
  }

  async getPlayerById(playerId: string): Promise<Player | null> {
    return this.repos.players.getPlayerById(playerId);
  }
}

export const defaultPlayerService = new PlayerService();
