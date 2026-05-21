"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import {
  CATEGORY_GROUP_LABELS,
  getCategoryGroup,
  type BlogPost,
  type CategoryGroup,
} from "@/lib/blog";

type Filter = "all" | CategoryGroup;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",      label: "All"                              },
  { id: "venues",   label: CATEGORY_GROUP_LABELS.venues       },
  { id: "cost",     label: CATEGORY_GROUP_LABELS.cost         },
  { id: "regional", label: CATEGORY_GROUP_LABELS.regional     },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  });
}

export function BlogIndexClient({ posts }: { posts: BlogPost[] }) {
  /* Featured post is always the most-recent in the unfiltered set —
   * keeps the page top-of-fold stable across filter changes. The grid
   * below shows the rest. */
  const featured = posts[0];
  const rest     = posts.slice(1);

  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(() => {
    if (filter === "all") return rest;
    return rest.filter((p) => getCategoryGroup(p.category) === filter);
  }, [filter, rest]);

  return (
    <>
      {/* Featured post — full-bleed hero card */}
      {featured && (
        <section className="mb-12">
          <Link
            href={`/blog/${featured.slug}` as Route}
            className="group grid overflow-hidden rounded-card border border-border-light bg-white transition-all duration-200 hover:shadow-[var(--shadow-card)] lg:grid-cols-[3fr_2fr]"
          >
            <div className="relative aspect-[16/9] bg-bg-soft lg:aspect-auto lg:min-h-[360px]">
              <Image
                src={featured.heroImage}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 700px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-7 lg:p-10">
              <div className="inline-flex items-center gap-2">
                <span className="rounded-pill bg-rose-pale px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-rose">
                  Featured
                </span>
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-rose">
                  {featured.category}
                </span>
              </div>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-charcoal group-hover:text-rose md:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-3 text-text-mid">
                {featured.excerpt}
              </p>
              <div className="mt-5 flex items-center gap-3 text-[0.7rem] text-text-muted">
                <time dateTime={featured.publishedAt}>{formatDate(featured.publishedAt)}</time>
                <span aria-hidden>·</span>
                <span>{featured.readMinutes} min read</span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Filter chips */}
      <div
        role="tablist"
        aria-label="Filter posts by topic"
        className="mb-8 flex flex-wrap items-center gap-2"
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          const count =
            f.id === "all"
              ? rest.length
              : rest.filter((p) => getCategoryGroup(p.category) === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(f.id)}
              className={
                isActive
                  ? "inline-flex items-center gap-1.5 rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white"
                  : "inline-flex items-center gap-1.5 rounded-pill border border-border bg-white px-5 py-2 text-sm font-medium text-text-mid transition-colors hover:border-rose hover:text-rose"
              }
            >
              {f.label}
              <span
                className={
                  isActive
                    ? "rounded-pill bg-white/25 px-1.5 py-0.5 text-[0.6rem] font-bold"
                    : "rounded-pill bg-bg-soft px-1.5 py-0.5 text-[0.6rem] font-bold text-text-muted"
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of remaining posts */}
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-white p-8 text-center text-sm text-text-muted">
          No posts in this category yet — try a different filter.
        </p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}` as Route}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-border-light bg-white transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[var(--shadow-card)]"
              >
                <div className="relative aspect-[16/9] bg-bg-soft">
                  <Image
                    src={post.heroImage}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                  />
                  {/* Reading-time chip pinned to the thumbnail —
                   * gives the index card a scannable signal even
                   * before the eye reaches the body copy. */}
                  <span className="absolute bottom-3 right-3 rounded-pill bg-charcoal/85 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                    {post.readMinutes} min read
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-rose">
                    {post.category}
                  </div>
                  <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-charcoal group-hover:text-rose">
                    {post.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-text-mid">
                    {post.excerpt}
                  </p>
                  <div className="mt-3 text-[0.7rem] text-text-muted">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
