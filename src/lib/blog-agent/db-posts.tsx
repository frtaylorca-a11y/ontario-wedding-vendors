/**
 * DB-sourced blog post adapter — read helpers that bridge blog_posts
 * rows into the /blog rendering pipeline.
 *
 * The previous version constructed React JSX inline inside this module.
 * That works in Next.js's automatic JSX transform but throws
 * 'React is not defined' anywhere else (tsx CLI, edge runtime warmup,
 * server-component cache rebuilds). The resolver in [slug]/page.tsx
 * was swallowing the error in a try/catch and returning null → 404.
 *
 * This file now returns POJOs with the markdown rendered to an HTML
 * string. The page component decides how to mount that HTML
 * (dangerouslySetInnerHTML) — JSX construction stays out of this lib.
 */
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/schema";
import { renderMarkdown } from "@/lib/blog-agent/render-markdown";

export type DbBlogPost = {
  slug:             string;
  title:            string;
  excerpt:          string;
  category:         string;
  /* ISO date string (YYYY-MM-DD) — matches the static BlogPost shape. */
  publishedAt:      string;
  /* Original full ISO timestamp — used by Article JSON-LD. */
  publishedAtIso:   string;
  readMinutes:      number;
  heroImageUrl:     string | null;
  heroImageAlt:     string | null;
  metaDescription:  string;
  /* Markdown already rendered to safe-ish HTML by renderMarkdown.
   * The page mounts it via dangerouslySetInnerHTML. */
  contentHtml:      string;
  tags:             string[];
  internalLinks:    Array<{ text: string; url: string; kind?: string }>;
  isAiGenerated:    boolean;
};

const FALLBACK_HERO = "/images/hero-niagara-vineyard.png";

function readMinutesFor(words: number): number {
  return Math.max(2, Math.round(words / 220));
}

function rowToDbPost(row: typeof blogPosts.$inferSelect): DbBlogPost {
  const when = row.publishedAt ?? row.createdAt ?? new Date();
  return {
    slug:            row.slug,
    title:           row.title,
    excerpt:         row.excerpt ?? "",
    category:        row.category ?? "Ontario weddings",
    publishedAt:     when.toISOString().slice(0, 10),
    publishedAtIso:  when.toISOString(),
    readMinutes:     readMinutesFor(row.wordCount ?? 800),
    heroImageUrl:    row.heroImageUrl ?? null,
    heroImageAlt:    row.heroImageAlt ?? null,
    metaDescription: row.metaDescription ?? row.excerpt ?? row.title,
    contentHtml:     renderMarkdown(row.content),
    tags:            Array.isArray(row.tags) ? (row.tags as string[]) : [],
    internalLinks:   Array.isArray(row.internalLinks)
      ? (row.internalLinks as Array<{ text: string; url: string; kind?: string }>)
      : [],
    isAiGenerated:   row.isAiGenerated ?? false,
  };
}

export const DB_BLOG_FALLBACK_HERO = FALLBACK_HERO;

export async function getDbBlogPost(slug: string): Promise<DbBlogPost | null> {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)))
    .limit(1);
  if (!row) return null;
  return rowToDbPost(row);
}

export async function listDbBlogPosts(limit = 100): Promise<DbBlogPost[]> {
  const rows = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit);
  return rows.map(rowToDbPost);
}

/* Slugs only — used by generateStaticParams to enumerate DB-backed posts. */
export async function listDbBlogSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true));
  return rows.map((r) => r.slug);
}
