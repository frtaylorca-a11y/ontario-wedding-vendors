import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug:     z.string().min(1).max(80),
  password: z.string().min(1).max(120),
});

/* Verify a guest-supplied password for a couple's wedding site.
 *
 * Success → set httpOnly cookie owv_wsite_auth_<slug>=1 for 30 days.
 * The wedding page reads this cookie server-side before rendering
 * protected content. Cookie is scoped to "/" so the regional-domain
 * subdomain (e.g. alice-bob.niagaraweddingvenues.com) carries it on
 * every request.
 *
 * Plain-text password compare is intentional — these are casual guest
 * passwords (e.g. "love2026"), not credentials. Couples set them in
 * /plan/website. Comparison is constant-time to avoid timing-leak
 * fingerprints regardless.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { slug, password } = parsed.data;

  const [plan] = await db
    .select({ password: weddingPlans.weddingPassword })
    .from(weddingPlans)
    .where(eq(weddingPlans.weddingSiteSlug, slug))
    .limit(1);

  if (!plan?.password) {
    /* No password set means the site isn't protected — treat as success
     * so the gate UI doesn't get stuck if a couple removed their
     * password after a guest opened the form. */
    return NextResponse.json({ ok: true });
  }

  if (!safeEqual(plan.password, password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`owv_wsite_auth_${slug}`, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60 * 60 * 24 * 30, /* 30 days */
    path:     "/",
  });
  return res;
}
