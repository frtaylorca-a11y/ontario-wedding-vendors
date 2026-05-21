import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogDrafts } from "@/lib/schema";

export const dynamic = "force-dynamic";

const linkSchema = z.object({
  text: z.string().min(1).max(200),
  url:  z.string().url(),
  kind: z.enum(["vendor", "venue", "category", "internal"]),
});

const bodySchema = z.object({
  slug:            z.string().min(3).max(255).regex(/^[a-z0-9-]+$/),
  title:           z.string().min(5).max(255),
  metaDescription: z.string().max(280).optional(),
  contentMdx:      z.string().min(50),
  topic:           z.string().optional(),
  targetKeyword:   z.string().max(255).optional(),
  targetRegion:    z.string().max(100).optional(),
  category:        z.string().max(50).optional(),
  competitorUrl:   z.string().url().optional(),
  internalLinks:   z.array(linkSchema).default([]),
  wordCount:       z.number().int().min(0).optional(),
});

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
  const v = parsed.data;

  /* Upsert by slug so the admin can re-save edits to the same draft
   * without manually deleting + recreating. publishedAt stays null
   * — going live is a separate workflow (manual review). */
  const [existing] = await db
    .select({ id: blogDrafts.id })
    .from(blogDrafts)
    .where(eq(blogDrafts.slug, v.slug))
    .limit(1);

  if (existing) {
    await db
      .update(blogDrafts)
      .set({
        title:           v.title,
        metaDescription: v.metaDescription ?? null,
        contentMdx:      v.contentMdx,
        topic:           v.topic ?? null,
        targetKeyword:   v.targetKeyword ?? null,
        targetRegion:    v.targetRegion ?? null,
        category:        v.category ?? null,
        competitorUrl:   v.competitorUrl ?? null,
        internalLinks:   v.internalLinks,
        wordCount:       v.wordCount ?? null,
        updatedAt:       new Date(),
      })
      .where(eq(blogDrafts.id, existing.id));
    return NextResponse.json({ ok: true, id: existing.id, status: "updated" });
  }

  const [row] = await db
    .insert(blogDrafts)
    .values({
      slug:            v.slug,
      title:           v.title,
      metaDescription: v.metaDescription ?? null,
      contentMdx:      v.contentMdx,
      topic:           v.topic ?? null,
      targetKeyword:   v.targetKeyword ?? null,
      targetRegion:    v.targetRegion ?? null,
      category:        v.category ?? null,
      competitorUrl:   v.competitorUrl ?? null,
      internalLinks:   v.internalLinks,
      wordCount:       v.wordCount ?? null,
    })
    .returning({ id: blogDrafts.id });

  return NextResponse.json({ ok: true, id: row.id, status: "created" });
}
