import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serialize(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username ?? undefined,
    displayName: u.displayName,
    equipment: u.equipment,
    units: u.units,
    isGuest: u.username == null,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/profile", async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  res.json(serialize(rows[0]));
});

router.patch("/profile", async (req, res) => {
  const userId = req.userId!;
  const parse = UpdateProfileBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body", issues: parse.error.issues });
    return;
  }
  const update: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
  if (parse.data.displayName !== undefined) update.displayName = parse.data.displayName;
  if (parse.data.equipment !== undefined) update.equipment = parse.data.equipment;
  if (parse.data.units !== undefined) update.units = parse.data.units;

  await db.update(usersTable).set(update).where(eq(usersTable.id, userId));

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  res.json(serialize(rows[0]));
});

export default router;
