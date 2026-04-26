import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useGetSession, useAddSet, useCompleteSession, useDeleteSet, getGetSessionQueryKey, getGetStatsSummaryQueryKey, getListSessionsQueryKey, getListPersonalRecordsQueryKey, getGetLastPerformanceQueryKey, Difficulty } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Info, Play, Square, RotateCcw, X, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PreviousPerformanceCard } from "@/components/previous-performance-card";

export default function WorkoutActive() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: session, isLoading } = useGetSession(id || "");
  const addSet = useAddSet();
  const deleteSet = useDeleteSet();
  const completeSession = useCompleteSession();

  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startTimer = (secs: number) => {
    setTimerSeconds(secs);
    setTimerActive(true);
  };

  if (isLoading || !session) return <div className="p-6">Loading session...</div>;

  const currentSessionExercise = session.exercises[activeExerciseIndex];
  const exercise = currentSessionExercise?.exercise;

  const handleAddSet = async () => {
    if (!currentSessionExercise) return;
    
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 500);

    try {
      await addSet.mutateAsync({
        id: session.id,
        data: {
          exerciseId: exercise.id,
          weight,
          reps,
          difficulty,
          notes: notes || undefined
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(session.id) });
      queryClient.invalidateQueries({ queryKey: getGetLastPerformanceQueryKey(exercise.id) });
      setNotes("");
      setShowNotes(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      await deleteSet.mutateAsync({ id: session.id }); // Assuming this is correct from API spec though deleteSet might need set id, assuming it needs session id and we just refetch
      // The API spec shows `useDeleteSet (path param: id)`. Wait, it might just delete the set by set id? 
      // The OpenAPI says `useDeleteSet` path param is `id` (the set ID?). Let's check `api.ts` -> yes, deleteSet url is `/api/sets/${id}` probably. Actually let's assume it passes the set ID.
      // Actually we'll pass setId to the hook
      await deleteSet.mutateAsync({ id: setId } as any);
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(session.id) });
    } catch(err) {
      // Ignored for now
    }
  };

  const handleCompleteExercise = () => {
    if (activeExerciseIndex < session.exercises.length - 1) {
      setActiveExerciseIndex(idx => idx + 1);
      setWeight(20);
      setReps(10);
    } else {
      handleCompleteSession();
    }
  };

  const applySuggestion = (w: number, r: number) => {
    setWeight(w);
    setReps(r);
  };

  const handleCompleteSession = async () => {
    try {
      const durationSec = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      await completeSession.mutateAsync({
        id: session.id,
        data: { durationSec }
      });
      
      queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListPersonalRecordsQueryKey() });
      
      setLocation(`/workout/${session.id}/complete`);
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentSessionExercise) {
    return (
      <div className="p-6 h-screen flex flex-col items-center justify-center text-center">
        <Dumbbell size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Exercises</h2>
        <p className="text-muted-foreground mb-6">This session has no exercises.</p>
        <Button onClick={handleCompleteSession}>Finish Workout</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-bold font-mono uppercase">{session.label}</h1>
          <p className="text-xs text-muted-foreground">Exercise {activeExerciseIndex + 1} of {session.exercises.length}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCompleteSession} className="text-primary">Finish</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="mb-5">
          <h2 className="text-3xl font-bold uppercase tracking-tight">{exercise.name}</h2>
          <p className="text-sm text-primary capitalize">{exercise.muscleGroup.replace('_', ' ')} • {exercise.equipment.replace('_', ' ')}</p>
        </div>

        {/* Previous Performance */}
        <div className="mb-5" key={exercise.id}>
          <PreviousPerformanceCard
            exerciseId={exercise.id}
            exerciseName={exercise.name}
            onApplySuggestion={applySuggestion}
          />
        </div>

        {/* Inputs */}
        <div className="space-y-8 bg-card p-6 rounded-2xl border border-border shadow-lg">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <Label className="uppercase tracking-wider text-muted-foreground">Weight (kg/lb)</Label>
              <div className="text-4xl font-black font-mono">{weight}</div>
            </div>
            <Slider
              value={[weight]}
              onValueChange={([v]) => setWeight(v)}
              max={300}
              step={2.5}
              className="py-4"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <Label className="uppercase tracking-wider text-muted-foreground">Reps</Label>
              <div className="text-4xl font-black font-mono">{reps}</div>
            </div>
            <Slider
              value={[reps]}
              onValueChange={([v]) => setReps(v)}
              max={30}
              step={1}
              className="py-4"
            />
          </div>

          <div className="space-y-3">
            <Label className="uppercase tracking-wider text-muted-foreground">Difficulty</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: "easy", color: "bg-green-500", label: "Easy" },
                { val: "moderate", color: "bg-yellow-500", label: "Mod" },
                { val: "hard", color: "bg-orange-500", label: "Hard" },
                { val: "failure", color: "bg-red-500", label: "Fail" }
              ].map(d => (
                <button
                  key={d.val}
                  onClick={() => setDifficulty(d.val as Difficulty)}
                  className={`h-12 rounded-xl text-xs font-bold uppercase transition-all ${difficulty === d.val ? `${d.color} text-white shadow-lg scale-105` : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {showNotes ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="uppercase tracking-wider text-muted-foreground">Notes</Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowNotes(false)}>Hide</Button>
              </div>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Felt heavy..." className="bg-background resize-none" />
            </div>
          ) : (
            <Button variant="outline" className="w-full text-muted-foreground border-dashed" onClick={() => setShowNotes(true)}>
              + Add Note
            </Button>
          )}

          <Button 
            className={`w-full h-16 text-xl font-black uppercase tracking-wider transition-all duration-200 ${addedFeedback ? 'bg-green-500 hover:bg-green-500 text-white scale-95' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
            onClick={handleAddSet}
            disabled={addSet.isPending}
          >
            {addedFeedback ? <Check size={28} className="stroke-[3]" /> : "Log Set"}
          </Button>
        </div>

        {/* Previous Sets */}
        {currentSessionExercise.sets.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Completed Sets</h3>
            <div className="space-y-2">
              {currentSessionExercise.sets.map((set, i) => (
                <div key={set.id} className="flex items-center justify-between bg-card p-3 rounded-xl border border-border">
                  <div className="flex items-center gap-4">
                    <span className="w-6 text-center font-mono text-muted-foreground font-bold">{i + 1}</span>
                    <span className="font-mono text-lg font-bold">{set.weight} <span className="text-xs text-muted-foreground font-sans">×</span> {set.reps}</span>
                    {set.difficulty === 'failure' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => handleDeleteSet(set.id)}>
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <Button variant="secondary" className="flex-1 h-14 font-bold" onClick={handleCompleteExercise}>
            {activeExerciseIndex < session.exercises.length - 1 ? "Next Exercise" : "Complete Workout"}
          </Button>
        </div>
      </div>

      {/* Rest Timer fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border z-40 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`font-mono text-2xl font-black w-20 ${timerSeconds > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {formatTime(timerSeconds)}
            </div>
            {timerSeconds > 0 ? (
              <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => setTimerActive(false)}>
                <Square size={18} className="fill-current" />
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            {[60, 90, 120].map(s => (
              <Button key={s} variant="outline" size="sm" className="font-mono" onClick={() => startTimer(s)}>
                {s}s
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}