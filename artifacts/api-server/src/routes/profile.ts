import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const u = rows[0];
  res.json({
    id: u.id,
    displayName: u.displayName,
    equipment: u.equipment,
    units: u.units,
    createdAt: u.createdAt.toISOString(),
  });
});

router.patch("/profile", async (req, res) => {
  const userId = req.userId!;
  const parse = UpdateProfileBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body", issues: parse.error.issues });
    return;
  }
  const update: Partial<typeof usersTable.$inferInsert> = {};
  if (parse.data.displayName !== undefined) update.displayName = parse.data.displayName;
  if (parse.data.equipment !== undefined) update.equipment = parse.data.equipment;
  if (parse.data.units !== undefined) update.units = parse.data.units;

  if (Object.keys(update).length > 0) {
    await db.update(usersTable).set(update).where(eq(usersTable.id, userId));
  }

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const u = rows[0];
  res.json({
    id: u.id,
    displayName: u.displayName,
    equipment: u.equipment,
    units: u.units,
    createdAt: u.createdAt.toISOString(),
  });
});

export default router;
