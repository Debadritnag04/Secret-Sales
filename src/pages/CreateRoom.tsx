import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameStateContext';
import { Settings, Users, ShieldAlert, ArrowRight, Loader2, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

const PRESET_PURSES = [100, 150, 200, 250, 300];

export default function CreateRoom() {
  const navigate = useNavigate();
  const { createRoom, isConnecting, error: globalError } = useGame();

  const [form, setForm] = useState({
    name: 'Premier Auction 2026',
    hostName: 'Host Manager',
    squadName: 'Host FC',
    participantLimit: 12,
    minBid: 1,
    allowHostForceReveal: true,
  });

  const [purseMode, setPurseMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [presetPurse, setPresetPurse] = useState(200);
  const [customPurseInput, setCustomPurseInput] = useState('200');
  const [localError, setLocalError] = useState('');

  const getStartingBudget = (): number => {
    if (purseMode === 'PRESET') return presetPurse;
    return Number(customPurseInput) || 0;
  };

  const validatePurse = (): string | null => {
    const budget = getStartingBudget();
    if (budget <= 0) return 'Purse must be greater than 0 Cr.';
    if (budget > 9999.9) return 'Purse cannot exceed 9999.9 Cr.';
    if (purseMode === 'CUSTOM') {
      const parts = customPurseInput.split('.');
      if (parts[1] && parts[1].length > 1) return 'Purse can have at most 1 decimal place.';
    }
    return null;
  };

  const handleCreate = async () => {
    const purseError = validatePurse();
    if (purseError) {
      setLocalError(purseError);
      return;
    }

    const budget = getStartingBudget();

    if (form.minBid < 0.1 || form.minBid >= budget) {
      setLocalError('Invalid minimum bid.');
      return;
    }
    setLocalError('');

    const success = await createRoom({
      auctionName: form.name,
      hostName: form.hostName,
      squadName: form.squadName,
      startingBudget: budget,
      maxParticipants: form.participantLimit,
      minBid: form.minBid,
      allowHostForceReveal: form.allowHostForceReveal,
    });

    if (success) {
      navigate('/lobby');
    }
  };

  const displayError = localError || globalError;
  const displayBudget = getStartingBudget();

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

        {/* Section B: Starting Purse */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">Starting Purse</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">Choose the starting budget for each squad.</p>

          {/* Preset / Custom Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setPurseMode('PRESET')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer",
                purseMode === 'PRESET' ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              )}
            >
              Preset
            </button>
            <button
              onClick={() => setPurseMode('CUSTOM')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer",
                purseMode === 'CUSTOM' ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              )}
            >
              Custom Purse
            </button>
          </div>

          {purseMode === 'PRESET' ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {PRESET_PURSES.map(val => (
                <button
                  key={val}
                  onClick={() => setPresetPurse(val)}
                  className={cn(
                    "py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border",
                    presetPurse === val
                      ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  )}
                >
                  {val} Cr
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={customPurseInput}
                  onChange={(e) => setCustomPurseInput(e.target.value)}
                  min="1"
                  max="9999.9"
                  step="0.1"
                  placeholder="Enter custom purse..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <span className="text-zinc-400 font-medium">Cr</span>
            </div>
          )}

          <p className="text-xs text-zinc-500 mt-3">
            Each squad starts with <span className="text-emerald-400 font-semibold">{displayBudget > 0 ? `${displayBudget} Cr` : '—'}</span>
          </p>
        </section>

        {/* Section C: Rules */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
            <Users className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">Bidding Rules</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Min Bid (Cr)</label>
              <input 
                type="number" 
                value={form.minBid} 
                onChange={(e) => setForm({...form, minBid: Number(e.target.value)})}
                min="0.1"
                step="0.1"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowHostForceReveal}
                  onChange={(e) => setForm({...form, allowHostForceReveal: e.target.checked})}
                  className="w-5 h-5 accent-emerald-500"
                />
                <span className="text-sm text-zinc-300">Allow Host Force Reveal</span>
              </label>
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
              <span className="text-zinc-400">Starting Purse</span>
              <span className="text-emerald-400 font-medium">{displayBudget > 0 ? `${displayBudget} Cr` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Purse Mode</span>
              <span className="text-white font-medium capitalize">{purseMode.toLowerCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Min Bid</span>
              <span className="text-white font-medium">{form.minBid} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Player Pool</span>
              <span className="text-white font-medium">FC24 Catalogue</span>
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={isConnecting}
            className="w-full mt-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
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
            className="w-full mt-3 py-3 text-zinc-400 hover:text-white rounded-xl font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
