import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../src/rooms/RoomManager.js';
import { AuctionEngine } from '../../src/auction/AuctionEngine.js';
import { AuctionManager } from '../../src/auction/AuctionManager.js';
import { INITIAL_PLAYER_POOL } from '../../src/repositories/memory/InMemoryDatabase.js';

describe('12-Participant Multiplayer Concurrency Test', () => {
  beforeEach(() => {
    RoomManager.reset();
  });

  it('should handle 12 simultaneous bid submissions with exact-once reveal and winner assignment', async () => {
    // 1. Create room for 12 participants
    const host = RoomManager.createRoom(
      {
        auctionName: 'Mega Premier League',
        startingBudget: 200,
        minParticipants: 9,
        maxParticipants: 12,
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'Host',
      INITIAL_PLAYER_POOL,
      'Squad 1'
    );

    const participants = [host];

    // 2. Join 11 other participants
    for (let i = 2; i <= 12; i++) {
      const p = RoomManager.joinRoom(host.roomCode, `Player ${i}`, `Squad ${i}`);
      participants.push(p as any);
    }

    const room = RoomManager.getRoom(host.roomCode)!;
    expect(room.participants.size).toBe(12);

    // 3. Start auction
    AuctionEngine.startAuction(room);
    expect(room.auctionState.phase).toBe('BIDDING');
    const auctionedPlayer = room.auctionState.currentPlayer!;

    // 4. Submit 12 bids concurrently using Promise.all
    // Squad 4 submits highest bid (72 Cr)
    const bidPromises = participants.map((p, idx) => {
      const bidAmount = idx === 3 ? 72 : 30 + idx; // Squad 4 bids 72, others bid 30..41
      return AuctionManager.submitBid(room, p.participantId, bidAmount);
    });

    const results = await Promise.all(bidPromises);

    // 5. Verification
    // Exactly 12 bids recorded
    expect(Object.keys(room.auctionState.bids).length).toBe(12);

    // The last submission should have triggered auto-reveal
    const autoRevealedCount = results.filter((r) => r.autoRevealed).length;
    expect(autoRevealedCount).toBe(1);

    expect(room.auctionState.phase).toBe('REVEALING');
    expect(room.auctionState.lastRevealResult).toBeDefined();

    // Exactly one winner: Squad 4 (index 3)
    const winnerSquadId = participants[3].squadId;
    const winnerSquad = room.squads.get(winnerSquadId)!;

    expect(room.auctionState.lastRevealResult?.winnerSquadId).toBe(winnerSquadId);
    expect(room.auctionState.lastRevealResult?.winningBid).toBe(72);

    // Winner's budget deducted exactly once (200 - 72 = 128)
    expect(winnerSquad.budget).toBe(128);
    expect(winnerSquad.spent).toBe(72);

    // Player assigned exactly once to winner squad
    expect(winnerSquad.roster.length).toBe(1);
    expect(winnerSquad.roster[0].player.id).toBe(auctionedPlayer.id);
    expect(winnerSquad.roster[0].amount).toBe(72);

    // Non-winners' budgets remain untouched (200)
    for (let i = 0; i < participants.length; i++) {
      if (i !== 3) {
        const sq = room.squads.get(participants[i].squadId)!;
        expect(sq.budget).toBe(200);
        expect(sq.roster.length).toBe(0);
      }
    }
  });

  it('should prevent race condition when Host calls forceReveal while final bids arrive', async () => {
    const host = RoomManager.createRoom(
      {
        auctionName: 'Race Condition Test',
        startingBudget: 200,
        minParticipants: 9,
        maxParticipants: 12,
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'Host',
      INITIAL_PLAYER_POOL,
      'Squad 1'
    );

    for (let i = 2; i <= 12; i++) {
      RoomManager.joinRoom(host.roomCode, `Player ${i}`, `Squad ${i}`);
    }

    const room = RoomManager.getRoom(host.roomCode)!;
    AuctionEngine.startAuction(room);

    // First 11 participants submit bids
    const participantsList = Array.from(room.participants.values());
    for (let i = 0; i < 11; i++) {
      await AuctionManager.submitBid(room, participantsList[i].id, 40 + i);
    }

    // Simultaneously: 12th participant submits bid AND Host triggers force reveal
    const p12 = participantsList[11];
    const concurrentActions = await Promise.allSettled([
      AuctionManager.submitBid(room, p12.id, 90),
      AuctionManager.forceReveal(room, host.participantId),
    ]);

    // Room must end up in a valid REVEALING state with exactly one reveal outcome
    expect(room.auctionState.phase).toBe('REVEALING');
    expect(room.auctionState.lastRevealResult).toBeDefined();

    // No double deduction or corrupt state
    const winnerId = room.auctionState.lastRevealResult!.winnerSquadId!;
    const winnerSquad = room.squads.get(winnerId)!;
    expect(winnerSquad.budget).toBe(200 - room.auctionState.lastRevealResult!.winningBid);
  });
});
