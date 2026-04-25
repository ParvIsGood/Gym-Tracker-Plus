import { Router, type IRouter } from "express";
import { db, bodyweightTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { AddBodyweightBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bodyweight", async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(bodyweightTable)
    .where(eq(bodyweightTable.userId, userId))
    .orderBy(asc(bodyweightTable.recordedAt));
  res.json(
    rows.map((r) => ({
      id: r.id,
      weight: r.weight,
      recordedAt: r.recordedAt.toISOString(),
    })),
  );
});

router.post("/bodyweight", async (req, res) => {
  const userId = req.userId!;
  const parse = AddBodyweightBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const inserted = await db
    .insert(bodyweightTable)
    .values({ userId, weight: parse.data.weight })
    .returning();
  const r = inserted[0];
  res.status(201).json({
    id: r.id,
    weight: r.weight,
    recordedAt: r.recordedAt.toISOString(),
  });
});

export default router;
