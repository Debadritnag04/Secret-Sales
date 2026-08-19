import { describe, it, expect } from 'vitest';
import { AuctionEngine } from '../../src/auction/AuctionEngine.js';
import { RoomData } from '../../src/types/room.js';
import { Player } from '../../src/types/player.js';

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Lionel Messi', rating: 93, position: 'WING', club: 'Inter Miami', nationality: 'Argentina', photoUrl: '', basePrice: 10, status: 'available' },
  { id: 'p2', name: 'Kevin De Bruyne', rating: 91, position: 'MID', club: 'Man City', nationality: 'Belgium', photoUrl: '', basePrice: 9, status: 'available' },
];

const createMockRoom = (): RoomData => ({
  id: 'room_test',
  code: 'TEST01',
  hostId: 'part_host',
  hostToken: 'token_host',
  settings: {
    auctionName: 'Test Tournament',
    startingBudget: 200,
    minParticipants: 2,
    maxParticipants: 12,
    minBid: 1,
    allowHostForceReveal: true,
    purseMode: 'SAME',
  },
  participants: new Map([
    ['part_host', { id: 'part_host', name: 'Host', squadId: 'sq_host', squadName: 'Host Squad', isHost: true, sessionToken: 'tok_h', isConnected: true, joinedAt: 0, lastSeenAt: 0 }],
    ['part_guest', { id: 'part_guest', name: 'Guest', squadId: 'sq_guest', squadName: 'Guest Squad', isHost: false, sessionToken: 'tok_g', isConnected: true, joinedAt: 0, lastSeenAt: 0 }],
  ]),
  squads: new Map([
    ['sq_host', { id: 'sq_host', participantId: 'part_host', ownerName: 'Host', squadName: 'Host Squad', budget: 200, startingBudget: 200, spent: 0, isReady: true, purseConfirmed: true, roster: [] }],
    ['sq_guest', { id: 'sq_guest', participantId: 'part_guest', ownerName: 'Guest', squadName: 'Guest Squad', budget: 200, startingBudget: 200, spent: 0, isReady: true, purseConfirmed: true, roster: [] }],
  ]),
  playerPool: [...mockPlayers],
  auctionState: {
    currentRound: 0,
    phase: 'LOBBY',
    currentPlayer: null,
    bids: {},
    roundLocked: false,
    lastRevealResult: null,
    playerSequence: [],
    currentPlayerIndex: 0,
    history: [],
    unsoldPlayers: [],
    deciderState: null,
    deciderHistory: [],
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

describe('AuctionEngine', () => {
  it('should transition from LOBBY to BIDDING when auction starts and pick first player', () => {
    const room = createMockRoom();
    AuctionEngine.startAuction(room);

    expect(room.auctionState.phase).toBe('BIDDING');
    expect(room.auctionState.currentRound).toBe(1);
    expect(room.auctionState.currentPlayer).not.toBeNull();
    expect(room.auctionState.playerSequence.length).toBe(2);
  });

  it('should reject invalid state transitions', () => {
    const room = createMockRoom(); // In LOBBY
    expect(() => AuctionEngine.transitionPhase(room, 'REVEALING')).toThrowError('Cannot transition auction phase');
  });

  it('should transition to COMPLETED when player pool is exhausted', () => {
    const room = createMockRoom();
    AuctionEngine.startAuction(room); // Round 1 (Player 1)

    // Simulate round 1 reveal
    room.auctionState.phase = 'REVEALING';

    // Next player -> Round 2 (Player 2)
    const hasNext = AuctionEngine.advanceToNextPlayer(room);
    expect(hasNext).toBe(true);
    expect(room.auctionState.currentRound).toBe(2);

    // Simulate round 2 reveal
    room.auctionState.phase = 'REVEALING';

    // Next player -> Exhausted
    const hasMore = AuctionEngine.advanceToNextPlayer(room);
    expect(hasMore).toBe(false);
    expect(room.auctionState.phase).toBe('COMPLETED');
    expect(room.auctionState.currentPlayer).toBeNull();
  });

  it('should sanitize public state and keep bids hidden', () => {
    const room = createMockRoom();
    AuctionEngine.startAuction(room);

    // Add a sealed bid
    room.auctionState.bids['part_host'] = {
      participantId: 'part_host',
      squadId: 'sq_host',
      squadName: 'Host Squad',
      amount: 75,
      submittedAt: Date.now(),
    };

    const publicState = AuctionEngine.toPublicState(room);
    expect(publicState.submittedCount).toBe(1);
    expect(publicState.totalParticipants).toBe(2);
    expect((publicState as any).bids).toBeUndefined(); // Bids object is completely excluded from public state

    const privateState = AuctionEngine.toPrivateState(room, 'part_host');
    expect(privateState.myBidStatus).toBe('SUBMITTED');
    expect(privateState.myBudget).toBe(200);
  });
});
