import { Router, type IRouter } from "express";
import {
  db,
  sessionsTable,
  sessionExercisesTable,
  setsTable,
  exercisesTable,
} from "@workspace/db";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { GetStrengthProgressParams } from "@workspace/api-zod";
import { epley1RM } from "../lib/equipment";

const router: IRouter = Router();

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0..6 Sun..Sat
  const diff = (day + 6) % 7; // make Monday=0
  x.setDate(x.getDate() - diff);
  return x;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

router.get("/stats/summary", async (req, res) => {
  const userId = req.userId!;

  const completed = await db
    .select({
      id: sessionsTable.id,
      startedAt: sessionsTable.startedAt,
      day: sessionsTable.day,
      totalVolume: sessionsTable.totalVolume,
    })
    .from(sessionsTable)
    .where(
      and(eq(sessionsTable.userId, userId), eq(sessionsTable.status, "completed")),
    )
    .orderBy(desc(sessionsTable.startedAt));

  const totalVolumeAllTime = completed.reduce(
    (acc, c) => acc + (c.totalVolume ?? 0),
    0,
  );
  const workoutsAllTime = completed.length;

  const today = new Date();
  const weekStart = startOfWeek(today);
  const workoutsThisWeek = completed.filter(
    (c) => c.startedAt >= weekStart,
  ).length;

  const dayKeys = new Set(completed.map((c) => ymd(c.startedAt)));

  // Current streak — accept today or yesterday as the starting day
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    if (dayKeys.has(key)) {
      currentStreak += 1;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  // Longest streak
  let longestStreak = 0;
  if (dayKeys.size > 0) {
    const sortedKeys = Array.from(dayKeys).sort();
    let run = 1;
    longestStreak = 1;
    for (let i = 1; i < sortedKeys.length; i++) {
      const prev = new Date(sortedKeys[i - 1] + "T00:00:00Z");
      const cur = new Date(sortedKeys[i] + "T00:00:00Z");
      const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (Math.round(diff) === 1) {
        run += 1;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 1;
      }
    }
  }

  // Consistency over last 4 weeks: workouts / 16 (4 per week target) capped at 100.
  const fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recent = completed.filter((c) => c.startedAt >= fourWeeksAgo).length;
  const consistencyScore = Math.min(100, Math.round((recent / 16) * 100));

  const lastWorkoutDay = completed[0]?.startedAt?.toISOString();

  // Skipped leg day flag — true if no leg session in the last 8 days.
  const eightDaysAgo = new Date(today);
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
  const recentLeg = completed.find(
    (c) => c.startedAt >= eightDaysAgo && c.day === "wednesday",
  );
  const skippedLegDay = !recentLeg && workoutsAllTime > 0;

  res.json({
    currentStreak,
    longestStreak,
    workoutsThisWeek,
    workoutsAllTime,
    totalVolumeAllTime,
    consistencyScore,
    lastWorkoutDay,
    skippedLegDay,
  });
});

router.get("/stats/volume", async (req, res) => {
  const userId = req.userId!;
  const since = new Date();
  since.setDate(since.getDate() - 12 * 7);

  const rows = await db
    .select({
      startedAt: sessionsTable.startedAt,
      totalVolume: sessionsTable.totalVolume,
    })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.status, "completed"),
        gte(sessionsTable.startedAt, since),
      ),
    );

  const buckets = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = ymd(startOfWeek(d));
    buckets.set(key, 0);
  }
  for (const r of rows) {
    const key = ymd(startOfWeek(r.startedAt));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + (r.totalVolume ?? 0));
    }
  }
  res.json(
    Array.from(buckets.entries()).map(([weekStart, volume]) => ({
      weekStart,
      volume: Math.round(volume * 10) / 10,
    })),
  );
});

router.get("/stats/frequency", async (req, res) => {
  const userId = req.userId!;
  const since = new Date();
  since.setDate(since.getDate() - 12 * 7);

  const rows = await db
    .select({ startedAt: sessionsTable.startedAt })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.status, "completed"),
        gte(sessionsTable.startedAt, since),
      ),
    );

  const buckets = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = ymd(startOfWeek(d));
    buckets.set(key, 0);
  }
  for (const r of rows) {
    const key = ymd(startOfWeek(r.startedAt));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
  res.json(
    Array.from(buckets.entries()).map(([weekStart, count]) => ({
      weekStart,
      count,
    })),
  );
});

router.get("/stats/strength/:exerciseId", async (req, res) => {
  const userId = req.userId!;
  const parse = GetStrengthProgressParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { exerciseId } = parse.data;

  const rows = await db
    .select({
      sessionId: sessionsTable.id,
      startedAt: sessionsTable.startedAt,
      weight: setsTable.weight,
      reps: setsTable.reps,
    })
    .from(setsTable)
    .innerJoin(
      sessionExercisesTable,
      eq(setsTable.sessionExerciseId, sessionExercisesTable.id),
    )
    .innerJoin(sessionsTable, eq(sessionsTable.id, sessionExercisesTable.sessionId))
    .where(
      and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.status, "completed"),
        eq(sessionExercisesTable.exerciseId, exerciseId),
      ),
    )
    .orderBy(asc(sessionsTable.startedAt));

  // Top 1RM per session
  const bySession = new Map<
    string,
    { date: Date; topWeight: number; topReps: number; oneRm: number }
  >();
  for (const r of rows) {
    const oneRm = epley1RM(r.weight, r.reps);
    const cur = bySession.get(r.sessionId);
    if (!cur || oneRm > cur.oneRm) {
      bySession.set(r.sessionId, {
        date: r.startedAt,
        topWeight: r.weight,
        topReps: r.reps,
        oneRm,
      });
    }
  }

  const out = Array.from(bySession.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((p) => ({
      date: ymd(p.date),
      topWeight: p.topWeight,
      topReps: p.topReps,
      estimatedOneRm: p.oneRm,
    }));

  res.json(out);
});

router.get("/stats/prs", async (req, res) => {
  const userId = req.userId!;

  const rows = await db
    .select({
      exerciseId: sessionExercisesTable.exerciseId,
      weight: setsTable.weight,
      reps: setsTable.reps,
      achievedAt: sessionsTable.startedAt,
    })
    .from(setsTable)
    .innerJoin(
      sessionExercisesTable,
      eq(setsTable.sessionExerciseId, sessionExercisesTable.id),
    )
    .innerJoin(sessionsTable, eq(sessionsTable.id, sessionExercisesTable.sessionId))
    .where(
      and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.status, "completed"),
      ),
    );

  type Best = {
    exerciseId: string;
    weight: number;
    reps: number;
    oneRm: number;
    achievedAt: Date;
  };
  const best = new Map<string, Best>();
  for (const r of rows) {
    const oneRm = epley1RM(r.weight, r.reps);
    const cur = best.get(r.exerciseId);
    if (!cur || oneRm > cur.oneRm) {
      best.set(r.exerciseId, {
        exerciseId: r.exerciseId,
        weight: r.weight,
        reps: r.reps,
        oneRm,
        achievedAt: r.achievedAt,
      });
    }
  }

  if (best.size === 0) {
    res.json([]);
    return;
  }

  const exIds = Array.from(best.keys());
  const exRows = await db
    .select({ id: exercisesTable.id, name: exercisesTable.name })
    .from(exercisesTable)
    .where(inArray(exercisesTable.id, exIds));
  const nameMap = new Map(exRows.map((e) => [e.id, e.name]));

  res.json(
    Array.from(best.values())
      .sort((a, b) => b.oneRm - a.oneRm)
      .map((b) => ({
        exerciseId: b.exerciseId,
        exerciseName: nameMap.get(b.exerciseId) ?? "Exercise",
        weight: b.weight,
        reps: b.reps,
        estimatedOneRm: b.oneRm,
        achievedAt: b.achievedAt.toISOString(),
      })),
  );
});

export default router;
