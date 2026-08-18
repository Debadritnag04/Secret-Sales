# Sealed-Bid Football Auction - Game Engine & State Machine

This document outlines the authoritative game mechanics, state machine transitions, sealed bidding rules, reveal logic, and tie-breaking algorithms.

---

## 1. Game State Machine

```
   [WAITING]
       │
       ▼
    [LOBBY] ───────────────┐
       │                   │
       ▼ (Host starts)     │
   [STARTING]              │
       │                   │
       ▼ (Player loaded)   │
   [BIDDING] ◄──────────┐  │ (Host ends)
       │                │  │
       ▼ (All submit /  │  │
          Force reveal) │  │
  [REVEALING]           │  │
       │                │  │
       ├─ (Next player)─┘  │
       ▼ (Pool exhausted)  │
  [COMPLETED] ◄────────────┘
       │
       ▼ (Host closes)
    [ENDED]
```

### State Definitions
- **`WAITING`**: Initializing room configuration.
- **`LOBBY`**: Open for 9–12 participants to join, select squad names, and toggle readiness.
- **`STARTING`**: Host initiates auction; server shuffles player queue using cryptographic random methods.
- **`BIDDING`**: Current player is presented to all participants. Participants submit sealed bids.
- **`REVEALING`**: Round locked; all submitted bids unsealed; winner resolved; budget deducted; player assigned to roster.
- **`COMPLETED`**: All players in queue have been auctioned. Final standings and statistics are generated.
- **`ENDED`**: Room closed.

---

## 2. Sealed Bidding Mechanics

1. **Blind Submissions**: Each squad submits a single secret bid amount.
2. **Confidentiality Guarantee**:
   - Bids are stored privately in server memory / database.
   - The server broadcasts only `{ submittedCount, totalParticipants }`.
   - No bid amount or squad name is transmitted to any client during active bidding.
3. **No Countdown Timer**:
   - The round remains open until `submittedCount === totalParticipants`.
   - The host has the option to trigger `auction:force_reveal` if needed.
4. **Immutability**:
   - Once a sealed bid is accepted by the server, it cannot be modified or withdrawn.

---

## 3. Reveal, First-Price Winner Resolution, and Ties

### First-Price Auction Rule
The participant with the highest valid bid wins the player and pays **their exact submitted bid amount** (not second-price).

### Winner Determination Algorithm:
1. Filter bids: exclude bids below player `basePrice` or exceeding the squad's authoritative remaining `budget`.
2. Find the highest bid amount $B_{max}$.
3. If multiple squads submitted $B_{max}$, a tie is detected.
4. **Cryptographic Tie-Break**:
   - Tie-breaks use `crypto.randomInt` over the array of tied squads.
   - The tie-break event is recorded in the server audit trail.
5. Deduct winning bid from the winning squad's budget.
6. Assign the player to the winning squad's roster.
7. Mark the player as `sold`.

---

## 4. Reconnection & Host Resilience

- If a participant disconnects and reconnects, they supply `roomCode`, `participantId`, and `sessionToken`.
- The server authenticates the session and immediately returns `room:state` containing their private state (`myBidStatus`, `myBudget`, `mySquadName`).
- Host disconnection does **not** terminate or freeze the auction; host reconnects seamlessly with host controls restored.
