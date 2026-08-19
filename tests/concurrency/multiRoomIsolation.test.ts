import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../src/rooms/RoomManager.js';
import { AuctionEngine } from '../../src/auction/AuctionEngine.js';
import { AuctionManager } from '../../src/auction/AuctionManager.js';
import { INITIAL_PLAYER_POOL } from '../../src/repositories/memory/InMemoryDatabase.js';

describe('Multi-Room Isolation Test', () => {
  beforeEach(() => {
    RoomManager.reset();
  });

  it('should run Room A (12 players), Room B (10 players), and Room C (9 players) concurrently with zero state leakage', async () => {
    // 1. Setup Room A (12 players)
    const hostA = RoomManager.createRoom(
      { auctionName: 'Room A League', startingBudget: 200, minParticipants: 9, maxParticipants: 12, minBid: 1, allowHostForceReveal: true, purseMode: 'SAME' },
      'HostA',
      INITIAL_PLAYER_POOL,
      'A_Squad_1'
    );
    for (let i = 2; i <= 12; i++) {
      RoomManager.joinRoom(hostA.roomCode, `A_User_${i}`, `A_Squad_${i}`);
    }
    const roomA = RoomManager.getRoom(hostA.roomCode)!;

    // 2. Setup Room B (10 players)
    const hostB = RoomManager.createRoom(
      { auctionName: 'Room B League', startingBudget: 300, minParticipants: 9, maxParticipants: 12, minBid: 1, allowHostForceReveal: true, purseMode: 'SAME' },
      'HostB',
      INITIAL_PLAYER_POOL,
      'B_Squad_1'
    );
    for (let i = 2; i <= 10; i++) {
      RoomManager.joinRoom(hostB.roomCode, `B_User_${i}`, `B_Squad_${i}`);
    }
    const roomB = RoomManager.getRoom(hostB.roomCode)!;

    // 3. Setup Room C (9 players)
    const hostC = RoomManager.createRoom(
      { auctionName: 'Room C League', startingBudget: 150, minParticipants: 9, maxParticipants: 12, minBid: 1, allowHostForceReveal: true, purseMode: 'SAME' },
      'HostC',
      INITIAL_PLAYER_POOL,
      'C_Squad_1'
    );
    for (let i = 2; i <= 9; i++) {
      RoomManager.joinRoom(hostC.roomCode, `C_User_${i}`, `C_Squad_${i}`);
    }
    const roomC = RoomManager.getRoom(hostC.roomCode)!;

    // Verify sizes
    expect(roomA.participants.size).toBe(12);
    expect(roomB.participants.size).toBe(10);
    expect(roomC.participants.size).toBe(9);

    // 4. Start all three auctions concurrently
    AuctionEngine.startAuction(roomA);
    AuctionEngine.startAuction(roomB);
    AuctionEngine.startAuction(roomC);

    expect(roomA.auctionState.phase).toBe('BIDDING');
    expect(roomB.auctionState.phase).toBe('BIDDING');
    expect(roomC.auctionState.phase).toBe('BIDDING');

    // 5. Submit bids concurrently in all rooms
    const promisesA = Array.from(roomA.participants.values()).map((p, idx) =>
      AuctionManager.submitBid(roomA, p.id, 20 + idx)
    );
    const promisesB = Array.from(roomB.participants.values()).map((p, idx) =>
      AuctionManager.submitBid(roomB, p.id, 50 + idx)
    );
    const promisesC = Array.from(roomC.participants.values()).map((p, idx) =>
      AuctionManager.submitBid(roomC, p.id, 10 + idx)
    );

    await Promise.all([...promisesA, ...promisesB, ...promisesC]);

    // 6. Verify all three rooms resolved their own winners independently
    expect(roomA.auctionState.phase).toBe('REVEALING');
    expect(roomB.auctionState.phase).toBe('REVEALING');
    expect(roomC.auctionState.phase).toBe('REVEALING');

    // Room A winning bid should be 20 + 11 = 31
    expect(roomA.auctionState.lastRevealResult?.winningBid).toBe(31);
    expect(roomA.auctionState.lastRevealResult?.winnerSquadName).toBe('A_Squad_12');

    // Room B winning bid should be 50 + 9 = 59
    expect(roomB.auctionState.lastRevealResult?.winningBid).toBe(59);
    expect(roomB.auctionState.lastRevealResult?.winnerSquadName).toBe('B_Squad_10');

    // Room C winning bid should be 10 + 8 = 18
    expect(roomC.auctionState.lastRevealResult?.winningBid).toBe(18);
    expect(roomC.auctionState.lastRevealResult?.winnerSquadName).toBe('C_Squad_9');

    // Verify budgets did not leak across rooms
    const winnerSquadA = roomA.squads.get(roomA.auctionState.lastRevealResult!.winnerSquadId!)!;
    expect(winnerSquadA.budget).toBe(200 - 31);

    const winnerSquadB = roomB.squads.get(roomB.auctionState.lastRevealResult!.winnerSquadId!)!;
    expect(winnerSquadB.budget).toBe(300 - 59);

    const winnerSquadC = roomC.squads.get(roomC.auctionState.lastRevealResult!.winnerSquadId!)!;
    expect(winnerSquadC.budget).toBe(150 - 18);
  });
});
