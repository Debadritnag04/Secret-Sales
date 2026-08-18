import { useGame } from '../store/GameStateContext';
import { Navigate } from 'react-router-dom';
import { Search, Download, History, Database } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { Position } from '../types';

type Tab = 'AVAILABLE' | 'SOLD' | 'UNSOLD' | 'MY_PURCHASES';

export default function PlayerPool() {
  const { room, currentUser } = useGame();
  const [tab, setTab] = useState<Tab>('AVAILABLE');
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');

  if (!room || !currentUser) return <Navigate to="/" />;

  const { playerPool, history } = room;

  const soldPlayers = history.filter(h => h.winningSquadId !== null);
  const unsoldPlayers = history.filter(h => h.winningSquadId === null);
  const myPurchases = history.filter(h => h.winningSquadId === currentUser.squadId);
  const availablePlayers = playerPool.filter(p => !history.some(h => h.player.id === p.id));

  const getFilteredPlayers = () => {
    let source: any[] = [];
    switch (tab) {
      case 'AVAILABLE': source = availablePlayers.map(p => ({ player: p })); break;
      case 'SOLD': source = soldPlayers; break;
      case 'UNSOLD': source = unsoldPlayers; break;
      case 'MY_PURCHASES': source = myPurchases; break;
    }

    return source.filter(item => {
      const matchSearch = item.player.name.toLowerCase().includes(search.toLowerCase());
      const matchPos = posFilter === 'ALL' || item.player.position === posFilter;
      return matchSearch && matchPos;
    });
  };

  const displayList = getFilteredPlayers();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-500" />
            Database & History
          </h1>
          <p className="text-zinc-400">Browse players and auction records.</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between p-2 gap-4">
        <div className="flex w-full md:w-auto overflow-x-auto no-scrollbar gap-1 px-2">
          {(['AVAILABLE', 'SOLD', 'UNSOLD', 'MY_PURCHASES'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors",
                tab === t ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-2 px-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <select
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="ALL">All Pos</option>
            {['GK', 'DEF', 'MID', 'WING', 'ST'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Player</th>
                <th className="px-6 py-4 font-semibold text-center">Pos</th>
                <th className="px-6 py-4 font-semibold text-center">OVR</th>
                <th className="px-6 py-4 font-semibold">Base Price</th>
                {tab !== 'AVAILABLE' && <th className="px-6 py-4 font-semibold">Status</th>}
                {(tab === 'SOLD' || tab === 'MY_PURCHASES') && <th className="px-6 py-4 font-semibold text-right">Sold For</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <History className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <p>No players found in this category.</p>
                  </td>
                </tr>
              ) : (
                displayList.map((item, i) => {
                  const p = item.player;
                  const winningSquad = item.winningSquadId ? room.squads.find(s => s.id === item.winningSquadId) : null;

                  return (
                    <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img src={p.photoUrl} alt="" className="w-10 h-10 rounded-lg bg-zinc-800 object-cover mix-blend-luminosity opacity-80" />
                        <div>
                          <p className="text-white font-semibold">{p.name}</p>
                          <p className="text-xs">{p.club}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-bold">{p.position}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-white">{p.rating}</td>
                      <td className="px-6 py-4 font-medium">{p.basePrice} Cr</td>
                      
                      {tab !== 'AVAILABLE' && (
                        <td className="px-6 py-4">
                          {winningSquad ? (
                            <div className="flex items-center gap-2">
                              <img src={winningSquad.badge} className="w-5 h-5 rounded bg-zinc-800" />
                              <span className="font-medium text-emerald-400">{winningSquad.squadName}</span>
                            </div>
                          ) : (
                            <span className="text-red-400 font-medium">Unsold</span>
                          )}
                        </td>
                      )}

                      {(tab === 'SOLD' || tab === 'MY_PURCHASES') && (
                        <td className="px-6 py-4 text-right font-bold text-white">
                          {item.winningAmount} Cr
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
