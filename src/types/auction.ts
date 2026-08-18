import { Player } from './player.js';
import { SealedBid } from './bid.js';

export type AuctionPhase =
  | 'WAITING'
  | 'LOBBY'
  | 'STARTING'
  | 'BIDDING'
  | 'REVEALING'
  | 'COMPLETED'
  | 'ENDED';

export interface TieBreakResult {
  isTie: boolean;
  tiedSquadIds: string[];
  winnerSquadId: string;
  method: 'cryptographic_random';
  timestamp: number;
}

export interface RevealResult {
  round: number;
  player: Player;
  bids: {
    participantId: string;
    squadId: string;
    squadName: string;
    amount: number;
    isValid: boolean;
    invalidReason?: string;
  }[];
  winnerSquadId: string | null;
  winnerParticipantId: string | null;
  winnerSquadName: string | null;
  winningBid: number;
  tieBreak: TieBreakResult | null;
  timestamp: number;
}

export interface RoundHistory {
  round: number;
  player: Player;
  winnerSquadId: string | null;
  winnerSquadName: string | null;
  winningBid: number;
  bids: {
    squadId: string;
    squadName: string;
    amount: number;
  }[];
  tieBreak: TieBreakResult | null;
  timestamp: number;
}

export interface AuctionState {
  currentRound: number;
  phase: AuctionPhase;
  currentPlayer: Player | null;
  bids: Record<string, SealedBid>; // participantId -> SealedBid
  roundLocked: boolean;
  lastRevealResult: RevealResult | null;
  playerSequence: string[]; // Ordered Player IDs for this auction
  currentPlayerIndex: number;
  history: RoundHistory[];
}
