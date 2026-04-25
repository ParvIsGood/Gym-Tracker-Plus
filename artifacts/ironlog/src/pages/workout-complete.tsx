import { useLocation, useParams } from "wouter";
import { useGetSession, useGetStatsSummary } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Trophy, Flame, Home, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkoutComplete() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: session, isLoading } = useGetSession(id || "");
  const { data: stats } = useGetStatsSummary();

  if (isLoading || !session) return <div className="p-6">Loading summary...</div>;

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 relative overflow-hidden bg-background">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/20 via-background to-background z-0 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative z-10 w-full max-w-md mx-auto text-center"
      >
        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(var(--primary),0.5)]">
          <Trophy className="w-12 h-12 text-primary-foreground" />
        </div>
        
        <h1 className="text-4xl font-black font-mono tracking-tight uppercase text-primary mb-2">Workout Complete</h1>
        <p className="text-xl text-muted-foreground font-bold mb-8">{session.label}</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Volume</div>
            <div className="text-2xl font-black text-primary">{session.totalVolume || 0}</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Duration</div>
            <div className="text-2xl font-black text-primary">{Math.round((session.durationSec || 0) / 60)}m</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Sets</div>
            <div className="text-2xl font-black text-primary">{session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)}</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 opacity-10"><Flame size={32} /></div>
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Streak</div>
            <div className="text-2xl font-black text-primary flex items-center justify-center gap-1">
              {stats?.currentStreak || 1} <Flame size={20} className="text-primary" />
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <Button 
            className="w-full h-16 text-xl font-bold uppercase tracking-wider"
            onClick={() => setLocation("/")}
          >
            Return to Base <Home className="ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}