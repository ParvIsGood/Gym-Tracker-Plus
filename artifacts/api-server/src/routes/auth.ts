import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db, usersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  signUserToken,
  USERNAME_RE,
  verifyPassword,
  verifyUserToken,
} from "../lib/auth";

const router: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait a minute." },
});

const signupLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts. Please wait a minute." },
});

function profileOf(u: typeof usersTable.$inferSelect) {
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

router.post("/auth/signup", signupLimiter, async (req, res) => {
  const parse = SignupBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body", issues: parse.error.issues });
    return;
  }
  const { username, password, displayName, migrateGuestId } = parse.data;
  const lowerUsername = username.toLowerCase();

  if (!USERNAME_RE.test(lowerUsername)) {
    res.status(400).json({
      error: "Username must be 3-32 chars, letters/numbers/underscore only",
    });
    return;
  }

  // Check if username taken
  const taken = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, lowerUsername))
    .limit(1);
  if (taken.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password);

  let userRow: typeof usersTable.$inferSelect;
  if (migrateGuestId) {
    // Try to attach to an existing guest row.
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.guestId, migrateGuestId))
      .limit(1);
    if (existing.length > 0 && existing[0].username == null) {
      const updated = await db
        .update(usersTable)
        .set({
          username: lowerUsername,
          passwordHash,
          displayName: displayName ?? existing[0].displayName,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, existing[0].id))
        .returning();
      userRow = updated[0];
    } else {
      const inserted = await db
        .insert(usersTable)
        .values({
          guestId: migrateGuestId,
          username: lowerUsername,
          passwordHash,
          displayName: displayName ?? "Athlete",
        })
        .returning();
      userRow = inserted[0];
    }
  } else {
    const inserted = await db
      .insert(usersTable)
      .values({
        guestId: crypto.randomUUID(),
        username: lowerUsername,
        passwordHash,
        displayName: displayName ?? "Athlete",
      })
      .returning();
    userRow = inserted[0];
  }

  const token = signUserToken(userRow.id);
  res.status(201).json({ token, profile: profileOf(userRow) });
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const parse = LoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { username, password } = parse.data;
  const lowerUsername = username.toLowerCase();

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, lowerUsername))
    .limit(1);
  if (rows.length === 0 || !rows[0].passwordHash) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const ok = await verifyPassword(password, rows[0].passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signUserToken(rows[0].id);
  res.json({ token, profile: profileOf(rows[0]) });
});

router.get("/auth/me", async (req, res) => {
  const auth = req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token.startsWith("user:")) {
    const payload = verifyUserToken(token.slice(5).trim());
    if (!payload) {
      res.json({ authenticated: false });
      return;
    }
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);
    if (rows.length === 0) {
      res.json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, profile: profileOf(rows[0]) });
    return;
  }

  res.json({ authenticated: false });
});

// Suppress unused import warning for sql/and (kept for potential future filters).
void sql;
void and;

export default router;
