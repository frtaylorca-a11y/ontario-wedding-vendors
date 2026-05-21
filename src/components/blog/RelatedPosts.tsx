import Link from "next/link";
import type { Route } from "next";
import { getRelatedPosts } from "@/lib/blog";

/* Internal-linking block rendered above the footer on every
 * /blog/[slug] page. Picks up to 3 posts by category proximity
 * (see getRelatedPosts in src/lib/blog.tsx for the ranking). */
export function RelatedPosts({ currentSlug }: { currentSlug: string }) {
  const related = getRelatedPosts(currentSlug, 3);
  if (related.length === 0) return null;

  return (
    <aside className="mt-14 border-t border-border-light pt-10">
      <header className="mb-6">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-rose">
          Keep reading
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-charcoal">
          Related posts
        </h2>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}` as Route}
              className="group block h-full rounded-card border border-border-light bg-white p-5 transition-colors hover:border-rose"
            >
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-rose">
                {post.category}
              </div>
              <h3 className="mt-2 font-display text-base font-semibold leading-snug text-charcoal group-hover:text-rose">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs text-text-mid">
                {post.excerpt}
              </p>
              <div className="mt-3 text-[0.65rem] uppercase tracking-[0.12em] text-text-muted">
                {post.readMinutes} min read
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
