import { describe, it, expect } from 'vitest';
import { BidManager } from '../../src/auction/BidManager.js';
import { Player } from '../../src/types/player.js';
import { Squad } from '../../src/types/team.js';
import { Participant, RoomSettings } from '../../src/types/room.js';
import { AuctionState } from '../../src/types/auction.js';

const mockPlayer: Player = {
  id: 'p1',
  name: 'Lionel Messi',
  rating: 93,
  position: 'WING',
  club: 'Inter Miami',
  nationality: 'Argentina',
  photoUrl: '',
  basePrice: 10,
  status: 'available',
};

const settings: RoomSettings = {
  auctionName: 'Test Auction',
  startingBudget: 200,
  minParticipants: 2,
  maxParticipants: 12,
  minBid: 1,
  allowHostForceReveal: true,
};

const createMockAuctionState = (phase: AuctionState['phase'] = 'BIDDING'): AuctionState => ({
  currentRound: 1,
  phase,
  currentPlayer: mockPlayer,
  bids: {},
  roundLocked: false,
  lastRevealResult: null,
  playerSequence: ['p1'],
  currentPlayerIndex: 1,
  history: [],
  unsoldPlayers: [],
  deciderState: null,
  deciderHistory: [],
});

describe('BidManager', () => {
  const participant: Participant = {
    id: 'part_1',
    name: 'Player One',
    squadId: 'sq_1',
    squadName: 'Kolkata Tigers',
    isHost: false,
    sessionToken: 'tok_1',
    isConnected: true,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  const squad: Squad = {
    id: 'sq_1',
    participantId: 'part_1',
    ownerName: 'Player One',
    squadName: 'Kolkata Tigers',
    budget: 150,
    startingBudget: 200,
    spent: 50,
    isReady: true,
    roster: [],
  };

  it('should accept valid bids within budget and above base price', () => {
    const state = createMockAuctionState('BIDDING');
    const validation = BidManager.validateBid(participant, squad, 50, state, settings);
    expect(validation.valid).toBe(true);
  });

  it('should reject bids exceeding remaining budget', () => {
    const state = createMockAuctionState('BIDDING');
    const validation = BidManager.validateBid(participant, squad, 160, state, settings);
    expect(validation.valid).toBe(false);
    expect(validation.code).toBe('BID_EXCEEDS_BUDGET');
  });

  it('should reject bids below player base price', () => {
    const state = createMockAuctionState('BIDDING');
    const validation = BidManager.validateBid(participant, squad, 5, state, settings); // Base price is 10
    expect(validation.valid).toBe(false);
    expect(validation.code).toBe('BID_BELOW_MINIMUM');
  });

  it('should enforce bid immutability and reject duplicate bids', () => {
    const state = createMockAuctionState('BIDDING');
    BidManager.recordBid('room_1', participant, squad, 45, state, 2);

    const validation = BidManager.validateBid(participant, squad, 50, state, settings);
    expect(validation.valid).toBe(false);
    expect(validation.code).toBe('BID_ALREADY_SUBMITTED');
  });

  it('should reject bids when auction is not in BIDDING phase', () => {
    const state = createMockAuctionState('LOBBY');
    const validation = BidManager.validateBid(participant, squad, 50, state, settings);
    expect(validation.valid).toBe(false);
    expect(validation.code).toBe('INVALID_PHASE');
  });

  it('should track submission progress without exposing bid amounts', () => {
    const state = createMockAuctionState('BIDDING');
    const { progress, isComplete } = BidManager.recordBid('room_1', participant, squad, 55, state, 2);

    expect(progress.submittedCount).toBe(1);
    expect(progress.totalParticipants).toBe(2);
    expect(isComplete).toBe(false);
  });
});
