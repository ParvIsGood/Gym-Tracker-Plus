import { Router, type IRouter } from "express";
import { db, exercisesTable, usersTable } from "@workspace/db";
import { and, or, eq, inArray, isNull, desc } from "drizzle-orm";
import {
  CreateExerciseBody,
  ListExercisesQueryParams,
  GetExerciseParams,
} from "@workspace/api-zod";
import { visibleEquipmentFor } from "../lib/equipment";

const router: IRouter = Router();

function serialize(e: typeof exercisesTable.$inferSelect) {
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

router.get("/exercises", async (req, res) => {
  const userId = req.userId!;
  const parse = ListExercisesQueryParams.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid query", issues: parse.error.issues });
    return;
  }
  const { muscleGroup, equipment } = parse.data;

  const userRows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const userEquipment = equipment ?? userRows[0]?.equipment ?? "full_gym";
  const allowedEquipment = visibleEquipmentFor(userEquipment);

  const conds = [
    or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId))!,
    inArray(exercisesTable.equipment, allowedEquipment),
  ];
  if (muscleGroup) {
    conds.push(eq(exercisesTable.muscleGroup, muscleGroup));
  }

  const rows = await db
    .select()
    .from(exercisesTable)
    .where(and(...conds))
    .orderBy(desc(exercisesTable.isCustom), exercisesTable.name);

  res.json(rows.map(serialize));
});

router.post("/exercises", async (req, res) => {
  const userId = req.userId!;
  const parse = CreateExerciseBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body", issues: parse.error.issues });
    return;
  }
  const inserted = await db
    .insert(exercisesTable)
    .values({
      userId,
      name: parse.data.name,
      muscleGroup: parse.data.muscleGroup,
      equipment: parse.data.equipment,
      description: parse.data.description ?? null,
      formCues: parse.data.formCues ?? [],
      isCustom: true,
    })
    .returning();
  res.status(201).json(serialize(inserted[0]));
});

router.get("/exercises/:id", async (req, res) => {
  const userId = req.userId!;
  const parse = GetExerciseParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db
    .select()
    .from(exercisesTable)
    .where(
      and(
        eq(exercisesTable.id, parse.data.id),
        or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId)),
      ),
    )
    .limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serialize(rows[0]));
});

export default router;
