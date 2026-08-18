import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useGame } from '../store/GameStateContext';
import { Users, Copy, CheckCircle2, Shield, Play, LogOut, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Lobby() {
  const { room, currentUser, toggleReady, startAuction, leaveRoom, kickSquad } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    if (room?.status === 'active') {
      navigate('/auction');
    }
  }, [room?.status, navigate]);

  if (!room || !currentUser) return <Navigate to="/" />;

  const isHost = currentUser.isHost;
  const readyCount = room.squads.filter(s => s.isReady).length;
  const totalCount = room.squads.length;
  const allReady = readyCount === totalCount;

  const handleCopy = () => {
    navigator.clipboard.writeText(room.code);
  };

  const handleStart = () => {
    startAuction();
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Left: Squads */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{room.settings.name}</h1>
            <p className="text-zinc-400">Waiting for managers to join and ready up.</p>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-center">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1">Room Code</p>
              <p className="text-2xl font-mono text-white tracking-widest leading-none">{room.code}</p>
            </div>
            <button onClick={handleCopy} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Copy Code">
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
          {room.squads.map(squad => (
            <motion.div 
              key={squad.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "p-4 rounded-2xl border transition-all relative overflow-hidden",
                squad.isReady ? "bg-emerald-950/20 border-emerald-500/30" : "bg-zinc-900/50 border-zinc-800"
              )}
            >
              <div className="flex items-start gap-4">
                <img src={squad.badge} alt="badge" className="w-12 h-12 rounded-xl bg-zinc-800" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{squad.squadName}</p>
                  <p className="text-sm text-zinc-400 truncate">{squad.ownerName}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", squad.isReady ? "bg-emerald-500" : "bg-zinc-600")} />
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    {squad.isReady ? 'Ready' : 'Waiting'}
                  </span>
                </div>
                {squad.id === room.hostId && (
                  <Shield className="w-4 h-4 text-emerald-500" />
                )}
              </div>

              {isHost && squad.id !== room.hostId && (
                <button 
                  onClick={() => kickSquad(squad.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-400 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
                  title="Remove Manager"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
          </AnimatePresence>
          
          {/* Empty Slots */}
          {Array.from({ length: room.settings.participantLimit - totalCount }).map((_, i) => (
            <div key={`empty-${i}`} className="p-4 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center min-h-[120px] text-zinc-600">
              <Users className="w-6 h-6 mb-2" />
              <p className="text-sm font-medium">Waiting for manager...</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Right: Controls & Rules */}
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Session Rules</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-zinc-800/50 pb-3">
              <span className="text-zinc-400">Starting Budget</span>
              <span className="text-emerald-400 font-medium">{room.settings.budget} Cr</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/50 pb-3">
              <span className="text-zinc-400">Min Bid</span>
              <span className="text-white font-medium">{room.settings.minBid} Cr</span>
            </div>
            <div className="flex justify-between pb-3">
              <span className="text-zinc-400">Host Force Reveal</span>
              <span className="text-white font-medium">{room.settings.allowHostForceReveal ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-white mb-1">{readyCount}/{totalCount}</p>
            <p className="text-sm text-zinc-400">Managers Ready</p>
          </div>

          <div className="space-y-3">
            {!isHost && (
              <button 
                onClick={toggleReady}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                  room.squads.find(s => s.id === currentUser.squadId)?.isReady
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                )}
              >
                {room.squads.find(s => s.id === currentUser.squadId)?.isReady ? 'Unready' : 'Ready Up'}
              </button>
            )}

            {isHost && (
              <button 
                onClick={handleStart}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
              >
                Start Auction
                <Play className="w-5 h-5 fill-current" />
              </button>
            )}

            <button 
              onClick={handleLeave}
              className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave Room
            </button>
          </div>

          {isHost && !allReady && (
            <p className="text-xs text-center text-zinc-500 mt-4">You can start the auction even if not everyone is ready.</p>
          )}
        </div>
      </div>
    </div>
  );
}
