import { useParams, Link } from "wouter";
import { useGetSession, useGetProfile } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ChevronLeft, Dumbbell, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function HistoryDetail() {
  const { id } = useParams();
  const { data: session, isLoading } = useGetSession(id || "");
  const { data: profile } = useGetProfile();

  if (isLoading || !session) return <div className="p-6">Loading session...</div>;

  return (
    <div className="p-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/history">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 bg-card border border-border">
            <ChevronLeft size={24} />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold font-mono uppercase truncate">{session.label}</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(session.startedAt), 'MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-card border border-border p-4 rounded-2xl text-center">
          <Dumbbell className="mx-auto mb-2 text-primary opacity-80" size={20} />
          <div className="text-xl font-bold text-primary">{session.totalVolume || 0}</div>
          <div className="text-xs uppercase font-bold text-muted-foreground">Volume</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl text-center">
          <Clock className="mx-auto mb-2 text-primary opacity-80" size={20} />
          <div className="text-xl font-bold text-primary">{Math.round((session.durationSec || 0) / 60)}</div>
          <div className="text-xs uppercase font-bold text-muted-foreground">Mins</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl text-center">
          <Activity className="mx-auto mb-2 text-primary opacity-80" size={20} />
          <div className="text-xl font-bold text-primary">{session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)}</div>
          <div className="text-xs uppercase font-bold text-muted-foreground">Sets</div>
        </div>
      </div>

      <div className="space-y-6">
        {session.exercises.map((sessionEx, i) => (
          <motion.div 
            key={sessionEx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="font-bold text-lg uppercase tracking-tight">{sessionEx.exercise.name}</h3>
              <p className="text-xs text-primary font-medium capitalize">{sessionEx.exercise.muscleGroup.replace('_', ' ')}</p>
            </div>
            
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                <span className="w-8">Set</span>
                <span className="flex-1 text-center">Weight × Reps</span>
                <span className="w-16 text-right">RPE</span>
              </div>
              
              {sessionEx.sets.map((set, setIdx) => (
                <div key={set.id} className="flex justify-between items-center p-2 rounded-lg bg-background border border-border">
                  <span className="w-8 font-mono text-muted-foreground font-bold">{setIdx + 1}</span>
                  <span className="flex-1 text-center font-mono font-bold text-lg">{set.weight}<span className="text-muted-foreground text-sm font-sans mx-1">×</span>{set.reps}</span>
                  <span className={`w-16 text-right text-xs font-bold uppercase ${
                    set.difficulty === 'easy' ? 'text-green-500' :
                    set.difficulty === 'moderate' ? 'text-yellow-500' :
                    set.difficulty === 'hard' ? 'text-orange-500' :
                    'text-red-500'
                  }`}>
                    {set.difficulty.substring(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
