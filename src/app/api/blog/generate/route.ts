import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBlogPost, type BlogGenerateInput } from "@/lib/blog-generate";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const bodySchema = z.object({
  topic:             z.string().min(5).max(300),
  competitorUrl:     z.string().url(),
  targetKeyword:     z.string().min(2).max(120),
  targetRegion:      z.enum(["niagara", "gta", "hamilton", "all"]),
  category:          z.union([
    z.enum([
      "photographer", "videographer", "dj", "florist", "officiant",
      "hair_makeup", "catering", "wedding_planner", "cake", "limo",
      "photo_booth", "lighting_decor", "venue",
    ]),
    z.null(),
  ]).default(null),
  internalLinkCount: z.number().int().min(1).max(4).default(2),
});

/* Lightweight admin gate. ADMIN_TOKEN is set in Vercel; the admin UI
 * (or curl) sends the token as a Bearer header. Falls open in local
 * dev when the env var is empty so the developer can iterate without
 * pasting a token on every request. */
function isAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return true;
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  return m != null && m[1].trim() === expected.trim();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const draft = await generateBlogPost(parsed.data as BlogGenerateInput);
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/blog/generate] failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
