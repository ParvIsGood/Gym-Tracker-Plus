import { useParams, Link } from "wouter";
import { useGetExercise, useGetStrengthProgress } from "@workspace/api-client-react";
import { ChevronLeft, Info, LineChart as ChartLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";

export default function ExerciseDetail() {
  const { id } = useParams();
  const { data: exercise, isLoading } = useGetExercise(id || "");
  const { data: progress } = useGetStrengthProgress(id || "");

  if (isLoading || !exercise) return <div className="p-6">Loading exercise...</div>;

  return (
    <div className="p-6 pb-24 h-[100dvh] flex flex-col">
      <div className="mb-6 flex items-start gap-3 shrink-0">
        <Link href="/exercises">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 bg-card border border-border">
            <ChevronLeft size={24} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight leading-none mb-2">{exercise.name}</h1>
          <div className="flex gap-2">
            <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded capitalize">
              {exercise.muscleGroup.replace('_', ' ')}
            </span>
            <span className="text-xs font-bold px-2 py-1 bg-muted text-muted-foreground rounded capitalize">
              {exercise.equipment.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pb-8">
        {exercise.description && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Info size={16} className="text-primary" /> Overview
            </h3>
            <p className="text-muted-foreground leading-relaxed">{exercise.description}</p>
          </div>
        )}

        {exercise.formCues && exercise.formCues.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Info size={16} className="text-primary" /> Form Cues
            </h3>
            <ul className="space-y-3">
              {exercise.formCues.map((cue, i) => (
                <li key={i} className="flex gap-3 bg-card p-4 rounded-xl border border-border">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">{i + 1}</span>
                  <span className="font-medium text-foreground">{cue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <ChartLine size={16} className="text-primary" /> Strength Progress (Est 1RM)
          </h3>
          <div className="h-64 bg-card border border-border rounded-xl p-4">
            {progress && progress.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress}>
                  <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), 'MMM d')} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} itemStyle={{ color: '#ff6600' }} />
                  <Line type="monotone" dataKey="estimatedOneRm" stroke="#ff6600" strokeWidth={3} dot={{ r: 4, fill: '#ff6600' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">
                No progress data for this exercise yet.<br/>Log it in a session to see charts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
