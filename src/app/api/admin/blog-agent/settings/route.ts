import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogAgentSettings } from "@/lib/schema";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [row] = await db
    .select()
    .from(blogAgentSettings)
    .where(eq(blogAgentSettings.id, 1))
    .limit(1);

  /* Surface env-var availability so the UI can render the Platform
   * Connection Status section without round-trips. */
  const platforms = {
    gbp:       !!(process.env.GBP_CLIENT_ID && process.env.GBP_CLIENT_SECRET && process.env.GBP_REFRESH_TOKEN && process.env.GBP_ACCOUNT_ID && process.env.GBP_LOCATION_ID),
    instagram: !!(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID),
    facebook:  !!(process.env.META_ACCESS_TOKEN && process.env.META_PAGE_ID),
    pinterest: !!(process.env.PINTEREST_ACCESS_TOKEN && process.env.PINTEREST_BOARD_IDS),
    openai:    !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    brevo:     !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
    r2:        !!(process.env.CLOUDFLARE_R2_BUCKET && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY),
  };

  return NextResponse.json({ ok: true, settings: row ?? null, platforms });
}

const patchSchema = z.object({
  autoPublish:       z.boolean().optional(),
  dailyRunEnabled:   z.boolean().optional(),
  minWordCount:      z.number().int().min(200).max(10_000).optional(),
  maxWordCount:      z.number().int().min(200).max(10_000).optional(),
  wordCountPillar:   z.number().int().min(200).max(10_000).optional(),
  wordCountStandard: z.number().int().min(200).max(10_000).optional(),
  wordCountLocal:    z.number().int().min(200).max(10_000).optional(),
  launchBurstLimit:  z.number().int().min(0).max(1000).optional(),
  clusterMode:       z.boolean().optional(),
  currentCluster:    z.string().max(50).nullable().optional(),
  targetRegions:     z.array(z.string().max(40)).max(20).optional(),
});

export async function PATCH(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  await db
    .update(blogAgentSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(blogAgentSettings.id, 1));
  return NextResponse.json({ ok: true });
}
