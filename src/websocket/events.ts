import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { defaultRoomService } from '../services/RoomService.js';
import { defaultBidService } from '../services/BidService.js';
import { defaultAuctionService } from '../services/AuctionService.js';
import { defaultTeamService } from '../services/TeamService.js';
import { submitBidSchema } from '../validation/bidSchemas.js';
import { updateTeamNameSchema } from '../validation/auctionSchemas.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function registerSocketEvents(
  io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>
) {
  const roomCode = socket.data.roomCode!;
  const participantId = socket.data.participantId!;
  const socketRoomKey = `room:${roomCode.toUpperCase()}`;

  // Automatically join socket room
  socket.join(socketRoomKey);
  RoomManager.setConnectionStatus(roomCode, participantId, socket.id, true);

  // Send initial private/sanitized state to the connecting participant
  try {
    const initialState = defaultRoomService.getRoomState(roomCode, participantId);
    socket.emit('room:state', initialState as any);
    socket.emit('connection:status', { status: 'connected' });
  } catch (err: any) {
    socket.emit('error', { code: 'INTERNAL_ERROR', message: err.message });
  }

  // Notify other room participants AND push full state to everyone
  const currentRoom = RoomManager.getRoom(roomCode);
  const participant = currentRoom?.participants.get(participantId);
  if (participant) {
    socket.to(socketRoomKey).emit('room:participant_joined', {
      participantId: participant.id,
      name: participant.name,
      squadName: participant.squadName,
    });

    // Push authoritative state to ALL sockets in the room (including host)
    broadcastStateUpdates(io, roomCode);
  }

  // 1. Room Join event (for manual triggers or re-sync)
  socket.on('room:join', (_data, callback) => {
    try {
      const state = defaultRoomService.getRoomState(roomCode, participantId);
      socket.emit('room:state', state as any);
      if (callback) callback({ status: 'ok', state });
    } catch (err: any) {
      if (callback) callback({ status: 'error', message: err.message });
    }
  });

  // 2. Room Ready / Unready
  socket.on('room:ready', () => {
    try {
      defaultRoomService.toggleReady(roomCode, participantId, true);
      io.to(socketRoomKey).emit('room:participant_updated', {
        participantId,
        isReady: true,
        isConnected: true,
      });
      // Push full authoritative state to all clients
      broadcastStateUpdates(io, roomCode);
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'ERROR', message: err.message });
    }
  });

  socket.on('room:unready', () => {
    try {
      defaultRoomService.toggleReady(roomCode, participantId, false);
      io.to(socketRoomKey).emit('room:participant_updated', {
        participantId,
        isReady: false,
        isConnected: true,
      });
      // Push full authoritative state to all clients
      broadcastStateUpdates(io, roomCode);
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'ERROR', message: err.message });
    }
  });

  // 2b. Confirm Purse (Custom Purse mode)
  socket.on('room:confirm_purse' as any, (data: any, callback?: any) => {
    const amount = data?.amount;
    if (amount === undefined || amount === null) {
      socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Purse amount is required' });
      if (callback) callback({ status: 'error', message: 'Purse amount is required' });
      return;
    }

    try {
      RoomManager.confirmPurse(roomCode, participantId, Number(amount));
      // Broadcast full state so host and everyone sees the updated purse status
      broadcastStateUpdates(io, roomCode);
      if (callback) callback({ status: 'ok' });
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'PURSE_ERROR', message: err.message });
      if (callback) callback({ status: 'error', message: err.message });
    }
  });

  // 3. Auction Start (Host only)
  socket.on('auction:start', async () => {
    try {
      await defaultAuctionService.startAuction(roomCode, participantId);
      const room = RoomManager.getRoom(roomCode)!;
      const currentPlayer = room.auctionState.currentPlayer!;

      io.to(socketRoomKey).emit('auction:started', {
        round: room.auctionState.currentRound,
        player: currentPlayer,
      });

      io.to(socketRoomKey).emit('auction:player', {
        round: room.auctionState.currentRound,
        player: currentPlayer,
      });

      // Broadcast updated room state to all
      broadcastStateUpdates(io, roomCode);
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'AUCTION_START_FAILED', message: err.message });
    }
  });

  // 4. Submit Sealed Bid (Strict confidentiality enforced)
  socket.on('auction:submit_bid', async (data, callback) => {
    const parseResult = submitBidSchema.safeParse(data);
    if (!parseResult.success) {
      const errPayload = {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Invalid bid format',
      };
      socket.emit('auction:bid_ack', { status: 'rejected', message: errPayload.message });
      if (callback) callback(errPayload);
      return;
    }

    try {
      const result = await defaultBidService.submitBid(
        roomCode,
        participantId,
        parseResult.data.bidAmount
      );

      // Private acknowledgement to the submitter
      socket.emit('auction:bid_ack', { status: 'accepted' });
      if (callback) callback({ status: 'accepted' });

      // Broadcast progress ONLY (NEVER leak bid amount)
      io.to(socketRoomKey).emit('auction:bid_submitted', {
        submittedCount: result.progress.submittedCount,
        totalParticipants: result.progress.totalParticipants,
      });

      // If automatic reveal was triggered
      if (result.autoRevealed && result.revealOutcome) {
        handleRevealBroadcast(io, roomCode, result.revealOutcome);
      }
    } catch (err: any) {
      const code = err instanceof AppError ? err.code : 'BID_FAILED';
      socket.emit('auction:bid_ack', { status: 'rejected', message: err.message });
      socket.emit('error', { code, message: err.message });
      if (callback) callback({ status: 'rejected', code, message: err.message });
    }
  });

  // 5. Force Reveal (Host only)
  socket.on('auction:force_reveal', async () => {
    try {
      const outcome = await defaultAuctionService.forceReveal(roomCode, participantId);
      handleRevealBroadcast(io, roomCode, outcome);
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'FORCE_REVEAL_FAILED', message: err.message });
    }
  });

  // 6. Next Player (Host only)
  socket.on('auction:next', async () => {
    try {
      const hasNext = await defaultAuctionService.nextPlayer(roomCode, participantId);
      const room = RoomManager.getRoom(roomCode)!;

      if (hasNext && room.auctionState.currentPlayer) {
        io.to(socketRoomKey).emit('auction:next_player', {
          round: room.auctionState.currentRound,
          player: room.auctionState.currentPlayer,
        });
        io.to(socketRoomKey).emit('auction:player', {
          round: room.auctionState.currentRound,
          player: room.auctionState.currentPlayer,
        });
      } else {
        io.to(socketRoomKey).emit('auction:completed', {
          totalRounds: room.auctionState.currentRound,
          timestamp: Date.now(),
        });
      }

      broadcastStateUpdates(io, roomCode);
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'NEXT_PLAYER_FAILED', message: err.message });
    }
  });

  // 7. Team Update Name
  socket.on('team:update_name', async (data) => {
    const parseResult = updateTeamNameSchema.safeParse(data);
    if (!parseResult.success) {
      return socket.emit('error', {
        code: 'VALIDATION_ERROR',
        message: 'Invalid squad name',
      });
    }

    try {
      const updatedSquad = await defaultTeamService.updateTeamName(
        roomCode,
        participantId,
        parseResult.data.squadName
      );
      io.to(socketRoomKey).emit('team:updated', updatedSquad);
      broadcastStateUpdates(io, roomCode);
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'UPDATE_NAME_FAILED', message: err.message });
    }
  });

  // 8. End Auction (Host only)
  socket.on('host:end_auction', async () => {
    try {
      await defaultAuctionService.endAuction(roomCode, participantId);
      const room = RoomManager.getRoom(roomCode)!;
      io.to(socketRoomKey).emit('auction:completed', {
        totalRounds: room.auctionState.currentRound,
        timestamp: Date.now(),
      });
      broadcastStateUpdates(io, roomCode);
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'END_AUCTION_FAILED', message: err.message });
    }
  });

  // 9. Recall Unsold Player (Host only)
  socket.on('auction:recall_player', async (data: any, callback?: any) => {
    const playerId = data?.playerId;
    if (!playerId) {
      socket.emit('error', { code: 'VALIDATION_ERROR', message: 'playerId is required' });
      if (callback) callback({ status: 'error', message: 'playerId is required' });
      return;
    }

    try {
      const result = await defaultAuctionService.recallPlayer(roomCode, participantId, playerId);

      // Broadcast to all clients
      io.to(socketRoomKey).emit('auction:player_recalled', {
        player: result.player,
        newSequencePosition: result.newSequencePosition,
      });

      broadcastStateUpdates(io, roomCode);
      if (callback) callback({ status: 'ok' });
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'RECALL_FAILED', message: err.message });
      if (callback) callback({ status: 'error', message: err.message });
    }
  });

  // 10. Resolve Decider (Host only)
  socket.on('auction:resolve_decider' as any, async (data: any, callback?: any) => {
    const winningTeamId = data?.winningTeamId;
    const finalPrice = data?.finalPrice;

    if (!winningTeamId || finalPrice === undefined || finalPrice === null) {
      socket.emit('error', { code: 'VALIDATION_ERROR', message: 'winningTeamId and finalPrice are required' });
      if (callback) callback({ status: 'error', message: 'winningTeamId and finalPrice are required' });
      return;
    }

    try {
      const result = await defaultAuctionService.resolveDecider(roomCode, participantId, {
        winningTeamId,
        finalPrice: Number(finalPrice),
      });

      // Broadcast decider resolved to all clients
      io.to(socketRoomKey).emit('auction:decider_resolved' as any, {
        round: result.deciderRecord.round,
        player: result.deciderRecord.player,
        winningTeamId: result.deciderRecord.winningSquadId,
        winningTeamName: result.deciderRecord.winningSquadName,
        finalPrice: result.deciderRecord.finalPrice,
        originalHighestBid: result.deciderRecord.originalHighestBid,
        tiedSquadNames: result.deciderRecord.tiedSquadNames,
      });

      // Also emit winner event for consistency
      io.to(socketRoomKey).emit('auction:winner', {
        round: result.deciderRecord.round,
        player: result.deciderRecord.player,
        winnerSquadId: result.deciderRecord.winningSquadId,
        winnerSquadName: result.deciderRecord.winningSquadName,
        winningBid: result.deciderRecord.finalPrice,
        tieBreak: {
          isTie: true,
          tiedSquadIds: result.deciderRecord.tiedSquadIds,
          tiedSquadNames: result.deciderRecord.tiedSquadNames,
          highestBid: result.deciderRecord.originalHighestBid,
          winnerSquadId: result.deciderRecord.winningSquadId,
          winnerSquadName: result.deciderRecord.winningSquadName,
          finalPrice: result.deciderRecord.finalPrice,
          method: 'host_decider',
          decidedBy: result.deciderRecord.decidedBy,
          decidedAt: result.deciderRecord.decidedAt,
          timestamp: result.deciderRecord.decidedAt,
        },
      });

      // Budget update
      io.to(socketRoomKey).emit('budget:updated', {
        squadId: result.updatedSquad.id,
        budget: result.updatedSquad.budget,
        spent: result.updatedSquad.spent,
      });

      broadcastStateUpdates(io, roomCode);
      if (callback) callback({ status: 'ok' });
    } catch (err: any) {
      socket.emit('error', { code: err.code || 'DECIDER_FAILED', message: err.message });
      if (callback) callback({ status: 'error', message: err.message });
    }
  });

  // 11. Leave Room
  socket.on('room:leave', () => {
    socket.leave(socketRoomKey);
    RoomManager.setConnectionStatus(roomCode, participantId, null, false);
    io.to(socketRoomKey).emit('room:participant_left', {
      participantId,
      name: participant?.name || 'Participant',
    });
    // Push updated state to remaining clients
    broadcastStateUpdates(io, roomCode);
  });

  // 10. Disconnect
  socket.on('disconnect', () => {
    RoomManager.setConnectionStatus(roomCode, participantId, null, false);
    io.to(socketRoomKey).emit('room:participant_updated', {
      participantId,
      isReady: false,
      isConnected: false,
    });
    // Push updated state to remaining clients
    broadcastStateUpdates(io, roomCode);
    logger.info({ socketId: socket.id, roomCode, participantId }, '[Socket] Client disconnected');
  });
}

/**
 * Broadcasts reveal and winner events to the room
 */
function handleRevealBroadcast(
  io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
  roomCode: string,
  outcome: any
) {
  const socketRoomKey = `room:${roomCode.toUpperCase()}`;
  const { revealResult, updatedSquad, purchase, deciderRequired } = outcome;

  io.to(socketRoomKey).emit('auction:reveal_started');
  io.to(socketRoomKey).emit('auction:revealed', revealResult);

  if (deciderRequired && revealResult.isDeciderRequired) {
    // TIE detected — broadcast decider required event
    const room = RoomManager.getRoom(roomCode);
    io.to(socketRoomKey).emit('auction:decider_required' as any, {
      round: revealResult.round,
      player: revealResult.player,
      highestBid: revealResult.tieBreak?.highestBid || revealResult.winningBid,
      tiedSquads: room?.auctionState.deciderState?.tiedSquads || [],
    });
  } else if (revealResult.isUnsold) {
    // Player is unsold — broadcast unsold event
    const room = RoomManager.getRoom(roomCode);
    const unsoldCount = room ? (room.auctionState.unsoldPlayers || []).filter((u: any) => !u.recalled).length : 0;

    io.to(socketRoomKey).emit('auction:player_unsold', {
      player: revealResult.player,
      round: revealResult.round,
      unsoldCount,
    });
  } else if (revealResult.winnerSquadId) {
    io.to(socketRoomKey).emit('auction:winner', {
      round: revealResult.round,
      player: revealResult.player,
      winnerSquadId: revealResult.winnerSquadId,
      winnerSquadName: revealResult.winnerSquadName,
      winningBid: revealResult.winningBid,
      tieBreak: revealResult.tieBreak,
    });

    if (updatedSquad && purchase) {
      io.to(socketRoomKey).emit('budget:updated', {
        squadId: updatedSquad.id,
        budget: updatedSquad.budget,
        spent: updatedSquad.spent,
      });

      io.to(socketRoomKey).emit('roster:updated', {
        squadId: updatedSquad.id,
        purchase,
      });
    }
  }

  broadcastStateUpdates(io, roomCode);
}

/**
 * Sends updated private states to each connected participant in the room
 */
function broadcastStateUpdates(
  io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>,
  roomCode: string
) {
  const room = RoomManager.getRoom(roomCode);
  if (!room) return;

  const socketRoomKey = `room:${roomCode.toUpperCase()}`;
  const socketsInRoom = io.sockets.adapter.rooms.get(socketRoomKey);

  if (socketsInRoom) {
    for (const socketId of socketsInRoom) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock && sock.data.participantId) {
        try {
          const privateState = defaultRoomService.getRoomState(
            roomCode,
            sock.data.participantId
          );
          sock.emit('room:state', privateState as any);
        } catch {
          // ignore
        }
      }
    }
  }
}
