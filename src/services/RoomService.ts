import { CreateRoomInput, JoinRoomInput } from '../validation/roomSchemas.js';
import { RoomManager, CreateRoomResult, JoinRoomResult } from '../rooms/RoomManager.js';
import { AuctionEngine } from '../auction/AuctionEngine.js';
import { Repositories, defaultRepositories } from '../repositories/index.js';
import { PublicRoomState, PrivateParticipantState } from '../types/room.js';
import { createError } from '../utils/errors.js';

export class RoomService {
  constructor(private repos: Repositories = defaultRepositories) {}

  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    const players = await this.repos.players.getPlayers();
    if (!players || players.length === 0) {
      throw createError('INTERNAL_ERROR', 'Player catalog is empty. Cannot initialize room.');
    }

    const result = RoomManager.createRoom(
      {
        auctionName: input.auctionName,
        startingBudget: input.startingBudget,
        purseMode: input.purseMode || 'SAME',
        minParticipants: 1, // flexible for testing, standard 9-12
        maxParticipants: input.maxParticipants,
        minBid: input.minBid,
        allowHostForceReveal: input.allowHostForceReveal,
      },
      input.hostName,
      players,
      input.squadName
    );

    const room = RoomManager.getRoom(result.roomCode)!;
    await this.repos.rooms.createRoom(room);

    const hostSquad = room.squads.get(result.squadId);
    if (hostSquad) {
      await this.repos.teams.saveSquad(room.id, hostSquad);
    }

    return result;
  }

  async joinRoom(roomCode: string, input: JoinRoomInput): Promise<JoinRoomResult> {
    const result = RoomManager.joinRoom(roomCode, input.participantName, input.squadName);
    const room = RoomManager.getRoom(roomCode)!;

    const squad = room.squads.get(result.squadId);
    if (squad) {
      await this.repos.teams.saveSquad(room.id, squad);
    }

    return result;
  }

  getRoomState(roomCode: string, participantId?: string): PublicRoomState | PrivateParticipantState {
    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    if (participantId) {
      return AuctionEngine.toPrivateState(room, participantId);
    }
    return AuctionEngine.toPublicState(room);
  }

  toggleReady(roomCode: string, participantId: string, isReady: boolean): void {
    RoomManager.setReady(roomCode, participantId, isReady);
  }
}

export const defaultRoomService = new RoomService();
