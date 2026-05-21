/**
 * Resolves the first slug candidate that points to a real post — either
 * a static TSX entry in BLOG_POSTS or a published row in blog_posts.
 *
 * Used by /vendors/[category]/[slug]/page.tsx to decide whether to render
 * the Planning Resources cards. If neither slug resolves we hide the card
 * for that category rather than ship a broken link.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/schema";
import { BLOG_POSTS } from "@/lib/blog";
import { VENDOR_RESOURCES, howToLabelFor, costLabelFor } from "@/lib/vendor-resources";
import type { VendorCategory } from "@/types";

export type ResolvedResource = { slug: string; label: string };

export type ResolvedVendorResources = {
  howTo: ResolvedResource | null;
  cost:  ResolvedResource | null;
};

const STATIC_SLUGS = new Set(BLOG_POSTS.map((p) => p.slug));

async function firstExistingSlug(candidates: string[]): Promise<string | null> {
  for (const slug of candidates) {
    if (STATIC_SLUGS.has(slug)) return slug;
  }
  /* Then check DB. One round-trip — IN (...) query. */
  if (candidates.length === 0) return null;
  const rows = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(sql`${blogPosts.slug} = ANY(${candidates}) AND ${blogPosts.isPublished} = TRUE`);
  if (rows.length === 0) return null;
  /* Preserve candidate ORDER — pick the first candidate that survived. */
  const dbSet = new Set(rows.map((r) => r.slug));
  for (const slug of candidates) {
    if (dbSet.has(slug)) return slug;
  }
  return null;
}

export async function resolveVendorResources(
  category: VendorCategory,
): Promise<ResolvedVendorResources> {
  const cfg = VENDOR_RESOURCES[category];
  if (!cfg) return { howTo: null, cost: null };
  const [howToSlug, costSlug] = await Promise.all([
    firstExistingSlug(cfg.howToSlugCandidates),
    firstExistingSlug(cfg.costSlugCandidates),
  ]);
  return {
    howTo: howToSlug ? { slug: howToSlug, label: howToLabelFor(category) } : null,
    cost:  costSlug  ? { slug: costSlug,  label: costLabelFor(category)  } : null,
  };
}
