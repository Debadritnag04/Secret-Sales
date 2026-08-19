import { RoomData } from '../types/room.js';
import { SealedBid, BidSubmissionProgress } from '../types/bid.js';
import { DeciderResolution, DeciderRecord } from '../types/auction.js';
import { PlayerPurchase, Squad } from '../types/team.js';
import { RevealOutcome, RevealManager } from './RevealManager.js';
import { BidManager } from './BidManager.js';
import { AuctionEngine } from './AuctionEngine.js';
import { RoomMutexManager } from '../utils/mutex.js';
import { createError } from '../utils/errors.js';

export class AuctionManager {
  /**
   * Submits a sealed bid under per-room concurrency lock.
   * If all active participants have submitted, automatically triggers reveal atomically.
   */
  static async submitBid(
    room: RoomData,
    participantId: string,
    bidAmount: number
  ): Promise<{
    sealedBid: SealedBid;
    progress: BidSubmissionProgress;
    autoRevealed: boolean;
    revealOutcome?: RevealOutcome;
  }> {
    return RoomMutexManager.runExclusive(room.id, async () => {
      const participant = room.participants.get(participantId);
      const squad = participant ? room.squads.get(participant.squadId) : undefined;

      const validation = BidManager.validateBid(
        participant,
        squad,
        bidAmount,
        room.auctionState,
        room.settings
      );

      if (!validation.valid) {
        throw createError(
          (validation.code as any) || 'VALIDATION_ERROR',
          validation.message || 'Invalid bid'
        );
      }

      const { sealedBid, progress, isComplete } = BidManager.recordBid(
        room.id,
        participant!,
        squad!,
        bidAmount,
        room.auctionState,
        room.participants.size
      );

      // Automatic reveal when all active participants have submitted
      if (isComplete && room.auctionState.phase === 'BIDDING') {
        const revealOutcome = RevealManager.executeReveal(room);
        return {
          sealedBid,
          progress,
          autoRevealed: true,
          revealOutcome,
        };
      }

      return {
        sealedBid,
        progress,
        autoRevealed: false,
      };
    });
  }

  /**
   * Force reveals under per-room concurrency lock
   */
  static async forceReveal(room: RoomData, requesterId: string): Promise<RevealOutcome> {
    return RoomMutexManager.runExclusive(room.id, async () => {
      const participant = room.participants.get(requesterId);
      if (!participant || !participant.isHost) {
        throw createError('NOT_HOST', 'Only the room host can force reveal');
      }

      return AuctionEngine.forceReveal(room);
    });
  }

  /**
   * Advances to next player under per-room concurrency lock
   */
  static async nextPlayer(room: RoomData, requesterId: string): Promise<boolean> {
    return RoomMutexManager.runExclusive(room.id, async () => {
      const participant = room.participants.get(requesterId);
      if (!participant || !participant.isHost) {
        throw createError('NOT_HOST', 'Only the room host can advance to the next player');
      }

      if (room.auctionState.phase !== 'REVEALING') {
        throw createError(
          'INVALID_PHASE',
          `Cannot advance player in phase ${room.auctionState.phase}. Must be in REVEALING phase.`
        );
      }

      return AuctionEngine.advanceToNextPlayer(room);
    });
  }

  /**
   * Recalls an unsold player back into the auction queue.
   * Only the host can initiate a recall.
   */
  static async recallPlayer(
    room: RoomData,
    requesterId: string,
    playerId: string
  ): Promise<{ player: any; newSequencePosition: number }> {
    return RoomMutexManager.runExclusive(room.id, async () => {
      const participant = room.participants.get(requesterId);
      if (!participant || !participant.isHost) {
        throw createError('NOT_HOST', 'Only the room host can recall unsold players');
      }

      return AuctionEngine.recallPlayer(room, playerId);
    });
  }

  /**
   * Resolves a DECIDER tie-break under per-room concurrency lock.
   * Only the host can submit the decision.
   */
  static async resolveDecider(
    room: RoomData,
    requesterId: string,
    resolution: DeciderResolution
  ): Promise<{ updatedSquad: Squad; purchase: PlayerPurchase; deciderRecord: DeciderRecord }> {
    return RoomMutexManager.runExclusive(room.id, async () => {
      const participant = room.participants.get(requesterId);
      if (!participant || !participant.isHost) {
        throw createError('NOT_HOST', 'Only the room host can resolve the decider');
      }

      return AuctionEngine.resolveDecider(room, resolution);
    });
  }
}
