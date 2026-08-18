import { Player } from '../../types/player.js';
import { SealedBid } from '../../types/bid.js';
import { Squad, PlayerPurchase } from '../../types/team.js';
import { RoomData } from '../../types/room.js';
import { RoundHistory } from '../../types/auction.js';
import {
  IPlayerRepository,
  IRoomRepository,
  IBidRepository,
  ITeamRepository,
  IAuctionRepository,
  PlayerFilter,
} from '../interfaces.js';

export const INITIAL_PLAYER_POOL: Player[] = [
  { id: 'p1', name: 'Lionel Messi', rating: 93, position: 'WING', club: 'Inter Miami', nationality: 'Argentina', photoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200', basePrice: 10, status: 'available' },
  { id: 'p2', name: 'Kevin De Bruyne', rating: 91, position: 'MID', club: 'Man City', nationality: 'Belgium', photoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200', basePrice: 9, status: 'available' },
  { id: 'p3', name: 'Kylian Mbappé', rating: 91, position: 'ST', club: 'Real Madrid', nationality: 'France', photoUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=200', basePrice: 10, status: 'available' },
  { id: 'p4', name: 'Erling Haaland', rating: 91, position: 'ST', club: 'Man City', nationality: 'Norway', photoUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=200', basePrice: 10, status: 'available' },
  { id: 'p5', name: 'Virgil van Dijk', rating: 89, position: 'DEF', club: 'Liverpool', nationality: 'Netherlands', photoUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=200', basePrice: 8, status: 'available' },
  { id: 'p6', name: 'Alisson Becker', rating: 89, position: 'GK', club: 'Liverpool', nationality: 'Brazil', photoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200', basePrice: 7, status: 'available' },
  { id: 'p7', name: 'Jude Bellingham', rating: 90, position: 'MID', club: 'Real Madrid', nationality: 'England', photoUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=200', basePrice: 9, status: 'available' },
  { id: 'p8', name: 'Vinícius Júnior', rating: 89, position: 'WING', club: 'Real Madrid', nationality: 'Brazil', photoUrl: 'https://images.unsplash.com/photo-1518604667503-4672e1314dd6?w=200', basePrice: 9, status: 'available' },
  { id: 'p9', name: 'Rúben Dias', rating: 89, position: 'DEF', club: 'Man City', nationality: 'Portugal', photoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200', basePrice: 8, status: 'available' },
  { id: 'p10', name: 'Thibaut Courtois', rating: 90, position: 'GK', club: 'Real Madrid', nationality: 'Belgium', photoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200', basePrice: 7, status: 'available' },
  { id: 'p11', name: 'Rodri', rating: 90, position: 'MID', club: 'Man City', nationality: 'Spain', photoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200', basePrice: 9, status: 'available' },
  { id: 'p12', name: 'Mohamed Salah', rating: 89, position: 'WING', club: 'Liverpool', nationality: 'Egypt', photoUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=200', basePrice: 9, status: 'available' },
  { id: 'p13', name: 'Bukayo Saka', rating: 88, position: 'WING', club: 'Arsenal', nationality: 'England', photoUrl: 'https://images.unsplash.com/photo-1518604667503-4672e1314dd6?w=200', basePrice: 8, status: 'available' },
  { id: 'p14', name: 'Harry Kane', rating: 90, position: 'ST', club: 'Bayern Munich', nationality: 'England', photoUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=200', basePrice: 9, status: 'available' },
  { id: 'p15', name: 'Pedri', rating: 86, position: 'MID', club: 'Barcelona', nationality: 'Spain', photoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200', basePrice: 7, status: 'available' },
  { id: 'p16', name: 'William Saliba', rating: 87, position: 'DEF', club: 'Arsenal', nationality: 'France', photoUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=200', basePrice: 7, status: 'available' },
];

export class InMemoryPlayerRepository implements IPlayerRepository {
  private players: Map<string, Player> = new Map();

  constructor(initialPlayers: Player[] = INITIAL_PLAYER_POOL) {
    this.seed(initialPlayers);
  }

  private seed(players: Player[]) {
    players.forEach((p) => this.players.set(p.id, { ...p }));
  }

  async getPlayers(filter?: PlayerFilter): Promise<Player[]> {
    let result = Array.from(this.players.values());
    if (!filter) return result;

    if (filter.status && filter.status !== 'all') {
      result = result.filter((p) => (p.status || 'available') === filter.status);
    }
    if (filter.position) {
      result = result.filter((p) => p.position === filter.position);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.club.toLowerCase().includes(q) ||
          p.nationality.toLowerCase().includes(q)
      );
    }
    if (filter.minRating !== undefined) {
      result = result.filter((p) => p.rating >= filter.minRating!);
    }
    return result;
  }

  async getPlayerById(id: string): Promise<Player | null> {
    const player = this.players.get(id);
    return player ? { ...player } : null;
  }

  async updatePlayerStatus(id: string, status: 'available' | 'sold' | 'unsold'): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      player.status = status;
    }
  }

  async seedPlayers(players: Player[]): Promise<void> {
    this.players.clear();
    this.seed(players);
  }
}

export class InMemoryRoomRepository implements IRoomRepository {
  private rooms: Map<string, RoomData> = new Map();
  private codeToId: Map<string, string> = new Map();

  async createRoom(room: RoomData): Promise<void> {
    this.rooms.set(room.id, room);
    this.codeToId.set(room.code.toUpperCase(), room.id);
  }

  async getRoomByCode(code: string): Promise<RoomData | null> {
    const id = this.codeToId.get(code.toUpperCase());
    if (!id) return null;
    return this.rooms.get(id) || null;
  }

  async getRoomById(id: string): Promise<RoomData | null> {
    return this.rooms.get(id) || null;
  }

  async updateRoom(room: RoomData): Promise<void> {
    this.rooms.set(room.id, room);
    this.codeToId.set(room.code.toUpperCase(), room.id);
  }

  async deleteRoom(id: string): Promise<void> {
    const room = this.rooms.get(id);
    if (room) {
      this.codeToId.delete(room.code.toUpperCase());
      this.rooms.delete(id);
    }
  }
}

export class InMemoryBidRepository implements IBidRepository {
  // key: roomId:round -> SealedBid[]
  private bids: Map<string, SealedBid[]> = new Map();

  async saveBid(roomId: string, round: number, bid: SealedBid): Promise<void> {
    const key = `${roomId}:${round}`;
    let list = this.bids.get(key);
    if (!list) {
      list = [];
      this.bids.set(key, list);
    }
    // Check if already submitted
    const existingIndex = list.findIndex((b) => b.participantId === bid.participantId);
    if (existingIndex >= 0) {
      list[existingIndex] = bid;
    } else {
      list.push(bid);
    }
  }

  async getBidsForRound(roomId: string, round: number): Promise<SealedBid[]> {
    const key = `${roomId}:${round}`;
    return this.bids.get(key) || [];
  }
}

export class InMemoryTeamRepository implements ITeamRepository {
  // key: roomId -> Map<squadId, Squad>
  private roomSquads: Map<string, Map<string, Squad>> = new Map();

  async saveSquad(roomId: string, squad: Squad): Promise<void> {
    let squads = this.roomSquads.get(roomId);
    if (!squads) {
      squads = new Map();
      this.roomSquads.set(roomId, squads);
    }
    squads.set(squad.id, squad);
  }

  async getSquadsByRoomId(roomId: string): Promise<Squad[]> {
    const squads = this.roomSquads.get(roomId);
    return squads ? Array.from(squads.values()) : [];
  }

  async updateSquadBudget(squadId: string, newBudget: number, spent: number): Promise<void> {
    for (const squads of this.roomSquads.values()) {
      const squad = squads.get(squadId);
      if (squad) {
        squad.budget = newBudget;
        squad.spent = spent;
        break;
      }
    }
  }

  async addPlayerToRoster(squadId: string, purchase: PlayerPurchase): Promise<void> {
    for (const squads of this.roomSquads.values()) {
      const squad = squads.get(squadId);
      if (squad) {
        squad.roster.push(purchase);
        break;
      }
    }
  }
}

export class InMemoryAuctionRepository implements IAuctionRepository {
  // key: roomId -> RoundHistory[]
  private history: Map<string, RoundHistory[]> = new Map();

  async saveRoundHistory(roomId: string, history: RoundHistory): Promise<void> {
    let list = this.history.get(roomId);
    if (!list) {
      list = [];
      this.history.set(roomId, list);
    }
    list.push(history);
  }

  async getAuctionHistory(roomId: string): Promise<RoundHistory[]> {
    return this.history.get(roomId) || [];
  }
}
