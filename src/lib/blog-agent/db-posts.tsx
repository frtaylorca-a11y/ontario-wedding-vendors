/**
 * Read helpers that bridge the agent-generated DB posts into the
 * /blog routes. Both functions return a BlogPost-shaped value
 * that the existing rendering pipeline understands.
 *
 * The static BLOG_POSTS array in src/lib/blog.tsx is still the
 * primary source — these helpers only fill in DB entries that
 * don't exist in the static array.
 */
import { eq, desc, and } from "drizzle-orm";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/schema";
import type { BlogPost } from "@/lib/blog";
import { renderMarkdown } from "@/lib/blog-agent/render-markdown";

const FALLBACK_HERO = "/images/hero-niagara-vineyard.png";

function readMinutesFor(words: number): number {
  return Math.max(2, Math.round(words / 220));
}

/* Build a BlogPost-shaped object from a blog_posts row. The body
 * is rendered to HTML on the server and wrapped in a div so the
 * existing .blog-prose CSS applies untouched. */
function rowToBlogPost(row: typeof blogPosts.$inferSelect): BlogPost {
  const html = renderMarkdown(row.content);
  const body: ReactNode = (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
  return {
    slug:            row.slug,
    title:           row.title,
    excerpt:         row.excerpt ?? "",
    category:        row.category ?? "Ontario weddings",
    publishedAt:     (row.publishedAt ?? row.createdAt ?? new Date()).toISOString().slice(0, 10),
    readMinutes:     readMinutesFor(row.wordCount ?? 800),
    heroImage:       row.heroImageUrl ?? FALLBACK_HERO,
    metaDescription: row.metaDescription ?? row.excerpt ?? row.title,
    body,
  };
}

export async function getDbBlogPost(slug: string): Promise<BlogPost | null> {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)))
    .limit(1);
  if (!row) return null;
  return rowToBlogPost(row);
}

export async function listDbBlogPosts(limit = 100): Promise<BlogPost[]> {
  const rows = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit);
  return rows.map(rowToBlogPost);
}

/* Slugs only — used by generateStaticParams to enumerate DB-backed posts. */
export async function listDbBlogSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true));
  return rows.map((r) => r.slug);
}
