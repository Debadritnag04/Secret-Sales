import { useGame } from '../store/GameStateContext';
import { Navigate } from 'react-router-dom';
import { Trophy, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

type SortConfig = 'budget' | 'spent' | 'players' | 'rating';

export default function Standings() {
  const { room, credentials } = useGame();
  const [sort, setSort] = useState<SortConfig>('budget');

  if (!room && !credentials) return <Navigate to="/" />;
  if (!room) return null;

  const sortedSquads = [...room.squads].sort((a, b) => {
    switch (sort) {
      case 'budget': return b.budget - a.budget;
      case 'spent': return b.spent - a.spent;
      case 'players': return b.playerCount - a.playerCount;
      case 'rating': {
        const aRating = a.players.reduce((acc, p) => acc + p.player.rating, 0);
        const bRating = b.players.reduce((acc, p) => acc + p.player.rating, 0);
        return bRating - aRating;
      }
      default: return 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            Live Standings
          </h1>
          <p className="text-zinc-400">Track all managers in real-time.</p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-3">Sort By:</span>
          {(['budget', 'spent', 'players', 'rating'] as SortConfig[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize flex items-center gap-1 ${sort === s ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {s} <ArrowUpDown className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedSquads.map((squad, index) => {
          const spent = room.settings.budget - squad.budget;
          const avgRating = squad.players.length ? Math.round(squad.players.reduce((acc, p) => acc + p.player.rating, 0) / squad.players.length) : 0;
          const bestPlayer = [...squad.players].sort((a,b) => b.player.rating - a.player.rating)[0]?.player;

          return (
            <div key={squad.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 group-hover:bg-emerald-500 transition-colors" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-zinc-600 w-6">#{index + 1}</span>
                  <img src={squad.badge} alt="" className="w-10 h-10 rounded-xl bg-zinc-800" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white leading-tight truncate max-w-[120px]">{squad.squadName}</span>
                    <span className="text-xs text-zinc-400 truncate max-w-[120px]">{squad.ownerName}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Budget</p>
                  <p className="text-xl font-bold text-emerald-400">{squad.budget}</p>
                </div>
                <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Spent</p>
                  <p className="text-xl font-bold text-white">{spent}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-zinc-400">
                  <span title="Players"><strong className="text-zinc-200">{squad.players.length}</strong> Plyrs</span>
                  <span title="Average Rating"><strong className="text-zinc-200">{avgRating || '-'}</strong> OVR</span>
                </div>
              </div>

              {bestPlayer && (
                <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Star Player</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{bestPlayer.name}</span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 rounded">{bestPlayer.rating}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
