-- Migration 001: Initial Schema
-- Sealed-Bid Football Auction - Complete table structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends Supabase Auth)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. PLAYERS (master football player database)
-- ============================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  overall_rating INTEGER NOT NULL,
  position TEXT NOT NULL,
  position_group TEXT NOT NULL,
  nationality TEXT,
  club TEXT,
  photo_url TEXT,
  external_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_overall_rating CHECK (overall_rating BETWEEN 1 AND 99),
  CONSTRAINT chk_position CHECK (position IN ('GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LM','RM','LW','RW','ST','CF')),
  CONSTRAINT chk_position_group CHECK (position_group IN ('GK','DEF','MID','WING','ST'))
);

-- ============================================
-- 3. AUCTION SESSIONS
-- ============================================
CREATE TABLE auction_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  auction_name TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  starting_budget NUMERIC(12,2) NOT NULL,
  min_bid NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'LOBBY',
  current_player_id UUID NULL,
  current_round INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_starting_budget CHECK (starting_budget > 0),
  CONSTRAINT chk_min_bid CHECK (min_bid >= 0),
  CONSTRAINT chk_max_participants CHECK (max_participants BETWEEN 9 AND 12),
  CONSTRAINT chk_session_status CHECK (status IN ('LOBBY','STARTING','BIDDING','REVEALING','COMPLETED','ENDED')),
  CONSTRAINT chk_current_round CHECK (current_round >= 0)
);

ALTER TABLE auction_sessions
  ADD CONSTRAINT fk_current_player
  FOREIGN KEY (current_player_id) REFERENCES players(id) ON DELETE SET NULL;

-- ============================================
-- 4. AUCTION PARTICIPANTS
-- ============================================
CREATE TABLE auction_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  squad_name TEXT NOT NULL,
  squad_badge_url TEXT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  connection_status TEXT NOT NULL DEFAULT 'DISCONNECTED',
  starting_budget NUMERIC(12,2) NOT NULL,
  remaining_budget NUMERIC(12,2) NOT NULL,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_participant_starting_budget CHECK (starting_budget > 0),
  CONSTRAINT chk_participant_remaining_budget CHECK (remaining_budget >= 0),
  CONSTRAINT chk_participant_total_spent CHECK (total_spent >= 0),
  CONSTRAINT chk_connection_status CHECK (connection_status IN ('CONNECTED','DISCONNECTED','RECONNECTING')),
  CONSTRAINT uq_auction_squad_name UNIQUE (auction_id, squad_name)
);

-- ============================================
-- 5. AUCTION PLAYER QUEUE
-- ============================================
CREATE TABLE auction_player_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  selected_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_sequence_number CHECK (sequence_number > 0),
  CONSTRAINT chk_queue_status CHECK (status IN ('QUEUED','ACTIVE','SOLD','UNSOLD','SKIPPED')),
  CONSTRAINT uq_auction_sequence UNIQUE (auction_id, sequence_number),
  CONSTRAINT uq_auction_player UNIQUE (auction_id, player_id)
);

-- ============================================
-- 6. AUCTION ROUNDS
-- ============================================
CREATE TABLE auction_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'BIDDING',
  minimum_bid NUMERIC(12,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bidding_locked_at TIMESTAMPTZ NULL,
  revealed_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  force_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  winner_participant_id UUID NULL REFERENCES auction_participants(id) ON DELETE SET NULL,
  winning_bid NUMERIC(12,2) NULL,
  tie_break_used BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_round_number CHECK (round_number > 0),
  CONSTRAINT chk_minimum_bid CHECK (minimum_bid >= 0),
  CONSTRAINT chk_winning_bid CHECK (winning_bid IS NULL OR winning_bid >= 0),
  CONSTRAINT chk_round_status CHECK (status IN ('BIDDING','LOCKED','REVEALED','COMPLETED','UNSOLD')),
  CONSTRAINT uq_auction_round_number UNIQUE (auction_id, round_number)
);

-- ============================================
-- 7. BIDS (sealed/secret bids)
-- ============================================
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_round_id UUID NOT NULL REFERENCES auction_rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auction_participants(id) ON DELETE CASCADE,
  bid_amount NUMERIC(12,2) NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  rejection_reason TEXT NULL,
  CONSTRAINT chk_bid_amount CHECK (bid_amount >= 0),
  CONSTRAINT uq_round_participant_bid UNIQUE (auction_round_id, participant_id)
);

-- ============================================
-- 8. BID REVEAL RECORDS
-- ============================================
CREATE TABLE bid_reveal_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_round_id UUID UNIQUE NOT NULL REFERENCES auction_rounds(id) ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  winner_participant_id UUID NULL REFERENCES auction_participants(id) ON DELETE SET NULL,
  winning_bid NUMERIC(12,2) NULL,
  tie_break_used BOOLEAN NOT NULL DEFAULT FALSE,
  tie_break_metadata JSONB NULL,
  reveal_reason TEXT NULL,
  CONSTRAINT chk_reveal_winning_bid CHECK (winning_bid IS NULL OR winning_bid >= 0),
  CONSTRAINT chk_reveal_reason CHECK (reveal_reason IS NULL OR reveal_reason IN ('ALL_BIDS_SUBMITTED','HOST_FORCE_REVEAL'))
);

-- ============================================
-- 9. PLAYER PURCHASES
-- ============================================
CREATE TABLE player_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  auction_round_id UUID UNIQUE NOT NULL REFERENCES auction_rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auction_participants(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  purchase_price NUMERIC(12,2) NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_purchase_price CHECK (purchase_price >= 0),
  CONSTRAINT uq_auction_player_purchase UNIQUE (auction_id, player_id)
);

-- ============================================
-- 10. SQUAD ROSTERS
-- ============================================
CREATE TABLE squad_rosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auction_participants(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES player_purchases(id) ON DELETE CASCADE,
  purchase_price NUMERIC(12,2) NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_roster_purchase_price CHECK (purchase_price >= 0),
  CONSTRAINT uq_auction_roster_player UNIQUE (auction_id, player_id)
);

-- ============================================
-- 11. AUCTION TRANSACTIONS (immutable ledger)
-- ============================================
CREATE TABLE auction_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auction_participants(id) ON DELETE CASCADE,
  auction_round_id UUID NULL REFERENCES auction_rounds(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_transaction_type CHECK (transaction_type IN ('STARTING_BUDGET','PLAYER_PURCHASE','ADJUSTMENT','REFUND')),
  CONSTRAINT chk_balance_before CHECK (balance_before >= 0),
  CONSTRAINT chk_balance_after CHECK (balance_after >= 0)
);

-- ============================================
-- 12. AUCTION AUDIT LOG
-- ============================================
CREATE TABLE auction_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  auction_round_id UUID NULL REFERENCES auction_rounds(id) ON DELETE SET NULL,
  participant_id UUID NULL REFERENCES auction_participants(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_event_type CHECK (event_type IN (
    'ROOM_CREATED','PARTICIPANT_JOINED','PARTICIPANT_LEFT',
    'AUCTION_STARTED','PLAYER_SELECTED','BID_SUBMITTED',
    'BIDDING_LOCKED','FORCE_REVEAL','REVEAL_COMPLETED',
    'TIE_BREAK','PLAYER_SOLD','BUDGET_UPDATED',
    'NEXT_PLAYER','AUCTION_COMPLETED','AUCTION_ENDED'
  ))
);
