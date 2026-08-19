import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../src/rooms/RoomManager.js';
import { AuctionEngine } from '../../src/auction/AuctionEngine.js';
import { AuctionService } from '../../src/services/AuctionService.js';
import { INITIAL_PLAYER_POOL } from '../../src/repositories/memory/InMemoryDatabase.js';

describe('Security & Authorization Tests', () => {
  beforeEach(() => {
    RoomManager.reset();
  });

  it('should prevent non-host participant from starting auction', async () => {
    const host = RoomManager.createRoom(
      {
        auctionName: 'Security Cup',
        startingBudget: 200,
        minParticipants: 2,
        maxParticipants: 12,
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'HostUser',
      INITIAL_PLAYER_POOL
    );

    const guest = RoomManager.joinRoom(host.roomCode, 'GuestUser', 'GuestSquad');

    const auctionService = new AuctionService();

    // Guest tries to start auction
    await expect(
      auctionService.startAuction(host.roomCode, guest.participantId)
    ).rejects.toThrowError('Only the room host can start the auction');
  });

  it('should prevent non-host participant from force revealing', async () => {
    const host = RoomManager.createRoom(
      {
        auctionName: 'Security Cup',
        startingBudget: 200,
        minParticipants: 2,
        maxParticipants: 12,
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'HostUser',
      INITIAL_PLAYER_POOL
    );

    const guest = RoomManager.joinRoom(host.roomCode, 'GuestUser', 'GuestSquad');
    const room = RoomManager.getRoom(host.roomCode)!;

    AuctionEngine.startAuction(room);

    const auctionService = new AuctionService();

    // Guest tries to force reveal
    await expect(
      auctionService.forceReveal(host.roomCode, guest.participantId)
    ).rejects.toThrowError('Only the room host can force reveal');
  });

  it('should reject invalid session authentication attempts', () => {
    const host = RoomManager.createRoom(
      {
        auctionName: 'Security Cup',
        startingBudget: 200,
        minParticipants: 2,
        maxParticipants: 12,
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'HostUser',
      INITIAL_PLAYER_POOL
    );

    expect(() =>
      RoomManager.authenticate(host.roomCode, host.participantId, 'forged_session_token')
    ).toThrowError('Invalid session authentication token');
  });

  it('should preserve private state integrity during participant reconnection', () => {
    const host = RoomManager.createRoom(
      {
        auctionName: 'Security Cup',
        startingBudget: 200,
        minParticipants: 2,
        maxParticipants: 12,
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'HostUser',
      INITIAL_PLAYER_POOL
    );

    const guest = RoomManager.joinRoom(host.roomCode, 'GuestUser', 'GuestSquad');
    const room = RoomManager.getRoom(host.roomCode)!;

    AuctionEngine.startAuction(room);

    // Guest submits bid
    room.auctionState.bids[guest.participantId] = {
      participantId: guest.participantId,
      squadId: guest.squadId,
      squadName: 'GuestSquad',
      amount: 45,
      submittedAt: Date.now(),
    };

    // Reconnecting as Guest
    const guestState = AuctionEngine.toPrivateState(room, guest.participantId);
    expect(guestState.myBidStatus).toBe('SUBMITTED');
    expect(guestState.mySquadName).toBe('GuestSquad');
    expect(guestState.myBudget).toBe(200);

    // Reconnecting as Host (who hasn't submitted yet)
    const hostState = AuctionEngine.toPrivateState(room, host.participantId);
    expect(hostState.myBidStatus).toBe('NONE');
    expect(hostState.isHost).toBe(true);

    // Host cannot see guest's private bid amount
    expect((hostState as any).bids).toBeUndefined();
    expect(hostState.submittedCount).toBe(1);
    expect(hostState.totalParticipants).toBe(2);
  });
});
