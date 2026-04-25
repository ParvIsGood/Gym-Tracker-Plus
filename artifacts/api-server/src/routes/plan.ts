import { Router, type IRouter } from "express";
import { db, planDaysTable, exercisesTable, usersTable } from "@workspace/db";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { UpdatePlanDayBody, UpdatePlanDayParams } from "@workspace/api-zod";
import { visibleEquipmentFor } from "../lib/equipment";

const router: IRouter = Router();

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DEFAULT_LABELS: Record<(typeof DAYS)[number], { label: string; muscleGroup: string | null; isRest: boolean }> = {
  monday: { label: "Chest Day", muscleGroup: "chest", isRest: false },
  tuesday: { label: "Back Day", muscleGroup: "back", isRest: false },
  wednesday: { label: "Leg Day", muscleGroup: "legs", isRest: false },
  thursday: { label: "Shoulder Day", muscleGroup: "shoulders", isRest: false },
  friday: { label: "Arms Day", muscleGroup: "arms", isRest: false },
  saturday: { label: "Full Body", muscleGroup: "full_body", isRest: false },
  sunday: { label: "Rest Day", muscleGroup: null, isRest: true },
};

async function ensurePlanForUser(userId: string) {
  const existing = await db
    .select()
    .from(planDaysTable)
    .where(eq(planDaysTable.userId, userId));
  if (existing.length === 7) return existing;

  const userRow = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const equipment = userRow[0]?.equipment ?? "full_gym";
  const allowed = visibleEquipmentFor(equipment);

  const haveDays = new Set(existing.map((r) => r.day));
  const toCreate = DAYS.filter((d) => !haveDays.has(d));

  const allExercises = await db
    .select()
    .from(exercisesTable)
    .where(
      and(
        or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId))!,
        inArray(exercisesTable.equipment, allowed),
      ),
    );

  const newRows = toCreate.map((d) => {
    const cfg = DEFAULT_LABELS[d];
    let exerciseIds: string[] = [];
    if (!cfg.isRest && cfg.muscleGroup) {
      exerciseIds = allExercises
        .filter((e) => e.muscleGroup === cfg.muscleGroup)
        .slice(0, 5)
        .map((e) => e.id);
    } else if (!cfg.isRest && cfg.muscleGroup === "full_body") {
      exerciseIds = allExercises.slice(0, 5).map((e) => e.id);
    }
    return {
      userId,
      day: d,
      label: cfg.label,
      isRest: cfg.isRest,
      exerciseIds,
    };
  });

  if (newRows.length > 0) {
    await db.insert(planDaysTable).values(newRows);
  }

  return db
    .select()
    .from(planDaysTable)
    .where(eq(planDaysTable.userId, userId));
}

router.get("/plan", async (req, res) => {
  const userId = req.userId!;
  const planRows = await ensurePlanForUser(userId);

  const allExerciseIds = Array.from(
    new Set(planRows.flatMap((r) => r.exerciseIds ?? [])),
  );

  const exMap = new Map<string, typeof exercisesTable.$inferSelect>();
  if (allExerciseIds.length > 0) {
    const exs = await db
      .select()
      .from(exercisesTable)
      .where(inArray(exercisesTable.id, allExerciseIds));
    for (const e of exs) exMap.set(e.id, e);
  }

  const ordered = DAYS.map((d) => {
    const row = planRows.find((r) => r.day === d);
    if (!row) {
      const cfg = DEFAULT_LABELS[d];
      return { day: d, label: cfg.label, isRest: cfg.isRest, exercises: [] };
    }
    return {
      day: row.day,
      label: row.label,
      isRest: row.isRest,
      exercises: (row.exerciseIds ?? [])
        .map((id) => exMap.get(id))
        .filter((e): e is typeof exercisesTable.$inferSelect => Boolean(e))
        .map((e) => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscleGroup,
          equipment: e.equipment,
          isCustom: e.isCustom,
          description: e.description ?? undefined,
          formCues: Array.isArray(e.formCues) ? e.formCues : [],
        })),
    };
  });

  res.json(ordered);
});

router.put("/plan/:day", async (req, res) => {
  const userId = req.userId!;
  const paramsParse = UpdatePlanDayParams.safeParse(req.params);
  const bodyParse = UpdatePlanDayBody.safeParse(req.body);
  if (!paramsParse.success || !bodyParse.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { day } = paramsParse.data;
  const { label, isRest, exerciseIds } = bodyParse.data;

  await ensurePlanForUser(userId);

  await db
    .update(planDaysTable)
    .set({
      label,
      isRest: isRest ?? false,
      exerciseIds: exerciseIds ?? [],
      updatedAt: new Date(),
    })
    .where(and(eq(planDaysTable.userId, userId), eq(planDaysTable.day, day)));

  const exs =
    exerciseIds && exerciseIds.length > 0
      ? await db
          .select()
          .from(exercisesTable)
          .where(inArray(exercisesTable.id, exerciseIds))
      : [];
  const exMap = new Map(exs.map((e) => [e.id, e]));

  res.json({
    day,
    label,
    isRest: isRest ?? false,
    exercises: (exerciseIds ?? [])
      .map((id) => exMap.get(id))
      .filter((e): e is typeof exercisesTable.$inferSelect => Boolean(e))
      .map((e) => ({
        id: e.id,
        name: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        isCustom: e.isCustom,
        description: e.description ?? undefined,
        formCues: Array.isArray(e.formCues) ? e.formCues : [],
      })),
  });
});

export default router;
