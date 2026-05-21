import { NextResponse } from "next/server";
import { desc, gte, count, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, blogScoutLog } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_TOKEN;
  if (!cron && !admin) return true;
  const m = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/);
  if (!m) return false;
  const provided = m[1].trim();
  return (cron && provided === cron.trim()) || (admin && provided === admin.trim()) || false;
}

/**
 * 5pm-ET daily summary email. Compiles the day's published posts
 * + scout queue stats and sends via Brevo. Email integration is
 * in Commit 3 — for now this endpoint computes the report and
 * returns it as JSON so the cron is wired end-to-end.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const publishedToday = await db
    .select({
      id:        blogPosts.id,
      slug:      blogPosts.slug,
      title:     blogPosts.title,
      wordCount: blogPosts.wordCount,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.isPublished, true), gte(blogPosts.publishedAt, startOfDay)))
    .orderBy(desc(blogPosts.publishedAt));

  const [{ value: scoutUnused }] = await db
    .select({ value: count() })
    .from(blogScoutLog)
    .where(eq(blogScoutLog.used, false));

  const [{ value: totalPosts }] = await db
    .select({ value: count() })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true));

  const summary = {
    date:                 startOfDay.toISOString().slice(0, 10),
    publishedToday,
    publishedTodayCount:  publishedToday.length,
    scoutUnusedCount:     Number(scoutUnused),
    totalPublishedPosts:  Number(totalPosts),
    /* Filled in by Commit 3 when GBP / Meta / Pinterest publishing lands. */
    platformsPublishedTo: [],
    imagesGenerated:      0,
    estimatedCostUsd:     0,
  };

  return NextResponse.json({ ok: true, summary });
}
