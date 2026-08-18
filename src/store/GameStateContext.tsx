import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { RoomState, CurrentUser, AuctionSettings, Player, Bid, Squad } from '../types';
import { MOCK_PLAYERS } from '../lib/mockData';
import { createBidSchema } from '../lib/validations/bid';
import { useAuctionSocket } from '../hooks/useAuctionSocket';

interface GameContextType {
  currentUser: CurrentUser | null;
  room: RoomState | null;
  createRoom: (settings: AuctionSettings, hostName: string, squadName: string) => void;
  joinRoom: (code: string, participantName: string, squadName: string) => void;
  leaveRoom: () => void;
  toggleReady: () => void;
  startAuction: () => void;
  submitBid: (amount: number) => void;
  forceReveal: () => void;
  nextPlayer: () => void;
  skipPlayer: () => void;
  endAuction: () => void;
  kickSquad: (squadId: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}

const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const generateId = () => Math.random().toString(36).substring(2, 9);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);

  const forceReveal = useCallback(() => {
    setRoom(prev => {
      if (!prev || prev.auctionState.phase !== 'bidding') return prev;
      
      const { bids } = prev.auctionState;
      const bidList = Object.values(bids) as Bid[];
      
      let winningBid: Bid | null = null;
      let tieBreakInProgress = false;
      const invalidBids: string[] = [];

      // Validate bids against budget
      const validBids = bidList.filter(b => {
        const squad = prev.squads.find(s => s.id === b.squadId);
        if (!squad || b.amount > squad.budget) {
          invalidBids.push(b.squadId);
          return false;
        }
        return true;
      });

      if (validBids.length > 0) {
        // Sort by amount desc, then timestamp asc (earlier bid wins tie if no tie break random)
        validBids.sort((a, b) => b.amount - a.amount || a.timestamp - b.timestamp);
        winningBid = validBids[0];
        
        // Check for tie on amount
        const topAmount = validBids[0].amount;
        const tiedBids = validBids.filter(b => b.amount === topAmount);
        if (tiedBids.length > 1) {
          tieBreakInProgress = true;
          // Random winner for tie-break
          winningBid = tiedBids[Math.floor(Math.random() * tiedBids.length)];
        }
      }

      // Process purchase
      let updatedSquads = [...prev.squads];
      let currentPlayer = prev.playerPool.find(p => p.id === prev.auctionState.currentPlayerId);

      if (winningBid && currentPlayer) {
        updatedSquads = updatedSquads.map(s => {
          if (s.id === winningBid!.squadId) {
            return {
              ...s,
              budget: s.budget - winningBid!.amount,
              players: [...s.players, { player: currentPlayer!, amount: winningBid!.amount, round: prev.auctionState.currentRound }]
            };
          }
          return s;
        });
      }

      const historyEntry = currentPlayer ? {
        round: prev.auctionState.currentRound,
        player: currentPlayer,
        winningSquadId: winningBid ? winningBid.squadId : null,
        winningAmount: winningBid ? winningBid.amount : 0,
        bids: { ...bids }
      } : null;

      return {
        ...prev,
        squads: updatedSquads,
        history: historyEntry ? [...prev.history, historyEntry] : prev.history,
        auctionState: {
          ...prev.auctionState,
          phase: 'reveal',
          winningBid,
          tieBreakInProgress,
          invalidBids
        }
      };
    });
  }, []);

  const socket = useAuctionSocket(room, currentUser, setRoom, forceReveal);

  const createRoom = (settings: AuctionSettings, hostName: string, squadName: string) => {
    const hostId = generateId();
    const squadId = generateId();
    const code = generateCode();

    const hostSquad: Squad = {
      id: squadId,
      ownerId: hostId,
      ownerName: hostName,
      squadName: squadName,
      badge: `https://api.dicebear.com/7.x/shapes/svg?seed=${squadId}`,
      budget: settings.budget,
      isReady: true,
      players: [],
    };

    const newRoom: RoomState = {
      code,
      hostId,
      status: 'lobby',
      settings,
      squads: [hostSquad],
      playerPool: [...MOCK_PLAYERS].sort(() => Math.random() - 0.5), // Shuffle
      auctionState: {
        currentRound: 0,
        currentPlayerId: null,
        phase: 'idle',
        bids: {},
        tieBreakInProgress: false,
        invalidBids: [],
        winningBid: null,
      },
      history: [],
    };

    setCurrentUser({ id: hostId, name: hostName, squadId, isHost: true });
    setRoom(newRoom);
  };

  const joinRoom = (code: string, participantName: string, squadName: string) => {
    if (!room || room.code !== code) {
      // Mocking joining a non-existent room by creating one for the demo
      // In a real app this would call an API.
      // For this demo, let's just error if it doesn't match the local state,
      // but to allow multi-tab testing we'd need localstorage.
      // We'll just throw for now.
      alert('Room not found or not in this browser session. Try creating a room first.');
      return;
    }
    if (room.squads.length >= room.settings.participantLimit) {
      alert('Room is full.');
      return;
    }
    if (room.status !== 'lobby') {
      alert('Auction has already started.');
      return;
    }

    const userId = generateId();
    const squadId = generateId();
    const newSquad: Squad = {
      id: squadId,
      ownerId: userId,
      ownerName: participantName,
      squadName: squadName,
      badge: `https://api.dicebear.com/7.x/shapes/svg?seed=${squadId}`,
      budget: room.settings.budget,
      isReady: false,
      players: [],
    };

    setCurrentUser({ id: userId, name: participantName, squadId, isHost: false });
    setRoom((prev) => prev ? { ...prev, squads: [...prev.squads, newSquad] } : null);
  };

  const leaveRoom = () => {
    if (room && currentUser && !currentUser.isHost) {
      setRoom(prev => prev ? {
        ...prev,
        squads: prev.squads.filter(s => s.id !== currentUser.squadId)
      } : null);
    }
    setCurrentUser(null);
    if (currentUser?.isHost) {
      setRoom(null); // Host leaving destroys room for this demo
    }
  };

  const kickSquad = (squadId: string) => {
    if (!currentUser?.isHost) return;
    setRoom(prev => prev ? { ...prev, squads: prev.squads.filter(s => s.id !== squadId) } : null);
  }

  const toggleReady = () => {
    if (!currentUser || !room) return;
    setRoom(prev => {
      if (!prev) return null;
      return {
        ...prev,
        squads: prev.squads.map(s => s.id === currentUser.squadId ? { ...s, isReady: !s.isReady } : s)
      };
    });
  };

  const startAuction = () => {
    if (!room || !currentUser?.isHost) return;
    const firstPlayer = room.playerPool[0];
    setRoom(prev => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'active',
        auctionState: {
          currentRound: 1,
          currentPlayerId: firstPlayer.id,
          phase: 'bidding',
          bids: {},
          tieBreakInProgress: false,
          invalidBids: [],
          winningBid: null,
        }
      };
    });
  };

  const submitBid = (amount: number) => {
    if (!room || !currentUser || room.auctionState.phase !== 'bidding') return;
    const squad = room.squads.find(s => s.id === currentUser.squadId);
    if (!squad) return;

    const bidSchema = createBidSchema(room.settings.minBid, squad.budget);

    const result = bidSchema.safeParse(amount);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    if (currentUser.isHost) {
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          auctionState: {
            ...prev.auctionState,
            bids: {
              ...prev.auctionState.bids,
              [currentUser.squadId]: { squadId: currentUser.squadId, amount, timestamp: Date.now() }
            }
          }
        };
      });
    } else if (socket) {
      socket.emit('client-action', {
        roomCode: room.code,
        action: 'submit-bid',
        payload: { squadId: currentUser.squadId, amount, timestamp: Date.now() }
      });
      // Optimistic update for client's own bid
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          auctionState: {
            ...prev.auctionState,
            bids: {
              ...prev.auctionState.bids,
              [currentUser.squadId]: { squadId: currentUser.squadId, amount, timestamp: Date.now() }
            }
          }
        };
      });
    }
  };

  const nextPlayer = useCallback(() => {
    setRoom(prev => {
      if (!prev) return null;
      const currentIndex = prev.playerPool.findIndex(p => p.id === prev.auctionState.currentPlayerId);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= prev.playerPool.length) {
        return { ...prev, status: 'finished' };
      }

      return {
        ...prev,
        auctionState: {
          currentRound: prev.auctionState.currentRound + 1,
          currentPlayerId: prev.playerPool[nextIndex].id,
          phase: 'bidding',
          bids: {},
          tieBreakInProgress: false,
          invalidBids: [],
          winningBid: null,
        }
      };
    });
  }, []);

  const skipPlayer = useCallback(() => {
    // Treat as unsold
    forceReveal();
    setTimeout(() => {
      nextPlayer();
    }, 1000);
  }, [forceReveal, nextPlayer]);

  const endAuction = () => {
    setRoom(prev => prev ? { ...prev, status: 'finished' } : null);
  };

  // Auto-advance to next player after reveal
  useEffect(() => {
    if (room?.status === 'active' && room.auctionState.phase === 'reveal') {
      const timer = setTimeout(() => {
        nextPlayer();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [room?.status, room?.auctionState.phase, room?.auctionState.currentPlayerId, nextPlayer]);

  return (
    <GameContext.Provider value={{
      currentUser, room, createRoom, joinRoom, leaveRoom, toggleReady, startAuction, submitBid, forceReveal, nextPlayer, skipPlayer, endAuction, kickSquad
    }}>
      {children}
    </GameContext.Provider>
  );
}
