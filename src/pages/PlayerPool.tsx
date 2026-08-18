import { useGame } from '../store/GameStateContext';
import { Navigate } from 'react-router-dom';
import { Database } from 'lucide-react';

export default function PlayerPool() {
  const { room, credentials } = useGame();

  if (!room && !credentials) return <Navigate to="/" />;
  if (!room) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-500" />
          Player Pool
        </h1>
        <p className="text-zinc-400">Player catalogue and auction history will be available here during and after the auction.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
        <Database className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400 text-lg">Player database is managed by the auction engine.</p>
        <p className="text-zinc-500 text-sm mt-2">The current player appears on the auction screen during bidding rounds.</p>
      </div>
    </div>
  );
}
