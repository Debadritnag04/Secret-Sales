import { RoomData, RoomSettings, Participant } from '../types/room.js';
import { Squad } from '../types/team.js';
import { Player } from '../types/player.js';
import { generateId, generateRoomCode, generateSecureToken } from '../utils/random.js';

export class RoomStateFactory {
  static createInitialRoom(
    settings: RoomSettings,
    hostName: string,
    playerPool: Player[]
  ): { room: RoomData; hostToken: string; hostSessionToken: string; hostParticipantId: string; hostSquadId: string } {
    const roomId = generateId('room');
    const roomCode = generateRoomCode();
    const hostToken = generateSecureToken('host');
    const hostSessionToken = generateSecureToken('sess');
    const hostParticipantId = generateId('part');
    const hostSquadId = generateId('sq');

    const hostSquad: Squad = {
      id: hostSquadId,
      participantId: hostParticipantId,
      ownerName: hostName,
      squadName: `${hostName}'s Squad`,
      budget: settings.startingBudget,
      startingBudget: settings.startingBudget,
      spent: 0,
      isReady: true,
      roster: [],
    };

    const hostParticipant: Participant = {
      id: hostParticipantId,
      name: hostName,
      squadId: hostSquadId,
      squadName: hostSquad.squadName,
      isHost: true,
      sessionToken: hostSessionToken,
      isConnected: false,
      socketId: null,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
    };

    const participants = new Map<string, Participant>();
    participants.set(hostParticipantId, hostParticipant);

    const squads = new Map<string, Squad>();
    squads.set(hostSquadId, hostSquad);

    const room: RoomData = {
      id: roomId,
      code: roomCode,
      hostId: hostParticipantId,
      hostToken,
      settings,
      participants,
      squads,
      playerPool: [...playerPool],
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
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return {
      room,
      hostToken,
      hostSessionToken,
      hostParticipantId,
      hostSquadId,
    };
  }
}
