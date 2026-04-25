import { Router, type IRouter } from "express";
import {
  db,
  sessionsTable,
  sessionExercisesTable,
  setsTable,
  exercisesTable,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  StartSessionBody,
  GetSessionParams,
  CompleteSessionParams,
  CompleteSessionBody,
  AddSetParams,
  AddSetBody,
  DeleteSetParams,
  ListSessionsQueryParams,
} from "@workspace/api-zod";
import { epley1RM, estimateCalories } from "../lib/equipment";

const router: IRouter = Router();

function exerciseToJson(e: typeof exercisesTable.$inferSelect) {
  return {
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    isCustom: e.isCustom,
    description: e.description ?? undefined,
    formCues: Array.isArray(e.formCues) ? e.formCues : [],
  };
}

function setToJson(s: typeof setsTable.$inferSelect) {
  return {
    id: s.id,
    sessionExerciseId: s.sessionExerciseId,
    setNumber: s.setNumber,
    weight: s.weight,
    reps: s.reps,
    difficulty: s.difficulty,
    notes: s.notes ?? undefined,
    createdAt: s.createdAt.toISOString(),
  };
}

async function loadFullSession(sessionId: string, userId: string) {
  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
    .limit(1);
  if (sessionRows.length === 0) return null;
  const session = sessionRows[0];

  const sxRows = await db
    .select()
    .from(sessionExercisesTable)
    .where(eq(sessionExercisesTable.sessionId, sessionId))
    .orderBy(asc(sessionExercisesTable.orderIndex));

  const exIds = sxRows.map((r) => r.exerciseId);
  const exRows =
    exIds.length > 0
      ? await db
          .select()
          .from(exercisesTable)
          .where(inArray(exercisesTable.id, exIds))
      : [];
  const exMap = new Map(exRows.map((e) => [e.id, e]));

  const sxIds = sxRows.map((r) => r.id);
  const sets =
    sxIds.length > 0
      ? await db
          .select()
          .from(setsTable)
          .where(inArray(setsTable.sessionExerciseId, sxIds))
          .orderBy(asc(setsTable.setNumber), asc(setsTable.createdAt))
      : [];

  return {
    id: session.id,
    day: session.day,
    label: session.label,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString(),
    durationSec: session.durationSec ?? undefined,
    totalVolume: session.totalVolume ?? undefined,
    estimatedCalories: session.estimatedCalories ?? undefined,
    exercises: sxRows.map((sx) => {
      const ex = exMap.get(sx.exerciseId)!;
      return {
        id: sx.id,
        exercise: exerciseToJson(ex),
        sets: sets
          .filter((s) => s.sessionExerciseId === sx.id)
          .map(setToJson),
      };
    }),
  };
}

router.get("/sessions", async (req, res) => {
  const userId = req.userId!;
  const parse = ListSessionsQueryParams.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const limit = parse.data.limit ?? 50;

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .orderBy(desc(sessionsTable.startedAt))
    .limit(limit);

  if (rows.length === 0) {
    res.json([]);
    return;
  }

  const sessionIds = rows.map((r) => r.id);
  const setCounts = await db
    .select({
      sessionId: sessionExercisesTable.sessionId,
      total: sql<number>`count(${setsTable.id})`.as("total"),
    })
    .from(sessionExercisesTable)
    .leftJoin(
      setsTable,
      eq(setsTable.sessionExerciseId, sessionExercisesTable.id),
    )
    .where(inArray(sessionExercisesTable.sessionId, sessionIds))
    .groupBy(sessionExercisesTable.sessionId);

  const countMap = new Map(setCounts.map((c) => [c.sessionId, Number(c.total)]));

  res.json(
    rows.map((r) => ({
      id: r.id,
      day: r.day,
      label: r.label,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString(),
      durationSec: r.durationSec ?? undefined,
      totalVolume: r.totalVolume ?? undefined,
      estimatedCalories: r.estimatedCalories ?? undefined,
      totalSets: countMap.get(r.id) ?? 0,
    })),
  );
});

router.post("/sessions", async (req, res) => {
  const userId = req.userId!;
  const parse = StartSessionBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body", issues: parse.error.issues });
    return;
  }
  const { day, label, exerciseIds } = parse.data;

  const inserted = await db
    .insert(sessionsTable)
    .values({ userId, day, label, status: "active" })
    .returning();
  const session = inserted[0];

  if (exerciseIds.length > 0) {
    await db.insert(sessionExercisesTable).values(
      exerciseIds.map((eid, idx) => ({
        sessionId: session.id,
        exerciseId: eid,
        orderIndex: idx,
      })),
    );
  }

  const full = await loadFullSession(session.id, userId);
  res.status(201).json(full);
});

router.get("/sessions/:id", async (req, res) => {
  const userId = req.userId!;
  const parse = GetSessionParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const full = await loadFullSession(parse.data.id, userId);
  if (!full) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(full);
});

router.post("/sessions/:id/sets", async (req, res) => {
  const userId = req.userId!;
  const paramsParse = AddSetParams.safeParse(req.params);
  const bodyParse = AddSetBody.safeParse(req.body);
  if (!paramsParse.success || !bodyParse.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const sessionId = paramsParse.data.id;
  const { exerciseId, weight, reps, difficulty, notes } = bodyParse.data;

  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
    .limit(1);
  if (sessionRows.length === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  let sxRow = (
    await db
      .select()
      .from(sessionExercisesTable)
      .where(
        and(
          eq(sessionExercisesTable.sessionId, sessionId),
          eq(sessionExercisesTable.exerciseId, exerciseId),
        ),
      )
      .limit(1)
  )[0];

  if (!sxRow) {
    const maxOrderRow = await db
      .select({
        maxOrder: sql<number | null>`max(${sessionExercisesTable.orderIndex})`,
      })
      .from(sessionExercisesTable)
      .where(eq(sessionExercisesTable.sessionId, sessionId));
    const nextOrder = (maxOrderRow[0]?.maxOrder ?? -1) + 1;
    sxRow = (
      await db
        .insert(sessionExercisesTable)
        .values({
          sessionId,
          exerciseId,
          orderIndex: nextOrder,
        })
        .returning()
    )[0];
  }

  const existingSets = await db
    .select({ setNumber: setsTable.setNumber })
    .from(setsTable)
    .where(eq(setsTable.sessionExerciseId, sxRow.id));
  const nextSetNumber = existingSets.length + 1;

  const inserted = await db
    .insert(setsTable)
    .values({
      sessionExerciseId: sxRow.id,
      setNumber: nextSetNumber,
      weight,
      reps,
      difficulty,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(setToJson(inserted[0]));
});

router.delete("/sets/:id", async (req, res) => {
  const userId = req.userId!;
  const parse = DeleteSetParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const setId = parse.data.id;
  const rows = await db
    .select({
      setId: setsTable.id,
      sessionId: sessionExercisesTable.sessionId,
      sessionUserId: sessionsTable.userId,
    })
    .from(setsTable)
    .innerJoin(
      sessionExercisesTable,
      eq(setsTable.sessionExerciseId, sessionExercisesTable.id),
    )
    .innerJoin(sessionsTable, eq(sessionsTable.id, sessionExercisesTable.sessionId))
    .where(eq(setsTable.id, setId))
    .limit(1);

  if (rows.length === 0 || rows[0].sessionUserId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(setsTable).where(eq(setsTable.id, setId));
  res.status(204).send();
});

router.patch("/sessions/:id", async (req, res) => {
  const userId = req.userId!;
  const paramsParse = CompleteSessionParams.safeParse(req.params);
  const bodyParse = CompleteSessionBody.safeParse(req.body);
  if (!paramsParse.success || !bodyParse.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const sessionId = paramsParse.data.id;
  const { durationSec } = bodyParse.data;

  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
    .limit(1);
  if (sessionRows.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const session = sessionRows[0];

  // Compute totals.
  const setsRows = await db
    .select({
      weight: setsTable.weight,
      reps: setsTable.reps,
      exerciseId: sessionExercisesTable.exerciseId,
    })
    .from(setsTable)
    .innerJoin(
      sessionExercisesTable,
      eq(setsTable.sessionExerciseId, sessionExercisesTable.id),
    )
    .where(eq(sessionExercisesTable.sessionId, sessionId));

  const totalVolume = setsRows.reduce(
    (acc, s) => acc + (s.weight || 0) * (s.reps || 0),
    0,
  );
  const computedDuration =
    durationSec ??
    Math.max(
      60,
      Math.round((Date.now() - session.startedAt.getTime()) / 1000),
    );
  const calories = estimateCalories(totalVolume, computedDuration);

  // Detect new PRs (best 1RM per exercise this session vs all prior).
  // For each exercise in this session, compute max 1RM from this session's sets.
  const thisSessionByEx = new Map<string, number>();
  const repsByEx = new Map<string, number>();
  const weightByEx = new Map<string, number>();
  for (const s of setsRows) {
    const oneRm = epley1RM(s.weight, s.reps);
    const cur = thisSessionByEx.get(s.exerciseId) ?? 0;
    if (oneRm > cur) {
      thisSessionByEx.set(s.exerciseId, oneRm);
      weightByEx.set(s.exerciseId, s.weight);
      repsByEx.set(s.exerciseId, s.reps);
    }
  }

  // Pull historical max 1RM per exercise across all prior completed sessions.
  const newPRs: {
    exerciseId: string;
    exerciseName: string;
    weight: number;
    reps: number;
    estimatedOneRm: number;
    achievedAt: string;
  }[] = [];

  if (thisSessionByEx.size > 0) {
    const exIds = Array.from(thisSessionByEx.keys());
    const historical = await db
      .select({
        exerciseId: sessionExercisesTable.exerciseId,
        weight: setsTable.weight,
        reps: setsTable.reps,
      })
      .from(setsTable)
      .innerJoin(
        sessionExercisesTable,
        eq(setsTable.sessionExerciseId, sessionExercisesTable.id),
      )
      .innerJoin(
        sessionsTable,
        eq(sessionsTable.id, sessionExercisesTable.sessionId),
      )
      .where(
        and(
          eq(sessionsTable.userId, userId),
          eq(sessionsTable.status, "completed"),
          inArray(sessionExercisesTable.exerciseId, exIds),
        ),
      );

    const histMax = new Map<string, number>();
    for (const h of historical) {
      const oneRm = epley1RM(h.weight, h.reps);
      const cur = histMax.get(h.exerciseId) ?? 0;
      if (oneRm > cur) histMax.set(h.exerciseId, oneRm);
    }

    const exNames = await db
      .select({ id: exercisesTable.id, name: exercisesTable.name })
      .from(exercisesTable)
      .where(inArray(exercisesTable.id, exIds));
    const nameMap = new Map(exNames.map((e) => [e.id, e.name]));

    const now = new Date().toISOString();
    for (const [exId, oneRm] of thisSessionByEx) {
      const prior = histMax.get(exId) ?? 0;
      if (oneRm > prior + 0.0001) {
        newPRs.push({
          exerciseId: exId,
          exerciseName: nameMap.get(exId) ?? "Exercise",
          weight: weightByEx.get(exId) ?? 0,
          reps: repsByEx.get(exId) ?? 0,
          estimatedOneRm: oneRm,
          achievedAt: now,
        });
      }
    }
  }

  await db
    .update(sessionsTable)
    .set({
      status: "completed",
      completedAt: new Date(),
      durationSec: computedDuration,
      totalVolume,
      estimatedCalories: calories,
    })
    .where(eq(sessionsTable.id, sessionId));

  // Compute current streak (consecutive days ending today or yesterday with a completed workout).
  const completed = await db
    .select({ startedAt: sessionsTable.startedAt })
    .from(sessionsTable)
    .where(
      and(eq(sessionsTable.userId, userId), eq(sessionsTable.status, "completed")),
    )
    .orderBy(desc(sessionsTable.startedAt));
  const days = new Set(
    completed.map((c) => c.startedAt.toISOString().slice(0, 10)),
  );
  let streak = 0;
  const today = new Date();
  // Allow streak to count if today or yesterday is in the set
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
    } else if (i === 0) {
      // Skip today if no workout yet today, then look at yesterday onward
      continue;
    } else {
      break;
    }
  }

  const full = await loadFullSession(sessionId, userId);
  res.json({
    session: full,
    newPRs,
    currentStreak: streak,
  });
});

export default router;
