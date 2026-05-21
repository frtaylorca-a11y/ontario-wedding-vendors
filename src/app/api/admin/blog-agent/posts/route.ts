import { NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, contentDistributionLog } from "@/lib/schema";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

  const rows = await db
    .select({
      id:              blogPosts.id,
      slug:            blogPosts.slug,
      title:           blogPosts.title,
      wordCount:       blogPosts.wordCount,
      sourceDirectory: blogPosts.sourceDirectory,
      publishedAt:     blogPosts.publishedAt,
      isPublished:     blogPosts.isPublished,
      heroImageUrl:    blogPosts.heroImageUrl,
      isAiGenerated:   blogPosts.isAiGenerated,
    })
    .from(blogPosts)
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt))
    .limit(limit);

  /* Pull distribution status for these posts. Group: { postId → { platform: status } } */
  const ids = rows.map((r) => r.id);
  let distMap: Record<number, Record<string, string>> = {};
  if (ids.length > 0) {
    const dist = await db
      .select({
        blogPostId: contentDistributionLog.blogPostId,
        platform:   contentDistributionLog.platform,
        status:     contentDistributionLog.status,
      })
      .from(contentDistributionLog)
      .where(inArray(contentDistributionLog.blogPostId, ids));
    for (const d of dist) {
      const pid = d.blogPostId;
      if (pid == null) continue;
      distMap[pid] ??= {};
      /* Most recent attempt wins per (post, platform). */
      distMap[pid][d.platform] = d.status;
    }
  }

  return NextResponse.json({
    ok: true,
    rows: rows.map((r) => ({
      ...r,
      distribution: distMap[r.id] ?? {},
    })),
  });
}
