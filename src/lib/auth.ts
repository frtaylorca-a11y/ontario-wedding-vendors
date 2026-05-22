/**
 * Magic-link authentication — email-only, no passwords.
 *
 * Flow:
 *   1. Couple submits email at a RegisterGate trigger (save 3+ venues,
 *      finalize budget, publish wedding website).
 *   2. requestMagicLink() generates a one-time token, persists its
 *      SHA-256 hash, and emails the verification URL.
 *   3. The verify endpoint validates the token, upserts the user,
 *      stamps userId onto the current session's wedding_plans row,
 *      and sets a signed long-lived session cookie.
 *
 * Session cookie format:
 *   owv_user = `${userId}.${expiresAt}.${hmac}`
 *
 * Stateless — no sessions table. Revocation is by AUTH_SECRET rotation.
 * Cookie expiry: 30 days. Magic-link expiry: 30 minutes, single-use.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { magicLinkTokens, users, weddingPlans } from "./schema";

const COOKIE_NAME = "owv_user";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; /* 30 days */
const MAGIC_LINK_TTL_MS = 30 * 60 * 1000; /* 30 minutes */

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "AUTH_SECRET env var must be set to a 32+ char random string. " +
      "Generate with: openssl rand -hex 32",
    );
  }
  return s;
}

function hmac(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/* ─── Session cookie (signed, stateless) ───────────────────────────── */

export type SessionCookie = { userId: number; expiresAt: number };

export function encodeSessionCookie(userId: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SECONDS;
  const payload   = `${userId}.${expiresAt}`;
  return `${payload}.${hmac(payload)}`;
}

export function decodeSessionCookie(raw: string | undefined): SessionCookie | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [uidStr, expStr, sig] = parts;
  const payload   = `${uidStr}.${expStr}`;
  const expected  = hmac(payload);
  /* Constant-time compare to avoid timing oracles. */
  try {
    const a = Buffer.from(sig,      "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const userId    = Number.parseInt(uidStr, 10);
  const expiresAt = Number.parseInt(expStr, 10);
  if (!Number.isFinite(userId) || !Number.isFinite(expiresAt)) return null;
  if (expiresAt * 1000 < Date.now()) return null;
  return { userId, expiresAt };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure:   process.env.NODE_ENV === "production",
  path:     "/",
  maxAge:   COOKIE_MAX_AGE_SECONDS,
};

/* ─── Magic link ───────────────────────────────────────────────────── */

export type MagicLinkIntent =
  | "save-shortlist"     /* hit the 3-venue cap */
  | "save-budget"        /* finalizing the budget */
  | "publish-website"    /* publishing wedding site */
  | "sign-in";           /* generic */

export type RequestMagicLinkInput = {
  email:       string;
  callbackUrl: string;     /* relative path, e.g. "/plan" */
  intent:      MagicLinkIntent;
  sessionId:   string | null; /* anon planner session, if any */
};

export type RequestMagicLinkResult = {
  /** Plaintext token to embed in the URL. NOT stored anywhere — caller
   *  must include it in the email body and discard. */
  token:     string;
  expiresAt: Date;
};

export async function requestMagicLink(
  input: RequestMagicLinkInput,
): Promise<RequestMagicLinkResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("invalid email");
  }
  const token     = randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.insert(magicLinkTokens).values({
    email,
    tokenHash,
    callbackUrl: input.callbackUrl,
    intent:      input.intent,
    sessionId:   input.sessionId,
    expiresAt,
  });

  return { token, expiresAt };
}

export type VerifyResult =
  | { ok: true;  userId: number; email: string; callbackUrl: string; intent: string | null }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Validate a magic-link token, upsert the user, stamp userId onto the
 * caller's session plan row, and return the success payload so the
 * route handler can set the session cookie and redirect.
 */
export async function verifyMagicLink(token: string): Promise<VerifyResult> {
  const tokenHash = sha256Hex(token);

  const [row] = await db
    .select()
    .from(magicLinkTokens)
    .where(eq(magicLinkTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  /* Mark used (single-use). Tiny race: two parallel verifies could both
   * succeed past the read above. We accept it — the token is single-
   * device single-use in practice. */
  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.id, row.id));

  /* Upsert the user. */
  const now = new Date();
  const [user] = await db
    .insert(users)
    .values({ email: row.email, emailVerifiedAt: now, lastLoginAt: now })
    .onConflictDoUpdate({
      target: users.email,
      set:    { emailVerifiedAt: now, lastLoginAt: now },
    })
    .returning();

  /* Link the anonymous planner session to the verified user, if any.
   * Only stamp plans that don't already have a userId — guard against
   * accidentally re-binding a stale sessionId from another account. */
  if (row.sessionId) {
    await db
      .update(weddingPlans)
      .set({ userId: user.id, updatedAt: new Date() })
      .where(and(
        eq(weddingPlans.sessionId, row.sessionId),
        isNull(weddingPlans.userId),
      ));
  }

  return {
    ok:          true,
    userId:      user.id,
    email:       user.email,
    callbackUrl: row.callbackUrl ?? "/plan",
    intent:      row.intent,
  };
}

/* ─── Maintenance ──────────────────────────────────────────────────── */

/** Clear tokens older than 24h. Wire into a cron if desired. */
export async function purgeExpiredMagicLinks(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await db.execute(
    sql`DELETE FROM magic_link_tokens WHERE expires_at < ${cutoff}`,
  );
  /* node-postgres-style rowCount; tolerate undefined. */
  return (res as unknown as { rowCount?: number }).rowCount ?? 0;
}
