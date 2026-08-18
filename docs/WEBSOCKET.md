# Sealed-Bid Football Auction - Socket.IO WebSocket Specification

This document details the real-time bidirectional events between the React frontend client and the authoritative Fastify + Socket.IO game server.

---

## 1. Connection & Handshake Authentication

When connecting to the Socket.IO server, the client must supply authentication credentials in the `auth` payload:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    roomCode: 'X7K92P',
    participantId: 'part_987654',
    sessionToken: 'sess_87654321...',
  },
});
```

If authentication fails, the server closes the connection with an `AUTHENTICATION_FAILED` error.

---

## 2. Client → Server Events

### `room:join`
Triggers state synchronization and joins the room channel.
```ts
socket.emit('room:join', {
  roomCode: 'X7K92P',
  participantId: 'part_987654',
  sessionToken: 'sess_...',
});
```

### `room:ready` / `room:unready`
Toggles the squad's ready state in the lobby.
```ts
socket.emit('room:ready');
socket.emit('room:unready');
```

### `auction:start`
*(Host Only)* Starts the auction, initializes player sequence, and transitions to round 1 `BIDDING`.
```ts
socket.emit('auction:start');
```

### `auction:submit_bid`
Submits a sealed bid for the current player.
```ts
socket.emit('auction:submit_bid', { bidAmount: 72 }, (response) => {
  if (response.status === 'accepted') {
    console.log('Bid securely received');
  } else {
    console.error('Bid rejected:', response.message);
  }
});
```

### `auction:force_reveal`
*(Host Only)* Immediately locks the round and reveals all submitted bids.
```ts
socket.emit('auction:force_reveal');
```

### `auction:next`
*(Host Only)* Advances to the next player in the queue after a round has been revealed.
```ts
socket.emit('auction:next');
```

### `team:update_name`
Updates the participant's squad name.
```ts
socket.emit('team:update_name', { squadName: 'Real Kolkata' });
```

### `host:end_auction`
*(Host Only)* Prematurely terminates the auction.
```ts
socket.emit('host:end_auction');
```

---

## 3. Server → Client Events

### `room:state`
Delivers complete sanitized state for the room and the private participant context.
```json
{
  "roomId": "room_a1b2c3d4",
  "roomCode": "X7K92P",
  "auctionName": "Weekend Premier Auction",
  "phase": "BIDDING",
  "currentRound": 1,
  "currentPlayer": { ... },
  "submittedCount": 7,
  "totalParticipants": 12,
  "participants": [ ... ],
  "squads": [ ... ],
  "myBidStatus": "SUBMITTED",
  "myBudget": 180
}
```

### `auction:started`
Broadcast when the host begins the auction.
```json
{
  "round": 1,
  "player": {
    "id": "p3",
    "name": "Kylian Mbappé",
    "rating": 91,
    "position": "ST",
    "club": "Real Madrid",
    "basePrice": 10
  }
}
```

### `auction:player`
Broadcast whenever a new player is up for bidding.
```json
{
  "round": 2,
  "player": { ... }
}
```

### `auction:bid_ack`
Private acknowledgement sent **only** to the bidder who submitted a bid.
```json
{
  "status": "accepted"
}
```

### `auction:bid_submitted`
**Broadcast to all participants in the room.** Notice: **No bid amount or bidder identity is included.**
```json
{
  "submittedCount": 8,
  "totalParticipants": 12
}
```

### `auction:reveal_started`
Broadcast when all bids are received or force-reveal is triggered. Signals the UI to render the reveal animation.

### `auction:revealed`
Broadcast once all bids are unsealed. Contains the list of all bids placed in the round.
```json
{
  "round": 1,
  "player": { "id": "p3", "name": "Kylian Mbappé", ... },
  "bids": [
    { "squadName": "Team A", "amount": 55, "isValid": true },
    { "squadName": "Team B", "amount": 72, "isValid": true },
    { "squadName": "Team C", "amount": 62, "isValid": true },
    { "squadName": "Team D", "amount": 72, "isValid": true }
  ],
  "winnerSquadId": "sq_4",
  "winnerSquadName": "Team D",
  "winningBid": 72,
  "tieBreak": {
    "isTie": true,
    "tiedSquadIds": ["sq_2", "sq_4"],
    "winnerSquadId": "sq_4",
    "method": "cryptographic_random"
  }
}
```

### `auction:winner`
Broadcast immediately after reveal with winner details.
```json
{
  "round": 1,
  "player": { ... },
  "winnerSquadId": "sq_4",
  "winnerSquadName": "Team D",
  "winningBid": 72,
  "tieBreak": { ... }
}
```

### `budget:updated`
Broadcast when the winning squad's budget is deducted.
```json
{
  "squadId": "sq_4",
  "budget": 128,
  "spent": 72
}
```

### `roster:updated`
Broadcast when a player is added to the winning squad's roster.
```json
{
  "squadId": "sq_4",
  "purchase": {
    "player": { ... },
    "amount": 72,
    "round": 1,
    "timestamp": 1771456789000
  }
}
```

### `auction:completed`
Broadcast when the entire player catalog has been auctioned or host ended auction.
```json
{
  "totalRounds": 16,
  "timestamp": 1771456900000
}
```

### `error`
Structured application error payload.
```json
{
  "code": "BID_EXCEEDS_BUDGET",
  "message": "Your bid of 250 Cr exceeds your remaining budget of 180 Cr"
}
```
