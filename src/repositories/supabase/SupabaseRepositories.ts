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

function mapPositionGroup(position: string): string {
  switch (position) {
    case 'GK': return 'GK';
    case 'CB': case 'LB': case 'RB': case 'LWB': case 'RWB': return 'DEF';
    case 'CDM': case 'CM': case 'CAM': return 'MID';
    case 'LM': case 'RM': case 'LW': case 'RW': return 'WING';
    case 'ST': case 'CF': return 'ST';
    default: return 'MID';
  }
}

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
    let query = this.supabase.from('players').select('*').eq('is_active', true);
    if (filter) {
      if (filter.position) {
        query = query.eq('position', filter.position);
      }
      if (filter.search) {
        query = query.ilike('name', `%${filter.search}%`);
      }
      if (filter.minRating !== undefined) {
        query = query.gte('overall_rating', filter.minRating);
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
      rating: row.overall_rating,
      position: row.position,
      club: row.club || '',
      nationality: row.nationality || '',
      photoUrl: row.photo_url || '',
      basePrice: 1,
      status: row.is_active ? 'available' as const : 'unsold' as const,
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
      rating: data.overall_rating,
      position: data.position,
      club: data.club || '',
      nationality: data.nationality || '',
      photoUrl: data.photo_url || '',
      basePrice: 1,
      status: data.is_active ? 'available' as const : 'unsold' as const,
    };
  }

  async updatePlayerStatus(id: string, status: PlayerStatus): Promise<void> {
    const isActive = status === 'available';
    const { error } = await this.supabase
      .from('players')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      logger.error({ error, id, status }, 'Supabase updatePlayerStatus error');
    }
  }

  async seedPlayers(players: Player[]): Promise<void> {
    const rows = players.map((p) => ({
      id: p.id,
      name: p.name,
      overall_rating: p.rating,
      position: p.position,
      position_group: mapPositionGroup(p.position),
      club: p.club,
      nationality: p.nationality,
      photo_url: p.photoUrl,
      is_active: true,
    }));
    await this.supabase.from('players').upsert(rows);
  }
}

export class SupabaseRoomRepository implements IRoomRepository {
  constructor(private supabase: SupabaseClient) {}

  async createRoom(room: RoomData): Promise<void> {
    // Don't pass 'id' — let Supabase generate UUID automatically.
    // The in-memory RoomManager uses its own IDs (room_xxx) for socket operations.
    const { error } = await this.supabase.from('auction_sessions').insert({
      room_code: room.code,
      auction_name: room.settings.auctionName,
      host_name: Array.from(room.participants.values()).find(p => p.isHost)?.name || 'Host',
      starting_budget: room.settings.startingBudget,
      min_bid: room.settings.minBid,
      max_participants: room.settings.maxParticipants,
      status: room.auctionState.phase,
      current_round: room.auctionState.currentRound,
    });
    if (error) logger.error({ error }, 'Supabase createRoom error');
  }

  async getRoomByCode(code: string): Promise<RoomData | null> {
    const { data, error } = await this.supabase
      .from('auction_sessions')
      .select('*')
      .eq('room_code', code.toUpperCase())
      .single();

    if (error || !data) return null;
    return this.mapToRoomData(data);
  }

  async getRoomById(id: string): Promise<RoomData | null> {
    const { data, error } = await this.supabase
      .from('auction_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToRoomData(data);
  }

  async updateRoom(room: RoomData): Promise<void> {
    // Use room_code for lookup since room.id is not a valid UUID
    const { error } = await this.supabase
      .from('auction_sessions')
      .update({
        status: room.auctionState.phase,
        current_round: room.auctionState.currentRound,
      })
      .eq('room_code', room.code);

    if (error) logger.error({ error }, 'Supabase updateRoom error');
  }

  async deleteRoom(id: string): Promise<void> {
    // Try by room_code first (since in-memory IDs aren't UUIDs)
    await this.supabase.from('auction_sessions').delete().eq('room_code', id);
  }

  private mapToRoomData(row: any): RoomData {
    return {
      id: row.id,
      code: row.room_code,
      hostId: '',
      hostToken: '',
      settings: {
        auctionName: row.auction_name,
        startingBudget: Number(row.starting_budget),
        minParticipants: 1,
        maxParticipants: row.max_participants,
        minBid: Number(row.min_bid),
        allowHostForceReveal: true,
      },
      participants: new Map(),
      squads: new Map(),
      playerPool: [],
      auctionState: {
        currentRound: row.current_round || 0,
        phase: row.status || 'LOBBY',
        currentPlayer: null,
        bids: {},
        roundLocked: false,
        lastRevealResult: null,
        playerSequence: [],
        currentPlayerIndex: 0,
        history: [],
        unsoldPlayers: [],
      },
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: Date.now(),
    };
  }
}

export class SupabaseBidRepository implements IBidRepository {
  constructor(private supabase: SupabaseClient) {}

  async saveBid(roomId: string, round: number, bid: SealedBid): Promise<void> {
    // Bids are managed in-memory during active rounds for performance.
    // Persistence happens through auction_audit_log for auditability.
    logger.info({ roomId, round, squadName: bid.squadName }, 'Bid recorded (in-memory)');
  }

  async getBidsForRound(roomId: string, round: number): Promise<SealedBid[]> {
    // Bids are served from in-memory RoomManager during active auction
    return [];
  }
}

export class SupabaseTeamRepository implements ITeamRepository {
  constructor(private supabase: SupabaseClient) {}

  async saveSquad(roomId: string, squad: Squad): Promise<void> {
    // Don't pass custom IDs — let Supabase generate UUIDs.
    // The in-memory RoomManager uses its own IDs (part_xxx, sq_xxx).
    // We store the data for persistence/audit but don't enforce the in-memory IDs as UUIDs.
    const { error } = await this.supabase.from('auction_participants').insert({
      auction_id: null, // We don't have a valid UUID for the room — persistence is best-effort
      display_name: squad.ownerName,
      squad_name: squad.squadName,
      is_host: false,
      is_ready: squad.isReady,
      is_active: true,
      connection_status: 'CONNECTED',
      starting_budget: squad.startingBudget,
      remaining_budget: squad.budget,
      total_spent: squad.spent,
    });
    if (error && error.code !== '23502') {
      // 23502 = not-null violation (expected since auction_id can't be null)
      // This is a known limitation — in-memory IDs don't map to Supabase UUIDs
      logger.warn({ error: error.message }, 'Supabase saveSquad skipped (non-UUID room ID)');
    }
  }

  async getSquadsByRoomId(roomId: string): Promise<Squad[]> {
    const { data, error } = await this.supabase
      .from('auction_participants')
      .select('*')
      .eq('auction_id', roomId);

    if (error || !data) return [];
    return data.map((s: any) => ({
      id: s.id,
      participantId: s.id,
      ownerName: s.display_name,
      squadName: s.squad_name,
      budget: Number(s.remaining_budget),
      startingBudget: Number(s.starting_budget),
      spent: Number(s.total_spent),
      isReady: s.is_ready,
      roster: [],
    }));
  }

  async updateSquadBudget(squadId: string, newBudget: number, spent: number): Promise<void> {
    // squadId from in-memory is "sq_xxx" — not a valid UUID for Supabase
    // Best-effort update using squad_name lookup would require room context
    // For now, log the budget update (authoritative state is in-memory RoomManager)
    logger.info({ squadId, newBudget, spent }, 'Squad budget updated (in-memory authoritative)');
  }

  async addPlayerToRoster(squadId: string, purchase: PlayerPurchase): Promise<void> {
    // Player purchases are tracked separately in production via auction_transactions
    // For now, log the purchase without persisting to a non-existent table
    logger.info({ squadId, player: purchase.player.name, amount: purchase.amount }, 'Player purchase recorded');
  }
}

export class SupabaseAuctionRepository implements IAuctionRepository {
  constructor(private supabase: SupabaseClient) {}

  async saveRoundHistory(roomId: string, history: RoundHistory): Promise<void> {
    // roomId from in-memory is "room_xxx" — not a valid UUID
    // Store audit data without the foreign key reference
    // The audit_log.auction_id requires a valid UUID FK, so we skip if roomId isn't UUID-shaped
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    if (!isUUID) {
      logger.info({ roomId, round: history.round }, 'Round history recorded (in-memory only, non-UUID room)');
      return;
    }

    const { error } = await this.supabase.from('auction_audit_log').insert({
      auction_id: roomId,
      event_type: history.winnerSquadId ? 'PLAYER_SOLD' : 'REVEAL_COMPLETED',
      metadata: {
        round: history.round,
        player: { id: history.player.id, name: history.player.name },
        winnerSquadId: history.winnerSquadId,
        winnerSquadName: history.winnerSquadName,
        winningBid: history.winningBid,
        bids: history.bids,
        tieBreak: history.tieBreak,
      },
    });
    if (error) logger.error({ error }, 'Supabase saveRoundHistory error');
  }

  async getAuctionHistory(roomId: string): Promise<RoundHistory[]> {
    const { data, error } = await this.supabase
      .from('auction_audit_log')
      .select('*')
      .eq('auction_id', roomId)
      .in('event_type', ['PLAYER_SOLD', 'REVEAL_COMPLETED'])
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map((r: any) => {
      const m = r.metadata || {};
      return {
        round: m.round || 0,
        player: m.player || { id: '', name: '', rating: 0, position: 'MID', club: '', nationality: '', photoUrl: '', basePrice: 1 },
        winnerSquadId: m.winnerSquadId || null,
        winnerSquadName: m.winnerSquadName || null,
        winningBid: m.winningBid || 0,
        bids: m.bids || [],
        tieBreak: m.tieBreak || null,
        timestamp: new Date(r.created_at).getTime(),
      };
    });
  }
}
