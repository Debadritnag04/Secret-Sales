import { useGame } from '../store/GameStateContext';
import { Navigate } from 'react-router-dom';
import { Shield, TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useMemo, useState } from 'react';
import { Position } from '../types';

export default function Team() {
  const { room, credentials } = useGame();
  const [filter, setFilter] = useState<Position | 'ALL'>('ALL');

  if (!room && !credentials) return <Navigate to="/" />;
  if (!room || !credentials) return null;

  const mySquad = room.squads.find(s => s.id === credentials.squadId);
  if (!mySquad) return <Navigate to="/" />;

  const totalSpent = room.settings.budget - mySquad.budget;
  const avgRating = mySquad.players.length ? Math.round(mySquad.players.reduce((acc, p) => acc + p.player.rating, 0) / mySquad.players.length) : 0;
  
  const sortedPlayers = useMemo(() => {
    let sorted = [...mySquad.players];
    if (filter !== 'ALL') {
      sorted = sorted.filter(p => p.player.position === filter);
    }
    return sorted.sort((a,b) => b.amount - a.amount);
  }, [mySquad.players, filter]);

  const requiredPositions: Position[] = ['GK', 'DEF', 'MID', 'WING', 'ST'];
  const missingPositions = requiredPositions.filter(pos => !mySquad.players.some(p => p.player.position === pos));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Profile */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
        
        <img src={mySquad.badge} alt="badge" className="w-24 h-24 rounded-2xl bg-zinc-800" />
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-bold text-white mb-2">{mySquad.squadName}</h1>
          <p className="text-zinc-400 font-medium">Managed by {mySquad.ownerName}</p>
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Budget</p>
            <p className="text-2xl font-bold text-emerald-400">{mySquad.budget} <span className="text-base text-zinc-500">Cr</span></p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Spent</p>
            <p className="text-2xl font-bold text-white">{totalSpent} <span className="text-base text-zinc-500">Cr</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Squad Analytics
            </h3>
            
            <div className="space-y-4">
              <StatRow label="Squad Size" value={`${mySquad.players.length} / ${room.settings.maxSquadSize}`} />
              <StatRow label="Avg Rating" value={avgRating || '-'} />
              <StatRow label="Highest Buy" value={mySquad.players.length ? `${Math.max(...mySquad.players.map(p => p.amount))} Cr` : '-'} />
              <StatRow label="Cheapest Buy" value={mySquad.players.length ? `${Math.min(...mySquad.players.map(p => p.amount))} Cr` : '-'} />
            </div>

            {missingPositions.length > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Missing Positions</p>
                  <p className="opacity-80">You still need: {missingPositions.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Roster */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">Roster</h3>
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              {['ALL', 'GK', 'DEF', 'MID', 'WING', 'ST'].map(pos => (
                <button
                  key={pos}
                  onClick={() => setFilter(pos as any)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                    filter === pos ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {sortedPlayers.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No players acquired yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedPlayers.map(({ player, amount, round }) => (
                <div key={player.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4">
                  <img src={player.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover bg-zinc-800 mix-blend-luminosity opacity-80" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800">{player.position}</span>
                        <span className="text-xs text-zinc-500">Round {round}</span>
                      </div>
                      <p className="text-white font-bold truncate">{player.name}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-emerald-400">{amount} Cr</span>
                      <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-1 rounded">{player.rating} OVR</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
