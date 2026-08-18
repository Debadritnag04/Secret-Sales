import { useGame } from '../store/GameStateContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Trophy, Home, Wallet, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Results() {
  const { room, credentials, leaveRoom } = useGame();
  const navigate = useNavigate();

  // Only redirect if genuinely no session
  if (!room && !credentials) return <Navigate to="/" />;

  // Still loading
  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // If not completed, redirect appropriately
  if (room.phase !== 'COMPLETED' && room.phase !== 'ENDED') {
    if (room.phase === 'LOBBY' || room.phase === 'WAITING') return <Navigate to="/lobby" />;
    return <Navigate to="/auction" />;
  }

  const sortedSquads = [...room.squads].sort((a, b) => {
    // Sort by player count (proxy for value), then by budget remaining
    if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
    return b.budget - a.budget;
  });

  const bestBudget = [...room.squads].sort((a, b) => b.budget - a.budget)[0];

  const handleGoHome = () => {
    leaveRoom();
    navigate('/');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12 pb-24">
      {/* Banner */}
      <div className="text-center space-y-4 pt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <Trophy className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-5xl font-black text-white uppercase tracking-tight">Auction Complete</h1>
        <p className="text-xl text-zinc-400">{room.auctionName} has concluded.</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <button onClick={handleGoHome} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] cursor-pointer">
          <Home className="w-4 h-4" /> Return Home
        </button>
      </div>

      {/* Awards */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Session Awards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AwardCard icon={Trophy} title="Most Players" squad={sortedSquads[0]?.squadName} desc={`${sortedSquads[0]?.playerCount || 0} players acquired`} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20" />
          <AwardCard icon={Wallet} title="Best Budget" squad={bestBudget?.squadName} desc={`${bestBudget?.budget} Cr remaining`} color="text-emerald-500" bg="bg-emerald-500/10" border="border-emerald-500/20" />
          <AwardCard icon={Target} title="Total Rounds" squad={`${room.currentRound} rounds`} desc="Players auctioned" color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
        </div>
      </div>

      {/* Final Standings Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
          <h2 className="text-2xl font-bold text-white">Final Rankings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-semibold w-16 text-center">Rank</th>
                <th className="px-6 py-4 font-semibold">Squad</th>
                <th className="px-6 py-4 font-semibold text-center">Players</th>
                <th className="px-6 py-4 font-semibold text-right">Budget Left</th>
                <th className="px-6 py-4 font-semibold text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {sortedSquads.map((squad, index) => {
                const isTop3 = index < 3;
                return (
                  <tr key={squad.id} className={cn("transition-colors hover:bg-zinc-800/30", isTop3 && "bg-zinc-800/20")}>
                    <td className="px-6 py-6 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-lg",
                        index === 0 ? "bg-amber-500/20 text-amber-500" :
                        index === 1 ? "bg-zinc-300/20 text-zinc-300" :
                        index === 2 ? "bg-orange-500/20 text-orange-400" : "text-zinc-600"
                      )}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-bold text-emerald-400">
                          {squad.squadName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={cn("font-bold text-base", isTop3 ? "text-white" : "text-zinc-300")}>{squad.squadName}</p>
                          <p className="text-xs text-zinc-500">{squad.ownerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center font-medium">{squad.playerCount}</td>
                    <td className="px-6 py-6 text-right font-medium text-emerald-400">{squad.budget} Cr</td>
                    <td className="px-6 py-6 text-right font-medium text-zinc-300">{squad.spent} Cr</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AwardCard({ icon: Icon, title, squad, desc, color, bg, border }: any) {
  return (
    <div className={cn("p-6 rounded-2xl border backdrop-blur-sm", bg, border)}>
      <Icon className={cn("w-6 h-6 mb-4", color)} />
      <h3 className="text-sm font-semibold text-zinc-400 mb-1">{title}</h3>
      <p className="text-lg font-bold text-white mb-2">{squad || 'None'}</p>
      <p className="text-xs text-zinc-500">{desc}</p>
    </div>
  );
}
