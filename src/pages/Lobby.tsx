import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useGame } from '../store/GameStateContext';
import { Users, Copy, Shield, Play, LogOut, X, Wallet, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Lobby() {
  const { room, credentials, toggleReady, startAuction, leaveRoom, kickSquad, confirmPurse } = useGame();
  const navigate = useNavigate();
  const [purseInput, setPurseInput] = useState('');

  useEffect(() => {
    if (room?.phase === 'BIDDING' || room?.phase === 'STARTING') {
      navigate('/auction');
    }
  }, [room?.phase, navigate]);

  // If no room and no credentials, redirect to home
  if (!room && !credentials) return <Navigate to="/" />;

  // Still loading room state from socket
  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Connecting to room...</p>
        </div>
      </div>
    );
  }

  const isHost = credentials?.isHost ?? false;
  const participants = room.participants || [];
  const squads = room.squads || [];
  const readyCount = participants.filter(p => p.isReady).length;
  const totalCount = participants.length;
  const maxParticipants = room.settings?.maxParticipants ?? 12;
  const isCustomPurse = room.settings?.purseMode === 'CUSTOM';
  const allPursesConfirmed = (room as any).allPursesConfirmed ?? true;
  const mySquad = squads.find(s => s.id === credentials?.squadId);
  const myPurseConfirmed = mySquad?.purseConfirmed ?? true;

  const handleCopy = () => {
    navigator.clipboard.writeText(room.roomCode);
  };

  const handleStart = () => {
    startAuction();
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  const handleConfirmPurse = () => {
    const amount = Number(purseInput);
    if (isNaN(amount) || amount <= 0) return;
    const parts = purseInput.split('.');
    if (parts[1] && parts[1].length > 1) return;
    confirmPurse(amount);
  };

  const confirmedCount = squads.filter(s => s.purseConfirmed).length;
  const canStart = isCustomPurse ? allPursesConfirmed : true;

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Left: Squads */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{room.auctionName}</h1>
            <p className="text-zinc-400">Waiting for managers to join and ready up.</p>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-center">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1">Room Code</p>
              <p className="text-2xl font-mono text-white tracking-widest leading-none">{room.roomCode}</p>
            </div>
            <button onClick={handleCopy} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer" title="Copy Code">
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Custom Purse Configuration — for the current participant */}
        {isCustomPurse && !myPurseConfirmed && (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">Set Your Starting Purse</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">Choose your squad's starting budget for this auction.</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={purseInput}
                onChange={(e) => setPurseInput(e.target.value)}
                min="1"
                max="9999.9"
                step="0.1"
                placeholder="e.g. 200"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-amber-500 transition-colors"
              />
              <span className="text-zinc-400 font-medium">Cr</span>
              <button
                onClick={handleConfirmPurse}
                disabled={!purseInput || Number(purseInput) <= 0}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-semibold transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* Custom Purse Confirmed — show current purse */}
        {isCustomPurse && myPurseConfirmed && mySquad && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-white font-medium">Purse Confirmed</p>
                <p className="text-xs text-zinc-400">Your starting budget is set</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{mySquad.budget} Cr</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
          {squads.map(squad => (
            <motion.div 
              key={squad.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "p-4 rounded-2xl border transition-all relative overflow-hidden cursor-pointer",
                squad.isReady ? "bg-emerald-950/20 border-emerald-500/30" : "bg-zinc-900/50 border-zinc-800"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-bold text-emerald-400">
                  {squad.squadName.charAt(0).toUpperCase()}
                </div>
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
                <div className="flex items-center gap-2">
                  {/* Purse status indicator for custom mode */}
                  {isCustomPurse && (
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      squad.purseConfirmed ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      {squad.purseConfirmed ? (isHost ? `${squad.budget} Cr` : '✓') : '⚠'}
                    </span>
                  )}
                  {participants.find(p => p.squadName === squad.squadName)?.isHost && (
                    <Shield className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </div>

              {isHost && !participants.find(p => p.squadName === squad.squadName)?.isHost && (
                <button 
                  onClick={() => kickSquad(squad.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-400 rounded-lg opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  title="Remove Manager"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
          </AnimatePresence>
          
          {/* Empty Slots */}
          {Array.from({ length: Math.max(0, maxParticipants - totalCount) }).map((_, i) => (
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
              <span className="text-zinc-400">Purse Mode</span>
              <span className={cn("font-medium", isCustomPurse ? "text-amber-400" : "text-white")}>
                {isCustomPurse ? 'Per-Squad Custom' : 'Same for All'}
              </span>
            </div>
            {!isCustomPurse && (
              <div className="flex justify-between border-b border-zinc-800/50 pb-3">
                <span className="text-zinc-400">Starting Budget</span>
                <span className="text-emerald-400 font-medium">{room.settings?.startingBudget} Cr</span>
              </div>
            )}
            <div className="flex justify-between border-b border-zinc-800/50 pb-3">
              <span className="text-zinc-400">Min Bid</span>
              <span className="text-white font-medium">{room.settings?.minBid} Cr</span>
            </div>
            <div className="flex justify-between pb-3">
              <span className="text-zinc-400">Host Force Reveal</span>
              <span className="text-white font-medium">{room.settings?.allowHostForceReveal ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Custom Purse Status (Host view) */}
        {isCustomPurse && isHost && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Purse Status</h3>
            <div className="space-y-2">
              {squads.map(squad => (
                <div key={squad.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                  <span className="text-sm text-white truncate max-w-[120px]">{squad.squadName}</span>
                  {squad.purseConfirmed ? (
                    <span className="text-xs font-bold text-emerald-400">{squad.budget} Cr</span>
                  ) : (
                    <span className="text-xs font-bold text-amber-400">Waiting</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3 text-center">
              {confirmedCount} / {squads.length} confirmed
            </p>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-zinc-400 mb-2">Managers</p>
            <p className="text-3xl font-bold text-white mb-1">{totalCount} / {maxParticipants}</p>
            <p className="text-sm text-zinc-400">{readyCount} Ready</p>
          </div>

          <div className="space-y-3">
            {!isHost && (
              <button 
                onClick={toggleReady}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer",
                  mySquad?.isReady
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                )}
              >
                {mySquad?.isReady ? 'Unready' : 'Ready Up'}
              </button>
            )}

            {isHost && (
              <button 
                onClick={handleStart}
                disabled={!canStart}
                className={cn(
                  "w-full py-4 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer",
                  canStart
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                Start Auction
                <Play className="w-5 h-5 fill-current" />
              </button>
            )}

            <button 
              onClick={handleLeave}
              className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Leave Room
            </button>
          </div>

          {isHost && !canStart && isCustomPurse && (
            <p className="text-xs text-center text-amber-400 mt-4">All squads must confirm their purse before starting.</p>
          )}
          {isHost && canStart && (
            <p className="text-xs text-center text-zinc-500 mt-4">You can start the auction when ready.</p>
          )}
        </div>
      </div>
    </div>
  );
}
