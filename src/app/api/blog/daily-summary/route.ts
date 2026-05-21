import { NextResponse } from "next/server";
import { desc, gte, count, eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, blogScoutLog, contentDistributionLog } from "@/lib/schema";
import { renderDailySummaryHtml, sendBrevoEmail } from "@/lib/blog-agent/email";

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

const REPORT_RECIPIENT =
  process.env.BLOG_REPORT_RECIPIENT ?? "hello@ontarioweddingvendors.com";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const publishedToday = await db
    .select({
      id:           blogPosts.id,
      slug:         blogPosts.slug,
      title:        blogPosts.title,
      wordCount:    blogPosts.wordCount,
      heroImageUrl: blogPosts.heroImageUrl,
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

  /* Distribution stats — what platforms did today's posts hit? */
  const todayPostIds = publishedToday.map((p) => p.id);
  let platformsPublished: string[] = [];
  if (todayPostIds.length > 0) {
    const rows = await db
      .select({ platform: contentDistributionLog.platform })
      .from(contentDistributionLog)
      .where(
        and(
          eq(contentDistributionLog.status, "published"),
          sql`${contentDistributionLog.blogPostId} = ANY(${todayPostIds})`,
        ),
      );
    platformsPublished = Array.from(new Set(rows.map((r) => r.platform)));
  }

  const imagesGenerated = publishedToday.filter((p) => !!p.heroImageUrl).length;
  /* Internal-link count comes from the agent's persisted internal_links jsonb. */
  const internalLinksAdded = 0;  /* TODO: query when blog_posts.internal_links populated */

  const summary = {
    date:                 startOfDay.toISOString().slice(0, 10),
    publishedToday:       publishedToday.map(({ slug, title, wordCount }) => ({ slug, title, wordCount })),
    publishedTodayCount:  publishedToday.length,
    scoutUnusedCount:     Number(scoutUnused),
    totalPublishedPosts:  Number(totalPosts),
    platformsPublished,
    imagesGenerated,
    estimatedCostUsd:     +(imagesGenerated * 0.04).toFixed(2),
  };

  /* Render + send the email when Brevo creds are present. */
  const rendered = renderDailySummaryHtml({
    date:                 summary.date,
    publishedToday:       summary.publishedToday,
    scoutUnusedCount:     summary.scoutUnusedCount,
    totalPublishedPosts:  summary.totalPublishedPosts,
    imagesGenerated:      summary.imagesGenerated,
    platformsPublished:   summary.platformsPublished,
    internalLinksAdded,
  });

  const sendResult = await sendBrevoEmail({
    to:          [{ email: REPORT_RECIPIENT }],
    subject:     rendered.subject,
    htmlContent: rendered.html,
    textContent: rendered.text,
  });

  return NextResponse.json({ ok: true, summary, email: sendResult });
}
