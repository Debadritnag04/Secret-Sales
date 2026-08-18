import { SealedBid, BidSubmissionProgress } from '../types/bid.js';
import { RevealOutcome } from '../auction/RevealManager.js';
import { AuctionManager } from '../auction/AuctionManager.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { Repositories, defaultRepositories } from '../repositories/index.js';
import { createError } from '../utils/errors.js';

export class BidService {
  constructor(private repos: Repositories = defaultRepositories) {}

  async submitBid(
    roomCode: string,
    participantId: string,
    bidAmount: number
  ): Promise<{
    sealedBid: SealedBid;
    progress: BidSubmissionProgress;
    autoRevealed: boolean;
    revealOutcome?: RevealOutcome;
  }> {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    const result = await AuctionManager.submitBid(room, participantId, bidAmount);

    // Persist bid asynchronously
    await this.repos.bids.saveBid(
      room.id,
      room.auctionState.currentRound,
      result.sealedBid
    );

    // If automatic reveal occurred, persist financial & auction outcome
    if (result.autoRevealed && result.revealOutcome) {
      const { revealResult, updatedSquad, purchase } = result.revealOutcome;

      if (updatedSquad && purchase) {
        await this.repos.teams.updateSquadBudget(
          updatedSquad.id,
          updatedSquad.budget,
          updatedSquad.spent
        );
        await this.repos.teams.addPlayerToRoster(updatedSquad.id, purchase);
        await this.repos.players.updatePlayerStatus(purchase.player.id, 'sold');
      }

      await this.repos.auctions.saveRoundHistory(room.id, {
        round: revealResult.round,
        player: revealResult.player,
        winnerSquadId: revealResult.winnerSquadId,
        winnerSquadName: revealResult.winnerSquadName,
        winningBid: revealResult.winningBid,
        bids: revealResult.bids.map((b) => ({
          squadId: b.squadId,
          squadName: b.squadName,
          amount: b.amount,
        })),
        tieBreak: revealResult.tieBreak,
        timestamp: revealResult.timestamp,
      });

      await this.repos.rooms.updateRoom(room);
    }

    return result;
  }
}

export const defaultBidService = new BidService();
