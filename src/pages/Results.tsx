import { useGame } from '../store/GameStateContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Trophy, Download, Printer, Home, Medal, Award, Target, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Results() {
  const { room, leaveRoom } = useGame();
  const navigate = useNavigate();

  if (!room || room.status !== 'finished') return <Navigate to="/" />;

  const sortedSquads = [...room.squads].sort((a, b) => {
    // Primary sort: team rating. Secondary sort: budget remaining
    const aRating = a.players.reduce((acc, p) => acc + p.player.rating, 0);
    const bRating = b.players.reduce((acc, p) => acc + p.player.rating, 0);
    if (bRating !== aRating) return bRating - aRating;
    return b.budget - a.budget;
  });

  // Calculate Awards
  const allPurchases = room.squads.flatMap(s => s.players.map(p => ({ ...p, squadName: s.squadName })));
  const biggestPurchase = allPurchases.sort((a,b) => b.amount - a.amount)[0];
  const bestBudget = [...room.squads].sort((a,b) => b.budget - a.budget)[0];
  const highestRated = sortedSquads[0];
  
  const mostBalanced = [...room.squads].map(squad => {
    const positions = new Set(squad.players.map(p => p.player.position));
    return { squad, score: positions.size };
  }).sort((a,b) => b.score - a.score)[0]?.squad;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`Auction Results: ${room.settings.name}`, 14, 15);
    
    const tableData = sortedSquads.map((s, i) => [
      i + 1,
      s.squadName,
      s.ownerName,
      s.players.length,
      `${s.budget} Cr`,
      `${room.settings.budget - s.budget} Cr`,
      Math.round(s.players.reduce((acc, p) => acc + p.player.rating, 0) / (s.players.length || 1))
    ]);

    autoTable(doc, {
      head: [['Rank', 'Squad', 'Manager', 'Players', 'Budget Left', 'Total Spent', 'Avg Rating']],
      body: tableData,
      startY: 20,
    });

    doc.save(`${room.settings.name.replace(/\s+/g, '_')}_Results.pdf`);
  };

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
        <p className="text-xl text-zinc-400">The dust has settled. Here are the final results.</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-white font-medium transition-colors">
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-white font-medium transition-colors">
          <Printer className="w-4 h-4" /> Print
        </button>
        <button onClick={handleGoHome} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]">
          <Home className="w-4 h-4" /> Return Home
        </button>
      </div>

      {/* Awards section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Season Awards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AwardCard icon={Trophy} title="Highest Rated" squad={highestRated?.squadName} desc="Strongest overall squad." color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20" />
          <AwardCard icon={Wallet} title="Best Budget" squad={bestBudget?.squadName} desc={`${bestBudget?.budget} Cr remaining.`} color="text-emerald-500" bg="bg-emerald-500/10" border="border-emerald-500/20" />
          <AwardCard icon={Medal} title="Biggest Buy" squad={biggestPurchase?.squadName} desc={`${biggestPurchase?.player.name} for ${biggestPurchase?.amount} Cr`} color="text-purple-500" bg="bg-purple-500/10" border="border-purple-500/20" />
          <AwardCard icon={Target} title="Most Balanced" squad={mostBalanced?.squadName} desc="Covered all key positions." color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
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
                <th className="px-6 py-4 font-semibold text-center">Avg OVR</th>
                <th className="px-6 py-4 font-semibold text-right">Budget Left</th>
                <th className="px-6 py-4 font-semibold text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {sortedSquads.map((squad, index) => {
                const isTop3 = index < 3;
                const spent = room.settings.budget - squad.budget;
                const avgRating = squad.players.length ? Math.round(squad.players.reduce((acc, p) => acc + p.player.rating, 0) / squad.players.length) : 0;

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
                        <img src={squad.badge} alt="" className="w-10 h-10 rounded-xl bg-zinc-800" />
                        <div>
                          <p className={cn("font-bold text-base", isTop3 ? "text-white" : "text-zinc-300")}>{squad.squadName}</p>
                          <p className="text-xs text-zinc-500">{squad.ownerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center font-medium">{squad.players.length}</td>
                    <td className="px-6 py-6 text-center">
                      <span className="inline-flex px-2 py-1 bg-zinc-800 rounded font-bold text-white">{avgRating}</span>
                    </td>
                    <td className="px-6 py-6 text-right font-medium text-emerald-400">{squad.budget} Cr</td>
                    <td className="px-6 py-6 text-right font-medium text-zinc-300">{spent} Cr</td>
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
