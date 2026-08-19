import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../src/rooms/RoomManager.js';
import { INITIAL_PLAYER_POOL } from '../../src/repositories/memory/InMemoryDatabase.js';

describe('RoomManager', () => {
  beforeEach(() => {
    RoomManager.reset();
  });

  it('should create room with host and initial squad', () => {
    const result = RoomManager.createRoom(
      {
        auctionName: 'Super League Auction',
        startingBudget: 200,
        minParticipants: 2,
        maxParticipants: 12,
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'Alex',
      INITIAL_PLAYER_POOL,
      'Alex FC'
    );

    expect(result.roomCode).toBeDefined();
    expect(result.hostToken).toBeDefined();
    expect(result.participantId).toBeDefined();
    expect(result.sessionToken).toBeDefined();

    const room = RoomManager.getRoom(result.roomCode);
    expect(room).toBeDefined();
    expect(room?.participants.size).toBe(1);
    expect(room?.squads.size).toBe(1);
    expect(room?.squads.get(result.squadId)?.squadName).toBe('Alex FC');
  });

  it('should allow participants to join up to max limit', () => {
    const { roomCode } = RoomManager.createRoom(
      {
        auctionName: 'Super League Auction',
        startingBudget: 200,
        minParticipants: 2,
        maxParticipants: 3, // limit to 3 (host + 2 guests)
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'HostUser',
      INITIAL_PLAYER_POOL
    );

    const guest1 = RoomManager.joinRoom(roomCode, 'Guest 1', 'Squad 1');
    expect(guest1.participantId).toBeDefined();

    const guest2 = RoomManager.joinRoom(roomCode, 'Guest 2', 'Squad 2');
    expect(guest2.participantId).toBeDefined();

    // 4th participant should fail because max is 3
    expect(() =>
      RoomManager.joinRoom(roomCode, 'Guest 3', 'Squad 3')
    ).toThrowError('Room has reached maximum capacity');
  });

  it('should reject duplicate squad names (case-insensitive)', () => {
    const { roomCode } = RoomManager.createRoom(
      {
        auctionName: 'Super League Auction',
        startingBudget: 200,
        minParticipants: 2,
        maxParticipants: 12,
        minBid: 1,
        allowHostForceReveal: true,
    purseMode: 'SAME',
      },
      'HostUser',
      INITIAL_PLAYER_POOL,
      'Red Devils'
    );

    expect(() =>
      RoomManager.joinRoom(roomCode, 'Guest 1', 'red devils')
    ).toThrowError('is already taken');
  });

  it('should authenticate valid session tokens and reject invalid ones', () => {
    const { roomCode, participantId, sessionToken } = RoomManager.createRoom(
      {
        auctionName: 'Super League Auction',
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

    const auth = RoomManager.authenticate(roomCode, participantId, sessionToken);
    expect(auth.participant.id).toBe(participantId);

    expect(() =>
      RoomManager.authenticate(roomCode, participantId, 'wrong_token')
    ).toThrowError('Invalid session');
  });
});
