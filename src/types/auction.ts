import { Player } from './player.js';
import { SealedBid } from './bid.js';

export type AuctionPhase =
  | 'WAITING'
  | 'LOBBY'
  | 'STARTING'
  | 'BIDDING'
  | 'REVEALING'
  | 'DECIDER'
  | 'COMPLETED'
  | 'ENDED';

export interface TieBreakResult {
  isTie: boolean;
  tiedSquadIds: string[];
  tiedSquadNames: string[];
  highestBid: number;
  winnerSquadId: string | null;
  winnerSquadName: string | null;
  finalPrice: number | null;
  method: 'host_decider' | 'cryptographic_random';
  decidedBy?: string;
  decidedAt?: number;
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
  isUnsold: boolean;
  isDeciderRequired: boolean;
  timestamp: number;
}

export interface DeciderState {
  roundId: string;
  player: Player;
  highestBid: number;
  tiedSquads: { squadId: string; squadName: string; budget: number }[];
}

export interface DeciderResolution {
  winningTeamId: string;
  finalPrice: number;
}

export interface DeciderRecord {
  round: number;
  player: Player;
  originalHighestBid: number;
  tiedSquadIds: string[];
  tiedSquadNames: string[];
  winningSquadId: string;
  winningSquadName: string;
  finalPrice: number;
  decidedBy: string;
  decidedAt: number;
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
  decider?: DeciderRecord | null;
  timestamp: number;
}

export interface UnsoldPlayerRecord {
  player: Player;
  originalRound: number;
  markedUnsoldAt: number;
  recalled: boolean;
  recalledAt?: number;
  recalledRound?: number;
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
  unsoldPlayers: UnsoldPlayerRecord[];
  deciderState: DeciderState | null;
  deciderHistory: DeciderRecord[];
}
