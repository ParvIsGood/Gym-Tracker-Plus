import { useLocation, Link } from "wouter";
import { useGetProfile, useGetStatsSummary, useGetPlan, useGetWaterToday, useAddWaterCup, useListSessions, getGetWaterTodayQueryKey, getGetStatsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Droplet, Plus, ChevronRight, Dumbbell, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: profile } = useGetProfile();
  const { data: stats } = useGetStatsSummary();
  const { data: plan } = useGetPlan();
  const { data: water } = useGetWaterToday();
  const { data: sessions } = useListSessions({ limit: 3 });
  const addWater = useAddWaterCup();

  const todayStr = format(new Date(), 'EEEE').toLowerCase();
  const todayPlan = plan?.find(p => p.day === todayStr);

  const handleAddWater = async () => {
    await addWater.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getGetWaterTodayQueryKey() });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-8 mt-2">
        <div>
          <h1 className="text-3xl font-bold font-mono uppercase">IronLog</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.displayName}</p>
        </div>
        <Link href="/settings">
          <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center cursor-pointer">
            <span className="font-bold text-primary">{profile?.displayName?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
        </Link>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Stats Row */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-20"><Flame size={40} /></div>
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="text-primary animate-pulse" size={18} />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Streak</span>
              </div>
              <div className="text-3xl font-bold">{stats?.currentStreak || 0} <span className="text-sm font-normal text-muted-foreground">days</span></div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-20"><Activity size={40} /></div>
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="text-primary" size={18} />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">This Week</span>
              </div>
              <div className="text-3xl font-bold">{stats?.workoutsThisWeek || 0} <span className="text-sm font-normal text-muted-foreground">workouts</span></div>
            </CardContent>
          </Card>
        </motion.div>

        {stats?.skippedLegDay && (
          <motion.div variants={item} className="bg-destructive/10 border border-destructive/50 text-destructive-foreground p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5 text-destructive" />
            <div>
              <p className="font-bold text-destructive">You skipped leg day.</p>
              <p className="text-sm opacity-80 text-destructive/80">Don't make us call the police. Hit the squat rack soon.</p>
            </div>
          </motion.div>
        )}

        {/* Today's Plan */}
        <motion.div variants={item}>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-xl font-bold uppercase tracking-tight">Today's Protocol</h2>
            <span className="text-sm text-muted-foreground capitalize">{todayStr}</span>
          </div>
          <Card className="border-primary/30 bg-card shadow-lg shadow-primary/5">
            <CardContent className="p-5">
              {todayPlan ? (
                <>
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold mb-1">{todayPlan.label}</h3>
                    {todayPlan.isRest ? (
                      <p className="text-muted-foreground">Rest and recover. You earned it.</p>
                    ) : (
                      <p className="text-muted-foreground">{todayPlan.exercises.length} exercises planned</p>
                    )}
                  </div>
                  {!todayPlan.isRest && (
                    <Button 
                      size="lg" 
                      className="w-full font-bold text-lg h-14 uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setLocation("/workout/new")}
                    >
                      <Dumbbell className="mr-2" /> Start Workout
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">No plan set for today.</p>
                  <Button variant="outline" onClick={() => setLocation("/plan")}>Set up your plan</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Water Tracker */}
        <motion.div variants={item}>
          <h2 className="text-xl font-bold uppercase tracking-tight mb-3">Hydration</h2>
          <Card className="bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <Droplet size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">{water?.cups || 0} / {water?.goalCups || 8} cups</p>
                  <p className="text-sm text-muted-foreground">Stay hydrated</p>
                </div>
              </div>
              <Button size="icon" variant="outline" className="rounded-full w-12 h-12 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400" onClick={handleAddWater}>
                <Plus size={24} />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item}>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-xl font-bold uppercase tracking-tight">Recent</h2>
            <Link href="/history" className="text-sm text-primary flex items-center">View all <ChevronRight size={16}/></Link>
          </div>
          <div className="space-y-3">
            {sessions?.length ? sessions.map(session => (
              <Link key={session.id} href={`/history/${session.id}`}>
                <Card className="bg-card hover:bg-muted/50 transition-colors cursor-pointer border-border">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold">{session.label}</h4>
                      <p className="text-xs text-muted-foreground">{format(new Date(session.startedAt), 'MMM d, yyyy')} • {session.totalSets} sets</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{session.totalVolume || 0} {profile?.units}</p>
                      <p className="text-xs text-muted-foreground">{Math.round((session.durationSec || 0) / 60)} min</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )) : (
              <p className="text-muted-foreground text-sm text-center py-4 bg-card rounded-lg border border-border">No recent activity.</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
