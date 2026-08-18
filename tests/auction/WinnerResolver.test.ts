import { describe, it, expect } from 'vitest';
import { WinnerResolver } from '../../src/auction/WinnerResolver.js';
import { Player } from '../../src/types/player.js';
import { SealedBid } from '../../src/types/bid.js';
import { Squad } from '../../src/types/team.js';

const mockPlayer: Player = {
  id: 'p1',
  name: 'Kylian Mbappé',
  rating: 91,
  position: 'ST',
  club: 'Real Madrid',
  nationality: 'France',
  photoUrl: '',
  basePrice: 10,
  status: 'available',
};

const createSquad = (id: string, name: string, budget = 200): Squad => ({
  id,
  participantId: `part_${id}`,
  ownerName: `Owner ${name}`,
  squadName: name,
  budget,
  startingBudget: budget,
  spent: 0,
  isReady: true,
  roster: [],
});

describe('WinnerResolver', () => {
  it('should determine the highest valid bid as the winner (First-Price Rule)', () => {
    const squadsMap = new Map<string, Squad>([
      ['sq1', createSquad('sq1', 'Team A', 200)],
      ['sq2', createSquad('sq2', 'Team B', 200)],
      ['sq3', createSquad('sq3', 'Team C', 200)],
    ]);

    const bids: SealedBid[] = [
      { participantId: 'part_sq1', squadId: 'sq1', squadName: 'Team A', amount: 55, submittedAt: 100 },
      { participantId: 'part_sq2', squadId: 'sq2', squadName: 'Team B', amount: 72, submittedAt: 101 },
      { participantId: 'part_sq3', squadId: 'sq3', squadName: 'Team C', amount: 60, submittedAt: 102 },
    ];

    const result = WinnerResolver.resolve(1, mockPlayer, bids, squadsMap);

    expect(result.winnerSquadId).toBe('sq2');
    expect(result.winnerSquadName).toBe('Team B');
    expect(result.winningBid).toBe(72); // Winner pays their own exact bid
    expect(result.tieBreak).toBeNull();
  });

  it('should invalidate bids that exceed the squad budget', () => {
    const squadsMap = new Map<string, Squad>([
      ['sq1', createSquad('sq1', 'Team A', 50)], // Budget is 50
      ['sq2', createSquad('sq2', 'Team B', 200)],
    ]);

    const bids: SealedBid[] = [
      { participantId: 'part_sq1', squadId: 'sq1', squadName: 'Team A', amount: 70, submittedAt: 100 }, // Invalid: 70 > 50
      { participantId: 'part_sq2', squadId: 'sq2', squadName: 'Team B', amount: 45, submittedAt: 101 },
    ];

    const result = WinnerResolver.resolve(1, mockPlayer, bids, squadsMap);

    expect(result.winnerSquadId).toBe('sq2');
    expect(result.winnerSquadName).toBe('Team B');
    expect(result.winningBid).toBe(45);

    const invalidBid = result.bids.find((b) => b.squadId === 'sq1');
    expect(invalidBid?.isValid).toBe(false);
    expect(invalidBid?.invalidReason).toContain('exceeds remaining budget');
  });

  it('should resolve multi-way ties using cryptographic random selection', () => {
    const squadsMap = new Map<string, Squad>([
      ['sq1', createSquad('sq1', 'Team A', 200)],
      ['sq2', createSquad('sq2', 'Team B', 200)],
      ['sq3', createSquad('sq3', 'Team C', 200)],
    ]);

    const bids: SealedBid[] = [
      { participantId: 'part_sq1', squadId: 'sq1', squadName: 'Team A', amount: 80, submittedAt: 100 },
      { participantId: 'part_sq2', squadId: 'sq2', squadName: 'Team B', amount: 80, submittedAt: 101 },
      { participantId: 'part_sq3', squadId: 'sq3', squadName: 'Team C', amount: 60, submittedAt: 102 },
    ];

    const result = WinnerResolver.resolve(1, mockPlayer, bids, squadsMap);

    expect(['sq1', 'sq2']).toContain(result.winnerSquadId);
    expect(result.winningBid).toBe(80);
    expect(result.tieBreak).not.toBeNull();
    expect(result.tieBreak?.isTie).toBe(true);
    expect(result.tieBreak?.tiedSquadIds).toEqual(['sq1', 'sq2']);
    expect(result.tieBreak?.winnerSquadId).toBe(result.winnerSquadId);
    expect(result.tieBreak?.method).toBe('cryptographic_random');
  });

  it('should return no winner if no bids were placed', () => {
    const squadsMap = new Map<string, Squad>([
      ['sq1', createSquad('sq1', 'Team A', 200)],
    ]);

    const result = WinnerResolver.resolve(1, mockPlayer, [], squadsMap);

    expect(result.winnerSquadId).toBeNull();
    expect(result.winningBid).toBe(0);
    expect(result.bids.length).toBe(0);
  });
});
