import { Player } from '../types/player.js';
import { SealedBid } from '../types/bid.js';
import { Squad } from '../types/team.js';
import { RevealResult, TieBreakResult } from '../types/auction.js';
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
   * - Highest valid non-zero bid wins (if unique)
   * - If multiple teams tie for highest bid → DECIDER required (host decides)
   * - If all bids are 0 / no valid bids → UNSOLD
   * - Winner pays their EXACT submitted bid (first-price auction)
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
      // A bid of 0 is valid — it means "pass" / "I don't want this player"
      return {
        participantId: b.participantId,
        squadId: b.squadId,
        squadName: b.squadName,
        amount: b.amount,
        isValid: true,
      };
    });

    const validBids = evaluatedBids.filter((b) => b.isValid);
    const nonZeroValidBids = validBids.filter((b) => b.amount > 0);

    // If no valid bids at all, or ALL valid bids are 0 → UNSOLD
    if (validBids.length === 0 || nonZeroValidBids.length === 0) {
      logger.info({ round, playerId: player.id }, '[Auction] Round ended with no non-zero bids — player UNSOLD');
      return {
        round,
        player,
        bids: evaluatedBids,
        winnerSquadId: null,
        winnerParticipantId: null,
        winnerSquadName: null,
        winningBid: 0,
        tieBreak: null,
        isUnsold: true,
        isDeciderRequired: false,
        timestamp: Date.now(),
      };
    }

    // Find highest non-zero bid amount
    let highestAmount = -1;
    for (const b of nonZeroValidBids) {
      if (b.amount > highestAmount) {
        highestAmount = b.amount;
      }
    }

    const topBids = nonZeroValidBids.filter((b) => b.amount === highestAmount);

    // ─── SINGLE WINNER (no tie) ──────────────────────────────────────────
    if (topBids.length === 1) {
      const winningBidEntry = topBids[0];
      return {
        round,
        player,
        bids: evaluatedBids,
        winnerSquadId: winningBidEntry.squadId,
        winnerParticipantId: winningBidEntry.participantId,
        winnerSquadName: winningBidEntry.squadName,
        winningBid: winningBidEntry.amount,
        tieBreak: null,
        isUnsold: false,
        isDeciderRequired: false,
        timestamp: Date.now(),
      };
    }

    // ─── TIE DETECTED → DECIDER REQUIRED ────────────────────────────────
    // Do NOT auto-resolve. The host will manually decide winner + final price.
    const tiedSquadIds = topBids.map((b) => b.squadId);
    const tiedSquadNames = topBids.map((b) => b.squadName);

    const tieBreak: TieBreakResult = {
      isTie: true,
      tiedSquadIds,
      tiedSquadNames,
      highestBid: highestAmount,
      winnerSquadId: null, // Not yet decided
      winnerSquadName: null,
      finalPrice: null,
      method: 'host_decider',
      timestamp: Date.now(),
    };

    logger.info(
      { round, tiedSquadIds, tiedSquadNames, highestAmount },
      `[Auction] Tie detected at ${highestAmount} Cr between ${tiedSquadNames.join(', ')} — DECIDER required`
    );

    return {
      round,
      player,
      bids: evaluatedBids,
      winnerSquadId: null, // No winner yet
      winnerParticipantId: null,
      winnerSquadName: null,
      winningBid: highestAmount,
      tieBreak,
      isUnsold: false,
      isDeciderRequired: true,
      timestamp: Date.now(),
    };
  }
}
