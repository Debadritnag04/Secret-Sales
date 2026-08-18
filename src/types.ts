export type Position = 'GK' | 'DEF' | 'MID' | 'WING' | 'ST';

export interface Player {
  id: string;
  name: string;
  rating: number;
  position: Position;
  club: string;
  nationality: string;
  photoUrl: string;
  basePrice: number;
}

export interface Squad {
  id: string;
  ownerId: string;
  ownerName: string;
  squadName: string;
  badge: string;
  budget: number;
  isReady: boolean;
  players: PlayerPurchase[];
}

export interface PlayerPurchase {
  player: Player;
  amount: number;
  round: number;
}

export interface AuctionSettings {
  name: string;
  budget: number;
  maxSquadSize: number;
  minBid: number;
  allowHostForceReveal: boolean;
  participantLimit: number;
}

export type RoomStatus = 'lobby' | 'active' | 'finished';

export type AuctionPhase = 'bidding' | 'reveal' | 'idle';

export interface Bid {
  squadId: string;
  amount: number;
  timestamp: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: AuctionSettings;
  squads: Squad[];
  playerPool: Player[];
  auctionState: {
    currentRound: number;
    currentPlayerId: string | null;
    phase: AuctionPhase;
    bids: Record<string, Bid>;
    tieBreakInProgress: boolean;
    invalidBids: string[];
    winningBid: Bid | null;
  };
  history: {
    round: number;
    player: Player;
    winningSquadId: string | null;
    winningAmount: number;
    bids: Record<string, Bid>;
  }[];
}

export interface CurrentUser {
  id: string;
  name: string;
  squadId: string;
  isHost: boolean;
}
