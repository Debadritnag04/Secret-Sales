# Sealed-Bid Football Auction - REST API Specification

This document details all available HTTP REST endpoints on the Fastify backend server.

Base URL: `http://localhost:3000`

---

## 1. Health Check

### `GET /health`
Returns the status, server timestamp, and version of the backend service.

#### Response
```json
{
  "status": "ok",
  "timestamp": "2026-08-19T02:50:00.000Z",
  "version": "1.0.0"
}
```

---

## 2. Room Management

### `POST /api/rooms`
Creates a new sealed-bid auction room and initializes the host session.

#### Request Body
```json
{
  "auctionName": "Weekend Premier Auction",
  "hostName": "Rit",
  "startingBudget": 200,
  "maxParticipants": 12,
  "minBid": 1,
  "allowHostForceReveal": true
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `auctionName` | `string` | Yes | Name of the tournament / auction (2–100 chars) |
| `hostName` | `string` | Yes | Name of the host participant (1–50 chars) |
| `startingBudget` | `number` | No (default `200`) | Starting budget per squad (Cr / points, > 0) |
| `maxParticipants` | `number` | No (default `12`) | Capacity constraint (between 9 and 12) |
| `minBid` | `number` | No (default `1`) | Minimum required bid |
| `allowHostForceReveal` | `boolean` | No (default `true`) | Whether host can trigger force reveal |

#### Response (`201 Created`)
```json
{
  "roomId": "room_a1b2c3d4",
  "roomCode": "X7K92P",
  "hostToken": "host_9fa87...",
  "participantId": "part_b3c4d5",
  "squadId": "sq_c4d5e6",
  "sessionToken": "sess_f7e8d9..."
}
```

> **Note**: `hostToken` and `sessionToken` are sensitive credentials. Store them securely in local state.

---

### `POST /api/rooms/:roomCode/join`
Allows a participant to join an active lobby with their participant name and squad name.

#### Request Body
```json
{
  "participantName": "Alex",
  "squadName": "Kolkata Strikers"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `participantName` | `string` | Yes | Name of the participant (1–50 chars) |
| `squadName` | `string` | Yes | Unique squad name within the room (1–50 chars) |

#### Response (`200 OK`)
```json
{
  "roomId": "room_a1b2c3d4",
  "roomCode": "X7K92P",
  "participantId": "part_987654",
  "squadId": "sq_123456",
  "sessionToken": "sess_87654321..."
}
```

#### Error Responses
- `404 Not Found` (`ROOM_NOT_FOUND`): Room code does not exist.
- `400 Bad Request` (`ROOM_FULL`): Room has reached maximum participant capacity.
- `400 Bad Request` (`SQUAD_NAME_TAKEN`): Squad name is already taken in this room.
- `400 Bad Request` (`AUCTION_ALREADY_STARTED`): Cannot join room after auction has started.

---

### `GET /api/rooms/:roomCode`
Retrieves sanitized room state. If `x-participant-id` header is passed, includes private participant context (`myBidStatus`, `myBudget`, `mySquadId`).

#### Request Headers (Optional)
```http
x-participant-id: part_987654
```

#### Response (`200 OK`)
```json
{
  "roomId": "room_a1b2c3d4",
  "roomCode": "X7K92P",
  "auctionName": "Weekend Premier Auction",
  "hostName": "Rit",
  "phase": "BIDDING",
  "currentRound": 1,
  "currentPlayer": {
    "id": "p3",
    "name": "Kylian Mbappé",
    "rating": 91,
    "position": "ST",
    "club": "Real Madrid",
    "nationality": "France",
    "photoUrl": "...",
    "basePrice": 10
  },
  "submittedCount": 7,
  "totalParticipants": 12,
  "participants": [
    {
      "id": "part_1",
      "name": "Rit",
      "squadName": "Rit's Squad",
      "isHost": true,
      "isReady": true,
      "isConnected": true
    }
  ],
  "squads": [
    {
      "id": "sq_1",
      "squadName": "Rit's Squad",
      "ownerName": "Rit",
      "budget": 200,
      "spent": 0,
      "isReady": true,
      "playerCount": 0,
      "roster": []
    }
  ],
  "settings": { ... },
  "lastRevealResult": null,
  "myParticipantId": "part_987654",
  "mySquadId": "sq_123456",
  "mySquadName": "Kolkata Strikers",
  "isHost": false,
  "myBidStatus": "SUBMITTED",
  "myBudget": 200
}
```

---

## 3. Players

### `GET /api/rooms/:roomCode/players`
Returns the room's football player catalog with optional filtering.

#### Query Parameters
| Parameter | Type | Options / Description |
| :--- | :--- | :--- |
| `status` | `string` | `available`, `sold`, `unsold`, `all` |
| `position` | `string` | `GK`, `DEF`, `MID`, `WING`, `ST` |
| `search` | `string` | Search query for player name, club, or nationality |
| `minRating` | `number` | Minimum overall rating |

#### Response (`200 OK`)
```json
{
  "players": [
    {
      "id": "p3",
      "name": "Kylian Mbappé",
      "rating": 91,
      "position": "ST",
      "club": "Real Madrid",
      "nationality": "France",
      "photoUrl": "...",
      "basePrice": 10,
      "status": "available"
    }
  ]
}
```

---

## 4. Teams

### `GET /api/rooms/:roomCode/teams`
Returns public team profiles, budgets, spend, and rosters for all squads in the room.

### `GET /api/rooms/:roomCode/teams/:teamId`
Returns detailed statistics for a single squad (highest purchase, cheapest purchase, spending, players).

---

## 5. Results & Standings

### `GET /api/rooms/:roomCode/results`
Returns comprehensive tournament standings, budgets, spending totals, round histories, and server audit records.

#### Response (`200 OK`)
```json
{
  "roomCode": "X7K92P",
  "auctionName": "Weekend Premier Auction",
  "phase": "COMPLETED",
  "totalRounds": 16,
  "totalSpent": 1420,
  "standings": [
    {
      "rank": 1,
      "id": "sq_123456",
      "squadName": "Kolkata Strikers",
      "ownerName": "Alex",
      "budget": 58,
      "spent": 142,
      "playerCount": 3,
      "averageRating": 90.3,
      "totalValue": 29,
      "roster": [ ... ]
    }
  ],
  "history": [ ... ],
  "auditLogs": [ ... ]
}
```
