import { env } from '../config/env.js';
export * from './interfaces.js';
import {
  IPlayerRepository,
  IRoomRepository,
  IBidRepository,
  ITeamRepository,
  IAuctionRepository,
} from './interfaces.js';
import {
  InMemoryPlayerRepository,
  InMemoryRoomRepository,
  InMemoryBidRepository,
  InMemoryTeamRepository,
  InMemoryAuctionRepository,
} from './memory/InMemoryDatabase.js';
import {
  SupabaseClientFactory,
  SupabasePlayerRepository,
  SupabaseRoomRepository,
  SupabaseBidRepository,
  SupabaseTeamRepository,
  SupabaseAuctionRepository,
} from './supabase/SupabaseRepositories.js';
import { logger } from '../utils/logger.js';

export interface Repositories {
  players: IPlayerRepository;
  rooms: IRoomRepository;
  bids: IBidRepository;
  teams: ITeamRepository;
  auctions: IAuctionRepository;
}

export function createRepositories(): Repositories {
  const supabase = SupabaseClientFactory.getClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (supabase) {
    logger.info('Using Supabase database repositories');
    return {
      players: new SupabasePlayerRepository(supabase),
      rooms: new SupabaseRoomRepository(supabase),
      bids: new SupabaseBidRepository(supabase),
      teams: new SupabaseTeamRepository(supabase),
      auctions: new SupabaseAuctionRepository(supabase),
    };
  }

  logger.info('Using In-Memory database repositories (Standalone / Test Mode)');
  return {
    players: new InMemoryPlayerRepository(),
    rooms: new InMemoryRoomRepository(),
    bids: new InMemoryBidRepository(),
    teams: new InMemoryTeamRepository(),
    auctions: new InMemoryAuctionRepository(),
  };
}

export const defaultRepositories = createRepositories();
