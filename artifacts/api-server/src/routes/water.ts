import { Router, type IRouter } from "express";
import { db, waterTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const GOAL_CUPS = 8;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get("/water/today", async (req, res) => {
  const userId = req.userId!;
  const date = todayDate();
  const rows = await db
    .select()
    .from(waterTable)
    .where(and(eq(waterTable.userId, userId), eq(waterTable.date, date)))
    .limit(1);
  const cups = rows[0]?.cups ?? 0;
  res.json({ date, cups, goalCups: GOAL_CUPS });
});

router.post("/water", async (req, res) => {
  const userId = req.userId!;
  const date = todayDate();
  const existing = await db
    .select()
    .from(waterTable)
    .where(and(eq(waterTable.userId, userId), eq(waterTable.date, date)))
    .limit(1);

  let cups = 1;
  if (existing.length === 0) {
    await db.insert(waterTable).values({ userId, date, cups: 1 });
  } else {
    const updated = await db
      .update(waterTable)
      .set({ cups: sql`${waterTable.cups} + 1` })
      .where(eq(waterTable.id, existing[0].id))
      .returning();
    cups = updated[0].cups;
  }
  res.json({ date, cups, goalCups: GOAL_CUPS });
});

export default router;
