import { RoomData, PublicRoomState, PrivateParticipantState } from '../types/room.js';
import { AuctionPhase, RevealResult } from '../types/auction.js';
import { PlayerSelector } from './PlayerSelector.js';
import { RevealManager, RevealOutcome } from './RevealManager.js';
import { RosterManager } from './RosterManager.js';
import { AuditService } from '../utils/audit.js';
import { createError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const VALID_TRANSITIONS: Record<AuctionPhase, AuctionPhase[]> = {
  WAITING: ['LOBBY'],
  LOBBY: ['STARTING', 'ENDED'],
  STARTING: ['BIDDING', 'ENDED'],
  BIDDING: ['REVEALING', 'COMPLETED', 'ENDED'],
  REVEALING: ['BIDDING', 'COMPLETED', 'ENDED'],
  COMPLETED: ['ENDED'],
  ENDED: [],
};

export class AuctionEngine {
  /**
   * Validates and performs state transition
   */
  static transitionPhase(room: RoomData, targetPhase: AuctionPhase): void {
    const currentPhase = room.auctionState.phase;
    const allowed = VALID_TRANSITIONS[currentPhase] || [];

    if (!allowed.includes(targetPhase)) {
      throw createError(
        'INVALID_STATE_TRANSITION',
        `Cannot transition auction phase from ${currentPhase} to ${targetPhase}`
      );
    }

    room.auctionState.phase = targetPhase;
    room.updatedAt = Date.now();

    logger.info(
      { roomId: room.id, roomCode: room.code, from: currentPhase, to: targetPhase },
      `[AuctionEngine] Phase transition: ${currentPhase} -> ${targetPhase}`
    );
  }

  /**
   * Starts the auction
   */
  static startAuction(room: RoomData): void {
    if (room.participants.size < 1) {
      throw createError(
        'NOT_ENOUGH_PARTICIPANTS',
        'Cannot start auction without participants'
      );
    }

    this.transitionPhase(room, 'STARTING');

    // Initialize player sequence
    room.auctionState.playerSequence = PlayerSelector.initializeSequence(room.playerPool);
    room.auctionState.currentPlayerIndex = 0;
    room.auctionState.currentRound = 0;
    room.auctionState.history = [];

    // Advance to first player
    this.advanceToNextPlayer(room);

    AuditService.record(room.id, room.code, 'AUCTION_STARTED', {
      participantCount: room.participants.size,
      totalPlayers: room.auctionState.playerSequence.length,
    });
  }

  /**
   * Advances the auction to the next player or finishes if pool exhausted
   */
  static advanceToNextPlayer(room: RoomData): boolean {
    const { player, nextIndex } = PlayerSelector.getNextPlayer(
      room.playerPool,
      room.auctionState.playerSequence,
      room.auctionState.currentPlayerIndex
    );

    if (!player) {
      // Auction completed
      this.transitionPhase(room, 'COMPLETED');
      room.auctionState.currentPlayer = null;
      room.auctionState.roundLocked = true;

      AuditService.record(room.id, room.code, 'AUCTION_COMPLETED', {
        totalRounds: room.auctionState.currentRound,
      });
      return false;
    }

    room.auctionState.currentPlayer = player;
    room.auctionState.currentPlayerIndex = nextIndex;
    room.auctionState.currentRound += 1;
    room.auctionState.bids = {};
    room.auctionState.roundLocked = false;

    this.transitionPhase(room, 'BIDDING');

    AuditService.record(room.id, room.code, 'PLAYER_SELECTED', {
      round: room.auctionState.currentRound,
      playerId: player.id,
      playerName: player.name,
      basePrice: player.basePrice,
    });

    return true;
  }

  /**
   * Force reveal by host
   */
  static forceReveal(room: RoomData): RevealOutcome {
    if (room.auctionState.phase !== 'BIDDING') {
      throw createError(
        'INVALID_PHASE',
        `Force reveal only allowed during BIDDING phase (current: ${room.auctionState.phase})`
      );
    }

    const bidCount = Object.keys(room.auctionState.bids).length;
    if (bidCount === 0) {
      throw createError(
        'NO_BIDS_SUBMITTED',
        'Cannot force reveal when no bids have been submitted'
      );
    }

    AuditService.record(room.id, room.code, 'FORCE_REVEAL', {
      round: room.auctionState.currentRound,
      submittedBids: bidCount,
    });

    return RevealManager.executeReveal(room);
  }

  /**
   * Ends the auction prematurely or closes room
   */
  static endAuction(room: RoomData): void {
    this.transitionPhase(room, 'ENDED');
    room.auctionState.roundLocked = true;
    AuditService.record(room.id, room.code, 'AUCTION_COMPLETED', {
      endedEarly: true,
      finalRound: room.auctionState.currentRound,
    });
  }

  /**
   * Serializes room data for public broadcast (HIDDEN BIDS STRICTLY ENFORCED)
   */
  static toPublicState(room: RoomData): PublicRoomState {
    const participantsList = Array.from(room.participants.values()).map((p) => ({
      id: p.id,
      name: p.name,
      squadName: p.squadName,
      isHost: p.isHost,
      isReady: room.squads.get(p.squadId)?.isReady ?? false,
      isConnected: p.isConnected,
    }));

    const squadsList = Array.from(room.squads.values()).map((s) => ({
      id: s.id,
      squadName: s.squadName,
      ownerName: s.ownerName,
      budget: s.budget,
      spent: s.spent,
      isReady: s.isReady,
      playerCount: s.roster.length,
      roster: s.roster,
    }));

    const hostParticipant = room.participants.get(room.hostId);

    return {
      roomId: room.id,
      roomCode: room.code,
      auctionName: room.settings.auctionName,
      hostName: hostParticipant ? hostParticipant.name : 'Host',
      phase: room.auctionState.phase,
      currentRound: room.auctionState.currentRound,
      currentPlayer: room.auctionState.currentPlayer,
      submittedCount: Object.keys(room.auctionState.bids).length,
      totalParticipants: room.participants.size,
      participants: participantsList,
      squads: squadsList,
      settings: room.settings,
      lastRevealResult: room.auctionState.lastRevealResult,
    };
  }

  /**
   * Serializes room data with private participant context
   */
  static toPrivateState(room: RoomData, participantId: string): PrivateParticipantState {
    const publicState = this.toPublicState(room);
    const participant = room.participants.get(participantId);
    const squad = participant ? room.squads.get(participant.squadId) : undefined;

    const myBidStatus =
      participant && room.auctionState.bids[participant.id] ? 'SUBMITTED' : 'NONE';

    return {
      ...publicState,
      myParticipantId: participantId,
      mySquadId: participant?.squadId || '',
      mySquadName: participant?.squadName || '',
      isHost: participant?.isHost ?? false,
      myBidStatus,
      myBudget: squad?.budget ?? 0,
    };
  }
}
