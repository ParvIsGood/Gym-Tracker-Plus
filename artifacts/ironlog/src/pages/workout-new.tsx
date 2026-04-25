import { useState } from "react";
import { useLocation } from "wouter";
import { useGetPlan, useStartSession, Weekday, Exercise } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const DAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function WorkoutNew() {
  const [, setLocation] = useLocation();
  const { data: plan, isLoading } = useGetPlan();
  const startSession = useStartSession();

  const todayStr = format(new Date(), 'EEEE').toLowerCase() as Weekday;
  const [selectedDay, setSelectedDay] = useState<Weekday>(todayStr);

  const selectedPlanDay = plan?.find(p => p.day === selectedDay);
  
  const [label, setLabel] = useState(selectedPlanDay?.label || "Workout");
  const [exercises, setExercises] = useState<Exercise[]>(selectedPlanDay?.exercises || []);

  // Update state when plan loads or day changes
  // Skipping deep useEffect for simplicity, just letting it be controlled by the select if user changes it
  const handleDayChange = (day: Weekday) => {
    setSelectedDay(day);
    const dayPlan = plan?.find(p => p.day === day);
    if (dayPlan) {
      setLabel(dayPlan.label);
      setExercises(dayPlan.exercises);
    } else {
      setLabel("Workout");
      setExercises([]);
    }
  };

  const handleStart = async () => {
    if (exercises.length === 0) return;
    try {
      const session = await startSession.mutateAsync({
        data: {
          day: selectedDay,
          label: label || "Workout",
          exerciseIds: exercises.map(e => e.id)
        }
      });
      setLocation(`/workout/active/${session.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="p-6">Loading setup...</div>;

  return (
    <div className="p-6 pb-24 min-h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono uppercase">Setup Session</h1>
        <p className="text-muted-foreground mt-1">Prepare for battle.</p>
      </div>

      <div className="flex-1 space-y-6">
        <div className="space-y-2">
          <Label className="uppercase tracking-wider text-muted-foreground text-xs">Plan Day</Label>
          <Select value={selectedDay} onValueChange={(v) => handleDayChange(v as Weekday)}>
            <SelectTrigger className="h-14 text-lg bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map(d => (
                <SelectItem key={d} value={d} className="uppercase tracking-wider">
                  {d} {d === todayStr ? "(Today)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="uppercase tracking-wider text-muted-foreground text-xs">Workout Label</Label>
          <Input 
            value={label} 
            onChange={e => setLabel(e.target.value)} 
            className="h-14 text-lg bg-card"
          />
        </div>

        <div className="space-y-3">
          <Label className="uppercase tracking-wider text-muted-foreground text-xs">Exercises ({exercises.length})</Label>
          <div className="space-y-2">
            <AnimatePresence>
              {exercises.map((ex, i) => (
                <motion.div 
                  key={ex.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold">{ex.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ex.muscleGroup.replace('_', ' ')}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {exercises.length === 0 && (
              <div className="text-center py-8 border border-dashed border-border rounded-xl bg-card/50">
                <Dumbbell className="mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No exercises mapped for {selectedDay}.</p>
                <Button variant="link" onClick={() => setLocation("/plan")}>Edit Plan</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button 
          className="w-full h-16 text-xl font-bold uppercase tracking-wider relative overflow-hidden group" 
          onClick={handleStart}
          disabled={exercises.length === 0 || startSession.isPending}
        >
          <span className="relative z-10 flex items-center gap-2">
            {startSession.isPending ? "Forging..." : "Enter The Iron"} <Play className="fill-current" size={20} />
          </span>
          <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </Button>
      </div>
    </div>
  );
}
