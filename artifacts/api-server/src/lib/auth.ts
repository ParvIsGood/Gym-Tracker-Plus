import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET ?? "";
if (!SECRET) {
  throw new Error("SESSION_SECRET env var is required");
}

const TOKEN_TTL = "30d";
export const USERNAME_RE = /^[a-z0-9_]{3,32}$/i;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type JwtPayload = { sub: string; type: "user" };

export function signUserToken(userId: string): string {
  const payload: JwtPayload = { sub: userId, type: "user" };
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyUserToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as JwtPayload;
    if (decoded.type !== "user" || !decoded.sub) return null;
    return decoded;
  } catch {
    return null;
  }
}
