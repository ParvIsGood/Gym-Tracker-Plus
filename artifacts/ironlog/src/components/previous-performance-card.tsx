import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, History, Calendar, Dumbbell, Sparkles, NotebookPen, ChevronDown } from "lucide-react";
import { useGetLastPerformance, type LastPerformance, type LastSessionEntry } from "@workspace/api-client-react";
import { useGetProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { format, parseISO, formatDistanceToNowStrict } from "date-fns";

type Props = {
  exerciseId: string;
  exerciseName: string;
  onApplySuggestion?: (weight: number, reps: number) => void;
};

export function PreviousPerformanceCard({
  exerciseId,
  exerciseName,
  onApplySuggestion,
}: Props) {
  const { data, isLoading } = useGetLastPerformance(exerciseId);
  const { data: profile } = useGetProfile();
  const unit = profile?.units ?? "kg";
  const [historyOpen, setHistoryOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-4 animate-pulse h-28" />
    );
  }

  if (!data) return null;

  if (!data.hasHistory || !data.last) {
    return <EmptyState exerciseName={exerciseName} />;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative"
      >
        <Card data={data} unit={unit} onOpenHistory={() => setHistoryOpen(true)} />
      </motion.div>

      {data.suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="mt-3"
        >
          <SuggestionRow
            suggestion={data.suggestion}
            unit={unit}
            onApply={onApplySuggestion}
          />
        </motion.div>
      )}

      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        exerciseName={exerciseName}
        entries={data.recent}
        unit={unit}
      />
    </>
  );
}

function Card({
  data,
  unit,
  onOpenHistory,
}: {
  data: LastPerformance;
  unit: string;
  onOpenHistory: () => void;
}) {
  const last = data.last!;
  const date = parseISO(last.date);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/80 p-4 shadow-lg",
        data.isPR ? "border-primary/40 shadow-primary/10" : "border-border",
      )}
    >
      {/* Glow accent */}
      <div
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full blur-3xl",
          data.isPR ? "bg-primary/30" : "bg-primary/10",
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Last Time
          </span>
          {data.isPR && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Trophy size={10} strokeWidth={2.5} /> PR
            </span>
          )}
        </div>
        <button
          onClick={onOpenHistory}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <History size={11} /> View History
        </button>
      </div>

      <div className="relative mt-3 flex items-end gap-3">
        <div className="font-mono text-3xl font-black leading-none">
          {formatWeight(last.topWeight)}
          <span className="ml-1 text-base font-bold text-muted-foreground">{unit}</span>
        </div>
        <div className="text-muted-foreground font-mono text-xl leading-none mb-0.5">×</div>
        <div className="font-mono text-3xl font-black leading-none">
          {last.topReps}
          <span className="ml-1 text-base font-bold text-muted-foreground">reps</span>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Stat icon={<Dumbbell size={12} />} label="Sets" value={String(last.totalSets)} />
        <Stat
          icon={<Calendar size={12} />}
          label="Done"
          value={format(date, "d MMM")}
          sub={`${formatDistanceToNowStrict(date, { addSuffix: true })}`}
        />
        <Stat icon={<Sparkles size={12} />} label="1RM est." value={`${formatWeight(last.estimatedOneRm)} ${unit}`} />
      </div>

      <div className="relative mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-md bg-background/60 border border-border px-1.5 py-0.5 font-mono uppercase tracking-wider">
          {last.sessionLabel}
        </span>
        {last.avgDifficulty && (
          <span className={cn("font-semibold uppercase tracking-wider", difficultyColor(last.avgDifficulty))}>
            felt {last.avgDifficulty}
          </span>
        )}
      </div>

      {last.notes && (
        <div className="relative mt-3 flex gap-2 rounded-lg border border-border bg-background/50 p-2 text-xs italic text-muted-foreground">
          <NotebookPen size={12} className="mt-0.5 shrink-0 text-primary/70" />
          <span className="line-clamp-2">{last.notes}</span>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-2 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-0.5 font-mono text-sm font-bold leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function SuggestionRow({
  suggestion,
  unit,
  onApply,
}: {
  suggestion: NonNullable<LastPerformance["suggestion"]>;
  unit: string;
  onApply?: (weight: number, reps: number) => void;
}) {
  return (
    <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80 flex items-center gap-1">
            <Sparkles size={10} /> Suggested Today
          </div>
          <div className="mt-0.5 font-mono text-lg font-black leading-tight">
            {formatWeight(suggestion.weight)}
            <span className="text-xs font-bold text-muted-foreground ml-1">{unit}</span>
            <span className="text-muted-foreground mx-1">×</span>
            {suggestion.reps}
            <span className="text-xs font-bold text-muted-foreground ml-1">reps</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
            {suggestion.reason}
          </p>
        </div>
        {onApply && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 h-9 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary font-bold uppercase tracking-wider text-xs"
            onClick={() => onApply(suggestion.weight, suggestion.reps)}
          >
            Use
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ exerciseName }: { exerciseName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center"
    >
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
        <Sparkles size={16} />
      </div>
      <p className="text-sm font-semibold">No previous data yet.</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Start your <span className="text-primary font-semibold">{exerciseName}</span>{" "}
        journey today.
      </p>
    </motion.div>
  );
}

function HistorySheet({
  open,
  onOpenChange,
  exerciseName,
  entries,
  unit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exerciseName: string;
  entries: LastSessionEntry[];
  unit: string;
}) {
  const peak = entries.reduce((m, e) => Math.max(m, e.topWeight), 0);
  const minWeight = entries.reduce((m, e) => Math.min(m, e.topWeight), peak);
  const range = Math.max(1, peak - minWeight);

  // Reverse chronological in `entries` (newest first); show newest at top.
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-background border-t border-border max-h-[85vh] rounded-t-2xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-mono uppercase tracking-wider flex items-center gap-2">
            <History size={18} className="text-primary" /> {exerciseName}
          </SheetTitle>
          <SheetDescription>
            Last {entries.length} session{entries.length === 1 ? "" : "s"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
          <AnimatePresence initial={false}>
            {entries.map((e, idx) => {
              const date = parseISO(e.date);
              const widthPct = peak === 0 ? 0 : ((e.topWeight - minWeight) / range) * 60 + 40;
              const isLatest = idx === 0;
              return (
                <motion.div
                  key={e.sessionId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className={cn(
                    "rounded-xl border p-3",
                    isLatest
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {format(date, "EEE d MMM yyyy")} · {e.sessionLabel}
                      </div>
                      <div className="mt-1 font-mono text-base font-bold">
                        {formatWeight(e.topWeight)} {unit}
                        <span className="text-muted-foreground mx-1.5">×</span>
                        {e.topReps}
                        <span className="text-xs font-medium text-muted-foreground ml-2">
                          · {e.totalSets} set{e.totalSets === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        1RM
                      </div>
                      <div className="font-mono text-sm font-bold text-primary">
                        {formatWeight(e.estimatedOneRm)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.6, delay: 0.05 + idx * 0.04 }}
                      className={cn(
                        "h-full rounded-full",
                        isLatest ? "bg-primary" : "bg-primary/50",
                      )}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {entries.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              No history yet.
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <ChevronDown size={14} /> Close
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatWeight(n: number): string {
  // Drop trailing .0 but keep .5 etc.
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

function difficultyColor(d: string): string {
  switch (d) {
    case "easy":
      return "text-emerald-400";
    case "moderate":
      return "text-yellow-400";
    case "hard":
      return "text-orange-400";
    case "failure":
      return "text-red-400";
    default:
      return "text-muted-foreground";
  }
}
