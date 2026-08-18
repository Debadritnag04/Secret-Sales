# Sealed-Bid Football Auction - Database Schema Contract

As agreed, **Kiro is responsible for creating the Supabase project, PostgreSQL tables, indexes, RLS policies, and seed data**.

The backend repository interfaces (`IRoomRepository`, `IPlayerRepository`, `IBidRepository`, `ITeamRepository`, `IAuctionRepository`) are designed around the following database schema contract:

---

## 1. Table: `players`
Preloaded catalog of football players.

| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | `TEXT / UUID` | Primary Key |
| `name` | `TEXT` | Player Name |
| `rating` | `INTEGER` | Overall rating (e.g. 91) |
| `position` | `TEXT` | `GK`, `DEF`, `MID`, `WING`, `ST` |
| `club` | `TEXT` | Football club |
| `nationality` | `TEXT` | Player nationality |
| `photo_url` | `TEXT` | Image URL |
| `base_price` | `INTEGER` | Minimum base bid (e.g. 10) |
| `status` | `TEXT` | `available`, `sold`, `unsold` |

---

## 2. Table: `rooms`
Auction room metadata and active game phase.

| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | `TEXT / UUID` | Primary Key |
| `code` | `TEXT` | Unique 6-character room code (e.g. `X7K92P`) |
| `host_id` | `TEXT` | Participant ID of host |
| `host_token` | `TEXT` | Sensitive host secret token |
| `settings` | `JSONB` | `{ auctionName, startingBudget, maxParticipants, minBid, ... }` |
| `auction_phase` | `TEXT` | `LOBBY`, `BIDDING`, `REVEALING`, `COMPLETED`, `ENDED` |
| `current_round` | `INTEGER` | Current round number |
| `created_at` | `TIMESTAMPTZ` | Room creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Last update timestamp |

---

## 3. Table: `squads`
Participant squads participating in a room.

| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | `TEXT / UUID` | Primary Key |
| `room_id` | `TEXT` | Foreign Key referencing `rooms.id` |
| `participant_id`| `TEXT` | Participant ID |
| `owner_name` | `TEXT` | Participant username |
| `squad_name` | `TEXT` | Unique squad name within room |
| `budget` | `INTEGER` | Remaining budget (Cr) |
| `starting_budget`| `INTEGER` | Starting budget (e.g. 200) |
| `spent` | `INTEGER` | Total amount spent so far |
| `is_ready` | `BOOLEAN` | Lobby ready status |

---

## 4. Table: `bids`
Sealed bids submitted by squads.

| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | `BIGSERIAL` | Primary Key |
| `room_id` | `TEXT` | Foreign Key referencing `rooms.id` |
| `round` | `INTEGER` | Auction round number |
| `participant_id`| `TEXT` | Bidder participant ID |
| `squad_id` | `TEXT` | Bidder squad ID |
| `squad_name` | `TEXT` | Bidder squad name |
| `amount` | `INTEGER` | Bid amount |
| `submitted_at` | `TIMESTAMPTZ` | Submission timestamp |

---

## 5. Table: `rosters`
Players acquired by squads through winning bids.

| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | `BIGSERIAL` | Primary Key |
| `squad_id` | `TEXT` | Foreign Key referencing `squads.id` |
| `player_id` | `TEXT` | Player ID |
| `player` | `JSONB` | Snapshot of player object |
| `amount` | `INTEGER` | Winning bid paid |
| `round` | `INTEGER` | Auction round won |
| `created_at` | `TIMESTAMPTZ` | Purchase timestamp |

---

## 6. Table: `round_history`
Completed round logs for audit and standings.

| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | `BIGSERIAL` | Primary Key |
| `room_id` | `TEXT` | Foreign Key referencing `rooms.id` |
| `round` | `INTEGER` | Auction round number |
| `player` | `JSONB` | Player object auctioned |
| `winner_squad_id`| `TEXT` | Winning squad ID (or null if unsold) |
| `winner_squad_name`| `TEXT` | Winning squad name |
| `winning_bid` | `INTEGER` | Winning bid amount |
| `bids` | `JSONB` | All unsealed bids for round |
| `tie_break` | `JSONB` | Tie-break details if tie occurred |
| `created_at` | `TIMESTAMPTZ` | Reveal timestamp |
