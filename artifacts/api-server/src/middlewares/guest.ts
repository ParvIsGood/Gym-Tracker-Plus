import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyUserToken } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      isGuest?: boolean;
    }
  }
}

const GUEST_PREFIX = "guest:";
const USER_PREFIX = "user:";

export async function authRequired(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    if (token.startsWith(USER_PREFIX)) {
      const jwtToken = token.slice(USER_PREFIX.length).trim();
      const payload = verifyUserToken(jwtToken);
      if (!payload) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, payload.sub))
        .limit(1);
      if (rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      req.userId = rows[0].id;
      req.isGuest = false;
      next();
      return;
    }

    if (token.startsWith(GUEST_PREFIX)) {
      const guestId = token.slice(GUEST_PREFIX.length).trim();
      if (!guestId) {
        res.status(401).json({ error: "Invalid guest token" });
        return;
      }
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
      req.isGuest = existing[0]?.username == null;
      next();
      return;
    }

    res.status(401).json({ error: "Unsupported token format" });
  } catch (err) {
    req.log.error({ err }, "auth middleware failed");
    res.status(500).json({ error: "Auth failed" });
  }
}

// Backwards-compatibility alias.
export const guestAuth = authRequired;
