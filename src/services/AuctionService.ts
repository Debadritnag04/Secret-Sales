import { RevealOutcome } from '../auction/RevealManager.js';
import { AuctionEngine } from '../auction/AuctionEngine.js';
import { AuctionManager } from '../auction/AuctionManager.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { Repositories, defaultRepositories } from '../repositories/index.js';
import { createError } from '../utils/errors.js';

export class AuctionService {
  constructor(private repos: Repositories = defaultRepositories) {}

  async startAuction(roomCode: string, requesterId: string): Promise<void> {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    const participant = room.participants.get(requesterId);
    if (!participant || !participant.isHost) {
      throw createError('NOT_HOST', 'Only the room host can start the auction');
    }

    AuctionEngine.startAuction(room);
    await this.repos.rooms.updateRoom(room);
  }

  async forceReveal(roomCode: string, requesterId: string): Promise<RevealOutcome> {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    const outcome = await AuctionManager.forceReveal(room, requesterId);
    const { revealResult, updatedSquad, purchase } = outcome;

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

    return outcome;
  }

  async nextPlayer(roomCode: string, requesterId: string): Promise<boolean> {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    const hasNext = await AuctionManager.nextPlayer(room, requesterId);
    await this.repos.rooms.updateRoom(room);
    return hasNext;
  }

  async endAuction(roomCode: string, requesterId: string): Promise<void> {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    const participant = room.participants.get(requesterId);
    if (!participant || !participant.isHost) {
      throw createError('NOT_HOST', 'Only the room host can end the auction');
    }

    AuctionEngine.endAuction(room);
    await this.repos.rooms.updateRoom(room);
  }
}

export const defaultAuctionService = new AuctionService();
