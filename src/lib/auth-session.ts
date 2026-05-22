/**
 * Server-side session reader. Kept separate from src/lib/auth.ts so
 * components that only need to read the current user don't pull in
 * the magic-link request/verify logic.
 */
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, type User } from "./schema";
import { SESSION_COOKIE_NAME, decodeSessionCookie } from "./auth";

export async function getCurrentUserId(): Promise<number | null> {
  const store  = await cookies();
  const raw    = store.get(SESSION_COOKIE_NAME)?.value;
  const decoded = decodeSessionCookie(raw);
  return decoded?.userId ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getCurrentUserId();
  if (userId == null) return null;
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return u ?? null;
}
