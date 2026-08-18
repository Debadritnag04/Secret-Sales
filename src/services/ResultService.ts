import { RoomManager } from '../rooms/RoomManager.js';
import { RosterManager } from '../auction/RosterManager.js';
import { AuditService, AuditRecord } from '../utils/audit.js';
import { RoundHistory } from '../types/auction.js';
import { TeamPublicInfo } from '../types/team.js';
import { Repositories, defaultRepositories } from '../repositories/index.js';
import { createError } from '../utils/errors.js';

export interface AuctionResults {
  roomCode: string;
  auctionName: string;
  phase: string;
  totalRounds: number;
  totalSpent: number;
  standings: Array<
    TeamPublicInfo & {
      rank: number;
      averageRating: number;
      totalValue: number;
    }
  >;
  history: RoundHistory[];
  auditLogs: AuditRecord[];
}

export class ResultService {
  constructor(private repos: Repositories = defaultRepositories) {}

  async getAuctionResults(roomCode: string): Promise<AuctionResults> {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    const squads = Array.from(room.squads.values()).map((s) =>
      RosterManager.getPublicTeamInfo(s)
    );

    let totalSpent = 0;
    const computedStandings = squads.map((squad) => {
      totalSpent += squad.spent;
      const totalRating = squad.roster.reduce((sum, p) => sum + p.player.rating, 0);
      const averageRating = squad.roster.length > 0 ? Number((totalRating / squad.roster.length).toFixed(1)) : 0;
      const totalValue = squad.roster.reduce((sum, p) => sum + p.player.basePrice, 0);

      return {
        ...squad,
        averageRating,
        totalValue,
      };
    });

    // Rank by player count desc, then averageRating desc, then remaining budget desc
    computedStandings.sort((a, b) => {
      if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return b.budget - a.budget;
    });

    const rankedStandings = computedStandings.map((squad, index) => ({
      ...squad,
      rank: index + 1,
    }));

    const history =
      room.auctionState.history.length > 0
        ? room.auctionState.history
        : await this.repos.auctions.getAuctionHistory(room.id);

    const auditLogs = AuditService.getLogsForRoom(room.id);

    return {
      roomCode: room.code,
      auctionName: room.settings.auctionName,
      phase: room.auctionState.phase,
      totalRounds: room.auctionState.currentRound,
      totalSpent,
      standings: rankedStandings,
      history,
      auditLogs,
    };
  }
}

export const defaultResultService = new ResultService();
