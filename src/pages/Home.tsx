import { Shield, ArrowRight, Trophy, Users, Gavel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center space-y-8 z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium mb-4">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>Premium Football Auction</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-tight">
          Build your squad.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">Outsmart the room.</span>
        </h1>
        
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          The ultimate sealed-bid auction platform for football managers. 
          Manage your budget, analyze the pool, and secure your targets in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <button 
            onClick={() => navigate('/create')}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]"
          >
            Create Auction
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => navigate('/join')}
            className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
          >
            Join Room
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-24 text-left">
          <FeatureCard 
            icon={Gavel} 
            title="Sealed Bids" 
            desc="No bidding wars. One blind offer per player. Highest bid wins." 
          />
          <FeatureCard 
            icon={Users} 
            title="Up to 12 Managers" 
            desc="Compete in private rooms with friends in a synchronized live environment." 
          />
          <FeatureCard 
            icon={Trophy} 
            title="Dynamic Squads" 
            desc="Track budgets, positional balance, and rival spending in real-time." 
          />
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
      <Icon className="w-8 h-8 text-emerald-500 mb-4" />
      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}
