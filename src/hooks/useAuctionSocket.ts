import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomState, CurrentUser } from '../types';

export function useAuctionSocket(
  room: RoomState | null,
  currentUser: CurrentUser | null,
  setRoom: Dispatch<SetStateAction<RoomState | null>>,
  forceReveal: () => void
) {
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize Socket Connection
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, []);

  // Join Socket Room
  useEffect(() => {
    if (socket && room?.code) {
      socket.emit('join-room', room.code);
    }
  }, [socket, room?.code]);

  // Host broadcasts state changes
  useEffect(() => {
    if (socket && room && currentUser?.isHost) {
      socket.emit('sync-state', { roomCode: room.code, state: room });
    }
  }, [socket, room, currentUser?.isHost]);

  // Clients listen for state syncs
  useEffect(() => {
    if (!socket) return;
    const handleStateSynced = (newState: RoomState) => {
      if (currentUser && !currentUser.isHost) {
        setRoom(newState);
      }
    };
    socket.on('state-synced', handleStateSynced);
    return () => { socket.off('state-synced', handleStateSynced); };
  }, [socket, currentUser, setRoom]);

  // Host listens for client actions
  useEffect(() => {
    if (!socket) return;
    const handleClientAction = ({ action, payload }: any) => {
      if (currentUser?.isHost) {
        if (action === 'submit-bid') {
          const { squadId, amount, timestamp } = payload;
          setRoom(prev => {
            if (!prev || prev.auctionState.phase !== 'bidding') return prev;
            return {
              ...prev,
              auctionState: {
                ...prev.auctionState,
                bids: {
                  ...prev.auctionState.bids,
                  [squadId]: { squadId, amount, timestamp }
                }
              }
            };
          });
        }
      }
    };
    socket.on('client-action', handleClientAction);
    return () => { socket.off('client-action', handleClientAction); };
  }, [socket, currentUser, setRoom]);

  // Auto-Reveal Logic
  useEffect(() => {
    if (room && currentUser?.isHost && room.auctionState.phase === 'bidding') {
      const submittedBids = Object.keys(room.auctionState.bids).length;
      const totalSquads = room.squads.length;
      if (submittedBids === totalSquads && totalSquads > 0) {
        // Automatically trigger reveal when all bids are received with a slight UX delay
        const timer = setTimeout(() => forceReveal(), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [room?.auctionState.bids, room?.squads.length, room?.auctionState.phase, currentUser?.isHost, forceReveal]);

  return socket;
}
