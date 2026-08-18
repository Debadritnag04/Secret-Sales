# Getting Started

Complete setup guide for running the Sealed-Bid Football Auction application locally.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime |
| npm or bun | latest | Package manager |
| Git | latest | Version control |
| Supabase account | — | Database (already provisioned) |

---

## 1. Clone the Repository

```bash
git clone https://github.com/Debadritnag04/Secret-Sales.git
cd Secret-Sales
```

---

## 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using bun:
```bash
bun install
```

---

## 3. Configure Environment Variables

Copy the `.env` file and fill in the secrets:

```bash
cp .env .env.local   # optional — .env works directly
```

Edit `.env` with your actual values:

```env
# Supabase Configuration
SUPABASE_URL=https://nsshjxeavwvxovoxtsio.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Server Configuration
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
LOG_LEVEL=info
```

### Where to find keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/nsshjxeavwvxovoxtsio/settings/api)
2. **SUPABASE_URL** — already set: `https://nsshjxeavwvxovoxtsio.supabase.co`
3. **SUPABASE_ANON_KEY** — under "Project API keys" → `anon` `public`
4. **SUPABASE_SERVICE_ROLE_KEY** — under "Project API keys" → `service_role` (keep secret!)

---

## 4. Run the Application

### Development mode (backend + frontend together)

This single command starts both the Fastify/Socket.IO backend and the Vite React frontend:

```bash
npm run dev
```

This runs `tsx server.ts` which:
- Starts the **Fastify backend** on `http://localhost:3000`
- Serves the **REST API** at `http://localhost:3000/api/...`
- Starts the **Socket.IO WebSocket** server on the same port
- The **Vite dev server** for the React frontend runs on `http://localhost:5173`

### Run backend only

```bash
npm run dev:server
```

Starts just the Fastify + Socket.IO server on port 3000.

### Run frontend only (Vite)

```bash
npx vite
```

Starts the React frontend on `http://localhost:5173` with hot reload.

---

## 5. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React UI |
| Backend API | http://localhost:3000 | Fastify REST API |
| Health Check | http://localhost:3000/api/health | Server status |
| WebSocket | ws://localhost:3000 | Socket.IO real-time |

---

## 6. Production Build

Build both frontend and backend:

```bash
npm run build
```

This produces:
- `dist/` — Vite-built frontend assets
- `dist/server.cjs` — Bundled backend (esbuild)

Run production:

```bash
npm start
```

---

## 7. Run Tests

```bash
npm test            # single run
npm run test:watch  # watch mode
```

---

## 8. Type Checking

```bash
npm run lint
```

Runs `tsc --noEmit` to check TypeScript without emitting files.

---

## Project Structure

```
Secret-Sales/
├── server.ts                 # Entry point — starts backend
├── src/
│   ├── server.ts             # Fastify app builder + Socket.IO init
│   ├── config/env.ts         # Environment validation (Zod)
│   ├── api/routes/           # REST API endpoints
│   │   ├── health.ts
│   │   ├── rooms.ts
│   │   ├── players.ts
│   │   ├── teams.ts
│   │   └── results.ts
│   ├── auction/              # Auction engine (game logic)
│   │   ├── AuctionEngine.ts
│   │   ├── AuctionManager.ts
│   │   ├── BidManager.ts
│   │   ├── BudgetManager.ts
│   │   ├── PlayerSelector.ts
│   │   ├── RevealManager.ts
│   │   ├── RosterManager.ts
│   │   └── WinnerResolver.ts
│   ├── websocket/            # Socket.IO real-time handlers
│   │   ├── socket.ts
│   │   ├── events.ts
│   │   └── middleware.ts
│   ├── repositories/         # Data access layer
│   │   ├── interfaces.ts     # Repository interfaces
│   │   ├── memory/           # In-memory implementation
│   │   └── supabase/         # Supabase implementation
│   ├── services/             # Business logic services
│   ├── pages/                # React page components
│   ├── hooks/                # React hooks
│   ├── store/                # React state (GameStateContext)
│   ├── types/                # TypeScript types
│   │   ├── database.ts       # Generated Supabase types
│   │   ├── auction.ts
│   │   ├── bid.ts
│   │   ├── player.ts
│   │   ├── room.ts
│   │   ├── socket.ts
│   │   └── team.ts
│   └── utils/                # Shared utilities
├── docs/
│   ├── API.md                # REST API documentation
│   ├── DATABASE.md           # Database schema documentation
│   ├── DATABASE_CONTRACT.md  # DB contract spec
│   ├── GAME_STATE.md         # Game state machine
│   ├── WEBSOCKET.md          # WebSocket events
│   └── GETTING_STARTED.md    # This file
├── supabase/
│   └── migrations/           # SQL migration files
├── tests/                    # Test files
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env                      # Environment variables (not committed)
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 React Frontend                   │
│            (Vite, localhost:5173)                │
│  Pages: Home, CreateRoom, JoinRoom, Lobby,      │
│         Auction, PlayerPool, Team, Results       │
└─────────────────┬───────────────────────────────┘
                  │ Socket.IO + REST
                  ▼
┌─────────────────────────────────────────────────┐
│          Node.js Backend (Fastify)              │
│            (localhost:3000)                      │
│                                                 │
│  ┌───────────┐  ┌────────────┐  ┌───────────┐ │
│  │ REST API  │  │ Socket.IO  │  │  Auction   │ │
│  │  Routes   │  │  Events    │  │  Engine    │ │
│  └─────┬─────┘  └─────┬──────┘  └─────┬─────┘ │
│        │               │               │       │
│        └───────────────┼───────────────┘       │
│                        │                        │
│              ┌─────────▼─────────┐              │
│              │ Repository Layer  │              │
│              │  (Interface)      │              │
│              └────────┬──────────┘              │
│                       │                         │
│          ┌────────────┼────────────┐           │
│          ▼                         ▼           │
│  ┌──────────────┐        ┌──────────────┐     │
│  │  In-Memory   │        │   Supabase   │     │
│  │  Repository  │        │  Repository  │     │
│  └──────────────┘        └──────┬───────┘     │
└─────────────────────────────────┼──────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Supabase PostgreSQL   │
                    │  (nsshjxeavwvxovoxtsio) │
                    └─────────────────────────┘
```

---

## Common Tasks

### Create an auction room
1. Open http://localhost:5173
2. Click "Create Room"
3. Set auction name, budget, max participants
4. Share the room code with other players

### Join an auction
1. Open http://localhost:5173
2. Click "Join Room"
3. Enter the room code and squad name

### Import players (production)
Use the Supabase dashboard or a script to bulk-insert players into the `players` table. See `docs/DATABASE.md` for the import strategy and column mapping.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module` errors | Run `npm install` again |
| Port 3000 already in use | Change `PORT` in `.env` or kill the process |
| Supabase connection fails | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` |
| Frontend can't connect to backend | Ensure `FRONTEND_URL=http://localhost:5173` in `.env` |
| WebSocket disconnects | Check browser console for CORS errors |
| TypeScript errors | Run `npm run lint` to see all issues |

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes* | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | — | Public anon key (for frontend if needed) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | — | Backend-only key (bypasses RLS) |
| `PORT` | No | 3000 | Backend server port |
| `FRONTEND_URL` | No | http://localhost:5173 | CORS allowed origin |
| `NODE_ENV` | No | development | Environment mode |
| `LOG_LEVEL` | No | info | Pino log level |

*Required when using Supabase repository. The in-memory repository works without Supabase keys.
