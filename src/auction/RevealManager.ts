import { RoomData } from '../types/room.js';
import { RevealResult, RoundHistory } from '../types/auction.js';
import { PlayerPurchase, Squad } from '../types/team.js';
import { WinnerResolver } from './WinnerResolver.js';
import { BudgetManager } from './BudgetManager.js';
import { RosterManager } from './RosterManager.js';
import { AuditService } from '../utils/audit.js';
import { createError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface RevealOutcome {
  revealResult: RevealResult;
  updatedSquad?: Squad;
  purchase?: PlayerPurchase;
  deciderRequired: boolean;
}

export class RevealManager {
  /**
   * Performs an atomic reveal of the current round bids.
   * 
   * Three possible outcomes:
   * 1. Clear winner (single highest bid) → process sale immediately
   * 2. UNSOLD (all bids = 0) → add to unsold list
   * 3. TIE (multiple highest bidders) → transition to DECIDER phase, host decides
   */
  static executeReveal(room: RoomData): RevealOutcome {
    const { auctionState, squads, playerPool } = room;

    if (auctionState.phase !== 'BIDDING' && auctionState.phase !== 'REVEALING') {
      throw createError(
        'INVALID_PHASE',
        `Cannot reveal in phase ${auctionState.phase}`
      );
    }

    if (!auctionState.currentPlayer) {
      throw createError('PLAYER_UNAVAILABLE', 'No player currently on auction');
    }

    // 1. Lock round
    auctionState.roundLocked = true;
    auctionState.phase = 'REVEALING';

    const currentPlayer = auctionState.currentPlayer;
    const bidsList = Object.values(auctionState.bids);

    // 2. Resolve winner / detect ties
    const revealResult = WinnerResolver.resolve(
      auctionState.currentRound,
      currentPlayer,
      bidsList,
      squads
    );

    auctionState.lastRevealResult = revealResult;

    // ─── OUTCOME 3: TIE → DECIDER ────────────────────────────────────────
    if (revealResult.isDeciderRequired && revealResult.tieBreak) {
      // Transition to DECIDER phase — do NOT assign player
      auctionState.phase = 'DECIDER';

      // Store decider state for the host UI
      auctionState.deciderState = {
        roundId: `round_${auctionState.currentRound}`,
        player: currentPlayer,
        highestBid: revealResult.tieBreak.highestBid,
        tiedSquads: revealResult.tieBreak.tiedSquadIds.map((squadId) => {
          const squad = squads.get(squadId);
          return {
            squadId,
            squadName: squad?.squadName || 'Unknown',
            budget: squad?.budget || 0,
          };
        }),
      };

      AuditService.record(room.id, room.code, 'TIE_BREAK', {
        round: auctionState.currentRound,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        highestBid: revealResult.tieBreak.highestBid,
        tiedSquadIds: revealResult.tieBreak.tiedSquadIds,
        tiedSquadNames: revealResult.tieBreak.tiedSquadNames,
        method: 'host_decider',
      });

      logger.info(
        { roomId: room.id, round: auctionState.currentRound, tiedSquads: revealResult.tieBreak.tiedSquadNames },
        `[RevealManager] Round ${auctionState.currentRound} — TIE at ${revealResult.tieBreak.highestBid} Cr. DECIDER required.`
      );

      // Do NOT save history yet — it will be saved after decider resolves
      return {
        revealResult,
        deciderRequired: true,
      };
    }

    let updatedSquad: Squad | undefined;
    let purchase: PlayerPurchase | undefined;

    // ─── OUTCOME 1: CLEAR WINNER ─────────────────────────────────────────
    if (revealResult.winnerSquadId && revealResult.winningBid > 0) {
      const winnerSquad = squads.get(revealResult.winnerSquadId);
      if (!winnerSquad) {
        throw createError('SQUAD_NOT_FOUND', `Winner squad ${revealResult.winnerSquadId} not found`);
      }

      // Deduct budget
      BudgetManager.deductWinningBid(winnerSquad, revealResult.winningBid);

      // Assign player
      purchase = RosterManager.assignPlayer(
        winnerSquad,
        currentPlayer,
        revealResult.winningBid,
        auctionState.currentRound
      );

      // Mark player in pool as sold
      const poolPlayer = playerPool.find((p) => p.id === currentPlayer.id);
      if (poolPlayer) {
        poolPlayer.status = 'sold';
      }

      updatedSquad = winnerSquad;

      AuditService.record(room.id, room.code, 'PLAYER_SOLD', {
        round: auctionState.currentRound,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        winnerSquadId: winnerSquad.id,
        winnerSquadName: winnerSquad.squadName,
        winningBid: revealResult.winningBid,
        tieBreakUsed: false,
      });
    }
    // ─── OUTCOME 2: UNSOLD ───────────────────────────────────────────────
    else if (revealResult.isUnsold) {
      const poolPlayer = playerPool.find((p) => p.id === currentPlayer.id);
      if (poolPlayer) {
        poolPlayer.status = 'unsold';
      }

      // Track in unsold players list
      room.auctionState.unsoldPlayers.push({
        player: currentPlayer,
        originalRound: auctionState.currentRound,
        markedUnsoldAt: Date.now(),
        recalled: false,
      });
    }

    // 4. Save round history (only for non-decider outcomes)
    const historyItem: RoundHistory = {
      round: auctionState.currentRound,
      player: currentPlayer,
      winnerSquadId: revealResult.winnerSquadId,
      winnerSquadName: revealResult.winnerSquadName,
      winningBid: revealResult.winningBid,
      bids: revealResult.bids.map((b) => ({
        squadId: b.squadId,
        squadName: b.squadName,
        amount: b.amount,
      })),
      tieBreak: revealResult.tieBreak,
      decider: null,
      timestamp: revealResult.timestamp,
    };

    auctionState.history.push(historyItem);

    AuditService.record(room.id, room.code, 'REVEAL_COMPLETED', {
      round: auctionState.currentRound,
      winnerSquadId: revealResult.winnerSquadId,
      winningBid: revealResult.winningBid,
      totalBids: bidsList.length,
      isUnsold: revealResult.isUnsold,
    });

    logger.info(
      { roomId: room.id, round: auctionState.currentRound, winner: revealResult.winnerSquadName, bid: revealResult.winningBid },
      `[RevealManager] Round ${auctionState.currentRound} revealed. Winner: ${revealResult.winnerSquadName || 'UNSOLD'}`
    );

    return {
      revealResult,
      updatedSquad,
      purchase,
      deciderRequired: false,
    };
  }
}
