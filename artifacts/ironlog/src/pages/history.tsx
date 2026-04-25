import { useListSessions, useGetProfile } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { History as HistoryIcon, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function History() {
  const { data: sessions, isLoading } = useListSessions();
  const { data: profile } = useGetProfile();

  if (isLoading) return <div className="p-6">Loading history...</div>;

  return (
    <div className="p-6 pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono uppercase flex items-center gap-3">
          <HistoryIcon className="text-primary" /> History
        </h1>
        <p className="text-muted-foreground mt-1">Review your past battles.</p>
      </div>

      <div className="space-y-4">
        {sessions && sessions.length > 0 ? (
          sessions.map((session, i) => (
            <motion.div 
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/history/${session.id}`}>
                <Card className="bg-card hover:bg-muted/50 transition-colors cursor-pointer border-border relative overflow-hidden">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{session.label}</h3>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{format(new Date(session.startedAt), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>{session.totalSets} sets</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-bold text-primary text-lg">{session.totalVolume || 0} <span className="text-sm font-normal">{profile?.units}</span></p>
                        <p className="text-sm text-muted-foreground">{Math.round((session.durationSec || 0) / 60)} min</p>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 bg-card rounded-2xl border border-border">
            <HistoryIcon size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">No History Yet</h2>
            <p className="text-muted-foreground mb-6">Start logging workouts to see your history here.</p>
            <Link href="/workout/new" className="text-primary font-bold hover:underline">Start a Workout</Link>
          </div>
        )}
      </div>
    </div>
  );
}
