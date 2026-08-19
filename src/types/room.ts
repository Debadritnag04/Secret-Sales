import { Squad } from './team.js';
import { AuctionState, AuctionPhase, DeciderState, DeciderRecord } from './auction.js';
import { Player } from './player.js';

export interface RoomSettings {
  auctionName: string;
  startingBudget: number;
  minParticipants: number;
  maxParticipants: number;
  minBid: number;
  allowHostForceReveal: boolean;
}

export interface Participant {
  id: string;
  name: string;
  squadId: string;
  squadName: string;
  isHost: boolean;
  sessionToken: string;
  isConnected: boolean;
  socketId?: string | null;
  joinedAt: number;
  lastSeenAt: number;
}

export interface RoomData {
  id: string;
  code: string;
  hostId: string;
  hostToken: string;
  settings: RoomSettings;
  participants: Map<string, Participant>;
  squads: Map<string, Squad>;
  playerPool: Player[];
  auctionState: AuctionState;
  createdAt: number;
  updatedAt: number;
}

export interface PublicRoomState {
  roomId: string;
  roomCode: string;
  auctionName: string;
  hostName: string;
  phase: AuctionPhase;
  currentRound: number;
  currentPlayer: Player | null;
  submittedCount: number;
  totalParticipants: number;
  participants: {
    id: string;
    name: string;
    squadName: string;
    isHost: boolean;
    isReady: boolean;
    isConnected: boolean;
  }[];
  squads: {
    id: string;
    squadName: string;
    ownerName: string;
    budget: number;
    spent: number;
    isReady: boolean;
    playerCount: number;
    roster: Squad['roster'];
  }[];
  settings: RoomSettings;
  lastRevealResult: AuctionState['lastRevealResult'];
  unsoldPlayers: {
    player: Player;
    originalRound: number;
  }[];
  unsoldCount: number;
  deciderState: DeciderState | null;
  deciderHistory: DeciderRecord[];
}

export interface PrivateParticipantState extends PublicRoomState {
  myParticipantId: string;
  mySquadId: string;
  mySquadName: string;
  isHost: boolean;
  myBidStatus: 'NONE' | 'SUBMITTED';
  myBudget: number;
}
