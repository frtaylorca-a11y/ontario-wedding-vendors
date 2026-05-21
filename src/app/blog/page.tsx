import Link from "next/link";
import type { Metadata, Route } from "next";
import { listBlogPosts, type BlogPost } from "@/lib/blog";
import { listDbBlogPosts, type DbBlogPost, DB_BLOG_FALLBACK_HERO } from "@/lib/blog-agent/db-posts";
import { BreadcrumbSchema } from "@/components/seo/SchemaInjector";
import { BlogIndexClient } from "@/components/blog/BlogIndexClient";
import { NewsletterSignup } from "@/components/ui/NewsletterSignup";

export const metadata: Metadata = {
  title: "Ontario Wedding Blog | Venue Guides & Vendor Pricing 2026",
  description:
    "Ontario wedding pricing benchmarks, region-by-region venue guides, and vendor cost breakdowns — Niagara, Muskoka, Toronto, Hamilton and beyond, updated 2026.",
  alternates: { canonical: "/blog" },
};

/* DB rows can change between deploys (the agent writes nightly), so
 * we render this dynamically. The static posts are still bundled in
 * the JS — no extra fetch cost. */
export const dynamic = "force-dynamic";

/* DbBlogPost → BlogPost-shaped card data. The index client only reads
 * slug / category / heroImage / readMinutes / title / excerpt /
 * publishedAt — body is required by the BlogPost type but never used
 * on this page, so we set it to null (a valid ReactNode). */
function dbPostToIndexCard(p: DbBlogPost): BlogPost {
  return {
    slug:            p.slug,
    title:           p.title,
    excerpt:         p.excerpt,
    category:        p.category,
    publishedAt:     p.publishedAt,
    readMinutes:     p.readMinutes,
    heroImage:       p.heroImageUrl ?? DB_BLOG_FALLBACK_HERO,
    metaDescription: p.metaDescription,
    body:            null,
  };
}

export default async function BlogIndexPage() {
  const staticPosts = listBlogPosts();
  let dbPosts: DbBlogPost[] = [];
  try {
    dbPosts = await listDbBlogPosts();
  } catch (err) {
    console.error("[/blog] DB index lookup failed:",
      err instanceof Error ? err.message : err);
  }
  /* DB FIRST on dedupe — agent-published version of a slug wins over
   * a stale TSX entry with the same slug. publishedAt sort gives us
   * the standard newest-first feed. */
  const dbCards = dbPosts.map(dbPostToIndexCard);
  const seen = new Set<string>();
  const posts: BlogPost[] = [...dbCards, ...staticPosts]
    .filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
        ]}
      />

      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
          <header className="mx-auto mb-12 max-w-[820px] text-center">
            <span className="inline-flex items-center rounded-full bg-rose-pale px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-rose">
              From the blog
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-tight text-charcoal md:text-6xl">
              Plan a smarter <em className="italic text-rose">Ontario wedding</em>
            </h1>
            <p className="mx-auto mt-4 max-w-[640px] text-text-mid md:text-lg">
              Region guides, venue picks, vendor pricing benchmarks — written
              by the team that runs the directory, not a content mill.
            </p>
            {/* Commercial CTA below the header — the blog funnels into
             * the directory, so the natural next click for a couple
             * landing here is the venue browser. */}
            <div className="mt-7">
              <Link
                href={"/venues" as Route}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-rose hover:underline"
              >
                Find your venue →
              </Link>
            </div>
          </header>

          <BlogIndexClient posts={posts} />

          {/* Newsletter — mounts below the post grid so readers
            * who scrolled through the index see the offer in context. */}
          <div className="mx-auto mt-16 max-w-[820px]">
            <NewsletterSignup variant="card" />
          </div>
        </div>
      </main>
    </>
  );
}
