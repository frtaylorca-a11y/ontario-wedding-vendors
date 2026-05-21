import { NextResponse } from "next/server";
import { desc, gte, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, newsletterSubscribers } from "@/lib/schema";

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
 * Sunday 9am-ET weekly digest. Compiles posts published in the last
 * 7 days and (in Commit 3) sends them via Brevo to newsletter_subscribers.
 * For now the endpoint returns the digest payload as JSON so the cron
 * is wired and we can verify the data shape end-to-end.
 */
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
    .orderBy(desc(blogPosts.publishedAt));

  const subs = await db
    .select({ email: newsletterSubscribers.email })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, true));

  return NextResponse.json({
    ok: true,
    digest: {
      weekStart:       weekAgo.toISOString().slice(0, 10),
      posts:           recentPosts,
      activeSubscribers: subs.length,
    },
  });
}
