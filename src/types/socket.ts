import { PublicRoomState, PrivateParticipantState } from './room.js';
import { RevealResult } from './auction.js';
import { Player } from './player.js';
import { PlayerPurchase, Squad } from './team.js';

// Client to Server Events
export interface ClientToServerEvents {
  'room:join': (data: { roomCode: string; participantId: string; sessionToken: string }, callback?: (res: any) => void) => void;
  'room:leave': () => void;
  'room:ready': () => void;
  'room:unready': () => void;
  'auction:start': () => void;
  'auction:submit_bid': (data: { bidAmount: number }, callback?: (res: any) => void) => void;
  'auction:force_reveal': () => void;
  'auction:next': () => void;
  'auction:recall_player': (data: { playerId: string }, callback?: (res: any) => void) => void;
  'auction:resolve_decider': (data: { winningTeamId: string; finalPrice: number }, callback?: (res: any) => void) => void;
  'team:update_name': (data: { squadName: string }) => void;
  'host:end_auction': () => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  'room:state': (state: PrivateParticipantState | PublicRoomState) => void;
  'room:participant_joined': (data: { participantId: string; name: string; squadName: string }) => void;
  'room:participant_left': (data: { participantId: string; name: string }) => void;
  'room:participant_updated': (data: { participantId: string; isReady: boolean; isConnected: boolean; squadName?: string }) => void;
  'auction:started': (data: { round: number; player: Player }) => void;
  'auction:player': (data: { round: number; player: Player }) => void;
  'auction:bid_submitted': (data: { submittedCount: number; totalParticipants: number }) => void;
  'auction:bid_ack': (data: { status: 'accepted' | 'rejected'; message?: string }) => void;
  'auction:reveal_started': () => void;
  'auction:revealed': (data: RevealResult) => void;
  'auction:winner': (data: {
    round: number;
    player: Player;
    winnerSquadId: string | null;
    winnerSquadName: string | null;
    winningBid: number;
    tieBreak: any;
  }) => void;
  'auction:player_unsold': (data: { player: Player; round: number; unsoldCount: number }) => void;
  'auction:player_recalled': (data: { player: Player; newSequencePosition: number }) => void;
  'auction:decider_required': (data: { round: number; player: Player; highestBid: number; tiedSquads: { squadId: string; squadName: string; budget: number }[] }) => void;
  'auction:decider_resolved': (data: { round: number; player: Player; winningTeamId: string; winningTeamName: string; finalPrice: number; originalHighestBid: number; tiedSquadNames: string[] }) => void;
  'auction:next_player': (data: { round: number; player: Player }) => void;
  'auction:completed': (data: { totalRounds: number; timestamp: number }) => void;
  'team:updated': (squad: Squad) => void;
  'budget:updated': (data: { squadId: string; budget: number; spent: number }) => void;
  'roster:updated': (data: { squadId: string; purchase: PlayerPurchase }) => void;
  'error': (err: { code: string; message: string }) => void;
  'connection:status': (data: { status: 'connected' | 'reconnected' | 'disconnected' }) => void;
}

export interface SocketData {
  roomCode?: string;
  participantId?: string;
  squadId?: string;
  sessionToken?: string;
  isHost?: boolean;
}
