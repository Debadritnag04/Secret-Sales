import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useGame } from '../store/GameStateContext';
import { Timer, Eye, CheckCircle2, DollarSign, Award, ArrowRight, SkipForward } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Bid } from '../types';

export default function Auction() {
  const { room, currentUser, submitBid, forceReveal, nextPlayer, skipPlayer } = useGame();
  const [bidInput, setBidInput] = useState<string>('');

  if (!room || !currentUser) return <Navigate to="/" />;
  if (room.status === 'finished') return <Navigate to="/results" />;

  const isHost = currentUser.isHost;
  const { currentRound, currentPlayerId, phase, bids, winningBid, tieBreakInProgress } = room.auctionState;
  const currentPlayer = room.playerPool.find(p => p.id === currentPlayerId);
  const mySquad = room.squads.find(s => s.id === currentUser.squadId);
  const myBid = bids[currentUser.squadId];
  const submittedCount = Object.keys(bids).length;
  const waitingSquads = room.squads.filter(s => !bids[s.id]);
  
  if (!currentPlayer || !mySquad) return null;

  const handleBid = () => {
    const amount = Number(bidInput);
    if (!amount || isNaN(amount)) return;
    submitBid(amount);
  };

  const presetBids = [
    currentPlayer.basePrice,
    currentPlayer.basePrice + 5,
    currentPlayer.basePrice + 10,
    currentPlayer.basePrice + 20
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 font-medium">Round <span className="text-white">{currentRound}</span> / {room.playerPool.length}</span>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", phase === 'bidding' ? "bg-emerald-500 animate-pulse" : "bg-blue-500")} />
            <span className="text-sm text-zinc-300 font-medium uppercase tracking-wider">
              {phase === 'bidding' ? 'Accepting Bids' : 'Results Reveal'}
            </span>
          </div>
        </div>

        {isHost && phase === 'bidding' && (
          <div className="flex items-center gap-3">
            <button onClick={skipPlayer} className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors flex items-center gap-1">
              <SkipForward className="w-3 h-3" /> Skip
            </button>
            {room.settings.allowHostForceReveal && (
              <button 
                onClick={() => {
                  if (waitingSquads.length > 0 && !window.confirm(`${waitingSquads.length} squads haven't submitted. Are you sure you want to reveal?`)) return;
                  forceReveal();
                }} 
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> Force Reveal
              </button>
            )}
          </div>
        )}
        {isHost && phase === 'reveal' && (
           <button onClick={nextPlayer} className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors flex items-center gap-2">
           Next Player <ArrowRight className="w-4 h-4" />
         </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Panel: All Squads (Compact) */}
        <div className="w-full md:w-64 lg:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/50 p-4 overflow-y-auto shrink-0 flex flex-row md:flex-col gap-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 hidden md:block">Room Standings</h3>
          {room.squads.map(squad => {
            const hasBid = !!bids[squad.id];
            return (
              <div key={squad.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 min-w-[200px] md:min-w-0">
                <div className="flex items-center gap-3">
                  <img src={squad.badge} alt="" className="w-8 h-8 rounded-lg bg-zinc-800" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white truncate max-w-[100px]">{squad.squadName}</span>
                    <span className="text-xs text-zinc-400">{squad.budget} Cr</span>
                  </div>
                </div>
                {phase === 'bidding' && hasBid && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {phase === 'reveal' && winningBid?.squadId === squad.id && (
                  <Award className="w-4 h-4 text-amber-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* Center: Main Stage */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-zinc-950 relative">
          <div className="flex-1 p-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
            {phase === 'bidding' ? (
              <motion.div 
                key={`bidding-${currentPlayer.id}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="relative h-64 bg-zinc-800 p-6 flex flex-col items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent z-10" />
                  <img src={currentPlayer.photoUrl} alt="" className="w-40 h-40 object-cover z-20 mix-blend-luminosity opacity-80" />
                  
                  <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                    <div className="bg-zinc-950/80 backdrop-blur text-white px-3 py-1 text-lg font-bold rounded-lg border border-zinc-800/50">
                      {currentPlayer.rating}
                    </div>
                    <div className="bg-zinc-950/80 backdrop-blur text-zinc-300 px-3 py-1 text-sm font-bold rounded-lg border border-zinc-800/50 text-center">
                      {currentPlayer.position}
                    </div>
                  </div>
                </div>
                
                <div className="p-6 text-center relative z-20 bg-zinc-900">
                  <h2 className="text-3xl font-bold text-white mb-2">{currentPlayer.name}</h2>
                  <p className="text-zinc-400 font-medium mb-6">{currentPlayer.club} • {currentPlayer.nationality}</p>
                  
                  <div className="flex items-center justify-center gap-8 border-t border-zinc-800 pt-6">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Base Price</p>
                      <p className="text-xl font-bold text-white">{currentPlayer.basePrice} Cr</p>
                    </div>
                    <div className="w-px h-10 bg-zinc-800" />
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Bids Received</p>
                      <div className="text-xl font-bold text-emerald-500 flex items-center justify-center gap-1">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={submittedCount}
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="inline-block"
                          >
                            {submittedCount}
                          </motion.span>
                        </AnimatePresence>
                        <span>/ {room.squads.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dynamic Waiting List */}
                  {waitingSquads.length > 0 ? (
                    <div className="mt-6 pt-6 border-t border-zinc-800 text-left">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-semibold text-center">
                        Waiting for ({waitingSquads.length})
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <AnimatePresence mode="popLayout">
                          {waitingSquads.map(s => (
                            <motion.div
                              key={s.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2 }}
                              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-full flex items-center gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-xs font-medium text-zinc-300">{s.squadName}</span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                       <p className="text-sm text-emerald-400 font-bold">All bids received! Revealing...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Reveal State */
              <motion.div 
                key={`reveal-${currentPlayer.id}`}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl w-full"
              >
                {tieBreakInProgress && (
                  <div className="text-center mb-8 animate-pulse">
                    <h3 className="text-2xl font-bold text-amber-500 mb-2">Tie Break!</h3>
                    <p className="text-zinc-400">Multiple managers bid the exact same highest amount.</p>
                  </div>
                )}
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center mb-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                  {winningBid ? (
                    <>
                      <h3 className="text-zinc-400 uppercase tracking-widest text-sm font-semibold mb-6">Sold To</h3>
                      <div className="flex items-center justify-center gap-6 mb-6">
                        <img src={room.squads.find(s => s.id === winningBid.squadId)?.badge} className="w-16 h-16 rounded-2xl bg-zinc-800" />
                        <div className="text-left">
                          <p className="text-3xl font-bold text-white">{room.squads.find(s => s.id === winningBid.squadId)?.squadName}</p>
                          <p className="text-emerald-400 font-medium">{room.squads.find(s => s.id === winningBid.squadId)?.ownerName}</p>
                        </div>
                      </div>
                      <div className="inline-block bg-zinc-950 border border-zinc-800 rounded-2xl px-8 py-4">
                        <p className="text-zinc-500 text-sm mb-1">Winning Bid</p>
                        <p className="text-4xl font-bold text-emerald-400">{winningBid.amount} Cr</p>
                      </div>
                    </>
                  ) : (
                    <div className="py-12">
                      <p className="text-2xl font-bold text-zinc-500">Unsold</p>
                      <p className="text-zinc-600 mt-2">No valid bids were placed.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.values(bids) as Bid[]).sort((a,b) => b.amount - a.amount).map(bid => {
                    const squad = room.squads.find(s => s.id === bid.squadId);
                    const isWinner = bid.squadId === winningBid?.squadId;
                    const isInvalid = room.auctionState.invalidBids.includes(bid.squadId);
                    
                    return (
                      <div key={bid.squadId} className={cn(
                        "p-3 rounded-xl border flex items-center justify-between",
                        isWinner ? "bg-emerald-950/30 border-emerald-500/50" : 
                        isInvalid ? "bg-red-950/20 border-red-500/20 opacity-50" :
                        "bg-zinc-900 border-zinc-800"
                      )}>
                        <div className="flex items-center gap-2">
                          <img src={squad?.badge} className="w-6 h-6 rounded bg-zinc-800" />
                          <span className="text-sm font-medium text-white truncate max-w-[80px]">{squad?.squadName}</span>
                        </div>
                        <span className={cn("text-sm font-bold", isWinner ? "text-emerald-400" : isInvalid ? "text-red-400 line-through" : "text-zinc-300")}>
                          {bid.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
            </AnimatePresence>
            
          </div>

          {/* Bottom Action Area */}
          <div className="bg-zinc-950 border-t border-zinc-800 p-6 shrink-0 z-30 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
              
              {/* My Budget Info */}
              <div className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Available Budget</p>
                  <p className="text-2xl font-bold text-white">{mySquad.budget} <span className="text-zinc-500 text-lg">Cr</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Squad Size</p>
                  <p className="text-lg font-bold text-white">{mySquad.players.length} / {room.settings.maxSquadSize}</p>
                </div>
              </div>

              {/* Bidding Controls */}
              <div className="flex-[2] w-full">
                {phase === 'bidding' ? (
                  myBid ? (
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-5 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Bid Submitted Successfully</h3>
                      <p className="text-sm text-emerald-400/80">Amount hidden from other managers.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {presetBids.map(val => (
                          <button
                            key={val}
                            onClick={() => setBidInput(val.toString())}
                            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 transition-colors"
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input
                            type="number"
                            value={bidInput}
                            onChange={(e) => setBidInput(e.target.value)}
                            placeholder="Enter bid amount..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600 placeholder:font-normal"
                          />
                        </div>
                        <button
                          onClick={handleBid}
                          disabled={!bidInput || Number(bidInput) < room.settings.minBid}
                          className="px-8 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold text-lg transition-all"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center text-zinc-400">
                    {isHost ? 'Review results and click Next Player to continue.' : 'Waiting for host to proceed to next player.'}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
