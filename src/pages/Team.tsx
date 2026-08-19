import { useGame } from '../store/GameStateContext';
import { Navigate } from 'react-router-dom';
import { Shield, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useMemo, useState } from 'react';

type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'WING' | 'ST';

export default function Team() {
  const { room, credentials } = useGame();
  const [filter, setFilter] = useState<PositionFilter>('ALL');

  if (!room && !credentials) return <Navigate to="/" />;

  // Loading state
  if (!room || !credentials) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const squads = room.squads || [];
  const mySquad = squads.find(s => s.id === credentials.squadId);

  // Squad not found — show empty state instead of crashing
  if (!mySquad) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-zinc-400 mb-2">Squad Not Found</p>
          <p className="text-sm">Your squad data is not available yet. Please wait for the room to sync.</p>
        </div>
      </div>
    );
  }

  // Safe access to roster (array of purchased players)
  const roster = mySquad.roster || [];
  const budget = mySquad.budget ?? 0;
  const spent = mySquad.spent ?? 0;
  const playerCount = mySquad.playerCount ?? roster.length;

  const avgRating = roster.length
    ? Math.round(roster.reduce((acc: number, p: any) => acc + (p.player?.rating || p.rating || 0), 0) / roster.length)
    : 0;

  const sortedPlayers = useMemo(() => {
    let filtered = [...roster];
    if (filter !== 'ALL') {
      filtered = filtered.filter((p: any) => {
        const pos = p.player?.position || p.position || '';
        return pos === filter;
      });
    }
    return filtered.sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0));
  }, [roster, filter]);

  const coveredPositions = new Set(roster.map((p: any) => p.player?.position || p.position || ''));
  const requiredPositions: PositionFilter[] = ['GK', 'DEF', 'MID', 'WING', 'ST'];
  const missingPositions = requiredPositions.filter(pos => !coveredPositions.has(pos));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Profile */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />

        <div className="w-24 h-24 rounded-2xl bg-zinc-800 flex items-center justify-center text-4xl font-bold text-emerald-400">
          {mySquad.squadName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-bold text-white mb-2">{mySquad.squadName}</h1>
          <p className="text-zinc-400 font-medium">Managed by {mySquad.ownerName}</p>
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Budget</p>
            <p className="text-2xl font-bold text-emerald-400">{budget} <span className="text-base text-zinc-500">Cr</span></p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Spent</p>
            <p className="text-2xl font-bold text-white">{spent} <span className="text-base text-zinc-500">Cr</span></p>
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
              <StatRow label="Squad Size" value={`${playerCount}`} />
              <StatRow label="Avg Rating" value={avgRating || '-'} />
              <StatRow label="Highest Buy" value={roster.length ? `${Math.max(...roster.map((p: any) => p.amount || 0))} Cr` : '-'} />
              <StatRow label="Cheapest Buy" value={roster.length ? `${Math.min(...roster.map((p: any) => p.amount || 0))} Cr` : '-'} />
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
                  onClick={() => setFilter(pos as PositionFilter)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer",
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
              <p className="text-lg font-medium text-zinc-400 mb-2">
                {roster.length === 0 ? 'No Players Yet' : 'No players match this filter'}
              </p>
              {roster.length === 0 && (
                <p className="text-sm">Your purchased players will appear here.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedPlayers.map((item: any, idx: number) => {
                const player = item.player || item;
                const amount = item.amount || 0;
                const round = item.round || 0;

                return (
                  <div key={player.id || idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4">
                    {player.photoUrl ? (
                      <img src={player.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover bg-zinc-800 mix-blend-luminosity opacity-80" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-500">
                        {(player.name || '?').charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800">{player.position || '?'}</span>
                          {round > 0 && <span className="text-xs text-zinc-500">Round {round}</span>}
                        </div>
                        <p className="text-white font-bold truncate">{player.name || 'Unknown'}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-emerald-400">{amount} Cr</span>
                        <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-1 rounded">{player.rating || '?'} OVR</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
