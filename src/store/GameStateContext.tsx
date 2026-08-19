import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

// ─── Types matching backend responses ────────────────────────────────────────

interface ParticipantInfo {
  id: string;
  name: string;
  squadName: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
}

interface SquadInfo {
  id: string;
  squadName: string;
  ownerName: string;
  budget: number;
  spent: number;
  isReady: boolean;
  purseConfirmed: boolean;
  playerCount: number;
  roster: any[];
}

interface PlayerInfo {
  id: string;
  name: string;
  rating: number;
  position: string;
  positionGroup?: string;
  club: string;
  nationality: string;
  photoUrl?: string;
  basePrice?: number;
}

interface RoomSettings {
  auctionName: string;
  startingBudget: number;
  purseMode: 'SAME' | 'CUSTOM';
  minParticipants: number;
  maxParticipants: number;
  minBid: number;
  allowHostForceReveal: boolean;
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  auctionName: string;
  hostName: string;
  phase: string;
  currentRound: number;
  currentPlayer: PlayerInfo | null;
  submittedCount: number;
  totalParticipants: number;
  participants: ParticipantInfo[];
  squads: SquadInfo[];
  settings: RoomSettings;
  lastRevealResult: any;
  unsoldPlayers?: { player: PlayerInfo; originalRound: number }[];
  unsoldCount?: number;
  deciderState?: {
    roundId: string;
    player: PlayerInfo;
    highestBid: number;
    tiedSquads: { squadId: string; squadName: string; budget: number }[];
  } | null;
  deciderHistory?: any[];
  // Private fields (when authenticated)
  myParticipantId?: string;
  mySquadId?: string;
  mySquadName?: string;
  isHost?: boolean;
  myBidStatus?: string;
  myBudget?: number;
}

export interface SessionCredentials {
  roomCode: string;
  roomId: string;
  participantId: string;
  squadId: string;
  sessionToken: string;
  isHost: boolean;
  displayName: string;
  squadName: string;
}

interface GameContextType {
  room: RoomState | null;
  credentials: SessionCredentials | null;
  socket: Socket | null;
  isConnecting: boolean;
  error: string | null;
  createRoom: (params: CreateRoomParams) => Promise<boolean>;
  joinRoom: (roomCode: string, participantName: string, squadName: string) => Promise<boolean>;
  leaveRoom: () => void;
  toggleReady: () => void;
  startAuction: () => void;
  submitBid: (amount: number) => void;
  forceReveal: () => void;
  nextPlayer: () => void;
  endAuction: () => void;
  kickSquad: (squadId: string) => void;
  recallPlayer: (playerId: string) => void;
  resolveDecider: (winningTeamId: string, finalPrice: number) => void;
  confirmPurse: (amount: number) => void;
  restoreSession: () => Promise<boolean>;
}

interface CreateRoomParams {
  auctionName: string;
  hostName: string;
  squadName: string;
  startingBudget: number;
  maxParticipants: number;
  minBid: number;
  allowHostForceReveal: boolean;
  purseMode?: 'SAME' | 'CUSTOM';
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}

// ─── Session Storage Helpers ─────────────────────────────────────────────────

const SESSION_KEY = 'auction_session';

function saveSession(creds: SessionCredentials): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(creds));
  } catch { /* silent */ }
}

function loadSession(): SessionCredentials | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* silent */ }
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

// In production (Vercel), point to the deployed backend.
// In development, empty string means requests go to same origin (proxied by Vite).
const API_BASE = (window as any).__API_BASE__ || '';

async function apiPost<T>(path: string, body: any): Promise<{ data?: T; error?: string; code?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return { error: json.message || 'Request failed', code: json.code };
    }
    return { data: json as T };
  } catch (err: any) {
    return { error: err.message || 'Network error' };
  }
}

async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers });
    const json = await res.json();
    if (!res.ok) {
      return { error: json.message || 'Request failed' };
    }
    return { data: json as T };
  } catch (err: any) {
    return { error: err.message || 'Network error' };
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [credentials, setCredentials] = useState<SessionCredentials | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // ─── Socket Connection ───────────────────────────────────────────────────

  const connectSocket = useCallback((creds: SessionCredentials) => {
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const wsUrl = API_BASE || window.location.origin;
    const newSocket = io(wsUrl, {
      auth: {
        roomCode: creds.roomCode,
        participantId: creds.participantId,
        sessionToken: creds.sessionToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      if (err.message.includes('AUTHENTICATION_FAILED')) {
        setError('Session expired. Please rejoin the room.');
        clearSession();
        setCredentials(null);
        setRoom(null);
      }
    });

    // Authoritative state from server
    newSocket.on('room:state', (state: RoomState) => {
      setRoom(state);
    });

    // Participant joined
    newSocket.on('room:participant_joined', (data: any) => {
      toast.success(`${data.name} (${data.squadName}) joined the room`);
    });

    // Participant left
    newSocket.on('room:participant_left', (data: any) => {
      toast.info(`${data.name} left the room`);
    });

    // Participant updated (ready/connected status) — state comes via room:state
    newSocket.on('room:participant_updated', (_data: any) => {
      // The server's broadcastStateUpdates will push room:state shortly
    });

    // Auction started — update phase immediately
    newSocket.on('auction:started', (data: any) => {
      toast.success('Auction has started!');
      setRoom(prev => prev ? { ...prev, phase: 'BIDDING', currentRound: data.round, currentPlayer: data.player } : null);
    });

    // Auction player announced — update immediately
    newSocket.on('auction:player', (data: any) => {
      setRoom(prev => prev ? { ...prev, phase: 'BIDDING', currentRound: data.round, currentPlayer: data.player, submittedCount: 0, myBidStatus: 'NONE' } : null);
    });

    // Bid acknowledgement
    newSocket.on('auction:bid_ack', (data: any) => {
      if (data.status === 'accepted') {
        toast.success('Bid submitted!');
      } else {
        toast.error(data.message || 'Bid rejected');
      }
    });

    // Bid progress
    newSocket.on('auction:bid_submitted', (data: any) => {
      setRoom(prev => prev ? {
        ...prev,
        submittedCount: data.submittedCount,
        totalParticipants: data.totalParticipants,
      } : null);
    });

    // Reveal started
    newSocket.on('auction:reveal_started', () => {
      toast.info('Revealing bids...');
    });

    // Reveal result — update immediately without waiting for room:state
    newSocket.on('auction:revealed', (data: any) => {
      setRoom(prev => prev ? { ...prev, lastRevealResult: data, phase: 'REVEALING' } : null);
    });

    // Winner announced — update immediately
    newSocket.on('auction:winner', (data: any) => {
      if (data.winnerSquadName) {
        toast.success(`${data.winnerSquadName} wins for ${data.winningBid}!`);
      }
      setRoom(prev => prev ? { ...prev, lastRevealResult: data, phase: 'REVEALING' } : null);
    });

    // Player unsold — all bids were 0
    newSocket.on('auction:player_unsold', (data: any) => {
      toast.info(`${data.player?.name || 'Player'} goes UNSOLD`);
      setRoom(prev => {
        if (!prev) return null;
        const newUnsold = [...(prev.unsoldPlayers || []), { player: data.player, originalRound: data.round }];
        return { ...prev, unsoldPlayers: newUnsold, unsoldCount: newUnsold.length, phase: 'REVEALING' };
      });
    });

    // Player recalled by host
    newSocket.on('auction:player_recalled', (data: any) => {
      toast.info(`${data.player?.name || 'Player'} has been recalled into the auction`);
      setRoom(prev => {
        if (!prev) return null;
        const filtered = (prev.unsoldPlayers || []).filter(u => u.player.id !== data.player?.id);
        return { ...prev, unsoldPlayers: filtered, unsoldCount: filtered.length };
      });
    });

    // Decider required — tie detected
    newSocket.on('auction:decider_required' as any, (data: any) => {
      toast.info('Tie detected! Host must decide the winner.');
      setRoom(prev => prev ? {
        ...prev,
        phase: 'DECIDER',
        deciderState: {
          roundId: `round_${data.round}`,
          player: data.player,
          highestBid: data.highestBid,
          tiedSquads: data.tiedSquads || [],
        },
      } : null);
    });

    // Decider resolved by host
    newSocket.on('auction:decider_resolved' as any, (data: any) => {
      toast.success(`${data.winningTeamName} wins for ${data.finalPrice} Cr (Decider)`);
      setRoom(prev => prev ? {
        ...prev,
        phase: 'REVEALING',
        deciderState: null,
        lastRevealResult: {
          ...prev.lastRevealResult,
          winnerSquadId: data.winningTeamId,
          winnerSquadName: data.winningTeamName,
          winningBid: data.finalPrice,
          isDeciderRequired: false,
        },
      } : null);
    });

    // Budget updated
    newSocket.on('budget:updated', (_data: any) => {
      // Will be reflected in next room:state
    });

    // Roster updated
    newSocket.on('roster:updated', (_data: any) => {
      // Will be reflected in next room:state
    });

    // Next player — update immediately
    newSocket.on('auction:next_player', (data: any) => {
      setRoom(prev => prev ? { ...prev, phase: 'BIDDING', currentRound: data.round, currentPlayer: data.player, submittedCount: 0, myBidStatus: 'NONE', lastRevealResult: null } : null);
    });

    // Auction completed
    newSocket.on('auction:completed', (_data: any) => {
      toast.info('Auction completed!');
    });

    // Connection status
    newSocket.on('connection:status', (_data: any) => {
      // Connected successfully
    });

    // Error
    newSocket.on('error', (data: any) => {
      toast.error(data.message || 'An error occurred');
    });

    newSocket.on('disconnect', () => {
      console.warn('[Socket] Disconnected');
    });

    socketRef.current = newSocket;
  }, []);

  // ─── Create Room ─────────────────────────────────────────────────────────

  const createRoom = useCallback(async (params: CreateRoomParams): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);

    const { data, error: apiError } = await apiPost<any>('/api/rooms', {
      auctionName: params.auctionName,
      hostName: params.hostName,
      startingBudget: params.startingBudget,
      maxParticipants: params.maxParticipants,
      minBid: params.minBid,
      allowHostForceReveal: params.allowHostForceReveal,
      purseMode: params.purseMode || 'SAME',
    });

    if (apiError || !data) {
      setError(apiError || 'Failed to create room');
      setIsConnecting(false);
      return false;
    }

    const creds: SessionCredentials = {
      roomCode: data.roomCode,
      roomId: data.roomId,
      participantId: data.participantId,
      squadId: data.squadId,
      sessionToken: data.sessionToken,
      isHost: true,
      displayName: params.hostName,
      squadName: params.squadName,
    };

    setCredentials(creds);
    saveSession(creds);
    connectSocket(creds);
    setIsConnecting(false);
    return true;
  }, [connectSocket]);

  // ─── Join Room ───────────────────────────────────────────────────────────

  const joinRoom = useCallback(async (roomCode: string, participantName: string, squadName: string): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);

    const normalizedCode = roomCode.replace(/\s/g, '').toUpperCase();

    const { data, error: apiError, code } = await apiPost<any>(`/api/rooms/${normalizedCode}/join`, {
      participantName: participantName.trim(),
      squadName: squadName.trim(),
    });

    if (apiError || !data) {
      if (code === 'ROOM_NOT_FOUND') {
        setError(`Room ${normalizedCode} was not found.`);
      } else if (code === 'ROOM_FULL') {
        setError(`Room ${normalizedCode} is no longer accepting players.`);
      } else if (code === 'SQUAD_NAME_TAKEN') {
        setError(`Squad name "${squadName}" is already taken in this room.`);
      } else if (code === 'AUCTION_ALREADY_STARTED') {
        setError(`Room ${normalizedCode} is no longer accepting players.`);
      } else {
        setError(apiError || 'Failed to join room');
      }
      setIsConnecting(false);
      return false;
    }

    const creds: SessionCredentials = {
      roomCode: data.roomCode,
      roomId: data.roomId,
      participantId: data.participantId,
      squadId: data.squadId,
      sessionToken: data.sessionToken,
      isHost: false,
      displayName: participantName.trim(),
      squadName: squadName.trim(),
    };

    setCredentials(creds);
    saveSession(creds);
    connectSocket(creds);
    setIsConnecting(false);
    return true;
  }, [connectSocket]);

  // ─── Restore Session ─────────────────────────────────────────────────────

  const restoreSession = useCallback(async (): Promise<boolean> => {
    const saved = loadSession();
    if (!saved) return false;

    // Verify session is still valid by fetching room state
    const { data, error: apiError } = await apiGet<RoomState>(
      `/api/rooms/${saved.roomCode}?participantId=${saved.participantId}`,
      { 'x-participant-id': saved.participantId }
    );

    if (apiError || !data) {
      clearSession();
      return false;
    }

    setCredentials(saved);
    setRoom(data);
    connectSocket(saved);
    return true;
  }, [connectSocket]);

  // ─── Leave Room ──────────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('room:leave');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setRoom(null);
    setCredentials(null);
    clearSession();
  }, []);

  // ─── Toggle Ready ────────────────────────────────────────────────────────

  const toggleReady = useCallback(() => {
    if (!socketRef.current || !room || !credentials) return;
    const mySquad = room.squads.find(s => s.id === credentials.squadId);
    if (mySquad?.isReady) {
      socketRef.current.emit('room:unready');
    } else {
      socketRef.current.emit('room:ready');
    }
  }, [room, credentials]);

  // ─── Start Auction ───────────────────────────────────────────────────────

  const startAuction = useCallback(() => {
    if (!socketRef.current || !credentials?.isHost) return;
    socketRef.current.emit('auction:start');
  }, [credentials]);

  // ─── Submit Bid ──────────────────────────────────────────────────────────

  const submitBid = useCallback((amount: number) => {
    if (!socketRef.current || !room || room.phase !== 'BIDDING') return;
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) return;
    socketRef.current.emit('auction:submit_bid', { bidAmount: amount });
  }, [room]);

  // ─── Force Reveal ────────────────────────────────────────────────────────

  const forceReveal = useCallback(() => {
    if (!socketRef.current || !credentials?.isHost) return;
    socketRef.current.emit('auction:force_reveal');
  }, [credentials]);

  // ─── Next Player ─────────────────────────────────────────────────────────

  const nextPlayer = useCallback(() => {
    if (!socketRef.current || !credentials?.isHost) return;
    socketRef.current.emit('auction:next');
  }, [credentials]);

  // ─── End Auction ─────────────────────────────────────────────────────────

  const endAuction = useCallback(() => {
    if (!socketRef.current || !credentials?.isHost) return;
    socketRef.current.emit('host:end_auction');
  }, [credentials]);

  // ─── Kick Squad ──────────────────────────────────────────────────────────

  const kickSquad = useCallback((_squadId: string) => {
    // TODO: implement kick via socket event when backend supports it
    toast.error('Kick is not yet implemented on the server');
  }, []);

  // ─── Recall Player (Host only) ──────────────────────────────────────────

  const recallPlayer = useCallback((playerId: string) => {
    if (!socketRef.current || !credentials?.isHost) return;
    socketRef.current.emit('auction:recall_player', { playerId });
  }, [credentials]);

  // ─── Resolve Decider (Host only) ────────────────────────────────────────

  const resolveDecider = useCallback((winningTeamId: string, finalPrice: number) => {
    if (!socketRef.current || !credentials?.isHost) return;
    socketRef.current.emit('auction:resolve_decider' as any, { winningTeamId, finalPrice });
  }, [credentials]);

  // ─── Confirm Purse (Custom mode — each squad sets own) ──────────────────

  const confirmPurse = useCallback((amount: number) => {
    if (!socketRef.current || !credentials) return;
    socketRef.current.emit('room:confirm_purse' as any, { amount });
  }, [credentials]);

  // ─── Auto-restore session on mount ───────────────────────────────────────

  useEffect(() => {
    restoreSession();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reconnect on tab visibility change (mobile background/foreground) ──

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && credentials) {
        // Check if socket is still connected
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect();
        } else if (!socketRef.current) {
          connectSocket(credentials);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
    };
  }, [credentials, connectSocket]);

  return (
    <GameContext.Provider value={{
      room,
      credentials,
      socket: socketRef.current,
      isConnecting,
      error,
      createRoom,
      joinRoom,
      leaveRoom,
      toggleReady,
      startAuction,
      submitBid,
      forceReveal,
      nextPlayer,
      endAuction,
      kickSquad,
      recallPlayer,
      resolveDecider,
      confirmPurse,
      restoreSession,
    }}>
      {children}
    </GameContext.Provider>
  );
}
