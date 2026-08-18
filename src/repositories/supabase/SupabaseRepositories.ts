import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Player, PlayerStatus } from '../../types/player.js';
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
import { logger } from '../../utils/logger.js';

export class SupabaseClientFactory {
  private static client: SupabaseClient | null = null;

  static getClient(url?: string, key?: string): SupabaseClient | null {
    if (this.client) return this.client;
    if (url && key) {
      try {
        this.client = createClient(url, key, {
          auth: { persistSession: false },
        });
        logger.info('Connected to Supabase PostgreSQL database');
        return this.client;
      } catch (err) {
        logger.error({ err }, 'Failed to initialize Supabase client');
      }
    }
    return null;
  }
}

export class SupabasePlayerRepository implements IPlayerRepository {
  constructor(private supabase: SupabaseClient) {}

  async getPlayers(filter?: PlayerFilter): Promise<Player[]> {
    let query = this.supabase.from('players').select('*');
    if (filter) {
      if (filter.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }
      if (filter.position) {
        query = query.eq('position', filter.position);
      }
      if (filter.search) {
        query = query.ilike('name', `%${filter.search}%`);
      }
      if (filter.minRating !== undefined) {
        query = query.gte('rating', filter.minRating);
      }
    }
    const { data, error } = await query;
    if (error) {
      logger.error({ error }, 'Supabase getPlayers error');
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      rating: row.rating,
      position: row.position,
      club: row.club,
      nationality: row.nationality,
      photoUrl: row.photo_url || row.photoUrl || '',
      basePrice: row.base_price || row.basePrice || 1,
      status: row.status,
    }));
  }

  async getPlayerById(id: string): Promise<Player | null> {
    const { data, error } = await this.supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      rating: data.rating,
      position: data.position,
      club: data.club,
      nationality: data.nationality,
      photoUrl: data.photo_url || data.photoUrl || '',
      basePrice: data.base_price || data.basePrice || 1,
      status: data.status,
    };
  }

  async updatePlayerStatus(id: string, status: PlayerStatus): Promise<void> {
    const { error } = await this.supabase
      .from('players')
      .update({ status })
      .eq('id', id);

    if (error) {
      logger.error({ error, id, status }, 'Supabase updatePlayerStatus error');
    }
  }

  async seedPlayers(players: Player[]): Promise<void> {
    const rows = players.map((p) => ({
      id: p.id,
      name: p.name,
      rating: p.rating,
      position: p.position,
      club: p.club,
      nationality: p.nationality,
      photo_url: p.photoUrl,
      base_price: p.basePrice,
      status: p.status || 'available',
    }));
    await this.supabase.from('players').upsert(rows);
  }
}

export class SupabaseRoomRepository implements IRoomRepository {
  constructor(private supabase: SupabaseClient) {}

  async createRoom(room: RoomData): Promise<void> {
    const { error } = await this.supabase.from('rooms').insert({
      id: room.id,
      code: room.code,
      host_id: room.hostId,
      host_token: room.hostToken,
      settings: room.settings,
      auction_phase: room.auctionState.phase,
      current_round: room.auctionState.currentRound,
      created_at: new Date(room.createdAt).toISOString(),
    });
    if (error) logger.error({ error }, 'Supabase createRoom error');
  }

  async getRoomByCode(code: string): Promise<RoomData | null> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !data) return null;
    return this.mapToRoomData(data);
  }

  async getRoomById(id: string): Promise<RoomData | null> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToRoomData(data);
  }

  async updateRoom(room: RoomData): Promise<void> {
    const { error } = await this.supabase
      .from('rooms')
      .update({
        auction_phase: room.auctionState.phase,
        current_round: room.auctionState.currentRound,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id);

    if (error) logger.error({ error }, 'Supabase updateRoom error');
  }

  async deleteRoom(id: string): Promise<void> {
    await this.supabase.from('rooms').delete().eq('id', id);
  }

  private mapToRoomData(row: any): RoomData {
    return {
      id: row.id,
      code: row.code,
      hostId: row.host_id,
      hostToken: row.host_token,
      settings: row.settings,
      participants: new Map(),
      squads: new Map(),
      playerPool: [],
      auctionState: {
        currentRound: row.current_round || 0,
        phase: row.auction_phase || 'LOBBY',
        currentPlayer: null,
        bids: {},
        roundLocked: false,
        lastRevealResult: null,
        playerSequence: [],
        currentPlayerIndex: 0,
        history: [],
      },
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at || row.created_at).getTime(),
    };
  }
}

export class SupabaseBidRepository implements IBidRepository {
  constructor(private supabase: SupabaseClient) {}

  async saveBid(roomId: string, round: number, bid: SealedBid): Promise<void> {
    const { error } = await this.supabase.from('bids').insert({
      room_id: roomId,
      round,
      participant_id: bid.participantId,
      squad_id: bid.squadId,
      squad_name: bid.squadName,
      amount: bid.amount,
      submitted_at: new Date(bid.submittedAt).toISOString(),
    });
    if (error) logger.error({ error }, 'Supabase saveBid error');
  }

  async getBidsForRound(roomId: string, round: number): Promise<SealedBid[]> {
    const { data, error } = await this.supabase
      .from('bids')
      .select('*')
      .eq('room_id', roomId)
      .eq('round', round);

    if (error || !data) return [];
    return data.map((b: any) => ({
      participantId: b.participant_id,
      squadId: b.squad_id,
      squadName: b.squad_name,
      amount: b.amount,
      submittedAt: new Date(b.submitted_at).getTime(),
    }));
  }
}

export class SupabaseTeamRepository implements ITeamRepository {
  constructor(private supabase: SupabaseClient) {}

  async saveSquad(roomId: string, squad: Squad): Promise<void> {
    const { error } = await this.supabase.from('squads').upsert({
      id: squad.id,
      room_id: roomId,
      participant_id: squad.participantId,
      owner_name: squad.ownerName,
      squad_name: squad.squadName,
      budget: squad.budget,
      starting_budget: squad.startingBudget,
      spent: squad.spent,
      is_ready: squad.isReady,
    });
    if (error) logger.error({ error }, 'Supabase saveSquad error');
  }

  async getSquadsByRoomId(roomId: string): Promise<Squad[]> {
    const { data, error } = await this.supabase
      .from('squads')
      .select('*, rosters(*)')
      .eq('room_id', roomId);

    if (error || !data) return [];
    return data.map((s: any) => ({
      id: s.id,
      participantId: s.participant_id,
      ownerName: s.owner_name,
      squadName: s.squad_name,
      budget: s.budget,
      startingBudget: s.starting_budget,
      spent: s.spent,
      isReady: s.is_ready,
      roster: (s.rosters || []).map((r: any) => ({
        player: r.player,
        amount: r.amount,
        round: r.round,
        timestamp: new Date(r.created_at).getTime(),
      })),
    }));
  }

  async updateSquadBudget(squadId: string, newBudget: number, spent: number): Promise<void> {
    const { error } = await this.supabase
      .from('squads')
      .update({ budget: newBudget, spent })
      .eq('id', squadId);
    if (error) logger.error({ error }, 'Supabase updateSquadBudget error');
  }

  async addPlayerToRoster(squadId: string, purchase: PlayerPurchase): Promise<void> {
    const { error } = await this.supabase.from('rosters').insert({
      squad_id: squadId,
      player_id: purchase.player.id,
      player: purchase.player,
      amount: purchase.amount,
      round: purchase.round,
      created_at: new Date(purchase.timestamp).toISOString(),
    });
    if (error) logger.error({ error }, 'Supabase addPlayerToRoster error');
  }
}

export class SupabaseAuctionRepository implements IAuctionRepository {
  constructor(private supabase: SupabaseClient) {}

  async saveRoundHistory(roomId: string, history: RoundHistory): Promise<void> {
    const { error } = await this.supabase.from('round_history').insert({
      room_id: roomId,
      round: history.round,
      player: history.player,
      winner_squad_id: history.winnerSquadId,
      winner_squad_name: history.winnerSquadName,
      winning_bid: history.winningBid,
      bids: history.bids,
      tie_break: history.tieBreak,
      created_at: new Date(history.timestamp).toISOString(),
    });
    if (error) logger.error({ error }, 'Supabase saveRoundHistory error');
  }

  async getAuctionHistory(roomId: string): Promise<RoundHistory[]> {
    const { data, error } = await this.supabase
      .from('round_history')
      .select('*')
      .eq('room_id', roomId)
      .order('round', { ascending: true });

    if (error || !data) return [];
    return data.map((r: any) => ({
      round: r.round,
      player: r.player,
      winnerSquadId: r.winner_squad_id,
      winnerSquadName: r.winner_squad_name,
      winningBid: r.winning_bid,
      bids: r.bids || [],
      tieBreak: r.tie_break,
      timestamp: new Date(r.created_at).getTime(),
    }));
  }
}
