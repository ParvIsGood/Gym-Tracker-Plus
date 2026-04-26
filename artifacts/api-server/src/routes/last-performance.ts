import { Router, type IRouter } from "express";
import {
  db,
  sessionsTable,
  sessionExercisesTable,
  setsTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { epley1RM } from "../lib/equipment";

const router: IRouter = Router();

type Difficulty = "easy" | "moderate" | "hard" | "failure";

type LastSessionEntry = {
  sessionId: string;
  date: string;
  sessionLabel: string;
  topWeight: number;
  topReps: number;
  totalSets: number;
  estimatedOneRm: number;
  avgDifficulty?: Difficulty;
  notes?: string;
};

type SmartSuggestion = {
  weight: number;
  reps: number;
  reason: string;
};

function modeDifficulty(diffs: Difficulty[]): Difficulty | undefined {
  if (diffs.length === 0) return undefined;
  const counts = new Map<Difficulty, number>();
  for (const d of diffs) counts.set(d, (counts.get(d) ?? 0) + 1);
  // tie-break: failure > hard > moderate > easy (lean cautious)
  const order: Difficulty[] = ["failure", "hard", "moderate", "easy"];
  let best: Difficulty = diffs[0];
  let bestCount = -1;
  for (const d of order) {
    const c = counts.get(d) ?? 0;
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

function suggestNext(entry: LastSessionEntry): SmartSuggestion {
  const w = entry.topWeight;
  const r = entry.topReps;
  switch (entry.avgDifficulty) {
    case "easy":
      return {
        weight: roundToHalfStep(w + 2.5),
        reps: r,
        reason: "Last sets felt easy. Add 2.5 kg.",
      };
    case "moderate":
      return {
        weight: w,
        reps: r + 1,
        reason: "Solid form last time. Push for one more rep.",
      };
    case "hard":
      return {
        weight: w,
        reps: r,
        reason: "Tough session. Lock in the same weight and own it.",
      };
    case "failure":
      return {
        weight: roundToHalfStep(Math.max(0, w - 2.5)),
        reps: r,
        reason: "You hit failure last time. Drop 2.5 kg and rebuild.",
      };
    default:
      return {
        weight: w,
        reps: r,
        reason: "Match your last session and progress from there.",
      };
  }
}

function roundToHalfStep(n: number): number {
  return Math.round(n * 2) / 2;
}

router.get("/exercises/:id/last-performance", async (req, res) => {
  const userId = req.userId!;
  const exerciseId = req.params.id;

  // Pull every completed set this user has logged for this exercise, joined
  // with its parent session, ordered newest-first. Single query keeps it fast.
  const rows = await db
    .select({
      sessionId: sessionsTable.id,
      sessionLabel: sessionsTable.label,
      sessionStatus: sessionsTable.status,
      sessionDate: sessionsTable.completedAt,
      sessionStarted: sessionsTable.startedAt,
      setId: setsTable.id,
      weight: setsTable.weight,
      reps: setsTable.reps,
      difficulty: setsTable.difficulty,
      notes: setsTable.notes,
    })
    .from(setsTable)
    .innerJoin(
      sessionExercisesTable,
      eq(setsTable.sessionExerciseId, sessionExercisesTable.id),
    )
    .innerJoin(
      sessionsTable,
      eq(sessionExercisesTable.sessionId, sessionsTable.id),
    )
    .where(
      and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.status, "completed"),
        eq(sessionExercisesTable.exerciseId, exerciseId),
      ),
    )
    .orderBy(desc(sessionsTable.completedAt), desc(sessionsTable.startedAt));

  if (rows.length === 0) {
    res.json({ hasHistory: false, isPR: false, recent: [] });
    return;
  }

  // Group by session.
  type Row = (typeof rows)[number];
  const bySession = new Map<string, Row[]>();
  for (const r of rows) {
    const list = bySession.get(r.sessionId) ?? [];
    list.push(r);
    bySession.set(r.sessionId, list);
  }

  const entries: LastSessionEntry[] = [];
  for (const [sessionId, sets] of bySession) {
    const heaviest = sets.reduce(
      (best, s) =>
        s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)
          ? s
          : best,
      sets[0],
    );
    const oneRm = epley1RM(heaviest.weight, heaviest.reps);
    const date =
      sets[0].sessionDate?.toISOString() ?? sets[0].sessionStarted.toISOString();
    const diffs = sets
      .map((s) => s.difficulty as Difficulty | null)
      .filter((d): d is Difficulty => d != null);
    const noteSet = sets.find((s) => s.notes && s.notes.trim().length > 0);
    entries.push({
      sessionId,
      date,
      sessionLabel: sets[0].sessionLabel,
      topWeight: heaviest.weight,
      topReps: heaviest.reps,
      totalSets: sets.length,
      estimatedOneRm: Math.round(oneRm * 10) / 10,
      avgDifficulty: modeDifficulty(diffs),
      notes: noteSet?.notes ?? undefined,
    });
  }

  // Already newest-first because rows were ordered by session date desc.
  const last = entries[0];
  const recent = entries.slice(0, 5);

  // PR if last session's estimated 1RM is >= every prior session's 1RM.
  const priorMax = entries
    .slice(1)
    .reduce((acc, e) => Math.max(acc, e.estimatedOneRm), 0);
  const isPR = entries.length === 1 || last.estimatedOneRm > priorMax;

  res.json({
    hasHistory: true,
    isPR,
    last,
    suggestion: suggestNext(last),
    recent,
  });
});

export default router;
