import { NextResponse } from "next/server";
import { desc, gte, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, newsletterSubscribers } from "@/lib/schema";
import { renderWeeklyDigestHtml, sendBrevoEmail } from "@/lib/blog-agent/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;  /* may send 100s of emails */

function isAuthorized(req: Request): boolean {
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_TOKEN;
  if (!cron && !admin) return true;
  const m = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/);
  if (!m) return false;
  const provided = m[1].trim();
  return (cron && provided === cron.trim()) || (admin && provided === admin.trim()) || false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentPosts = await db
    .select({
      slug:            blogPosts.slug,
      title:           blogPosts.title,
      excerpt:         blogPosts.excerpt,
      heroImageUrl:    blogPosts.heroImageUrl,
      metaDescription: blogPosts.metaDescription,
      publishedAt:     blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.isPublished, true), gte(blogPosts.publishedAt, weekAgo)))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(10);

  if (recentPosts.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "no posts published this week — digest skipped",
    });
  }

  const subscribers = await db
    .select({
      email:            newsletterSubscribers.email,
      name:             newsletterSubscribers.name,
      unsubscribeToken: newsletterSubscribers.unsubscribeToken,
    })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, true));

  /* Send one email per subscriber so the unsubscribe token is personalised.
   * Brevo handles delivery throttling; we cap parallelism to keep our
   * own outbound burst predictable. */
  const weekStart = weekAgo.toISOString().slice(0, 10);
  const concurrency = 5;
  let sent  = 0;
  let failed = 0;
  const failures: Array<{ email: string; reason: string }> = [];

  for (let i = 0; i < subscribers.length; i += concurrency) {
    const batch = subscribers.slice(i, i + concurrency);
    const outcomes = await Promise.all(
      batch.map(async (sub) => {
        const rendered = renderWeeklyDigestHtml({
          weekStart,
          posts:            recentPosts.map(({ slug, title, excerpt, heroImageUrl, metaDescription }) => ({
            slug, title, excerpt, heroImageUrl, metaDescription,
          })),
          unsubscribeToken: sub.unsubscribeToken,
        });
        return sendBrevoEmail({
          to:          [{ email: sub.email, name: sub.name ?? undefined }],
          subject:     rendered.subject,
          htmlContent: rendered.html,
          textContent: rendered.text,
        }).then((r) => ({ sub, r }));
      }),
    );
    for (const { sub, r } of outcomes) {
      if (r.sent) sent++;
      else { failed++; failures.push({ email: sub.email, reason: r.reason }); }
    }
  }

  return NextResponse.json({
    ok:       true,
    posts:    recentPosts.length,
    subscribers: subscribers.length,
    sent,
    failed,
    failures: failures.slice(0, 10),
  });
}
