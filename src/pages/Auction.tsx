import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useGame } from '../store/GameStateContext';
import { Eye, CheckCircle2, DollarSign, Award, ArrowRight, StopCircle, RotateCcw, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Auction() {
  const { room, credentials, submitBid, forceReveal, nextPlayer, endAuction, recallPlayer, resolveDecider } = useGame();
  const [bidInput, setBidInput] = useState<string>('');
  const [showUnsold, setShowUnsold] = useState(false);
  const [deciderPrice, setDeciderPrice] = useState<string>('');
  const [deciderWinner, setDeciderWinner] = useState<string>('');

  // Only redirect if there's genuinely no session at all
  if (!room && !credentials) return <Navigate to="/" />;

  // Still loading room state
  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading auction...</p>
        </div>
      </div>
    );
  }

  // If auction is completed, go to results
  if (room.phase === 'COMPLETED' || room.phase === 'ENDED') return <Navigate to="/results" />;

  // If still in lobby, go back to lobby
  if (room.phase === 'LOBBY' || room.phase === 'WAITING') return <Navigate to="/lobby" />;

  const isHost = credentials?.isHost ?? room.isHost ?? false;
  const currentPlayer = room.currentPlayer;
  const currentRound = room.currentRound;
  const submittedCount = room.submittedCount ?? 0;
  const totalParticipants = room.totalParticipants ?? (room.participants || []).length;
  const phase = room.phase;
  const myBidStatus = room.myBidStatus;
  const myBudget = room.myBudget ?? 0;
  const lastReveal = room.lastRevealResult;
  const minBid = room.settings?.minBid ?? 1;
  const squads = room.squads || [];
  const unsoldPlayers = room.unsoldPlayers || [];
  const unsoldCount = room.unsoldCount ?? unsoldPlayers.length;

  const isBidding = phase === 'BIDDING' || phase === 'STARTING';
  const isRevealing = phase === 'REVEALING';
  const isDecider = phase === 'DECIDER';
  const waitingCount = totalParticipants - submittedCount;

  const handleBid = () => {
    const amount = Number(bidInput);
    if (isNaN(amount) || amount < 0) return;
    // Validate 1 decimal place max
    const parts = bidInput.split('.');
    if (parts[1] && parts[1].length > 1) return;
    // Normal bid must be > 0
    if (amount <= 0) return;
    submitBid(amount);
    setBidInput('');
  };

  const handlePass = () => {
    submitBid(0);
  };

  const deciderState = room.deciderState;

  const handleDeciderSubmit = () => {
    if (!deciderWinner || !deciderPrice) return;
    const price = Number(deciderPrice);
    if (isNaN(price) || price < 0) return;
    // Validate 1 decimal place
    const parts = deciderPrice.split('.');
    if (parts[1] && parts[1].length > 1) return;
    resolveDecider(deciderWinner, price);
    setDeciderPrice('');
    setDeciderWinner('');
  };

  const presetBids = [minBid, minBid + 5, minBid + 10, minBid + 20].filter(v => v <= myBudget);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 font-medium">Round <span className="text-white">{currentRound}</span></span>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isBidding ? "bg-emerald-500 animate-pulse" : isDecider ? "bg-amber-500 animate-pulse" : "bg-blue-500")} />
            <span className="text-sm text-zinc-300 font-medium uppercase tracking-wider">
              {isBidding ? 'Accepting Bids' : isRevealing ? 'Results Reveal' : isDecider ? 'Decider' : phase}
            </span>
          </div>
          {unsoldCount > 0 && (
            <>
              <div className="h-4 w-px bg-zinc-800" />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md">
                <Ban className="w-3 h-3 text-red-400" />
                <span className="text-xs font-semibold text-red-400">Unsold: {unsoldCount}</span>
              </div>
            </>
          )}
        </div>

        {isHost && isBidding && (
          <div className="flex items-center gap-3">
            {room.settings?.allowHostForceReveal && (
              <button 
                onClick={() => forceReveal()}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3" /> Force Reveal
              </button>
            )}
          </div>
        )}
        {isHost && isRevealing && (
          <div className="flex items-center gap-3">
            <button onClick={() => nextPlayer()} className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors flex items-center gap-2 cursor-pointer">
              Next Player <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => endAuction()} className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer">
              <StopCircle className="w-3 h-3" /> End
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Panel: Squads + Unsold */}
        <div className="w-full md:w-64 lg:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/50 p-4 overflow-y-auto shrink-0 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Room Standings</h3>
          {squads.map(squad => (
            <div key={squad.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-emerald-400">
                  {squad.squadName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white truncate max-w-[100px]">{squad.squadName}</span>
                  <span className="text-xs text-zinc-400">{squad.budget} Cr</span>
                </div>
              </div>
              {isRevealing && lastReveal?.winnerSquadId === squad.id && (
                <Award className="w-4 h-4 text-amber-500" />
              )}
            </div>
          ))}

          {/* Unsold Players Panel */}
          {unsoldCount > 0 && (
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <button
                onClick={() => setShowUnsold(!showUnsold)}
                className="w-full flex items-center justify-between text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 cursor-pointer hover:text-red-300 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Ban className="w-3 h-3" />
                  Unsold Players ({unsoldCount})
                </span>
                {showUnsold ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {showUnsold && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-2"
                  >
                    {unsoldPlayers.map((item) => (
                      <div key={item.player.id} className="p-3 rounded-xl bg-red-950/10 border border-red-500/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                              {item.player.rating}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-white truncate max-w-[100px]">{item.player.name}</span>
                              <span className="text-[10px] text-zinc-500">{item.player.position} • R{item.originalRound}</span>
                            </div>
                          </div>
                          {isHost && (
                            <button
                              onClick={() => recallPlayer(item.player.id)}
                              className="px-2 py-1 text-[10px] font-semibold bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              title="Recall this player into the auction"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              Recall
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Center: Main Stage */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-zinc-950 relative">
          <div className="flex-1 p-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
            {isBidding && currentPlayer ? (
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
                  {currentPlayer.photoUrl && (
                    <img src={currentPlayer.photoUrl} alt="" className="w-40 h-40 object-cover z-20 mix-blend-luminosity opacity-80" />
                  )}
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
                  <p className="text-zinc-400 font-medium mb-6">{currentPlayer.club} {currentPlayer.nationality ? `• ${currentPlayer.nationality}` : ''}</p>
                  
                  <div className="flex items-center justify-center gap-8 border-t border-zinc-800 pt-6">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Min Bid</p>
                      <p className="text-xl font-bold text-white">{minBid} Cr</p>
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
                        <span>/ {totalParticipants}</span>
                      </div>
                    </div>
                  </div>
                  
                  {waitingCount > 0 ? (
                    <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                        Waiting for {waitingCount} more bid{waitingCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                      <p className="text-sm text-emerald-400 font-bold">All bids received! Revealing...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : isRevealing && lastReveal ? (
              <motion.div 
                key={`reveal-${currentRound}`}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl w-full"
              >
                {lastReveal.tieBreak && (
                  <div className="text-center mb-8 animate-pulse">
                    <h3 className="text-2xl font-bold text-amber-500 mb-2">Tie Break!</h3>
                    <p className="text-zinc-400">Multiple managers bid the same highest amount.</p>
                  </div>
                )}
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                  {lastReveal.winnerSquadName ? (
                    <>
                      <h3 className="text-zinc-400 uppercase tracking-widest text-sm font-semibold mb-6">Sold To</h3>
                      <div className="flex items-center justify-center gap-6 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl font-bold text-emerald-400">
                          {lastReveal.winnerSquadName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="text-3xl font-bold text-white">{lastReveal.winnerSquadName}</p>
                        </div>
                      </div>
                      <div className="inline-block bg-zinc-950 border border-zinc-800 rounded-2xl px-8 py-4">
                        <p className="text-zinc-500 text-sm mb-1">Winning Bid</p>
                        <p className="text-4xl font-bold text-emerald-400">{lastReveal.winningBid} Cr</p>
                      </div>
                    </>
                  ) : (
                    <div className="py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
                        <Ban className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-2xl font-bold text-red-400">UNSOLD</p>
                      <p className="text-zinc-500 mt-2">All bids were 0. Player added to unsold list.</p>
                      {isHost && (
                        <p className="text-xs text-zinc-600 mt-3">You can recall this player later from the sidebar.</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : isDecider && deciderState ? (
              <motion.div
                key={`decider-${currentRound}`}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4 }}
                className="max-w-lg w-full"
              >
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-6 mb-6 text-center">
                  <div className="text-amber-400 text-sm font-bold uppercase tracking-wider mb-2">Tie Detected</div>
                  <h2 className="text-2xl font-bold text-white mb-1">{deciderState.player?.name || 'Player'}</h2>
                  <p className="text-zinc-400 text-sm">Highest Bid: <span className="text-amber-400 font-bold">{deciderState.highestBid} Cr</span></p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Tied Teams</h3>
                    <div className="space-y-2">
                      {(deciderState.tiedSquads || []).map((team) => (
                        <label
                          key={team.squadId}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                            deciderWinner === team.squadId
                              ? "bg-emerald-950/20 border-emerald-500/40"
                              : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {isHost && (
                              <input
                                type="radio"
                                name="decider-winner"
                                value={team.squadId}
                                checked={deciderWinner === team.squadId}
                                onChange={() => setDeciderWinner(team.squadId)}
                                className="accent-emerald-500"
                              />
                            )}
                            <div>
                              <p className="text-white font-medium">{team.squadName}</p>
                              <p className="text-xs text-zinc-500">Budget: {team.budget} Cr</p>
                            </div>
                          </div>
                          <span className="text-amber-400 font-bold">{deciderState.highestBid} Cr</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {isHost ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Final Price (min {deciderState.highestBid} Cr)</label>
                        <input
                          type="number"
                          value={deciderPrice}
                          onChange={(e) => setDeciderPrice(e.target.value)}
                          min={deciderState.highestBid}
                          step="0.1"
                          placeholder={`${deciderState.highestBid}`}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <button
                        onClick={handleDeciderSubmit}
                        disabled={!deciderWinner || !deciderPrice || Number(deciderPrice) < deciderState.highestBid}
                        className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold text-lg transition-all cursor-pointer"
                      >
                        Submit Decision
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-zinc-400 text-sm">Waiting for host to decide the winner...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-zinc-400">Loading player...</p>
              </div>
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
                  <p className="text-2xl font-bold text-white">{myBudget} <span className="text-zinc-500 text-lg">Cr</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">My Squad</p>
                  <p className="text-lg font-bold text-white">{credentials?.squadName || ''}</p>
                </div>
              </div>

              {/* Bidding Controls */}
              <div className="flex-[2] w-full">
                {isBidding ? (
                  myBidStatus === 'SUBMITTED' ? (
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-5 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Bid Submitted</h3>
                      <p className="text-sm text-emerald-400/80">Amount hidden from other managers.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {/* Pass button (bid 0) */}
                        <button
                          onClick={handlePass}
                          className="py-2 px-3 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 rounded-lg text-sm font-medium text-red-400 transition-colors cursor-pointer"
                          title="Submit 0 — pass on this player"
                        >
                          Pass
                        </button>
                        {presetBids.map(val => (
                          <button
                            key={val}
                            onClick={() => setBidInput(val.toString())}
                            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 transition-colors cursor-pointer"
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
                            min="0.1"
                            step="0.1"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600 placeholder:font-normal"
                          />
                        </div>
                        <button
                          onClick={handleBid}
                          disabled={!bidInput || Number(bidInput) <= 0 || Number(bidInput) > myBudget}
                          className="px-8 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold text-lg transition-all cursor-pointer"
                        >
                          Submit
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-600 text-center">Bid 0 = pass. If all managers pass, player goes unsold.</p>
                    </div>
                  )
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center text-zinc-400">
                    {isDecider ? (
                      isHost ? 'Use the form above to decide the winner and final price.' : 'Tie detected. Waiting for host to decide...'
                    ) : isHost ? (
                      <div className="space-y-3">
                        <p>Review results and click Next Player to continue.</p>
                        <button
                          onClick={() => nextPlayer()}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
                        >
                          Next Player <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      'Waiting for host to proceed.'
                    )}
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
