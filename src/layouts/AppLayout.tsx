import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../store/GameStateContext';
import { Shield, Settings, LogOut, LayoutDashboard, Users, History, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AppLayout() {
  const { currentUser, room, leaveRoom } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  const isAuctionActive = room?.status === 'active';
  const showSidebar = room && currentUser;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Top Navigation */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <Shield className="w-6 h-6 text-emerald-500" />
          <span className="font-bold tracking-tight text-lg hidden sm:block">Outsmart FC</span>
        </div>

        {room && currentUser && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-zinc-300 font-mono tracking-wider">{room.code}</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-3 border-l border-zinc-800 pl-4">
              <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser.squadId}`} alt="badge" className="w-8 h-8 rounded-md bg-zinc-800" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none">{currentUser.name}</span>
                <span className="text-xs text-zinc-400 mt-1">{currentUser.isHost ? 'Host' : 'Manager'}</span>
              </div>
            </div>

            <button onClick={handleLeave} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors" title="Leave Room">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Optional Sidebar for Navigation during active auction */}
        {showSidebar && (
          <aside className="w-16 sm:w-64 border-r border-zinc-800 bg-zinc-950/50 hidden md:flex flex-col py-6 gap-2">
            <NavButton to={isAuctionActive ? '/auction' : '/lobby'} icon={LayoutDashboard} label="Live Room" active={location.pathname === '/auction' || location.pathname === '/lobby'} />
            <NavButton to="/team" icon={Shield} label="My Squad" active={location.pathname === '/team'} />
            <NavButton to="/standings" icon={Users} label="Standings" active={location.pathname === '/standings'} />
            <NavButton to="/pool" icon={History} label="Player Pool" active={location.pathname === '/pool'} />
            {room.status === 'finished' && <NavButton to="/results" icon={Trophy} label="Results" active={location.pathname === '/results'} />}
          </aside>
        )}

        <main className="flex-1 overflow-y-auto relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NavButton({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "flex items-center gap-3 px-4 sm:px-6 py-3 mx-2 rounded-lg transition-all",
        active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium hidden sm:block">{label}</span>
    </button>
  );
}
