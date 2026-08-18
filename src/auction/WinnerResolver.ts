import { Player } from '../types/player.js';
import { SealedBid } from '../types/bid.js';
import { Squad } from '../types/team.js';
import { RevealResult, TieBreakResult } from '../types/auction.js';
import { pickRandomTieBreakWinner } from '../utils/random.js';
import { logger } from '../utils/logger.js';

export interface EvaluatedBid {
  participantId: string;
  squadId: string;
  squadName: string;
  amount: number;
  isValid: boolean;
  invalidReason?: string;
}

export class WinnerResolver {
  /**
   * Resolves the winner of a sealed-bid round.
   * - Validates all bids against each squad's authoritative budget
   * - Highest valid bid wins
   * - Winner pays their EXACT submitted bid (first-price auction)
   * - Ties resolved using cryptographically secure random selection
   * - If no bids or no valid bids, no winner is assigned
   */
  static resolve(
    round: number,
    player: Player,
    bids: SealedBid[],
    squadsMap: Map<string, Squad>
  ): RevealResult {
    const evaluatedBids: EvaluatedBid[] = bids.map((b) => {
      const squad = squadsMap.get(b.squadId);
      if (!squad) {
        return {
          participantId: b.participantId,
          squadId: b.squadId,
          squadName: b.squadName,
          amount: b.amount,
          isValid: false,
          invalidReason: 'Squad not found',
        };
      }
      if (b.amount > squad.budget) {
        return {
          participantId: b.participantId,
          squadId: b.squadId,
          squadName: b.squadName,
          amount: b.amount,
          isValid: false,
          invalidReason: `Bid ${b.amount} exceeds remaining budget of ${squad.budget}`,
        };
      }
      if (b.amount < player.basePrice) {
        return {
          participantId: b.participantId,
          squadId: b.squadId,
          squadName: b.squadName,
          amount: b.amount,
          isValid: false,
          invalidReason: `Bid ${b.amount} is below player base price of ${player.basePrice}`,
        };
      }
      return {
        participantId: b.participantId,
        squadId: b.squadId,
        squadName: b.squadName,
        amount: b.amount,
        isValid: true,
      };
    });

    const validBids = evaluatedBids.filter((b) => b.isValid);

    if (validBids.length === 0) {
      logger.info({ round, playerId: player.id }, '[Auction] Round ended with no valid bids');
      return {
        round,
        player,
        bids: evaluatedBids,
        winnerSquadId: null,
        winnerParticipantId: null,
        winnerSquadName: null,
        winningBid: 0,
        tieBreak: null,
        timestamp: Date.now(),
      };
    }

    // Find highest bid amount
    let highestAmount = -1;
    for (const b of validBids) {
      if (b.amount > highestAmount) {
        highestAmount = b.amount;
      }
    }

    const topBids = validBids.filter((b) => b.amount === highestAmount);

    let winningBidEntry: EvaluatedBid;
    let tieBreak: TieBreakResult | null = null;

    if (topBids.length === 1) {
      winningBidEntry = topBids[0];
    } else {
      // Tie detected: perform cryptographically secure tie-break
      const tiedSquadIds = topBids.map((b) => b.squadId);
      const winningSquadId = pickRandomTieBreakWinner(tiedSquadIds);
      winningBidEntry = topBids.find((b) => b.squadId === winningSquadId)!;

      tieBreak = {
        isTie: true,
        tiedSquadIds,
        winnerSquadId: winningSquadId,
        method: 'cryptographic_random',
        timestamp: Date.now(),
      };

      logger.info(
        { round, tiedSquadIds, winningSquadId, highestAmount },
        `[Auction] Cryptographic tie-break resolved winner: ${winningBidEntry.squadName}`
      );
    }

    return {
      round,
      player,
      bids: evaluatedBids,
      winnerSquadId: winningBidEntry.squadId,
      winnerParticipantId: winningBidEntry.participantId,
      winnerSquadName: winningBidEntry.squadName,
      winningBid: winningBidEntry.amount,
      tieBreak,
      timestamp: Date.now(),
    };
  }
}
