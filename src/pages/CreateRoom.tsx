import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameStateContext';
import { Settings, Users, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { createRoom, isConnecting, error: globalError } = useGame();

  const [form, setForm] = useState({
    name: 'Premier Auction 2026',
    hostName: 'Host Manager',
    squadName: 'Host FC',
    participantLimit: 12,
    budget: 100,
    maxSquadSize: 15,
    minBid: 1,
    allowHostForceReveal: true,
  });

  const [localError, setLocalError] = useState('');

  const handleCreate = async () => {
    if (form.budget < 10) {
      setLocalError('Starting budget must be at least 10 Cr.');
      return;
    }
    if (form.minBid < 1 || form.minBid >= form.budget) {
      setLocalError('Invalid minimum bid.');
      return;
    }
    setLocalError('');

    const success = await createRoom({
      auctionName: form.name,
      hostName: form.hostName,
      squadName: form.squadName,
      startingBudget: form.budget,
      maxParticipants: form.participantLimit,
      minBid: form.minBid,
      allowHostForceReveal: form.allowHostForceReveal,
    });

    if (success) {
      navigate('/lobby');
    }
  };

  const displayError = localError || globalError;

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Auction Session</h1>
          <p className="text-zinc-400">Configure your room rules and invite managers.</p>
        </div>

        {displayError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <p>{displayError}</p>
          </div>
        )}

        {/* Section A: Session */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
            <Settings className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">Session Setup</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Auction Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Participant Limit (9-12)</label>
              <select 
                value={form.participantLimit}
                onChange={(e) => setForm({...form, participantLimit: Number(e.target.value)})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {[9, 10, 11, 12].map(n => <option key={n} value={n}>{n} Managers</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Your Name (Host)</label>
              <input 
                type="text" 
                value={form.hostName} 
                onChange={(e) => setForm({...form, hostName: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Your Squad Name</label>
              <input 
                type="text" 
                value={form.squadName} 
                onChange={(e) => setForm({...form, squadName: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Section B: Budget & Rules */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
            <Users className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">Budget & Rules</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Starting Budget (Cr)</label>
              <input 
                type="number" 
                value={form.budget} 
                onChange={(e) => setForm({...form, budget: Number(e.target.value)})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Min Bid (Cr)</label>
              <input 
                type="number" 
                value={form.minBid} 
                onChange={(e) => setForm({...form, minBid: Number(e.target.value)})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Live Summary */}
      <div className="space-y-6">
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-6 sticky top-24">
          <h3 className="text-lg font-semibold text-white mb-6">Session Summary</h3>
          
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Auction Format</span>
              <span className="text-white font-medium">Sealed-Bid</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Managers</span>
              <span className="text-white font-medium">{form.participantLimit} Max</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Starting Budget</span>
              <span className="text-emerald-400 font-medium">{form.budget} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Player Pool</span>
              <span className="text-white font-medium">Full Catalog</span>
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={isConnecting}
            className="w-full mt-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Room
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full mt-3 py-3 text-zinc-400 hover:text-white rounded-xl font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
