import { Player, PlayerStatus, Position } from '../types/player.js';
import { SealedBid } from '../types/bid.js';
import { Squad, PlayerPurchase } from '../types/team.js';
import { RoomData } from '../types/room.js';
import { RoundHistory } from '../types/auction.js';

export interface PlayerFilter {
  status?: PlayerStatus | 'all';
  position?: Position;
  search?: string;
  minRating?: number;
}

export interface IPlayerRepository {
  getPlayers(filter?: PlayerFilter): Promise<Player[]>;
  getPlayerById(id: string): Promise<Player | null>;
  updatePlayerStatus(id: string, status: PlayerStatus): Promise<void>;
  seedPlayers(players: Player[]): Promise<void>;
}

export interface IRoomRepository {
  createRoom(room: RoomData): Promise<void>;
  getRoomByCode(code: string): Promise<RoomData | null>;
  getRoomById(id: string): Promise<RoomData | null>;
  updateRoom(room: RoomData): Promise<void>;
  deleteRoom(id: string): Promise<void>;
}

export interface IBidRepository {
  saveBid(roomId: string, round: number, bid: SealedBid): Promise<void>;
  getBidsForRound(roomId: string, round: number): Promise<SealedBid[]>;
}

export interface ITeamRepository {
  saveSquad(roomId: string, squad: Squad): Promise<void>;
  getSquadsByRoomId(roomId: string): Promise<Squad[]>;
  updateSquadBudget(squadId: string, newBudget: number, spent: number): Promise<void>;
  addPlayerToRoster(squadId: string, purchase: PlayerPurchase): Promise<void>;
}

export interface IAuctionRepository {
  saveRoundHistory(roomId: string, history: RoundHistory): Promise<void>;
  getAuctionHistory(roomId: string): Promise<RoundHistory[]>;
}
