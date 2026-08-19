import { SealedBid, BidValidationResult, BidSubmissionProgress } from '../types/bid.js';
import { Player } from '../types/player.js';
import { Squad } from '../types/team.js';
import { Participant, RoomSettings } from '../types/room.js';
import { AuctionState } from '../types/auction.js';
import { logBidSubmitted } from '../utils/logger.js';

export class BidManager {
  /**
   * Validates a submitted bid before acceptance
   */
  static validateBid(
    participant: Participant | undefined,
    squad: Squad | undefined,
    bidAmount: number,
    auctionState: AuctionState,
    settings: RoomSettings
  ): BidValidationResult {
    if (!participant) {
      return { valid: false, code: 'PARTICIPANT_NOT_FOUND', message: 'Participant does not exist in room' };
    }

    if (!squad) {
      return { valid: false, code: 'SQUAD_NOT_FOUND', message: 'Squad not found for participant' };
    }

    if (auctionState.phase !== 'BIDDING') {
      return { valid: false, code: 'INVALID_PHASE', message: `Bidding is only allowed in BIDDING phase (current: ${auctionState.phase})` };
    }

    if (auctionState.roundLocked) {
      return { valid: false, code: 'ROUND_LOCKED', message: 'Current bidding round is locked' };
    }

    if (!auctionState.currentPlayer) {
      return { valid: false, code: 'PLAYER_UNAVAILABLE', message: 'No current player for bidding' };
    }

    // Bid immutability check
    if (auctionState.bids[participant.id]) {
      return { valid: false, code: 'BID_ALREADY_SUBMITTED', message: 'You have already submitted a bid for this player' };
    }

    if (typeof bidAmount !== 'number' || isNaN(bidAmount) || !isFinite(bidAmount) || bidAmount < 0) {
      return { valid: false, code: 'INVALID_BID_AMOUNT', message: 'Bid amount must be a non-negative number' };
    }

    // A bid of 0 is always valid — it means "I do not want this player"
    if (bidAmount === 0) {
      return { valid: true };
    }

    const minRequiredBid = Math.max(settings.minBid, auctionState.currentPlayer.basePrice || 1);
    if (bidAmount < minRequiredBid) {
      return {
        valid: false,
        code: 'BID_BELOW_MINIMUM',
        message: `Bid must be at least the base price of ${minRequiredBid} Cr`,
      };
    }

    if (bidAmount > squad.budget) {
      return {
        valid: false,
        code: 'BID_EXCEEDS_BUDGET',
        message: `Bid of ${bidAmount} Cr exceeds remaining budget of ${squad.budget} Cr`,
      };
    }

    return { valid: true };
  }

  /**
   * Records a sealed bid and returns submission progress
   */
  static recordBid(
    roomId: string,
    participant: Participant,
    squad: Squad,
    bidAmount: number,
    auctionState: AuctionState,
    totalActiveParticipants: number
  ): { sealedBid: SealedBid; progress: BidSubmissionProgress; isComplete: boolean } {
    const sealedBid: SealedBid = {
      participantId: participant.id,
      squadId: squad.id,
      squadName: squad.squadName,
      amount: bidAmount,
      submittedAt: Date.now(),
    };

    auctionState.bids[participant.id] = sealedBid;

    // Secure logging: never leaks bid amount
    logBidSubmitted(roomId, participant.id, squad.squadName);

    const submittedCount = Object.keys(auctionState.bids).length;
    const isComplete = submittedCount >= totalActiveParticipants && totalActiveParticipants > 0;

    return {
      sealedBid,
      progress: {
        submittedCount,
        totalParticipants: totalActiveParticipants,
      },
      isComplete,
    };
  }

  /**
   * Gets current bid progress without leaking any bid amounts
   */
  static getProgress(
    auctionState: AuctionState,
    totalActiveParticipants: number
  ): BidSubmissionProgress {
    return {
      submittedCount: Object.keys(auctionState.bids).length,
      totalParticipants: totalActiveParticipants,
    };
  }
}
