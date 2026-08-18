import { Player } from '../types/player.js';
import { Squad, PlayerPurchase, TeamPublicInfo } from '../types/team.js';
import { logger } from '../utils/logger.js';

export class RosterManager {
  /**
   * Assigns a won player to the winning squad
   */
  static assignPlayer(
    squad: Squad,
    player: Player,
    amount: number,
    round: number
  ): PlayerPurchase {
    const purchase: PlayerPurchase = {
      player: { ...player, status: 'sold' },
      amount,
      round,
      timestamp: Date.now(),
    };

    squad.roster.push(purchase);

    logger.info(
      { squadId: squad.id, squadName: squad.squadName, playerId: player.id, playerName: player.name, round, amount },
      `[RosterManager] Player ${player.name} assigned to squad ${squad.squadName} for ${amount}`
    );

    return purchase;
  }

  /**
   * Calculates comprehensive public squad statistics
   */
  static getPublicTeamInfo(squad: Squad): TeamPublicInfo {
    let highestPurchase: PlayerPurchase | null = null;
    let cheapestPurchase: PlayerPurchase | null = null;

    for (const p of squad.roster) {
      if (!highestPurchase || p.amount > highestPurchase.amount) {
        highestPurchase = p;
      }
      if (!cheapestPurchase || p.amount < cheapestPurchase.amount) {
        cheapestPurchase = p;
      }
    }

    return {
      id: squad.id,
      participantId: squad.participantId,
      ownerName: squad.ownerName,
      squadName: squad.squadName,
      budget: squad.budget,
      startingBudget: squad.startingBudget,
      spent: squad.spent,
      isReady: squad.isReady,
      roster: squad.roster,
      highestPurchase,
      cheapestPurchase,
      playerCount: squad.roster.length,
    };
  }
}
