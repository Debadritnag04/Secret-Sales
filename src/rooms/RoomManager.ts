import { RoomData, RoomSettings, Participant } from '../types/room.js';
import { Squad } from '../types/team.js';
import { Player } from '../types/player.js';
import { RoomStateFactory } from './RoomState.js';
import { generateId, generateSecureToken } from '../utils/random.js';
import { AuditService } from '../utils/audit.js';
import { createError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CreateRoomResult {
  roomId: string;
  roomCode: string;
  hostToken: string;
  participantId: string;
  squadId: string;
  sessionToken: string;
}

export interface JoinRoomResult {
  roomId: string;
  roomCode: string;
  participantId: string;
  squadId: string;
  sessionToken: string;
}

export class RoomManager {
  private static rooms = new Map<string, RoomData>(); // roomId -> RoomData
  private static codeToId = new Map<string, string>(); // roomCode -> roomId

  /**
   * Creates a new auction room
   */
  static createRoom(
    settings: RoomSettings,
    hostName: string,
    playerPool: Player[],
    hostSquadName?: string
  ): CreateRoomResult {
    const { room, hostToken, hostSessionToken, hostParticipantId, hostSquadId } =
      RoomStateFactory.createInitialRoom(settings, hostName, playerPool);

    if (hostSquadName) {
      const squad = room.squads.get(hostSquadId);
      if (squad) squad.squadName = hostSquadName;
      const part = room.participants.get(hostParticipantId);
      if (part) part.squadName = hostSquadName;
    }

    this.rooms.set(room.id, room);
    this.codeToId.set(room.code.toUpperCase(), room.id);

    AuditService.record(room.id, room.code, 'ROOM_CREATED', {
      auctionName: settings.auctionName,
      hostName,
      maxParticipants: settings.maxParticipants,
      startingBudget: settings.startingBudget,
    });

    logger.info(
      { roomId: room.id, roomCode: room.code, hostName },
      `[RoomManager] Room created: ${room.code} (${settings.auctionName})`
    );

    return {
      roomId: room.id,
      roomCode: room.code,
      hostToken,
      participantId: hostParticipantId,
      squadId: hostSquadId,
      sessionToken: hostSessionToken,
    };
  }

  /**
   * Joins an existing room
   */
  static joinRoom(
    roomCode: string,
    participantName: string,
    squadName: string
  ): JoinRoomResult {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    if (room.auctionState.phase !== 'LOBBY' && room.auctionState.phase !== 'WAITING') {
      throw createError(
        'AUCTION_ALREADY_STARTED',
        'Cannot join room: auction is already in progress or completed',
        400
      );
    }

    if (room.participants.size >= room.settings.maxParticipants) {
      throw createError(
        'ROOM_FULL',
        `Room has reached maximum capacity of ${room.settings.maxParticipants} participants`,
        400
      );
    }

    // Validate squad name uniqueness (case-insensitive)
    const lowerSquadName = squadName.trim().toLowerCase();
    for (const squad of room.squads.values()) {
      if (squad.squadName.toLowerCase() === lowerSquadName) {
        throw createError(
          'SQUAD_NAME_TAKEN',
          `Squad name "${squadName}" is already taken in this room`,
          400
        );
      }
    }

    const participantId = generateId('part');
    const squadId = generateId('sq');
    const sessionToken = generateSecureToken('sess');

    const squad: Squad = {
      id: squadId,
      participantId,
      ownerName: participantName,
      squadName: squadName.trim(),
      budget: room.settings.purseMode === 'CUSTOM' ? 0 : room.settings.startingBudget,
      startingBudget: room.settings.purseMode === 'CUSTOM' ? 0 : room.settings.startingBudget,
      spent: 0,
      isReady: false,
      purseConfirmed: room.settings.purseMode === 'SAME', // Auto-confirmed in SAME mode
      roster: [],
    };

    const participant: Participant = {
      id: participantId,
      name: participantName.trim(),
      squadId,
      squadName: squad.squadName,
      isHost: false,
      sessionToken,
      isConnected: false,
      socketId: null,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
    };

    room.squads.set(squadId, squad);
    room.participants.set(participantId, participant);
    room.updatedAt = Date.now();

    AuditService.record(room.id, room.code, 'PARTICIPANT_JOINED', {
      participantId,
      participantName,
      squadName: squad.squadName,
      totalParticipants: room.participants.size,
    });

    logger.info(
      { roomId: room.id, roomCode: room.code, participantId, participantName, squadName: squad.squadName },
      `[RoomManager] Participant joined: ${participantName} (${squad.squadName}) in ${room.code}`
    );

    return {
      roomId: room.id,
      roomCode: room.code,
      participantId,
      squadId,
      sessionToken,
    };
  }

  /**
   * Retrieves room by code
   */
  static getRoom(roomCode: string): RoomData | undefined {
    const id = this.codeToId.get(roomCode.toUpperCase());
    if (!id) return undefined;
    return this.rooms.get(id);
  }

  /**
   * Retrieves room by ID
   */
  static getRoomById(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Validates participant authentication token
   */
  static authenticate(
    roomCode: string,
    participantId: string,
    sessionToken: string
  ): { room: RoomData; participant: Participant } {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw createError('ROOM_NOT_FOUND', `Room with code ${roomCode} not found`, 404);
    }

    const participant = room.participants.get(participantId);
    if (!participant) {
      throw createError('PARTICIPANT_NOT_FOUND', 'Participant not found in room', 404);
    }

    if (participant.sessionToken !== sessionToken) {
      throw createError('INVALID_SESSION', 'Invalid session authentication token', 401);
    }

    return { room, participant };
  }

  /**
   * Toggles or sets participant ready state in lobby
   */
  static setReady(roomCode: string, participantId: string, isReady: boolean): void {
    const room = this.getRoom(roomCode);
    if (!room) throw createError('ROOM_NOT_FOUND', 'Room not found');

    const participant = room.participants.get(participantId);
    if (!participant) throw createError('PARTICIPANT_NOT_FOUND', 'Participant not found');

    const squad = room.squads.get(participant.squadId);
    if (squad) {
      squad.isReady = isReady;
    }
  }

  /**
   * Confirms a squad's custom starting purse.
   * Only valid in CUSTOM purse mode and before auction starts.
   */
  static confirmPurse(roomCode: string, participantId: string, amount: number): void {
    const room = this.getRoom(roomCode);
    if (!room) throw createError('ROOM_NOT_FOUND', 'Room not found');

    if (room.settings.purseMode !== 'CUSTOM') {
      throw createError('VALIDATION_ERROR', 'Custom purse is not enabled for this room');
    }

    if (room.auctionState.phase !== 'LOBBY' && room.auctionState.phase !== 'WAITING') {
      throw createError('INVALID_PHASE', 'Cannot change purse after auction has started');
    }

    const participant = room.participants.get(participantId);
    if (!participant) throw createError('PARTICIPANT_NOT_FOUND', 'Participant not found');

    const squad = room.squads.get(participant.squadId);
    if (!squad) throw createError('SQUAD_NOT_FOUND', 'Squad not found');

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw createError('VALIDATION_ERROR', 'Purse must be greater than 0');
    }
    if (amount > 9999.9) {
      throw createError('VALIDATION_ERROR', 'Purse cannot exceed 9999.9 Cr');
    }
    const decimalPart = amount.toString().split('.')[1];
    if (decimalPart && decimalPart.length > 1) {
      throw createError('VALIDATION_ERROR', 'Purse can have at most 1 decimal place');
    }

    squad.startingBudget = amount;
    squad.budget = amount;
    squad.purseConfirmed = true;
    room.updatedAt = Date.now();

    logger.info(
      { roomCode, participantId, squadName: squad.squadName, purse: amount },
      `[RoomManager] Purse confirmed: ${squad.squadName} → ${amount} Cr`
    );
  }

  /**
   * Checks if all squads have confirmed their purse (for CUSTOM mode)
   */
  static allPursesConfirmed(roomCode: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (room.settings.purseMode === 'SAME') return true;
    for (const squad of room.squads.values()) {
      if (!squad.purseConfirmed) return false;
    }
    return true;
  }

  /**
   * Updates participant connection status
   */
  static setConnectionStatus(
    roomCode: string,
    participantId: string,
    socketId: string | null,
    isConnected: boolean
  ): void {
    const room = this.getRoom(roomCode);
    if (!room) return;

    const participant = room.participants.get(participantId);
    if (participant) {
      participant.isConnected = isConnected;
      participant.socketId = socketId;
      participant.lastSeenAt = Date.now();
    }
  }

  /**
   * Updates squad name with uniqueness validation
   */
  static updateSquadName(
    roomCode: string,
    participantId: string,
    newSquadName: string
  ): Squad {
    const room = this.getRoom(roomCode);
    if (!room) throw createError('ROOM_NOT_FOUND', 'Room not found');

    const participant = room.participants.get(participantId);
    if (!participant) throw createError('PARTICIPANT_NOT_FOUND', 'Participant not found');

    const squad = room.squads.get(participant.squadId);
    if (!squad) throw createError('SQUAD_NOT_FOUND', 'Squad not found');

    const lower = newSquadName.trim().toLowerCase();
    for (const s of room.squads.values()) {
      if (s.id !== squad.id && s.squadName.toLowerCase() === lower) {
        throw createError(
          'SQUAD_NAME_TAKEN',
          `Squad name "${newSquadName}" is already taken`
        );
      }
    }

    squad.squadName = newSquadName.trim();
    participant.squadName = squad.squadName;
    return squad;
  }

  /**
   * Clears in-memory rooms (useful for testing)
   */
  static reset(): void {
    this.rooms.clear();
    this.codeToId.clear();
  }
}
