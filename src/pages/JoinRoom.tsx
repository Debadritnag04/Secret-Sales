import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameStateContext';
import { LogIn, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function JoinRoom() {
  const navigate = useNavigate();
  const { joinRoom, isConnecting, error: globalError } = useGame();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [squadName, setSquadName] = useState('');
  const [localError, setLocalError] = useState('');

  const handleJoin = async () => {
    if (!code || !name || !squadName) {
      setLocalError('Please fill in all fields.');
      return;
    }
    setLocalError('');

    const success = await joinRoom(code.toUpperCase(), name, squadName);
    if (success) {
      navigate('/lobby');
    }
  };

  const displayError = localError || globalError;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Join Auction Room</h1>
          <p className="text-zinc-400">Enter the room code provided by the host.</p>
        </div>

        {displayError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{displayError}</p>
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Room Code</label>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="e.g. A1B2C3"
              maxLength={8}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-emerald-500 transition-colors uppercase placeholder:tracking-normal placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Your Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Manager Name"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Your Squad Name</label>
            <input 
              type="text" 
              value={squadName} 
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="e.g. Real Madrid"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button 
            onClick={handleJoin}
            disabled={!code || !name || !squadName || isConnecting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 mt-4"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Room
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3 text-zinc-400 hover:text-white rounded-xl font-medium transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
