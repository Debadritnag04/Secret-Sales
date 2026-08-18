# Database Documentation

## Sealed-Bid Football Auction — Supabase PostgreSQL

**Project:** secret-sales-auction  
**Region:** ap-south-1 (Mumbai)  
**Project ID:** `nsshjxeavwvxovoxtsio`  
**Database:** PostgreSQL 17.6  

---

## Architecture Overview

```
React Frontend
     ↓
Node.js + Fastify + Socket.IO (Antigravity)
     ↓
Auction Engine + Repository Interface
     ↓
Supabase Repository (service_role key)
     ↓
Supabase PostgreSQL
```

The backend uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS.  
The frontend NEVER directly modifies auction state, bids, budgets, or rosters.

---

## ER Diagram

```
┌─────────────────────┐
│   auction_sessions  │
│─────────────────────│
│ id (PK)             │
│ room_code (UNIQUE)  │
│ auction_name        │
│ host_name           │
│ host_user_id → auth │
│ starting_budget     │
│ min_bid             │
│ max_participants    │
│ status              │
│ current_player_id → │──→ players
│ current_round       │
│ created_at          │
│ started_at          │
│ completed_at        │
│ ended_at            │
└─────────┬───────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────┐     ┌─────────────────────┐
│  auction_participants   │     │       players        │
│─────────────────────────│     │─────────────────────│
│ id (PK)                 │     │ id (PK)             │
│ auction_id → sessions   │     │ name                │
│ display_name            │     │ overall_rating      │
│ squad_name              │     │ position            │
│ is_host                 │     │ position_group      │
│ is_active               │     │ nationality         │
│ connection_status       │     │ club                │
│ starting_budget         │     │ photo_url           │
│ remaining_budget        │     │ external_id         │
│ total_spent             │     │ is_active           │
└─────────┬───────────────┘     └──────────┬──────────┘
          │                                │
          │                                │
          ▼                                ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│     auction_rounds       │   │  auction_player_queue   │
│──────────────────────────│   │─────────────────────────│
│ id (PK)                  │   │ id (PK)                 │
│ auction_id → sessions    │   │ auction_id → sessions   │
│ round_number             │   │ player_id → players     │
│ player_id → players      │   │ sequence_number         │
│ status                   │   │ status                  │
│ minimum_bid              │   │ selected_at             │
│ force_revealed           │   │ completed_at            │
│ winner_participant_id →  │   └─────────────────────────┘
│ winning_bid              │
│ tie_break_used           │
└──────────┬───────────────┘
           │
     ┌─────┼──────────────┐
     │     │              │
     ▼     ▼              ▼
┌────────┐ ┌───────────┐ ┌──────────────────┐
│  bids  │ │bid_reveal │ │player_purchases  │
│────────│ │_records   │ │──────────────────│
│ id     │ │───────────│ │ id (PK)          │
│ round→ │ │ id (PK)   │ │ auction_id →     │
│ part→  │ │ round→    │ │ round_id → (UQ)  │
│ amount │ │ winner→   │ │ participant_id → │
│ valid  │ │ win_bid   │ │ player_id →      │
│        │ │ tie_break │ │ purchase_price   │
│  (UQ:  │ │ reason    │ └────────┬─────────┘
│  round │ └───────────┘          │
│  +part)│                        ▼
└────────┘              ┌──────────────────┐
                        │  squad_rosters   │
                        │──────────────────│
                        │ id (PK)          │
                        │ auction_id →     │
                        │ participant_id → │
                        │ player_id →      │
                        │ purchase_id →    │
                        │ purchase_price   │
                        └──────────────────┘

┌─────────────────────────┐   ┌─────────────────────────┐
│  auction_transactions   │   │   auction_audit_log     │
│─────────────────────────│   │─────────────────────────│
│ id (PK)                 │   │ id (PK)                 │
│ auction_id → sessions   │   │ auction_id → sessions   │
│ participant_id → parts  │   │ auction_round_id →      │
│ auction_round_id →      │   │ participant_id →        │
│ transaction_type        │   │ event_type              │
│ amount                  │   │ metadata (JSONB)        │
│ balance_before          │   │ created_at              │
│ balance_after           │   └─────────────────────────┘
│ description             │
│ IMMUTABLE (no UPDATE)   │
└─────────────────────────┘

┌─────────────────────────┐
│       profiles          │
│─────────────────────────│
│ id (PK) → auth.users   │
│ display_name            │
│ avatar_url              │
│ created_at              │
│ updated_at              │
└─────────────────────────┘
```

---

## Tables

### 1. `players`

Master football player database.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() |
| name | TEXT | NOT NULL |
| overall_rating | INTEGER | NOT NULL, CHECK 1-99 |
| position | TEXT | NOT NULL, CHECK IN (GK,CB,LB,RB,LWB,RWB,CDM,CM,CAM,LM,RM,LW,RW,ST,CF) |
| position_group | TEXT | NOT NULL, CHECK IN (GK,DEF,MID,WING,ST) |
| nationality | TEXT | nullable |
| club | TEXT | nullable |
| photo_url | TEXT | nullable |
| external_id | TEXT | nullable |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() (auto-trigger) |

**Position Group Mapping:**
| Position | Group |
|----------|-------|
| GK | GK |
| CB, LB, RB, LWB, RWB | DEF |
| CDM, CM, CAM | MID |
| LM, RM, LW, RW | WING |
| ST, CF | ST |

---

### 2. `auction_sessions`

Represents one complete auction room/session.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| room_code | TEXT | UNIQUE, NOT NULL |
| auction_name | TEXT | NOT NULL |
| host_name | TEXT | NOT NULL |
| host_user_id | UUID | nullable, FK → auth.users |
| starting_budget | NUMERIC(12,2) | NOT NULL, CHECK > 0 |
| min_bid | NUMERIC(12,2) | NOT NULL, DEFAULT 0, CHECK >= 0 |
| max_participants | INTEGER | NOT NULL, CHECK 9-12 |
| status | TEXT | NOT NULL, DEFAULT 'LOBBY', CHECK IN values |
| current_player_id | UUID | nullable, FK → players |
| current_round | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| started_at | TIMESTAMPTZ | nullable |
| completed_at | TIMESTAMPTZ | nullable |
| ended_at | TIMESTAMPTZ | nullable |

**Status values:** `LOBBY`, `STARTING`, `BIDDING`, `REVEALING`, `COMPLETED`, `ENDED`

---

### 3. `auction_participants`

Users/squads participating in an auction.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_id | UUID | NOT NULL, FK → auction_sessions ON DELETE CASCADE |
| display_name | TEXT | NOT NULL |
| squad_name | TEXT | NOT NULL |
| squad_badge_url | TEXT | nullable |
| is_host | BOOLEAN | NOT NULL, DEFAULT FALSE |
| is_ready | BOOLEAN | NOT NULL, DEFAULT FALSE |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |
| connection_status | TEXT | NOT NULL, DEFAULT 'DISCONNECTED', CHECK IN values |
| starting_budget | NUMERIC(12,2) | NOT NULL, CHECK > 0 |
| remaining_budget | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| total_spent | NUMERIC(12,2) | NOT NULL, DEFAULT 0, CHECK >= 0 |
| joined_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| last_seen_at | TIMESTAMPTZ | nullable |

**Unique constraint:** `(auction_id, squad_name)`  
**Connection status values:** `CONNECTED`, `DISCONNECTED`, `RECONNECTING`

---

### 4. `auction_player_queue`

Stable player sequence for each auction (backend-generated).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_id | UUID | NOT NULL, FK → auction_sessions ON DELETE CASCADE |
| player_id | UUID | NOT NULL, FK → players ON DELETE CASCADE |
| sequence_number | INTEGER | NOT NULL, CHECK > 0 |
| status | TEXT | NOT NULL, DEFAULT 'QUEUED', CHECK IN values |
| selected_at | TIMESTAMPTZ | nullable |
| completed_at | TIMESTAMPTZ | nullable |

**Unique constraints:** `(auction_id, sequence_number)`, `(auction_id, player_id)`  
**Status values:** `QUEUED`, `ACTIVE`, `SOLD`, `UNSOLD`, `SKIPPED`

---

### 5. `auction_rounds`

Each player auction round.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_id | UUID | NOT NULL, FK → auction_sessions ON DELETE CASCADE |
| round_number | INTEGER | NOT NULL, CHECK > 0 |
| player_id | UUID | NOT NULL, FK → players ON DELETE CASCADE |
| status | TEXT | NOT NULL, DEFAULT 'BIDDING', CHECK IN values |
| minimum_bid | NUMERIC(12,2) | NOT NULL, DEFAULT 0, CHECK >= 0 |
| started_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| bidding_locked_at | TIMESTAMPTZ | nullable |
| revealed_at | TIMESTAMPTZ | nullable |
| completed_at | TIMESTAMPTZ | nullable |
| force_revealed | BOOLEAN | NOT NULL, DEFAULT FALSE |
| winner_participant_id | UUID | nullable, FK → auction_participants |
| winning_bid | NUMERIC(12,2) | nullable, CHECK >= 0 |
| tie_break_used | BOOLEAN | NOT NULL, DEFAULT FALSE |

**Unique constraint:** `(auction_id, round_number)`  
**Status values:** `BIDDING`, `LOCKED`, `REVEALED`, `COMPLETED`, `UNSOLD`  
**No timer/deadline column.** Backend determines bidding close.

---

### 6. `bids`

Sealed/secret bids. **Most sensitive table.**

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_round_id | UUID | NOT NULL, FK → auction_rounds ON DELETE CASCADE |
| participant_id | UUID | NOT NULL, FK → auction_participants ON DELETE CASCADE |
| bid_amount | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| submitted_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| is_valid | BOOLEAN | NOT NULL, DEFAULT TRUE |
| rejection_reason | TEXT | nullable |

**Unique constraint:** `(auction_round_id, participant_id)` — one bid per participant per round  
**Immutability trigger:** bid_amount, participant_id, and auction_round_id cannot be changed after insert.

---

### 7. `bid_reveal_records`

Result of a completed round (historical record).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_round_id | UUID | UNIQUE, NOT NULL, FK → auction_rounds |
| revealed_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| winner_participant_id | UUID | nullable, FK → auction_participants |
| winning_bid | NUMERIC(12,2) | nullable, CHECK >= 0 |
| tie_break_used | BOOLEAN | NOT NULL, DEFAULT FALSE |
| tie_break_metadata | JSONB | nullable |
| reveal_reason | TEXT | nullable, CHECK IN (ALL_BIDS_SUBMITTED, HOST_FORCE_REVEAL) |

---

### 8. `player_purchases`

Completed player sale records.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_id | UUID | NOT NULL, FK → auction_sessions ON DELETE CASCADE |
| auction_round_id | UUID | UNIQUE, NOT NULL, FK → auction_rounds |
| participant_id | UUID | NOT NULL, FK → auction_participants |
| player_id | UUID | NOT NULL, FK → players |
| purchase_price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| purchased_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Unique constraints:** `auction_round_id` (one sale per round), `(auction_id, player_id)` (player sold once per auction)

---

### 9. `squad_rosters`

Players currently owned by a squad.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_id | UUID | NOT NULL, FK → auction_sessions ON DELETE CASCADE |
| participant_id | UUID | NOT NULL, FK → auction_participants |
| player_id | UUID | NOT NULL, FK → players |
| purchase_id | UUID | NOT NULL, FK → player_purchases |
| purchase_price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| acquired_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Unique constraint:** `(auction_id, player_id)` — one owner per player per auction

---

### 10. `auction_transactions`

Immutable financial ledger. **Cannot be updated or deleted** (enforced by trigger).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_id | UUID | NOT NULL, FK → auction_sessions ON DELETE CASCADE |
| participant_id | UUID | NOT NULL, FK → auction_participants |
| auction_round_id | UUID | nullable, FK → auction_rounds |
| transaction_type | TEXT | NOT NULL, CHECK IN values |
| amount | NUMERIC(12,2) | NOT NULL |
| balance_before | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| balance_after | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| description | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Transaction types:** `STARTING_BUDGET`, `PLAYER_PURCHASE`, `ADJUSTMENT`, `REFUND`

---

### 11. `auction_audit_log`

Append-only audit trail. **Cannot be updated or deleted** (enforced by trigger).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| auction_id | UUID | NOT NULL, FK → auction_sessions ON DELETE CASCADE |
| auction_round_id | UUID | nullable, FK → auction_rounds |
| participant_id | UUID | nullable, FK → auction_participants |
| event_type | TEXT | NOT NULL, CHECK IN values |
| metadata | JSONB | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Event types:** `ROOM_CREATED`, `PARTICIPANT_JOINED`, `PARTICIPANT_LEFT`, `AUCTION_STARTED`, `PLAYER_SELECTED`, `BID_SUBMITTED`, `BIDDING_LOCKED`, `FORCE_REVEAL`, `REVEAL_COMPLETED`, `TIE_BREAK`, `PLAYER_SOLD`, `BUDGET_UPDATED`, `NEXT_PLAYER`, `AUCTION_COMPLETED`, `AUCTION_ENDED`

---

### 12. `profiles`

Extends Supabase Auth users.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, FK → auth.users ON DELETE CASCADE |
| display_name | TEXT | nullable |
| avatar_url | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() (auto-trigger) |

---

## Indexes

| Table | Index | Columns |
|-------|-------|---------|
| players | idx_players_position | position |
| players | idx_players_position_group | position_group |
| players | idx_players_overall_rating | overall_rating DESC |
| players | idx_players_name | name |
| players | idx_players_is_active | is_active (WHERE TRUE) |
| players | idx_players_external_id | external_id (WHERE NOT NULL) |
| auction_sessions | idx_auction_sessions_status | status |
| auction_sessions | idx_auction_sessions_host_user_id | host_user_id (WHERE NOT NULL) |
| auction_participants | idx_auction_participants_auction_id | auction_id |
| auction_participants | idx_auction_participants_auction_active | auction_id, is_active (WHERE TRUE) |
| auction_player_queue | idx_auction_player_queue_auction_seq | auction_id, sequence_number |
| auction_player_queue | idx_auction_player_queue_auction_status | auction_id, status |
| auction_rounds | idx_auction_rounds_auction_round | auction_id, round_number |
| auction_rounds | idx_auction_rounds_auction_status | auction_id, status |
| auction_rounds | idx_auction_rounds_player_id | player_id |
| bids | idx_bids_auction_round_id | auction_round_id |
| bids | idx_bids_participant_id | participant_id |
| player_purchases | idx_player_purchases_auction_id | auction_id |
| player_purchases | idx_player_purchases_participant_id | participant_id |
| player_purchases | idx_player_purchases_player_id | player_id |
| squad_rosters | idx_squad_rosters_auction_participant | auction_id, participant_id |
| squad_rosters | idx_squad_rosters_participant_id | participant_id |
| auction_transactions | idx_auction_transactions_auction_participant | auction_id, participant_id |
| auction_transactions | idx_auction_transactions_auction_id | auction_id |
| auction_transactions | idx_auction_transactions_type | transaction_type |
| auction_audit_log | idx_auction_audit_log_auction_created | auction_id, created_at DESC |
| auction_audit_log | idx_auction_audit_log_event_type | event_type |
| auction_audit_log | idx_auction_audit_log_auction_round | auction_round_id (WHERE NOT NULL) |

---

## Row Level Security (RLS)

RLS is enabled on ALL tables. The backend uses `service_role` key which bypasses RLS entirely.

| Table | Policy | Role | Access |
|-------|--------|------|--------|
| profiles | profiles_select_own | authenticated | SELECT own row only |
| profiles | profiles_update_own | authenticated | UPDATE own row only |
| profiles | profiles_insert_own | authenticated | INSERT own row only |
| players | players_select_authenticated | authenticated | SELECT active players only |
| auction_sessions | auction_sessions_select_authenticated | authenticated | SELECT sessions user hosts/participates in |
| auction_participants | auction_participants_select_authenticated | authenticated | SELECT participants in user's auctions |
| auction_player_queue | auction_player_queue_select_authenticated | authenticated | SELECT queue for user's auctions |
| auction_rounds | auction_rounds_select_authenticated | authenticated | SELECT rounds in user's auctions |
| **bids** | **NONE** | **all** | **NO direct client access** |
| bid_reveal_records | bid_reveal_records_select_authenticated | authenticated | SELECT revealed/completed rounds only |
| player_purchases | player_purchases_select_authenticated | authenticated | SELECT purchases in user's auctions |
| squad_rosters | squad_rosters_select_authenticated | authenticated | SELECT rosters in user's auctions |
| **auction_transactions** | **NONE** | **all** | **NO direct client access** |
| **auction_audit_log** | **NONE** | **all** | **NO direct client access** |

**Critical:** The `bids` table has NO RLS policies — it is completely inaccessible from client libraries. All bid operations go through the backend service_role.

---

## Database Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `update_updated_at_column()` | Auto-maintains `updated_at` on UPDATE | TRIGGER |
| `handle_new_user()` | Creates profile row on auth signup | TRIGGER |
| `prevent_audit_log_modification()` | Blocks UPDATE/DELETE on audit_log | TRIGGER |
| `prevent_transaction_modification()` | Blocks UPDATE/DELETE on transactions | TRIGGER |
| `prevent_bid_amount_change()` | Prevents bid_amount/participant/round changes after insert | TRIGGER |
| `get_round_bid_count(p_auction_round_id)` | Gets total and valid bid count for a round | TABLE(total_bids, valid_bids) |
| `get_active_participant_count(p_auction_id)` | Gets count of active participants in auction | BIGINT |

---

## Triggers

| Trigger | Table | Event | Purpose |
|---------|-------|-------|---------|
| trg_profiles_updated_at | profiles | BEFORE UPDATE | Auto-update updated_at |
| trg_players_updated_at | players | BEFORE UPDATE | Auto-update updated_at |
| on_auth_user_created | auth.users | AFTER INSERT | Create profile row |
| trg_audit_log_no_update | auction_audit_log | BEFORE UPDATE | Block modifications |
| trg_audit_log_no_delete | auction_audit_log | BEFORE DELETE | Block deletions |
| trg_transactions_no_update | auction_transactions | BEFORE UPDATE | Block modifications |
| trg_transactions_no_delete | auction_transactions | BEFORE DELETE | Block deletions |
| trg_bid_immutable_fields | bids | BEFORE UPDATE | Protect bid_amount, participant_id, round_id |

---

## Storage Buckets

| Bucket | Public | Size Limit | Allowed Types |
|--------|--------|-----------|---------------|
| `player-images` | Yes | 5MB | image/jpeg, image/png, image/webp |
| `squad-badges` | Yes | 2MB | image/jpeg, image/png, image/webp, image/svg+xml |

---

## Money / Budget

All financial values use `NUMERIC(12,2)`:
- Prevents floating-point rounding errors
- Supports values up to 9,999,999,999.99
- Examples: `200.00`, `62.50`, `137.75`

**Never use** REAL, FLOAT, or DOUBLE PRECISION for currency.

---

## Player Import Strategy

### From CSV

Map source CSV columns to database columns:

| CSV Column | Database Column |
|------------|-----------------|
| PlayerName | players.name |
| Overall | players.overall_rating |
| Position | players.position |
| (derived) | players.position_group |
| Nationality | players.nationality |
| Club | players.club |
| Photo | players.photo_url |

**Position group derivation:**
```
GK → GK
CB, LB, RB, LWB, RWB → DEF
CDM, CM, CAM → MID
LM, RM, LW, RW → WING
ST, CF → ST
```

**Deduplication strategy:**
- If `external_id` is available, use it as the dedup key
- Otherwise use `(name, club, position)` composite as deterministic identifier
- Use `ON CONFLICT` / upsert to prevent duplicates

### Development Seed Data

30 test players are pre-loaded with:
- Names prefixed with `[DEV]`
- `external_id` prefixed with `dev_`
- Spread across all 15 positions and 5 position groups
- Three test clubs: Test FC, Demo United, Sample City

---

## Backend Repository Operations Mapping

| Repository Method | Primary Table(s) | Key Query Pattern |
|-------------------|-------------------|-------------------|
| `createAuctionSession()` | auction_sessions | INSERT |
| `getAuctionSession()` | auction_sessions | SELECT by id or room_code |
| `updateAuctionSession()` | auction_sessions | UPDATE status, current_player, current_round |
| `getParticipant()` | auction_participants | SELECT by id |
| `createParticipant()` | auction_participants | INSERT |
| `listParticipants()` | auction_participants | SELECT WHERE auction_id |
| `getCurrentRound()` | auction_rounds | SELECT WHERE auction_id AND status='BIDDING' |
| `createRound()` | auction_rounds | INSERT |
| `lockRound()` | auction_rounds | UPDATE status='LOCKED', bidding_locked_at |
| `getBidsForRound()` | bids | SELECT WHERE auction_round_id |
| `getParticipantBid()` | bids | SELECT WHERE auction_round_id AND participant_id |
| `createBid()` | bids | INSERT |
| `createPurchase()` | player_purchases | INSERT |
| `createRosterEntry()` | squad_rosters | INSERT |
| `updateParticipantBudget()` | auction_participants | UPDATE remaining_budget, total_spent |
| `createTransaction()` | auction_transactions | INSERT |
| `markPlayerSold()` | auction_player_queue | UPDATE status='SOLD', completed_at |
| `getNextPlayer()` | auction_player_queue | SELECT WHERE status='QUEUED' ORDER BY sequence_number LIMIT 1 |
| `createAuditEvent()` | auction_audit_log | INSERT |
| `getTeamRoster()` | squad_rosters JOIN players | SELECT WHERE participant_id |
| `getAuctionResults()` | Multiple JOINs | participants + rosters + transactions |

### Atomic Round Completion

The backend should execute these steps in a single database transaction:

1. Lock auction round → UPDATE auction_rounds SET status='LOCKED'
2. Determine winner → SELECT from bids (backend logic)
3. Deduct budget → UPDATE auction_participants SET remaining_budget, total_spent
4. Create purchase → INSERT player_purchases
5. Create roster entry → INSERT squad_rosters
6. Mark player sold → UPDATE auction_player_queue SET status='SOLD'
7. Update round → UPDATE auction_rounds SET status='COMPLETED', winner_participant_id, winning_bid
8. Add transaction → INSERT auction_transactions
9. Add audit record → INSERT auction_audit_log

All within a single Supabase `rpc` call or a transaction block via the service client.

---

## Migrations

| # | Name | Description |
|---|------|-------------|
| 001 | initial_schema | All 12 tables with FKs, CHECKs, UNIQUEs |
| 002 | indexes | 25+ performance indexes |
| 003 | rls_policies | RLS enabled + policies on all tables |
| 004 | functions_and_triggers | updated_at, auth, immutability, helpers |
| 005 | storage_buckets | player-images + squad-badges buckets |
| 006 | seed_data | 30 development test players |

---

## Environment Variables (Required by Antigravity)

```env
# Supabase connection
SUPABASE_URL=https://nsshjxeavwvxovoxtsio.supabase.co
SUPABASE_ANON_KEY=<publishable anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key - NEVER expose to browser>

# Database direct connection (if needed for migrations/admin)
DATABASE_URL=postgresql://postgres.[ref]:[password]@db.nsshjxeavwvxovoxtsio.supabase.co:5432/postgres
```

**Security:**
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — backend only
- `SUPABASE_ANON_KEY` is safe for frontend but respects RLS
- Never expose service_role key in client-side code

---

## Security Model Summary

1. **Frontend** → communicates with backend only (Socket.IO + REST)
2. **Backend** → uses `service_role` key to access Supabase (bypasses RLS)
3. **RLS** → protects against direct client-side Supabase queries
4. **Bids table** → completely hidden from all client roles (no policies)
5. **Immutable tables** → audit_log and transactions cannot be modified/deleted
6. **Bid immutability** → bid_amount cannot be changed after submission
7. **CHECK constraints** → prevent invalid financial values at database level
8. **UNIQUE constraints** → prevent duplicate bids, duplicate purchases, duplicate squad entries

---

## No Timer System

This database intentionally has **no bidding timer/deadline** columns.

Bidding closes when:
- All active participants have submitted (backend checks `get_round_bid_count` vs `get_active_participant_count`)
- Host triggers force-reveal

The backend owns this decision logic entirely.

---

## Tie Break

Database records:
- `auction_rounds.tie_break_used` = TRUE
- `bid_reveal_records.tie_break_metadata` (JSONB):

```json
{
  "tiedParticipantIds": ["uuid-1", "uuid-2"],
  "method": "server_random",
  "selectedParticipantId": "uuid-1"
}
```

The backend performs the random selection. The database only persists the result.
