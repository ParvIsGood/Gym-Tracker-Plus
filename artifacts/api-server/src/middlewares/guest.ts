import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      guestId?: string;
    }
  }
}

const GUEST_PREFIX = "guest:";

export async function guestAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token.startsWith(GUEST_PREFIX)) {
    res.status(401).json({ error: "Missing guest token" });
    return;
  }
  const guestId = token.slice(GUEST_PREFIX.length).trim();
  if (!guestId) {
    res.status(401).json({ error: "Invalid guest token" });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.guestId, guestId))
      .limit(1);

    let userId: string;
    if (existing.length === 0) {
      const inserted = await db
        .insert(usersTable)
        .values({ guestId })
        .returning();
      userId = inserted[0].id;
    } else {
      userId = existing[0].id;
    }

    req.userId = userId;
    req.guestId = guestId;
    next();
  } catch (err) {
    req.log.error({ err }, "guestAuth failed");
    res.status(500).json({ error: "Auth failed" });
  }
}
